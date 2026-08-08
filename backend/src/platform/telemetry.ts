/**
 * Observability primitives shared by every service.
 *
 * - W3C trace context propagation (traceparent) so a request can be followed
 *   across the gateway and every downstream service.
 * - Structured logs that always carry service, trace, tenant and user IDs.
 * - A dependency-free Prometheus registry (counters, gauges, histograms)
 *   exposed on /metrics for scraping.
 *
 * Deliberately dependency-free: adding an OTel SDK later only requires
 * replacing `startSpan`, the trace IDs are already correct.
 */

import { randomBytes } from 'crypto';
import pino, { Logger } from 'pino';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

const HEX = '0123456789abcdef';

function randomHex(bytes: number): string {
  const buf = randomBytes(bytes);
  let out = '';
  for (const byte of buf) {
    out += HEX[(byte >> 4) & 0xf] + HEX[byte & 0xf];
  }
  return out;
}

export function newTraceContext(): TraceContext {
  return { traceId: randomHex(16), spanId: randomHex(8), sampled: true };
}

/** Parse a W3C `traceparent` header, falling back to a fresh trace. */
export function parseTraceparent(header: string | undefined): TraceContext {
  if (!header) return newTraceContext();
  const parts = header.trim().split('-');
  if (parts.length < 4) return newTraceContext();
  const [, traceId, parentSpanId, flags] = parts;
  if (!/^[0-9a-f]{32}$/.test(traceId ?? '') || !/^[0-9a-f]{16}$/.test(parentSpanId ?? '')) {
    return newTraceContext();
  }
  return {
    traceId: traceId as string,
    spanId: randomHex(8),
    parentSpanId,
    sampled: (parseInt(flags ?? '01', 16) & 1) === 1,
  };
}

export function formatTraceparent(ctx: TraceContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? '01' : '00'}`;
}

/* ------------------------------------------------------------------ */
/* Metrics registry                                                    */
/* ------------------------------------------------------------------ */

type Labels = Record<string, string | number>;

function labelKey(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  return keys.map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`).join(',');
}

interface MetricSeries {
  labels: string;
  value: number;
  /** Histogram-only state. */
  buckets?: number[];
  counts?: number[];
  sum?: number;
  count?: number;
}

class Metric {
  readonly series = new Map<string, MetricSeries>();

  constructor(
    readonly name: string,
    readonly help: string,
    readonly type: 'counter' | 'gauge' | 'histogram',
    readonly buckets: number[] = [],
  ) {}

  private series_(labels: Labels): MetricSeries {
    const key = labelKey(labels);
    let s = this.series.get(key);
    if (!s) {
      s = { labels: key, value: 0 };
      if (this.type === 'histogram') {
        s.buckets = this.buckets;
        s.counts = new Array(this.buckets.length + 1).fill(0);
        s.sum = 0;
        s.count = 0;
      }
      this.series.set(key, s);
    }
    return s;
  }

  inc(labels: Labels = {}, delta = 1): void {
    this.series_(labels).value += delta;
  }

  set(labels: Labels, value: number): void {
    this.series_(labels).value = value;
  }

  observe(labels: Labels, value: number): void {
    const s = this.series_(labels);
    s.sum = (s.sum ?? 0) + value;
    s.count = (s.count ?? 0) + 1;
    const idx = this.buckets.findIndex((b) => value <= b);
    const bucket = idx === -1 ? this.buckets.length : idx;
    if (s.counts) s.counts[bucket] = (s.counts[bucket] ?? 0) + 1;
  }
}

class MetricsRegistry {
  private readonly metrics = new Map<string, Metric>();

  counter(name: string, help: string): Metric {
    return this.getOrCreate(name, help, 'counter');
  }

  gauge(name: string, help: string): Metric {
    return this.getOrCreate(name, help, 'gauge');
  }

  histogram(name: string, help: string, buckets: number[]): Metric {
    return this.getOrCreate(name, help, 'histogram', buckets);
  }

  private getOrCreate(name: string, help: string, type: Metric['type'], buckets: number[] = []): Metric {
    let m = this.metrics.get(name);
    if (!m) {
      m = new Metric(name, help, type, buckets);
      this.metrics.set(name, m);
    }
    return m;
  }

  /** Prometheus text exposition format. */
  render(): string {
    const lines: string[] = [];
    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      for (const s of metric.series.values()) {
        const base = s.labels ? `{${s.labels}}` : '';
        if (metric.type === 'histogram') {
          let cumulative = 0;
          metric.buckets.forEach((bound, i) => {
            cumulative += s.counts?.[i] ?? 0;
            const l = s.labels ? `{${s.labels},le="${bound}"}` : `{le="${bound}"}`;
            lines.push(`${metric.name}_bucket${l} ${cumulative}`);
          });
          cumulative += s.counts?.[metric.buckets.length] ?? 0;
          const infLabels = s.labels ? `{${s.labels},le="+Inf"}` : '{le="+Inf"}';
          lines.push(`${metric.name}_bucket${infLabels} ${cumulative}`);
          lines.push(`${metric.name}_sum${base} ${s.sum ?? 0}`);
          lines.push(`${metric.name}_count${base} ${s.count ?? 0}`);
        } else {
          lines.push(`${metric.name}${base} ${s.value}`);
        }
      }
    }
    return `${lines.join('\n')}\n`;
  }
}

export const metrics = new MetricsRegistry();

export const httpRequests = metrics.counter('http_requests_total', 'HTTP requests handled');
export const httpErrors = metrics.counter('http_errors_total', 'HTTP responses with status >= 500');
export const httpDuration = metrics.histogram(
  'http_request_duration_seconds',
  'HTTP request latency',
  [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
);
export const dbPoolGauge = metrics.gauge('db_pool_connections', 'Database pool connections by state');
export const eventsPublished = metrics.counter('events_published_total', 'Domain events published');
export const eventsConsumed = metrics.counter('events_consumed_total', 'Domain events consumed');
export const breakerState = metrics.gauge('circuit_breaker_state', 'Circuit breaker state (0 closed, 1 half-open, 2 open)');
export const sloBudget = metrics.gauge('slo_error_budget_remaining_ratio', 'Remaining error budget for the service SLO');

/* ------------------------------------------------------------------ */
/* Logging                                                             */
/* ------------------------------------------------------------------ */

const REDACTED = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'apiKey',
];

export function createServiceLogger(service: string): Logger {
  return pino({
    level: process.env['LOG_LEVEL'] || 'info',
    base: {
      service,
      env: process.env['NODE_ENV'] || 'development',
      version: process.env['BUILD_VERSION'] || 'dev',
    },
    redact: { paths: REDACTED, censor: '[redacted]' },
    ...(process.env['NODE_ENV'] !== 'production' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  });
}
