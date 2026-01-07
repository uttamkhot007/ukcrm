import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'generate_rfp_spec' | 'generate_rfp_response' | 'generate_section' | 'generate_compliance_matrix';
  solutionName: string;
  solutionDescription?: string;
  oemName?: string;
  customerName?: string;
  requirementsText?: string;
  sectionType?: string;
  model?: string;
  existingData?: any;
}

// Cynet-style technical specifications template
const CYNET_SPEC_TEMPLATE = `
Based on Cynet's approach to endpoint security specifications, generate comprehensive technical requirements including:
1. Platform Architecture & Deployment
2. Anti-Malware & Next-Gen AV capabilities
3. Behavioral Protection & EDR
4. Network Analytics & Lateral Movement Detection
5. User Behavior Analytics (UEBA)
6. Automated Investigation & Response
7. Deception Technology
8. Forensic Capabilities
9. Reporting & Integration
10. Support & SLA Requirements
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: RequestBody = await req.json();
    const { 
      action, 
      solutionName, 
      solutionDescription, 
      oemName, 
      customerName, 
      requirementsText,
      sectionType,
      model = 'google/gemini-2.5-flash',
      existingData 
    } = body;

    console.log(`Tender AI Assistant - Action: ${action}, Solution: ${solutionName}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_rfp_spec':
        systemPrompt = `You are an expert cybersecurity solutions architect specializing in creating comprehensive RFP technical specifications. Generate professional, detailed specifications following industry best practices similar to enterprise security solutions like Cynet, CrowdStrike, and SentinelOne.`;
        
        userPrompt = `Generate a comprehensive RFP Technical Specification document for the following solution:

Solution: ${solutionName}
${solutionDescription ? `Description: ${solutionDescription}` : ''}
${oemName ? `Vendor/OEM: ${oemName}` : ''}
${customerName ? `Customer: ${customerName}` : ''}

${CYNET_SPEC_TEMPLATE}

Return a JSON object with the following structure:
{
  "title": "RFP Technical Specification Title",
  "executive_summary": "Brief overview of requirements",
  "sections": [
    {
      "section_type": "platform_architecture",
      "section_title": "Platform Architecture & Deployment",
      "requirements": [
        {
          "id": "REQ-001",
          "description": "Detailed requirement description",
          "priority": "mandatory|desirable|optional",
          "compliance_column": true
        }
      ]
    }
  ],
  "evaluation_criteria": [
    { "criteria": "Technical Capability", "weight": 40 },
    { "criteria": "Vendor Experience", "weight": 20 },
    { "criteria": "Cost", "weight": 25 },
    { "criteria": "Support & SLA", "weight": 15 }
  ]
}

Generate at least 8 sections with 5-10 requirements each. Include technical specifications similar to enterprise endpoint security solutions.`;
        break;

      case 'generate_rfp_response':
        systemPrompt = `You are an expert technical writer specializing in RFP responses for cybersecurity solutions. Generate compelling, detailed responses that demonstrate compliance and value proposition. Follow best practices for winning RFP submissions.`;
        
        userPrompt = `Generate comprehensive RFP response content for the following:

Solution Being Proposed: ${solutionName}
${solutionDescription ? `Solution Description: ${solutionDescription}` : ''}
${oemName ? `Vendor/OEM: ${oemName}` : ''}
${customerName ? `Customer: ${customerName}` : ''}

${requirementsText ? `RFP Requirements to Address:\n${requirementsText}` : ''}

Generate a detailed RFP response with the following JSON structure:
{
  "executive_summary": "Compelling executive summary addressing key requirements",
  "company_profile": "Brief company/vendor profile",
  "technical_response": {
    "overview": "Technical approach overview",
    "sections": [
      {
        "section_type": "technical_specs",
        "section_title": "Technical Specifications Response",
        "content": "Detailed response content",
        "compliance_items": [
          {
            "requirement_id": "REQ-001",
            "requirement_text": "Original requirement",
            "response": "How we address this requirement",
            "compliance_status": "C|PC|NC|NA",
            "evidence": "Supporting evidence or references"
          }
        ]
      }
    ]
  },
  "implementation_approach": {
    "phases": [
      { "phase": "Phase 1", "description": "Description", "duration": "2 weeks" }
    ],
    "timeline": "Total implementation timeline"
  },
  "support_sla": {
    "support_tiers": ["24x7 Support", "Dedicated TAM"],
    "sla_commitments": ["99.9% Uptime", "4-hour Critical Response"]
  },
  "differentiators": ["Key differentiator 1", "Key differentiator 2"],
  "references": [
    { "company": "Reference Company", "industry": "Industry", "use_case": "Use case" }
  ]
}`;
        break;

      case 'generate_section':
        systemPrompt = `You are an expert technical writer for RFP responses. Generate detailed, professional content for the specified section.`;
        
        userPrompt = `Generate content for the following RFP section:

Section Type: ${sectionType}
Solution: ${solutionName}
${solutionDescription ? `Description: ${solutionDescription}` : ''}
${oemName ? `Vendor: ${oemName}` : ''}
${requirementsText ? `Requirements to address:\n${requirementsText}` : ''}
${existingData ? `Existing context:\n${JSON.stringify(existingData)}` : ''}

Return a JSON object:
{
  "section_title": "Section Title",
  "content": "Detailed section content in markdown format",
  "compliance_items": [
    {
      "requirement_text": "Requirement",
      "response": "How addressed",
      "compliance_status": "C|PC|NC|NA"
    }
  ]
}`;
        break;

      case 'generate_compliance_matrix':
        systemPrompt = `You are an expert at creating compliance matrices for RFP responses. Analyze requirements and determine compliance status with detailed justifications.`;
        
        userPrompt = `Generate a compliance matrix for the following:

Solution: ${solutionName}
${solutionDescription ? `Description: ${solutionDescription}` : ''}
${oemName ? `Vendor: ${oemName}` : ''}

Requirements to analyze:
${requirementsText || 'General cybersecurity requirements'}

Return a JSON array:
[
  {
    "s_no": 1,
    "requirement": "Requirement description",
    "compliance_status": "C|PC|NC",
    "vendor_response": "Detailed response",
    "remarks": "Additional notes"
  }
]

Use C = Compliant, PC = Partially Compliant, NC = Non-Compliant
Generate realistic compliance statuses with detailed vendor responses.`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 12000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Content preview:', content.substring(0, 1000));
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Tender AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
