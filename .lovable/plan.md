
## Goal

Today, **Tenant Management** (`/admin/tenants`) is a single-page list with a configure sheet. We will turn it into a true **Super-Admin Platform Console** with four sibling sections that operate at the *platform* level, not the per-tenant level:

1. **Tenants** — directory + lifecycle of all workspaces
2. **User Management** — cross-tenant user/identity governance
3. **License Management** — subscription, seats, modules, billing
4. **Integrations** — platform-wide / shared integrations

These are explicitly **distinct** from the existing per-tenant pages under Admin Center (`/admin/organization`, `/admin/users`, `/admin/integrations`), which only operate inside the currently selected tenant.

---

## Innovative angle: "Platform vs Tenant" mental model

A clear visual separation will be enforced everywhere so super-admins never confuse the two scopes:

- New URL prefix `/admin/platform/...` for super-admin-only pages (the existing `/admin/tenants` will redirect into it).
- A persistent **"Platform Console" header banner** with a purple accent, "Operating across all tenants" badge, and a quick-jump tenant filter that scopes the views.
- Sidebar groups the four items under a collapsible "Platform Console" section visible only to super-admins.

---

## New Routes & Files

```text
/admin/platform                  → redirect to /admin/platform/tenants
/admin/platform/tenants          → PlatformTenants.tsx        (refactor of AdminTenants)
/admin/platform/users            → PlatformUsers.tsx          (NEW)
/admin/platform/licenses         → PlatformLicenses.tsx       (NEW)
/admin/platform/integrations     → PlatformIntegrations.tsx   (NEW)
```

Layout wrapper: `src/pages/admin/platform/PlatformLayout.tsx` adds the banner + sub-nav tabs and gates everything on `isSuperAdmin`.

---

## 1. Tenants (refactored)

Keep all current functionality, plus:

- KPI strip: total tenants, active, suspended, trial, MRR estimate.
- Bulk actions: suspend / reactivate / export.
- New columns: status (active/suspended/trial), seat usage (used/licensed), last activity.
- Lifecycle controls in detail sheet: Suspend, Archive, Transfer Ownership.

---

## 2. User Management (Cross-Tenant)

A **global user directory** that spans every tenant — something an individual tenant admin cannot see.

Features:
- Search every user across all tenants by email/name.
- Per-row chips showing **which tenants they belong to** and their role in each.
- Promote / demote **super_admin** flag (`profiles.is_super_admin`).
- Move / copy a user between tenants.
- Force password reset, disable account, view login history.
- Filter: orphaned users (no tenant), multi-tenant users, super admins, inactive >90d.

---

## 3. License Management

Platform-level commercial controls, separate from per-tenant module toggles.

Features:
- **Plan catalog editor**: define/edit Starter / Professional / Enterprise — included modules, seat caps, price, trial length. Backed by new tables `license_plans` and `license_plan_modules`.
- **Per-tenant license card**: current plan, seats licensed vs used, renewal date, trial expiry, payment status, add-on modules.
- **Upgrade / downgrade / extend trial** actions.
- **Module entitlements matrix**: grid of tenants × modules, super-admin can grant a module beyond the plan as an "add-on override".
- Usage analytics: seat utilisation %, overage alerts.

---

## 4. Platform Integrations

Integrations configured **once at the platform level** and inherited or offered to tenants — different from each tenant configuring their own HubSpot/O365 keys.

Two categories:

- **Platform-only integrations** (super-admin operational): Stripe billing, Resend (email), error monitoring, audit log sinks, SSO IdP federation, AWS infra hooks. Tenants never see these.
- **Marketplace integrations**: super-admin curates the catalog of integrations available, sets default credentials/templates, marks them as "available to tenants", "auto-enabled for tier X", or "disabled". Per-tenant page consumes this catalog.

Features:
- Catalog manager (enable/disable an integration platform-wide).
- Shared credential vault (super-admin stores org-wide OAuth client IDs once; tenants reuse without seeing secrets).
- Webhook router: define platform-wide webhook endpoints that fan out to tenants.
- Health dashboard: status, last sync, error rate per integration per tenant.

---

## Database changes

New tables (migration `009_platform_console.ts`):

```text
license_plans            (id, key, name, price_monthly, seat_cap, trial_days, is_active)
license_plan_modules     (plan_id, module_key)
tenant_licenses          (tenant_id PK, plan_id, status, seats_licensed,
                          trial_ends_at, renews_at, payment_status, notes)
tenant_module_overrides  (tenant_id, module_key, granted_by, expires_at)
platform_integrations    (id, key, name, category, is_enabled, config jsonb,
                          available_to_tenants bool, auto_enable_tier text)
platform_integration_credentials  (integration_id, secret_ref, created_by)
                          -- secret value lives in secrets store, not DB
user_audit_log           (id, user_id, actor_id, action, tenant_id, metadata, at)
```

Reuse existing `tenants`, `tenant_members`, `profiles`, `tenant_modules`, `module_definitions`.

All new tables: RLS enabled; only `is_super_admin(auth.uid())` can read/write.

---

## Backend (Fastify)

New route files under `backend/src/routes/`:
- `platform-tenants.ts` — bulk ops, suspend, transfer.
- `platform-users.ts` — cross-tenant search, role + super_admin mgmt.
- `platform-licenses.ts` — plan CRUD, tenant license CRUD, override grants.
- `platform-integrations.ts` — catalog + credential vault.

All guarded by a new `requireSuperAdmin` preHandler.

---

## Frontend technical detail

- Add `Crown`/`Building2`/`Users`/`KeyRound`/`Plug` icons to sidebar group "Platform Console" (super-admin only).
- `PlatformLayout` renders sub-nav tabs using existing `Tabs` UI; preserves deep-link to each section.
- Reuse existing `supabase` shim for queries; reuse `Card`, `Table`, `Sheet`, `Switch` patterns from `AdminTenants`.
- Sidebar mapping in `AdminLayout.tsx` extended with `admin-platform-*` ids.

---

## Out of scope (this iteration)

- Real Stripe billing integration (License Mgmt stores intent + status; wiring Stripe is a follow-up).
- Tenant-side UI changes beyond marking which integrations are "platform-managed" (read-only).
- Migrating existing per-tenant `/admin/integrations` page — it stays unchanged.

---

## Deliverables

- 1 new DB migration
- 4 backend routes (super-admin only)
- 1 platform layout + 4 pages, sidebar + routing updates
- Redirect from old `/admin/tenants` to `/admin/platform/tenants`
- Memory note recording the Platform Console pattern

Once you approve, I'll switch to build mode and implement in this order: migration → backend routes → layout/routing → Tenants refactor → Users → Licenses → Integrations.
