import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { id, name, description, area_type } = await req.json().catch(() => ({}));
    if (!id) return json({ error: "Missing id" }, 400);

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            "You enrich cybersecurity problem areas for a solutions catalogue. Reply with JSON only: " +
            '{"description":"2-3 sentences on the business pain and impact","typical_symptoms":[up to 4 strings],' +
            '"recommended_controls":[up to 4 strings]}.',
        },
        { role: "user", content: `Problem area: ${name}\nType: ${area_type ?? ""}\nExisting: ${description ?? ""}` },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });
    const parsed = parseJson<Record<string, unknown>>(text ?? "");
    if (!parsed) return json({ error: "Could not parse AI response" });

    if (parsed.description && SERVICE_ROLE) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin.from("problem_areas").update({ description: parsed.description }).eq("id", id);
    }

    return json({ success: true, enriched: parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
