/**
 * Service runtime.
 *
 * `createService` builds a hardened Fastify instance with the same contract in
 * every microservice: security headers, CORS, per-tenant rate limiting, JWT
 * auth, tenant routing, tracing, metrics, SLO accounting, health/readiness
 * probes, outbox pumping and graceful drain.
 *
 * A service file therefore contains only its own routes.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Logger } from 'pino';
import { config } from '../config/index.js';
import { authPlugin } from '../plugins/auth.js';
import { DatabaseRouter } from './db-router.js';
import { EventBus } from './events.js';
import { getService, type ServiceName } from './manifest.js';
import { registerCrudResource, type CrudResource } from './crud.js';
import { registerTenantContext } from './tenant-context.js';
import { breakerSnapshot } from './resilience.js';
import {
  annotateContext,
  contextFromHeaders,
  enterContext,
  localCollector,
  startSpan,
  type ActiveContext,
  type SpanHandle,
} from './tracing.js';
import {
  createServiceLogger,
  formatTraceparent,
  httpDuration,
  httpErrors,
  httpRequests,
  metrics,
  sloBudget,
} from './telemetry.js';


export interface ServiceRuntime {
  app: FastifyInstance;
  db: DatabaseRouter;
  bus: EventBus;
  logger: Logger;
  listen: () => Promise<void>;
}

export interface CreateServiceOptions {
  name: ServiceName;
  /** CRUD resources this service exposes (must be tables it owns). */
  resources?: CrudResource[];
  /** Extra route registration, run after the platform middleware. */
  routes?: (app: FastifyInstance, runtime: Omit<ServiceRuntime, 'app' | 'listen'>) => Promise<void> | void;
  /** Event subscriptions. */
  onEvents?: (bus: EventBus, runtime: Omit<ServiceRuntime, 'app' | 'listen'>) => void;
  /** Services such as tenancy/identity legitimately span tenants. */
  crossTenant?: boolean;
  /** Extra paths that skip auth (in addition to health/metrics). */
  publicPaths?: string[];
}

const BASE_PUBLIC_PATHS = ['/health', '/health/live', '/health/ready', '/metrics', '/debug/traces'];

export async function createService(options: CreateServiceOptions): Promise<ServiceRuntime> {
  const definition = getService(options.name);
  const logger = createServiceLogger(definition.name);
  const publicPaths = [...BASE_PUBLIC_PATHS, ...(options.publicPaths ?? [])];

  const db = new DatabaseRouter(definition.name, logger);
  const bus = new EventBus(definition.name, logger);

  const app = Fastify({
    loggerInstance: logger as never,
    trustProxy: true,
    disableRequestLogging: true,
    bodyLimit: Number(process.env['BODY_LIMIT_BYTES'] ?? 5 * 1024 * 1024),
    requestIdHeader: 'x-request-id',
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'traceparent', 'X-Tenant-Id', 'Idempotency-Key'],
  });

  // Rate limit per tenant when known, per IP otherwise, so one noisy tenant
  // cannot consume another tenant's budget.
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (req) => req.tenant?.tenantId ?? (req.headers['x-forwarded-for'] as string) ?? req.ip,
  });

  // Trace context in, trace context out. The context is bound to the async
  // resource so any downstream call (resilientFetch, event publish) inherits
  // the same trace and correlation id without threading arguments around.
  app.addHook('onRequest', async (request, reply) => {
    const ctx = contextFromHeaders(definition.name, request.headers as Record<string, string | undefined>);
    enterContext(ctx);
    (request as { traceCtx?: ActiveContext }).traceCtx = ctx;
    (request as { trace?: unknown }).trace = ctx.trace;
    (request as { correlationId?: string }).correlationId = ctx.correlationId;
    reply.header('traceparent', formatTraceparent(ctx.trace));
    reply.header('x-correlation-id', ctx.correlationId);
    reply.header('x-service', definition.name);
    (request as { startedAt?: bigint }).startedAt = process.hrtime.bigint();
    (request as { span?: SpanHandle }).span = startSpan(`${request.method} ${request.url.split('?')[0]}`, {
      kind: 'server',
      service: definition.name,
      context: ctx,
      attributes: {
        'http.method': request.method,
        'http.target': request.url.split('?')[0] ?? request.url,
        'service.domain': definition.domain,
      },
    });
  });

  await app.register(authPlugin);
  registerTenantContext(app, { router: db, publicPaths, crossTenant: options.crossTenant });

  // Once auth/tenant resolution has run, enrich the trace so the dashboard can
  // filter traces per tenant without any extra plumbing.
  app.addHook('preHandler', async (request) => {
    if (request.tenant) {
      annotateContext({ tenantId: request.tenant.tenantId, userId: request.tenant.userId });
    }
  });

  // Structured access log + RED metrics + rolling error budget.
  let requestCount = 0;
  let errorCount = 0;
  app.addHook('onResponse', async (request, reply) => {
    const startedAt = (request as { startedAt?: bigint }).startedAt;
    const seconds = startedAt ? Number(process.hrtime.bigint() - startedAt) / 1e9 : 0;
    const route = (request.routeOptions?.url ?? request.url.split('?')[0]) as string;
    const labels = { service: definition.name, method: request.method, route, status: reply.statusCode };

    httpRequests.inc(labels);
    httpDuration.observe({ service: definition.name, route }, seconds);
    requestCount += 1;
    if (reply.statusCode >= 500) {
      errorCount += 1;
      httpErrors.inc(labels);
    }
    const observedRatio = requestCount > 0 ? errorCount / requestCount : 0;
    sloBudget.set(
      { service: definition.name },
      Math.max(0, 1 - observedRatio / definition.slo.errorRatio),
    );

    const ctx = (request as { traceCtx?: ActiveContext }).traceCtx;
    (request as { span?: SpanHandle }).span?.end({
      status: reply.statusCode >= 500 ? 'error' : 'ok',
      attributes: { 'http.status_code': reply.statusCode, 'http.route': route },
    });

    request.log.info(
      {
        method: request.method,
        route,
        status: reply.statusCode,
        durationMs: Math.round(seconds * 1000),
        traceId: ctx?.trace.traceId,
        correlationId: ctx?.correlationId,
        tenantId: request.tenant?.tenantId,
        userId: request.tenant?.userId,
      },
      'request',
    );
  });

  // Local trace introspection for a single service instance (kubectl/curl).
  app.get('/debug/traces', async (request) => {
    const query = request.query as { limit?: string; traceId?: string };
    if (query.traceId) return localCollector.get(query.traceId) ?? { error: 'not_found' };
    return { traces: localCollector.list({ limit: Number(query.limit ?? 50) }) };
  });


  // Liveness: process is up. Readiness: dependencies are usable.
  app.get('/health/live', async () => ({ status: 'ok', service: definition.name }));
  app.get('/health/ready', async (_req, reply) => {
    const dbOk = await db.healthy();
    const status = dbOk ? 200 : 503;
    return reply.status(status).send({
      status: dbOk ? 'ready' : 'degraded',
      service: definition.name,
      domain: definition.domain,
      version: process.env['BUILD_VERSION'] ?? 'dev',
      checks: { database: dbOk },
      breakers: breakerSnapshot(),
    });
  });
  app.get('/health', async () => ({
    status: 'ok',
    service: definition.name,
    domain: definition.domain,
    slo: definition.slo,
    uptimeSeconds: Math.round(process.uptime()),
  }));

  app.get('/metrics', async (_req, reply) => {
    db.reportPoolMetrics();
    return reply.header('content-type', 'text/plain; version=0.0.4').send(metrics.render());
  });

  for (const resource of options.resources ?? []) {
    registerCrudResource(app, definition.name, resource, bus);
  }

  const runtime = { db, bus, logger };
  if (options.routes) await options.routes(app, runtime);
  if (options.onEvents) options.onEvents(bus, runtime);

  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error, url: request.url }, 'Unhandled error');
    }
    reply.status(status).send({
      error: status >= 500 ? 'Internal Server Error' : error.name,
      // Never leak internals to clients; the trace id ties back to the log.
      message: status >= 500 ? 'An unexpected error occurred' : error.message,
      traceId: (request as { trace?: { traceId: string } }).trace?.traceId,
    });
  });

  app.setNotFoundHandler(async (request, reply) =>
    reply.status(404).send({ error: 'Not Found', message: `${request.method} ${request.url}` }),
  );

  // Ship outbox events for this service.
  const pump = setInterval(() => {
    void bus.pumpOutbox(db.shared).catch((err) => logger.warn({ err }, 'Outbox pump failed'));
  }, Number(process.env['OUTBOX_INTERVAL_MS'] ?? 2_000));
  pump.unref?.();

  const shutdown = async (signal: string) => {
    logger.info({ signal, drainSeconds: definition.drainSeconds }, 'Draining service');
    clearInterval(pump);
    const timer = setTimeout(() => {
      logger.error('Drain timeout exceeded; forcing exit');
      process.exit(1);
    }, definition.drainSeconds * 1000);
    timer.unref?.();
    try {
      await app.close();
      await bus.close();
      await bus.pumpOutbox(db.shared).catch(() => 0);
      await db.destroy();
      logger.info('Drain complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during drain');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled rejection'));

  const listen = async () => {
    const port = Number(process.env['PORT'] ?? definition.port);
    await app.listen({ port, host: config.host });
    logger.info(
      { port, domain: definition.domain, database: definition.database },
      `${definition.name} service listening`,
    );
  };

  return { app, db, bus, logger, listen };
}

/** Convenience bootstrap used by every service entrypoint. */
export async function runService(options: CreateServiceOptions): Promise<void> {
  try {
    const runtime = await createService(options);
    await runtime.listen();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to start ${options.name} service`, err);
    process.exit(1);
  }
}
