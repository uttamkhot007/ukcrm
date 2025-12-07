import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserInfo {
  full_name?: string;
  current_title?: string;
  designation?: string;
  current_company?: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  education?: string[];
  skills?: string[];
  experience?: {
    company: string;
    title: string;
    duration?: string;
  }[];
  certifications?: string[];
  profile_image_url?: string;
  dob?: string;
  anniversary_date?: string;
}

async function enrichUserWithAI(userName: string, organizationName: string): Promise<UserInfo> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log("No Lovable API key available");
    return { full_name: userName };
  }

  const searchPrompt = `You are an expert professional research assistant. Research and find publicly available professional information about a person.

SEARCH TARGET:
- Person Name: "${userName}"
- Organization/Company: "${organizationName}"

IMPORTANT SEARCH STRATEGY:
1. First, search LinkedIn for "${userName}" at "${organizationName}"
2. Search Google for "${userName} ${organizationName} LinkedIn"
3. Look for professional profiles, press releases, company announcements
4. Check industry publications, conferences, speaking engagements
5. Look for any public bios on company websites
6. Search for social media profiles with professional information

Find and compile the following information from PUBLIC sources only:

1. Full Name (verified spelling)
2. Current Job Title/Designation
3. Current Company (verify it matches ${organizationName})
4. LinkedIn Profile URL (must be valid LinkedIn URL format)
5. Professional Email (if publicly available)
6. Phone Number/Mobile (if publicly available)
7. Location (City, Country)
8. Professional Bio/Summary
9. Education History (universities, degrees)
10. Key Skills & Expertise
11. Work Experience (previous companies and roles)
12. Certifications & Awards
13. Profile Photo URL (LinkedIn profile photo or company website photo)
14. Date of Birth (if publicly available, format: YYYY-MM-DD)
15. Work Anniversary Date (when they joined current company, format: YYYY-MM-DD)

RULES:
- Only include information that is publicly available
- If you cannot verify information, set it to null
- LinkedIn URLs must follow format: https://linkedin.com/in/xxx or https://www.linkedin.com/in/xxx
- Be accurate - wrong information is worse than no information
- Focus on professional information, not personal
- For profile images, use direct image URLs if available
- For DOB/anniversary, only include if clearly stated publicly

Return ONLY a valid JSON object:
{
  "full_name": "Full verified name",
  "current_title": "Current job title",
  "designation": "Professional designation/role",
  "current_company": "Current company name",
  "linkedin_url": "LinkedIn profile URL or null",
  "email": "Professional email or null",
  "phone": "Phone/mobile number or null",
  "location": "City, Country",
  "bio": "Professional summary/bio (2-3 sentences)",
  "education": ["University - Degree - Year"],
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [{"company": "Company Name", "title": "Job Title", "duration": "2020-2023"}],
  "certifications": ["Certification name"],
  "profile_image_url": "URL to profile image or null",
  "dob": "YYYY-MM-DD or null",
  "anniversary_date": "YYYY-MM-DD or null"
}`;

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
            content: "You are a professional research assistant specializing in finding publicly available professional information about business contacts. Always respond with valid JSON only, no markdown code blocks. Be accurate and only include verified information." 
          },
          { role: "user", content: searchPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("AI enrichment failed:", response.status);
      return { full_name: userName };
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (content) {
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const userData = JSON.parse(cleanedContent);
        
        // Ensure we have at least the name
        if (!userData.full_name) {
          userData.full_name = userName;
        }
        
        return userData;
      } catch (e) {
        console.error("Failed to parse AI response:", e, content);
      }
    }
  } catch (error) {
    console.error("AI enrichment error:", error);
  }
  
  return { full_name: userName };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userName, organizationName } = body;
    
    if (!userName) {
      return new Response(
        JSON.stringify({ error: "User name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting user enrichment for: ${userName} at ${organizationName || 'Unknown Organization'}`);
    
    const enrichedData = await enrichUserWithAI(userName, organizationName || '');
    console.log(`Enriched user data:`, enrichedData);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in enrich-user function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
