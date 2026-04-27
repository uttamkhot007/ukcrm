/**
 * Resilient client-side wrapper around `POST /api/ai/chat`.
 *
 * Responsibilities:
 *   - Exponential backoff retry on 5xx and network errors (default 2 retries).
 *   - Honour `Retry-After` on 429 responses for the next attempt.
 *   - Surface 402 (credits exhausted) and 429 (rate limited) as structured
 *     errors that the UI can render as actionable banners — never silently
 *     swallow them.
 *   - Never mutate the caller's conversation state. The hook only returns the
 *     attempted send + error info. The component decides what to render.
 *
 * Used by `SalesAIAssistant` and `EmployeeAIAssistant` (and any future AI
 * assistant) so retry/fallback behavior stays consistent across the app.
 */

import { useCallback, useState } from 'react';
import { restRequest, ApiError } from '@/integrations/api/rest-client';

export type AIChatErrorKind =
  | 'rate_limited'
  | 'credits_exhausted'
  | 'unauthorized'
  | 'server_error'
  | 'network_error'
  | 'validation_error'
  | 'unknown';

export interface AIChatError {
  kind: AIChatErrorKind;
  /** User-safe message ready to render. */
  message: string;
  /** When applicable (429), seconds the caller should wait before retrying. */
  retryAfterSeconds?: number;
  /** Whether a manual retry is likely to succeed without other action. */
  retryable: boolean;
  /** HTTP status (if any) for diagnostics. */
  status?: number;
}

export interface AIChatRequest {
  context:
    | 'sales'
    | 'support'
    | 'employee'
    | 'finance'
    | 'meddic'
    | 'account-intelligence'
    | 'tender'
    | 'general';
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  userId?: string;
  tenantId?: string;
  provider?: 'bedrock' | 'openai' | 'google';
  model?: string;
}

export interface AIChatResponse {
  response: string;
  provider?: string;
  model?: string;
  toolResults?: { success: boolean; message: string }[];
  usage?: { promptTokens?: number; completionTokens?: number };
}

interface SendOptions {
  /** Total attempts including the first try. Defaults to 3 (1 + 2 retries). */
  maxAttempts?: number;
  /** Initial backoff in ms. Defaults to 600ms; doubles each retry. */
  baseDelayMs?: number;
  /** Hard cap for any single backoff wait. */
  maxDelayMs?: number;
  /** Optional abort signal for cancellation. */
  signal?: AbortSignal;
}

function classify(err: unknown): AIChatError {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      const retryAfter =
        typeof (err.details as any)?.retryAfter === 'number'
          ? (err.details as any).retryAfter
          : 30;
      return {
        kind: 'rate_limited',
        message:
          'The AI service is rate-limited right now. We will retry automatically — or you can try again in a moment.',
        retryAfterSeconds: retryAfter,
        retryable: true,
        status: 429,
      };
    }
    if (err.status === 402) {
      return {
        kind: 'credits_exhausted',
        message:
          'AI credits are exhausted on this deployment. Ask a platform admin to top up the AI provider before retrying.',
        retryable: false,
        status: 402,
      };
    }
    if (err.status === 401 || err.status === 403) {
      return {
        kind: 'unauthorized',
        message:
          'Your session expired or you do not have access to the AI service. Sign in again to continue.',
        retryable: false,
        status: err.status,
      };
    }
    if (err.status === 400 || err.status === 422) {
      return {
        kind: 'validation_error',
        message: err.message || 'The request was rejected by the AI service.',
        retryable: false,
        status: err.status,
      };
    }
    if (err.status >= 500) {
      return {
        kind: 'server_error',
        message:
          'The AI service is temporarily unavailable. We will retry automatically — your conversation is preserved.',
        retryable: true,
        status: err.status,
      };
    }
    return {
      kind: 'unknown',
      message: err.message || 'AI request failed.',
      retryable: true,
      status: err.status,
    };
  }
  // Native fetch / abort / DNS errors fall through here.
  return {
    kind: 'network_error',
    message:
      'Could not reach the AI service. Check your connection — your conversation is safe and you can retry.',
    retryable: true,
  };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export interface UseAIChatResult {
  /** True between send() being called and the final settlement. */
  isLoading: boolean;
  /** Last error from the most recent send(); cleared on the next send(). */
  error: AIChatError | null;
  /** Number of attempts the most recent send() consumed (1-based). */
  attemptCount: number;
  /** Reset state without firing a request. */
  reset: () => void;
  /**
   * Send a chat request with automatic retry/backoff.
   * Resolves with the response on success.
   * Rejects with an `AIChatError` (NOT a generic Error) on terminal failure.
   */
  send: (req: AIChatRequest, opts?: SendOptions) => Promise<AIChatResponse>;
}

export function useAIChat(): UseAIChatResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AIChatError | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const reset = useCallback(() => {
    setError(null);
    setAttemptCount(0);
  }, []);

  const send = useCallback(
    async (req: AIChatRequest, opts: SendOptions = {}): Promise<AIChatResponse> => {
      const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
      const baseDelayMs = opts.baseDelayMs ?? 600;
      const maxDelayMs = opts.maxDelayMs ?? 8_000;

      setIsLoading(true);
      setError(null);
      setAttemptCount(0);

      let lastErr: AIChatError | null = null;

      try {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          setAttemptCount(attempt);
          try {
            const data = await restRequest<AIChatResponse>('/api/ai/chat', {
              method: 'POST',
              body: req,
              signal: opts.signal,
            });
            return data;
          } catch (err) {
            const classified = classify(err);
            lastErr = classified;

            // Terminal — no point retrying.
            if (!classified.retryable || attempt === maxAttempts) {
              throw classified;
            }

            // Backoff: prefer server-supplied Retry-After, else exponential.
            const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
            const wait = classified.retryAfterSeconds
              ? Math.min(maxDelayMs, classified.retryAfterSeconds * 1000)
              : exp;
            await delay(wait, opts.signal);
          }
        }
        // Unreachable: the loop either returns or throws.
        throw lastErr ?? { kind: 'unknown', message: 'AI request failed.', retryable: false };
      } catch (err) {
        const final = (err as AIChatError).kind ? (err as AIChatError) : classify(err);
        setError(final);
        throw final;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, error, attemptCount, reset, send };
}
