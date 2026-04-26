/**
 * OAuth + sync endpoints for HubSpot and Office 365.
 * Replaces supabase/functions/{hubspot-auth,hubspot-sync,office365-auth,office365-sync}.
 *
 * Heavy sync work is enqueued onto BullMQ (`integrations-sync` queue) and
 * processed by the worker service.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import { getQueue } from '../lib/queues.js';
import { logger } from '../lib/logger.js';

// ---------- HubSpot ----------
const HS_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HS_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const HS_SCOPES = 'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read oauth';

async function exchangeHubspotCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.hubspot.clientId,
    client_secret: config.hubspot.clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(HS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`HubSpot token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

async function refreshHubspotToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.hubspot.clientId,
    client_secret: config.hubspot.clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(HS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`HubSpot refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

// ---------- Office 365 ----------
const O365_AUTH_URL = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
const O365_TOKEN_URL = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const O365_SCOPES =
  'offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite Contacts.Read';

async function exchangeO365Code(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.office365.clientId,
    client_secret: config.office365.clientSecret,
    redirect_uri: redirectUri,
    code,
    scope: O365_SCOPES,
  });
  const res = await fetch(O365_TOKEN_URL(config.office365.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`O365 token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

const authStartSchema = z.object({
  redirectUri: z.string().url(),
});
const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});
const syncSchema = z.object({
  syncType: z.enum(['contacts', 'companies', 'deals', 'all', 'calendar', 'mail']).default('all'),
});

export async function integrationsRoutes(app: FastifyInstance) {
  // ---------- HubSpot ----------
  app.post('/hubspot/auth-url', async (request, reply) => {
    const parsed = authStartSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    if (!config.hubspot.clientId)
      return reply.status(503).send({ error: 'HubSpot not configured' });
    const url = `${HS_AUTH_URL}?client_id=${encodeURIComponent(config.hubspot.clientId)}` +
      `&redirect_uri=${encodeURIComponent(parsed.data.redirectUri)}` +
      `&scope=${encodeURIComponent(HS_SCOPES)}`;
    return { url };
  });

  app.post('/hubspot/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = oauthCallbackSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const tokens = await exchangeHubspotCode(parsed.data.code, parsed.data.redirectUri);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await db('integrations')
        .insert({
          user_id: request.user.id,
          provider: 'hubspot',
          status: 'connected',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
        })
        .onConflict(['user_id', 'provider'])
        .merge();
      return { connected: true };
    } catch (err: any) {
      logger.error({ err }, 'hubspot/callback failed');
      return reply.status(502).send({ error: err.message });
    }
  });

  app.post('/hubspot/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = syncSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

    const job = await getQueue('integrationsSync').add('hubspot-sync', {
      userId: request.user.id,
      tenantId: request.user.tenantId,
      syncType: parsed.data.syncType,
    });
    return { jobId: job.id, status: 'queued' };
  });

  // ---------- Office 365 ----------
  app.post('/office365/auth-url', async (request, reply) => {
    const parsed = authStartSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    if (!config.office365.clientId)
      return reply.status(503).send({ error: 'Office 365 not configured' });
    const url = `${O365_AUTH_URL(config.office365.tenantId)}` +
      `?client_id=${encodeURIComponent(config.office365.clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(parsed.data.redirectUri)}` +
      `&scope=${encodeURIComponent(O365_SCOPES)}` +
      `&response_mode=query`;
    return { url };
  });

  app.post('/office365/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = oauthCallbackSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const tokens = await exchangeO365Code(parsed.data.code, parsed.data.redirectUri);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await db('integrations')
        .insert({
          user_id: request.user.id,
          provider: 'office365',
          status: 'connected',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
        })
        .onConflict(['user_id', 'provider'])
        .merge();
      return { connected: true };
    } catch (err: any) {
      logger.error({ err }, 'office365/callback failed');
      return reply.status(502).send({ error: err.message });
    }
  });

  app.post('/office365/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = syncSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

    const job = await getQueue('integrationsSync').add('office365-sync', {
      userId: request.user.id,
      tenantId: request.user.tenantId,
      syncType: parsed.data.syncType,
    });
    return { jobId: job.id, status: 'queued' };
  });
}

export { refreshHubspotToken };
