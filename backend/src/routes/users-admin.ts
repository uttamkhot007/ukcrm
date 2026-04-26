/**
 * Admin user-management endpoints — replaces:
 *   supabase/functions/create-users
 *   supabase/functions/set-user-password
 *
 * Uses Cognito for credential storage.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../lib/logger.js';

const cognito = new CognitoIdentityProviderClient({ region: config.cognito.region });

async function isAdmin(userId: string): Promise<boolean> {
  const row = await db('user_roles')
    .where({ user_id: userId })
    .whereIn('role', ['admin', 'super_admin'])
    .first();
  return !!row;
}

const createUsersSchema = z.object({
  users: z
    .array(
      z.object({
        email: z.string().email(),
        full_name: z.string().min(1).max(255),
        employee_code: z.string().optional(),
        department: z.string().optional(),
        job_title: z.string().optional(),
        location: z.string().optional(),
        birth_date: z.string().optional(),
        hire_date: z.string().optional(),
      }),
    )
    .min(1)
    .max(500),
});

const setPasswordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(128),
});

function tempPassword(): string {
  return `Tmp!${Math.random().toString(36).slice(2, 10)}A1`;
}

export async function adminUserRoutes(app: FastifyInstance) {
  app.post('/users/bulk-create', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await isAdmin(request.user.id)))
      return reply.status(403).send({ error: 'Admin only' });

    const parsed = createUsersSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    const results: Array<{ email: string; status: 'created' | 'failed'; error?: string; userId?: string }> = [];
    for (const u of parsed.data.users) {
      try {
        const tmp = tempPassword();
        const cmd = new AdminCreateUserCommand({
          UserPoolId: config.cognito.userPoolId,
          Username: u.email,
          TemporaryPassword: tmp,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: u.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: u.full_name },
          ],
        });
        const out = await cognito.send(cmd);
        const cognitoSub = out.User?.Attributes?.find((a) => a.Name === 'sub')?.Value!;

        await db('profiles')
          .insert({
            user_id: cognitoSub,
            full_name: u.full_name,
            email: u.email,
            employee_code: u.employee_code,
            department: u.department,
            job_title: u.job_title,
            location: u.location,
            birth_date: u.birth_date || null,
            hire_date: u.hire_date || null,
          })
          .onConflict('user_id')
          .merge();

        results.push({ email: u.email, status: 'created', userId: cognitoSub });
      } catch (err: any) {
        logger.warn({ err, email: u.email }, 'bulk create user failed');
        results.push({ email: u.email, status: 'failed', error: err.message });
      }
    }
    return { results };
  });

  app.post('/users/set-password', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await isAdmin(request.user.id)))
      return reply.status(403).send({ error: 'Admin only' });

    const parsed = setPasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed' });

    try {
      await cognito.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: config.cognito.userPoolId,
          Username: parsed.data.user_id,
          Password: parsed.data.password,
          Permanent: true,
        }),
      );
      return { success: true };
    } catch (err: any) {
      logger.error({ err }, 'set-password failed');
      return reply.status(502).send({ error: err.message });
    }
  });

  app.delete('/users/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user?.id) return reply.status(401).send({ error: 'Unauthorized' });
    if (!(await isAdmin(request.user.id)))
      return reply.status(403).send({ error: 'Admin only' });
    const { userId } = request.params as { userId: string };
    try {
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: config.cognito.userPoolId,
          Username: userId,
        }),
      );
      await db('profiles').where({ user_id: userId }).del();
      return { success: true };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message });
    }
  });
}
