# Migrating from Supabase to Self-Hosted PostgreSQL + Fargate

This project ships with a complete self-hosted backend (Fastify + PostgreSQL + AWS Cognito) that runs on AWS ECS Fargate. The frontend can incrementally move off the Supabase client.

## What's in place

| Layer | Location | Status |
|---|---|---|
| Fastify backend | `backend/` | ✅ Complete |
| Generic CRUD factory (115+ tables) | `backend/src/routes/all-routes.ts` | ✅ Complete (now supports `eq`, `neq`, `gt/gte/lt/lte`, `like`, `ilike`, `in`, `is`, `not`) |
| Cognito auth (login, register, confirm, forgot/reset, logout) | `backend/src/routes/auth.ts` | ✅ Complete |
| AI gateway (Bedrock / OpenAI / Gemini with fallback) | `backend/src/routes/ai.ts` | ✅ Complete |
| AWS Fargate CloudFormation | `infra/cloudformation.yaml` | ✅ Hardened — VPC Multi-AZ, RDS Multi-AZ, ALB w/ ACM, WAF v2, CloudWatch alarms, SNS, autoscaling (CPU+memory, frontend+backend), Cognito MFA, S3 lifecycle, Secrets Manager |
| Deploy script | `infra/deploy.sh` | ✅ Complete |
| Typed REST client | `src/lib/api-client.ts` | ✅ Covers all 115+ tables |
| Supabase-compatible shim | `src/integrations/api/client.ts` | ✅ v1 — covers most query patterns |

## Frontend migration path

The codebase has 250+ files importing `@/integrations/supabase/client`. Migrate incrementally — one component at a time.

### Option A — Drop-in shim (fastest, recommended)

Change the import:

```diff
- import { supabase } from "@/integrations/supabase/client";
+ import { supabase } from "@/integrations/api/client";
```

Most code keeps working unchanged. The shim supports:
- `from(table).select().eq/neq/gt/gte/lt/lte/in/ilike/is/not/filter/match/order/limit/range/single/maybeSingle`
- `from(table).insert(rows).select()`
- `from(table).update(values).eq("id", x)`
- `from(table).upsert(rows)`
- `from(table).delete().eq("id", x)`
- `auth.signInWithPassword/signUp/signOut/getSession/getUser/onAuthStateChange/resetPasswordForEmail`

### Option B — Native typed API (cleaner long-term)

```ts
import { api } from "@/lib/api-client";
const { data } = await api.invoices.list({ status: "pending", page: 1, limit: 50 });
```

## Known gaps (throw clear errors when hit)

| Feature | Status | Workaround |
|---|---|---|
| Embedded selects `*, related(*)` | ⚠️ Logs warning, returns flat row | Fetch related rows separately |
| `.or()` composite filters | ⚠️ Logs warning, ignored | Add a dedicated backend endpoint |
| Realtime channels | ❌ No-op stub | Use polling or add WebSocket route to Fastify |
| `storage.upload/download` | ❌ Throws | Wire to S3 via signed URLs |
| `functions.invoke()` | ❌ Throws | Migrate edge function logic to `backend/src/routes/` |
| `rpc()` | ❌ Throws | Add explicit endpoint or run as raw SQL via `db.raw` |

## Deploying to AWS

```bash
export AWS_REGION=ap-south-1
export ENV_NAME=production
export DB_MASTER_PASSWORD='use-a-strong-16+-char-password'
# optional
export AI_OPENAI_API_KEY=sk-...
export AI_GOOGLE_API_KEY=...

./infra/deploy.sh
```

Outputs an ALB URL, Cognito pool ID, and ECR URIs. Add the optional `AlarmEmail` parameter to receive CloudWatch alerts.

## GitHub sync

This project is connected to GitHub via Lovable's bidirectional sync — every change in Lovable is auto-pushed to your repo in real time. No manual git commands needed.
