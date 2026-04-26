/**
 * Realtime WebSocket gateway. Replaces Supabase `postgres_changes` channels.
 *
 * Clients connect to:  /api/realtime?token=<jwt>&channel=notifications:<userId>
 * Multiple `channel` query params (or a comma-separated value) subscribe to
 * multiple channels at once. Server-side publishers call `publishRealtime`
 * (in `lib/redis.ts`) which fans out via Redis pub/sub.
 *
 * Frontend mapping (in supabase-shim.ts `channel(name)`):
 *   channel('postgres_changes:notifications:<uid>') ->
 *      ws subscribes to channel "notifications:<uid>"
 */

import { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { createSubscriber } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';

const issuer = `https://cognito-idp.${config.cognito.region}.amazonaws.com/${config.cognito.userPoolId}`;
const jwks = jwksClient({
  jwksUri: `${issuer}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, cb: jwt.SigningKeyCallback) {
  jwks.getSigningKey(header.kid!, (err, key) => {
    if (err) return cb(err);
    cb(null, key!.getPublicKey());
  });
}

function verifyToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { issuer }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as jwt.JwtPayload);
    });
  });
}

interface ClientCtx {
  userId: string;
  channels: Set<string>;
}

export async function realtimePlugin(app: FastifyInstance) {
  await app.register(websocket, {
    options: { maxPayload: 1_048_576 }, // 1MB
  });

  // One shared subscriber across all websocket clients. We track which channels
  // each client wants and fan out on message.
  const subscriber = createSubscriber();
  const clientsByChannel = new Map<string, Set<{ ctx: ClientCtx; send: (data: string) => void }>>();
  const subscribed = new Set<string>();

  subscriber.on('message', (channel, message) => {
    const set = clientsByChannel.get(channel);
    if (!set) return;
    const payload = JSON.stringify({ channel, data: safeParse(message) });
    for (const client of set) client.send(payload);
  });

  function safeParse(s: string) {
    try { return JSON.parse(s); } catch { return s; }
  }

  async function ensureSubscribed(channel: string) {
    if (subscribed.has(channel)) return;
    await subscriber.subscribe(channel);
    subscribed.add(channel);
  }

  app.get('/api/realtime', { websocket: true }, async (connection, req) => {
    const q = req.query as { token?: string; channel?: string | string[] };
    if (!q.token) {
      connection.socket.close(4001, 'missing token');
      return;
    }
    let userId: string;
    try {
      const payload = await verifyToken(q.token);
      userId = (payload.sub as string) || (payload['cognito:username'] as string);
      if (!userId) throw new Error('no subject');
    } catch (err) {
      logger.warn({ err }, 'realtime auth failed');
      connection.socket.close(4003, 'invalid token');
      return;
    }

    const ctx: ClientCtx = { userId, channels: new Set() };
    const send = (data: string) => {
      try { connection.socket.send(data); } catch {}
    };
    const client = { ctx, send };

    const initial = Array.isArray(q.channel)
      ? q.channel
      : (q.channel ? q.channel.split(',') : []);
    for (const ch of initial) await subscribeClient(ch.trim());

    async function subscribeClient(channel: string) {
      if (!channel) return;
      // Tenant/user authorization — only allow channels prefixed with the user id
      // OR public/global channels (e.g. "broadcast:*"). Tighten as needed.
      if (!isAllowed(channel, userId)) {
        send(JSON.stringify({ error: 'forbidden', channel }));
        return;
      }
      ctx.channels.add(channel);
      let set = clientsByChannel.get(channel);
      if (!set) { set = new Set(); clientsByChannel.set(channel, set); }
      set.add(client);
      await ensureSubscribed(channel);
    }

    connection.socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.action === 'subscribe' && typeof msg.channel === 'string') {
          await subscribeClient(msg.channel);
          send(JSON.stringify({ ok: true, subscribed: msg.channel }));
        } else if (msg?.action === 'unsubscribe' && typeof msg.channel === 'string') {
          ctx.channels.delete(msg.channel);
          clientsByChannel.get(msg.channel)?.delete(client);
        } else if (msg?.action === 'ping') {
          send(JSON.stringify({ pong: Date.now() }));
        }
      } catch {
        send(JSON.stringify({ error: 'invalid message' }));
      }
    });

    connection.socket.on('close', () => {
      for (const ch of ctx.channels) {
        clientsByChannel.get(ch)?.delete(client);
      }
    });
  });

  app.addHook('onClose', async () => {
    await subscriber.quit().catch(() => null);
  });
}

function isAllowed(channel: string, userId: string): boolean {
  // User-scoped: notifications:<userId>, presence:<userId>
  if (channel.endsWith(`:${userId}`)) return true;
  // Tenant-wide broadcasts and table-change topics are allowed for authenticated users
  if (channel.startsWith('broadcast:')) return true;
  if (channel.startsWith('table:')) return true;
  if (channel.startsWith('tenant:')) return true; // backend enforces row-level on data
  return false;
}
