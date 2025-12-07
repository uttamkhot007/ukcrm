import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Sales AI Assistant for the CRM system. You help sales professionals manage their deals, contacts, and organizations efficiently.

## Your Capabilities:
1. **Create New Deals**: Help users create new sales opportunities with all required information
2. **Add Contacts**: Create new contact records with complete details
3. **Add Organizations**: Create new organization/company records

## Important Instructions:
- When a user wants to create a deal, contact, or organization, use the appropriate tool
- Ask clarifying questions if important information is missing
- Be conversational and helpful
- Confirm successful actions with the user
- For deals, the default stage is "discovery" and default probability is 10%
- Always validate email formats before creating contacts
- Be proactive in suggesting related actions (e.g., after creating an organization, ask if they want to add a contact)

## Response Style:
- Be professional but friendly
- Keep responses concise
- Use bullet points for listing information
- Confirm all details before executing tool calls`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_deal",
      description: "Create a new sales deal/opportunity in the CRM",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the deal" },
          value: { type: "number", description: "Deal value in currency units" },
          stage: { 
            type: "string", 
            enum: ["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"],
            description: "Current stage of the deal"
          },
          probability: { type: "number", description: "Win probability percentage (0-100)" },
          description: { type: "string", description: "Description or notes about the deal" },
          expected_close_date: { type: "string", description: "Expected close date in YYYY-MM-DD format" },
          contact_name: { type: "string", description: "Name of the primary contact for this deal" }
        },
        required: ["title", "value"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a new contact in the CRM",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the contact" },
          email: { type: "string", description: "Email address" },
          phone: { type: "string", description: "Phone number" },
          company: { type: "string", description: "Company/Organization name" },
          designation: { type: "string", description: "Job title or designation" }
        },
        required: ["name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_organization",
      description: "Create a new organization/company in the CRM",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Organization/Company name" },
          organization_type: { 
            type: "string", 
            enum: ["customer", "distributor", "oem", "partner", "location"],
            description: "Type of organization"
          },
          industry: { type: "string", description: "Industry sector" },
          website: { type: "string", description: "Company website URL" },
          address: { type: "string", description: "Business address" }
        },
        required: ["name"],
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

    // First call to get AI response with potential tool calls
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
    
    // Check if there are tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        let result = { success: false, message: "", data: null };
        
        try {
          if (functionName === "create_deal") {
            const { data, error } = await supabase.from("deals").insert({
              tenant_id: tenantId,
              user_id: userId,
              title: args.title,
              value: args.value,
              stage: args.stage || "discovery",
              probability: args.probability || 10,
              description: args.description || null,
              expected_close_date: args.expected_close_date || null,
            }).select().single();
            
            if (error) throw error;
            result = { success: true, message: `Deal "${args.title}" created successfully with value ${args.value}`, data };
            
          } else if (functionName === "create_contact") {
            const { data, error } = await supabase.from("contacts").insert({
              tenant_id: tenantId,
              user_id: userId,
              name: args.name,
              email: args.email || null,
              phone: args.phone || null,
              company: args.company || null,
              designation: args.designation || null,
            }).select().single();
            
            if (error) throw error;
            result = { success: true, message: `Contact "${args.name}" created successfully`, data };
            
          } else if (functionName === "create_organization") {
            const { data, error } = await supabase.from("alliance_organizations").insert({
              tenant_id: tenantId,
              created_by: userId,
              name: args.name,
              organization_type: args.organization_type || null,
              industry: args.industry || null,
              website: args.website || null,
              address: args.address || null,
              status: "active",
            }).select().single();
            
            if (error) throw error;
            result = { success: true, message: `Organization "${args.name}" created successfully`, data };
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`Error executing ${functionName}:`, err);
          result = { success: false, message: `Failed to execute ${functionName}: ${errorMessage}`, data: null };
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }
      
      // Make a second call with tool results to get final response
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
      return new Response(JSON.stringify({
        content: finalData.choices[0].message.content,
        toolResults: toolResults.map(tr => JSON.parse(tr.content)),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // No tool calls, return the content directly
    return new Response(JSON.stringify({
      content: assistantMessage.content,
      toolResults: null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Sales assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
