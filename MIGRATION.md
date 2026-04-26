# Supabase → AWS Migration

## Database choice

**Amazon Aurora PostgreSQL Serverless v2** (drop-in PostgreSQL, auto-scales 0.5 → 16 ACUs, MultiAZ, sub-30s failover, native pgvector / pg_cron). All 50+ existing trigger and SECURITY DEFINER functions run unchanged. DynamoDB / Redshift / Timestream were evaluated and rejected — the schema is heavily relational and the workload is OLTP.

Companion stores: ElastiCache Valkey (queues + realtime pub/sub + cache), S3 + CloudFront (files), Cognito (auth), SES (email), Bedrock (AI).

## What's done

- **Frontend**: all 287 files import `@/integrations/api/client` (REST shim). Auth, queries, mutations route to Fastify.
- **Backend**: Fastify + Knex + Cognito JWT; CRUD factory exposes 130+ tables.
- **Infra (`infra/cloudformation.yaml`)**: Aurora Serverless v2 cluster + writer/reader, ElastiCache Valkey, ECS Fargate (frontend + backend), ALB + WAF v2, S3 + CloudFront for public assets, SES domain identity, CloudWatch alarms, autoscaling.
- **Shim**: `functions.invoke()` routes to `/api/workflows/trigger`, `/api/ai/*`, etc. `storage.from(...)` calls hit `/api/storage/sign-upload` + `sign-download` (S3 presigned URLs).
- **New backend routes**: `POST /api/workflows/trigger`, `POST /api/storage/sign-upload`, `POST /api/storage/sign-download`, `DELETE /api/storage/object`, `GET /api/storage/public-url`.

## What still needs to happen to fully retire Supabase

1. **Deploy CFN**: `aws cloudformation deploy --template-file infra/cloudformation.yaml --stack-name nexuscrm-prod --capabilities CAPABILITY_IAM --parameter-overrides DBMasterPassword=<...> SesDomainName=<...>`
2. **Data migration**: AWS DMS full-load + CDC from current Postgres → Aurora; one-shot copy of Supabase Storage buckets → `s3://<bucket>/{public,private}/<bucket-name>/...`.
3. **Port remaining edge functions** (HubSpot, Office365, create-users, set-user-password, enrichment, document verification, etc.) into `backend/src/routes/` — extend `FUNCTION_ROUTE_MAP` in the shim.
4. **Realtime gateway**: add `@fastify/websocket` + Redis pub/sub for `notifications`, `tickets`, `chat_messages`, `hr_workflows` tables; rewrite the shim's `channel()` to talk to it.
5. **Background workers**: BullMQ on Valkey for SLA timers, invoice-overdue sweeps, email send, AI enrichment. Deploy as a second ECS service using the same backend image with `command: ["node", "dist/worker.js"]`.
6. **Delete**: `supabase/` folder (38 edge functions + config), `@supabase/supabase-js` dep, `src/integrations/supabase/`, `VITE_SUPABASE_*` env vars.

## Local development

Backend: `cd backend && npm install && npm run dev` (needs `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`).
Frontend: `npm run dev` (set `VITE_API_URL` if backend isn't on the same origin).
