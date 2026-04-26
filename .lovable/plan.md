## Goal

Complete the Supabase removal so the platform runs entirely on AWS-native infrastructure. Pick the right database for each workload, then physically delete every Supabase artifact from the repository.

## Database recommendation

**Stay on PostgreSQL — but on Amazon Aurora PostgreSQL Serverless v2, not vanilla RDS.**

| Option | When to use | Verdict for this app |
|---|---|---|
| RDS for PostgreSQL (current CFN) | Predictable load, lowest cost | Works, but manual scaling and slower failover |
| **Aurora PostgreSQL Serverless v2** | Bursty multi-tenant SaaS, HA, fast failover | **Recommended** |
| Aurora DSQL | Active-active multi-region writes | Overkill, newer, fewer extensions |
| DynamoDB | Single-digit-ms KV / time-series | Wrong fit — schema is heavily relational with 100+ joined tables |
| Redshift | Analytics warehouse | Add later only if reporting load grows |
| Timestream | Pure time-series metrics | Not needed for CRM data |

**Why Aurora PG Serverless v2 wins here**
- Drop-in PostgreSQL — zero code changes, all 50+ existing trigger/SECURITY DEFINER functions keep working.
- Auto-scales 0.5 → 128 ACUs in seconds, ideal for the multi-tenant traffic pattern.
- 6-way replicated storage, sub-30s failover, 15 read replicas, point-in-time restore.
- ~3-5× write throughput vs RDS on the same vCPU.
- Native pgvector, pg_cron, pg_partman, logical replication — supports future AI/embedding features without another DB.

**Companion stores**
- **ElastiCache Redis (Valkey)** — sessions, BullMQ queues, realtime pub/sub, AI response cache.
- **OpenSearch Serverless** — full-text search across tickets/contacts/deals (replaces `ILIKE %x%` scans on big tables).
- **S3** — files (replaces all Supabase Storage buckets).
- **Cognito** — identity (already wired).
- **SES** — transactional email (replaces Resend dependency in edge functions).

## Removal scope — what physically goes away

### Repository deletes
- `supabase/` entire directory: `config.toml`, all 38 edge functions under `supabase/functions/*`, migrations folder.
- `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts`.
- `@supabase/supabase-js` and `@supabase/auth-helpers-*` from `package.json`.
- All `VITE_SUPABASE_*` env var references in `.env.example`, README, MIGRATION.md, Dockerfile.
- The shim's auto-warning logs that mention "supabase" — renamed to `api-shim`.

### Frontend rewires (already-migrated shim, just rename + harden)
- Rename `src/integrations/api/client.ts` exports from `supabase` → `api` and update the 287 import sites in one mechanical pass. Keep a 1-line backward-compat alias for one release.
- Replace `src/integrations/supabase/types.ts` with a generated `src/integrations/api/types.ts` produced from the backend OpenAPI spec (`@hey-api/openapi-ts`) so `Database` types disappear cleanly.

### Edge function replacements (port → Fastify, then delete)
All 38 Supabase functions get backend equivalents under `/api/*`:

| Supabase function | New Fastify route | Worker queue |
|---|---|---|
| workflow-trigger | POST /api/workflows/trigger | `workflows` |
| scheduled-checks | (cron in worker) | `scheduled` |
| create-users, set-user-password | /api/admin/users/* | — |
| hubspot-auth, hubspot-sync | /api/integrations/hubspot/* | `integrations` |
| office365-auth, office365-sync | /api/integrations/office365/* | `integrations` |
| exchange-rates | /api/exchange-rates (Redis-cached) | `scheduled` |
| intelligent/sales/support/employee/tender/sales-assistant | /api/ai/assistant/* | `ai-jobs` |
| sales/finance/executive/meddic-insights | /api/ai/insights/* | `ai-jobs` |
| enrich-company / executives / user / offering / problem-area / project-plan / batch-enrich-offerings | /api/ai/enrich/* | `ai-jobs` |
| generate-recommendation-steps, generate-solution-documentation | /api/ai/generate/* | `ai-jobs` |
| account-intelligence, contact-intelligence, threat-intelligence | /api/ai/intelligence/* | `ai-jobs` |
| verify-document | /api/ai/verify-document | `ai-jobs` |
| fetch-company-info | /api/ai/fetch-company-info | `ai-jobs` |
| finance-ai-insights | /api/ai/insights/finance | `ai-jobs` |

Email: Resend → SES (worker `email` queue). Bedrock + OpenAI + Google through existing `lib/ai-provider.ts`.

### Storage bucket migration
8 Supabase buckets → S3 prefixes in a single bucket:
- `sop-images`, `organization-assets`, `tenant-logos` → `public/` prefix, CloudFront-fronted.
- `order-documents`, `employee-documents`, `expense-receipts`, `verification-documents`, `tender-documents` → `private/` prefix, signed URLs only.
- One-shot migration script: list each bucket, stream objects to S3, rewrite DB columns holding old paths.

### Database migration
- Use AWS DMS (CDC mode) to copy current Supabase Postgres → Aurora PG Serverless v2 with minimal downtime.
- All 50 SECURITY DEFINER functions and triggers transfer as-is (they're standard PostgreSQL).
- Auth subjects in `user_id` columns stay as UUIDs and are kept in sync with Cognito `sub` (already the case for new users; one backfill script for legacy users).
- After cutover, drop Supabase-only schemas (`auth`, `storage`, `realtime`, `vault`, `supabase_functions`).

### Realtime
- Postgres `LISTEN/NOTIFY` triggers + Fastify WebSocket gateway (planned in the prior task) replace Supabase Realtime.
- Channel API in the shim already mimics Supabase semantics, so calling code is unchanged.

### Infra (`infra/cloudformation.yaml`) updates
- Replace `AWS::RDS::DBInstance` with `AWS::RDS::DBCluster` (`engine: aurora-postgresql`, `EngineMode: provisioned`, `ServerlessV2ScalingConfiguration: {MinCapacity: 0.5, MaxCapacity: 16}`) + 2 writer/reader instances.
- Add ElastiCache Valkey cluster (already in the previous plan).
- Add CloudFront distribution in front of the public S3 prefix.
- Add SES domain identity + DKIM + bounce SNS topic.
- Remove anything pointing to Supabase URLs, anon keys, or service role keys from task definitions and parameter store.

## Cutover sequence

1. **Provision**: Aurora cluster, ElastiCache, S3 bucket, CloudFront, SES — no traffic yet.
2. **Bulk copy**: DMS full-load Supabase → Aurora; sync storage buckets to S3.
3. **Enable CDC**: DMS keeps Aurora in sync with Supabase writes.
4. **Deploy backend** with all ported routes and workers pointing at Aurora.
5. **Deploy frontend** with renamed `api` shim. Smoke test in staging tenant.
6. **DNS / config flip**: point app to the new backend; stop writes to Supabase.
7. **Verify** for 7 days against `tenant_audit_log` and worker error rate.
8. **Delete**: edge functions (via `supabase--delete_edge_functions`), `supabase/` folder, npm deps, env vars, Supabase project.

## Out of scope

- Multi-region active-active (revisit if/when global tenants are added).
- Migrating to a non-PostgreSQL engine — would require rewriting every trigger, RLS policy, and 100+ joined queries for marginal gain.
- Replacing TanStack Query / shadcn / Vite — only the data layer changes.

## Acceptance criteria

- `rg -l supabase src/ backend/ infra/` returns 0 hits (except a CHANGELOG entry).
- `package.json` has no `@supabase/*` dependencies.
- All 38 edge functions deleted from the Supabase project and the repo.
- Aurora cluster serves 100% of reads/writes; Supabase project status page is irrelevant to uptime.
- Realtime, ticketing workflows, HR onboarding, AI insights, OAuth integrations, file uploads, and emails all work end-to-end without any Supabase call.
- Load test: 500 concurrent users, p95 API latency < 250 ms; Aurora ACUs auto-scale and settle.
