import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/api/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Integration {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  settings: Record<string, unknown> | null;
}

export function useHubSpotIntegration() {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchIntegration = useCallback(async () => {
    if (!user) {
      setIntegration(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('id, user_id, provider, status, last_sync_at, settings')
        .eq('user_id', user.id)
        .eq('provider', 'hubspot')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setIntegration({
          ...data,
          settings: data.settings as Record<string, unknown> | null,
        });
      } else {
        setIntegration(null);
      }
    } catch (error) {
      console.error('Error fetching HubSpot integration:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const connect = async () => {
    if (!user) {
      toast.error('Please sign in to connect HubSpot');
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/admin-center`;
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('hubspot-auth', {
        body: { action: 'get-auth-url', redirectUri },
      });

      if (error) throw error;

      if (data.authUrl) {
        localStorage.setItem('hubspot_redirect', redirectUri);
        window.location.href = data.authUrl;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate HubSpot connection';
      console.error('HubSpot connection error:', error);
      toast.error(errorMessage);
    }
  };

  const handleCallback = async (code: string) => {
    try {
      const redirectUri = localStorage.getItem('hubspot_redirect') || `${window.location.origin}/admin-center`;

      const { error } = await supabase.functions.invoke('hubspot-auth', {
        body: { action: 'exchange-code', code, redirectUri },
      });

      if (error) throw error;

      localStorage.removeItem('hubspot_redirect');
      toast.success('HubSpot connected successfully!');
      await fetchIntegration();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete HubSpot connection';
      console.error('HubSpot callback error:', error);
      toast.error(errorMessage);
      return false;
    }
  };

  const disconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('hubspot-auth', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      toast.success('HubSpot disconnected');
      await fetchIntegration();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect HubSpot';
      console.error('HubSpot disconnect error:', error);
      toast.error(errorMessage);
    }
  };

  const sync = async (syncType: 'contacts' | 'deals' | 'all' = 'all') => {
    if (!integration || integration.status !== 'connected') {
      toast.error('HubSpot is not connected');
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-sync', {
        body: { syncType },
      });

      if (error) throw error;

      toast.success(data.message || 'Sync completed successfully');
      await fetchIntegration();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync with HubSpot';
      console.error('HubSpot sync error:', error);
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    integration,
    isLoading,
    isSyncing,
    isConnected: integration?.status === 'connected',
    connect,
    disconnect,
    sync,
    handleCallback,
    refetch: fetchIntegration,
  };
}
