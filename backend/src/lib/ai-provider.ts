import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  model?: string;
  provider?: 'bedrock' | 'openai' | 'google';
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

export interface AICompletionResult {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============= AWS Bedrock =============
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({ region: config.ai.bedrock.region });
  }
  return bedrockClient;
}

async function callBedrock(options: AICompletionOptions): Promise<AICompletionResult> {
  const client = getBedrockClient();
  const model = options.model || config.ai.bedrock.defaultModel;

  // Format for Claude (Anthropic) on Bedrock
  const systemMsg = options.messages.find(m => m.role === 'system');
  const conversationMsgs = options.messages.filter(m => m.role !== 'system');

  const body: any = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    messages: conversationMsgs.map(m => ({
      role: m.role,
      content: m.content,
    })),
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const command = new InvokeModelCommand({
    modelId: model,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.content?.[0]?.text || '',
    provider: 'bedrock',
    model,
    usage: {
      promptTokens: responseBody.usage?.input_tokens || 0,
      completionTokens: responseBody.usage?.output_tokens || 0,
      totalTokens: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0),
    },
  };
}

// ============= OpenAI =============
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.ai.openai.apiKey });
  }
  return openaiClient;
}

async function callOpenAI(options: AICompletionOptions): Promise<AICompletionResult> {
  const client = getOpenAIClient();
  const model = options.model || config.ai.openai.defaultModel;

  const response = await client.chat.completions.create({
    model,
    messages: options.messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    ...(options.responseFormat === 'json' && { response_format: { type: 'json_object' } }),
  });

  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'openai',
    model,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}

// ============= Google Gemini =============
async function callGoogle(options: AICompletionOptions): Promise<AICompletionResult> {
  const model = options.model || config.ai.google.defaultModel;
  const apiKey = config.ai.google.apiKey;

  // Convert messages to Gemini format
  const systemInstruction = options.messages.find(m => m.role === 'system')?.content;
  const contents = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: any = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      ...(options.responseFormat === 'json' && { responseMimeType: 'application/json' }),
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    content,
    provider: 'google',
    model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
  };
}

// ============= Unified Interface =============
export async function aiComplete(options: AICompletionOptions): Promise<AICompletionResult> {
  const provider = options.provider || config.ai.defaultProvider;

  logger.debug({ provider, model: options.model, messageCount: options.messages.length }, 'AI completion request');

  try {
    switch (provider) {
      case 'bedrock':
        if (!config.ai.bedrock.enabled) throw new Error('Bedrock is not enabled');
        return await callBedrock(options);

      case 'openai':
        if (!config.ai.openai.enabled) throw new Error('OpenAI is not enabled');
        return await callOpenAI(options);

      case 'google':
        if (!config.ai.google.enabled) throw new Error('Google AI is not enabled');
        return await callGoogle(options);

      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  } catch (err) {
    logger.error({ err, provider }, 'AI completion failed');

    // Fallback to next available provider
    const providers: Array<'bedrock' | 'openai' | 'google'> = ['bedrock', 'openai', 'google'];
    for (const fallback of providers) {
      if (fallback === provider) continue;
      const isEnabled = config.ai[fallback].enabled;
      if (!isEnabled) continue;

      logger.info({ fallbackProvider: fallback }, 'Attempting AI fallback');
      try {
        return await aiComplete({ ...options, provider: fallback });
      } catch (fallbackErr) {
        logger.warn({ err: fallbackErr, provider: fallback }, 'Fallback provider also failed');
        continue;
      }
    }

    throw err;
  }
}

// Convenience wrapper for JSON responses
export async function aiCompleteJSON<T = any>(options: Omit<AICompletionOptions, 'responseFormat'>): Promise<T> {
  const result = await aiComplete({ ...options, responseFormat: 'json' });

  try {
    // Handle markdown-wrapped JSON
    const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.content.trim();
    return JSON.parse(jsonStr);
  } catch {
    // Try extracting JSON object/array
    const match = result.content.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse AI response as JSON');
  }
}
