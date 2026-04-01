import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { aiComplete, aiCompleteJSON } from '../lib/ai-provider.js';
import { db } from '../db/connection.js';

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000),
  })).min(1).max(50),
  context: z.enum([
    'sales', 'support', 'employee', 'finance', 'meddic',
    'account-intelligence', 'tender', 'general'
  ]).default('general'),
  provider: z.enum(['bedrock', 'openai', 'google']).optional(),
  model: z.string().optional(),
});

const insightSchema = z.object({
  type: z.enum(['lead-score', 'deal-analysis', 'forecast', 'account-intelligence', 'finance', 'meddic']),
  data: z.record(z.any()),
  provider: z.enum(['bedrock', 'openai', 'google']).optional(),
});

// System prompts per context
const SYSTEM_PROMPTS: Record<string, string> = {
  sales: `You are a B2B cybersecurity sales expert. Help with objection handling, deal strategy, competitive analysis, and pipeline management. Use data-driven insights and Indian market context.`,
  support: `You are an L1 Support Engineer for a cybersecurity company. Help with troubleshooting, ticket management, and customer inquiries. Escalate complex issues by recommending ticket creation.`,
  employee: `You are a helpful employee assistant for Vinca Cyber Security. Help with HR policies, leave, attendance, training, and workplace questions. Support multiple Indian languages.`,
  finance: `You are an expert financial analyst for Indian businesses. Analyze financial metrics, cash flow, ratios, budgets, and P&L statements. Use Indian Rupee (₹) for amounts.`,
  meddic: `You are a B2B sales expert analyzing MEDDIC qualification data. Provide actionable insights on Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, and Champion.`,
  'account-intelligence': `You are an AI business analyst specializing in B2B account analysis. Analyze customer accounts, payment patterns, renewal risks, and growth opportunities.`,
  tender: `You are an expert cybersecurity solutions architect for RFP/tender responses. Generate technical specifications, compliance matrices, and professional proposal content.`,
  general: `You are an intelligent CRM assistant with expertise in cybersecurity, sales, account management, and business operations.`,
};

export async function aiRoutes(app: FastifyInstance) {
  // Chat completion
  app.post('/chat', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { messages, context, provider, model } = parsed.data;
    const systemPrompt = SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general;

    try {
      const result = await aiComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        provider,
        model,
      });

      return {
        response: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      };
    } catch (err: any) {
      return reply.status(503).send({ error: 'AI service unavailable', message: err.message });
    }
  });

  // AI-powered insights
  app.post('/insights', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = insightSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }

    const { type, data, provider } = parsed.data;

    try {
      let prompt = '';
      let systemPrompt = '';

      switch (type) {
        case 'lead-score':
          systemPrompt = 'You are a sales intelligence AI. Analyze leads and score them 0-100. Return valid JSON.';
          prompt = `Score this lead:\n${JSON.stringify(data, null, 2)}\n\nReturn JSON: { "score": number, "breakdown": {...}, "insights": "string", "recommended_actions": ["..."] }`;
          break;

        case 'deal-analysis':
          systemPrompt = 'You are a sales intelligence AI. Analyze deals and predict win probability. Return valid JSON.';
          prompt = `Analyze this deal:\n${JSON.stringify(data, null, 2)}\n\nReturn JSON: { "win_probability": number, "deal_health": "healthy|at_risk|critical", "recommendations": ["..."], "risk_factors": ["..."] }`;
          break;

        case 'forecast':
          systemPrompt = 'You are a sales forecasting AI. Analyze pipeline and predict revenue. Return valid JSON.';
          prompt = `Generate forecast from pipeline:\n${JSON.stringify(data, null, 2)}\n\nReturn JSON: { "predicted_revenue": number, "confidence_score": number, "analysis": "string", "factors": { "positive": ["..."], "negative": ["..."] } }`;
          break;

        case 'account-intelligence':
          systemPrompt = 'You are a B2B account analyst. Analyze account data comprehensively. Return valid JSON.';
          prompt = `Analyze this account:\n${JSON.stringify(data, null, 2)}\n\nReturn JSON with: executiveSummary, accountHealth, paymentPatterns, recommendations, predictions, keyRisks, opportunities.`;
          break;

        case 'finance':
          systemPrompt = 'You are a financial analyst for Indian businesses. Analyze metrics. Return valid JSON.';
          prompt = `Analyze financial data:\n${JSON.stringify(data, null, 2)}\n\nReturn JSON: { "predictions": ["..."], "recommendations": ["..."], "risks": ["..."] }`;
          break;

        case 'meddic':
          systemPrompt = 'You are a B2B sales expert analyzing MEDDIC data. Return actionable bullet points.';
          prompt = `Analyze MEDDIC data:\n${JSON.stringify(data, null, 2)}\n\nProvide brief, actionable insights in bullet points.`;
          break;

        default:
          return reply.status(400).send({ error: `Unknown insight type: ${type}` });
      }

      if (type === 'meddic') {
        const result = await aiComplete({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          provider,
        });
        return { insights: result.content, provider: result.provider, model: result.model };
      }

      const result = await aiCompleteJSON({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        provider,
      });

      return { data: result };
    } catch (err: any) {
      return reply.status(503).send({ error: 'AI service unavailable', message: err.message });
    }
  });

  // List available AI providers
  app.get('/providers', async () => {
    const { ai } = await import('../config/index.js').then(m => m.config);
    return {
      defaultProvider: ai.defaultProvider,
      providers: {
        bedrock: { enabled: ai.bedrock.enabled, defaultModel: ai.bedrock.defaultModel },
        openai: { enabled: ai.openai.enabled, defaultModel: ai.openai.defaultModel },
        google: { enabled: ai.google.enabled, defaultModel: ai.google.defaultModel },
      },
    };
  });
}
