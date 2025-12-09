import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  productId: string;
  productName: string;
  productDescription?: string;
  productCategory?: string;
  oemName?: string;
  teamType: 'technical' | 'solution_engineering';
  stepType: 'sow' | 'poc' | 'implementation' | 'sop';
}

const stepTypeLabels = {
  sow: 'Statement of Work (SOW) Document',
  poc: 'Proof of Concept (POC) Plan',
  implementation: 'Implementation Guide',
  sop: 'Standard Operating Procedure (SOP)',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: RequestBody = await req.json();
    const { productId, productName, productDescription, productCategory, oemName, teamType, stepType } = body;

    if (!productId || !productName) {
      throw new Error('Product ID and name are required');
    }

    console.log(`Generating ${stepType} steps for product: ${productName} (${teamType} team)`);

    const teamContext = teamType === 'technical' 
      ? 'Technical Team responsible for implementation, deployment, configuration, and ongoing support'
      : 'Solution Engineering Team responsible for pre-sales activities, POC planning, demonstrations, and solution design';

    const systemPrompt = `You are an expert cybersecurity solutions architect helping the ${teamContext} create detailed step-by-step recommendations for ${stepTypeLabels[stepType]}.

Generate practical, actionable steps that will help the team create high-quality documentation and execute projects successfully.

Return your response as a JSON array of step objects with this exact structure:
[
  {
    "step_order": 1,
    "title": "Step title",
    "description": "Brief description of what this step accomplishes",
    "details": "Detailed instructions and guidance for completing this step",
    "duration_estimate": "Estimated time (e.g., '2-3 hours', '1 day', '1 week')",
    "prerequisites": ["List of prerequisites needed before this step"],
    "deliverables": ["List of outputs or deliverables from this step"],
    "resources": ["Helpful resources, templates, or references"]
  }
]

Generate 5-8 comprehensive steps that cover the entire ${stepTypeLabels[stepType]} process.`;

    const userPrompt = `Generate recommendation steps for the following cybersecurity product:

Product Name: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}
${oemName ? `Vendor/OEM: ${oemName}` : ''}

Step Type: ${stepTypeLabels[stepType]}
Team: ${teamType === 'technical' ? 'Technical Team' : 'Solution Engineering Team'}

Please generate detailed, practical steps that are specific to this product and helpful for creating ${stepTypeLabels[stepType]}.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse JSON from response
    let steps;
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        steps = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Content:', content.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Invalid steps format from AI');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert steps into database
    const stepsToInsert = steps.map((step: any, index: number) => ({
      product_id: productId,
      team_type: teamType,
      step_type: stepType,
      step_order: step.step_order || index + 1,
      title: step.title,
      description: step.description || null,
      details: step.details || null,
      duration_estimate: step.duration_estimate || null,
      prerequisites: Array.isArray(step.prerequisites) ? step.prerequisites : [],
      deliverables: Array.isArray(step.deliverables) ? step.deliverables : [],
      resources: Array.isArray(step.resources) ? step.resources : [],
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from('product_recommendation_steps')
      .insert(stepsToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save steps: ${insertError.message}`);
    }

    console.log(`Successfully created ${stepsToInsert.length} recommendation steps`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stepsCreated: stepsToInsert.length,
        steps: stepsToInsert 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating recommendation steps:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
