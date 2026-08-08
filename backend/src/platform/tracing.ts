/**
 * Distributed tracing.
 *
 * Every request that enters the mesh gets a W3C trace context (see
 * `telemetry.ts`) plus a human-friendly **correlation id**. Both travel:
 *
 *   browser ──▶ gateway ──▶ service ──▶ service ──▶ database/event bus
 *
 * through the `traceparent` and `x-correlation-id` headers, which
 * `resilientFetch` injects automatically from the ambient async context.
 *
 * Spans are recorded in-process and shipped to a collector (the gateway) so a
 * single request can be reassembled into a waterfall in the observability
 * dashboard. The collector is in-memory and bounded: it is a live debugging
 * surface, not a data store. Swapping the exporter for OTLP later is a
 * one-function change — the ids are already W3C-correct.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import {
  formatTraceparent,
  newTraceContext,
  parseTraceparent,
  type TraceContext,
} from './telemetry.js';

export type SpanKind = 'server' | 'client' | 'internal' | 'producer' | 'consumer';
export type SpanStatus = 'ok' | 'error';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  name: string;
  service: string;
  kind: SpanKind;
  /** Epoch milliseconds. */
  startTime: number;
  durationMs: number;
  status: SpanStatus;
  statusMessage?: string;
  tenantId?: string;
  userId?: string;
  attributes: Record<string, string | number | boolean>;
}

export interface ActiveContext {
  trace: TraceContext;
  correlationId: string;
  service: string;
  tenantId?: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<ActiveContext>();

export function currentContext(): ActiveContext | undefined {
  return storage.getStore();
}

export function runWithContext<T>(ctx: ActiveContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/**
 * Bind the context to the current async resource. Used by Fastify hooks, where
 * the rest of the request lifecycle runs outside the hook's callback.
 */
export function enterContext(ctx: ActiveContext): void {
  storage.enterWith(ctx);
}


/** Attach tenant/user to the ambient context once auth has resolved. */
export function annotateContext(fields: Partial<Pick<ActiveContext, 'tenantId' | 'userId'>>): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  if (fields.tenantId) ctx.tenantId = fields.tenantId;
  if (fields.userId) ctx.userId = fields.userId;
}

export function newCorrelationId(): string {
  return `cid_${randomBytes(8).toString('hex')}`;
}

/**
 * Headers every outbound hop must carry. Returns an empty object when there is
 * no ambient trace (e.g. a background job that started its own).
 */
export function propagationHeaders(childSpanId?: string): Record<string, string> {
  const ctx = storage.getStore();
  if (!ctx) return {};
  const trace: TraceContext = childSpanId ? { ...ctx.trace, spanId: childSpanId } : ctx.trace;
  const headers: Record<string, string> = {
    traceparent: formatTraceparent(trace),
    'x-correlation-id': ctx.correlationId,
  };
  if (ctx.tenantId) headers['x-tenant-id'] = ctx.tenantId;
  return headers;
}

/** Derive a context from inbound headers (creating a fresh trace if absent). */
export function contextFromHeaders(
  service: string,
  headers: Record<string, string | string[] | undefined>,
): ActiveContext {
  const traceparent = headers['traceparent'];
  const correlation = headers['x-correlation-id'] ?? headers['x-request-id'];
  return {
    trace: parseTraceparent(typeof traceparent === 'string' ? traceparent : undefined),
    correlationId:
      typeof correlation === 'string' && correlation.length > 0 ? correlation : newCorrelationId(),
    service,
    tenantId: typeof headers['x-tenant-id'] === 'string' ? (headers['x-tenant-id'] as string) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Span recording                                                      */
/* ------------------------------------------------------------------ */

const HEX = '0123456789abcdef';
function randomSpanId(): string {
  const buf = randomBytes(8);
  let out = '';
  for (const byte of buf) out += HEX[(byte >> 4) & 0xf] + HEX[byte & 0xf];
  return out;
}

export interface SpanHandle {
  spanId: string;
  traceId: string;
  correlationId: string;
  setAttribute(key: string, value: string | number | boolean): void;
  end(outcome?: { status?: SpanStatus; message?: string; attributes?: Record<string, string | number | boolean> }): Span;
}

export interface StartSpanOptions {
  service?: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
  /** Explicit context when there is no ambient one (e.g. gateway entrypoint). */
  context?: ActiveContext;
}

export function startSpan(name: string, options: StartSpanOptions = {}): SpanHandle {
  const ctx =
    options.context ??
    storage.getStore() ?? {
      trace: newTraceContext(),
      correlationId: newCorrelationId(),
      service: options.service ?? 'unknown',
    };

  const spanId = randomSpanId();
  const startedAt = Date.now();
  const startedHr = process.hrtime.bigint();
  const attributes = { ...(options.attributes ?? {}) };
  let ended = false;

  return {
    spanId,
    traceId: ctx.trace.traceId,
    correlationId: ctx.correlationId,
    setAttribute(key, value) {
      attributes[key] = value;
    },
    end(outcome = {}) {
      const span: Span = {
        traceId: ctx.trace.traceId,
        spanId,
        parentSpanId: ctx.trace.spanId,
        correlationId: ctx.correlationId,
        name,
        service: options.service ?? ctx.service,
        kind: options.kind ?? 'internal',
        startTime: startedAt,
        durationMs: Number(process.hrtime.bigint() - startedHr) / 1e6,
        status: outcome.status ?? 'ok',
        ...(outcome.message ? { statusMessage: outcome.message } : {}),
        ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
        ...(ctx.userId ? { userId: ctx.userId } : {}),
        attributes: { ...attributes, ...(outcome.attributes ?? {}) },
      };
      if (!ended) {
        ended = true;
        recordSpan(span);
      }
      return span;
    },
  };
}

/** Wrap an async operation in a span, recording failures automatically. */
export async function withSpan<T>(
  name: string,
  options: StartSpanOptions,
  fn: (span: SpanHandle) => Promise<T>,
): Promise<T> {
  const span = startSpan(name, options);
  try {
    const result = await fn(span);
    span.end({ status: 'ok' });
    return result;
  } catch (err) {
    span.end({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* In-memory collector                                                 */
/* ------------------------------------------------------------------ */

export interface TraceSummary {
  traceId: string;
  correlationId: string;
  rootName: string;
  entryService: string;
  services: string[];
  spanCount: number;
  errorCount: number;
  startTime: number;
  durationMs: number;
  status: SpanStatus;
  tenantId?: string;
  userId?: string;
  httpStatus?: number;
}

export interface TraceDetail extends TraceSummary {
  spans: Span[];
}

const MAX_TRACES = Number(process.env['TRACE_BUFFER_SIZE'] ?? 300);
const MAX_SPANS_PER_TRACE = 200;

export class TraceCollector extends EventEmitter {
  private readonly traces = new Map<string, Span[]>();

  ingest(spans: Span[]): void {
    for (const span of spans) {
      if (!span?.traceId || !span.spanId) continue;
      let bucket = this.traces.get(span.traceId);
      if (!bucket) {
        bucket = [];
        this.traces.set(span.traceId, bucket);
      }
      if (bucket.length < MAX_SPANS_PER_TRACE) bucket.push(span);
      // Refresh recency: re-insert so Map iteration order is oldest-first.
      this.traces.delete(span.traceId);
      this.traces.set(span.traceId, bucket);
      this.emit('span', span);
    }
    while (this.traces.size > MAX_TRACES) {
      const oldest = this.traces.keys().next().value as string | undefined;
      if (!oldest) break;
      this.traces.delete(oldest);
    }
    if (spans.length > 0) this.emit('traces', spans.map((s) => s.traceId));
  }

  private summarize(traceId: string, spans: Span[]): TraceSummary {
    const known = new Set(spans.map((s) => s.spanId));
    const root =
      spans.find((s) => !s.parentSpanId || !known.has(s.parentSpanId)) ??
      spans.slice().sort((a, b) => a.startTime - b.startTime)[0]!;
    const start = Math.min(...spans.map((s) => s.startTime));
    const end = Math.max(...spans.map((s) => s.startTime + s.durationMs));
    const errorCount = spans.filter((s) => s.status === 'error').length;
    const httpStatus = root.attributes['http.status_code'];
    return {
      traceId,
      correlationId: root.correlationId,
      rootName: root.name,
      entryService: root.service,
      services: Array.from(new Set(spans.map((s) => s.service))),
      spanCount: spans.length,
      errorCount,
      startTime: start,
      durationMs: Math.max(end - start, root.durationMs),
      status: errorCount > 0 ? 'error' : 'ok',
      ...(root.tenantId ? { tenantId: root.tenantId } : {}),
      ...(root.userId ? { userId: root.userId } : {}),
      ...(typeof httpStatus === 'number' ? { httpStatus } : {}),
    };
  }

  list(filters: {
    limit?: number;
    service?: string;
    status?: SpanStatus;
    tenantId?: string;
    search?: string;
    minDurationMs?: number;
  } = {}): TraceSummary[] {
    const out: TraceSummary[] = [];
    for (const [traceId, spans] of this.traces) {
      if (spans.length === 0) continue;
      out.push(this.summarize(traceId, spans));
    }
    let filtered = out.sort((a, b) => b.startTime - a.startTime);
    if (filters.service) filtered = filtered.filter((t) => t.services.includes(filters.service!));
    if (filters.status) filtered = filtered.filter((t) => t.status === filters.status);
    if (filters.tenantId) filtered = filtered.filter((t) => t.tenantId === filters.tenantId);
    if (filters.minDurationMs) filtered = filtered.filter((t) => t.durationMs >= filters.minDurationMs!);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.rootName.toLowerCase().includes(q) ||
          t.traceId.includes(q) ||
          t.correlationId.toLowerCase().includes(q),
      );
    }
    return filtered.slice(0, filters.limit ?? 100);
  }

  get(traceId: string): TraceDetail | undefined {
    const spans = this.traces.get(traceId);
    if (!spans || spans.length === 0) return undefined;
    return {
      ...this.summarize(traceId, spans),
      spans: spans.slice().sort((a, b) => a.startTime - b.startTime),
    };
  }

  /** Find a trace by its human-shareable correlation id. */
  findByCorrelationId(correlationId: string): TraceDetail | undefined {
    for (const [traceId, spans] of Array.from(this.traces).reverse()) {
      if (spans.some((s) => s.correlationId === correlationId)) return this.get(traceId);
    }
    return undefined;
  }

  /** Rolling service-level aggregates for the dashboard header. */
  stats(windowMs = 5 * 60_000): {
    generatedAt: number;
    windowMs: number;
    totals: { traces: number; spans: number; errors: number; errorRate: number };
    latency: { p50: number; p95: number; p99: number };
    services: Array<{
      service: string;
      spans: number;
      errors: number;
      errorRate: number;
      p95Ms: number;
      avgMs: number;
    }>;
    dependencies: Array<{ from: string; to: string; calls: number; errors: number; avgMs: number }>;
  } {
    const since = Date.now() - windowMs;
    const spans: Span[] = [];
    for (const bucket of this.traces.values()) {
      for (const s of bucket) if (s.startTime >= since) spans.push(s);
    }
    const byService = new Map<string, Span[]>();
    for (const s of spans) {
      const arr = byService.get(s.service) ?? [];
      arr.push(s);
      byService.set(s.service, arr);
    }
    const quantile = (values: number[], q: number): number => {
      if (values.length === 0) return 0;
      const sorted = values.slice().sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
      return Math.round((sorted[idx] ?? 0) * 100) / 100;
    };

    const rootDurations: number[] = [];
    const traceIds = new Set<string>();
    for (const s of spans) {
      traceIds.add(s.traceId);
      if (s.kind === 'server' && s.service === 'gateway') rootDurations.push(s.durationMs);
    }
    if (rootDurations.length === 0) for (const s of spans) if (s.kind === 'server') rootDurations.push(s.durationMs);

    const dependencies = new Map<string, { from: string; to: string; calls: number; errors: number; total: number }>();
    for (const s of spans) {
      if (s.kind !== 'client') continue;
      const to = String(s.attributes['peer.service'] ?? 'unknown');
      const key = `${s.service}->${to}`;
      const entry = dependencies.get(key) ?? { from: s.service, to, calls: 0, errors: 0, total: 0 };
      entry.calls += 1;
      entry.total += s.durationMs;
      if (s.status === 'error') entry.errors += 1;
      dependencies.set(key, entry);
    }

    const errors = spans.filter((s) => s.status === 'error').length;
    return {
      generatedAt: Date.now(),
      windowMs,
      totals: {
        traces: traceIds.size,
        spans: spans.length,
        errors,
        errorRate: spans.length > 0 ? errors / spans.length : 0,
      },
      latency: {
        p50: quantile(rootDurations, 0.5),
        p95: quantile(rootDurations, 0.95),
        p99: quantile(rootDurations, 0.99),
      },
      services: Array.from(byService.entries())
        .map(([service, list]) => {
          const errs = list.filter((s) => s.status === 'error').length;
          return {
            service,
            spans: list.length,
            errors: errs,
            errorRate: list.length > 0 ? errs / list.length : 0,
            p95Ms: quantile(list.map((s) => s.durationMs), 0.95),
            avgMs:
              Math.round((list.reduce((sum, s) => sum + s.durationMs, 0) / Math.max(list.length, 1)) * 100) / 100,
          };
        })
        .sort((a, b) => b.spans - a.spans),
      dependencies: Array.from(dependencies.values())
        .map((d) => ({
          from: d.from,
          to: d.to,
          calls: d.calls,
          errors: d.errors,
          avgMs: Math.round((d.total / Math.max(d.calls, 1)) * 100) / 100,
        }))
        .sort((a, b) => b.calls - a.calls),
    };
  }

  clear(): void {
    this.traces.clear();
  }
}

/** Local collector: always on, so /metrics-style debugging works per process. */
export const localCollector = new TraceCollector();

/* ------------------------------------------------------------------ */
/* Exporter                                                            */
/* ------------------------------------------------------------------ */

const EXPORT_URL = process.env['TRACE_COLLECTOR_URL'];
const EXPORT_INTERVAL_MS = Number(process.env['TRACE_EXPORT_INTERVAL_MS'] ?? 1_500);
const MAX_QUEUE = 1_000;

let queue: Span[] = [];
let flushTimer: NodeJS.Timeout | undefined;

function scheduleFlush(): void {
  if (!EXPORT_URL || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flushSpans();
  }, EXPORT_INTERVAL_MS);
  flushTimer.unref?.();
}

/** Ship queued spans to the collector. Best effort: tracing never blocks work. */
export async function flushSpans(): Promise<void> {
  if (!EXPORT_URL || queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    // Plain fetch on purpose: routing this through resilientFetch would create
    // spans for the exporter itself and recurse.
    await fetch(EXPORT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spans: batch }),
    });
  } catch {
    // Drop the batch rather than growing memory when the collector is down.
  }
}

export function recordSpan(span: Span): void {
  localCollector.ingest([span]);
  if (!EXPORT_URL) return;
  if (queue.length < MAX_QUEUE) queue.push(span);
  scheduleFlush();
}
