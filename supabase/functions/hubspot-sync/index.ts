import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
const HUBSPOT_CLIENT_SECRET = Deno.env.get('HUBSPOT_CLIENT_SECRET');

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

    const { syncType } = await req.json();
    console.log(`HubSpot sync type: ${syncType}`);

    // Get user's integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'hubspot')
      .single();

    if (integrationError || !integration) {
      throw new Error('HubSpot not connected');
    }

    if (integration.status !== 'connected') {
      throw new Error('HubSpot integration is not active');
    }

    // Check if token needs refresh
    let accessToken = integration.access_token;
    if (new Date(integration.token_expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
      
      const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: HUBSPOT_CLIENT_ID!,
          client_secret: HUBSPOT_CLIENT_SECRET!,
          refresh_token: integration.refresh_token,
        }),
      });

      const tokens = await tokenResponse.json();
      if (tokens.error) {
        throw new Error('Failed to refresh token');
      }

      accessToken = tokens.access_token;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabaseClient
        .from('integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          token_expires_at: expiresAt,
        })
        .eq('id', integration.id);
    }

    const results = { contacts: 0, deals: 0 };

    if (syncType === 'contacts' || syncType === 'all') {
      // Fetch contacts from HubSpot
      const contactsResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!contactsResponse.ok) {
        const errorData = await contactsResponse.json();
        console.error('HubSpot contacts error:', errorData);
        throw new Error('Failed to fetch contacts from HubSpot');
      }

      const contactsData = await contactsResponse.json();
      console.log(`Fetched ${contactsData.results?.length || 0} contacts from HubSpot`);

      // Import contacts to our database
      for (const contact of contactsData.results || []) {
        const props = contact.properties;
        const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || props.email;

        if (name) {
          const { error: insertError } = await supabaseClient
            .from('contacts')
            .upsert({
              user_id: user.id,
              name: name,
              email: props.email || null,
              phone: props.phone || null,
              company: props.company || null,
              notes: `Imported from HubSpot. ID: ${contact.id}`,
            }, { 
              onConflict: 'user_id,email',
              ignoreDuplicates: true 
            });

          if (!insertError) {
            results.contacts++;
          }
        }
      }
    }

    if (syncType === 'deals' || syncType === 'all') {
      // Fetch deals from HubSpot
      const dealsResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,pipeline',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!dealsResponse.ok) {
        const errorData = await dealsResponse.json();
        console.error('HubSpot deals error:', errorData);
        throw new Error('Failed to fetch deals from HubSpot');
      }

      const dealsData = await dealsResponse.json();
      console.log(`Fetched ${dealsData.results?.length || 0} deals from HubSpot`);

      // Map HubSpot deal stages to our stages
      const stageMapping: Record<string, string> = {
        'appointmentscheduled': 'pipeline',
        'qualifiedtobuy': 'upside',
        'presentationscheduled': 'strong_upside',
        'decisionmakerboughtin': 'commit',
        'contractsent': 'commit',
        'closedwon': 'closed_won',
        'closedlost': 'closed_lost',
      };

      // Import deals to our database
      for (const deal of dealsData.results || []) {
        const props = deal.properties;
        const mappedStage = stageMapping[props.dealstage?.toLowerCase()] || 'pipeline';

        if (props.dealname) {
          const { error: insertError } = await supabaseClient
            .from('deals')
            .upsert({
              user_id: user.id,
              title: props.dealname,
              value: parseFloat(props.amount) || 0,
              stage: mappedStage,
              expected_close_date: props.closedate || null,
              description: `Imported from HubSpot. ID: ${deal.id}`,
            }, { 
              onConflict: 'user_id,title',
              ignoreDuplicates: true 
            });

          if (!insertError) {
            results.deals++;
          }
        }
      }
    }

    // Update last sync timestamp
    await supabaseClient
      .from('integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        settings: {
          ...integration.settings,
          lastSyncResults: results,
        }
      })
      .eq('id', integration.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${results.contacts} contacts and ${results.deals} deals`,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('HubSpot sync error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
