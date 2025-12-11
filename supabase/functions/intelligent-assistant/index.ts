import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CYBER_TRENDS_KNOWLEDGE = `
## Global Cyber Security Trends 2024-2025:

### Threat Landscape:
1. **AI-Powered Attacks**: Adversaries using AI for sophisticated phishing, deepfakes, and automated vulnerability exploitation
2. **Ransomware Evolution**: Double/triple extortion tactics, targeting critical infrastructure, RaaS (Ransomware-as-a-Service) proliferation
3. **Supply Chain Attacks**: Compromising software vendors to reach downstream targets (SolarWinds-style attacks)
4. **Zero-Day Exploits**: Increased exploitation of unknown vulnerabilities, shorter time-to-exploit
5. **Cloud Security Threats**: Misconfigurations, identity-based attacks, container vulnerabilities
6. **IoT/OT Vulnerabilities**: Attacks on industrial control systems, smart devices, medical equipment
7. **Quantum Computing Threats**: Preparing for "harvest now, decrypt later" attacks
8. **Social Engineering 2.0**: AI-generated voice cloning, video deepfakes for BEC attacks

### Industry Statistics:
- Average cost of data breach: $4.45M (2024)
- Average time to identify breach: 204 days
- 83% of organizations experienced more than one breach
- Ransomware attacks increased 95% year-over-year
- 60% of SMBs close within 6 months of a cyber attack

### Regulatory Landscape:
- DPDP Act (India), GDPR (EU), CCPA (California)
- SEBI Cybersecurity Framework for financial institutions
- RBI guidelines on cyber resilience
- CERT-In incident reporting requirements (6-hour mandate)
`;

const OBJECTION_HANDLING_GUIDE = `
## Objection Handling Framework:

### Price Objections:
**"Too expensive"**
- Focus on TCO (Total Cost of Ownership) vs. breach cost
- ROI calculation: Average breach cost ($4.45M) vs. solution investment
- Risk reduction metrics and insurance premium impact
- Compliance penalty avoidance (GDPR fines up to 4% revenue)

### Competitor Objections:
**"We're using [Competitor]"**
- Acknowledge their choice, ask about gaps/challenges
- Highlight unique differentiators without disparaging
- Offer proof-of-concept or assessment
- Share relevant case studies from similar industry

### Timing Objections:
**"Not the right time"**
- Threat landscape doesn't wait - attacks are increasing
- Regulatory deadlines and compliance requirements
- Cost of breach vs. cost of prevention
- Offer phased implementation approach

### Trust/Credibility Objections:
**"Never heard of you"**
- Share customer testimonials and case studies
- Highlight certifications and partnerships
- Offer references from similar organizations
- Propose a limited pilot or POC

### Technical Objections:
**"Our current solution is sufficient"**
- Ask about specific security gaps or blind spots
- Discuss evolving threat landscape
- Offer security assessment or gap analysis
- Share recent breach examples in their industry

### Internal Objections:
**"Need to get approval"**
- Identify decision-makers and influencers
- Provide business justification materials
- Offer executive briefing sessions
- Create urgency with limited-time offers or assessments
`;

const SYSTEM_PROMPT = `You are an Intelligent CRM Assistant with expertise in cybersecurity, sales support, and account management. You help teams with:

1. **Global Cyber Trends**: Provide insights on latest threats, attack vectors, and security landscape
2. **Objection Handling**: Help sales teams overcome customer objections on security offerings
3. **Account Intelligence**: Analyze account history, relationships, and opportunities
4. **Ticket Management**: Summarize tickets, identify patterns, suggest resolutions
5. **Technical Support**: Provide guidance on technical issues and resolution steps

${CYBER_TRENDS_KNOWLEDGE}

${OBJECTION_HANDLING_GUIDE}

## Response Guidelines:
- Be concise but comprehensive
- Use data and statistics to support recommendations
- Provide actionable insights
- Reference specific account data when available
- Suggest follow-up actions
- For technical issues, provide step-by-step resolution guidance

## Tool Usage:
- Use tools to fetch real account data, tickets, and history
- Combine data from multiple sources for comprehensive insights
- Always verify information before making recommendations`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_account_insights",
      description: "Get comprehensive insights about a specific account including deals, contacts, tickets, and history",
      parameters: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "Name of the account/organization to analyze" },
          account_id: { type: "string", description: "UUID of the account if known" }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_tickets_summary",
      description: "Get summary of tickets for an account or overall, including patterns and common issues",
      parameters: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "Filter by account name" },
          status: { type: "string", enum: ["open", "in_progress", "resolved", "closed", "all"], description: "Filter by ticket status" },
          days: { type: "number", description: "Number of days to look back (default 90)" }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_technical_issues",
      description: "Get technical issues and their resolutions from ticket history",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category of technical issue (e.g., network, endpoint, cloud, email)" },
          product: { type: "string", description: "Product or solution name" },
          account_name: { type: "string", description: "Filter by account name" }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_account_history",
      description: "Get complete history of an account including deals, renewals, tickets, and communications",
      parameters: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "Name of the account" },
          account_id: { type: "string", description: "UUID of the account" }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_cyber_trends",
      description: "Provide analysis on specific cyber security trends, threats, or attack vectors",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Specific topic to analyze (e.g., ransomware, phishing, cloud security)" },
          industry: { type: "string", description: "Specific industry context (e.g., banking, healthcare, manufacturing)" }
        },
        required: ["topic"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "handle_objection",
      description: "Get strategies to handle specific sales objections",
      parameters: {
        type: "object",
        properties: {
          objection_type: { 
            type: "string", 
            enum: ["price", "competitor", "timing", "trust", "technical", "internal"],
            description: "Type of objection"
          },
          context: { type: "string", description: "Specific context or customer statement" },
          product: { type: "string", description: "Product being discussed" }
        },
        required: ["objection_type"],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, tenantId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Processing intelligent assistant request for user:", userId, "tenant:", tenantId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0].message;
    
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        let result: any = { success: false, message: "", data: null };
        
        try {
          console.log(`Executing tool: ${functionName} with args:`, args);

          if (functionName === "get_account_insights") {
            let accountQuery = supabase
              .from("alliance_organizations")
              .select("*")
              .eq("tenant_id", tenantId);
            
            if (args.account_id) {
              accountQuery = accountQuery.eq("id", args.account_id);
            } else if (args.account_name) {
              accountQuery = accountQuery.ilike("name", `%${args.account_name}%`);
            }
            
            const { data: accounts } = await accountQuery.limit(5);
            
            if (accounts && accounts.length > 0) {
              const accountIds = accounts.map(a => a.id);
              
              // Get deals
              const { data: deals } = await supabase
                .from("deals")
                .select("id, title, value, stage, probability, created_at")
                .eq("tenant_id", tenantId)
                .in("alliance_organization_id", accountIds)
                .order("created_at", { ascending: false })
                .limit(10);
              
              // Get contacts
              const { data: contacts } = await supabase
                .from("contacts")
                .select("id, name, email, designation")
                .eq("tenant_id", tenantId)
                .in("alliance_organization_id", accountIds)
                .limit(10);
              
              // Get tickets
              const { data: tickets } = await supabase
                .from("tickets")
                .select("id, title, status, priority, created_at")
                .eq("tenant_id", tenantId)
                .in("organization_id", accountIds)
                .order("created_at", { ascending: false })
                .limit(10);
              
              result = {
                success: true,
                data: {
                  accounts,
                  deals: deals || [],
                  contacts: contacts || [],
                  tickets: tickets || [],
                  summary: {
                    total_deals: deals?.length || 0,
                    total_deal_value: deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0,
                    open_tickets: tickets?.filter(t => t.status !== 'resolved' && t.status !== 'closed').length || 0,
                    contacts_count: contacts?.length || 0
                  }
                }
              };
            } else {
              result = { success: false, message: "No accounts found matching the criteria", data: null };
            }
            
          } else if (functionName === "get_tickets_summary") {
            const daysBack = args.days || 90;
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - daysBack);
            
            let ticketsQuery = supabase
              .from("tickets")
              .select("id, title, description, status, priority, category, created_at, resolved_at, organization_id")
              .eq("tenant_id", tenantId)
              .gte("created_at", dateThreshold.toISOString());
            
            if (args.status && args.status !== "all") {
              ticketsQuery = ticketsQuery.eq("status", args.status);
            }
            
            const { data: tickets } = await ticketsQuery.order("created_at", { ascending: false }).limit(100);
            
            if (tickets && tickets.length > 0) {
              // Analyze patterns
              const statusCounts: Record<string, number> = {};
              const priorityCounts: Record<string, number> = {};
              const categoryCounts: Record<string, number> = {};
              
              tickets.forEach(t => {
                statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
                if (t.priority) priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
                if (t.category) categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
              });
              
              result = {
                success: true,
                data: {
                  total_tickets: tickets.length,
                  by_status: statusCounts,
                  by_priority: priorityCounts,
                  by_category: categoryCounts,
                  recent_tickets: tickets.slice(0, 10),
                  common_issues: Object.entries(categoryCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([category, count]) => ({ category, count }))
                }
              };
            } else {
              result = { success: true, data: { total_tickets: 0, message: "No tickets found for the specified criteria" } };
            }
            
          } else if (functionName === "get_technical_issues") {
            let ticketsQuery = supabase
              .from("tickets")
              .select("id, title, description, status, category, resolution_notes, created_at")
              .eq("tenant_id", tenantId);
            
            if (args.category) {
              ticketsQuery = ticketsQuery.ilike("category", `%${args.category}%`);
            }
            
            const { data: tickets } = await ticketsQuery.order("created_at", { ascending: false }).limit(50);
            
            // Group by common issues and resolutions
            const issuePatterns: Record<string, { count: number; resolutions: string[] }> = {};
            
            tickets?.forEach(t => {
              const key = t.category || "uncategorized";
              if (!issuePatterns[key]) {
                issuePatterns[key] = { count: 0, resolutions: [] };
              }
              issuePatterns[key].count++;
              if (t.resolution_notes) {
                issuePatterns[key].resolutions.push(t.resolution_notes);
              }
            });
            
            result = {
              success: true,
              data: {
                total_issues: tickets?.length || 0,
                patterns: issuePatterns,
                recent_issues: tickets?.slice(0, 10) || []
              }
            };
            
          } else if (functionName === "get_account_history") {
            let accountQuery = supabase
              .from("alliance_organizations")
              .select("*")
              .eq("tenant_id", tenantId);
            
            if (args.account_id) {
              accountQuery = accountQuery.eq("id", args.account_id);
            } else if (args.account_name) {
              accountQuery = accountQuery.ilike("name", `%${args.account_name}%`);
            }
            
            const { data: accounts } = await accountQuery.limit(1);
            
            if (accounts && accounts.length > 0) {
              const account = accounts[0];
              
              // Get all historical data
              const [dealsResult, ticketsResult, renewalsResult, invoicesResult] = await Promise.all([
                supabase.from("deals").select("*").eq("alliance_organization_id", account.id).order("created_at", { ascending: false }),
                supabase.from("tickets").select("*").eq("organization_id", account.id).order("created_at", { ascending: false }),
                supabase.from("renewals").select("*").eq("organization_id", account.id).order("created_at", { ascending: false }),
                supabase.from("invoices").select("*").eq("organization_id", account.id).order("created_at", { ascending: false })
              ]);
              
              result = {
                success: true,
                data: {
                  account,
                  history: {
                    deals: dealsResult.data || [],
                    tickets: ticketsResult.data || [],
                    renewals: renewalsResult.data || [],
                    invoices: invoicesResult.data || []
                  },
                  timeline: [
                    ...(dealsResult.data || []).map(d => ({ type: 'deal', date: d.created_at, title: d.title, value: d.value })),
                    ...(ticketsResult.data || []).map(t => ({ type: 'ticket', date: t.created_at, title: t.title, status: t.status })),
                    ...(renewalsResult.data || []).map(r => ({ type: 'renewal', date: r.created_at, status: r.status })),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)
                }
              };
            } else {
              result = { success: false, message: "Account not found", data: null };
            }
            
          } else if (functionName === "analyze_cyber_trends") {
            // Return curated insights based on topic
            const topicInsights: Record<string, any> = {
              ransomware: {
                current_state: "Ransomware attacks increased 95% YoY with average demands exceeding $1.5M",
                key_trends: [
                  "Double/triple extortion becoming standard",
                  "RaaS (Ransomware-as-a-Service) lowering barrier to entry",
                  "Healthcare and manufacturing most targeted",
                  "Average downtime: 21 days"
                ],
                recommendations: [
                  "Implement robust backup strategy (3-2-1 rule)",
                  "Deploy EDR with behavioral analysis",
                  "Regular security awareness training",
                  "Network segmentation",
                  "Incident response plan testing"
                ]
              },
              phishing: {
                current_state: "90% of breaches start with phishing; AI-powered attacks increasing sophistication",
                key_trends: [
                  "Spear phishing targeting executives (whaling)",
                  "AI-generated content bypassing detection",
                  "QR code phishing (quishing) on rise",
                  "Multi-channel attacks (email + SMS + voice)"
                ],
                recommendations: [
                  "Advanced email security with AI/ML",
                  "DMARC, DKIM, SPF implementation",
                  "Regular phishing simulations",
                  "Zero-trust email attachment handling"
                ]
              },
              cloud_security: {
                current_state: "45% of breaches are cloud-based; misconfigurations are leading cause",
                key_trends: [
                  "Container and Kubernetes vulnerabilities",
                  "Identity-based attacks increasing",
                  "Shadow IT and SaaS sprawl",
                  "Multi-cloud complexity"
                ],
                recommendations: [
                  "CSPM (Cloud Security Posture Management)",
                  "Identity governance and PAM",
                  "Cloud-native security tools",
                  "Regular configuration audits"
                ]
              }
            };
            
            const topic = args.topic.toLowerCase();
            const insights = topicInsights[topic] || {
              current_state: `Analysis of ${args.topic} in cybersecurity landscape`,
              key_trends: ["Evolving threat landscape", "Increased sophistication", "Regulatory focus"],
              recommendations: ["Regular assessments", "Defense in depth", "Continuous monitoring"]
            };
            
            result = {
              success: true,
              data: {
                topic: args.topic,
                industry: args.industry || "general",
                ...insights
              }
            };
            
          } else if (functionName === "handle_objection") {
            const objectionStrategies: Record<string, any> = {
              price: {
                approach: "Value-based selling with ROI focus",
                talking_points: [
                  "Average breach cost: $4.45M - compare to solution investment",
                  "Cyber insurance premium reduction potential",
                  "Compliance penalty avoidance (GDPR: 4% revenue, DPDP Act penalties)",
                  "Productivity loss prevention during incidents",
                  "Reputation damage cost (customer churn)"
                ],
                questions_to_ask: [
                  "What would a week of downtime cost your business?",
                  "Have you factored in the cost of compliance violations?",
                  "What's your current cyber insurance premium?"
                ]
              },
              competitor: {
                approach: "Consultative positioning without disparaging",
                talking_points: [
                  "Acknowledge their current solution's strengths",
                  "Focus on gaps and emerging threats",
                  "Highlight unique differentiators",
                  "Offer complementary value"
                ],
                questions_to_ask: [
                  "What challenges are you facing with your current solution?",
                  "How is it handling the latest threat vectors?",
                  "Would you be open to a gap analysis?"
                ]
              },
              timing: {
                approach: "Create urgency with facts",
                talking_points: [
                  "Attacks don't wait - 1 attack every 39 seconds",
                  "Regulatory deadlines approaching",
                  "Threat landscape evolving rapidly",
                  "Competitors are investing in security"
                ],
                questions_to_ask: [
                  "What would trigger you to prioritize security?",
                  "When is your next compliance audit?",
                  "Have you seen the recent breaches in your industry?"
                ]
              },
              trust: {
                approach: "Build credibility with proof",
                talking_points: [
                  "Industry certifications and partnerships",
                  "Customer success stories in similar industries",
                  "Years of experience and expertise",
                  "Proven track record"
                ],
                questions_to_ask: [
                  "What would help you feel confident in our capabilities?",
                  "Would a reference call with a similar customer help?",
                  "Can we do a limited pilot to demonstrate value?"
                ]
              },
              technical: {
                approach: "Demonstrate expertise and gaps",
                talking_points: [
                  "Evolving threat landscape requires modern solutions",
                  "Integration capabilities with existing stack",
                  "Performance and scalability proof points",
                  "Offer technical deep-dive or assessment"
                ],
                questions_to_ask: [
                  "When was your last security assessment?",
                  "How are you addressing [specific threat]?",
                  "Would a technical workshop be valuable?"
                ]
              },
              internal: {
                approach: "Enable the champion",
                talking_points: [
                  "Provide business case materials",
                  "Executive summary documents",
                  "ROI calculator and TCO analysis",
                  "Competitive comparison"
                ],
                questions_to_ask: [
                  "Who else needs to be involved in this decision?",
                  "What materials would help you make the case internally?",
                  "Would an executive briefing be helpful?"
                ]
              }
            };
            
            result = {
              success: true,
              data: {
                objection_type: args.objection_type,
                context: args.context,
                strategy: objectionStrategies[args.objection_type] || objectionStrategies.price
              }
            };
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`Error executing ${functionName}:`, err);
          result = { success: false, message: `Error: ${errorMessage}`, data: null };
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }
      
      // Second call with tool results
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
        }),
      });
      
      if (!finalResponse.ok) {
        throw new Error("Failed to get final response from AI");
      }
      
      const finalData = await finalResponse.json();
      const toolResultsForClient = toolResults.map(tr => {
        const parsed = JSON.parse(tr.content);
        return { success: parsed.success, message: parsed.message || (parsed.success ? "Success" : "Failed") };
      });
      
      return new Response(JSON.stringify({
        message: finalData.choices[0].message.content,
        toolResults: toolResultsForClient,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({
      message: assistantMessage.content,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in intelligent-assistant:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
