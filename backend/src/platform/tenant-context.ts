/**
 * Tenant context resolution and enforcement.
 *
 * Every authenticated request carries exactly one tenant. The context is
 * resolved once per request from the verified JWT (never from the body or a
 * client-supplied header, except for platform admins who may impersonate
 * explicitly), then pinned onto the database session so that queries and
 * row-level policies agree on who is asking.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Knex } from 'knex';
import type { DatabaseRouter } from './db-router.js';

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  isPlatformAdmin: boolean;
  /** Set when a platform admin is acting on behalf of a tenant. */
  impersonated: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
    /** Pool for the tenant this request belongs to (may be a dedicated cluster). */
    db: Knex;
  }
}

const PLATFORM_GROUPS = ['admin', 'super_admin', 'platform_admin'];

export class TenantRequiredError extends Error {
  readonly statusCode = 403;
  constructor() {
    super('No tenant associated with this request');
    this.name = 'TenantRequiredError';
  }
}

/**
 * Wraps a query so it runs with the tenant pinned on the session. Postgres
 * policies can then read `current_setting('app.tenant_id')` and the audit
 * triggers know the actor without trusting the payload.
 */
export async function withTenantSession<T>(
  db: Knex,
  ctx: TenantContext,
  fn: (trx: Knex.Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (trx) => {
    await trx.raw("select set_config('app.tenant_id', ?, true)", [ctx.tenantId]);
    await trx.raw("select set_config('app.user_id', ?, true)", [ctx.userId]);
    await trx.raw("select set_config('app.is_platform_admin', ?, true)", [String(ctx.isPlatformAdmin)]);
    return fn(trx);
  });
}

export interface TenantPluginOptions {
  router: DatabaseRouter;
  /** Paths that may be served without a tenant (health, auth, metrics). */
  publicPaths: string[];
  /** Services that legitimately operate across tenants (tenancy, identity). */
  crossTenant?: boolean;
}

export function registerTenantContext(app: FastifyInstance, options: TenantPluginOptions): void {
  const { router, publicPaths, crossTenant = false } = options;

  app.decorateRequest('tenant', undefined);
  app.decorateRequest('db', null as unknown as Knex);

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'OPTIONS' || publicPaths.some((p) => request.url.startsWith(p))) {
      request.db = router.shared;
      return;
    }

    const user = request.user;
    if (!user) {
      // The auth plugin already rejected anything that needed a user.
      request.db = router.shared;
      return;
    }

    const isPlatformAdmin = Boolean(user.groups?.some((g) => PLATFORM_GROUPS.includes(g)));

    // Platform admins may target a tenant explicitly; everyone else is pinned
    // to the tenant baked into their verified token.
    const requestedTenant = request.headers['x-tenant-id'];
    const impersonated =
      isPlatformAdmin && typeof requestedTenant === 'string' && requestedTenant !== user.tenantId;
    const tenantId = impersonated ? (requestedTenant as string) : user.tenantId;

    if (!tenantId) {
      if (crossTenant || isPlatformAdmin) {
        request.db = router.shared;
        return;
      }
      return reply.status(403).send({ error: 'Forbidden', message: 'No tenant associated with this account' });
    }

    request.tenant = {
      tenantId,
      userId: user.id,
      roles: user.groups ?? [],
      isPlatformAdmin,
      impersonated,
    };
    request.db = await router.forTenant(tenantId);

    if (impersonated) {
      request.log.warn({ actor: user.id, tenantId }, 'Platform admin acting on behalf of tenant');
    }
  });
}

/** Route guard: require a resolved tenant. */
export async function requireTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.tenant) {
    await reply.status(403).send({ error: 'Forbidden', message: 'Tenant context required' });
  }
}

/** Route guard: require one of the given roles. */
export function requireRole(...roles: string[]) {
  return async function guard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const ctx = request.tenant;
    if (!ctx) {
      await reply.status(403).send({ error: 'Forbidden', message: 'Tenant context required' });
      return;
    }
    if (ctx.isPlatformAdmin) return;
    if (!ctx.roles.some((r) => roles.includes(r))) {
      await reply.status(403).send({ error: 'Forbidden', message: `Requires one of: ${roles.join(', ')}` });
    }
  };
}
