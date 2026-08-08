/**
 * Distributed tracing guarantees:
 *  - inbound trace context is adopted, otherwise a fresh trace is minted
 *  - the correlation id survives every hop
 *  - spans reassemble into one trace with a correct parent/child waterfall
 *  - the collector never leaks unbounded memory and its aggregates are sane
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  TraceCollector,
  contextFromHeaders,
  localCollector,
  newCorrelationId,
  propagationHeaders,
  runWithContext,
  startSpan,
  type Span,
} from '../tracing.js';

function span(overrides: Partial<Span> = {}): Span {
  return {
    traceId: 'a'.repeat(32),
    spanId: '1'.repeat(16),
    correlationId: 'cid_test',
    name: 'GET /api/deals',
    service: 'gateway',
    kind: 'server',
    startTime: Date.now(),
    durationMs: 12,
    status: 'ok',
    attributes: {},
    ...overrides,
  };
}

describe('trace context propagation', () => {
  it('adopts an inbound traceparent and correlation id', () => {
    const traceId = 'b'.repeat(32);
    const ctx = contextFromHeaders('crm', {
      traceparent: `00-${traceId}-${'c'.repeat(16)}-01`,
      'x-correlation-id': 'cid_inbound',
    });
    expect(ctx.trace.traceId).toBe(traceId);
    expect(ctx.trace.parentSpanId).toBe('c'.repeat(16));
    expect(ctx.correlationId).toBe('cid_inbound');
  });

  it('mints a trace and correlation id when the caller sent none', () => {
    const ctx = contextFromHeaders('crm', {});
    expect(ctx.trace.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(ctx.correlationId).toMatch(/^cid_[0-9a-f]{16}$/);
  });

  it('forwards trace + correlation headers on outbound hops', () => {
    const ctx = contextFromHeaders('gateway', {});
    ctx.tenantId = 'tenant-1';
    const headers = runWithContext(ctx, () => propagationHeaders('9'.repeat(16)));
    expect(headers['traceparent']).toBe(`00-${ctx.trace.traceId}-${'9'.repeat(16)}-01`);
    expect(headers['x-correlation-id']).toBe(ctx.correlationId);
    expect(headers['x-tenant-id']).toBe('tenant-1');
  });

  it('keeps one trace id and correlation id across simulated hops', () => {
    const gateway = contextFromHeaders('gateway', {});
    const toCrm = runWithContext(gateway, () => propagationHeaders('2'.repeat(16)));
    const crm = contextFromHeaders('crm', toCrm);
    const toBilling = runWithContext(crm, () => propagationHeaders('3'.repeat(16)));
    const billing = contextFromHeaders('billing', toBilling);

    expect(new Set([gateway.trace.traceId, crm.trace.traceId, billing.trace.traceId]).size).toBe(1);
    expect(new Set([gateway.correlationId, crm.correlationId, billing.correlationId]).size).toBe(1);
  });

  it('records spans against the ambient trace', () => {
    localCollector.clear();
    const ctx = contextFromHeaders('crm', {});
    runWithContext(ctx, () => {
      const s = startSpan('db.query', { kind: 'client', attributes: { 'peer.service': 'postgres' } });
      s.end({ status: 'ok' });
    });
    const detail = localCollector.get(ctx.trace.traceId);
    expect(detail?.spans).toHaveLength(1);
    expect(detail?.spans[0]?.correlationId).toBe(ctx.correlationId);
    localCollector.clear();
  });
});

describe('trace collector', () => {
  let collector: TraceCollector;
  beforeEach(() => {
    collector = new TraceCollector();
  });

  it('reassembles multi-service spans into a single trace', () => {
    const traceId = 'd'.repeat(32);
    collector.ingest([
      span({ traceId, spanId: 'aa'.repeat(8), service: 'gateway', durationMs: 40 }),
      span({
        traceId,
        spanId: 'bb'.repeat(8),
        parentSpanId: 'aa'.repeat(8),
        service: 'crm',
        kind: 'server',
        durationMs: 25,
      }),
      span({
        traceId,
        spanId: 'cc'.repeat(8),
        parentSpanId: 'bb'.repeat(8),
        service: 'crm',
        kind: 'client',
        status: 'error',
        durationMs: 10,
      }),
    ]);

    const detail = collector.get(traceId);
    expect(detail?.spanCount).toBe(3);
    expect(detail?.services.sort()).toEqual(['crm', 'gateway']);
    expect(detail?.status).toBe('error');
    expect(detail?.rootName).toBe('GET /api/deals');
  });

  it('finds a trace by its correlation id', () => {
    collector.ingest([span({ traceId: 'e'.repeat(32), correlationId: 'cid_support_ticket' })]);
    expect(collector.findByCorrelationId('cid_support_ticket')?.traceId).toBe('e'.repeat(32));
    expect(collector.findByCorrelationId(newCorrelationId())).toBeUndefined();
  });

  it('filters traces by service, status and search', () => {
    collector.ingest([
      span({ traceId: '1'.repeat(32), service: 'gateway', correlationId: 'cid_one' }),
      span({ traceId: '2'.repeat(32), service: 'billing', status: 'error', correlationId: 'cid_two' }),
    ]);
    expect(collector.list({ service: 'billing' })).toHaveLength(1);
    expect(collector.list({ status: 'error' })[0]?.traceId).toBe('2'.repeat(32));
    expect(collector.list({ search: 'cid_one' })).toHaveLength(1);
  });

  it('derives dependency edges from client spans', () => {
    collector.ingest([
      span({ traceId: '3'.repeat(32), spanId: '0f'.repeat(8), service: 'gateway', kind: 'client', attributes: { 'peer.service': 'crm' } }),
      span({ traceId: '3'.repeat(32), spanId: '1f'.repeat(8), service: 'gateway', kind: 'client', attributes: { 'peer.service': 'crm' } }),
    ]);
    const stats = collector.stats();
    expect(stats.dependencies[0]).toMatchObject({ from: 'gateway', to: 'crm', calls: 2 });
    expect(stats.totals.spans).toBe(2);
  });

  it('bounds memory by evicting the oldest traces', () => {
    const limit = Number(process.env['TRACE_BUFFER_SIZE'] ?? 300);
    for (let i = 0; i < limit + 25; i += 1) {
      collector.ingest([span({ traceId: i.toString(16).padStart(32, '0') })]);
    }
    expect(collector.list({ limit: 10_000 }).length).toBeLessThanOrEqual(limit);
    expect(collector.get('0'.repeat(32))).toBeUndefined();
  });
});
