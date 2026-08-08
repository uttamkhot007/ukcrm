/**
 * Database-per-service connection routing with per-tenant placement.
 *
 * Two levels of isolation:
 *
 *  1. Service level — each service owns its own logical database
 *     (`DB_NAME_<SERVICE>`), so no service can read another's tables even by
 *     accident. Locally this collapses to one cluster with one schema per
 *     service so developers only run a single Postgres.
 *
 *  2. Tenant level — enterprise tenants can be pinned to a dedicated cluster
 *     (their own host/database, optionally in another region). Placement is
 *     read from the control-plane `tenant_clusters` table and cached; the
 *     shared pool is used for everyone else.
 *
 * Pools are created lazily, cached, and evicted when idle so a large tenant
 * fleet does not exhaust connections.
 */

import knex, { Knex } from 'knex';
import { config } from '../config/index.js';
import { dbPoolGauge } from './telemetry.js';
import type { Logger } from 'pino';

export interface TenantPlacement {
  tenantId: string;
  /** 'shared' rows live in the service database; 'dedicated' rows have their own cluster. */
  mode: 'shared' | 'dedicated';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  schema?: string;
  region?: string;
}

interface PoolEntry {
  db: Knex;
  lastUsed: number;
  key: string;
}

const POOL_IDLE_MS = 10 * 60 * 1000;
const MAX_POOLS = Number(process.env['DB_MAX_TENANT_POOLS'] ?? 25);

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

/** Per-service database name, falling back to the shared database. */
export function databaseForService(service: string): string {
  const upper = service.toUpperCase().replace(/-/g, '_');
  return env(`DB_NAME_${upper}`) ?? config.db.database;
}

/** Per-service schema; used when services share one cluster (local/dev). */
export function schemaForService(service: string): string {
  const upper = service.toUpperCase().replace(/-/g, '_');
  return env(`DB_SCHEMA_${upper}`) ?? env('DB_SCHEMA') ?? 'public';
}

function buildPool(opts: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  appName: string;
  logger?: Logger;
}): Knex {
  return knex({
    client: 'pg',
    connection: {
      host: opts.host,
      port: opts.port,
      database: opts.database,
      user: opts.user,
      password: opts.password,
      ssl: config.db.ssl,
      application_name: opts.appName,
    },
    searchPath: [opts.schema, 'public'],
    pool: {
      min: config.db.pool.min,
      max: config.db.pool.max,
      acquireTimeoutMillis: 30_000,
      createTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
      reapIntervalMillis: 1_000,
      createRetryIntervalMillis: 200,
      afterCreate: (conn: any, done: (err?: Error, conn?: unknown) => void) => {
        // Bound every statement so one slow query cannot hold a connection open.
        conn.query(
          "SET statement_timeout = 30000; SET idle_in_transaction_session_timeout = 60000; SET lock_timeout = 10000",
          (err: Error) => done(err, conn),
        );
      },
    },
    acquireConnectionTimeout: 60_000,
  });
}

export class DatabaseRouter {
  private readonly serviceDb: Knex;
  private readonly tenantPools = new Map<string, PoolEntry>();
  private readonly placements = new Map<string, { value: TenantPlacement; expires: number }>();
  private readonly placementTtlMs = 60_000;
  private sweeper?: NodeJS.Timeout;

  constructor(
    private readonly service: string,
    private readonly logger: Logger,
  ) {
    this.serviceDb = buildPool({
      host: config.db.host,
      port: config.db.port,
      database: databaseForService(service),
      user: config.db.user,
      password: config.db.password,
      schema: schemaForService(service),
      appName: `${service}-service`,
      logger,
    });

    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref?.();
  }

  /** The service-owned pool. Use this for anything not tenant-pinned. */
  get shared(): Knex {
    return this.serviceDb;
  }

  /** Resolve the pool a given tenant's data lives in. */
  async forTenant(tenantId: string | undefined): Promise<Knex> {
    if (!tenantId) return this.serviceDb;

    const placement = await this.placementFor(tenantId);
    if (placement.mode !== 'dedicated' || !placement.host || !placement.database) {
      return this.serviceDb;
    }

    const key = `${placement.host}:${placement.port ?? 5432}/${placement.database}`;
    const existing = this.tenantPools.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.db;
    }

    if (this.tenantPools.size >= MAX_POOLS) this.evictOldest();

    const db = buildPool({
      host: placement.host,
      port: placement.port ?? 5432,
      database: placement.database,
      user: placement.user ?? config.db.user,
      password: placement.password ?? config.db.password,
      schema: placement.schema ?? schemaForService(this.service),
      appName: `${this.service}-service-tenant`,
      logger: this.logger,
    });

    this.tenantPools.set(key, { db, lastUsed: Date.now(), key });
    this.logger.info({ tenantId, cluster: key, region: placement.region }, 'Opened dedicated tenant cluster pool');
    return db;
  }

  /** Look up tenant placement from the control plane, cached. */
  private async placementFor(tenantId: string): Promise<TenantPlacement> {
    const cached = this.placements.get(tenantId);
    if (cached && cached.expires > Date.now()) return cached.value;

    let placement: TenantPlacement = { tenantId, mode: 'shared' };
    try {
      const row = await this.serviceDb('tenant_clusters')
        .where({ tenant_id: tenantId })
        .andWhere('is_active', true)
        .first();
      if (row) {
        placement = {
          tenantId,
          mode: 'dedicated',
          host: row.host,
          port: row.port ?? 5432,
          database: row.database_name,
          user: row.db_user ?? undefined,
          password: row.db_password ?? undefined,
          schema: row.schema_name ?? undefined,
          region: row.region ?? undefined,
        };
      }
    } catch {
      // Control-plane table is absent in single-cluster deployments: shared is correct.
    }

    this.placements.set(tenantId, { value: placement, expires: Date.now() + this.placementTtlMs });
    return placement;
  }

  /** Invalidate a cached placement after a tenant is migrated between clusters. */
  invalidatePlacement(tenantId: string): void {
    this.placements.delete(tenantId);
  }

  private evictOldest(): void {
    let oldest: PoolEntry | undefined;
    for (const entry of this.tenantPools.values()) {
      if (!oldest || entry.lastUsed < oldest.lastUsed) oldest = entry;
    }
    if (oldest) {
      this.tenantPools.delete(oldest.key);
      void oldest.db.destroy();
    }
  }

  private sweep(): void {
    const cutoff = Date.now() - POOL_IDLE_MS;
    for (const [key, entry] of this.tenantPools) {
      if (entry.lastUsed < cutoff) {
        this.tenantPools.delete(key);
        void entry.db.destroy();
      }
    }
    this.reportPoolMetrics();
  }

  reportPoolMetrics(): void {
    const pool = (this.serviceDb.client as any).pool;
    if (!pool) return;
    dbPoolGauge.set({ service: this.service, state: 'used' }, pool.numUsed());
    dbPoolGauge.set({ service: this.service, state: 'free' }, pool.numFree());
    dbPoolGauge.set({ service: this.service, state: 'pending' }, pool.numPendingAcquires());
    dbPoolGauge.set({ service: this.service, state: 'tenant_pools' }, this.tenantPools.size);
  }

  async healthy(): Promise<boolean> {
    try {
      await this.serviceDb.raw('select 1');
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.sweeper) clearInterval(this.sweeper);
    await Promise.allSettled([
      this.serviceDb.destroy(),
      ...[...this.tenantPools.values()].map((e) => e.db.destroy()),
    ]);
    this.tenantPools.clear();
  }
}
