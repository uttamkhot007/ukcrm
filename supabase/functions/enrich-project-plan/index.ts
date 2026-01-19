import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    // Call Lovable AI to generate project plan
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a project management expert. Generate a comprehensive project plan for:
Project Name: ${project.name}
Description: ${project.description || "N/A"}
Type: ${project.project_category || project.project_type || "Service"}
Duration: ${project.duration_weeks || 12} weeks

Generate a JSON response with:
1. phases: Array of project phases with name, duration_weeks, estimated_hours
2. tasks: Array of tasks with title, description, phase_number, estimated_hours, priority
3. milestones: Array of milestones with name, description, phase_number

Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a project management expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from AI response
    let planData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI-generated plan");
    }

    // Create phases
    if (planData.phases && Array.isArray(planData.phases)) {
      for (let i = 0; i < planData.phases.length; i++) {
        const phase = planData.phases[i];
        await supabase.from("project_phases").insert({
          project_id: projectId,
          phase_number: i + 1,
          name: phase.name,
          description: phase.description || null,
          duration_weeks: phase.duration_weeks || 2,
          estimated_hours: phase.estimated_hours || null,
          status: "pending",
        });
      }
    }

    // Fetch created phases to get IDs
    const { data: phases } = await supabase
      .from("project_phases")
      .select("id, phase_number")
      .eq("project_id", projectId)
      .order("phase_number");

    const phaseMap = new Map(phases?.map(p => [p.phase_number, p.id]) || []);

    // Create tasks
    if (planData.tasks && Array.isArray(planData.tasks)) {
      let taskNumber = 1;
      for (const task of planData.tasks) {
        const phaseId = phaseMap.get(task.phase_number || 1) || null;
        await supabase.from("project_tasks").insert({
          project_id: projectId,
          phase_id: phaseId,
          task_number: `TASK-${String(taskNumber++).padStart(3, "0")}`,
          title: task.title,
          description: task.description || null,
          estimated_hours: task.estimated_hours || null,
          priority: task.priority || "medium",
          status: "todo",
          created_by: project.created_by,
        });
      }
    }

    // Create milestones
    if (planData.milestones && Array.isArray(planData.milestones)) {
      for (const milestone of planData.milestones) {
        const phaseId = phaseMap.get(milestone.phase_number || 1) || null;
        // Calculate due date based on phase
        const weeksFromStart = (milestone.phase_number || 1) * 2;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + weeksFromStart * 7);

        await supabase.from("project_milestones").insert({
          project_id: projectId,
          phase_id: phaseId,
          name: milestone.name,
          description: milestone.description || null,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
          created_by: project.created_by,
        });
      }
    }

    // Update project with AI enrichment data
    await supabase
      .from("projects")
      .update({
        ai_enriched_plan: planData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    return new Response(
      JSON.stringify({ success: true, message: "Project plan enriched successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error enriching project:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
    );
  }
});
