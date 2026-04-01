import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const checks: Record<string, string> = { status: 'healthy' };

    try {
      await db.raw('SELECT 1');
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    return checks;
  });

  app.get('/ready', async (_, reply) => {
    try {
      await db.raw('SELECT 1');
      return { ready: true };
    } catch {
      reply.status(503).send({ ready: false, reason: 'Database unavailable' });
    }
  });
}
