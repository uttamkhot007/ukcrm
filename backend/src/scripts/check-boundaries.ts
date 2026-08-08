/**
 * Boundary check — run in CI before anything is deployed.
 *
 * Fails when:
 *  - a table has no owning service
 *  - two services claim the same table
 *  - a service exposes a table it does not own
 *  - two services collide on a port or a database
 *
 * These are the invariants that keep a microservice estate from decaying back
 * into a distributed monolith.
 */

import { ROUTABLE_SERVICES, SERVICES, serviceForTable } from '../platform/manifest.js';
import { ALL_RESOURCES, resourcesFor } from '../platform/resources.js';

function fail(messages: string[]): never {
  // eslint-disable-next-line no-console
  console.error(`\nService boundary check FAILED:\n\n${messages.map((m) => `  - ${m}`).join('\n')}\n`);
  process.exit(1);
}

const problems: string[] = [];

// 1. Every exposed table has exactly one owner.
for (const resource of ALL_RESOURCES) {
  const owners = ROUTABLE_SERVICES.filter((s) => s.owns.some((re) => re.test(resource.table)));
  if (owners.length === 0) {
    problems.push(`Table "${resource.table}" (${resource.path}) has no owning service.`);
  } else if (owners.length > 1) {
    problems.push(`Table "${resource.table}" is claimed by ${owners.map((o) => o.name).join(' and ')}.`);
  }
}

// 2. Services only expose what they own.
for (const service of ROUTABLE_SERVICES) {
  for (const resource of resourcesFor(service.name)) {
    const owner = serviceForTable(resource.table);
    if (owner?.name !== service.name) {
      problems.push(`Service "${service.name}" exposes "${resource.table}" owned by "${owner?.name ?? 'nobody'}".`);
    }
  }
}

// 3. Ports and databases are unique per service.
const ports = new Map<number, string>();
const databases = new Map<string, string>();
for (const service of SERVICES) {
  const portOwner = ports.get(service.port);
  if (portOwner) problems.push(`Port ${service.port} used by both "${portOwner}" and "${service.name}".`);
  ports.set(service.port, service.name);

  if (service.database !== 'none') {
    const dbOwner = databases.get(service.database);
    if (dbOwner) problems.push(`Database "${service.database}" shared by "${dbOwner}" and "${service.name}".`);
    databases.set(service.database, service.name);
  }
}

// 4. Every consumed event is published by someone.
const published = new Set(SERVICES.flatMap((s) => s.publishes));
for (const service of SERVICES) {
  for (const consumed of service.consumes) {
    if (consumed === '*') continue;
    if (!published.has(consumed)) {
      problems.push(`Service "${service.name}" consumes "${consumed}" which no service publishes.`);
    }
  }
}

if (problems.length > 0) fail(problems);

const owned = ROUTABLE_SERVICES.map((s) => ({
  service: s.name,
  domain: s.domain,
  resources: resourcesFor(s.name).length,
  database: s.database,
  port: s.port,
}));

// eslint-disable-next-line no-console
console.table(owned);
// eslint-disable-next-line no-console
console.log(
  `\nService boundary check passed: ${ALL_RESOURCES.length} resources across ${ROUTABLE_SERVICES.length} services.\n`,
);
