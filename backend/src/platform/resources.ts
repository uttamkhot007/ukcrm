/**
 * Maps the legacy monolith route table onto service-owned resources.
 *
 * Keeping one list means a table cannot silently appear in two services, and
 * the strangler migration stays verifiable: every route the monolith served is
 * still served, just by its owner.
 */

import { allRouteConfigs } from '../routes/route-table.js';
import { serviceForTable, type ServiceName } from './manifest.js';
import type { CrudResource } from './crud.js';

/** Domain-event prefixes for the aggregates worth broadcasting. */
const EVENT_PREFIXES: Record<string, string> = {
  contacts: 'crm.contact',
  leads: 'crm.lead',
  deals: 'sales.deal',
  quotations: 'sales.quotation',
  invoices: 'billing.invoice',
  payment_records: 'billing.payment',
  projects: 'projects.project',
  project_tasks: 'projects.task',
  tickets: 'support.ticket',
  customer_support_tickets: 'support.ticket',
  leave_requests: 'hr.leave',
  expense_reports: 'expenses.report',
  assets: 'assets.asset',
  renewals: 'sales.renewal',
  tenants: 'tenancy.tenant',
  user_roles: 'identity.role',
};

/** Tables whose writes must be restricted to administrators. */
const ADMIN_WRITE_TABLES = new Set([
  'user_roles',
  'user_teams',
  'tenants',
  'tenant_members',
  'tenant_licenses',
  'tenant_modules',
  'tenant_clusters',
  'authorized_domains',
  'license_plans',
  'module_definitions',
  'organization_settings',
]);

export const ALL_RESOURCES: CrudResource[] = allRouteConfigs.map((entry) => {
  const cfg = entry.config as {
    tableName: string;
    searchColumns?: string[];
    tenantScoped?: boolean;
    userOwned?: boolean;
    userField?: string;
  };
  const resource: CrudResource = {
    path: entry.prefix.replace(/^\/api\//, ''),
    table: cfg.tableName,
    searchColumns: cfg.searchColumns,
    tenantScoped: cfg.tenantScoped !== false,
    userOwned: cfg.userOwned === true,
    userField: cfg.userField ?? 'user_id',
    writeRoles: ADMIN_WRITE_TABLES.has(cfg.tableName) ? ['admin', 'super_admin', 'platform_admin'] : [],
  };
  const eventPrefix = EVENT_PREFIXES[cfg.tableName];
  if (eventPrefix) resource.eventPrefix = eventPrefix;
  return resource;
});

/** Resources a given service owns and must expose. */
export function resourcesFor(service: ServiceName): CrudResource[] {
  return ALL_RESOURCES.filter((r) => serviceForTable(r.table)?.name === service);
}

/** Tables that no service claims — used by the boundary check in CI. */
export function unownedTables(): string[] {
  return ALL_RESOURCES.filter((r) => serviceForTable(r.table) === null).map((r) => r.table);
}

/** Tables claimed by more than one service. */
export function contestedTables(): string[] {
  const seen = new Map<string, string>();
  const contested: string[] = [];
  for (const r of ALL_RESOURCES) {
    const owner = serviceForTable(r.table);
    if (!owner) continue;
    const existing = seen.get(r.table);
    if (existing && existing !== owner.name) contested.push(r.table);
    seen.set(r.table, owner.name);
  }
  return contested;
}
