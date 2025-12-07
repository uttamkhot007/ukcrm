import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyInfo {
  name?: string;
  description?: string;
  industry?: string;
  company_type?: string;
  founded_year?: number;
  annual_revenue?: string;
  total_employees?: number;
  logo_url?: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  hq_city?: string;
  hq_state?: string;
  hq_country?: string;
  postal_code?: string;
  stock_symbol?: string;
  stock_exchange?: string;
  parent_company?: string;
  subsidiaries?: string[];
  technologies_used?: string[];
  spf_status?: string;
  dmarc_status?: string;
  dkim_status?: string;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

async function fetchWebsiteMetadata(url: string): Promise<Partial<CompanyInfo>> {
  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(url);
  
  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanyInfoBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${normalizedUrl}: ${response.status}`);
      return { website_url: normalizedUrl };
    }
    
    const html = await response.text();
    const info: Partial<CompanyInfo> = { website_url: normalizedUrl };
    
    // Extract from JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
          const jsonData = JSON.parse(jsonContent);
          const org = Array.isArray(jsonData) 
            ? jsonData.find((item: any) => item['@type'] === 'Organization' || item['@type'] === 'Corporation')
            : (jsonData['@type'] === 'Organization' || jsonData['@type'] === 'Corporation' ? jsonData : null);
          
          if (org) {
            info.name = org.name || info.name;
            info.description = org.description || info.description;
            info.logo_url = org.logo || (typeof org.logo === 'object' ? org.logo.url : undefined) || info.logo_url;
            info.phone = org.telephone || info.phone;
            info.email = org.email || info.email;
            
            if (org.address) {
              const addr = typeof org.address === 'string' ? org.address : 
                `${org.address.streetAddress || ''}, ${org.address.addressLocality || ''}, ${org.address.addressRegion || ''} ${org.address.postalCode || ''}, ${org.address.addressCountry || ''}`.replace(/^,\s*|,\s*$/g, '').trim();
              info.address = addr || info.address;
              if (typeof org.address === 'object') {
                info.hq_city = org.address.addressLocality;
                info.hq_state = org.address.addressRegion;
                info.hq_country = org.address.addressCountry;
                info.postal_code = org.address.postalCode;
              }
            }
            
            if (org.sameAs) {
              const socialLinks = Array.isArray(org.sameAs) ? org.sameAs : [org.sameAs];
              for (const link of socialLinks) {
                if (link.includes('linkedin.com')) info.linkedin_url = link;
                if (link.includes('twitter.com') || link.includes('x.com')) info.twitter_url = link;
                if (link.includes('facebook.com')) info.facebook_url = link;
              }
            }
            
            if (org.foundingDate) {
              info.founded_year = parseInt(org.foundingDate.substring(0, 4));
            }
            
            if (org.numberOfEmployees) {
              const empValue = typeof org.numberOfEmployees === 'object' 
                ? org.numberOfEmployees.value 
                : org.numberOfEmployees;
              info.total_employees = parseInt(empValue) || undefined;
            }
          }
        } catch (e) {
          console.log('JSON-LD parsing error:', e);
        }
      }
    }
    
    // Extract from meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && !info.name) {
      info.name = titleMatch[1].split(/[|\-–—]/)[0].trim();
    }
    
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (ogTitle && !info.name) info.name = ogTitle[1];
    
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                      html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (descMatch && !info.description) info.description = descMatch[1];
    
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImage && !info.logo_url) info.logo_url = ogImage[1];
    
    // Extract social links from HTML
    if (!info.linkedin_url) {
      const linkedinMatch = html.match(/href="(https?:\/\/(?:www\.)?linkedin\.com\/company\/[^"]+)"/i);
      if (linkedinMatch) info.linkedin_url = linkedinMatch[1];
    }
    if (!info.twitter_url) {
      const twitterMatch = html.match(/href="(https?:\/\/(?:www\.)?(twitter|x)\.com\/[^"]+)"/i);
      if (twitterMatch) info.twitter_url = twitterMatch[1];
    }
    if (!info.facebook_url) {
      const facebookMatch = html.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i);
      if (facebookMatch) info.facebook_url = facebookMatch[1];
    }
    
    // Extract phone and email from HTML
    if (!info.phone) {
      const phoneMatch = html.match(/(?:tel:|phone:?)[\s]*([+\d\s\-()]{10,20})/i) ||
                         html.match(/(?:phone|tel|call).*?([+\d][\d\s\-()]{9,19})/i);
      if (phoneMatch) info.phone = phoneMatch[1].trim();
    }
    
    if (!info.email) {
      const emailMatch = html.match(/mailto:([^"'\s]+@[^"'\s]+\.[^"'\s]+)/i) ||
                         html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) info.email = emailMatch[1] || emailMatch[0];
    }
    
    return info;
  } catch (error) {
    console.error(`Error fetching website metadata:`, error);
    return { website_url: normalizedUrl };
  }
}

async function checkEmailSecurity(domain: string): Promise<{ spf: string; dmarc: string; dkim: string }> {
  const result = { spf: 'unknown', dmarc: 'unknown', dkim: 'unknown' };
  
  try {
    // Check SPF record
    const spfResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=TXT`);
    if (spfResponse.ok) {
      const spfData = await spfResponse.json();
      if (spfData.Answer) {
        const hasSPF = spfData.Answer.some((record: any) => 
          record.data?.toLowerCase().includes('v=spf1')
        );
        result.spf = hasSPF ? 'pass' : 'fail';
      } else {
        result.spf = 'fail';
      }
    }
    
    // Check DMARC record
    const dmarcResponse = await fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`);
    if (dmarcResponse.ok) {
      const dmarcData = await dmarcResponse.json();
      if (dmarcData.Answer) {
        const hasDMARC = dmarcData.Answer.some((record: any) => 
          record.data?.toLowerCase().includes('v=dmarc1')
        );
        result.dmarc = hasDMARC ? 'pass' : 'fail';
      } else {
        result.dmarc = 'fail';
      }
    }
    
    // DKIM is harder to check without knowing the selector, mark as unknown
    result.dkim = 'unknown';
    
  } catch (error) {
    console.error('Error checking email security:', error);
  }
  
  return result;
}

async function enrichWithAI(websiteData: Partial<CompanyInfo>, domain: string): Promise<CompanyInfo> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log("No Lovable API key, returning website data only");
    return websiteData as CompanyInfo;
  }
  
  const prompt = `You are a company research assistant. Based on the following information about a company with domain "${domain}", provide additional publicly available details in JSON format.

Current known information:
${JSON.stringify(websiteData, null, 2)}

Please provide the following fields if you can find them (leave null if unknown):
- name: Company name
- description: Brief company description (1-2 sentences)
- industry: Primary industry (e.g., "Technology", "Healthcare", "Finance", "Manufacturing")
- company_type: Type of company (Public, Private, Non-Profit, Government)
- founded_year: Year the company was founded (number)
- annual_revenue: Estimated annual revenue (e.g., "$1B", "$50M-$100M")
- total_employees: Estimated number of employees (number)
- stock_symbol: Stock ticker symbol if publicly traded
- stock_exchange: Stock exchange if publicly traded (NYSE, NASDAQ, etc.)
- parent_company: Name of parent company if applicable
- subsidiaries: Array of known subsidiary company names
- technologies_used: Array of technologies the company likely uses

Respond ONLY with valid JSON, no markdown or explanation.`;

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
          { role: "system", content: "You are a company research assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI enrichment failed:", response.status);
      return websiteData as CompanyInfo;
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (content) {
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const aiData = JSON.parse(cleanedContent);
        
        // Merge AI data with website data, preferring website data for existing fields
        return {
          ...aiData,
          ...websiteData,
          // Only use AI values for fields not present in website data
          industry: websiteData.industry || aiData.industry,
          company_type: websiteData.company_type || aiData.company_type,
          founded_year: websiteData.founded_year || aiData.founded_year,
          annual_revenue: websiteData.annual_revenue || aiData.annual_revenue,
          total_employees: websiteData.total_employees || aiData.total_employees,
          stock_symbol: websiteData.stock_symbol || aiData.stock_symbol,
          stock_exchange: websiteData.stock_exchange || aiData.stock_exchange,
          parent_company: websiteData.parent_company || aiData.parent_company,
          subsidiaries: websiteData.subsidiaries || aiData.subsidiaries,
          technologies_used: websiteData.technologies_used || aiData.technologies_used,
        };
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }
  } catch (error) {
    console.error("AI enrichment error:", error);
  }
  
  return websiteData as CompanyInfo;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = extractDomain(url);
    
    // Fetch website metadata
    const websiteData = await fetchWebsiteMetadata(url);
    
    // Check email security
    const emailSecurity = await checkEmailSecurity(domain);
    websiteData.spf_status = emailSecurity.spf;
    websiteData.dmarc_status = emailSecurity.dmarc;
    websiteData.dkim_status = emailSecurity.dkim;
    
    // Enrich with AI
    const enrichedData = await enrichWithAI(websiteData, domain);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in enrich-company function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
