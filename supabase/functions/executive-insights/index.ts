import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dashboardType, metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${dashboardType} insights with metrics:`, JSON.stringify(metrics));

    let systemPrompt = "";
    let userPrompt = "";

    switch (dashboardType) {
      case "vcfo":
        systemPrompt = `You are an expert virtual CFO advisor. Analyze financial metrics and provide actionable insights, predictions, and recommendations. Focus on cash flow, revenue optimization, expense management, and financial health. Be concise and business-focused.`;
        userPrompt = `Analyze these financial metrics and provide:
1. 3 key predictions for the next quarter
2. 3 actionable recommendations to improve financial health
3. 2 risk alerts if any

Metrics:
- Total Revenue: $${metrics.totalRevenue?.toLocaleString() || 0}
- Pipeline Value: $${metrics.pipelineValue?.toLocaleString() || 0}
- Accounts Receivable: $${metrics.pendingInvoices?.toLocaleString() || 0}
- Overdue Amount: $${metrics.overdueInvoices?.toLocaleString() || 0}
- Total Expenses: $${metrics.totalExpenses?.toLocaleString() || 0}
- Collection Rate: ${metrics.collectionRate?.toFixed(1) || 0}%

Provide response as JSON with structure: { "predictions": [...], "recommendations": [...], "risks": [...] }`;
        break;

      case "vciso":
        systemPrompt = `You are an expert virtual CISO advisor. Analyze security and compliance metrics and provide actionable insights, predictions, and recommendations. Focus on risk mitigation, compliance improvement, and security posture enhancement. Be concise and actionable.`;
        userPrompt = `Analyze these security metrics and provide:
1. 3 key security predictions/trends
2. 3 actionable recommendations to improve security posture
3. 2 critical risk alerts if any

Metrics:
- Compliance Score: ${metrics.complianceScore || 0}%
- Open Incidents: ${metrics.openIncidents || 0}
- Critical Tickets: ${metrics.criticalTickets || 0}
- Non-Compliant Controls: ${metrics.nonCompliantControls || 0}
- Total Controls: ${metrics.totalControls || 0}
- Active Frameworks: ${metrics.frameworkCount || 0}
- Risk Level: ${metrics.riskLevel || 'Unknown'}

Provide response as JSON with structure: { "predictions": [...], "recommendations": [...], "risks": [...] }`;
        break;

      case "vcro":
        systemPrompt = `You are an expert virtual CRO (Chief Revenue Officer) advisor. Analyze revenue and sales metrics and provide actionable insights, predictions, and recommendations. Focus on pipeline optimization, sales velocity, and revenue growth. Be concise and results-oriented.`;
        userPrompt = `Analyze these revenue metrics and provide:
1. 3 key revenue predictions for the next quarter
2. 3 actionable recommendations to accelerate revenue growth
3. 2 risk alerts or opportunities

Metrics:
- Total Revenue: $${metrics.totalRevenue?.toLocaleString() || 0}
- Pipeline Value: $${metrics.pipelineValue?.toLocaleString() || 0}
- Win Rate: ${metrics.winRate?.toFixed(1) || 0}%
- Average Deal Size: $${metrics.avgDealSize?.toLocaleString() || 0}
- Target Attainment: ${metrics.targetAttainment?.toFixed(1) || 0}%
- Deal Cycle: ${metrics.avgDealCycle || 0} days
- Active Deals: ${metrics.activeDeals || 0}
- Expiring Renewals (30 days): ${metrics.expiringRenewals || 0}

Provide response as JSON with structure: { "predictions": [...], "recommendations": [...], "risks": [...] }`;
        break;

      default:
        throw new Error(`Unknown dashboard type: ${dashboardType}`);
    }

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
      console.error("AI gateway error:", response.status, errorText);
      
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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response:", content);

    // Parse the JSON response
    let insights;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      insights = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback structure
      insights = {
        predictions: ["Unable to generate predictions. Please try again."],
        recommendations: ["Unable to generate recommendations. Please try again."],
        risks: []
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Executive insights error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      predictions: [],
      recommendations: [],
      risks: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
