import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyInfo {
  name: string | null;
  description: string | null;
  industry: string | null;
  address: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  logo_url: string | null;
  website_url: string | null;
}

function extractDomain(url: string): string {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function normalizeUrl(url: string): string {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  return cleanUrl;
}

async function fetchWebsiteMetadata(url: string): Promise<CompanyInfo> {
  const result: CompanyInfo = {
    name: null,
    description: null,
    industry: null,
    address: null,
    linkedin_url: null,
    twitter_url: null,
    logo_url: null,
    website_url: normalizeUrl(url),
  };

  try {
    const normalizedUrl = normalizeUrl(url);
    console.log(`Fetching metadata from: ${normalizedUrl}`);
    
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${normalizedUrl}: ${response.status}`);
      return result;
    }

    const html = await response.text();
    
    // Extract Open Graph and meta tags
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    
    const metaDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    
    // Extract company name
    result.name = ogSiteName || ogTitle || titleTag?.split(/[|\-–—]/)[0]?.trim() || null;
    
    // Extract description
    result.description = ogDescription || metaDescription || null;
    
    // Extract logo
    if (ogImage) {
      result.logo_url = ogImage.startsWith('http') ? ogImage : new URL(ogImage, normalizedUrl).href;
    } else {
      // Try to find favicon or apple-touch-icon
      const appleTouchIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)?.[1];
      const favicon = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)?.[1];
      const iconUrl = appleTouchIcon || favicon;
      if (iconUrl) {
        result.logo_url = iconUrl.startsWith('http') ? iconUrl : new URL(iconUrl, normalizedUrl).href;
      }
    }
    
    // Extract social links
    const linkedinMatch = html.match(/href=["'](https?:\/\/(?:www\.)?linkedin\.com\/company\/[^"'\s]+)["']/i);
    if (linkedinMatch) {
      result.linkedin_url = linkedinMatch[1];
    }
    
    const twitterMatch = html.match(/href=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s]+)["']/i);
    if (twitterMatch) {
      result.twitter_url = twitterMatch[1];
    }
    
    // Try to extract address from structured data
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
          const data = JSON.parse(jsonContent);
          
          // Handle array of schemas
          const schemas = Array.isArray(data) ? data : [data];
          
          for (const schema of schemas) {
            // Extract address
            if (schema.address) {
              if (typeof schema.address === 'string') {
                result.address = schema.address;
              } else if (schema.address.streetAddress || schema.address.addressLocality) {
                const parts = [];
                if (schema.address.streetAddress) parts.push(schema.address.streetAddress);
                if (schema.address.addressLocality) parts.push(schema.address.addressLocality);
                if (schema.address.addressRegion) parts.push(schema.address.addressRegion);
                if (schema.address.postalCode) parts.push(schema.address.postalCode);
                if (schema.address.addressCountry) {
                  const country = typeof schema.address.addressCountry === 'string' 
                    ? schema.address.addressCountry 
                    : schema.address.addressCountry.name;
                  if (country) parts.push(country);
                }
                result.address = parts.join(', ');
              }
            }
            
            // Extract industry/type
            if (schema.industry) {
              result.industry = schema.industry;
            } else if (schema['@type'] === 'Organization' && schema.additionalType) {
              result.industry = schema.additionalType;
            }
            
            // Extract name from schema if not found
            if (!result.name && schema.name) {
              result.name = schema.name;
            }
            
            // Extract social links from schema
            if (schema.sameAs && Array.isArray(schema.sameAs)) {
              for (const link of schema.sameAs) {
                if (!result.linkedin_url && link.includes('linkedin.com')) {
                  result.linkedin_url = link;
                }
                if (!result.twitter_url && (link.includes('twitter.com') || link.includes('x.com'))) {
                  result.twitter_url = link;
                }
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
    }
    
    // Try to extract address from common patterns
    if (!result.address) {
      // Look for address in footer or contact sections
      const addressPatterns = [
        /<address[^>]*>([\s\S]*?)<\/address>/i,
        /class=["'][^"']*address[^"']*["'][^>]*>([\s\S]*?)<\//i,
        /itemprop=["']address["'][^>]*>([\s\S]*?)<\//i,
      ];
      
      for (const pattern of addressPatterns) {
        const addressMatch = html.match(pattern);
        if (addressMatch) {
          // Clean HTML tags and normalize whitespace
          const cleanAddress = addressMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanAddress.length > 10 && cleanAddress.length < 300) {
            result.address = cleanAddress;
            break;
          }
        }
      }
    }
    
    console.log('Extracted company info:', result);
    
  } catch (error) {
    console.error('Error fetching website metadata:', error);
  }
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing company info request for: ${url}`);
    
    const companyInfo = await fetchWebsiteMetadata(url);
    
    return new Response(
      JSON.stringify({ success: true, data: companyInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Error in fetch-company-info:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
