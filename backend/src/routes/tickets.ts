import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

export async function ticketsRoutes(app: FastifyInstance) {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten().fieldErrors });
    }

    const { page, limit, search, status, priority, sortBy, sortOrder } = parsed.data;
    const offset = (page - 1) * limit;
    const tenantId = request.user?.tenantId;

    let query = db('tickets').where('tenant_id', tenantId);
    let countQuery = db('tickets').where('tenant_id', tenantId);

    if (search) {
      const s = `%${search}%`;
      query = query.where(function () {
        this.whereILike('title', s).orWhereILike('description', s);
      });
      countQuery = countQuery.where(function () {
        this.whereILike('title', s).orWhereILike('description', s);
      });
    }
    if (status) { query = query.where('status', status); countQuery = countQuery.where('status', status); }
    if (priority) { query = query.where('priority', priority); countQuery = countQuery.where('priority', priority); }

    const [{ count }] = await countQuery.count('* as count');
    const tickets = await query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

    return {
      data: tickets,
      pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) },
    };
  });

  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const ticket = await db('tickets').where({ id, tenant_id: request.user?.tenantId }).first();
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    return { data: ticket };
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [ticket] = await db('tickets').insert({
      ...parsed.data,
      status: 'open',
      created_by: request.user!.id,
      tenant_id: request.user?.tenantId,
    }).returning('*');

    return reply.status(201).send({ data: ticket });
  });

  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = createSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [ticket] = await db('tickets')
      .where({ id, tenant_id: request.user?.tenantId })
      .update({ ...parsed.data, updated_at: db.fn.now() })
      .returning('*');

    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    return { data: ticket };
  });

  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deleted = await db('tickets').where({ id, tenant_id: request.user?.tenantId }).del();
    if (!deleted) return reply.status(404).send({ error: 'Ticket not found' });
    return reply.status(204).send();
  });
}
