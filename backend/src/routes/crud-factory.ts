import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Generic filters: column=value pairs
});

interface CrudConfig {
  tableName: string;
  searchColumns?: string[];
  tenantScoped?: boolean;
  userOwned?: boolean;
  userField?: string;
}

/**
 * Tables where every operation (read included) requires an admin.
 * These control authorization itself, so exposing them through the generic
 * CRUD factory to any authenticated user is a privilege-escalation path.
 */
const ADMIN_ONLY_TABLES = new Set(['user_roles', 'user_teams']);

/** Tables readable by any authenticated user but only mutable by admins. */
const ADMIN_MUTATE_TABLES = new Set(['tenants', 'tenant_members', 'tenant_licenses', 'tenant_modules']);

const ADMIN_GROUPS = ['admin', 'super_admin', 'platform_admin'];

/**
 * Server-side role check. Cognito groups are trusted only because they come
 * from a verified JWT; the database `user_roles` table is the fallback source
 * of truth. Never trust a role supplied in the request body.
 */
async function isAdminUser(request: FastifyRequest): Promise<boolean> {
  const user = request.user;
  if (!user?.id) return false;
  if (user.groups?.some((g) => ADMIN_GROUPS.includes(g))) return true;
  try {
    const row = await db('user_roles')
      .where({ user_id: user.id })
      .whereIn('role', ['admin'])
      .first();
    return !!row;
  } catch {
    return false;
  }
}

export function createCrudRoutes(config: CrudConfig) {
  const {
    tableName,
    searchColumns = ['name'],
    tenantScoped = true,
    userOwned = false,
    userField = 'user_id',
  } = config;

  const adminOnly = ADMIN_ONLY_TABLES.has(tableName);
  const adminMutate = adminOnly || ADMIN_MUTATE_TABLES.has(tableName);

  return async function (app: FastifyInstance) {
    // Role-based authorization guard for sensitive tables.
    if (adminMutate) {
      app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
        const isMutation = request.method !== 'GET' && request.method !== 'HEAD';
        if (!adminOnly && !isMutation) return;
        if (await isAdminUser(request)) return;
        return reply.status(403).send({ error: 'Forbidden', message: 'Admin role required' });
      });
    }


    // LIST
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = listSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten().fieldErrors });
      }

      const { page, limit, search, sortBy, sortOrder } = parsed.data;
      const offset = (page - 1) * limit;
      const tenantId = request.user?.tenantId;
      const query: Record<string, any> = request.query as Record<string, any>;

      let baseQuery = db(tableName);
      let countQuery = db(tableName);

      if (tenantScoped && tenantId) {
        baseQuery = baseQuery.where('tenant_id', tenantId);
        countQuery = countQuery.where('tenant_id', tenantId);
      }

      if (userOwned) {
        baseQuery = baseQuery.where(userField, request.user!.id);
        countQuery = countQuery.where(userField, request.user!.id);
      }

      // Apply generic column filters from query params.
      // Supports `column=value` (eq) and `column__op=value` for op in
      // gt|gte|lt|lte|like|ilike|in|neq|is, plus `column__not__op=value`.
      const reservedParams = ['page', 'limit', 'search', 'sortBy', 'sortOrder'];
      const opMap: Record<string, string> = {
        gt: '>',
        gte: '>=',
        lt: '<',
        lte: '<=',
        neq: '<>',
        like: 'like',
        ilike: 'ilike',
      };
      for (const [key, rawValue] of Object.entries(query)) {
        if (reservedParams.includes(key)) continue;
        if (typeof rawValue !== 'string' || rawValue === '') continue;

        // Parse `column__op` and `column__not__op`
        let column = key;
        let op = 'eq';
        let negate = false;
        const parts = key.split('__');
        if (parts.length >= 2) {
          column = parts[0];
          if (parts[1] === 'not' && parts[2]) {
            negate = true;
            op = parts[2];
          } else {
            op = parts[1];
          }
        }

        const applyFilter = (qb: any) => {
          if (op === 'eq') {
            negate ? qb.whereNot(column, rawValue) : qb.where(column, rawValue);
          } else if (op === 'in') {
            const vals = rawValue.split(',');
            negate ? qb.whereNotIn(column, vals) : qb.whereIn(column, vals);
          } else if (op === 'is') {
            // is null / is true / is false
            const v = rawValue.toLowerCase();
            if (v === 'null') negate ? qb.whereNotNull(column) : qb.whereNull(column);
            else if (v === 'true') qb.where(column, true);
            else if (v === 'false') qb.where(column, false);
            else qb.where(column, rawValue);
          } else if (opMap[op]) {
            const sqlOp = opMap[op];
            negate
              ? qb.whereNot(column, sqlOp, rawValue)
              : qb.where(column, sqlOp, rawValue);
          }
        };

        applyFilter(baseQuery);
        applyFilter(countQuery);
      }


      if (search && searchColumns.length > 0) {
        const searchFilter = `%${search}%`;
        baseQuery = baseQuery.where(function () {
          for (const col of searchColumns) {
            this.orWhereILike(col, searchFilter);
          }
        });
        countQuery = countQuery.where(function () {
          for (const col of searchColumns) {
            this.orWhereILike(col, searchFilter);
          }
        });
      }

      const [{ count }] = await countQuery.count('* as count');
      const data = await baseQuery.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

      return { data, pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) } };
    });

    // GET by ID
    app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const where: Record<string, any> = { id };
      if (tenantScoped && request.user?.tenantId) where.tenant_id = request.user.tenantId;

      const item = await db(tableName).where(where).first();
      if (!item) return reply.status(404).send({ error: 'Not found' });
      return { data: item };
    });

    // CREATE
    app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, any>;
      const insertData: Record<string, any> = { ...body };

      if (tenantScoped && request.user?.tenantId) insertData.tenant_id = request.user.tenantId;
      if (userOwned) insertData[userField] = request.user!.id;
      if ('created_by' in insertData === false) insertData.created_by = request.user!.id;

      try {
        const [item] = await db(tableName).insert(insertData).returning('*');
        return reply.status(201).send({ data: item });
      } catch (err: any) {
        return reply.status(400).send({ error: 'Insert failed', message: err.message });
      }
    });

    // UPDATE
    app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, any>;
      const where: Record<string, any> = { id };
      if (tenantScoped && request.user?.tenantId) where.tenant_id = request.user.tenantId;

      try {
        const [item] = await db(tableName).where(where).update({ ...body, updated_at: db.fn.now() }).returning('*');
        if (!item) return reply.status(404).send({ error: 'Not found' });
        return { data: item };
      } catch (err: any) {
        return reply.status(400).send({ error: 'Update failed', message: err.message });
      }
    });

    // PATCH (partial update)
    app.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, any>;
      const where: Record<string, any> = { id };
      if (tenantScoped && request.user?.tenantId) where.tenant_id = request.user.tenantId;

      try {
        const [item] = await db(tableName).where(where).update({ ...body, updated_at: db.fn.now() }).returning('*');
        if (!item) return reply.status(404).send({ error: 'Not found' });
        return { data: item };
      } catch (err: any) {
        return reply.status(400).send({ error: 'Update failed', message: err.message });
      }
    });

    // DELETE
    app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const where: Record<string, any> = { id };
      if (tenantScoped && request.user?.tenantId) where.tenant_id = request.user.tenantId;

      const deleted = await db(tableName).where(where).del();
      if (!deleted) return reply.status(404).send({ error: 'Not found' });
      return reply.status(204).send();
    });
  };
}
