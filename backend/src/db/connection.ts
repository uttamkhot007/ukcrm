import knex from 'knex';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

export const db = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl,
  },
  pool: {
    min: config.db.pool.min,
    max: config.db.pool.max,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    afterCreate: (conn: any, done: Function) => {
      // Set session parameters for RLS-style row filtering
      conn.query('SET statement_timeout = 30000', (err: Error) => {
        if (err) {
          logger.error(err, 'Error setting statement_timeout');
        }
        done(err, conn);
      });
    },
  },
  acquireConnectionTimeout: 60000,
  log: {
    warn: (msg: string) => logger.warn(msg),
    error: (msg: string) => logger.error(msg),
    deprecate: (msg: string) => logger.warn(msg),
    debug: (msg: string) => logger.debug(msg),
  },
});

// Monitor connection pool health
setInterval(async () => {
  try {
    const pool = (db.client as any).pool;
    if (pool) {
      logger.debug({
        used: pool.numUsed(),
        free: pool.numFree(),
        pending: pool.numPendingAcquires(),
        total: pool.numUsed() + pool.numFree(),
      }, 'Database pool status');
    }
  } catch {
    // Ignore monitoring errors
  }
}, 60000);
