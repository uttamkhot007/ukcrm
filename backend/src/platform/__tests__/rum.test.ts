/**
 * Benchmarks are only useful if the aggregation is trustworthy: a wrong p95 or
 * a preload success rate that silently counts navigation loads would send us
 * optimising the wrong thing. These tests pin the maths and the input hardening.
 */

import { describe, expect, it } from 'vitest';
import { RumCollector, SWITCH_BUDGET_MS } from '../rum.js';

const now = 1_700_000_000_000;

function switchSample(module: string, durationMs: number, warm = false, extra = {}) {
  return { kind: 'switch', module, durationMs, warm, timestamp: now, ...extra };
}

function chunkSample(module: string, source: string, outcome: string, durationMs = 200, extra = {}) {
  return { kind: 'chunk', module, source, outcome, durationMs, timestamp: now, ...extra };
}

describe('RumCollector', () => {
  it('computes switch percentiles and budget adherence', () => {
    const c = new RumCollector();
    c.ingest(
      [100, 200, 300, 400, 5000].map((d) => switchSample('sales', d)),
      now,
    );

    const stats = c.stats({ now, windowMs: 60_000 });
    expect(stats.overall.switches).toBe(5);
    expect(stats.overall.p50Ms).toBe(300);
    expect(stats.overall.p95Ms).toBe(5000);
    // Four of five switches came in under the 1s interaction budget.
    expect(stats.overall.withinBudgetRatio).toBe(0.8);
    expect(stats.budgetMs).toBe(SWITCH_BUDGET_MS);
  });

  it('measures preload success separately from navigation loads', () => {
    const c = new RumCollector();
    c.ingest(
      [
        chunkSample('sales', 'preload', 'success'),
        chunkSample('sales', 'preload', 'success'),
        chunkSample('sales', 'preload', 'failure'),
        chunkSample('sales', 'preload', 'failure'),
        // Navigation loads must not dilute the preload success rate.
        chunkSample('sales', 'navigation', 'success'),
        chunkSample('sales', 'navigation', 'success'),
      ],
      now,
    );

    const stats = c.stats({ now, windowMs: 60_000 });
    expect(stats.overall.preloadAttempts).toBe(4);
    expect(stats.overall.preloadSuccessRatio).toBe(0.5);
    expect(stats.overall.chunkLoads).toBe(6);
    expect(stats.modules[0]!.preloadSuccessRatio).toBe(0.5);
  });

  it('splits warm and cold switches so preloading value is visible', () => {
    const c = new RumCollector();
    c.ingest(
      [
        switchSample('hr', 120, true),
        switchSample('hr', 160, true),
        switchSample('hr', 1400, false),
        switchSample('hr', 1800, false),
      ],
      now,
    );

    const hr = c.stats({ now, windowMs: 60_000 }).modules[0]!;
    expect(hr.warmRatio).toBe(0.5);
    expect(hr.warmP95Ms).toBe(160);
    expect(hr.coldP95Ms).toBe(1800);
  });

  it('flags modules over the interaction budget as regressions', () => {
    const c = new RumCollector();
    c.ingest([switchSample('fast', 200), switchSample('fast', 220), switchSample('fast', 240)], now);
    c.ingest([switchSample('slow', 2000), switchSample('slow', 2400), switchSample('slow', 2600)], now);

    const { regressions } = c.stats({ now, windowMs: 60_000 });
    expect(regressions.map((r) => r.module)).toEqual(['slow']);
  });

  it('ignores samples outside the requested window', () => {
    const c = new RumCollector();
    c.ingest([switchSample('sales', 100, false, { timestamp: now - 10 * 60_000 })], now);
    c.ingest([switchSample('sales', 100)], now);

    expect(c.stats({ now, windowMs: 60_000 }).overall.switches).toBe(1);
    expect(c.stats({ now, windowMs: 30 * 60_000 }).overall.switches).toBe(2);
  });

  it('rejects malformed input and clamps hostile values', () => {
    const c = new RumCollector();
    const accepted = c.ingest(
      [
        null,
        'nope',
        { kind: 'switch' },
        { kind: 'bogus', module: 'sales', durationMs: 10 },
        { kind: 'switch', module: 'sales', durationMs: -5 },
        // Absurd duration and a clock set far in the future are clamped, not dropped.
        { kind: 'switch', module: 'x'.repeat(500), durationMs: 10 ** 9, timestamp: now + 10 ** 12 },
      ],
      now,
    );

    expect(accepted).toBe(1);
    const stats = c.stats({ now, windowMs: 60_000 });
    expect(stats.overall.switches).toBe(1);
    expect(stats.modules[0]!.module).toHaveLength(64);
    expect(stats.modules[0]!.p95Ms).toBe(120_000);
  });

  it('scopes stats to a tenant when asked', () => {
    const c = new RumCollector();
    c.ingest(
      [
        switchSample('sales', 100, false, { tenantId: 't1' }),
        switchSample('sales', 900, false, { tenantId: 't2' }),
      ],
      now,
    );

    expect(c.stats({ now, windowMs: 60_000, tenantId: 't1' }).overall.p95Ms).toBe(100);
    expect(c.stats({ now, windowMs: 60_000, tenantId: 't2' }).overall.p95Ms).toBe(900);
  });

  it('reports average retry attempts for successful chunk loads', () => {
    const c = new RumCollector();
    c.ingest(
      [
        chunkSample('sales', 'navigation', 'success', 200, { attempts: 1 }),
        chunkSample('sales', 'navigation', 'success', 900, { attempts: 3 }),
        chunkSample('sales', 'navigation', 'failure', 900, { attempts: 4, offline: true }),
      ],
      now,
    );

    const { overall } = c.stats({ now, windowMs: 60_000 });
    expect(overall.avgAttempts).toBe(2);
    expect(overall.offlineFailures).toBe(1);
  });
});
