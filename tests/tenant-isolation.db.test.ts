/**
 * Database-level multitenant isolation audit.
 *
 * The application-side proofs (CRUD factory, event bus) only cover code paths
 * we control. The last line of defence is Postgres itself, so this suite walks
 * the live schema and asserts that:
 *   1. every table has row level security enabled,
 *   2. every RLS-enabled table actually has at least one policy,
 *   3. no table that carries `tenant_id` gains a new "readable by anyone"
 *      policy beyond the documented baseline in
 *      `tests/tenant-isolation-baseline.json`.
 *
 * The suite skips itself when no database connection is configured (CI without
 * a database), so it never produces a false green in a normal unit-test run.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.PGHOST || process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

const baseline = JSON.parse(
  readFileSync(path.resolve(__dirname, 'tenant-isolation-baseline.json'), 'utf8'),
) as { permissiveTenantTablePolicies: string[] };

type Row = Record<string, any>;

suite('Database · multitenant isolation', () => {
  let client: Client;
  const query = async (sql: string): Promise<Row[]> => (await client.query(sql)).rows;

  beforeAll(async () => {
    // Managed Postgres endpoints terminate TLS with a chain the runner does not
    // ship; the audit reads catalog metadata only, so relaxing verification here
    // does not weaken anything in the application.
    const ssl = process.env.PGSSLMODE === 'disable' ? undefined : { rejectUnauthorized: false };
    client = process.env.DATABASE_URL
      ? new Client({ connectionString: process.env.DATABASE_URL, ssl })
      : new Client({ ssl });
    await client.connect();
  });


  afterAll(async () => {
    await client?.end();
  });

  it('enables row level security on every public table', async () => {
    const rows = await query(`
      select c.relname as table
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      order by 1
    `);
    expect(rows.map((r) => r.table)).toEqual([]);
  });

  it('never leaves an RLS table without policies (which would deny or, if bypassed, expose everything)', async () => {
    const rows = await query(`
      select c.relname as table
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        and not exists (
          select 1 from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname
        )
      order by 1
    `);
    expect(rows.map((r) => r.table)).toEqual([]);
  });

  it('adds no new cross-tenant readable policy on a tenant-scoped table', async () => {
    const rows = await query(`
      with tenant_tables as (
        select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'tenant_id'
      )
      select p.tablename || '::' || p.policyname as entry
      from pg_policies p
      join tenant_tables t on t.table_name = p.tablename
      where p.cmd in ('SELECT', 'ALL')
        and (p.qual is null or trim(p.qual) = 'true')
      order by 1
    `);

    const found = rows.map((r) => r.entry as string);
    const known = new Set(baseline.permissiveTenantTablePolicies);
    const regressions = found.filter((entry) => !known.has(entry));

    expect(regressions, `New cross-tenant readable policies: ${regressions.join(', ')}`).toEqual([]);
  });

  it('keeps the baseline honest: no stale entries left behind', async () => {
    const rows = await query(`
      with tenant_tables as (
        select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'tenant_id'
      )
      select p.tablename || '::' || p.policyname as entry
      from pg_policies p
      join tenant_tables t on t.table_name = p.tablename
      where p.cmd in ('SELECT', 'ALL')
        and (p.qual is null or trim(p.qual) = 'true')
    `);
    const found = new Set(rows.map((r) => r.entry as string));
    const stale = baseline.permissiveTenantTablePolicies.filter((entry) => !found.has(entry));
    expect(stale, `Baseline entries already fixed — delete them: ${stale.join(', ')}`).toEqual([]);
  });

  it('scopes tenant write policies so rows cannot be inserted into another tenant', async () => {
    const rows = await query(`
      with tenant_tables as (
        select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'tenant_id'
      )
      select p.tablename || '::' || p.policyname as entry
      from pg_policies p
      join tenant_tables t on t.table_name = p.tablename
      where p.cmd in ('INSERT', 'UPDATE', 'ALL')
        and (p.with_check is null or trim(p.with_check) = 'true')
        and (p.qual is null or trim(p.qual) = 'true')
      order by 1
    `);
    const known = new Set(baseline.permissiveTenantTablePolicies);
    const regressions = rows.map((r) => r.entry as string).filter((e) => !known.has(e));
    expect(regressions, `Unrestricted write policies: ${regressions.join(', ')}`).toEqual([]);
  });
});
