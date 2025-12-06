import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from = 'USD', to = 'INR' } = await req.json().catch(() => ({}));
    
    console.log(`Fetching exchange rate from ${from} to ${to}`);

    // Using Frankfurter API - free, no API key required
    const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Exchange rate data:', JSON.stringify(data));

    const rate = data.rates[to];
    
    // Save rate to history
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('exchange_rate_history').upsert({
        from_currency: from,
        to_currency: to,
        rate: rate,
        rate_date: data.date,
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: 'from_currency,to_currency,rate_date',
      });
      console.log('Rate saved to history');
    } catch (saveError) {
      console.error('Error saving rate to history:', saveError);
      // Don't fail the request if saving fails
    }
    
    return new Response(
      JSON.stringify({
        from,
        to,
        rate,
        date: data.date,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching exchange rates:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});