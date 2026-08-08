/**
 * API gateway — the single public entrypoint.
 *
 * Responsibilities:
 *  - terminate client requests and attach trace context
 *  - route each path prefix to the owning service
 *  - protect callers with per-tenant rate limiting, circuit breakers,
 *    bulkheads, timeouts and safe retries
 *  - shed load and degrade gracefully instead of cascading failures
 *  - expose aggregate health of the mesh for load balancers and dashboards
 *
 * The gateway holds no business logic and no database.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/index.js';
import { ROUTABLE_SERVICES, type ServiceDefinition } from '../platform/manifest.js';
import { ALL_RESOURCES } from '../platform/resources.js';
import { breakerSnapshot, CircuitOpenError, resilientFetch } from '../platform/resilience.js';
import {
  createServiceLogger,
  formatTraceparent,
  httpDuration,
  httpErrors,
  httpRequests,
  metrics,
} from '../platform/telemetry.js';
import {
  contextFromHeaders,
  enterContext,
  localCollector,
  startSpan,
  type Span,
} from '../platform/tracing.js';

/**
 * The gateway doubles as the mesh's trace collector: every service exports its
 * spans here, so one in-memory buffer can rebuild the full cross-service
 * waterfall for a request without any external tracing backend.
 */
const collector = localCollector;

const logger = createServiceLogger('gateway');

/** Where each service can be reached. Overridable per environment. */
function upstreamFor(service: ServiceDefinition): string {
  const key = `SERVICE_URL_${service.name.toUpperCase()}`;
  return process.env[key] ?? `http://${service.name}:${service.port}`;
}

interface Route {
  prefix: string;
  service: ServiceDefinition;
}

/**
 * Build the routing table from the manifest: every CRUD resource maps to its
 * owning service, plus the custom route prefixes each service declares.
 */
function buildRoutingTable(): Route[] {
  const routes: Route[] = [];
  const seen = new Set<string>();

  for (const resource of ALL_RESOURCES) {
    const owner = ROUTABLE_SERVICES.find((s) => s.owns.some((re) => re.test(resource.table)));
    if (!owner) continue;
    const prefix = `/api/${resource.path}`;
    if (seen.has(prefix)) continue;
    seen.add(prefix);
    routes.push({ prefix, service: owner });
  }

  for (const service of ROUTABLE_SERVICES) {
    for (const custom of service.customRoutes) {
      const prefix = `/api/${custom}`;
      if (seen.has(prefix)) continue;
      seen.add(prefix);
      routes.push({ prefix, service });
    }
    // Extended (non-CRUD) surfaces registered by the owning service.
    for (const custom of service.customRoutes) {
      const prefix = `/api/${custom}-ext`;
      if (seen.has(prefix)) continue;
      seen.add(prefix);
      routes.push({ prefix, service });
    }
  }

  routes.push({ prefix: '/api/realtime', service: ROUTABLE_SERVICES.find((s) => s.name === 'collaboration')! });
  routes.push({ prefix: '/api/platform', service: ROUTABLE_SERVICES.find((s) => s.name === 'tenancy')! });
  routes.push({ prefix: '/api/admin', service: ROUTABLE_SERVICES.find((s) => s.name === 'identity')! });

  // Longest prefix wins so `/api/deal-registrations` never gets eaten by `/api/deals`.
  return routes.sort((a, b) => b.prefix.length - a.prefix.length);
}

const routingTable = buildRoutingTable();

function resolve(pathname: string): Route | undefined {
  return routingTable.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
}

async function main(): Promise<void> {
  const app = Fastify({
    loggerInstance: logger as never,
    trustProxy: true,
    disableRequestLogging: true,
    bodyLimit: Number(process.env['BODY_LIMIT_BYTES'] ?? 25 * 1024 * 1024),
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'traceparent', 'X-Tenant-Id', 'Idempotency-Key'],
    exposedHeaders: ['traceparent', 'x-service'],
  });
  await app.register(rateLimit, {
    max: Number(process.env['GATEWAY_RATE_LIMIT_MAX'] ?? config.rateLimitMax * 5),
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) ?? req.ip,
  });

  app.get('/health', async () => ({ status: 'ok', service: 'gateway', routes: routingTable.length }));
  app.get('/health/live', async () => ({ status: 'ok' }));

  /** Readiness of the whole mesh, used by dashboards and smoke tests. */
  app.get('/health/ready', async (_req, reply) => {
    const results = await Promise.all(
      ROUTABLE_SERVICES.map(async (service) => {
        try {
          const res = await resilientFetch(`${upstreamFor(service)}/health/ready`, {
            timeoutMs: 2_000,
            retries: 0,
            target: service.name,
          });
          return { service: service.name, status: res.ok ? 'ready' : 'degraded' };
        } catch {
          return { service: service.name, status: 'unreachable' };
        }
      }),
    );
    const unhealthy = results.filter((r) => r.status !== 'ready');
    return reply.status(unhealthy.length === 0 ? 200 : 503).send({
      status: unhealthy.length === 0 ? 'ready' : 'degraded',
      services: results,
      breakers: breakerSnapshot(),
    });
  });

  app.get('/metrics', async (_req, reply) =>
    reply.header('content-type', 'text/plain; version=0.0.4').send(metrics.render()),
  );

  /** Topology introspection: which service owns which surface. */
  app.get('/api/_topology', async () => ({
    services: ROUTABLE_SERVICES.map((s) => ({
      name: s.name,
      domain: s.domain,
      description: s.description,
      database: s.database,
      scaling: s.scaling,
      slo: s.slo,
      publishes: s.publishes,
      consumes: s.consumes,
      routes: routingTable.filter((r) => r.service.name === s.name).map((r) => r.prefix),
    })),
  }));

  /* ---------------------------------------------------------------- */
  /* Distributed trace collector                                       */
  /* ---------------------------------------------------------------- */

  /** Span ingest from every service (internal, not exposed by the LB). */
  app.post('/internal/traces', async (request, reply) => {
    const body = request.body as { spans?: Span[] } | undefined;
    const spans = Array.isArray(body?.spans) ? body!.spans : [];
    collector.ingest(spans);
    return reply.status(202).send({ accepted: spans.length });
  });

  /** Rolling service/dependency aggregates powering the dashboard header. */
  app.get('/api/_traces/stats', async (request) => {
    const { windowMs } = request.query as { windowMs?: string };
    return collector.stats(Number(windowMs ?? 5 * 60_000));
  });

  /** Live tail: pushes a compact trace summary as soon as a root span closes. */
  app.get('/api/_traces/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const onSpan = (span: Span) => {
      // Emit once per trace, when the entry span (gateway server span) closes.
      if (span.kind !== 'server' || span.service !== 'gateway') return;
      const detail = collector.get(span.traceId);
      if (!detail) return;
      const { spans: _spans, ...summary } = detail;
      reply.raw.write(`event: trace\ndata: ${JSON.stringify(summary)}\n\n`);
    };
    collector.on('span', onSpan);

    const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 15_000);
    heartbeat.unref?.();
    const close = () => {
      clearInterval(heartbeat);
      collector.off('span', onSpan);
    };
    request.raw.on('close', close);
    request.raw.on('error', close);
    return reply;
  });

  /** One trace, fully expanded into an ordered span waterfall. */
  app.get('/api/_traces/:traceId', async (request, reply) => {
    const { traceId } = request.params as { traceId: string };
    const detail = traceId.startsWith('cid_')
      ? collector.findByCorrelationId(traceId)
      : collector.get(traceId);
    if (!detail) return reply.status(404).send({ error: 'Not Found', message: 'Trace expired or unknown' });
    return detail;
  });

  /** Recent traces with server-side filtering. */
  app.get('/api/_traces', async (request) => {
    const q = request.query as Record<string, string | undefined>;
    return {
      generatedAt: Date.now(),
      traces: collector.list({
        limit: Number(q['limit'] ?? 100),
        ...(q['service'] ? { service: q['service'] } : {}),
        ...(q['status'] === 'error' || q['status'] === 'ok' ? { status: q['status'] } : {}),
        ...(q['tenantId'] ? { tenantId: q['tenantId'] } : {}),
        ...(q['search'] ? { search: q['search'] } : {}),
        ...(q['minDurationMs'] ? { minDurationMs: Number(q['minDurationMs']) } : {}),
      }),
    };
  });

  app.all('/api/*', async (request, reply) => {
    const started = process.hrtime.bigint();
    const url = new URL(request.url, 'http://gateway.local');
    const route = resolve(url.pathname);

    // The gateway is where a trace is born: adopt an inbound trace if the
    // caller supplied one, otherwise mint trace + correlation ids here.
    const ctx = contextFromHeaders('gateway', request.headers as Record<string, string | undefined>);
    enterContext(ctx);
    const trace = ctx.trace;
    reply.header('traceparent', formatTraceparent(trace));
    reply.header('x-correlation-id', ctx.correlationId);

    if (!route) {
      return reply.status(404).send({ error: 'Not Found', message: `No service owns ${url.pathname}` });
    }

    const span = startSpan(`${request.method} ${route.prefix}`, {
      kind: 'server',
      service: 'gateway',
      context: ctx,
      attributes: {
        'http.method': request.method,
        'http.target': url.pathname,
        'http.route': route.prefix,
        'peer.service': route.service.name,
      },
    });

    const target = `${upstreamFor(route.service)}${request.url}`;
    const headers: Record<string, string> = {
      'x-forwarded-for': (request.headers['x-forwarded-for'] as string) ?? request.ip,
      'x-request-id': request.id,
    };
    for (const key of ['authorization', 'content-type', 'accept', 'x-tenant-id', 'idempotency-key', 'x-all-tenants']) {
      const value = request.headers[key];
      if (typeof value === 'string') headers[key] = value;
    }

    try {
      const upstream = await resilientFetch(target, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body ?? {}),
        timeoutMs: Number(process.env['GATEWAY_TIMEOUT_MS'] ?? 15_000),
        retries: 1,
        target: route.service.name,
      });

      const payload = await upstream.text();
      const contentType = upstream.headers.get('content-type') ?? 'application/json';
      httpRequests.inc({ service: 'gateway', route: route.prefix, status: upstream.status });
      httpDuration.observe(
        { service: 'gateway', route: route.prefix },
        Number(process.hrtime.bigint() - started) / 1e9,
      );
      span.end({
        status: upstream.status >= 500 ? 'error' : 'ok',
        attributes: { 'http.status_code': upstream.status },
      });
      return reply
        .status(upstream.status)
        .header('content-type', contentType)
        .header('x-upstream-service', route.service.name)
        .send(payload);
    } catch (err) {
      httpErrors.inc({ service: 'gateway', route: route.prefix });
      span.end({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
        attributes: { 'http.status_code': err instanceof CircuitOpenError ? 503 : 502 },
      });

      if (err instanceof CircuitOpenError) {
        request.log.warn({ target: route.service.name }, 'Shedding request: circuit open');
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: `${route.service.domain} is temporarily unavailable. Please retry shortly.`,
          service: route.service.name,
          traceId: trace.traceId,
          correlationId: ctx.correlationId,
        });
      }
      request.log.error({ err, service: route.service.name }, 'Upstream call failed');
      const status = (err as { statusCode?: number }).statusCode ?? 502;
      return reply.status(status >= 500 ? status : 502).send({
        error: 'Bad Gateway',
        message: `${route.service.domain} did not respond in time.`,
        service: route.service.name,
        traceId: trace.traceId,
        correlationId: ctx.correlationId,
      });
    }
  });

  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen({ port, host: config.host });
  logger.info({ port, routes: routingTable.length }, 'API gateway listening');

  const shutdown = async () => {
    logger.info('Gateway draining');
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void main().catch((err) => {
  logger.error({ err }, 'Gateway failed to start');
  process.exit(1);
});
