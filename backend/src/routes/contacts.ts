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
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  designation: z.string().max(255).optional(),
  department: z.string().max(255).optional(),
  notes: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  source_type: z.string().optional(),
});

export async function contactsRoutes(app: FastifyInstance) {
  // List contacts
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors });
    }

    const { page, limit, search, sortBy, sortOrder } = parsed.data;
    const offset = (page - 1) * limit;
    const tenantId = request.user?.tenantId;

    let query = db('contacts').where('tenant_id', tenantId);
    let countQuery = db('contacts').where('tenant_id', tenantId);

    if (search) {
      const searchFilter = `%${search}%`;
      query = query.where(function () {
        this.whereILike('name', searchFilter)
          .orWhereILike('email', searchFilter)
          .orWhereILike('company', searchFilter);
      });
      countQuery = countQuery.where(function () {
        this.whereILike('name', searchFilter)
          .orWhereILike('email', searchFilter)
          .orWhereILike('company', searchFilter);
      });
    }

    const [{ count }] = await countQuery.count('* as count');
    const contacts = await query
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data: contacts,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  });

  // Get single contact
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user?.tenantId;

    const contact = await db('contacts')
      .where({ id, tenant_id: tenantId })
      .first();

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    return { data: contact };
  });

  // Create contact
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [contact] = await db('contacts')
      .insert({
        ...parsed.data,
        user_id: request.user!.id,
        tenant_id: request.user?.tenantId,
        created_by: request.user!.id,
      })
      .returning('*');

    return reply.status(201).send({ data: contact });
  });

  // Update contact
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const parsed = createSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const [contact] = await db('contacts')
      .where({ id, tenant_id: request.user?.tenantId })
      .update({
        ...parsed.data,
        updated_by: request.user!.id,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    return { data: contact };
  });

  // Delete contact
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const deleted = await db('contacts')
      .where({ id, tenant_id: request.user?.tenantId })
      .del();

    if (!deleted) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    return reply.status(204).send();
  });
}
