import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Sales AI Assistant for the CRM system. You help sales professionals manage their deals, contacts, organizations, products, and OEMs efficiently.

## Your Capabilities:
1. **Create New Deals**: Help users create new sales opportunities with all required information
2. **Add Contacts**: Create new contact records with complete details
3. **Add Organizations**: Create new organization/company records (customers, partners, resellers)
4. **Add Products**: Create new product offerings in the catalog
5. **Add OEMs**: Create new OEM/vendor records

## Important Instructions:
- When a user wants to create any entity, use the appropriate tool
- Ask clarifying questions if important information is missing
- Be conversational and helpful
- Confirm successful actions with the user
- For deals, the default stage is "discovery" and default probability is 10%
- Always validate email formats before creating contacts
- Be proactive in suggesting related actions (e.g., after creating an organization, ask if they want to add a contact)
- For products, ask for the OEM/vendor name if not provided
- For OEMs, try to get website and headquarters info if possible

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
          designation: { type: "string", description: "Job title or designation" },
          department: { type: "string", description: "Department within the company" },
          linkedin_url: { type: "string", description: "LinkedIn profile URL" }
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
      description: "Create a new organization/company in the CRM (customer, partner, reseller, etc.)",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Organization/Company name" },
          organization_type: { 
            type: "string", 
            enum: ["customer", "partner", "reseller", "distributor", "oem"],
            description: "Type of organization"
          },
          industry: { type: "string", description: "Industry sector" },
          website: { type: "string", description: "Company website URL" },
          address: { type: "string", description: "Business address" },
          description: { type: "string", description: "Brief description of the organization" }
        },
        required: ["name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Create a new product/offering in the catalog",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name" },
          description: { type: "string", description: "Product description" },
          category: { type: "string", description: "Product category (e.g., Software, Hardware, Service)" },
          oem_name: { type: "string", description: "Name of the OEM/vendor that makes this product" },
          unique_selling_points: { 
            type: "array", 
            items: { type: "string" },
            description: "List of unique selling points or key features"
          },
          competitive_advantages: { type: "string", description: "Competitive advantages of this product" }
        },
        required: ["name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_oem",
      description: "Create a new OEM/vendor record",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "OEM/Vendor company name" },
          description: { type: "string", description: "Description of the OEM" },
          website: { type: "string", description: "Company website URL" },
          partnership_level: { 
            type: "string", 
            enum: ["platinum", "gold", "silver", "bronze", "registered"],
            description: "Partnership tier level"
          },
          headquarters: { type: "string", description: "Location of headquarters" },
          key_products: { 
            type: "array", 
            items: { type: "string" },
            description: "List of key products from this OEM"
          },
          founded_year: { type: "number", description: "Year the company was founded" }
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

    console.log("Processing sales assistant request for user:", userId, "tenant:", tenantId);

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
          console.log(`Executing tool: ${functionName} with args:`, args);

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
            const emailToCheck = args.email?.trim().toLowerCase();
            
            // Check for duplicate email
            if (emailToCheck) {
              const { data: existingContact } = await supabase
                .from("contacts")
                .select("id")
                .ilike("email", emailToCheck)
                .eq("tenant_id", tenantId)
                .maybeSingle();
              
              if (existingContact) {
                throw new Error("A contact with this email already exists");
              }
              
              const { data: existingAllianceUser } = await supabase
                .from("alliance_users")
                .select("id")
                .ilike("email", emailToCheck)
                .eq("tenant_id", tenantId)
                .maybeSingle();
              
              if (existingAllianceUser) {
                throw new Error("A contact with this email already exists in alliance users");
              }
            }
            
            const { data, error } = await supabase.from("contacts").insert({
              tenant_id: tenantId,
              user_id: userId,
              name: args.name,
              email: emailToCheck || null,
              phone: args.phone || null,
              company: args.company || null,
              designation: args.designation || null,
              department: args.department || null,
              linkedin_url: args.linkedin_url || null,
            }).select().single();
            
            if (error) throw error;
            result = { success: true, message: `Contact "${args.name}" created successfully`, data };
            
          } else if (functionName === "create_organization") {
            // Check for duplicate organization name
            const { data: existingOrg } = await supabase
              .from("alliance_organizations")
              .select("id")
              .ilike("name", args.name.trim())
              .eq("tenant_id", tenantId)
              .maybeSingle();
            
            if (existingOrg) {
              throw new Error(`Organization "${args.name}" already exists`);
            }

            const { data, error } = await supabase.from("alliance_organizations").insert({
              tenant_id: tenantId,
              created_by: userId,
              name: args.name,
              organization_type: args.organization_type || "customer",
              industry: args.industry || null,
              website: args.website || null,
              address: args.address || null,
              description: args.description || null,
              status: "active",
            }).select().single();
            
            if (error) throw error;
            result = { success: true, message: `Organization "${args.name}" created successfully as ${args.organization_type || 'customer'}`, data };

          } else if (functionName === "create_product") {
            // Check for duplicate product name
            const { data: existingProduct } = await supabase
              .from("offerings_products")
              .select("id")
              .ilike("name", args.name.trim())
              .eq("tenant_id", tenantId)
              .maybeSingle();
            
            if (existingProduct) {
              throw new Error(`Product "${args.name}" already exists`);
            }

            // If OEM name provided, try to find or create OEM
            let oemId = null;
            if (args.oem_name) {
              const { data: existingOem } = await supabase
                .from("offerings_oems")
                .select("id")
                .ilike("name", args.oem_name.trim())
                .eq("tenant_id", tenantId)
                .maybeSingle();
              
              if (existingOem) {
                oemId = existingOem.id;
              } else {
                // Create new OEM
                const { data: newOem, error: oemError } = await supabase.from("offerings_oems").insert({
                  tenant_id: tenantId,
                  created_by: userId,
                  name: args.oem_name,
                  status: "active",
                }).select("id").single();
                
                if (oemError) {
                  console.error("Error creating OEM:", oemError);
                } else {
                  oemId = newOem.id;
                }
              }
            }

            const { data, error } = await supabase.from("offerings_products").insert({
              tenant_id: tenantId,
              created_by: userId,
              name: args.name,
              description: args.description || null,
              category: args.category || null,
              oem_id: oemId,
              unique_selling_points: args.unique_selling_points || null,
              competitive_advantages: args.competitive_advantages || null,
              status: "active",
            }).select().single();
            
            if (error) throw error;
            result = { 
              success: true, 
              message: `Product "${args.name}" created successfully${oemId ? ` (linked to OEM: ${args.oem_name})` : ''}`, 
              data 
            };

          } else if (functionName === "create_oem") {
            // Check for duplicate OEM name
            const { data: existingOem } = await supabase
              .from("offerings_oems")
              .select("id")
              .ilike("name", args.name.trim())
              .eq("tenant_id", tenantId)
              .maybeSingle();
            
            if (existingOem) {
              throw new Error(`OEM "${args.name}" already exists`);
            }

            const { data, error } = await supabase.from("offerings_oems").insert({
              tenant_id: tenantId,
              created_by: userId,
              name: args.name,
              description: args.description || null,
              website: args.website || null,
              partnership_level: args.partnership_level || null,
              headquarters: args.headquarters || null,
              key_products: args.key_products || null,
              founded_year: args.founded_year || null,
              status: "active",
            }).select().single();
            
            if (error) throw error;
            result = { 
              success: true, 
              message: `OEM "${args.name}" created successfully${args.partnership_level ? ` with ${args.partnership_level} partnership` : ''}`, 
              data 
            };
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`Error executing ${functionName}:`, err);
          result = { success: false, message: `Failed to create: ${errorMessage}`, data: null };
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
