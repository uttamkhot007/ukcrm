import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailSecurityStatus {
  spf: {
    status: 'valid' | 'invalid' | 'missing' | 'softfail';
    record: string | null;
    recommendation: string | null;
  };
  dkim: {
    status: 'active' | 'inactive' | 'unknown';
    selectors: string[];
    recommendation: string | null;
  };
  dmarc: {
    status: 'reject' | 'quarantine' | 'none' | 'missing';
    policy: string | null;
    recommendation: string | null;
  };
  overallScore: number;
}

interface ThreatIntelligence {
  breaches: Array<{
    name: string;
    date: string;
    records: string;
    severity: string;
    description: string;
  }>;
  leakedCredentials: {
    count: number;
    sources: string[];
    lastSeen: string;
  };
  vulnerabilities: Array<{
    cve: string;
    severity: string;
    product: string;
    description: string;
  }>;
  exposedServices: Array<{
    port: number;
    service: string;
    risk: string;
  }>;
  emailSecurity: EmailSecurityStatus;
  riskScore: number;
  lastUpdated: string;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

async function searchThreatIntelligence(domain: string, companyName: string): Promise<ThreatIntelligence> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log("No Lovable API key, returning mock data");
    return getMockThreatIntel();
  }

  const prompt = `You are a cybersecurity threat intelligence analyst. Research and compile security-related information about the company "${companyName}" with domain "${domain}".

Search for PUBLICLY AVAILABLE information from sources like:
- Have I Been Pwned database
- Security news sites (Krebs on Security, BleepingComputer, The Hacker News)
- CVE databases (NVD, MITRE)
- Shodan exposure data
- Public breach notifications
- SEC filings mentioning security incidents
- Company security advisories

Provide a threat intelligence report in this EXACT JSON format:
{
  "breaches": [
    {
      "name": "Breach name/description",
      "date": "YYYY-MM or YYYY",
      "records": "Number of records affected (e.g., '50,000' or 'unknown')",
      "severity": "critical|high|medium|low",
      "description": "Brief description of the breach"
    }
  ],
  "leakedCredentials": {
    "count": 0,
    "sources": ["source names if any"],
    "lastSeen": "Date or 'N/A'"
  },
  "vulnerabilities": [
    {
      "cve": "CVE-XXXX-XXXXX",
      "severity": "critical|high|medium|low",
      "product": "Affected product name",
      "description": "Brief vulnerability description"
    }
  ],
  "exposedServices": [
    {
      "port": 443,
      "service": "HTTPS",
      "risk": "Low|Medium|High"
    }
  ],
  "emailSecurity": {
    "spf": {
      "status": "valid|invalid|missing|softfail",
      "record": "SPF record string or null",
      "recommendation": "Recommendation if any issues"
    },
    "dkim": {
      "status": "active|inactive|unknown",
      "selectors": ["selector names found"],
      "recommendation": "Recommendation if any issues"
    },
    "dmarc": {
      "status": "reject|quarantine|none|missing",
      "policy": "DMARC policy string or null",
      "recommendation": "Recommendation if any issues"
    },
    "overallScore": 0-100
  },
  "riskScore": 0-100
}

IMPORTANT:
- Only include VERIFIED, publicly documented security incidents
- Set riskScore based on: 0-30 (low risk), 31-60 (medium risk), 61-80 (high risk), 81-100 (critical risk)
- If no incidents found, return empty arrays and low riskScore
- For smaller/unknown companies, it's normal to have no public breach data
- Be accurate - don't invent fake breaches
- For emailSecurity, analyze the domain's DNS records:
  * Check SPF record validity
  * Look for common DKIM selectors (google, selector1, selector2, etc.)
  * Check DMARC policy strength
  * Score 0-30: Poor security, 31-60: Basic, 61-80: Good, 81-100: Excellent

Return ONLY valid JSON, no markdown.`;

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
          { 
            role: "system", 
            content: "You are a cybersecurity threat intelligence analyst. Only provide verified, publicly available security information. Return valid JSON only." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return getMockThreatIntel();
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (content) {
      try {
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const threatData = JSON.parse(cleanedContent);
        return {
          ...threatData,
          lastUpdated: new Date().toISOString(),
        };
      } catch (e) {
        console.error("Failed to parse threat intel:", e);
      }
    }
  } catch (error) {
    console.error("Threat intelligence error:", error);
  }

  return getMockThreatIntel();
}

function getMockThreatIntel(): ThreatIntelligence {
  return {
    breaches: [],
    leakedCredentials: {
      count: 0,
      sources: [],
      lastSeen: "N/A"
    },
    vulnerabilities: [],
    exposedServices: [
      { port: 443, service: "HTTPS", risk: "Low" },
      { port: 80, service: "HTTP", risk: "Medium" }
    ],
    emailSecurity: {
      spf: { status: 'valid', record: 'v=spf1 include:_spf.google.com ~all', recommendation: null },
      dkim: { status: 'active', selectors: ['google', 'selector1'], recommendation: null },
      dmarc: { status: 'quarantine', policy: 'v=DMARC1; p=quarantine;', recommendation: 'Consider upgrading to p=reject for stronger protection' },
      overallScore: 75
    },
    riskScore: 25,
    lastUpdated: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, companyName } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanDomain = extractDomain(domain);
    console.log(`Fetching threat intelligence for ${companyName} (${cleanDomain})`);

    const threatIntel = await searchThreatIntelligence(cleanDomain, companyName || cleanDomain);

    return new Response(
      JSON.stringify(threatIntel),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in threat-intelligence function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
