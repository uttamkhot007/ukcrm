import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TABLE: Record<string, string> = {
  product: "products",
  oem: "oems",
  technology: "technologies",
};

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json().catch(() => ({}));
    const { type, id, name, description, category, vendor, website } = body;
    const table = TABLE[String(type)];
    if (!table || !id) return json({ error: "Invalid type or id" }, 400);

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            "You enrich a cybersecurity offerings catalogue. Reply with JSON only: " +
            '{"description":"2-3 sentences","category":"short label","key_features":[up to 5 strings],' +
            '"use_cases":[up to 4 strings],"website":"https://... or empty"}. Use empty values when unsure — never invent URLs.',
        },
        {
          role: "user",
          content: `Type: ${type}\nName: ${name}\nExisting description: ${description ?? ""}\nCategory: ${category ?? ""}\nVendor: ${vendor ?? ""}\nWebsite: ${website ?? ""}`,
        },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });
    const parsed = parseJson<Record<string, unknown>>(text ?? "");
    if (!parsed) return json({ error: "Could not parse AI response" });

    const update: Record<string, unknown> = {};
    if (parsed.description) update.description = parsed.description;
    if (parsed.category && !category) update.category = parsed.category;
    if (parsed.website && !website) update.website = parsed.website;

    if (Object.keys(update).length && SERVICE_ROLE) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin.from(table).update(update).eq("id", id);
    }

    return json({ success: true, enriched: parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
