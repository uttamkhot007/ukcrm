/**
 * BullMQ queue definitions. Producers (HTTP routes) push jobs; the worker
 * service (`backend/src/worker.ts`) consumes them.
 */

import { Queue, JobsOptions } from 'bullmq';
import { createBullConnection } from './redis.js';

export const QUEUE_NAMES = {
  notifications: 'notifications',
  ticketing: 'ticketing',
  hrWorkflows: 'hr-workflows',
  scheduled: 'scheduled-checks',
  integrationsSync: 'integrations-sync',
  email: 'email',
} as const;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 24 * 3_600 },
};

const queues = new Map<string, Queue>();

export function getQueue(name: keyof typeof QUEUE_NAMES): Queue {
  const key = QUEUE_NAMES[name];
  let q = queues.get(key);
  if (!q) {
    q = new Queue(key, {
      connection: createBullConnection(),
      defaultJobOptions,
    });
    queues.set(key, q);
  }
  return q;
}

export async function closeAllQueues(): Promise<void> {
  for (const q of queues.values()) {
    await q.close().catch(() => null);
  }
  queues.clear();
}
