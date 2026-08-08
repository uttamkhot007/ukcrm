/**
 * Multitenant isolation contract for the generic CRUD factory.
 *
 * Every tenant-scoped table in the platform is served through this factory, so
 * these tests are the single behavioural proof that no list, read, write, or
 * delete can reach another tenant's rows. They execute the real Fastify route
 * handlers against an in-memory database seeded with two tenants.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeDb, type Store } from '../../test/fake-knex.js';

const TENANT_A = 'tenant-aaaa';
const TENANT_B = 'tenant-bbbb';

let fakeDb: FakeDb;

vi.mock('../../db/connection.js', () => ({
  get db() {
    return fakeDb;
  },
}));

const seed = (): Store => ({
  deals: [
    { id: 'a1', tenant_id: TENANT_A, name: 'Alpha deal', amount: 100, created_at: '2026-01-01', user_id: 'user-a' },
    { id: 'a2', tenant_id: TENANT_A, name: 'Alpha renewal', amount: 200, created_at: '2026-01-02', user_id: 'user-a' },
    { id: 'b1', tenant_id: TENANT_B, name: 'Beta deal', amount: 300, created_at: '2026-01-03', user_id: 'user-b' },
    { id: 'b2', tenant_id: TENANT_B, name: 'Beta secret', amount: 400, created_at: '2026-01-04', user_id: 'user-b' },
  ],
  user_roles: [],
});

type TestUser = { id: string; tenantId?: string; groups?: string[] };

async function buildApp(user: TestUser, table = 'deals'): Promise<FastifyInstance> {
  const { createCrudRoutes } = await import('../crud-factory.js');
  const app = Fastify();
  app.addHook('preHandler', async (request) => {
    (request as any).user = user;
  });
  await app.register(createCrudRoutes({ tableName: table, searchColumns: ['name'] }), { prefix: '/items' });
  await app.ready();
  return app;
}

const userA: TestUser = { id: 'user-a', tenantId: TENANT_A };
const userB: TestUser = { id: 'user-b', tenantId: TENANT_B };

beforeEach(() => {
  vi.resetModules();
  fakeDb = createFakeDb(seed());
});

describe('CRUD factory · tenant isolation', () => {
  it('lists only the caller tenant rows', async () => {
    const app = await buildApp(userA);
    const res = await app.inject({ method: 'GET', url: '/items' });
    const body = res.json();

    expect(res.statusCode).toBe(200);
    expect(body.data.map((r: any) => r.id).sort()).toEqual(['a1', 'a2']);
    expect(body.data.every((r: any) => r.tenant_id === TENANT_A)).toBe(true);
    // The pagination total must not count foreign rows either.
    expect(body.pagination.total).toBe(2);
  });

  it('cannot be widened by a tenant_id query parameter', async () => {
    const app = await buildApp(userA);
    for (const url of [
      `/items?tenant_id=${TENANT_B}`,
      `/items?tenant_id__neq=${TENANT_A}`,
      `/items?tenant_id__in=${TENANT_A},${TENANT_B}`,
      '/items?tenant_id__is=null',
    ]) {
      const body = (await app.inject({ method: 'GET', url })).json();
      expect(body.data.every((r: any) => r.tenant_id === TENANT_A)).toBe(true);
      expect(body.data.some((r: any) => r.tenant_id === TENANT_B)).toBe(false);
    }
  });

  it('never leaks foreign rows through search', async () => {
    const app = await buildApp(userA);
    const body = (await app.inject({ method: 'GET', url: '/items?search=Beta' })).json();
    expect(body.data).toHaveLength(0);
  });

  it('returns 404 (not the row) when reading another tenant record by id', async () => {
    const app = await buildApp(userA);
    const res = await app.inject({ method: 'GET', url: '/items/b2' });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('Beta secret');
  });

  it('forces the caller tenant on create and ignores a spoofed tenant_id', async () => {
    const app = await buildApp(userA);
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      payload: { name: 'Injected', tenant_id: TENANT_B },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.tenant_id).toBe(TENANT_A);
    expect(fakeDb.store.deals.filter((r) => r.tenant_id === TENANT_B)).toHaveLength(2);
  });

  it('cannot update or delete another tenant row', async () => {
    const app = await buildApp(userA);

    const put = await app.inject({ method: 'PUT', url: '/items/b1', payload: { name: 'hijacked' } });
    const patch = await app.inject({ method: 'PATCH', url: '/items/b2', payload: { amount: 0 } });
    const del = await app.inject({ method: 'DELETE', url: '/items/b1' });

    expect([put.statusCode, patch.statusCode, del.statusCode]).toEqual([404, 404, 404]);
    expect(fakeDb.store.deals.find((r) => r.id === 'b1')).toMatchObject({ name: 'Beta deal' });
    expect(fakeDb.store.deals.find((r) => r.id === 'b2')).toMatchObject({ amount: 400 });
  });

  it('cannot move a row into another tenant via update', async () => {
    const app = await buildApp(userA);
    await app.inject({ method: 'PATCH', url: '/items/a1', payload: { tenant_id: TENANT_B } });
    const stillVisible = (await app.inject({ method: 'GET', url: '/items' })).json();
    // Even if the column were writable, tenant A must not lose or gain rows in B.
    expect(stillVisible.data.every((r: any) => r.tenant_id === TENANT_A)).toBe(true);
  });

  it('rejects a token with no tenant instead of returning every tenant', async () => {
    const app = await buildApp({ id: 'user-orphan' });
    const res = await app.inject({ method: 'GET', url: '/items' });
    expect(res.statusCode).toBe(403);
    expect(res.body).not.toContain('Beta secret');
  });

  it('gives each tenant a disjoint view of the same table', async () => {
    const appA = await buildApp(userA);
    const appB = await buildApp(userB);
    const idsA = (await appA.inject({ method: 'GET', url: '/items' })).json().data.map((r: any) => r.id);
    const idsB = (await appB.inject({ method: 'GET', url: '/items' })).json().data.map((r: any) => r.id);
    expect(idsA.filter((id: string) => idsB.includes(id))).toEqual([]);
  });
});

describe('CRUD factory · privileged tables', () => {
  it('blocks non-admins from role tables entirely', async () => {
    const app = await buildApp(userA, 'user_roles');
    const res = await app.inject({ method: 'GET', url: '/items' });
    expect(res.statusCode).toBe(403);
  });

  it('blocks non-admin mutations on tenancy tables', async () => {
    const app = await buildApp(userA, 'tenant_members');
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      payload: { tenant_id: TENANT_B, user_id: 'user-a', role: 'admin' },
    });
    expect(res.statusCode).toBe(403);
  });
});
