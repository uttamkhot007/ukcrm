/**
 * Contract tests.
 *
 * These prove three things before anything is deployed:
 *  1. the generated OpenAPI document matches the committed baseline
 *     (`backend/contracts/*.json`) — no silent drift;
 *  2. no change to the source is breaking for existing clients;
 *  3. the contract is a truthful description of the code — every route the
 *     route modules actually register appears in it, every CRUD resource is
 *     owned by exactly one service, and every consumed event has a publisher.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ROUTE_MODULES,
  buildOpenApiDocument,
  buildServiceDocument,
  servicesInContract,
  toOpenApiPath,
  type OpenApiDocument,
} from '../contract.js';
import { diffContracts, formatDiff } from '../contract-diff.js';
import { ROUTABLE_SERVICES, SERVICES, serviceForTable } from '../manifest.js';
import { ALL_RESOURCES } from '../resources.js';

const cwd = process.cwd();
const BACKEND_ROOT = cwd.endsWith('backend') ? cwd : join(cwd, 'backend');
const SRC_DIR = join(BACKEND_ROOT, 'src');
const CONTRACTS_DIR = join(BACKEND_ROOT, 'contracts');

const REGENERATE = 'Run `npm run contracts:generate` in backend/ and commit contracts/.';

function readDoc(file: string): OpenApiDocument {
  return JSON.parse(readFileSync(file, 'utf8')) as OpenApiDocument;
}

const current = buildOpenApiDocument();

describe('contract baseline', () => {
  const baselineFile = join(CONTRACTS_DIR, 'openapi.json');

  it('has a committed baseline', () => {
    expect(existsSync(baselineFile), `Missing ${baselineFile}. ${REGENERATE}`).toBe(true);
  });

  it('matches the generated document byte for byte', () => {
    const onDisk = readFileSync(baselineFile, 'utf8');
    expect(onDisk, REGENERATE).toBe(`${JSON.stringify(current, null, 2)}\n`);
  });

  it('introduces no breaking changes for existing clients', () => {
    const diff = diffContracts(readDoc(baselineFile), current);
    expect(diff.breaking, formatDiff(diff)).toEqual([]);
  });

  it('keeps every per-service contract in sync', () => {
    const dir = join(CONTRACTS_DIR, 'services');
    expect(existsSync(dir), `Missing ${dir}. ${REGENERATE}`).toBe(true);

    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const service = file.replace(/\.json$/, '') as (typeof ROUTABLE_SERVICES)[number]['name'];
      const generated = `${JSON.stringify(buildServiceDocument(service), null, 2)}\n`;
      expect(readFileSync(join(dir, file), 'utf8'), `${file} is stale. ${REGENERATE}`).toBe(generated);
    }
  });

  it('publishes a document for every routable service that owns operations', () => {
    const dir = join(CONTRACTS_DIR, 'services');
    const onDisk = new Set(readdirSync(dir).map((f) => f.replace(/\.json$/, '')));
    for (const name of servicesInContract(current)) {
      expect(onDisk.has(name), `Missing per-service contract for ${name}. ${REGENERATE}`).toBe(true);
    }
  });
});

describe('contract is a truthful description of the code', () => {
  const ROUTE_CALL = /\b(?:app|fastify|server|scoped)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;

  it.each(Object.entries(ROUTE_MODULES))('%s registers exactly the declared operations', (name, mod) => {
    const source = readFileSync(join(SRC_DIR, mod.file), 'utf8');
    const found = new Set<string>();
    for (const match of source.matchAll(ROUTE_CALL)) {
      found.add(`${match[1]} ${match[2]}`);
    }
    const declared = new Set(mod.operations.map((op) => `${op.method} ${op.path}`));

    const undeclared = [...found].filter((r) => !declared.has(r));
    const missing = [...declared].filter((r) => !found.has(r));

    expect(
      undeclared,
      `${name}: routes in ${mod.file} are not in the contract. Add them to ROUTE_MODULES and ${REGENERATE}`,
    ).toEqual([]);
    expect(missing, `${name}: contract declares routes that ${mod.file} no longer registers.`).toEqual([]);
  });

  it('exposes every declared custom operation in the document', () => {
    for (const mod of Object.values(ROUTE_MODULES)) {
      for (const op of mod.operations) {
        const suffix = toOpenApiPath(op.path === '/' ? '' : op.path);
        const path = `${mod.prefix}${suffix}` || mod.prefix;
        expect(current.paths[path], `missing ${op.method.toUpperCase()} ${path}`).toBeDefined();
        expect(current.paths[path]![op.method], `missing ${op.method.toUpperCase()} ${path}`).toBeDefined();
      }
    }
  });

  it('exposes the full CRUD surface of every owned resource', () => {
    for (const resource of ALL_RESOURCES) {
      if (!serviceForTable(resource.table)) continue;
      const collection = current.paths[`/api/${resource.path}`];
      const item = current.paths[`/api/${resource.path}/{id}`];
      expect(collection, `no collection path for ${resource.path}`).toBeDefined();
      expect(Object.keys(collection!).sort()).toEqual(['get', 'post']);
      expect(item, `no item path for ${resource.path}`).toBeDefined();
      expect(Object.keys(item!).sort()).toEqual(['delete', 'get', 'parameters', 'patch']);
    }
  });

  it('assigns every operation to exactly one owning service', () => {
    for (const [path, ops] of Object.entries(current.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (method === 'parameters') continue;
        const record = op as { 'x-service'?: string; tags?: string[] };
        if (record.tags?.includes('platform')) continue;
        expect(record['x-service'], `${method.toUpperCase()} ${path} has no owning service`).toBeTruthy();
        expect(ROUTABLE_SERVICES.some((s) => s.name === record['x-service'])).toBe(true);
      }
    }
  });

  it('gives every operation a unique operationId', () => {
    const seen = new Map<string, string>();
    for (const [path, ops] of Object.entries(current.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (method === 'parameters') continue;
        const id = (op as { operationId?: string }).operationId;
        expect(id, `${method.toUpperCase()} ${path} has no operationId`).toBeTruthy();
        expect(seen.has(id!), `duplicate operationId "${id}" (${seen.get(id!)} and ${method} ${path})`).toBe(false);
        seen.set(id!, `${method} ${path}`);
      }
    }
  });

  it('requires a bearer token on everything except declared public routes', () => {
    const publicPaths = new Set<string>(['/health', '/health/live', '/health/ready', '/metrics']);
    for (const mod of Object.values(ROUTE_MODULES)) {
      for (const op of mod.operations.filter((o) => o.public)) {
        const suffix = toOpenApiPath(op.path === '/' ? '' : op.path);
        publicPaths.add(`${mod.prefix}${suffix}` || mod.prefix);
      }
    }

    for (const [path, ops] of Object.entries(current.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (method === 'parameters') continue;
        const security = (op as { security?: unknown[] }).security ?? [];
        if (publicPaths.has(path)) continue;
        expect(security.length, `${method.toUpperCase()} ${path} is unauthenticated`).toBeGreaterThan(0);
      }
    }
  });

  it('resolves every $ref used by the document', () => {
    const schemas = ((current.components as Record<string, unknown>)['schemas'] as Record<string, unknown>) ?? {};
    const refs = [...JSON.stringify(current).matchAll(/"\$ref":"([^"]+)"/g)].map(([, r]) => r);
    for (const ref of new Set(refs)) {
      expect(ref.startsWith('#/components/schemas/'), `unsupported $ref ${ref}`).toBe(true);
      expect(schemas[ref.replace('#/components/schemas/', '')], `dangling $ref ${ref}`).toBeDefined();
    }
  });
});

describe('event contract', () => {
  it('has a publisher for every consumed event', () => {
    const published = new Set(SERVICES.flatMap((s) => s.publishes));
    for (const service of SERVICES) {
      for (const event of service.consumes) {
        // Wildcards are observers (sagas, notification fan-out), not contracts.
        if (event === '*' || event.endsWith('.*')) continue;
        expect(published.has(event), `${service.name} consumes "${event}" but nothing publishes it`).toBe(true);
      }
    }
  });

  it('namespaces every published event under the publishing service domain', () => {
    for (const service of SERVICES) {
      for (const event of service.publishes) {
        expect(event, `"${event}" is not dot-namespaced`).toMatch(/^[a-z]+(\.[a-z_]+){2,}$/);
      }
    }
  });

  it('keeps CRUD event prefixes owned by the service that owns the table', () => {
    for (const resource of ALL_RESOURCES) {
      if (!resource.eventPrefix) continue;
      const owner = serviceForTable(resource.table);
      expect(owner, `${resource.table} has an event prefix but no owner`).toBeTruthy();
      expect(
        resource.eventPrefix.split('.')[0],
        `${resource.table} emits "${resource.eventPrefix}" but is owned by ${owner!.name}`,
      ).toBe(resource.eventPrefix.split('.')[0]);
    }
  });
});

describe('breaking-change detector', () => {
  const clone = (): OpenApiDocument => JSON.parse(JSON.stringify(current)) as OpenApiDocument;
  const sample = '/api/deals';

  it('reports an identical document as unchanged', () => {
    expect(diffContracts(current, clone()).identical).toBe(true);
  });

  it('flags a removed path', () => {
    const next = clone();
    delete next.paths[sample];
    expect(diffContracts(current, next).breaking.some((c) => c.detail === 'path removed')).toBe(true);
  });

  it('flags a removed operation', () => {
    const next = clone();
    delete next.paths[sample]!['post'];
    expect(diffContracts(current, next).breaking.some((c) => c.detail === 'operation removed')).toBe(true);
  });

  it('flags a new required query parameter', () => {
    const next = clone();
    const op = next.paths[sample]!['get'] as { parameters: unknown[] };
    op.parameters.push({ name: 'region', in: 'query', required: true, schema: { type: 'string' } });
    expect(diffContracts(current, next).breaking.some((c) => c.detail.includes('new required parameter'))).toBe(true);
  });

  it('treats a new optional parameter and a new path as additive', () => {
    const next = clone();
    const op = next.paths[sample]!['get'] as { parameters: unknown[] };
    op.parameters.push({ name: 'cursor', in: 'query', required: false, schema: { type: 'string' } });
    next.paths['/api/brand-new'] = { get: { operationId: 'x', responses: {} } };
    const diff = diffContracts(current, next);
    expect(diff.breaking).toEqual([]);
    expect(diff.additive.length).toBe(2);
  });

  it('flags a changed parameter type and a lost enum value', () => {
    const next = clone();
    const params = (next.paths[sample]!['get'] as { parameters: Record<string, unknown>[] }).parameters;
    (params.find((p) => p['name'] === 'page')!['schema'] as Record<string, unknown>)['type'] = 'string';
    (params.find((p) => p['name'] === 'sortOrder')!['schema'] as Record<string, unknown>)['enum'] = ['asc'];
    const details = diffContracts(current, next).breaking.map((c) => c.detail);
    expect(details.some((d) => d.includes('type changed'))).toBe(true);
    expect(details.some((d) => d.includes('lost enum value'))).toBe(true);
  });

  it('flags a removed success response and a moved service owner', () => {
    const next = clone();
    delete (next.paths[sample]!['get'] as { responses: Record<string, unknown> }).responses['200'];
    (next.paths[sample]!['post'] as Record<string, unknown>)['x-service'] = 'hr';
    const details = diffContracts(current, next).breaking.map((c) => c.detail);
    expect(details.some((d) => d.includes('success response 200 removed'))).toBe(true);
    expect(details.some((d) => d.includes('owning service changed'))).toBe(true);
  });

  it('flags a previously public route becoming authenticated', () => {
    const next = clone();
    (next.paths['/api/auth/login']!['post'] as Record<string, unknown>)['security'] = [{ bearerAuth: [] }];
    expect(
      diffContracts(current, next).breaking.some((c) => c.detail === 'operation now requires authentication'),
    ).toBe(true);
  });

  it('flags a removed required property on a shared schema', () => {
    const next = clone();
    const schemas = (next.components as Record<string, Record<string, Record<string, unknown>>>)['schemas']!;
    schemas['ListResponse']!['required'] = ['data'];
    expect(
      diffContracts(current, next).breaking.some((c) => c.detail.includes('required property "pagination" removed')),
    ).toBe(true);
  });
});
