import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentRequest {
  id: string;
  name: string;
  description?: string;
  area_type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { id, name, description, area_type } = await req.json() as EnrichmentRequest;

    console.log(`Enriching problem area: ${name} (${id})`);

    const systemPrompt = `You are a cybersecurity expert specializing in risk assessment, security controls, and threat analysis. 
You provide detailed, actionable intelligence about security problem areas and requirements.
Your responses must be in valid JSON format.`;

    const userPrompt = `Analyze this cybersecurity problem/requirement area and provide enrichment data:

Problem Area: ${name}
Description: ${description || "Not provided"}
Area Type: ${area_type || "General"}

Provide a detailed analysis in the following JSON format:
{
  "recommended_controls": ["list of 4-6 specific security controls to address this problem"],
  "possible_impact": "detailed description of potential business and security impact if this problem is not addressed (2-3 sentences)",
  "attack_vectors": ["list of 4-6 specific attack vectors or threat scenarios related to this problem"],
  "risk_level": "critical|high|medium|low - based on typical severity",
  "mitigation_strategies": ["list of 3-5 mitigation strategies beyond just controls"],
  "compliance_frameworks": ["list of relevant compliance frameworks like NIST, ISO 27001, SOC 2, PCI-DSS, GDPR, etc."]
}

Be specific and technical. Focus on real-world cybersecurity scenarios.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response content:", content);

    // Parse the JSON from the response
    let enrichedData;
    try {
      // Try multiple parsing strategies
      let jsonStr = content.trim();
      
      // Strategy 1: Extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1].trim().startsWith('{')) {
        jsonStr = jsonMatch[1].trim();
      } else {
        // Strategy 2: Find the first { and last } to extract JSON object
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = content.substring(firstBrace, lastBrace + 1);
        }
      }
      
      // Validate we have something that looks like JSON
      if (!jsonStr.startsWith('{')) {
        console.error("AI response does not contain valid JSON object:", content.substring(0, 200));
        throw new Error("AI response does not contain a JSON object");
      }
      
      enrichedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw content (first 500 chars):", content.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate and sanitize the data
    const sanitizedData = {
      recommended_controls: Array.isArray(enrichedData.recommended_controls) 
        ? enrichedData.recommended_controls.slice(0, 10) 
        : [],
      possible_impact: typeof enrichedData.possible_impact === "string" 
        ? enrichedData.possible_impact 
        : null,
      attack_vectors: Array.isArray(enrichedData.attack_vectors) 
        ? enrichedData.attack_vectors.slice(0, 10) 
        : [],
      risk_level: ["critical", "high", "medium", "low"].includes(enrichedData.risk_level) 
        ? enrichedData.risk_level 
        : "medium",
      mitigation_strategies: Array.isArray(enrichedData.mitigation_strategies) 
        ? enrichedData.mitigation_strategies.slice(0, 10) 
        : [],
      compliance_frameworks: Array.isArray(enrichedData.compliance_frameworks) 
        ? enrichedData.compliance_frameworks.slice(0, 10) 
        : [],
    };

    // Update the database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabase
      .from("offerings_problem_areas")
      .update({
        recommended_controls: sanitizedData.recommended_controls,
        possible_impact: sanitizedData.possible_impact,
        attack_vectors: sanitizedData.attack_vectors,
        risk_level: sanitizedData.risk_level,
        mitigation_strategies: sanitizedData.mitigation_strategies,
        compliance_frameworks: sanitizedData.compliance_frameworks,
        last_enriched_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to save enrichment: ${updateError.message}`);
    }

    console.log(`Successfully enriched problem area: ${name}`);

    return new Response(
      JSON.stringify({ success: true, data: sanitizedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error enriching problem area:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
