import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  groups?: string[];
  tenantId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// JWKS client for Cognito token verification
const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${config.cognito.region}.amazonaws.com/${config.cognito.userPoolId}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    jwks.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return reject(new Error('No signing key found'));
      resolve(signingKey);
    });
  });
}

async function verifyToken(token: string): Promise<AuthUser> {
  // Decode header to get kid
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const kid = decoded.header.kid;
  if (!kid) throw new Error('Token missing kid header');

  const signingKey = await getSigningKey(kid);

  const payload = jwt.verify(token, signingKey, {
    issuer: `https://cognito-idp.${config.cognito.region}.amazonaws.com/${config.cognito.userPoolId}`,
    algorithms: ['RS256'],
  }) as any;

  // Validate token_use (access or id token)
  if (payload.token_use !== 'access' && payload.token_use !== 'id') {
    throw new Error('Invalid token_use');
  }

  // Validate client_id for access tokens
  if (payload.token_use === 'access' && payload.client_id !== config.cognito.clientId) {
    throw new Error('Invalid client_id');
  }

  // Validate aud for id tokens
  if (payload.token_use === 'id' && payload.aud !== config.cognito.clientId) {
    throw new Error('Invalid audience');
  }

  return {
    id: payload.sub,
    email: payload.email || payload['cognito:username'],
    name: payload.name || payload['cognito:username'],
    groups: payload['cognito:groups'] || [],
    tenantId: payload['custom:tenant_id'],
  };
}

async function authPlugin(app: FastifyInstance) {
  // Decorator
  app.decorateRequest('user', undefined);

  // Authentication hook - applies to all routes except public ones
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health, OPTIONS, and public routes
    const publicPaths = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/confirm'];
    const isPublic = publicPaths.some(p => request.url.startsWith(p));

    if (request.method === 'OPTIONS' || isPublic) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    try {
      request.user = await verifyToken(token);
    } catch (err) {
      logger.warn({ err, url: request.url }, 'Token verification failed');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
export { authPlugin };
