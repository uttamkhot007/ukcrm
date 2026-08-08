/**
 * Universal service entrypoint.
 *
 *   SERVICE=sales node dist/services/main.js
 *
 * Each container sets SERVICE to become one microservice with its own port,
 * database, scaling policy and health checks.
 */

import { runService } from '../platform/service.js';
import { serviceDefinition, SERVICE_NAMES } from './registry.js';

const name = process.env['SERVICE'];

if (!name) {
  // eslint-disable-next-line no-console
  console.error(
    `SERVICE environment variable is required. One of: ${SERVICE_NAMES.filter((s) => s !== 'gateway').join(', ')}`,
  );
  process.exit(1);
}

if (name === 'gateway') {
  // eslint-disable-next-line no-console
  console.error('The gateway has its own entrypoint: node dist/gateway/index.js');
  process.exit(1);
}

void runService(serviceDefinition(name));
