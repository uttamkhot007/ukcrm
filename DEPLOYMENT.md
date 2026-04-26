# NexusCRM — Deployment & Admin Runbook

End-to-end flow: **GitHub → AWS ECS Fargate (CloudFormation)**, plus how to
seed the **super admin** and invite **tenant admins** that log in with their
corporate email addresses.

---

## 1. One-time AWS bootstrap (runs from your laptop)

```bash
export AWS_REGION=ap-south-1
export ENV_NAME=production
export DB_MASTER_PASSWORD='ChangeMe-MinLen16-Chars!'   # 16+ chars
export AI_OPENAI_API_KEY=sk-...                         # optional
export AI_GOOGLE_API_KEY=...                            # optional

bash infra/deploy.sh
```

This creates: VPC + subnets, Aurora PostgreSQL, ElastiCache (Valkey/Redis),
Cognito User Pool + Client, S3 bucket, ECR repos, ALB, ECS cluster, two
Fargate services (frontend + backend), and IAM roles. **Note the outputs**:
`CognitoUserPoolId`, `CognitoClientId`, `ALBDNS`.

---

## 2. One-time GitHub OIDC trust (so Actions can deploy without long-lived keys)

In AWS IAM, create an **OIDC provider** for `token.actions.githubusercontent.com`
and a role `GitHubDeployRole` whose trust policy allows your repo:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCT>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:ref:refs/heads/main" }
    }
  }]
}
```

Attach permissions: `AmazonEC2ContainerRegistryPowerUser`,
`AmazonECS_FullAccess`, `CloudFormationReadOnlyAccess`,
`AmazonSSMReadOnlyAccess` (or scope tighter).

In GitHub: **Repo → Settings → Secrets and variables → Actions** add:
- `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::<ACCT>:role/GitHubDeployRole`
- `AWS_REGION` = `ap-south-1`
- `ENV_NAME` = `production`

From now on every push to `main` triggers `.github/workflows/deploy.yml`,
which builds images → pushes to ECR → runs DB migrations → rolls out ECS.

---

## 3. Run database migrations the first time

The GitHub workflow does this on every deploy, but for the very first deploy:

```bash
# from inside an ECS exec session OR locally with DB tunneling:
cd backend && npm ci && npm run build && node dist/db/migrate.js
```

---

## 4. Create the **Super Admin** (cross-tenant access)

The super admin can log in with any email you choose (typically your platform
ops mailbox, e.g. `platform@yourco.com`). Their account is **auto-confirmed** —
no email verification needed.

```bash
cd backend && npm ci

export AWS_REGION=ap-south-1
export COGNITO_USER_POOL_ID=<from CFN outputs>
export COGNITO_CLIENT_ID=<from CFN outputs>
export DB_HOST=<aurora endpoint>
export DB_NAME=nexuscrm
export DB_USER=postgres
export DB_PASSWORD=<DB_MASTER_PASSWORD>

export SUPERADMIN_EMAIL='platform@yourco.com'
export SUPERADMIN_PASSWORD='Strong!Passw0rd#2026'
export SUPERADMIN_NAME='Platform Super Admin'

npx tsx src/scripts/seed-superadmin.ts
```

What it does (idempotent, safe to re-run):
1. Creates Cognito groups `super_admin` and `admin` if missing.
2. Creates the Cognito user (or reuses), sets a permanent password, marks email verified.
3. Adds the user to the `super_admin` group.
4. Inserts a `profiles` row with `is_super_admin = true`.
5. Inserts `user_roles` rows: `super_admin` + `admin`.
6. Inserts `tenant_members` rows for **every** existing tenant.

Login → `https://<ALB-DNS>/auth` with the email + password you set.

### 4b. Alternative: seed from GitHub Actions (no laptop needed)

After step 2's OIDC role is in place, add these GitHub repo secrets:
- `SUPERADMIN_EMAIL` (e.g. `platform@yourco.com`)
- `SUPERADMIN_PASSWORD` (strong, 12+ chars)
- `SUPERADMIN_NAME` (optional)

Then go to **GitHub → Actions → "Seed Superadmin (one-shot)" → Run workflow**,
type `SEED` to confirm. The workflow runs `seed-superadmin.ts` as a one-shot
Fargate task using the already-deployed backend image.

---

## 4c. Authorize email domains for tenant signup (Strict Allowlist)

Self-signup is **blocked by default**. To let users register with their
corporate email, the super admin (or a tenant admin) must allowlist the
domain in the UI:

1. Log in as super admin.
2. Go to **Admin Center → Authorized Domains**.
3. Add the domain (e.g. `acme.com`), pick the tenant, choose default role
   (`User` for staff, `Tenant Admin` to auto-promote).
4. From now on anyone signing up with `*@acme.com` is auto-added to that tenant.

> The `invite-tenant-admin.ts` script auto-allowlists the admin's email
> domain for the tenant on first invite, so you usually don't need to add
> the first entry manually.

---


## 5. Invite a **Tenant Admin** (logs in with their corporate email)

For each customer organization:

```bash
cd backend
export TENANT_SLUG=acme              # must already exist in `tenants` table
export ADMIN_EMAIL=admin@acme.com    # corporate email
export ADMIN_NAME='Acme Admin'

npx tsx src/scripts/invite-tenant-admin.ts
```

What happens:
- Cognito creates the user and **emails them an invitation** with a temporary
  password.
- On first login they are forced to set their own password.
- They are added to the Cognito `admin` group, get the `admin` role, and become
  a `tenant_members` row scoped to that tenant only — they cannot see other tenants.
- If the tenant has a `domain` field set (e.g. `acme.com`), the script warns
  when the email domain doesn't match. To **enforce** it, add a Cognito
  pre-signup Lambda trigger that rejects mismatched domains.

End users (non-admins) self-register from `/auth` (Sign Up) using their
corporate email. They land in the tenant whose domain matches their email
(handled by the backend on first login). Optionally tighten this with a
Cognito pre-signup trigger.

---

## 6. Day-to-day flow

```
Local edits   →   git push origin main
                       ↓
        GitHub Actions: deploy.yml
                       ↓
        ECR (frontend + backend images)
                       ↓
        DB migrations (one-shot Fargate task)
                       ↓
        ECS services rolled out (zero-downtime)
                       ↓
        https://<ALB-DNS>  (or your custom domain)
```

---

## 7. Useful operational commands

```bash
# tail backend logs
aws logs tail /ecs/production-backend --follow --region ap-south-1

# list tenants
psql -h <DB_HOST> -U postgres -d nexuscrm -c "select id, slug, name, domain from tenants;"

# promote an existing user to super admin (manual SQL)
psql ... -c "update profiles set is_super_admin=true where email='someone@yourco.com';"
psql ... -c "insert into user_roles(user_id, role)
             select user_id, 'super_admin' from profiles where email='someone@yourco.com'
             on conflict do nothing;"

# rotate super-admin password
aws cognito-idp admin-set-user-password \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username platform@yourco.com \
  --password 'NewStrong#Passw0rd!' --permanent
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `404 /api/auth/login` in browser | Backend service unhealthy. `aws ecs describe-services` + check CloudWatch logs. |
| `NotAuthorizedException` on login | Wrong password, or Cognito user not confirmed. Re-run seed script. |
| `User does not exist` | Cognito user wasn't created. Check `COGNITO_USER_POOL_ID` matches the CFN output. |
| Super admin only sees one tenant | Re-run `seed-superadmin.ts`; it refreshes `tenant_members` for all tenants. |
| Tenant admin can see other tenants | They were given `super_admin` role by mistake. Remove with SQL + Cognito group removal. |
