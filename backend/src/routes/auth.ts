import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { db } from '../db/connection.js';
import { lookupAuthorizedDomain } from './authorized-domains.js';

const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
});

const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
  newPassword: z.string().min(8).max(128),
});

export async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password } = parsed.data;

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: config.cognito.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);
      const result = response.AuthenticationResult;

      if (!result) {
        return reply.status(401).send({ error: 'Authentication failed' });
      }

      // Fetch user profile from DB
      const profile = await db('profiles').where('email', email).first();

      return {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        refreshToken: result.RefreshToken,
        expiresIn: result.ExpiresIn,
        user: profile || { email },
      };
    } catch (err: any) {
      logger.warn({ err: err.name, email }, 'Login failed');
      if (err.name === 'NotAuthorizedException') {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }
      if (err.name === 'UserNotConfirmedException') {
        return reply.status(403).send({ error: 'Email not verified. Please check your email for the verification code.' });
      }
      return reply.status(500).send({ error: 'Authentication service error' });
    }
  });

  // Register
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { email, password, fullName } = parsed.data;

    // Strict allowlist: email domain must be authorized
    const allowed = await lookupAuthorizedDomain(email);
    if (!allowed) {
      logger.warn({ email }, 'Signup rejected: domain not authorized');
      return reply.status(403).send({
        error: 'Email domain not authorized for signup. Please contact your administrator.',
      });
    }

    try {
      const command = new SignUpCommand({
        ClientId: config.cognito.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: fullName },
        ],
      });

      const response = await cognitoClient.send(command);

      // Create profile in DB scoped to the matched tenant (if any)
      await db('profiles').insert({
        user_id: response.UserSub,
        email,
        full_name: fullName,
        tenant_id: allowed.tenant_id ?? null,
      }).onConflict('email').ignore();

      // Assign default role from allowlist (user | admin)
      await db('user_roles')
        .insert({ user_id: response.UserSub!, role: allowed.default_role })
        .onConflict(['user_id', 'role']).ignore();

      // If domain is scoped to a tenant, add membership
      if (allowed.tenant_id) {
        await db('tenant_members')
          .insert({
            tenant_id: allowed.tenant_id,
            user_id: response.UserSub!,
            role: allowed.default_role,
            status: 'active',
          })
          .onConflict(['tenant_id', 'user_id']).ignore();
      }

      return {
        message: 'Registration successful. Please check your email for the verification code.',
        userId: response.UserSub,
        confirmed: response.UserConfirmed,
      };
    } catch (err: any) {
      logger.warn({ err: err.name, email }, 'Registration failed');
      if (err.name === 'UsernameExistsException') {
        return reply.status(409).send({ error: 'An account with this email already exists' });
      }
      if (err.name === 'InvalidPasswordException') {
        return reply.status(400).send({ error: 'Password does not meet requirements' });
      }
      return reply.status(500).send({ error: 'Registration service error' });
    }
  });

  // Confirm registration
  app.post('/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = confirmSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { email, code } = parsed.data;

    try {
      const command = new ConfirmSignUpCommand({
        ClientId: config.cognito.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      await cognitoClient.send(command);
      return { message: 'Email verified successfully. You can now log in.' };
    } catch (err: any) {
      logger.warn({ err: err.name, email }, 'Confirmation failed');
      if (err.name === 'CodeMismatchException') {
        return reply.status(400).send({ error: 'Invalid verification code' });
      }
      if (err.name === 'ExpiredCodeException') {
        return reply.status(400).send({ error: 'Verification code has expired. Please request a new one.' });
      }
      return reply.status(500).send({ error: 'Verification service error' });
    }
  });

  // Forgot password
  app.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    try {
      const command = new ForgotPasswordCommand({
        ClientId: config.cognito.clientId,
        Username: parsed.data.email,
      });

      await cognitoClient.send(command);
      return { message: 'If an account exists, a password reset code has been sent.' };
    } catch {
      // Don't reveal whether email exists
      return { message: 'If an account exists, a password reset code has been sent.' };
    }
  });

  // Reset password
  app.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { email, code, newPassword } = parsed.data;

    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: config.cognito.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await cognitoClient.send(command);
      return { message: 'Password reset successfully. You can now log in.' };
    } catch (err: any) {
      if (err.name === 'CodeMismatchException') {
        return reply.status(400).send({ error: 'Invalid reset code' });
      }
      return reply.status(500).send({ error: 'Password reset service error' });
    }
  });

  // Logout (invalidate tokens)
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    try {
      const command = new GlobalSignOutCommand({ AccessToken: token });
      await cognitoClient.send(command);
      return { message: 'Logged out successfully' };
    } catch {
      return { message: 'Logged out' };
    }
  });

  // Get current user
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const profile = await db('profiles').where('user_id', request.user.id).first();
    return { user: { ...request.user, ...profile } };
  });
}
