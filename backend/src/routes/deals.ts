import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  stage: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  title: z.string().min(1).max(255),
  value: z.number().min(0).optional(),
  stage: z.string().default('prospect'),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  description: z.string().optional(),
  problem_area: z.string().optional(),
  currency: z.string().default('INR'),
});

export async function dealsRoutes(app: FastifyInstance) {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten().fieldErrors });
    }

    const { page, limit, search, stage, sortBy, sortOrder } = parsed.data;
    const offset = (page - 1) * limit;
    const tenantId = request.user?.tenantId;

    let query = db('deals').where('tenant_id', tenantId);
    let countQuery = db('deals').where('tenant_id', tenantId);

    if (search) {
      const s = `%${search}%`;
      query = query.where(function () { this.whereILike('title', s); });
      countQuery = countQuery.where(function () { this.whereILike('title', s); });
    }
    if (stage) {
      query = query.where('stage', stage);
      countQuery = countQuery.where('stage', stage);
    }

    const [{ count }] = await countQuery.count('* as count');
    const deals = await query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

    return {
      data: deals,
      pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) },
    };
  });

  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deal = await db('deals').where({ id, tenant_id: request.user?.tenantId }).first();
    if (!deal) return reply.status(404).send({ error: 'Deal not found' });
    return { data: deal };
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [deal] = await db('deals').insert({
      ...parsed.data,
      user_id: request.user!.id,
      tenant_id: request.user?.tenantId,
    }).returning('*');

    return reply.status(201).send({ data: deal });
  });

  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = createSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [deal] = await db('deals')
      .where({ id, tenant_id: request.user?.tenantId })
      .update({ ...parsed.data, updated_at: db.fn.now() })
      .returning('*');

    if (!deal) return reply.status(404).send({ error: 'Deal not found' });
    return { data: deal };
  });

  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deleted = await db('deals').where({ id, tenant_id: request.user?.tenantId }).del();
    if (!deleted) return reply.status(404).send({ error: 'Deal not found' });
    return reply.status(204).send();
  });
}
