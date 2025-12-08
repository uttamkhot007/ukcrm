import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a friendly and helpful L1 Support Engineer / Analyst for a technology company. Your role is to:

1. Help customers with common questions about products and services
2. Guide users through basic troubleshooting steps
3. Provide information about licensing, installations, and configurations
4. Escalate complex issues by recommending the customer create a support ticket

Key guidelines:
- Be professional, friendly, and concise
- Ask clarifying questions when needed
- Provide step-by-step instructions when troubleshooting
- If you cannot resolve an issue, recommend creating a support ticket
- Never make up information about specific products or services
- Focus on common IT and software support scenarios

Common topics you can help with:
- Password resets and account access
- Software installation guidance
- License activation and renewal questions
- Basic troubleshooting (restart, clear cache, check connectivity)
- Explaining support processes and SLAs
- Directing users to appropriate resources

If the issue requires:
- Access to internal systems
- Product-specific technical knowledge
- Account changes or billing
- Complex debugging

Recommend creating a support ticket for human assistance.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing support assistant request with", messages.length, "messages");

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please create a support ticket." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    console.log("AI response generated successfully");

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Support assistant error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        response: "I'm experiencing technical difficulties. Please create a support ticket for assistance."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
