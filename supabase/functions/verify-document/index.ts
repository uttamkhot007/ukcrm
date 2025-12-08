import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentType, verificationType, extractedText, employeeName, employeeData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (verificationType) {
      case "background":
        systemPrompt = `You are a background verification specialist AI. Analyze the provided document and extract relevant information for employee background verification. Look for:
- Employment history
- Reference information
- Address verification
- Identity documents
- Any red flags or inconsistencies

Provide a structured analysis with:
1. Extracted key information
2. Verification status (verified, needs_review, failed)
3. Confidence score (0-100)
4. Any concerns or notes`;
        userPrompt = `Analyze this ${documentType} document for background verification of employee "${employeeName}".

Document content:
${extractedText}

Employee data for cross-verification:
${JSON.stringify(employeeData, null, 2)}

Provide your analysis in JSON format with fields: extracted_info, status, confidence_score, concerns, recommendations`;
        break;

      case "crime":
        systemPrompt = `You are a criminal record verification specialist AI. Analyze the provided document for criminal record verification. Look for:
- Police clearance certificates
- Court records
- Background check reports
- Any criminal history mentions
- Verification authenticity markers

Provide a structured analysis with:
1. Document type and validity assessment
2. Verification status (clear, has_records, needs_review, failed)
3. Confidence score (0-100)
4. Any findings or notes`;
        userPrompt = `Analyze this ${documentType} document for criminal record verification of employee "${employeeName}".

Document content:
${extractedText}

Provide your analysis in JSON format with fields: document_type, validity_assessment, status, confidence_score, findings, recommendations`;
        break;

      case "education":
        systemPrompt = `You are an education verification specialist AI. Analyze the provided document for education credential verification. Look for:
- Institution name and accreditation
- Degree/diploma/certificate details
- Dates of attendance and graduation
- Grades or marks obtained
- Document authenticity markers (seals, signatures, registration numbers)

Provide a structured analysis with:
1. Extracted education details
2. Verification status (verified, needs_review, failed)
3. Confidence score (0-100)
4. Any concerns about authenticity`;
        userPrompt = `Analyze this ${documentType} document for education verification of employee "${employeeName}".

Document content:
${extractedText}

Employee's claimed education data:
${JSON.stringify(employeeData, null, 2)}

Provide your analysis in JSON format with fields: institution, degree, year, extracted_details, status, confidence_score, authenticity_concerns, recommendations`;
        break;

      default:
        throw new Error("Invalid verification type");
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
        temperature: 0.3,
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiResponse = await response.json();
    const analysisContent = aiResponse.choices?.[0]?.message?.content || "";

    // Try to parse as JSON
    let analysis;
    try {
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = { raw_analysis: analysisContent, status: "needs_review" };
      }
    } catch {
      analysis = { raw_analysis: analysisContent, status: "needs_review" };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      verificationType 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
