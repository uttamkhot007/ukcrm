/**
 * Asynchronous domain event bus backed by Redis Streams, with a transactional
 * outbox so a service never publishes an event for a transaction that rolled
 * back (and never loses one that committed).
 *
 * Delivery is at-least-once with consumer groups per service, so consumers
 * must be idempotent — `eventId` is provided for de-duplication.
 */

import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { getRedis, createSubscriber } from '../lib/redis.js';
import { eventsPublished, eventsConsumed } from './telemetry.js';

export interface DomainEvent<T = unknown> {
  eventId: string;
  type: string;
  /** Service that emitted the event. */
  source: string;
  tenantId?: string;
  /** Aggregate the event is about, e.g. a deal id. */
  subject?: string;
  traceId?: string;
  occurredAt: string;
  payload: T;
}

const STREAM_PREFIX = 'events';
const OUTBOX_TABLE = 'outbox_events';

function streamFor(type: string): string {
  // One stream per bounded context prefix, e.g. events:sales
  const [context] = type.split('.');
  return `${STREAM_PREFIX}:${context}`;
}

export interface PublishInput<T = unknown> {
  type: string;
  payload: T;
  tenantId?: string;
  subject?: string;
  traceId?: string;
}

/**
 * Wraps a consumer so it can only ever observe events belonging to the tenant
 * it was created for. Streams are shared across tenants, so every subscriber
 * that touches tenant data must go through this guard: an event with a
 * different tenant (or with no tenant at all) is dropped, never handled.
 */
export function tenantScopedHandler(
  tenantId: string,
  handler: (event: DomainEvent) => Promise<void>,
  onDropped?: (event: DomainEvent) => void,
): (event: DomainEvent) => Promise<void> {
  return async (event: DomainEvent) => {
    if (!event.tenantId || event.tenantId !== tenantId) {
      onDropped?.(event);
      return;
    }
    await handler(event);
  };
}

/** True when the event may be handled inside the given tenant's context. */
export function isEventVisibleToTenant(event: DomainEvent, tenantId: string): boolean {
  return event.tenantId === tenantId;
}

export class EventBus {

  private readonly redis: Redis;
  private consumers: Array<{ stop: () => void }> = [];

  constructor(
    private readonly service: string,
    private readonly logger: Logger,
  ) {
    this.redis = getRedis();
  }

  private build<T>(input: PublishInput<T>): DomainEvent<T> {
    return {
      eventId: randomUUID(),
      type: input.type,
      source: this.service,
      tenantId: input.tenantId,
      subject: input.subject,
      traceId: input.traceId,
      occurredAt: new Date().toISOString(),
      payload: input.payload,
    };
  }

  /**
   * Publish inside a database transaction. The event lands in the outbox in
   * the same commit as the business write; the pump ships it afterwards.
   */
  async publishInTransaction<T>(trx: Knex.Transaction, input: PublishInput<T>): Promise<DomainEvent<T>> {
    const event = this.build(input);
    await trx(OUTBOX_TABLE).insert({
      id: event.eventId,
      event_type: event.type,
      source_service: event.source,
      tenant_id: event.tenantId ?? null,
      subject: event.subject ?? null,
      trace_id: event.traceId ?? null,
      payload: JSON.stringify(event.payload),
      occurred_at: event.occurredAt,
      published_at: null,
      attempts: 0,
    });
    return event;
  }

  /** Direct publish. Only for events with no accompanying database write. */
  async publish<T>(input: PublishInput<T>): Promise<DomainEvent<T>> {
    const event = this.build(input);
    await this.emit(event);
    return event;
  }

  private async emit(event: DomainEvent): Promise<void> {
    await this.redis.xadd(
      streamFor(event.type),
      'MAXLEN',
      '~',
      '100000',
      '*',
      'event',
      JSON.stringify(event),
    );
    eventsPublished.inc({ service: this.service, type: event.type });
  }

  /**
   * Ship committed-but-unpublished outbox rows. Run on an interval in each
   * service; safe to run concurrently thanks to SKIP LOCKED.
   */
  async pumpOutbox(db: Knex, batchSize = 100): Promise<number> {
    let shipped = 0;
    await db.transaction(async (trx) => {
      const rows = await trx(OUTBOX_TABLE)
        .whereNull('published_at')
        .where('attempts', '<', 10)
        .orderBy('occurred_at', 'asc')
        .limit(batchSize)
        .forUpdate()
        .skipLocked();

      for (const row of rows) {
        const event: DomainEvent = {
          eventId: row.id,
          type: row.event_type,
          source: row.source_service,
          tenantId: row.tenant_id ?? undefined,
          subject: row.subject ?? undefined,
          traceId: row.trace_id ?? undefined,
          occurredAt: new Date(row.occurred_at).toISOString(),
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        };
        try {
          await this.emit(event);
          await trx(OUTBOX_TABLE).where({ id: row.id }).update({ published_at: new Date() });
          shipped += 1;
        } catch (err) {
          this.logger.warn({ err, eventId: row.id }, 'Outbox publish failed; will retry');
          await trx(OUTBOX_TABLE)
            .where({ id: row.id })
            .update({ attempts: (row.attempts ?? 0) + 1, last_error: String(err) });
        }
      }
    });
    return shipped;
  }

  /**
   * Subscribe with a consumer group. `types` accepts exact event types or a
   * bounded-context wildcard such as `sales.*` (and `*` for everything).
   */
  subscribe(
    types: string[],
    handler: (event: DomainEvent) => Promise<void>,
    opts: { blockMs?: number } = {},
  ): void {
    const contexts = new Set(
      types.map((t) => (t === '*' ? '*' : streamFor(t))),
    );
    const streams = contexts.has('*')
      ? [`${STREAM_PREFIX}:*`]
      : [...contexts];

    const group = `cg:${this.service}`;
    const consumerName = `${this.service}-${process.pid}`;
    const client = createSubscriber();
    let stopped = false;

    const matches = (type: string): boolean =>
      types.some((t) => t === '*' || t === type || (t.endsWith('.*') && type.startsWith(t.slice(0, -1))));

    const loop = async () => {
      const resolved = streams.includes(`${STREAM_PREFIX}:*`)
        ? ((await client.keys(`${STREAM_PREFIX}:*`)) as string[])
        : streams;

      for (const stream of resolved) {
        await client.xgroup('CREATE', stream, group, '$', 'MKSTREAM').catch(() => undefined);
      }

      while (!stopped) {
        try {
          const active = streams.includes(`${STREAM_PREFIX}:*`)
            ? ((await client.keys(`${STREAM_PREFIX}:*`)) as string[])
            : streams;
          if (active.length === 0) {
            await new Promise((r) => setTimeout(r, 1_000));
            continue;
          }
          for (const stream of active) {
            await client.xgroup('CREATE', stream, group, '$', 'MKSTREAM').catch(() => undefined);
          }

          const res = (await client.xreadgroup(
            'GROUP',
            group,
            consumerName,
            'COUNT',
            10,
            'BLOCK',
            opts.blockMs ?? 5_000,
            'STREAMS',
            ...active,
            ...active.map(() => '>'),
          )) as Array<[string, Array<[string, string[]]>]> | null;

          if (!res) continue;

          for (const [stream, entries] of res) {
            for (const [id, fields] of entries) {
              const raw = fields[fields.indexOf('event') + 1];
              try {
                const event = JSON.parse(raw) as DomainEvent;
                if (matches(event.type)) {
                  await handler(event);
                  eventsConsumed.inc({ service: this.service, type: event.type });
                }
                await client.xack(stream, group, id);
              } catch (err) {
                this.logger.error({ err, stream, id }, 'Event handler failed; leaving unacked for retry');
              }
            }
          }
        } catch (err) {
          if (!stopped) {
            this.logger.warn({ err }, 'Event consumer loop error; backing off');
            await new Promise((r) => setTimeout(r, 2_000));
          }
        }
      }
      await client.quit().catch(() => undefined);
    };

    void loop();
    this.consumers.push({ stop: () => { stopped = true; } });
  }

  async close(): Promise<void> {
    for (const c of this.consumers) c.stop();
    this.consumers = [];
  }
}
