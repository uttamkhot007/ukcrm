import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentRequest {
  type: "product" | "oem" | "technology";
  id: string;
  name: string;
  description?: string;
  category?: string;
  vendor?: string;
  website?: string;
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

    const { type, id, name, description, category, vendor, website }: EnrichmentRequest = await req.json();
    console.log(`Enriching ${type}: ${name} (${id})`);

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "product") {
      systemPrompt = `You are a cybersecurity and IT product analyst. Your task is to provide detailed, accurate information about security products, solutions, and software. Always provide factual, research-based information. If you're not certain about specific details, provide general industry knowledge.`;
      
      userPrompt = `Analyze the following product/solution and provide enrichment data:

Product Name: ${name}
${description ? `Description: ${description}` : ""}
${category ? `Category: ${category}` : ""}
${vendor ? `Vendor: ${vendor}` : ""}

Please provide a JSON response with the following structure:
{
  "unique_selling_points": ["List 3-5 key unique selling points that differentiate this product"],
  "awards": ["List any known industry awards, certifications, or recognitions (if known, otherwise provide typical awards for this category)"],
  "competitive_advantages": "A paragraph describing how this product compares to competitors and what makes it stand out",
  "market_position": "A brief description of the product's market position (leader, challenger, niche player, etc.) and target audience"
}

Be specific and professional. If the exact product is unknown, provide relevant information based on the category and vendor.`;
    } else if (type === "oem") {
      systemPrompt = `You are a technology and cybersecurity industry analyst. Your task is to provide detailed, accurate information about technology companies, OEMs, and vendors. Always provide factual, research-based information.`;
      
      userPrompt = `Analyze the following OEM/Vendor and provide enrichment data:

Company Name: ${name}
${description ? `Description: ${description}` : ""}
${website ? `Website: ${website}` : ""}

Please provide a JSON response with the following structure:
{
  "founded_year": <year as number or null if unknown>,
  "headquarters": "City, Country",
  "employee_count": "Approximate range (e.g., '1,000-5,000', '10,000+', etc.)",
  "market_cap": "Market capitalization or valuation estimate if public/known",
  "key_products": ["List 3-5 key products or solution categories offered"],
  "certifications": ["List relevant industry certifications held by the company (ISO, SOC, etc.)"]
}

Be specific and professional. Provide the most accurate information available.`;
    } else if (type === "technology") {
      systemPrompt = `You are a technology and cybersecurity expert. Your task is to provide detailed, accurate information about security technologies, protocols, and technical concepts. Always provide factual, educational information.`;
      
      userPrompt = `Analyze the following technology/category and provide enrichment data:

Technology Name: ${name}
${description ? `Description: ${description}` : ""}
${category ? `Category: ${category}` : ""}
${vendor ? `Primary Vendor: ${vendor}` : ""}

Please provide a JSON response with the following structure:
{
  "use_cases": ["List 4-6 common use cases or applications"],
  "benefits": ["List 4-6 key benefits of this technology"],
  "limitations": ["List 3-4 limitations or challenges"],
  "adoption_rate": "Brief description of market adoption (emerging, growing, mature, declining)",
  "market_trends": "A paragraph describing current market trends and future outlook for this technology"
}

Be specific and professional. Provide educational and accurate information.`;
    }

    console.log("Calling Lovable AI Gateway...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    console.log("AI Response received:", content?.substring(0, 200));

    // Parse the JSON from the response
    let enrichedData: any;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse enrichment data");
    }

    // Store the enriched data in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let updateData: any = {
      ai_enriched_data: enrichedData,
      last_enriched_at: new Date().toISOString(),
    };

    let tableName = "";
    if (type === "product") {
      tableName = "offerings_products";
      updateData = {
        ...updateData,
        unique_selling_points: enrichedData.unique_selling_points || null,
        awards: enrichedData.awards || null,
        competitive_advantages: enrichedData.competitive_advantages || null,
        market_position: enrichedData.market_position || null,
      };
    } else if (type === "oem") {
      tableName = "offerings_oems";
      updateData = {
        ...updateData,
        founded_year: enrichedData.founded_year || null,
        headquarters: enrichedData.headquarters || null,
        employee_count: enrichedData.employee_count || null,
        market_cap: enrichedData.market_cap || null,
        key_products: enrichedData.key_products || null,
        certifications: enrichedData.certifications || null,
      };
    } else if (type === "technology") {
      tableName = "offerings_technologies";
      updateData = {
        ...updateData,
        use_cases: enrichedData.use_cases || null,
        benefits: enrichedData.benefits || null,
        limitations: enrichedData.limitations || null,
        adoption_rate: enrichedData.adoption_rate || null,
        market_trends: enrichedData.market_trends || null,
      };
    }

    console.log(`Updating ${tableName} with enriched data...`);
    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update database:", updateError);
      throw new Error(`Failed to save enrichment: ${updateError.message}`);
    }

    console.log("Enrichment complete and saved");
    return new Response(JSON.stringify({ success: true, data: enrichedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
