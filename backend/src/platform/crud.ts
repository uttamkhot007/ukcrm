/**
 * Tenant-aware CRUD factory used by every service.
 *
 * Differences from the legacy monolith factory:
 *  - queries run on `request.db`, which is the pool for that request's tenant
 *    (shared pool or the tenant's dedicated cluster)
 *  - a service may only expose tables it owns in the manifest
 *  - tenant scoping is mandatory unless the table is explicitly global
 *  - writes emit domain events through the transactional outbox
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { EventBus } from './events.js';
import { serviceForTable, type ServiceName } from './manifest.js';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().max(200).optional(),
  sortBy: z.string().max(64).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export interface CrudResource {
  /** URL segment, e.g. `deals` -> /api/deals */
  path: string;
  table: string;
  searchColumns?: string[];
  /** Set false for reference data shared across tenants. */
  tenantScoped?: boolean;
  userOwned?: boolean;
  userField?: string;
  /** Roles allowed to mutate. Empty means any authenticated tenant member. */
  writeRoles?: string[];
  /** Event type emitted on create/update/delete, e.g. `sales.deal`. */
  eventPrefix?: string;
}

const RESERVED = new Set(['page', 'limit', 'search', 'sortBy', 'sortOrder']);
const OP_MAP: Record<string, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  neq: '<>',
  like: 'like',
  ilike: 'ilike',
};

const IDENT = /^[a-z_][a-z0-9_]*$/;

function isPlatformAdmin(request: FastifyRequest): boolean {
  return Boolean(request.tenant?.isPlatformAdmin);
}

export function registerCrudResource(
  app: FastifyInstance,
  service: ServiceName,
  resource: CrudResource,
  bus?: EventBus,
): void {
  const owner = serviceForTable(resource.table);
  if (owner && owner.name !== service) {
    throw new Error(
      `Boundary violation: service "${service}" tried to expose table "${resource.table}" owned by "${owner.name}".`,
    );
  }

  const {
    table,
    searchColumns = ['name'],
    tenantScoped = true,
    userOwned = false,
    userField = 'user_id',
    writeRoles = [],
    eventPrefix,
  } = resource;

  const prefix = `/api/${resource.path}`;

  const scope = (qb: any, request: FastifyRequest) => {
    const ctx = request.tenant;
    if (tenantScoped && ctx && !(ctx.isPlatformAdmin && request.headers['x-all-tenants'] === 'true')) {
      qb.where(`${table}.tenant_id`, ctx.tenantId);
    }
    if (userOwned && ctx && !ctx.isPlatformAdmin) {
      qb.where(`${table}.${userField}`, ctx.userId);
    }
    return qb;
  };

  const guardWrite = async (request: FastifyRequest, reply: FastifyReply) => {
    if (writeRoles.length === 0) return;
    if (isPlatformAdmin(request)) return;
    const roles = request.tenant?.roles ?? [];
    if (!roles.some((r) => writeRoles.includes(r))) {
      await reply.status(403).send({ error: 'Forbidden', message: `Requires one of: ${writeRoles.join(', ')}` });
    }
  };

  app.register(
    async (scoped: FastifyInstance) => {
      scoped.get('/', async (request, reply) => {
        const parsed = listSchema.safeParse(request.query);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten().fieldErrors });
        }
        const { page, limit, search, sortBy, sortOrder } = parsed.data;
        if (!IDENT.test(sortBy)) return reply.status(400).send({ error: 'Invalid sort column' });

        const db = request.db;
        const base = scope(db(table), request);
        const counter = scope(db(table), request);

        for (const [key, raw] of Object.entries(request.query as Record<string, unknown>)) {
          if (RESERVED.has(key) || typeof raw !== 'string' || raw === '') continue;
          const parts = key.split('__');
          const column = parts[0] as string;
          if (!IDENT.test(column)) continue;
          let op = 'eq';
          let negate = false;
          if (parts.length >= 2) {
            if (parts[1] === 'not' && parts[2]) {
              negate = true;
              op = parts[2];
            } else {
              op = parts[1] as string;
            }
          }
          const apply = (qb: any) => {
            if (op === 'eq') negate ? qb.whereNot(column, raw) : qb.where(column, raw);
            else if (op === 'in') {
              const vals = raw.split(',');
              negate ? qb.whereNotIn(column, vals) : qb.whereIn(column, vals);
            } else if (op === 'is') {
              const v = raw.toLowerCase();
              if (v === 'null') negate ? qb.whereNotNull(column) : qb.whereNull(column);
              else qb.where(column, v === 'true' ? true : v === 'false' ? false : raw);
            } else if (OP_MAP[op]) {
              negate ? qb.whereNot(column, OP_MAP[op], raw) : qb.where(column, OP_MAP[op], raw);
            }
          };
          apply(base);
          apply(counter);
        }

        if (search && searchColumns.length > 0) {
          const term = `%${search}%`;
          const filter = function (this: any) {
            for (const col of searchColumns) if (IDENT.test(col)) this.orWhereILike(col, term);
          };
          base.where(filter);
          counter.where(filter);
        }

        const [{ count }] = await counter.count('* as count');
        const data = await base.orderBy(sortBy, sortOrder).limit(limit).offset((page - 1) * limit);
        const total = Number(count);
        return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
      });

      scoped.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const row = await scope(request.db(table), request).where(`${table}.id`, id).first();
        if (!row) return reply.status(404).send({ error: 'Not found' });
        return { data: row };
      });

      scoped.post('/', { preHandler: guardWrite }, async (request, reply) => {
        const ctx = request.tenant;
        const body = { ...(request.body as Record<string, unknown>) };
        delete body['id'];
        delete body['tenant_id'];
        if (tenantScoped && ctx) body['tenant_id'] = ctx.tenantId;
        if (userOwned && ctx) body[userField] = ctx.userId;
        if (ctx && body['created_by'] === undefined) body['created_by'] = ctx.userId;

        const created = await request.db.transaction(async (trx) => {
          const [row] = await trx(table).insert(body).returning('*');
          if (bus && eventPrefix) {
            await bus.publishInTransaction(trx, {
              type: `${eventPrefix}.created`,
              tenantId: ctx?.tenantId,
              subject: row?.id,
              payload: row,
            });
          }
          return row;
        });
        return reply.status(201).send({ data: created });
      });

      scoped.patch('/:id', { preHandler: guardWrite }, async (request, reply) => {
        const ctx = request.tenant;
        const { id } = request.params as { id: string };
        const body = { ...(request.body as Record<string, unknown>) };
        delete body['id'];
        delete body['tenant_id'];
        if (ctx) body['updated_by'] = ctx.userId;

        const updated = await request.db.transaction(async (trx) => {
          const existing = await scope(trx(table), request).where(`${table}.id`, id).first();
          if (!existing) return null;
          const [row] = await trx(table).where({ id }).update(body).returning('*');
          if (bus && eventPrefix) {
            await bus.publishInTransaction(trx, {
              type: `${eventPrefix}.updated`,
              tenantId: ctx?.tenantId,
              subject: id,
              payload: { before: existing, after: row },
            });
          }
          return row;
        });

        if (!updated) return reply.status(404).send({ error: 'Not found' });
        return { data: updated };
      });

      scoped.delete('/:id', { preHandler: guardWrite }, async (request, reply) => {
        const ctx = request.tenant;
        const { id } = request.params as { id: string };
        const removed = await request.db.transaction(async (trx) => {
          const existing = await scope(trx(table), request).where(`${table}.id`, id).first();
          if (!existing) return false;
          await trx(table).where({ id }).delete();
          if (bus && eventPrefix) {
            await bus.publishInTransaction(trx, {
              type: `${eventPrefix}.deleted`,
              tenantId: ctx?.tenantId,
              subject: id,
              payload: existing,
            });
          }
          return true;
        });
        if (!removed) return reply.status(404).send({ error: 'Not found' });
        return reply.status(204).send();
      });
    },
    { prefix },
  );
}
