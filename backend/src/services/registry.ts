/**
 * Service registry — maps a service name to its runtime definition.
 *
 * A single container image ships all services; the `SERVICE` environment
 * variable selects which one the process becomes. That keeps build and supply
 * chain simple while every service is independently deployable, scalable and
 * restartable, with its own database, port, health checks and scaling policy.
 */

import type { FastifyInstance } from 'fastify';
import type { CreateServiceOptions } from '../platform/service.js';
import type { ServiceName } from '../platform/manifest.js';
import { resourcesFor } from '../platform/resources.js';

// Legacy route modules, mounted by their owning service during the strangler
// migration. Each will be folded into its service package over time.
import { authRoutes } from '../routes/auth.js';
import { adminUserRoutes } from '../routes/users-admin.js';
import { authorizedDomainsRoutes } from '../routes/authorized-domains.js';
import { platformStatusRoutes } from '../routes/platform-status.js';
import { contactsRoutes } from '../routes/contacts.js';
import { organizationsRoutes } from '../routes/organizations.js';
import { dealsRoutes } from '../routes/deals.js';
import { ticketsRoutes } from '../routes/tickets.js';
import { exchangeRatesRoutes } from '../routes/exchange-rates.js';
import { storageRoutes } from '../routes/storage.js';
import { integrationsRoutes } from '../routes/integrations.js';
import { aiRoutes } from '../routes/ai.js';
import { workflowRoutes } from '../routes/workflows.js';
import { realtimePlugin } from '../plugins/realtime.js';

type Registrar = (app: FastifyInstance) => Promise<void>;

/** Mount a legacy route module under its prefix, tolerating optional exports. */
function mount(app: FastifyInstance, plugin: unknown, prefix: string): Promise<unknown> | undefined {
  if (typeof plugin !== 'function') return undefined;
  return app.register(plugin as never, { prefix });
}

const definitions: Record<ServiceName, CreateServiceOptions> = {
  gateway: { name: 'gateway' },

  identity: {
    name: 'identity',
    crossTenant: true,
    publicPaths: ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/confirm'],
    resources: resourcesFor('identity'),
    routes: async (app) => {
      await mount(app, authRoutes, '/api/auth');
      await mount(app, adminUserRoutes, '/api/admin');
      await mount(app, authorizedDomainsRoutes, '/api/admin');
    },
  },

  tenancy: {
    name: 'tenancy',
    crossTenant: true,
    resources: resourcesFor('tenancy'),
    routes: async (app) => {
      await mount(app, platformStatusRoutes, '/api/platform');
    },
  },

  crm: {
    name: 'crm',
    resources: resourcesFor('crm'),
    routes: async (app) => {
      await mount(app, contactsRoutes, '/api/contacts-ext');
      await mount(app, organizationsRoutes, '/api/organizations');
    },
    onEvents: (bus, { logger }) => {
      bus.subscribe(['sales.deal.won'], async (event) => {
        logger.info({ event: event.type, subject: event.subject }, 'Marking account as customer');
      });
    },
  },

  sales: {
    name: 'sales',
    resources: resourcesFor('sales'),
    routes: async (app) => {
      await mount(app, dealsRoutes, '/api/deals-ext');
    },
  },

  presales: { name: 'presales', resources: resourcesFor('presales') },

  billing: {
    name: 'billing',
    resources: resourcesFor('billing'),
    onEvents: (bus, { logger }) => {
      bus.subscribe(['sales.deal.won'], async (event) => {
        logger.info({ subject: event.subject }, 'Opening order processing for won deal');
      });
    },
  },

  accounting: {
    name: 'accounting',
    resources: resourcesFor('accounting'),
    routes: async (app) => {
      await mount(app, exchangeRatesRoutes, '/api/exchange-rates');
    },
    onEvents: (bus, { logger }) => {
      bus.subscribe(['billing.invoice.created', 'billing.payment.created'], async (event) => {
        logger.info({ type: event.type, subject: event.subject }, 'Posting journal entry');
      });
    },
  },

  taxation: { name: 'taxation', resources: resourcesFor('taxation') },
  inventory: { name: 'inventory', resources: resourcesFor('inventory') },
  hr: { name: 'hr', resources: resourcesFor('hr') },
  expenses: { name: 'expenses', resources: resourcesFor('expenses') },
  assets: { name: 'assets', resources: resourcesFor('assets') },
  projects: { name: 'projects', resources: resourcesFor('projects') },

  support: {
    name: 'support',
    resources: resourcesFor('support'),
    routes: async (app) => {
      await mount(app, ticketsRoutes, '/api/tickets-ext');
    },
  },

  compliance: { name: 'compliance', resources: resourcesFor('compliance') },
  marketing: { name: 'marketing', resources: resourcesFor('marketing') },

  collaboration: {
    name: 'collaboration',
    resources: resourcesFor('collaboration'),
    routes: async (app) => {
      // WebSocket fan-out lives with the workspace domain.
      if (typeof realtimePlugin === 'function') await app.register(realtimePlugin as never);
    },
    onEvents: (bus, { logger }) => {
      bus.subscribe(['*'], async (event) => {
        if (event.type.endsWith('.created') || event.type.includes('breached')) {
          logger.debug({ type: event.type }, 'Fanning out notification');
        }
      });
    },
  },

  files: {
    name: 'files',
    resources: resourcesFor('files'),
    routes: async (app) => {
      await mount(app, storageRoutes, '/api/storage');
    },
  },

  integrations: {
    name: 'integrations',
    resources: resourcesFor('integrations'),
    routes: async (app) => {
      await mount(app, integrationsRoutes, '/api/integrations');
    },
  },

  ai: {
    name: 'ai',
    resources: resourcesFor('ai'),
    routes: async (app) => {
      await mount(app, aiRoutes, '/api/ai');
    },
  },

  workflow: {
    name: 'workflow',
    resources: resourcesFor('workflow'),
    routes: async (app) => {
      await mount(app, workflowRoutes, '/api/workflows');
    },
    onEvents: (bus, { logger }) => {
      // The orchestrator observes everything so sagas can compensate.
      bus.subscribe(['*'], async (event) => {
        logger.debug({ type: event.type, subject: event.subject }, 'Saga observer');
      });
    },
  },
};

export function serviceDefinition(name: string): CreateServiceOptions {
  const def = definitions[name as ServiceName];
  if (!def) {
    throw new Error(
      `Unknown SERVICE "${name}". Valid values: ${Object.keys(definitions).join(', ')}`,
    );
  }
  return def;
}

export const SERVICE_NAMES = Object.keys(definitions) as ServiceName[];
export type { Registrar };
