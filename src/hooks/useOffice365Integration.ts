import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export function useOffice365Integration() {
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
        .eq('provider', 'office365')
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
      console.error('Error fetching integration:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const connect = async () => {
    if (!user) {
      toast.error('Please sign in to connect Office 365');
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

      const { data, error } = await supabase.functions.invoke('office365-auth', {
        body: { action: 'get-auth-url', redirectUri },
      });

      if (error) throw error;

      if (data.authUrl) {
        // Store state for callback
        localStorage.setItem('office365_redirect', redirectUri);
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to initiate Office 365 connection');
    }
  };

  const handleCallback = async (code: string) => {
    try {
      const redirectUri = localStorage.getItem('office365_redirect') || `${window.location.origin}/admin-center`;

      const { error } = await supabase.functions.invoke('office365-auth', {
        body: { action: 'exchange-code', code, redirectUri },
      });

      if (error) throw error;

      localStorage.removeItem('office365_redirect');
      toast.success('Office 365 connected successfully!');
      await fetchIntegration();
      return true;
    } catch (error: any) {
      console.error('Callback error:', error);
      toast.error(error.message || 'Failed to complete Office 365 connection');
      return false;
    }
  };

  const disconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('office365-auth', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      toast.success('Office 365 disconnected');
      await fetchIntegration();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect Office 365');
    }
  };

  const sync = async (syncType: 'contacts' | 'calendar' | 'all' = 'all') => {
    if (!integration || integration.status !== 'connected') {
      toast.error('Office 365 is not connected');
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('office365-sync', {
        body: { syncType },
      });

      if (error) throw error;

      toast.success(data.message || 'Sync completed successfully');
      await fetchIntegration();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync with Office 365');
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
