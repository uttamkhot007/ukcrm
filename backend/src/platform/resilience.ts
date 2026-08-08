/**
 * Resilience primitives: timeouts, retries with jitter, circuit breakers and
 * bulkheads. Every cross-service call must go through `resilientFetch` so one
 * unhealthy dependency degrades instead of cascading.
 */

import { breakerState } from './telemetry.js';

export type BreakerState = 'closed' | 'half-open' | 'open';

export interface BreakerOptions {
  /** Consecutive failures before the circuit opens. */
  failureThreshold: number;
  /** How long to stay open before probing again. */
  resetTimeoutMs: number;
  /** Successes required in half-open before closing. */
  successThreshold: number;
}

const DEFAULT_BREAKER: BreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 15_000,
  successThreshold: 2,
};

export class CircuitOpenError extends Error {
  readonly statusCode = 503;
  constructor(public readonly target: string) {
    super(`Circuit open for ${target}`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state: BreakerState = 'closed';
  private failures = 0;
  private successes = 0;
  private openedAt = 0;

  constructor(
    readonly name: string,
    private readonly options: BreakerOptions = DEFAULT_BREAKER,
  ) {
    this.report();
  }

  get current(): BreakerState {
    return this.state;
  }

  private report(): void {
    breakerState.set(
      { target: this.name },
      this.state === 'closed' ? 0 : this.state === 'half-open' ? 1 : 2,
    );
  }

  private canAttempt(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'half-open') return true;
    if (Date.now() - this.openedAt >= this.options.resetTimeoutMs) {
      this.state = 'half-open';
      this.successes = 0;
      this.report();
      return true;
    }
    return false;
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes += 1;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
    this.report();
  }

  private onFailure(): void {
    this.failures += 1;
    if (this.state === 'half-open' || this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
    this.report();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canAttempt()) throw new CircuitOpenError(this.name);
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function breakerFor(target: string, options?: Partial<BreakerOptions>): CircuitBreaker {
  let b = breakers.get(target);
  if (!b) {
    b = new CircuitBreaker(target, { ...DEFAULT_BREAKER, ...options });
    breakers.set(target, b);
  }
  return b;
}

export function breakerSnapshot(): Record<string, BreakerState> {
  const out: Record<string, BreakerState> = {};
  for (const [name, b] of breakers) out[name] = b.current;
  return out;
}

/** Bulkhead: caps concurrent in-flight calls to one dependency. */
export class Bulkhead {
  private inFlight = 0;
  private readonly queue: Array<() => void> = [];

  constructor(
    private readonly limit: number,
    private readonly queueLimit = 100,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inFlight >= this.limit) {
      if (this.queue.length >= this.queueLimit) {
        const err = new Error('Bulkhead queue full') as Error & { statusCode: number };
        err.statusCode = 503;
        throw err;
      }
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.inFlight += 1;
    try {
      return await fn();
    } finally {
      this.inFlight -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`) as Error & { statusCode: number };
      err.statusCode = 504;
      reject(err);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn?: (err: unknown) => boolean;
}

const idempotentRetry = (err: unknown): boolean => {
  const status = (err as { statusCode?: number })?.statusCode;
  if (status && status < 500) return false;
  return !(err instanceof CircuitOpenError);
};

export async function retry<T>(fn: () => Promise<T>, options: Partial<RetryOptions> = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 100, maxDelayMs = 2_000, retryOn = idempotentRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts - 1 || !retryOn(err)) break;
      // Full jitter avoids synchronised retry storms across replicas.
      const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await new Promise((r) => setTimeout(r, Math.random() * ceiling));
    }
  }
  throw lastError;
}

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  target?: string;
}

const bulkheads = new Map<string, Bulkhead>();

function bulkheadFor(target: string): Bulkhead {
  let b = bulkheads.get(target);
  if (!b) {
    b = new Bulkhead(Number(process.env['BULKHEAD_LIMIT'] ?? 50));
    bulkheads.set(target, b);
  }
  return b;
}

/**
 * The only sanctioned way for a service to call another service:
 * bulkhead -> circuit breaker -> retry -> timeout.
 */
export async function resilientFetch(url: string, options: ResilientFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10_000, retries = 2, target, ...init } = options;
  const dependency = target ?? new URL(url).host;
  const method = (init.method ?? 'GET').toUpperCase();
  const safeToRetry = method === 'GET' || method === 'HEAD' || Boolean((init.headers as Record<string, string> | undefined)?.['Idempotency-Key']);

  return bulkheadFor(dependency).run(() =>
    breakerFor(dependency).run(() =>
      retry(
        async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch(url, { ...init, signal: controller.signal });
            if (res.status >= 500) {
              const err = new Error(`${dependency} responded ${res.status}`) as Error & { statusCode: number };
              err.statusCode = res.status;
              throw err;
            }
            return res;
          } finally {
            clearTimeout(timer);
          }
        },
        { attempts: safeToRetry ? retries + 1 : 1 },
      ),
    ),
  );
}
