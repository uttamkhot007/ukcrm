import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountData {
  organizationName: string;
  industry?: string;
  foundedYear?: number;
  totalEmployees?: number;
  deals: Array<{
    title: string;
    value: number;
    stage: string;
    createdAt: string;
    closedAt?: string;
  }>;
  invoices: Array<{
    amount: number;
    status: string;
    dueDate: string;
    paidAt?: string;
    createdAt: string;
  }>;
  contacts: Array<{
    name: string;
    role?: string;
    isChampion: boolean;
    engagementScore?: number;
  }>;
  tickets: Array<{
    status: string;
    priority: string;
    createdAt: string;
    resolvedAt?: string;
  }>;
  renewals: Array<{
    name: string;
    status: string;
    expiryDate: string;
    cost: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountData: AccountData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate metrics
    const totalRevenue = accountData.deals
      .filter(d => d.stage === 'closed_won')
      .reduce((sum, d) => sum + d.value, 0);
    
    const totalDeals = accountData.deals.length;
    const wonDeals = accountData.deals.filter(d => d.stage === 'closed_won').length;
    const winRate = totalDeals > 0 ? (wonDeals / totalDeals * 100).toFixed(1) : 0;
    
    // Payment analysis
    const paidInvoices = accountData.invoices.filter(i => i.status === 'paid');
    const overdueInvoices = accountData.invoices.filter(i => i.status === 'overdue');
    const pendingInvoices = accountData.invoices.filter(i => i.status === 'pending' || i.status === 'sent');
    
    // Calculate average payment delay
    const paymentDelays = paidInvoices
      .filter(i => i.paidAt && i.dueDate)
      .map(i => {
        const due = new Date(i.dueDate);
        const paid = new Date(i.paidAt!);
        return Math.round((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      });
    
    const avgPaymentDelay = paymentDelays.length > 0 
      ? paymentDelays.reduce((a, b) => a + b, 0) / paymentDelays.length 
      : 0;

    // Account tenure
    const oldestDeal = accountData.deals
      .map(d => new Date(d.createdAt))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    
    const accountAgeDays = oldestDeal 
      ? Math.round((Date.now() - oldestDeal.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const accountAgeYears = (accountAgeDays / 365).toFixed(1);

    // Ticket metrics
    const criticalTickets = accountData.tickets.filter(t => t.priority === 'critical').length;
    const openTickets = accountData.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    // Renewal metrics
    const upcomingRenewals = accountData.renewals.filter(r => {
      const expiry = new Date(r.expiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    });

    const prompt = `You are an AI business analyst. Analyze this customer account data and provide strategic insights.

ACCOUNT: ${accountData.organizationName}
Industry: ${accountData.industry || 'Unknown'}
Founded: ${accountData.foundedYear || 'Unknown'}
Employees: ${accountData.totalEmployees || 'Unknown'}

BUSINESS METRICS:
- Account Age: ${accountAgeYears} years (${accountAgeDays} days)
- Total Revenue Generated: ₹${totalRevenue.toLocaleString()}
- Total Deals: ${totalDeals} (Won: ${wonDeals}, Win Rate: ${winRate}%)
- Active Contacts: ${accountData.contacts.length}
- Champions: ${accountData.contacts.filter(c => c.isChampion).length}

PAYMENT HISTORY:
- Total Invoices: ${accountData.invoices.length}
- Paid: ${paidInvoices.length}
- Pending: ${pendingInvoices.length}
- Overdue: ${overdueInvoices.length}
- Average Payment Delay: ${avgPaymentDelay.toFixed(1)} days
- Total Outstanding: ₹${pendingInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}
- Total Overdue: ₹${overdueInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}

SUPPORT METRICS:
- Total Tickets: ${accountData.tickets.length}
- Open Tickets: ${openTickets}
- Critical Tickets: ${criticalTickets}

RENEWALS:
- Active Subscriptions: ${accountData.renewals.filter(r => r.status === 'active').length}
- Upcoming Renewals (90 days): ${upcomingRenewals.length}
- Renewal Value: ₹${upcomingRenewals.reduce((s, r) => s + r.cost, 0).toLocaleString()}

Provide a comprehensive JSON response with this structure:
{
  "executiveSummary": "2-3 sentence overview of account health and relationship",
  "accountHealth": {
    "score": 0-100,
    "trend": "improving" | "stable" | "declining",
    "factors": ["key factors affecting health"]
  },
  "businessContribution": {
    "totalLifetimeValue": number,
    "averageDealSize": number,
    "growthTrend": "percentage or description",
    "contributionRank": "description of their importance"
  },
  "paymentPatterns": {
    "payerType": "prompt" | "regular" | "delayed" | "problematic",
    "averageDelayDays": number,
    "riskLevel": "low" | "medium" | "high",
    "pattern": "description of payment behavior"
  },
  "recommendations": {
    "paymentTerms": {
      "suggested": "NET 15/30/45/60",
      "reasoning": "why this term"
    },
    "creditLimit": {
      "suggested": "amount or description",
      "reasoning": "why"
    },
    "pricingStrategy": "discount/premium strategy suggestion"
  },
  "teamInsights": {
    "sales": ["actionable insights for sales team"],
    "accounts": ["actionable insights for accounts team"],
    "finance": ["actionable insights for finance team"],
    "technical": ["actionable insights for technical team"]
  },
  "predictions": {
    "renewalProbability": "high/medium/low with percentage",
    "upsellOpportunity": "description of potential upsell",
    "churnRisk": "low/medium/high with reasoning",
    "nextQuarterRevenue": "predicted revenue range"
  },
  "keyRisks": ["list of risks to watch"],
  "opportunities": ["list of growth opportunities"]
}

Be specific, data-driven, and actionable in your analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert business analyst specializing in B2B account analysis. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Add computed metrics to response
    analysis.metrics = {
      accountAgeYears: parseFloat(accountAgeYears),
      accountAgeDays,
      totalRevenue,
      totalDeals,
      wonDeals,
      winRate: parseFloat(winRate as string),
      avgPaymentDelay: parseFloat(avgPaymentDelay.toFixed(1)),
      paidInvoices: paidInvoices.length,
      pendingInvoices: pendingInvoices.length,
      overdueInvoices: overdueInvoices.length,
      totalOutstanding: pendingInvoices.reduce((s, i) => s + i.amount, 0),
      totalOverdue: overdueInvoices.reduce((s, i) => s + i.amount, 0),
      openTickets,
      criticalTickets,
      upcomingRenewals: upcomingRenewals.length,
      renewalValue: upcomingRenewals.reduce((s, r) => s + r.cost, 0),
    };

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Account intelligence error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
