import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const results = {
      products: { total: 0, enriched: 0, errors: 0 },
      oems: { total: 0, enriched: 0, errors: 0 },
      technologies: { total: 0, enriched: 0, errors: 0 },
      problem_areas: { total: 0, enriched: 0, errors: 0 },
    };

    // Helper to call AI gateway
    const callAI = async (systemPrompt: string, userPrompt: string) => {
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
        if (response.status === 429) throw new Error("Rate limit exceeded");
        if (response.status === 402) throw new Error("Credits exhausted");
        throw new Error(`AI error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No AI response");

      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      return JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
    };

    // Delay between API calls to avoid rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // --- ENRICH PRODUCTS ---
    console.log("Starting product enrichment...");
    const { data: products } = await supabase
      .from("offerings_products")
      .select("id, name, description, category, vendor, website")
      .eq("status", "active");

    if (products) {
      results.products.total = products.length;
      for (const product of products) {
        try {
          const enriched = await callAI(
            "You are a cybersecurity product analyst. Analyze products and provide market intelligence in JSON format.",
            `Analyze this cybersecurity product:
Name: ${product.name}
Description: ${product.description || "N/A"}
Category: ${product.category || "N/A"}
Vendor: ${product.vendor || "N/A"}

Return JSON: {"unique_selling_points":["..."],"awards":["..."],"competitive_advantages":"...","market_position":"..."}`
          );

          await supabase.from("offerings_products").update({
            unique_selling_points: enriched.unique_selling_points || [],
            awards: enriched.awards || [],
            competitive_advantages: enriched.competitive_advantages,
            market_position: enriched.market_position,
            last_enriched_at: new Date().toISOString(),
          }).eq("id", product.id);

          results.products.enriched++;
          console.log(`Enriched product: ${product.name}`);
          await delay(1500);
        } catch (e) {
          console.error(`Failed to enrich product ${product.name}:`, e);
          results.products.errors++;
        }
      }
    }

    // --- ENRICH OEMS ---
    console.log("Starting OEM enrichment...");
    const { data: oems } = await supabase
      .from("offerings_oems")
      .select("id, name, description, website")
      .eq("status", "active");

    if (oems) {
      results.oems.total = oems.length;
      for (const oem of oems) {
        try {
          const enriched = await callAI(
            "You are a cybersecurity company analyst. Analyze OEM vendors and provide company intelligence in JSON format.",
            `Analyze this cybersecurity OEM/Vendor:
Name: ${oem.name}
Description: ${oem.description || "N/A"}
Website: ${oem.website || "N/A"}

Return JSON: {"founded_year":2000,"headquarters":"City, Country","employee_count":"1000+","market_cap":"$1B+","key_products":["..."],"certifications":["..."]}`
          );

          await supabase.from("offerings_oems").update({
            founded_year: enriched.founded_year,
            headquarters: enriched.headquarters,
            employee_count: enriched.employee_count,
            market_cap: enriched.market_cap,
            key_products: enriched.key_products || [],
            certifications: enriched.certifications || [],
            last_enriched_at: new Date().toISOString(),
          }).eq("id", oem.id);

          results.oems.enriched++;
          console.log(`Enriched OEM: ${oem.name}`);
          await delay(1500);
        } catch (e) {
          console.error(`Failed to enrich OEM ${oem.name}:`, e);
          results.oems.errors++;
        }
      }
    }

    // --- ENRICH TECHNOLOGIES ---
    console.log("Starting technology enrichment...");
    const { data: technologies } = await supabase
      .from("offerings_technologies")
      .select("id, name, description, category")
      .eq("status", "active");

    if (technologies) {
      results.technologies.total = technologies.length;
      for (const tech of technologies) {
        try {
          const enriched = await callAI(
            "You are a cybersecurity technology analyst. Analyze technologies and provide technical intelligence in JSON format.",
            `Analyze this cybersecurity technology:
Name: ${tech.name}
Description: ${tech.description || "N/A"}
Category: ${tech.category || "N/A"}

Return JSON: {"use_cases":["..."],"benefits":["..."],"limitations":["..."],"adoption_rate":"High/Medium/Low","market_trends":"..."}`
          );

          await supabase.from("offerings_technologies").update({
            use_cases: enriched.use_cases || [],
            benefits: enriched.benefits || [],
            limitations: enriched.limitations || [],
            adoption_rate: enriched.adoption_rate,
            market_trends: enriched.market_trends,
            last_enriched_at: new Date().toISOString(),
          }).eq("id", tech.id);

          results.technologies.enriched++;
          console.log(`Enriched technology: ${tech.name}`);
          await delay(1500);
        } catch (e) {
          console.error(`Failed to enrich technology ${tech.name}:`, e);
          results.technologies.errors++;
        }
      }
    }

    // --- ENRICH PROBLEM AREAS ---
    console.log("Starting problem area enrichment...");
    const { data: problemAreas } = await supabase
      .from("offerings_problem_areas")
      .select("id, name, description, area_type")
      .eq("status", "active");

    if (problemAreas) {
      results.problem_areas.total = problemAreas.length;
      for (const area of problemAreas) {
        try {
          const enriched = await callAI(
            "You are a cybersecurity expert specializing in risk assessment and security controls. Provide detailed threat analysis in JSON format.",
            `Analyze this security problem area:
Name: ${area.name}
Description: ${area.description || "N/A"}
Type: ${area.area_type || "General"}

Return JSON: {"recommended_controls":["..."],"possible_impact":"...","attack_vectors":["..."],"risk_level":"critical|high|medium|low","mitigation_strategies":["..."],"compliance_frameworks":["NIST","ISO 27001",...]}`
          );

          await supabase.from("offerings_problem_areas").update({
            recommended_controls: enriched.recommended_controls || [],
            possible_impact: enriched.possible_impact,
            attack_vectors: enriched.attack_vectors || [],
            risk_level: enriched.risk_level,
            mitigation_strategies: enriched.mitigation_strategies || [],
            compliance_frameworks: enriched.compliance_frameworks || [],
            last_enriched_at: new Date().toISOString(),
          }).eq("id", area.id);

          results.problem_areas.enriched++;
          console.log(`Enriched problem area: ${area.name}`);
          await delay(1500);
        } catch (e) {
          console.error(`Failed to enrich problem area ${area.name}:`, e);
          results.problem_areas.errors++;
        }
      }
    }

    console.log("Batch enrichment complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Batch enrichment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
