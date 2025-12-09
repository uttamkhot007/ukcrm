import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (action === 'score_lead') {
      // AI-powered lead scoring
      const { lead } = data;
      
      const prompt = `Analyze this lead and provide a score from 0-100 based on likelihood to convert. Also provide insights.

Lead Data:
- Name: ${lead.name || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Email: ${lead.email || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Status: ${lead.status || 'Unknown'}
- Notes: ${lead.notes || 'None'}
- Industry: ${lead.industry || 'Unknown'}

Scoring criteria:
- Company presence (has website, established company): +20 points
- Email domain (corporate vs personal): +15 points
- Lead source quality: +20 points
- Engagement indicators: +25 points
- Industry fit: +20 points`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a sales intelligence AI. Analyze leads and provide accurate scoring with detailed breakdowns. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          tools: [{
            type: "function",
            function: {
              name: "score_lead",
              description: "Return lead score and insights",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Lead score from 0-100" },
                  breakdown: {
                    type: "object",
                    properties: {
                      company_presence: { type: "number" },
                      email_quality: { type: "number" },
                      source_quality: { type: "number" },
                      engagement: { type: "number" },
                      industry_fit: { type: "number" }
                    }
                  },
                  insights: { type: "string", description: "Key insights about this lead" },
                  recommended_actions: { type: "array", items: { type: "string" } }
                },
                required: ["score", "breakdown", "insights", "recommended_actions"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "score_lead" } }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
      
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        
        // Update lead in database
        if (lead.id) {
          await supabase
            .from('leads')
            .update({
              lead_score: result.score,
              score_breakdown: result.breakdown,
              ai_insights: result.insights,
              last_scored_at: new Date().toISOString()
            })
            .eq('id', lead.id);
        }
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'analyze_deal') {
      // AI-powered deal insights
      const { deal, activities } = data;
      
      const prompt = `Analyze this deal and provide win probability, recommendations, and risk factors.

Deal Data:
- Title: ${deal.title}
- Value: $${deal.value || 0}
- Stage: ${deal.stage}
- Expected Close: ${deal.expected_close_date || 'Not set'}
- Contact: ${deal.contact?.name || 'Unknown'}
- Company: ${deal.contact?.company || 'Unknown'}
- Created: ${deal.created_at}
- Days in pipeline: ${Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24))}

Recent Activities (last 10):
${activities?.slice(0, 10).map((a: any) => `- ${a.activity_type}: ${a.description}`).join('\n') || 'No recent activities'}

Problem Areas: ${deal.problem_area || 'Not specified'}
Attack Vectors: ${JSON.stringify(deal.attack_vectors) || 'Not specified'}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a sales intelligence AI. Analyze deals and provide accurate win probability predictions with actionable recommendations. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          tools: [{
            type: "function",
            function: {
              name: "analyze_deal",
              description: "Return deal analysis with win probability and recommendations",
              parameters: {
                type: "object",
                properties: {
                  win_probability: { type: "number", description: "Win probability from 0-100" },
                  recommendations: { type: "array", items: { type: "string" }, description: "List of recommendations to improve win chances" },
                  next_best_actions: { type: "array", items: { type: "string" }, description: "Immediate next actions to take" },
                  risk_factors: { type: "array", items: { type: "string" }, description: "Potential risks to the deal" },
                  deal_health: { type: "string", enum: ["healthy", "at_risk", "critical"], description: "Overall deal health status" },
                  summary: { type: "string", description: "Brief summary of deal status" }
                },
                required: ["win_probability", "recommendations", "next_best_actions", "risk_factors", "deal_health", "summary"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_deal" } }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
      
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        
        // Update deal in database
        if (deal.id) {
          await supabase
            .from('deals')
            .update({
              win_probability: result.win_probability,
              ai_recommendations: result.recommendations,
              next_best_actions: result.next_best_actions,
              risk_factors: result.risk_factors,
              last_analyzed_at: new Date().toISOString()
            })
            .eq('id', deal.id);
        }
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'generate_forecast') {
      // AI-powered sales forecasting
      const { deals, period, userId, tenantId } = data;
      
      const dealsSummary = deals.map((d: any) => ({
        title: d.title,
        value: d.value,
        stage: d.stage,
        win_probability: d.win_probability || 50,
        expected_close: d.expected_close_date
      }));

      const prompt = `Generate a sales forecast based on the current pipeline.

Pipeline Summary:
${JSON.stringify(dealsSummary, null, 2)}

Period: ${period}
Total Pipeline Value: $${deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)}
Number of Deals: ${deals.length}

Calculate:
1. Predicted revenue (weighted by win probability and stage)
2. Confidence score for the forecast
3. Key factors affecting the forecast
4. Recommendations for hitting targets`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a sales forecasting AI. Analyze pipeline data and provide accurate revenue predictions with confidence levels. Always respond with valid JSON." },
            { role: "user", content: prompt }
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_forecast",
              description: "Return sales forecast with predictions and analysis",
              parameters: {
                type: "object",
                properties: {
                  predicted_revenue: { type: "number", description: "Predicted revenue for the period" },
                  weighted_pipeline: { type: "number", description: "Pipeline weighted by probability" },
                  confidence_score: { type: "number", description: "Confidence in forecast 0-100" },
                  analysis: { type: "string", description: "Detailed analysis of the forecast" },
                  factors: {
                    type: "object",
                    properties: {
                      positive: { type: "array", items: { type: "string" } },
                      negative: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } }
                    }
                  },
                  risk_assessment: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["predicted_revenue", "weighted_pipeline", "confidence_score", "analysis", "factors", "risk_assessment"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "generate_forecast" } }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
      
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        
        // Get period dates
        const now = new Date();
        let periodStart: Date, periodEnd: Date;
        
        if (period === 'monthly') {
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (period === 'quarterly') {
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        } else {
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear(), 11, 31);
        }
        
        // Save forecast to database
        await supabase
          .from('sales_forecasts')
          .upsert({
            user_id: userId,
            tenant_id: tenantId,
            forecast_period: period,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            predicted_revenue: result.predicted_revenue,
            weighted_pipeline: result.weighted_pipeline,
            confidence_score: result.confidence_score,
            ai_analysis: result.analysis,
            factors: result.factors,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,forecast_period,period_start'
          });
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Sales AI Insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
