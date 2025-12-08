import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecutiveRole {
  name: string;
  designation: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
}

const TARGET_ROLES = [
  "CISO", "Chief Information Security Officer",
  "CIO", "Chief Information Officer", 
  "CRO", "Chief Revenue Officer", "Chief Risk Officer",
  "CTO", "Chief Technology Officer",
  "CEO", "Chief Executive Officer", "Managing Director", "MD",
  "CFO", "Chief Financial Officer",
  "COO", "Chief Operating Officer",
  "IT Manager", "IT Director", "IT Head",
  "Cyber Security Manager", "Cybersecurity Manager", "Security Manager",
  "Infosec Manager", "InfoSec Manager",
  "Information Security Manager", "Information Security Head",
  "VP IT", "VP Information Technology",
  "VP Security", "VP Cybersecurity",
  "Security Director", "Director of Security",
  "Head of IT", "Head of Security", "Head of Cybersecurity",
  "Data Protection Officer", "DPO",
  "Compliance Manager", "Compliance Head",
  "Risk Manager", "Risk Head",
  "SOC Manager", "Security Operations Manager"
];

async function searchExecutives(companyName: string, domain: string, linkedinUrl?: string): Promise<ExecutiveRole[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return [];
  }

  const searchPrompt = `Research the company "${companyName}" (website: ${domain}${linkedinUrl ? `, LinkedIn: ${linkedinUrl}` : ''}).

Find the KEY EXECUTIVE TEAM MEMBERS with focus on these specific roles:
${TARGET_ROLES.slice(0, 20).join(", ")}

Search these sources:
1. LinkedIn company page - look at "People" section, filter by title
2. Company website "About Us", "Team", "Leadership", "Management" pages
3. ZoomInfo, Apollo, Crunchbase profiles
4. News articles mentioning executives
5. Conference speaker bios
6. Industry publications

For each executive found, provide:
- Full name (exactly as shown professionally)
- Exact job title/designation
- LinkedIn profile URL (if available)
- Professional email (if publicly available)

IMPORTANT: Focus on finding:
1. CISO / Chief Information Security Officer
2. CIO / Chief Information Officer  
3. IT Manager / IT Director / IT Head
4. Cyber Security Manager / Security Manager
5. CTO / Chief Technology Officer
6. CEO / Managing Director
7. Other security/IT leadership roles

Return ONLY a valid JSON array:
[
  {"name": "John Smith", "designation": "CISO", "linkedin_url": "https://linkedin.com/in/johnsmith", "email": "john@company.com"},
  {"name": "Jane Doe", "designation": "IT Director", "linkedin_url": "https://linkedin.com/in/janedoe"}
]

If no executives are found, return an empty array: []
Return ONLY valid JSON, no markdown or explanation.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert executive recruiter and company research specialist. Find key executives and leadership team members. Return only valid JSON arrays." },
          { role: "user", content: searchPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI search failed:", response.status);
      return [];
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    // Clean and parse the response
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      const executives = JSON.parse(cleanedContent);
      if (Array.isArray(executives)) {
        return executives.filter((exec: any) => 
          exec.name && exec.designation
        ).map((exec: any) => ({
          name: exec.name,
          designation: exec.designation,
          linkedin_url: exec.linkedin_url || undefined,
          email: exec.email || undefined,
          phone: exec.phone || undefined
        }));
      }
    } catch (parseError) {
      console.error("Failed to parse executives response:", parseError);
    }
    
    return [];
  } catch (error) {
    console.error("Executive search error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { organization_id, company_name, domain, linkedin_url, refresh_all } = body;

    // If refresh_all is true, this is a scheduled refresh for all organizations
    if (refresh_all) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get organizations that haven't been enriched in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: organizations, error: fetchError } = await supabase
        .from("alliance_organizations")
        .select("id, name, website")
        .or(`team_config.is.null,team_config->last_enriched.is.null,team_config->last_enriched.lt.${sevenDaysAgo}`)
        .not("website", "is", null)
        .limit(10); // Process 10 at a time to avoid timeouts

      if (fetchError) {
        console.error("Error fetching organizations:", fetchError);
        return new Response(JSON.stringify({ error: fetchError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const results = [];
      for (const org of organizations || []) {
        try {
          const domain = extractDomain(org.website);
          const executives = await searchExecutives(org.name, domain);
          
          if (executives.length > 0) {
            // Get existing team_config
            const existingConfig = (await supabase
              .from("alliance_organizations")
              .select("team_config")
              .eq("id", org.id)
              .single()).data?.team_config || {};

            // Merge with existing key_team_members, avoiding duplicates
            const existingMembers = (existingConfig as any)?.key_team_members || [];
            const mergedMembers = mergeExecutives(existingMembers, executives);

            await supabase
              .from("alliance_organizations")
              .update({
                team_config: {
                  ...existingConfig,
                  key_team_members: mergedMembers,
                  last_enriched: new Date().toISOString()
                }
              })
              .eq("id", org.id);

            results.push({ org_id: org.id, name: org.name, executives_found: executives.length });
          }
        } catch (orgError) {
          console.error(`Error enriching org ${org.id}:`, orgError);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        organizations_processed: results.length,
        results 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Single organization enrichment
    if (!company_name && !domain) {
      return new Response(JSON.stringify({ error: "company_name or domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const searchDomain = domain || extractDomain(company_name);
    const executives = await searchExecutives(company_name || searchDomain, searchDomain, linkedin_url);

    // If organization_id is provided, update the organization
    if (organization_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: org } = await supabase
        .from("alliance_organizations")
        .select("team_config")
        .eq("id", organization_id)
        .single();

      const existingConfig = org?.team_config || {};
      const existingMembers = (existingConfig as any)?.key_team_members || [];
      const mergedMembers = mergeExecutives(existingMembers, executives);

      await supabase
        .from("alliance_organizations")
        .update({
          team_config: {
            ...existingConfig,
            key_team_members: mergedMembers,
            last_enriched: new Date().toISOString()
          }
        })
        .eq("id", organization_id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      executives,
      count: executives.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Enrich executives error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}

function mergeExecutives(existing: ExecutiveRole[], newExecs: ExecutiveRole[]): ExecutiveRole[] {
  const merged = [...existing];
  
  for (const newExec of newExecs) {
    const existingIndex = merged.findIndex(e => 
      e.name.toLowerCase() === newExec.name.toLowerCase() ||
      (e.linkedin_url && newExec.linkedin_url && e.linkedin_url === newExec.linkedin_url)
    );
    
    if (existingIndex >= 0) {
      // Update existing with new data
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...newExec,
        linkedin_url: newExec.linkedin_url || merged[existingIndex].linkedin_url
      };
    } else {
      merged.push(newExec);
    }
  }
  
  return merged;
}
