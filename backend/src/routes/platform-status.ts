/**
 * Platform-level integration status endpoint.
 *
 * Returns a snapshot of which platform integrations (payments, email, AI
 * providers, search, monitoring, etc.) are configured and reachable.
 *
 * Mounted at `GET /api/platform/status`. Restricted to super admins via the
 * `request.user.is_super_admin` flag set by the auth plugin.
 *
 * Each provider check is best-effort: a failed probe never crashes the
 * endpoint — instead it returns `status: "error"` with a short reason so
 * the Platform Console can render an actionable card.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';
import { db } from '../db/connection.js';

export type ProviderStatus = 'ready' | 'not_configured' | 'error' | 'disabled';

export interface ProviderCheck {
  /** Stable machine-readable id used by the UI. */
  id: string;
  /** Display name shown to admins. */
  name: string;
  /** Category — drives icon and grouping in the UI. */
  category: 'payments' | 'email' | 'ai' | 'search' | 'storage' | 'monitoring';
  status: ProviderStatus;
  /** Short human-readable reason for the current status. */
  detail: string;
  /** Optional keys that, when missing, would flip status to not_configured. */
  requiredEnv?: string[];
  /** Last time the underlying probe was performed (ISO). */
  checkedAt: string;
}

function envSet(...keys: string[]): boolean {
  return keys.every((k) => {
    const v = process.env[k];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

function probePayments(): ProviderCheck {
  const requiredEnv = ['STRIPE_SECRET_KEY'];
  if (!envSet('STRIPE_SECRET_KEY')) {
    return {
      id: 'stripe',
      name: 'Stripe',
      category: 'payments',
      status: 'not_configured',
      detail: 'Set STRIPE_SECRET_KEY in the backend secrets to enable card payments.',
      requiredEnv,
      checkedAt: new Date().toISOString(),
    };
  }
  // Presence of the key is the strongest signal we can give without making a
  // synchronous Stripe API call on every status fetch. A deeper probe could
  // hit GET https://api.stripe.com/v1/balance — left as a future improvement.
  return {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    status: 'ready',
    detail: 'Secret key is configured. Card and subscription endpoints are active.',
    requiredEnv,
    checkedAt: new Date().toISOString(),
  };
}

function probeEmail(): ProviderCheck[] {
  const checks: ProviderCheck[] = [];

  // AWS SES is the primary transactional sender for self-hosted deploys.
  const sesReady = envSet('SES_FROM') && (envSet('AWS_REGION') || !!config.ses.region);
  checks.push({
    id: 'aws_ses',
    name: 'AWS SES',
    category: 'email',
    status: sesReady ? 'ready' : 'not_configured',
    detail: sesReady
      ? `Sending from ${config.ses.fromAddress} via ${config.ses.region}.`
      : 'Set SES_FROM and AWS_REGION (or run inside an AWS task with an IAM role).',
    requiredEnv: ['SES_FROM', 'AWS_REGION'],
    checkedAt: new Date().toISOString(),
  });

  // Optional secondary: SMTP (Postmark, Mailgun, etc.)
  const smtpReady = envSet('SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD');
  if (smtpReady || process.env['SMTP_HOST']) {
    checks.push({
      id: 'smtp',
      name: 'SMTP Relay',
      category: 'email',
      status: smtpReady ? 'ready' : 'not_configured',
      detail: smtpReady
        ? `Relay configured at ${process.env['SMTP_HOST']}.`
        : 'SMTP_HOST present but credentials missing.',
      requiredEnv: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'],
      checkedAt: new Date().toISOString(),
    });
  }

  return checks;
}

function probeAIProviders(): ProviderCheck[] {
  return [
    {
      id: 'bedrock',
      name: 'AWS Bedrock',
      category: 'ai',
      status: config.ai.bedrock.enabled
        ? envSet('AWS_REGION') || !!config.ai.bedrock.region
          ? 'ready'
          : 'error'
        : 'disabled',
      detail: config.ai.bedrock.enabled
        ? `Default model: ${config.ai.bedrock.defaultModel} (${config.ai.bedrock.region}).`
        : 'Set AI_BEDROCK_ENABLED=true to enable.',
      requiredEnv: ['AI_BEDROCK_ENABLED', 'AI_BEDROCK_REGION'],
      checkedAt: new Date().toISOString(),
    },
    {
      id: 'openai',
      name: 'OpenAI',
      category: 'ai',
      status: config.ai.openai.enabled
        ? config.ai.openai.apiKey
          ? 'ready'
          : 'not_configured'
        : 'disabled',
      detail: config.ai.openai.enabled
        ? config.ai.openai.apiKey
          ? `Default model: ${config.ai.openai.defaultModel}.`
          : 'Enabled but AI_OPENAI_API_KEY is missing.'
        : 'Set AI_OPENAI_ENABLED=true and AI_OPENAI_API_KEY to enable.',
      requiredEnv: ['AI_OPENAI_API_KEY'],
      checkedAt: new Date().toISOString(),
    },
    {
      id: 'google',
      name: 'Google AI',
      category: 'ai',
      status: config.ai.google.enabled
        ? config.ai.google.apiKey
          ? 'ready'
          : 'not_configured'
        : 'disabled',
      detail: config.ai.google.enabled
        ? config.ai.google.apiKey
          ? `Default model: ${config.ai.google.defaultModel}.`
          : 'Enabled but AI_GOOGLE_API_KEY is missing.'
        : 'Set AI_GOOGLE_ENABLED=true and AI_GOOGLE_API_KEY to enable.',
      requiredEnv: ['AI_GOOGLE_API_KEY'],
      checkedAt: new Date().toISOString(),
    },
  ];
}

function probeStorage(): ProviderCheck {
  const ready = !!config.s3.bucket && (envSet('AWS_REGION') || !!config.s3.region);
  return {
    id: 's3',
    name: 'AWS S3',
    category: 'storage',
    status: ready ? 'ready' : 'not_configured',
    detail: ready
      ? `Bucket ${config.s3.bucket} in ${config.s3.region}.`
      : 'Set S3_BUCKET and AWS_REGION (or attach an IAM role with s3:* on the bucket).',
    requiredEnv: ['S3_BUCKET', 'AWS_REGION'],
    checkedAt: new Date().toISOString(),
  };
}

async function probeDatabase(): Promise<ProviderCheck> {
  const start = Date.now();
  try {
    await db.raw('SELECT 1');
    return {
      id: 'aurora',
      name: 'AWS Aurora PostgreSQL',
      category: 'monitoring',
      status: 'ready',
      detail: `Round-trip ${Date.now() - start}ms.`,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      id: 'aurora',
      name: 'AWS Aurora PostgreSQL',
      category: 'monitoring',
      status: 'error',
      detail: err instanceof Error ? err.message : 'Database probe failed.',
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function platformStatusRoutes(app: FastifyInstance) {
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    // Status may include sensitive deploy info — restrict to super admins.
    const user = (request as any).user;
    if (!user?.is_super_admin && !user?.isSuperAdmin) {
      return reply.status(403).send({ error: 'Super admin access required' });
    }

    const dbCheck = await probeDatabase();

    const providers: ProviderCheck[] = [
      probePayments(),
      ...probeEmail(),
      ...probeAIProviders(),
      probeStorage(),
      dbCheck,
    ];

    const summary = {
      ready: providers.filter((p) => p.status === 'ready').length,
      not_configured: providers.filter((p) => p.status === 'not_configured').length,
      disabled: providers.filter((p) => p.status === 'disabled').length,
      error: providers.filter((p) => p.status === 'error').length,
      total: providers.length,
    };

    return {
      generatedAt: new Date().toISOString(),
      summary,
      providers,
    };
  });
}
