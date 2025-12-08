import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactData {
  contactName: string;
  organizationName: string;
  deals: Array<{
    title: string;
    value: number;
    stage: string;
    createdAt: string;
    closedAt: string | null;
  }>;
  meetings: Array<{
    title: string;
    type: string;
    startTime: string;
    status: string;
    duration: number | null;
  }>;
  activities: Array<{
    type: string;
    description: string;
    createdAt: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contactData: ContactData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate metrics
    const totalDeals = contactData.deals.length;
    const wonDeals = contactData.deals.filter(d => d.stage === "closed_won").length;
    const lostDeals = contactData.deals.filter(d => d.stage === "closed_lost").length;
    const totalValue = contactData.deals.reduce((sum, d) => sum + Number(d.value), 0);
    const wonValue = contactData.deals.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + Number(d.value), 0);
    const winRate = totalDeals > 0 ? Math.round((wonDeals / (wonDeals + lostDeals || 1)) * 100) : 0;

    const totalMeetings = contactData.meetings.length;
    const completedMeetings = contactData.meetings.filter(m => m.status === "completed").length;
    
    const callActivities = contactData.activities.filter(a => a.type === "call").length;
    const emailActivities = contactData.activities.filter(a => a.type === "email").length;
    const meetingActivities = contactData.activities.filter(a => a.type === "meeting").length;
    const totalInteractions = callActivities + emailActivities + meetingActivities + totalMeetings;

    // Calculate days since first contact
    const allDates = [
      ...contactData.deals.map(d => new Date(d.createdAt)),
      ...contactData.meetings.map(m => new Date(m.startTime)),
      ...contactData.activities.map(a => new Date(a.createdAt))
    ];
    const firstContact = allDates.length > 0 ? Math.min(...allDates.map(d => d.getTime())) : Date.now();
    const daysSinceFirstContact = Math.floor((Date.now() - firstContact) / (1000 * 60 * 60 * 24));

    const prompt = `You are an AI analyst specializing in contact relationship intelligence for B2B sales and account management. Analyze this contact data and provide strategic insights.

CONTACT: ${contactData.contactName}
ORGANIZATION: ${contactData.organizationName}

DATA SUMMARY:
- Total Deals Involved: ${totalDeals}
- Won Deals: ${wonDeals} ($${wonValue.toLocaleString()})
- Lost Deals: ${lostDeals}
- Win Rate: ${winRate}%
- Total Value Influenced: $${totalValue.toLocaleString()}
- Total Meetings: ${totalMeetings} (${completedMeetings} completed)
- Total Activities: ${totalInteractions} (${callActivities} calls, ${emailActivities} emails, ${meetingActivities} meetings)
- Days Since First Contact: ${daysSinceFirstContact}

DEALS:
${contactData.deals.map(d => `- ${d.title}: $${d.value.toLocaleString()} (${d.stage})`).join('\n')}

RECENT MEETINGS:
${contactData.meetings.slice(0, 10).map(m => `- ${m.title}: ${m.type} (${m.status})`).join('\n')}

Provide a comprehensive JSON analysis with the following structure:
{
  "executiveSummary": "2-3 sentence strategic overview of this contact's relationship and value",
  "relationshipHealth": {
    "score": <0-100>,
    "trend": "<improving|stable|declining>",
    "factors": ["list of key factors affecting the relationship"]
  },
  "engagementMetrics": {
    "totalInteractions": ${totalInteractions},
    "avgResponseTime": "<estimated response time like '24 hours'>",
    "preferredChannel": "<Email|Phone|Video|In-person>",
    "engagementLevel": "<high|medium|low>"
  },
  "dealInfluence": {
    "totalDealsInfluenced": ${totalDeals},
    "wonDealsInfluenced": ${wonDeals},
    "totalValueInfluenced": ${totalValue},
    "avgDealSize": ${totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0},
    "influenceScore": <0-100 based on their deal involvement>
  },
  "communicationPatterns": {
    "bestTimeToContact": "<Morning|Afternoon|Evening>",
    "preferredMeetingType": "<Video Call|Phone|In-person>",
    "responseRate": <0-100>,
    "avgMeetingDuration": "<e.g., '45 minutes'>"
  },
  "recommendations": {
    "nextBestAction": "specific actionable next step",
    "engagementTips": ["3-4 specific tips for engaging this contact"],
    "riskMitigation": "any risk mitigation strategy if applicable",
    "relationshipGoals": ["2-3 relationship development goals"]
  },
  "predictions": {
    "dealPotential": "<High|Medium|Low>",
    "churnRisk": "<High|Medium|Low>",
    "advocacyLikelihood": "<High|Medium|Low>",
    "upsellReadiness": "<High|Medium|Low>"
  },
  "keyStrengths": ["3-4 positive aspects of this contact relationship"],
  "areasOfConcern": ["2-3 areas that need attention"],
  "metrics": {
    "daysSinceFirstContact": ${daysSinceFirstContact},
    "totalMeetings": ${totalMeetings},
    "totalCalls": ${callActivities},
    "totalEmails": ${emailActivities},
    "winRate": ${winRate},
    "avgDealCycleWithContact": <estimated days>
  }
}

Return ONLY the JSON object, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a B2B contact intelligence analyst. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanedContent);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Contact intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
