import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, code, redirectUri } = await req.json();
    console.log(`Office 365 auth action: ${action}`);

    if (action === 'get-auth-url') {
      if (!MICROSOFT_CLIENT_ID) {
        throw new Error('Microsoft Client ID not configured. Please add MICROSOFT_CLIENT_ID secret.');
      }

      const scope = encodeURIComponent('openid profile email offline_access Contacts.Read Calendars.Read');
      const authUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_mode=query`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange-code') {
      if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
        throw new Error('Microsoft credentials not configured');
      }

      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: MICROSOFT_CLIENT_ID,
            client_secret: MICROSOFT_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        }
      );

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('Token exchange error:', tokens);
        throw new Error(tokens.error_description || 'Failed to exchange code');
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      const { error: upsertError } = await supabaseClient
        .from('integrations')
        .upsert({
          user_id: user.id,
          provider: 'office365',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          status: 'connected',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });

      if (upsertError) {
        console.error('Database error:', upsertError);
        throw new Error('Failed to save integration');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'refresh-token') {
      const { data: integration } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'office365')
        .single();

      if (!integration?.refresh_token) {
        throw new Error('No refresh token available');
      }

      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: MICROSOFT_CLIENT_ID!,
            client_secret: MICROSOFT_CLIENT_SECRET!,
            refresh_token: integration.refresh_token,
            grant_type: 'refresh_token',
          }),
        }
      );

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        throw new Error(tokens.error_description || 'Failed to refresh token');
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabaseClient
        .from('integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('provider', 'office365');

      return new Response(JSON.stringify({ success: true, access_token: tokens.access_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      await supabaseClient
        .from('integrations')
        .update({ status: 'disconnected', access_token: null, refresh_token: null })
        .eq('user_id', user.id)
        .eq('provider', 'office365');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Office 365 auth error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
