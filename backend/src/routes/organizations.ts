import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  status: z.string().default('active'),
  organization_type: z.string().optional(),
});

export async function organizationsRoutes(app: FastifyInstance) {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten().fieldErrors });
    }

    const { page, limit, search, sortBy, sortOrder } = parsed.data;
    const offset = (page - 1) * limit;
    const tenantId = request.user?.tenantId;

    let query = db('alliance_organizations').where('tenant_id', tenantId);
    let countQuery = db('alliance_organizations').where('tenant_id', tenantId);

    if (search) {
      const s = `%${search}%`;
      query = query.where(function () { this.whereILike('name', s).orWhereILike('industry', s); });
      countQuery = countQuery.where(function () { this.whereILike('name', s).orWhereILike('industry', s); });
    }

    const [{ count }] = await countQuery.count('* as count');
    const orgs = await query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

    return {
      data: orgs,
      pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) },
    };
  });

  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const org = await db('alliance_organizations').where({ id, tenant_id: request.user?.tenantId }).first();
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return { data: org };
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [org] = await db('alliance_organizations').insert({
      ...parsed.data,
      created_by: request.user!.id,
      tenant_id: request.user?.tenantId,
    }).returning('*');

    return reply.status(201).send({ data: org });
  });

  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = createSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [org] = await db('alliance_organizations')
      .where({ id, tenant_id: request.user?.tenantId })
      .update({ ...parsed.data, updated_by: request.user!.id, updated_at: db.fn.now() })
      .returning('*');

    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return { data: org };
  });

  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deleted = await db('alliance_organizations').where({ id, tenant_id: request.user?.tenantId }).del();
    if (!deleted) return reply.status(404).send({ error: 'Organization not found' });
    return reply.status(204).send();
  });
}
