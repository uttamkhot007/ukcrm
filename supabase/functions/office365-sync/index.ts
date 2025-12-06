import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log(`Office 365 sync type: ${syncType}`);

    // Get user's integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'office365')
      .single();

    if (integrationError || !integration) {
      throw new Error('Office 365 not connected');
    }

    if (integration.status !== 'connected') {
      throw new Error('Office 365 integration is not active');
    }

    // Check if token needs refresh
    let accessToken = integration.access_token;
    if (new Date(integration.token_expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
      // Call refresh endpoint
      const refreshResponse = await supabaseClient.functions.invoke('office365-auth', {
        body: { action: 'refresh-token' },
        headers: { Authorization: authHeader },
      });

      if (refreshResponse.error) {
        throw new Error('Failed to refresh token');
      }
      accessToken = refreshResponse.data.access_token;
    }

    const results = { contacts: 0, events: 0 };

    if (syncType === 'contacts' || syncType === 'all') {
      // Fetch contacts from Microsoft Graph
      const contactsResponse = await fetch(
        'https://graph.microsoft.com/v1.0/me/contacts?$top=100',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!contactsResponse.ok) {
        const errorData = await contactsResponse.json();
        console.error('Graph API contacts error:', errorData);
        throw new Error('Failed to fetch contacts from Office 365');
      }

      const contactsData = await contactsResponse.json();
      console.log(`Fetched ${contactsData.value?.length || 0} contacts`);

      // Import contacts to our database
      for (const contact of contactsData.value || []) {
        const email = contact.emailAddresses?.[0]?.address;
        const phone = contact.mobilePhone || contact.businessPhones?.[0] || contact.homePhones?.[0];

        if (contact.displayName) {
          const { error: insertError } = await supabaseClient
            .from('contacts')
            .upsert({
              user_id: user.id,
              name: contact.displayName,
              email: email || null,
              phone: phone || null,
              company: contact.companyName || null,
              designation: contact.jobTitle || null,
              notes: `Imported from Office 365. ID: ${contact.id}`,
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

    if (syncType === 'calendar' || syncType === 'all') {
      // Fetch calendar events from Microsoft Graph
      const now = new Date().toISOString();
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const eventsResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now}&endDateTime=${futureDate}&$top=50`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!eventsResponse.ok) {
        const errorData = await eventsResponse.json();
        console.error('Graph API calendar error:', errorData);
        throw new Error('Failed to fetch calendar from Office 365');
      }

      const eventsData = await eventsResponse.json();
      console.log(`Fetched ${eventsData.value?.length || 0} calendar events`);
      results.events = eventsData.value?.length || 0;

      // Store events in integration settings for reference
      await supabaseClient
        .from('integrations')
        .update({
          settings: {
            ...integration.settings,
            lastCalendarSync: now,
            upcomingEvents: eventsData.value?.slice(0, 10).map((e: any) => ({
              id: e.id,
              subject: e.subject,
              start: e.start?.dateTime,
              end: e.end?.dateTime,
              location: e.location?.displayName,
            })),
          },
          last_sync_at: now,
        })
        .eq('id', integration.id);
    }

    // Update last sync timestamp
    await supabaseClient
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${results.contacts} contacts and ${results.events} calendar events`,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Office 365 sync error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
