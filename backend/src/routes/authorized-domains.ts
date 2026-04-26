/**
 * Authorized email domains — strict allowlist for self-signup.
 *
 * Super admins manage entries for any tenant.
 * Tenant admins manage entries for their own tenant only.
 *
 * Endpoints (all require auth):
 *   GET    /api/admin/authorized-domains            — list (super sees all, admin sees own tenant)
 *   POST   /api/admin/authorized-domains            — create
 *   PATCH  /api/admin/authorized-domains/:id        — update (enabled / role / notes)
 *   DELETE /api/admin/authorized-domains/:id        — remove
 *   POST   /api/admin/authorized-domains/check      — { email } → { allowed, role, tenant_id }
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';

async function getRoles(userId: string) {
  const rows = await db('user_roles').where({ user_id: userId }).pluck('role');
  return {
    isSuperAdmin: rows.includes('super_admin'),
    isAdmin: rows.includes('admin') || rows.includes('super_admin'),
  };
}

async function getActiveTenantId(userId: string): Promise<string | null> {
  const m = await db('tenant_members')
    .where({ user_id: userId, status: 'active' })
    .orderBy('created_at', 'asc')
    .first('tenant_id');
  return m?.tenant_id ?? null;
}

const createSchema = z.object({
  domain: z.string().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
  tenant_id: z.string().uuid().nullable().optional(),
  default_role: z.enum(['user', 'admin']).default('user'),
  enabled: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

const patchSchema = z.object({
  default_role: z.enum(['user', 'admin']).optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function authorizedDomainsRoutes(app: FastifyInstance) {
  // List
  app.get('/authorized-domains', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    const { isSuperAdmin, isAdmin } = await getRoles(req.user.id);
    if (!isAdmin) return reply.status(403).send({ error: 'Admin only' });

    let q = db('authorized_domains as ad')
      .leftJoin('tenants as t', 't.id', 'ad.tenant_id')
      .select('ad.*', 't.name as tenant_name', 't.slug as tenant_slug')
      .orderBy('ad.domain', 'asc');

    if (!isSuperAdmin) {
      const tenantId = await getActiveTenantId(req.user.id);
      if (!tenantId) return [];
      q = q.where('ad.tenant_id', tenantId);
    }
    return q;
  });

  // Create
  app.post('/authorized-domains', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    const { isSuperAdmin, isAdmin } = await getRoles(req.user.id);
    if (!isAdmin) return reply.status(403).send({ error: 'Admin only' });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    let { domain, tenant_id, default_role, enabled, notes } = parsed.data;
    domain = domain.toLowerCase().replace(/^@/, '').trim();

    if (!isSuperAdmin) {
      // Force tenant admins to scope to their own tenant
      tenant_id = await getActiveTenantId(req.user.id);
      if (!tenant_id) return reply.status(403).send({ error: 'No active tenant' });
    }

    try {
      const [row] = await db('authorized_domains')
        .insert({
          domain,
          tenant_id: tenant_id ?? null,
          default_role,
          enabled,
          notes,
          created_by: req.user.id,
        })
        .returning('*');
      return reply.status(201).send(row);
    } catch (err: any) {
      if (err.code === '23505') return reply.status(409).send({ error: 'Domain already authorized for this tenant' });
      throw err;
    }
  });

  // Patch
  app.patch('/authorized-domains/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    const { isSuperAdmin, isAdmin } = await getRoles(req.user.id);
    if (!isAdmin) return reply.status(403).send({ error: 'Admin only' });

    const { id } = req.params as { id: string };
    const existing = await db('authorized_domains').where({ id }).first();
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    if (!isSuperAdmin) {
      const tenantId = await getActiveTenantId(req.user.id);
      if (existing.tenant_id !== tenantId) return reply.status(403).send({ error: 'Forbidden' });
    }

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });

    const [row] = await db('authorized_domains')
      .where({ id })
      .update({ ...parsed.data, updated_at: db.fn.now() })
      .returning('*');
    return row;
  });

  // Delete
  app.delete('/authorized-domains/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    const { isSuperAdmin, isAdmin } = await getRoles(req.user.id);
    if (!isAdmin) return reply.status(403).send({ error: 'Admin only' });

    const { id } = req.params as { id: string };
    const existing = await db('authorized_domains').where({ id }).first();
    if (!existing) return reply.status(404).send({ error: 'Not found' });

    if (!isSuperAdmin) {
      const tenantId = await getActiveTenantId(req.user.id);
      if (existing.tenant_id !== tenantId) return reply.status(403).send({ error: 'Forbidden' });
    }

    await db('authorized_domains').where({ id }).del();
    return { success: true };
  });

  // Check (used by signup form to give immediate feedback; also enforced server-side at signup)
  app.post('/authorized-domains/check', async (req: FastifyRequest) => {
    const body = (req.body as any) || {};
    const email = String(body.email || '').toLowerCase();
    const at = email.indexOf('@');
    if (at < 0) return { allowed: false };
    const domain = email.slice(at + 1);
    const row = await db('authorized_domains')
      .where({ domain, enabled: true })
      .orderByRaw('tenant_id IS NULL') // tenant-specific first
      .first();
    if (!row) return { allowed: false };
    return { allowed: true, role: row.default_role, tenant_id: row.tenant_id };
  });
}

/**
 * Helper used by /api/auth/register to enforce strict allowlist.
 * Returns matched row or null.
 */
export async function lookupAuthorizedDomain(email: string) {
  const at = email.indexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase();
  return db('authorized_domains')
    .where({ domain, enabled: true })
    .orderByRaw('tenant_id IS NULL') // prefer tenant-specific over global
    .first();
}
