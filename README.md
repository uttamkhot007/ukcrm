# NexusCRM

Enterprise-grade, multi-tenant CRM platform with Sales, Finance, HR, Technical,
Marketing, and Employee Management modules. AI-enabled across the stack.

## Tech stack

**Frontend**
- Vite + React 18 + TypeScript
- Tailwind CSS v3 + shadcn/ui
- React Router, TanStack Query

**Backend (self-hosted on AWS)**
- Fastify (Node 20) on ECS Fargate
- AWS Aurora PostgreSQL 15
- AWS Cognito for authentication
- AWS S3 for file storage
- AWS SES for transactional email
- ElastiCache (Valkey) for queues + realtime pub/sub
- BullMQ background workers

The backend lives in `backend/` and is deployed via the GitHub Actions
workflows in `.github/workflows/`. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the
full AWS setup, including Cognito, RDS, ECS, ALB, and S3 provisioning.

## Local development

```sh
# 1. Install dependencies (frontend)
npm install

# 2. Start the frontend dev server
npm run dev

# 3. In a separate terminal, start the backend
cd backend
cp .env.example .env       # fill in DB / Cognito / S3 values
npm install
npm run migrate
npm run dev
```

The frontend talks to the backend via `VITE_API_URL` (defaults to the same
origin). All HTTP calls go through the REST shim in
`src/integrations/api/` — there is no Supabase coupling in production
builds (see the production aliases in `vite.config.ts`).

## Production build

```sh
npm run build
```

Output is a static SPA in `dist/`. Serve it from any static host (the included
`nginx/` config + `Dockerfile` produce a container suitable for ECS).

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) — AWS deployment runbook
- [MIGRATION.md](./MIGRATION.md) — database migration guide
