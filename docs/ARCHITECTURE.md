# Architecture

NexusCRM runs as a **fine-grained microservice estate**: 21 independently
deployable services plus an API gateway, each owning its own data, scaled and
released on its own cadence, serving many tenants with configurable isolation.

```text
                       ┌───────────────────────────┐
   browser / mobile ──►│        API Gateway        │  authn · rate limit · routing
                       │  circuit breakers · SLOs  │  tracing · load shedding
                       └─────────────┬─────────────┘
                                     │  (HTTP, W3C traceparent)
   ┌───────────┬───────────┬─────────┴────┬────────────┬──────────────┐
   ▼           ▼           ▼              ▼            ▼              ▼
identity    tenancy       crm           sales       billing   …17 more services
   │           │           │              │            │
   ▼           ▼           ▼              ▼            ▼
 own DB      own DB      own DB         own DB       own DB     (database-per-service)
   └───────────┴───────────┴──────┬───────┴────────────┘
                                  ▼
                    Redis Streams event bus (at-least-once)
                    + transactional outbox per service
```

## Services

Every service is declared once in `backend/src/platform/manifest.ts`: its
bounded context, the tables it owns, the events it publishes and consumes, its
scaling envelope and its SLO. Nothing else may claim those tables — CI enforces
it.

| Service | Bounded context |
|---|---|
| `gateway` | Public edge: routing, authn, rate limiting, circuit breaking |
| `identity` | Users, profiles, roles, teams, authorized domains |
| `tenancy` | Tenants, members, modules, licences, data residency |
| `crm` | Contacts, leads, alliance organisations |
| `sales` | Deals, MEDDIC pipeline, quotations, targets, offerings |
| `presales` | POCs, RFPs, demos, technical assessments |
| `billing` | Invoices, payments, order processing |
| `accounting` | Ledgers, vouchers, budgets, reconciliation |
| `taxation` | GST, TDS/TCS, e-way bills |
| `inventory` | Stock, godowns, procurement |
| `hr` | Employees, leave, attendance, hiring |
| `expenses` | Expense reports, travel |
| `assets` | Asset register, assignments, maintenance |
| `projects` | Projects, tasks, RACI, milestones |
| `support` | Tickets, SLAs, escalations, remote sessions |
| `compliance` | Frameworks, controls, evidence, legal |
| `marketing` | Campaigns, sequences, journeys, PR |
| `collaboration` | Chat, notifications, calendar, learning, realtime |
| `files` | Object storage brokerage |
| `integrations` | Third-party connectors and webhooks |
| `ai` | Model routing, prompts, insights |
| `workflow` | Sagas, schedules, outbox orchestration |

One container image ships all of them; `SERVICE=<name>` selects the identity of
each process. This keeps the supply chain and build cache simple while every
service remains independently deployable, restartable and scalable.

```bash
SERVICE=sales PORT=3014 node dist/services/main.js   # one service
node dist/gateway/index.js                            # the edge
docker compose -f docker-compose.services.yml up      # the whole mesh
```

## Data ownership

**Database-per-service.** Each service connects to its own logical database
(`DB_NAME_<SERVICE>`); locally these collapse to one schema per service in a
single Postgres so developers run one container. A service that touches another
service's table fails the boundary check in CI rather than at 3am.

Cross-service reads happen through the owning service's API or through events —
never through a shared join.

## Multi-tenancy

Three isolation tiers, chosen per tenant, resolved at request time:

1. **Row-level (default)** — shared tables filtered by `tenant_id`, with the
   tenant pinned onto the database session (`app.tenant_id`) so policies and
   audit triggers see the same identity the API does.
2. **Schema-per-tenant** — for tenants needing logical separation inside a
   shared cluster.
3. **Dedicated cluster** — enterprise/regulated tenants get their own database
   (optionally in another region). Placement lives in `tenant_clusters`;
   `DatabaseRouter` opens, caches and evicts those pools automatically.

The tenant always comes from the verified JWT. Platform admins may target
another tenant explicitly via `X-Tenant-Id`, and every such request is logged
as an impersonation.

## Events and consistency

Writes and their events commit together through a **transactional outbox**
(`outbox_events`), and a pump ships them to Redis Streams. Consumers use groups
with at-least-once delivery, so handlers must be idempotent — every event
carries a stable `eventId`.

Long-running cross-service flows (deal won → order → invoice → onboarding) are
tracked in `saga_instances` with recorded compensation steps.

## Scalability and resilience

- Autoscaling envelope per service (`min`, `max`, CPU/memory, target CPU).
- Bounded connection pools with statement, lock and idle-transaction timeouts.
- Circuit breakers, bulkheads, jittered retries and per-call timeouts on every
  cross-service call (`resilientFetch`); retries only on idempotent methods or
  with an `Idempotency-Key`.
- The gateway sheds load with a clear 503 per bounded context instead of
  cascading a failure across the estate.
- Graceful drain per service, with the outbox flushed before exit.

## Observability and SLOs

- W3C trace context propagated end to end; every log line carries service,
  trace, tenant and user.
- Prometheus metrics on `/metrics`: RED metrics, pool saturation, event
  throughput, circuit-breaker state, and remaining SLO error budget.
- `/health/live` (process) and `/health/ready` (dependencies) probes; the
  gateway aggregates readiness for the whole mesh.
- `GET /api/_topology` returns the live service map, ownership and SLOs.

## Security

- JWT verification at the edge and again in every service — no implicit trust
  between services.
- Tenant scoping applied in the data layer, not the UI.
- Admin-only write guards on authorization-bearing tables.
- Secrets injected per service; logs redact tokens, cookies and passwords.
- Error responses never leak internals; the trace ID ties a user report to logs.

## Delivery

`.github/workflows/services-ci.yml` runs boundary invariants first, then builds
and verifies every service in parallel, then boots a service against real
Postgres and Redis and probes its health and metrics.

```bash
npm run check:boundaries   # data ownership, ports, event contracts
npm run typecheck
npm run build
```

## Migration status

The estate is being carved out of the previous monolith with the strangler
pattern. The service runtime, boundaries, gateway, tenancy routing, event bus
and CI gates are in place, and every route is now served by its owning service.
Remaining work is mechanical: moving the legacy route modules physically into
their service packages and splitting the shared schema into per-service
databases in production (the code already reads per-service connection
settings).
