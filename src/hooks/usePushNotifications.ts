import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * Push notifications are temporarily disabled.
 *
 * The previous implementation registered `/sw.js` for push handling, but that
 * service worker was caching the app shell and causing super-admins to see
 * stale "old format" UI even after fresh deploys. Until a properly scoped,
 * versioned push-only worker is reintroduced, this hook is a no-op so the
 * app can guarantee no service worker is ever registered.
 */
interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
}

export function usePushNotifications() {
  // Acquire user via the auth hook so callers' deps don't break, but we
  // intentionally never use it for SW registration anymore.
  useAuth();

  const [state] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    permission: typeof Notification !== 'undefined' ? Notification.permission : null,
  });

  // No-op subscribe / unsubscribe — surface a friendly toast if anything
  // still calls them so we don't silently break UI flows.
  const subscribe = useCallback(async (_vapidPublicKey: string) => {
    toast.info('Push notifications are temporarily disabled');
    return false;
  }, []);

  const unsubscribe = useCallback(async () => {
    toast.info('Push notifications are temporarily disabled');
    return false;
  }, []);

  const checkSubscription = useCallback(async () => {
    /* no-op */
  }, []);

  // Defensive: if any prior session left a service worker registered, kill it
  // on mount so we don't keep serving stale assets.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
        .catch(() => {});
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
