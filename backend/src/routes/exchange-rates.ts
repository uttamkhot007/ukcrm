/**
 * Exchange-rate proxy with persistent history. Replaces
 * supabase/functions/exchange-rates. Uses the free Frankfurter API.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { logger } from '../lib/logger.js';

const schema = z.object({
  from: z.string().length(3).default('USD'),
  to: z.string().length(3).default('INR'),
});

export async function exchangeRatesRoutes(app: FastifyInstance) {
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    const { from, to } = parsed.data;

    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
      const data = (await res.json()) as { rates: Record<string, number>; date: string };
      const rate = data.rates[to];

      try {
        await db('exchange_rate_history')
          .insert({
            from_currency: from,
            to_currency: to,
            rate,
            rate_date: data.date,
            fetched_at: new Date(),
          })
          .onConflict(['from_currency', 'to_currency', 'rate_date'])
          .merge({ rate, fetched_at: new Date() });
      } catch (saveErr) {
        logger.warn({ err: saveErr }, 'failed to save exchange rate history');
      }

      return { from, to, rate, date: data.date };
    } catch (err: any) {
      logger.error({ err }, 'exchange-rates failed');
      return reply.status(502).send({ error: err.message });
    }
  });
}
