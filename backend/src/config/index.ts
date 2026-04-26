import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function boolEnv(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (!val) return defaultValue;
  return val === 'true' || val === '1';
}

// Build SSL config for RDS/PostgreSQL
function buildSslConfig(): false | object {
  if (!boolEnv('DB_SSL', true)) return false;

  const sslConfig: any = {
    rejectUnauthorized: boolEnv('DB_SSL_REJECT_UNAUTHORIZED', true),
  };

  const caPath = process.env['DB_SSL_CA_PATH'];
  if (caPath && fs.existsSync(caPath)) {
    sslConfig.ca = fs.readFileSync(caPath, 'utf8');
  }

  // AWS RDS uses Amazon's root CA - auto-detect if in AWS
  if (!caPath && process.env['AWS_REGION']) {
    const rdsCaPath = path.resolve(process.cwd(), 'certs', 'rds-combined-ca-bundle.pem');
    if (fs.existsSync(rdsCaPath)) {
      sslConfig.ca = fs.readFileSync(rdsCaPath, 'utf8');
    }
  }

  return sslConfig;
}

export const config = {
  // Server
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  host: optionalEnv('HOST', '0.0.0.0'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  logLevel: optionalEnv('LOG_LEVEL', 'info'),

  // Database
  db: {
    host: requiredEnv('DB_HOST'),
    port: parseInt(optionalEnv('DB_PORT', '5432'), 10),
    database: requiredEnv('DB_NAME'),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    ssl: buildSslConfig(),
    pool: {
      min: parseInt(optionalEnv('DB_POOL_MIN', '2'), 10),
      max: parseInt(optionalEnv('DB_POOL_MAX', '20'), 10),
    },
  },

  // AWS Cognito
  cognito: {
    userPoolId: requiredEnv('COGNITO_USER_POOL_ID'),
    clientId: requiredEnv('COGNITO_CLIENT_ID'),
    region: optionalEnv('COGNITO_REGION', 'ap-south-1'),
  },

  // AI Providers
  ai: {
    defaultProvider: optionalEnv('AI_DEFAULT_PROVIDER', 'bedrock') as 'bedrock' | 'openai' | 'google',
    bedrock: {
      enabled: boolEnv('AI_BEDROCK_ENABLED', false),
      region: optionalEnv('AI_BEDROCK_REGION', 'us-east-1'),
      defaultModel: optionalEnv('AI_BEDROCK_DEFAULT_MODEL', 'anthropic.claude-3-5-sonnet-20241022-v2:0'),
    },
    openai: {
      enabled: boolEnv('AI_OPENAI_ENABLED', false),
      apiKey: process.env['AI_OPENAI_API_KEY'] || '',
      defaultModel: optionalEnv('AI_OPENAI_DEFAULT_MODEL', 'gpt-4o'),
    },
    google: {
      enabled: boolEnv('AI_GOOGLE_ENABLED', false),
      apiKey: process.env['AI_GOOGLE_API_KEY'] || '',
      defaultModel: optionalEnv('AI_GOOGLE_DEFAULT_MODEL', 'gemini-2.5-flash'),
    },
  },

  // S3
  s3: {
    bucket: optionalEnv('S3_BUCKET', 'nexuscrm-uploads'),
    region: optionalEnv('S3_REGION', 'ap-south-1'),
  },

  // CORS
  corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:8080').split(',').map(s => s.trim()),

  // Rate Limiting
  rateLimitMax: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
  rateLimitWindowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),

  // Redis / ElastiCache (Valkey) - used for BullMQ queues & realtime pub/sub
  redis: {
    host: optionalEnv('REDIS_HOST', 'localhost'),
    port: parseInt(optionalEnv('REDIS_PORT', '6379'), 10),
    password: process.env['REDIS_PASSWORD'] || undefined,
    tls: boolEnv('REDIS_TLS', false),
    db: parseInt(optionalEnv('REDIS_DB', '0'), 10),
  },

  // SES (transactional email)
  ses: {
    region: optionalEnv('SES_REGION', 'ap-south-1'),
    fromAddress: optionalEnv('SES_FROM', 'noreply@nexuscrm.local'),
  },

  // Integrations
  hubspot: {
    clientId: process.env['HUBSPOT_CLIENT_ID'] || '',
    clientSecret: process.env['HUBSPOT_CLIENT_SECRET'] || '',
    redirectUri: process.env['HUBSPOT_REDIRECT_URI'] || '',
  },
  office365: {
    clientId: process.env['OFFICE365_CLIENT_ID'] || '',
    clientSecret: process.env['OFFICE365_CLIENT_SECRET'] || '',
    tenantId: optionalEnv('OFFICE365_TENANT_ID', 'common'),
    redirectUri: process.env['OFFICE365_REDIRECT_URI'] || '',
  },
};
