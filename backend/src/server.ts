import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { db } from './db/connection.js';
import { logger } from './lib/logger.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { aiRoutes } from './routes/ai.js';
import { registerAllCrudRoutes } from './routes/all-routes.js';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false, // CSP handled by nginx
  });

  // CORS
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (req) => req.headers['x-forwarded-for'] as string || req.ip,
  });

  // Auth plugin (Cognito JWT validation)
  await app.register(authPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(contactsRoutes, { prefix: '/api/contacts' });
  await app.register(dealsRoutes, { prefix: '/api/deals' });
  await app.register(ticketsRoutes, { prefix: '/api/tickets' });
  await app.register(organizationsRoutes, { prefix: '/api/organizations' });
  await app.register(aiRoutes, { prefix: '/api/ai' });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, url: request.url, method: request.method }, 'Unhandled error');
    
    if (error.statusCode) {
      reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
    } else {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'production' ? 'An unexpected error occurred' : error.message,
        statusCode: 500,
      });
    }
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    await db.destroy();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return app;
}

async function start() {
  try {
    // Verify DB connection
    await db.raw('SELECT 1');
    logger.info('Database connection established');

    const app = await buildServer();
    await app.listen({ port: config.port, host: config.host });
    logger.info(`Server running on http://${config.host}:${config.port}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
