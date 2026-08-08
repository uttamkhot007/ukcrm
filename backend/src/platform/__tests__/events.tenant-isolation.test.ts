/**
 * Multitenant isolation contract for the domain event bus.
 *
 * Streams are shared infrastructure: a sales event for tenant B travels the
 * same Redis stream as one for tenant A. These tests prove that (1) every
 * published event carries its tenant, (2) the outbox commits the tenant with
 * the business write, and (3) a tenant-scoped consumer can never observe a
 * foreign event.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '../events.js';

const xadd = vi.fn().mockResolvedValue('1-0');

vi.mock('../../lib/redis.js', () => ({
  getRedis: () => ({ xadd }),
  createSubscriber: () => ({ xadd }),
}));

vi.mock('../telemetry.js', () => ({
  eventsPublished: { inc: vi.fn() },
  eventsConsumed: { inc: vi.fn() },
}));

const TENANT_A = 'tenant-aaaa';
const TENANT_B = 'tenant-bbbb';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as any;

async function loadBus() {
  const { EventBus, tenantScopedHandler, isEventVisibleToTenant } = await import('../events.js');
  return { bus: new EventBus('sales', logger), tenantScopedHandler, isEventVisibleToTenant };
}

function fakeTrx() {
  const inserted: any[] = [];
  const trx: any = (table: string) => ({
    insert: async (row: any) => {
      inserted.push({ table, row });
      return [row];
    },
  });
  trx.inserted = inserted;
  return trx;
}

const event = (tenantId?: string): DomainEvent => ({
  eventId: 'evt-1',
  type: 'sales.deal.won',
  source: 'sales',
  tenantId,
  occurredAt: new Date().toISOString(),
  payload: { amount: 1_000 },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Event bus · tenant stamping', () => {
  it('stamps the tenant on every direct publish', async () => {
    const { bus } = await loadBus();
    const published = await bus.publish({ type: 'sales.deal.won', tenantId: TENANT_A, payload: { id: 'a1' } });

    expect(published.tenantId).toBe(TENANT_A);
    const wire = JSON.parse(xadd.mock.calls[0].at(-1) as string);
    expect(wire.tenantId).toBe(TENANT_A);
  });

  it('commits the tenant into the outbox alongside the business write', async () => {
    const { bus } = await loadBus();
    const trx = fakeTrx();
    await bus.publishInTransaction(trx, { type: 'sales.deal.won', tenantId: TENANT_B, payload: { id: 'b1' } });

    expect(trx.inserted).toHaveLength(1);
    expect(trx.inserted[0].table).toBe('outbox_events');
    expect(trx.inserted[0].row.tenant_id).toBe(TENANT_B);
    // Nothing is emitted before the transaction commits.
    expect(xadd).not.toHaveBeenCalled();
  });
});

describe('Event bus · consumer isolation', () => {
  it('delivers only events for the consumer tenant', async () => {
    const { tenantScopedHandler } = await loadBus();
    const handled: string[] = [];
    const dropped: string[] = [];
    const handler = tenantScopedHandler(
      TENANT_A,
      async (e) => { handled.push(e.tenantId!); },
      (e) => { dropped.push(e.tenantId ?? 'none'); },
    );

    await handler(event(TENANT_A));
    await handler(event(TENANT_B));
    await handler(event(undefined));

    expect(handled).toEqual([TENANT_A]);
    expect(dropped).toEqual([TENANT_B, 'none']);
  });

  it('treats a missing tenant as untrusted rather than global', async () => {
    const { isEventVisibleToTenant } = await loadBus();
    expect(isEventVisibleToTenant(event(undefined), TENANT_A)).toBe(false);
    expect(isEventVisibleToTenant(event(TENANT_B), TENANT_A)).toBe(false);
    expect(isEventVisibleToTenant(event(TENANT_A), TENANT_A)).toBe(true);
  });

  it('never throws foreign payload data into the handler', async () => {
    const { tenantScopedHandler } = await loadBus();
    const seen: unknown[] = [];
    const handler = tenantScopedHandler(TENANT_A, async (e) => { seen.push(e.payload); });
    await handler({ ...event(TENANT_B), payload: { secret: 'do-not-leak' } });
    expect(JSON.stringify(seen)).not.toContain('do-not-leak');
  });
});
