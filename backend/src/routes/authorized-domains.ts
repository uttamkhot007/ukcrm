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
  // Accepts:
  //   - exact:    acme.com
  //   - wildcard: *.acme.com  (matches eng.acme.com, mail.acme.com, ...)
  // Wildcard is ONLY allowed as the leftmost label and must be followed by a real domain.
  domain: z.string().min(3).max(253).regex(
    /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
    { message: 'Invalid domain. Use "acme.com" or wildcard "*.acme.com".' },
  ),
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
    domain = normalizeDomainPattern(domain);

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
    const row = await lookupAuthorizedDomain(email);
    if (!row) return { allowed: false };
    return { allowed: true, role: row.default_role, tenant_id: row.tenant_id };
  });
}

/**
 * Normalize a stored domain pattern.
 *  - lowercase, trim
 *  - strip leading "@"
 *  - "*.acme.com" stays as "*.acme.com" (wildcard)
 *  - "acme.com"   stays as "acme.com"   (exact)
 */
export function normalizeDomainPattern(input: string): string {
  return String(input || '').trim().toLowerCase().replace(/^@/, '');
}

/**
 * Match an email's domain against a stored pattern.
 *  - exact:    "acme.com"   matches only "acme.com"
 *  - wildcard: "*.acme.com" matches any subdomain of acme.com (eng.acme.com,
 *              a.b.acme.com) but NOT the apex "acme.com" itself.
 */
export function domainMatchesPattern(emailDomain: string, pattern: string): boolean {
  const d = emailDomain.toLowerCase();
  const p = pattern.toLowerCase();
  if (p.startsWith('*.')) {
    const base = p.slice(2);
    return d !== base && d.endsWith('.' + base);
  }
  return d === p;
}

/**
 * Helper used by /api/auth/register to enforce strict allowlist.
 * Returns the best-matching enabled row (tenant-specific beats global,
 * exact match beats wildcard) or null.
 */
export async function lookupAuthorizedDomain(email: string) {
  const at = email.indexOf('@');
  if (at < 0) return null;
  const emailDomain = email.slice(at + 1).toLowerCase();
  if (!emailDomain) return null;

  // Build the set of candidate patterns: exact + every wildcard suffix.
  // For "eng.acme.com" the candidates are:
  //   eng.acme.com, *.eng.acme.com (no, that wouldn't match itself),
  //   *.acme.com, *.com
  const labels = emailDomain.split('.');
  const candidates: string[] = [emailDomain];
  for (let i = 1; i < labels.length; i++) {
    candidates.push('*.' + labels.slice(i).join('.'));
  }

  const rows = await db('authorized_domains')
    .whereIn('domain', candidates)
    .andWhere({ enabled: true });

  if (!rows.length) return null;

  // Verify each row actually matches (defensive — covers any future pattern types).
  const matches = rows.filter((r) => domainMatchesPattern(emailDomain, r.domain));
  if (!matches.length) return null;

  // Prefer: tenant-scoped over global, exact over wildcard.
  matches.sort((a, b) => {
    const tA = a.tenant_id ? 0 : 1;
    const tB = b.tenant_id ? 0 : 1;
    if (tA !== tB) return tA - tB;
    const wA = a.domain.startsWith('*.') ? 1 : 0;
    const wB = b.domain.startsWith('*.') ? 1 : 0;
    return wA - wB;
  });
  return matches[0];
}

