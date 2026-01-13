import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MEDDICInsightRequest {
  stage: string;
  currentAnswers: Record<string, string>;
  customerContext: {
    organizationName?: string;
    industry?: string;
    existingInfra?: string;
    problemRequirement?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stage, currentAnswers, customerContext }: MEDDICInsightRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const stagePrompts: Record<string, string> = {
      metrics: `You are a B2B sales expert analyzing MEDDIC qualification data. 
Based on the customer's responses about success metrics, provide 2-3 actionable insights:
- Suggest specific KPIs they might be missing
- Recommend how to quantify ROI more effectively
- Identify gaps in their metric definitions`,
      
      economic_buyer: `You are a B2B sales expert analyzing MEDDIC qualification data.
Based on the economic buyer information, provide 2-3 actionable insights:
- Assess if the right stakeholder has been identified
- Suggest questions to validate budget authority
- Recommend strategies to gain access to decision-makers`,
      
      decision_criteria: `You are a B2B sales expert analyzing MEDDIC qualification data.
Based on the decision criteria provided, provide 2-3 actionable insights:
- Identify potential competitive advantages
- Suggest criteria that should be prioritized
- Recommend how to align solution features with requirements`,
      
      decision_process: `You are a B2B sales expert analyzing MEDDIC qualification data.
Based on the decision process information, provide 2-3 actionable insights:
- Identify potential bottlenecks in approval
- Suggest timeline acceleration strategies
- Recommend stakeholders to engage proactively`,
      
      identify_pain: `You are a B2B sales expert analyzing MEDDIC qualification data.
Based on the pain points identified, provide 2-3 actionable insights:
- Assess the urgency and impact of each pain
- Suggest how to quantify the cost of inaction
- Recommend positioning strategies based on pain severity`,
      
      champion: `You are a B2B sales expert analyzing MEDDIC qualification data.
Based on the champion information, provide 2-3 actionable insights:
- Assess champion strength and influence
- Suggest ways to empower the champion
- Recommend backup strategies if champion support weakens`,
      
      customer_environment: `You are a B2B sales expert analyzing customer environment data.
Based on the customer's existing infrastructure and environment, provide 2-3 actionable insights:
- Identify integration challenges
- Suggest migration considerations
- Recommend compatibility checks needed`,
    };

    const systemPrompt = stagePrompts[stage] || stagePrompts.metrics;
    
    const userPrompt = `
Customer: ${customerContext.organizationName || 'Unknown'}
Industry: ${customerContext.industry || 'Not specified'}
Problem/Requirement: ${customerContext.problemRequirement || 'Not specified'}
Existing Infrastructure: ${customerContext.existingInfra || 'Not specified'}

Current ${stage.replace('_', ' ')} Responses:
${Object.entries(currentAnswers).map(([key, value]) => `- ${key}: ${value || 'Not answered'}`).join('\n')}

Provide brief, actionable insights in bullet points. Keep each insight under 50 words.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || "Unable to generate insights at this time.";

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MEDDIC insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
