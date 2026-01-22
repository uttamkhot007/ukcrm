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
    const { analysisType, metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${analysisType} finance insights with metrics:`, JSON.stringify(metrics));

    let systemPrompt = "";
    let userPrompt = "";

    const formatCurrency = (amount: number) => `₹${Math.abs(amount || 0).toLocaleString("en-IN")}`;

    switch (analysisType) {
      case "dashboard":
        systemPrompt = `You are an expert financial analyst and CFO advisor for Indian businesses. Analyze financial metrics and provide actionable insights. Focus on cash flow optimization, profitability, and financial health. Be concise, specific, and business-focused. Use Indian Rupee (₹) for all amounts.`;
        userPrompt = `Analyze these financial metrics and provide insights:

Financial Overview:
- Total Income: ${formatCurrency(metrics.totalIncome)}
- Total Expenses: ${formatCurrency(metrics.totalExpenses)}
- Net Profit/Loss: ${formatCurrency(metrics.netProfit)}
- Cash in Hand: ${formatCurrency(metrics.cashInHand)}
- Bank Balance: ${formatCurrency(metrics.bankBalance)}
- Today's Receipts: ${formatCurrency(metrics.todayReceipts)}
- Today's Payments: ${formatCurrency(metrics.todayPayments)}

Provide:
1. 3 key predictions for next month based on current trends
2. 3 actionable recommendations to improve financial health
3. 2 risk alerts or areas of concern

Respond in JSON format: { "predictions": ["..."], "recommendations": ["..."], "risks": ["..."] }`;
        break;

      case "cash-flow":
        systemPrompt = `You are a cash flow management expert for Indian businesses. Analyze cash flow patterns and provide strategic recommendations for liquidity management.`;
        userPrompt = `Analyze this cash flow data:

Cash Flow Summary:
- Operating Activities: ${formatCurrency(metrics.operatingCashFlow)}
- Investing Activities: ${formatCurrency(metrics.investingCashFlow)}
- Financing Activities: ${formatCurrency(metrics.financingCashFlow)}
- Net Change in Cash: ${formatCurrency(metrics.netCashChange)}
- Opening Cash: ${formatCurrency(metrics.openingCash)}
- Closing Cash: ${formatCurrency(metrics.closingCash)}

Provide:
1. 3 predictions about future cash position
2. 3 recommendations to optimize cash flow
3. 2 liquidity risk alerts

Respond in JSON format: { "predictions": ["..."], "recommendations": ["..."], "risks": ["..."] }`;
        break;

      case "ratio-analysis":
        systemPrompt = `You are a financial ratio analysis expert. Interpret financial ratios in the context of Indian business standards and provide actionable insights.`;
        userPrompt = `Analyze these financial ratios:

Liquidity Ratios:
- Current Ratio: ${metrics.currentRatio?.toFixed(2) || 'N/A'}
- Quick Ratio: ${metrics.quickRatio?.toFixed(2) || 'N/A'}

Profitability Ratios:
- Gross Profit Margin: ${metrics.grossProfitMargin?.toFixed(1) || 'N/A'}%
- Net Profit Margin: ${metrics.netProfitMargin?.toFixed(1) || 'N/A'}%
- Return on Assets: ${metrics.roa?.toFixed(1) || 'N/A'}%
- Return on Equity: ${metrics.roe?.toFixed(1) || 'N/A'}%

Leverage Ratios:
- Debt to Equity: ${metrics.debtToEquity?.toFixed(2) || 'N/A'}
- Debt Ratio: ${metrics.debtRatio?.toFixed(1) || 'N/A'}%

Activity Ratios:
- Asset Turnover: ${metrics.assetTurnover?.toFixed(2) || 'N/A'}x
- Inventory Turnover: ${metrics.inventoryTurnover?.toFixed(2) || 'N/A'}x
- Receivables Days: ${metrics.receivablesDays?.toFixed(0) || 'N/A'} days

Provide:
1. 3 predictions based on ratio trends
2. 3 specific recommendations to improve weak ratios
3. 2 financial health risk alerts

Respond in JSON format: { "predictions": ["..."], "recommendations": ["..."], "risks": ["..."] }`;
        break;

      case "budget":
        systemPrompt = `You are a budget planning and variance analysis expert. Help businesses optimize their budgets and control spending.`;
        userPrompt = `Analyze this budget data:

Budget Overview:
- Total Budgeted: ${formatCurrency(metrics.totalBudgeted)}
- Total Utilized: ${formatCurrency(metrics.totalUtilized)}
- Utilization Rate: ${metrics.utilizationRate?.toFixed(1) || 0}%
- Active Budgets: ${metrics.activeBudgets || 0}
- Over-budget Items: ${metrics.overBudgetItems || 0}
- Under-budget Items: ${metrics.underBudgetItems || 0}

Provide:
1. 3 predictions about budget performance
2. 3 recommendations to optimize budget utilization
3. 2 budget risk alerts

Respond in JSON format: { "predictions": ["..."], "recommendations": ["..."], "risks": ["..."] }`;
        break;

      case "profit-loss":
        systemPrompt = `You are a profit and loss analysis expert for Indian businesses. Provide insights on revenue optimization and expense management.`;
        userPrompt = `Analyze this Profit & Loss data:

P&L Summary:
- Total Income: ${formatCurrency(metrics.totalIncome)}
- Direct Income: ${formatCurrency(metrics.directIncome)}
- Indirect Income: ${formatCurrency(metrics.indirectIncome)}
- Total Expenses: ${formatCurrency(metrics.totalExpenses)}
- Direct Expenses (COGS): ${formatCurrency(metrics.directExpenses)}
- Indirect Expenses: ${formatCurrency(metrics.indirectExpenses)}
- Gross Profit: ${formatCurrency(metrics.grossProfit)}
- Net Profit: ${formatCurrency(metrics.netProfit)}
- Gross Margin: ${metrics.grossMargin?.toFixed(1) || 0}%
- Net Margin: ${metrics.netMargin?.toFixed(1) || 0}%

Provide:
1. 3 predictions about profitability trends
2. 3 recommendations to improve profit margins
3. 2 profitability risk alerts

Respond in JSON format: { "predictions": ["..."], "recommendations": ["..."], "risks": ["..."] }`;
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact administrator." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from the response (may be wrapped in markdown code blocks)
    let parsedContent;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback response
      parsedContent = {
        predictions: ["Unable to generate predictions at this time"],
        recommendations: ["Please try again with more data"],
        risks: ["Insufficient data for risk analysis"]
      };
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Finance AI insights error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
