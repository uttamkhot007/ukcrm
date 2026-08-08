/**
 * API contract — the machine-readable description of every HTTP surface the
 * mesh exposes.
 *
 * The document is generated from the same sources the runtime uses (the
 * service manifest, the CRUD resource table and the declared custom route
 * modules), so it cannot drift silently: `contracts/openapi.json` is committed
 * and CI fails when the generated document differs, and fails hard when the
 * difference is breaking for existing clients.
 */

import { ROUTABLE_SERVICES, serviceForTable, type ServiceName } from './manifest.js';
import { ALL_RESOURCES } from './resources.js';
import type { CrudResource } from './crud.js';

/** Bumped deliberately when the contract shape (not the routes) changes. */
export const CONTRACT_VERSION = '1.0.0';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface CustomOperation {
  method: HttpMethod;
  /** Path relative to the module prefix, Fastify style (`/users/:id`). */
  path: string;
  summary: string;
  /** Operations reachable without a bearer token. */
  public?: boolean;
  /** Roles required, when the handler enforces more than authentication. */
  roles?: string[];
}

export interface RouteModuleContract {
  /** Source file, relative to `backend/src`. Used by the coverage test. */
  file: string;
  /** Prefix the owning service mounts the module under. */
  prefix: string;
  service: ServiceName;
  operations: CustomOperation[];
}

const crudLike = (resource: string): CustomOperation[] => [
  { method: 'get', path: '/', summary: `List ${resource}` },
  { method: 'get', path: '/:id', summary: `Get a ${resource} by id` },
  { method: 'post', path: '/', summary: `Create a ${resource}` },
  { method: 'put', path: '/:id', summary: `Replace a ${resource}` },
  { method: 'delete', path: '/:id', summary: `Delete a ${resource}` },
];

/**
 * Every non-CRUD route module, with the exact operations it registers.
 *
 * This list is the contract: adding or removing an `app.<method>()` in one of
 * these files without updating this table fails the coverage test.
 */
export const ROUTE_MODULES: Record<string, RouteModuleContract> = {
  auth: {
    file: 'routes/auth.ts',
    prefix: '/api/auth',
    service: 'identity',
    operations: [
      { method: 'post', path: '/login', summary: 'Authenticate and issue tokens', public: true },
      { method: 'post', path: '/register', summary: 'Register a new user', public: true },
      { method: 'post', path: '/confirm', summary: 'Confirm a registration code', public: true },
      { method: 'post', path: '/forgot-password', summary: 'Start a password reset', public: true },
      { method: 'post', path: '/reset-password', summary: 'Complete a password reset', public: true },
      { method: 'post', path: '/logout', summary: 'Revoke the current session' },
      { method: 'get', path: '/me', summary: 'Current user, profile, role and tenant' },
    ],
  },
  'users-admin': {
    file: 'routes/users-admin.ts',
    prefix: '/api/admin',
    service: 'identity',
    operations: [
      { method: 'post', path: '/users/bulk-create', summary: 'Bulk provision users', roles: ['admin', 'super_admin'] },
      { method: 'post', path: '/users/set-password', summary: 'Set a user password', roles: ['admin', 'super_admin'] },
      { method: 'delete', path: '/users/:userId', summary: 'Delete a user', roles: ['admin', 'super_admin'] },
    ],
  },
  'authorized-domains': {
    file: 'routes/authorized-domains.ts',
    prefix: '/api/admin',
    service: 'identity',
    operations: [
      { method: 'get', path: '/authorized-domains', summary: 'List sign-up allowlist entries' },
      { method: 'post', path: '/authorized-domains', summary: 'Add an allowlisted domain', roles: ['super_admin'] },
      { method: 'patch', path: '/authorized-domains/:id', summary: 'Update an allowlisted domain', roles: ['super_admin'] },
      { method: 'delete', path: '/authorized-domains/:id', summary: 'Remove an allowlisted domain', roles: ['super_admin'] },
      { method: 'post', path: '/authorized-domains/check', summary: 'Check whether an email domain may sign up', public: true },
    ],
  },
  'platform-status': {
    file: 'routes/platform-status.ts',
    prefix: '/api/platform',
    service: 'tenancy',
    operations: [{ method: 'get', path: '/status', summary: 'Platform and integration status' }],
  },
  contacts: {
    file: 'routes/contacts.ts',
    prefix: '/api/contacts-ext',
    service: 'crm',
    operations: crudLike('contact'),
  },
  organizations: {
    file: 'routes/organizations.ts',
    prefix: '/api/organizations',
    service: 'crm',
    operations: crudLike('organization'),
  },
  deals: {
    file: 'routes/deals.ts',
    prefix: '/api/deals-ext',
    service: 'sales',
    operations: crudLike('deal'),
  },
  tickets: {
    file: 'routes/tickets.ts',
    prefix: '/api/tickets-ext',
    service: 'support',
    operations: crudLike('ticket'),
  },
  'exchange-rates': {
    file: 'routes/exchange-rates.ts',
    prefix: '/api/exchange-rates',
    service: 'accounting',
    operations: [{ method: 'post', path: '/', summary: 'Convert an amount between currencies' }],
  },
  storage: {
    file: 'routes/storage.ts',
    prefix: '/api/storage',
    service: 'files',
    operations: [
      { method: 'post', path: '/sign-upload', summary: 'Presign an object upload' },
      { method: 'post', path: '/sign-download', summary: 'Presign an object download' },
      { method: 'delete', path: '/object', summary: 'Delete a stored object' },
      { method: 'get', path: '/public-url', summary: 'Resolve a public object URL' },
    ],
  },
  integrations: {
    file: 'routes/integrations.ts',
    prefix: '/api/integrations',
    service: 'integrations',
    operations: [
      { method: 'post', path: '/hubspot/auth-url', summary: 'Start the HubSpot OAuth flow' },
      { method: 'post', path: '/hubspot/callback', summary: 'Complete the HubSpot OAuth flow' },
      { method: 'post', path: '/hubspot/sync', summary: 'Trigger a HubSpot sync' },
      { method: 'post', path: '/office365/auth-url', summary: 'Start the Office 365 OAuth flow' },
      { method: 'post', path: '/office365/callback', summary: 'Complete the Office 365 OAuth flow' },
      { method: 'post', path: '/office365/sync', summary: 'Trigger an Office 365 sync' },
    ],
  },
  ai: {
    file: 'routes/ai.ts',
    prefix: '/api/ai',
    service: 'ai',
    operations: [
      { method: 'post', path: '/chat', summary: 'Chat completion' },
      { method: 'post', path: '/insights', summary: 'Generate domain insights' },
      { method: 'get', path: '/providers', summary: 'List configured AI providers' },
    ],
  },
  workflows: {
    file: 'routes/workflows.ts',
    prefix: '/api/workflows',
    service: 'workflow',
    operations: [{ method: 'post', path: '/trigger', summary: 'Trigger a workflow run' }],
  },
};

/* -------------------------------------------------------------------------- */
/* OpenAPI document                                                            */
/* -------------------------------------------------------------------------- */

export type OpenApiDocument = {
  openapi: string;
  info: Record<string, unknown>;
  servers: { url: string; description: string }[];
  tags: { name: string; description: string }[];
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, unknown>;
};

/** Fastify `/:id` -> OpenAPI `/{id}`. */
export function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function pathParams(path: string) {
  return [...path.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
}

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const jsonObject = { type: 'object', additionalProperties: true } as const;

function listOperation(resource: CrudResource, service: ServiceName) {
  return {
    operationId: `list_${resource.path.replace(/-/g, '_')}`,
    tags: [service],
    summary: `List ${resource.path}`,
    'x-service': service,
    'x-table': resource.table,
    'x-tenant-scoped': resource.tenantScoped !== false,
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 200, default: 25 } },
      { name: 'search', in: 'query', required: false, schema: { type: 'string', maxLength: 200 } },
      { name: 'sortBy', in: 'query', required: false, schema: { type: 'string', maxLength: 64, default: 'created_at' } },
      {
        name: 'sortOrder',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      },
    ],
    responses: {
      '200': {
        description: 'Paginated rows for the caller\u2019s tenant',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ListResponse' } } },
      },
      '401': errorResponse('Missing or invalid credentials'),
      '403': errorResponse('Tenant context missing or not permitted'),
    },
  };
}

function itemResponses(description: string) {
  return {
    '200': { description, content: { 'application/json': { schema: jsonObject } } },
    '401': errorResponse('Missing or invalid credentials'),
    '403': errorResponse('Tenant context missing or not permitted'),
    '404': errorResponse('Not found in the caller\u2019s tenant'),
  };
}

function crudPaths(resource: CrudResource, service: ServiceName) {
  const id = resource.path.replace(/-/g, '_');
  const write = resource.writeRoles && resource.writeRoles.length > 0 ? { 'x-write-roles': resource.writeRoles } : {};
  const base = {
    tags: [service],
    security: [{ bearerAuth: [] }],
    'x-service': service,
    'x-table': resource.table,
    ...write,
  };
  const body = { required: true, content: { 'application/json': { schema: jsonObject } } };

  return {
    [`/api/${resource.path}`]: {
      get: listOperation(resource, service),
      post: {
        ...base,
        operationId: `create_${id}`,
        summary: `Create a ${resource.path} record`,
        requestBody: body,
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: jsonObject } } },
          '400': errorResponse('Validation failed'),
          '401': errorResponse('Missing or invalid credentials'),
          '403': errorResponse('Tenant context missing or not permitted'),
        },
      },
    },
    [`/api/${resource.path}/{id}`]: {
      parameters: pathParams('/{id}'),
      get: { ...base, operationId: `get_${id}`, summary: `Get a ${resource.path} record`, responses: itemResponses('The record') },
      patch: {
        ...base,
        operationId: `patch_${id}`,
        summary: `Update a ${resource.path} record`,
        requestBody: body,
        responses: itemResponses('The updated record'),
      },
      delete: {
        ...base,
        operationId: `delete_${id}`,
        summary: `Delete a ${resource.path} record`,
        responses: {
          '204': { description: 'Deleted' },
          '401': errorResponse('Missing or invalid credentials'),
          '403': errorResponse('Tenant context missing or not permitted'),
          '404': errorResponse('Not found in the caller\u2019s tenant'),
        },
      },
    },
  } as Record<string, Record<string, unknown>>;
}

function operationId(method: HttpMethod, fullPath: string): string {
  const slug = fullPath
    .replace(/^\/api\//, '')
    .replace(/[{}]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+$/g, '');
  return `${method}_${slug || 'root'}`;
}

function customPaths(): Record<string, Record<string, unknown>> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const [moduleName, mod] of Object.entries(ROUTE_MODULES)) {
    for (const op of mod.operations) {
      const suffix = toOpenApiPath(op.path === '/' ? '' : op.path);
      const fullPath = `${mod.prefix}${suffix}` || mod.prefix;
      paths[fullPath] ??= {};
      const params = pathParams(fullPath);
      paths[fullPath][op.method] = {
        operationId: operationId(op.method, `${fullPath}_${moduleName}`),
        tags: [mod.service],
        summary: op.summary,
        'x-service': mod.service,
        'x-module': moduleName,
        ...(params.length > 0 ? { parameters: params } : {}),
        ...(op.roles ? { 'x-required-roles': op.roles } : {}),
        security: op.public ? [] : [{ bearerAuth: [] }],
        ...(op.method === 'get' || op.method === 'delete'
          ? {}
          : { requestBody: { required: true, content: { 'application/json': { schema: jsonObject } } } }),
        responses: {
          '200': { description: 'Success', content: { 'application/json': { schema: jsonObject } } },
          ...(op.public ? {} : { '401': errorResponse('Missing or invalid credentials') }),
          ...(op.roles ? { '403': errorResponse('Insufficient role') } : {}),
        },
      };
    }
  }

  return paths;
}

function healthPaths(): Record<string, Record<string, unknown>> {
  const probe = (id: string, summary: string, description: string) => ({
    get: {
      operationId: id,
      tags: ['platform'],
      summary,
      security: [],
      responses: {
        '200': { description, content: { 'application/json': { schema: jsonObject } } },
        ...(id === 'health_ready'
          ? { '503': { description: 'Dependencies unavailable', content: { 'application/json': { schema: jsonObject } } } }
          : {}),
      },
    },
  });

  return {
    '/health': probe('health', 'Service health and SLO targets', 'Service metadata'),
    '/health/live': probe('health_live', 'Liveness probe', 'Process is up'),
    '/health/ready': probe('health_ready', 'Readiness probe', 'Dependencies are usable'),
    '/metrics': {
      get: {
        operationId: 'metrics',
        tags: ['platform'],
        summary: 'Prometheus metrics exposition',
        security: [],
        responses: { '200': { description: 'Metrics', content: { 'text/plain': { schema: { type: 'string' } } } } },
      },
    },
  };
}

const components = {
  securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  },
  schemas: {
    Error: {
      type: 'object',
      required: ['error'],
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
        statusCode: { type: 'integer' },
      },
    },
    Pagination: {
      type: 'object',
      required: ['page', 'limit', 'total'],
      properties: {
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        totalPages: { type: 'integer' },
      },
    },
    ListResponse: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: { type: 'array', items: { type: 'object', additionalProperties: true } },
        pagination: { $ref: '#/components/schemas/Pagination' },
      },
    },
  },
};

/** Sort object keys so the generated JSON is byte-stable across runs. */
export function sortDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

/** The full public contract served by the gateway. */
export function buildOpenApiDocument(): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = { ...healthPaths() };

  for (const resource of ALL_RESOURCES) {
    const owner = serviceForTable(resource.table);
    if (!owner) continue;
    for (const [path, ops] of Object.entries(crudPaths(resource, owner.name))) {
      paths[path] = { ...(paths[path] ?? {}), ...ops };
    }
  }

  for (const [path, ops] of Object.entries(customPaths())) {
    paths[path] = { ...(paths[path] ?? {}), ...ops };
  }

  const doc: OpenApiDocument = {
    openapi: '3.1.0',
    info: {
      title: 'NexusCRM Platform API',
      version: CONTRACT_VERSION,
      description:
        'Aggregate contract for the microservice estate. Generated from the service manifest; ' +
        'breaking changes are rejected by the contract tests.',
    },
    servers: [{ url: 'https://api.example.com', description: 'API gateway' }],
    tags: ROUTABLE_SERVICES.map((s) => ({ name: s.name, description: s.description })).concat({
      name: 'platform',
      description: 'Health, readiness and metrics endpoints exposed by every service.',
    }),
    paths,
    components,
  };

  return sortDeep(doc);
}

/** The subset of the contract a single service is responsible for. */
export function buildServiceDocument(service: ServiceName): OpenApiDocument {
  const full = buildOpenApiDocument();
  const paths: Record<string, Record<string, unknown>> = {};

  for (const [path, ops] of Object.entries(full.paths)) {
    const kept: Record<string, unknown> = {};
    for (const [method, op] of Object.entries(ops)) {
      if (method === 'parameters') continue;
      const owner = (op as { 'x-service'?: string })['x-service'];
      const isProbe = (op as { tags?: string[] }).tags?.includes('platform');
      if (owner === service || isProbe) kept[method] = op;
    }
    if (Object.keys(kept).length > 0) {
      if (ops['parameters']) kept['parameters'] = ops['parameters'];
      paths[path] = kept;
    }
  }

  return sortDeep({
    ...full,
    info: { ...full.info, title: `NexusCRM ${service} service API` },
    servers: [{ url: `http://${service}:0`, description: `${service} service (in-mesh)` }],
    paths,
  });
}

/** Every service that owns at least one operation in the contract. */
export function servicesInContract(doc: OpenApiDocument): Set<string> {
  const names = new Set<string>();
  for (const ops of Object.values(doc.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (method === 'parameters') continue;
      const owner = (op as { 'x-service'?: string })['x-service'];
      if (owner) names.add(owner);
    }
  }
  return names;
}
