/**
 * Shared ioredis clients for BullMQ queues and realtime pub/sub.
 *
 * BullMQ requires a dedicated connection per worker (with maxRetriesPerRequest=null
 * and enableReadyCheck=false), and pub/sub also requires dedicated subscriber
 * connections. We expose factories to keep that contract clear.
 */

import IORedis, { Redis, RedisOptions } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

function baseOptions(): RedisOptions {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    tls: config.redis.tls ? {} : undefined,
    lazyConnect: true,
  };
}

/** General-purpose client for SET/GET/PUBLISH. Safe to share. */
let sharedClient: Redis | null = null;
export function getRedis(): Redis {
  if (!sharedClient) {
    sharedClient = new IORedis(baseOptions());
    sharedClient.on('error', (err) => logger.error({ err }, 'Redis error'));
  }
  return sharedClient;
}

/** New client for BullMQ — must NOT share with the publisher. */
export function createBullConnection(): Redis {
  return new IORedis({
    ...baseOptions(),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/** Dedicated subscriber connection — once subscribed it cannot run other commands. */
export function createSubscriber(): Redis {
  return new IORedis(baseOptions());
}

export async function publishRealtime(channel: string, payload: unknown): Promise<void> {
  try {
    await getRedis().publish(channel, JSON.stringify(payload));
  } catch (err) {
    logger.warn({ err, channel }, 'realtime publish failed');
  }
}
