import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VINCA_KNOWLEDGE = `
# About Vinca Cyber Security

Vinca Cyber Security is a leading cybersecurity company providing comprehensive security solutions for enterprises.

## Our Offerings:

### 1. Security Operations Center (SOC) Services
- 24x7 monitoring and threat detection
- Incident response and management
- Security analytics and reporting
- SIEM implementation and management

### 2. Vulnerability Assessment & Penetration Testing (VAPT)
- Network penetration testing
- Web application security testing
- Mobile application security assessment
- Cloud security assessment

### 3. Compliance & Governance
- ISO 27001 implementation
- GDPR compliance
- PCI DSS compliance
- SOC 2 compliance
- HIPAA compliance

### 4. Identity & Access Management
- SSO implementation
- Multi-factor authentication
- Privileged access management
- Identity governance

### 5. Endpoint Security
- EDR/XDR solutions
- Endpoint protection platforms
- Mobile device management
- Data loss prevention

### 6. Cloud Security
- Cloud security posture management
- Cloud workload protection
- Container security
- DevSecOps integration

### 7. Training & Awareness
- Security awareness programs
- Phishing simulations
- Executive security training
- Technical security certifications

## Key Industries We Serve:
- Banking & Financial Services
- Healthcare
- Manufacturing
- IT & Technology
- Government
- Retail & E-commerce

## Our Differentiators:
- Certified security professionals (CISSP, CEH, OSCP)
- 24x7 global support
- Customized solutions
- Proven track record with Fortune 500 companies
- Strong partnership ecosystem
`;

const SYSTEM_PROMPT = `You are Vinca AI Assistant - a helpful, knowledgeable assistant for Vinca Cyber Security employees. You can communicate in multiple Indian languages including Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, and English.

${VINCA_KNOWLEDGE}

## Your Capabilities:
1. **Employee Queries**: Help with HR policies, leave requests, attendance, training, benefits, and general workplace questions.
2. **Customer Information**: Provide insights about customers, their industries, and their security needs.
3. **Vinca Offerings**: Explain our products, services, and solutions in detail.
4. **Technical Support**: Basic IT support and security best practices.

## Language Instructions:
- Detect the language of the user's message and respond in the same language.
- If the user writes in Hindi, respond in Hindi (using Devanagari script).
- If the user writes in Tamil, respond in Tamil script.
- Similarly for other Indian languages.
- Always be respectful and professional.
- Use simple, clear language appropriate for the detected language.

## Example Responses:
- For Hindi: "नमस्ते! मैं विंका AI असिस्टेंट हूं। मैं आपकी कैसे मदद कर सकता हूं?"
- For Tamil: "வணக்கம்! நான் Vinca AI உதவியாளர். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?"
- For Telugu: "నమస్కారం! నేను Vinca AI సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?"

Always be helpful, accurate, and maintain a professional tone. If you don't know something, say so honestly.`;

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
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Employee assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
