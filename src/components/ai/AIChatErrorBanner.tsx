/**
 * Inline banner shown by AI assistants when `useAIChat` reports an error.
 *
 * Strategy:
 *   - Translate the structured `AIChatError` into a colored, actionable card.
 *   - Always offer "Retry" (re-issues the last user message).
 *   - For 402 / 429 / unauthorized, surface a deeper recovery action (open
 *     System Status, sign in, ping admin).
 *   - The conversation stays mounted above this banner — the user never loses
 *     context.
 */

import { AlertTriangle, RefreshCw, KeyRound, CreditCard, Wifi, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import type { AIChatError } from '@/hooks/useAIChat';

const ICONS: Record<AIChatError['kind'], typeof AlertTriangle> = {
  rate_limited: RefreshCw,
  credits_exhausted: CreditCard,
  unauthorized: ShieldOff,
  server_error: AlertTriangle,
  network_error: Wifi,
  validation_error: AlertTriangle,
  unknown: AlertTriangle,
};

const TITLES: Record<AIChatError['kind'], string> = {
  rate_limited: 'AI service is rate-limited',
  credits_exhausted: 'AI credits exhausted',
  unauthorized: 'Sign-in required',
  server_error: 'AI service unavailable',
  network_error: 'Cannot reach the server',
  validation_error: 'Request rejected',
  unknown: 'Something went wrong',
};

interface AIChatErrorBannerProps {
  error: AIChatError;
  /** Re-send the last user message. */
  onRetry: () => void;
  /** Whether a retry is currently in flight (disables the retry button). */
  isRetrying?: boolean;
  /** Optional: how many attempts the failed request consumed. */
  attemptCount?: number;
}

export function AIChatErrorBanner({
  error,
  onRetry,
  isRetrying,
  attemptCount,
}: AIChatErrorBannerProps) {
  const Icon = ICONS[error.kind];
  const navigate = useNavigate();

  return (
    <Alert
      variant={error.kind === 'credits_exhausted' || error.kind === 'unauthorized' ? 'destructive' : 'default'}
      className="border-orange-500/30 bg-orange-500/5"
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {TITLES[error.kind]}
        {attemptCount && attemptCount > 1 ? (
          <span className="text-xs font-normal text-muted-foreground">
            (failed after {attemptCount} attempts)
          </span>
        ) : null}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">{error.message}</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {error.retryable && (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying…' : 'Retry now'}
            </Button>
          )}

          {error.kind === 'unauthorized' && (
            <Button size="sm" variant="outline" onClick={() => navigate('/auth')}>
              <KeyRound className="w-3.5 h-3.5 mr-2" />
              Sign in
            </Button>
          )}

          {(error.kind === 'credits_exhausted' ||
            error.kind === 'server_error' ||
            error.kind === 'rate_limited') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/admin/platform/status')}
            >
              View system status
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground pt-1">
          Your conversation is preserved — nothing was lost.
        </p>
      </AlertDescription>
    </Alert>
  );
}
