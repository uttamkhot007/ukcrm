import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  productName: string;
  productDescription?: string;
  productCategory?: string;
  oemName?: string;
  customerName?: string;
  docType: 'poc' | 'implementation';
  section: 'problem_statement' | 'proposed_solution' | 'scope' | 'use_cases' | 'milestones' | 'raci_matrix' | 'full';
  existingData?: any;
}

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
    const { productName, productDescription, productCategory, oemName, customerName, docType, section, existingData } = body;

    console.log(`Generating ${section} for ${docType} documentation: ${productName}`);

    const docTypeLabel = docType === 'poc' ? 'Proof of Concept (POC)' : 'Implementation';
    
    let systemPrompt = `You are an expert cybersecurity solutions architect helping create ${docTypeLabel} documentation for enterprise solutions. Generate professional, detailed content that is practical and actionable.`;
    
    let userPrompt = '';
    let responseFormat = '';

    switch (section) {
      case 'problem_statement':
        userPrompt = `Generate a comprehensive problem statement for a ${docTypeLabel} for the following cybersecurity solution:

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}
${oemName ? `Vendor: ${oemName}` : ''}
${customerName ? `Customer: ${customerName}` : ''}

Create a problem statement that:
1. Identifies key security challenges the customer faces
2. Highlights business impact of these challenges
3. Establishes the need for the proposed solution

Return as a JSON object with a "content" field containing the problem statement text (use markdown formatting).`;
        break;

      case 'proposed_solution':
        userPrompt = `Generate a comprehensive proposed solution for a ${docTypeLabel} for:

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}
${oemName ? `Vendor: ${oemName}` : ''}
${customerName ? `Customer: ${customerName}` : ''}
${existingData?.problemStatement ? `Problem Statement: ${existingData.problemStatement}` : ''}

Create a proposed solution that:
1. Directly addresses the identified challenges
2. Highlights key features and capabilities
3. Explains how the solution provides value
4. Includes deployment approach overview

Return as a JSON object with a "content" field containing the proposed solution text (use markdown formatting).`;
        break;

      case 'scope':
        userPrompt = `Generate scope inclusions and exclusions for a ${docTypeLabel} for:

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}
${oemName ? `Vendor: ${oemName}` : ''}

Return a JSON object with:
{
  "inclusions": ["item 1", "item 2", ...],
  "exclusions": ["item 1", "item 2", ...]
}

Generate 6-10 realistic scope inclusions and 4-6 scope exclusions typical for this type of ${docTypeLabel}.`;
        break;

      case 'use_cases':
        userPrompt = `Generate ${docType === 'poc' ? 'POC' : 'implementation'} use cases for:

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}

Return a JSON array of use cases:
[
  {
    "id": "UC-001",
    "title": "Use case title",
    "description": "Detailed description",
    "priority": "high|medium|low",
    "success_criteria": ["criteria 1", "criteria 2"],
    "test_steps": ["step 1", "step 2"]
  }
]

Generate 5-8 comprehensive use cases that demonstrate the solution's value.`;
        break;

      case 'milestones':
        const totalWeeks = docType === 'poc' ? 4 : 12;
        userPrompt = `Generate ${docTypeLabel} milestones and timeline for:

Product: ${productName}
${productCategory ? `Category: ${productCategory}` : ''}

Total duration: ${totalWeeks} weeks

Return a JSON array of milestones for a Gantt chart:
[
  {
    "id": "M1",
    "name": "Milestone name",
    "description": "Description",
    "start_week": 1,
    "end_week": 2,
    "dependencies": [],
    "deliverables": ["deliverable 1"],
    "status": "pending"
  }
]

Generate 5-8 milestones that cover the entire ${docTypeLabel} lifecycle.`;
        break;

      case 'raci_matrix':
        userPrompt = `Generate a RACI matrix for a ${docTypeLabel} for:

Product: ${productName}
${productCategory ? `Category: ${productCategory}` : ''}

Return a JSON array:
[
  {
    "activity": "Activity name",
    "project_manager": "R|A|C|I",
    "technical_lead": "R|A|C|I",
    "customer_poc": "R|A|C|I",
    "vendor_support": "R|A|C|I",
    "security_team": "R|A|C|I"
  }
]

R = Responsible, A = Accountable, C = Consulted, I = Informed

Generate 8-12 key activities typical for this type of ${docTypeLabel}.`;
        break;

      case 'full':
        userPrompt = `Generate complete ${docTypeLabel} documentation for:

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}
${oemName ? `Vendor: ${oemName}` : ''}
${customerName ? `Customer: ${customerName}` : ''}

Return a comprehensive JSON object with all sections:
{
  "problem_statement": "markdown text",
  "proposed_solution": "markdown text",
  "scope_inclusions": ["item 1", ...],
  "scope_exclusions": ["item 1", ...],
  "use_cases": [{"id": "UC-001", "title": "...", "description": "...", "priority": "high|medium|low", "success_criteria": [...], "test_steps": [...]}],
  "milestones": [{"id": "M1", "name": "...", "description": "...", "start_week": 1, "end_week": 2, "dependencies": [], "deliverables": [...], "status": "pending"}],
  "raci_matrix": [{"activity": "...", "project_manager": "R", "technical_lead": "A", "customer_poc": "C", "vendor_support": "I", "security_team": "C"}]
}`;
        break;
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
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
      console.error('Content:', content.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating documentation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
