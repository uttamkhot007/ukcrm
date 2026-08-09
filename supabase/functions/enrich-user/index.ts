import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { userName, organizationName } = await req.json().catch(() => ({}));
    if (!userName) return json({ error: "Missing userName" }, 400);

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            "You infer likely professional profile attributes for a B2B contact. Reply with JSON only: " +
            '{"current_title":"","department":"","seniority_level":"C-Level|VP|Director|Manager|Individual Contributor|","linkedin_url":""}. ' +
            "Leave a field as an empty string when you are not reasonably confident. Never fabricate a LinkedIn URL.",
        },
        { role: "user", content: `Contact: ${userName}\nOrganization: ${organizationName ?? "Unknown"}` },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });
    const parsed = parseJson<Record<string, string>>(text ?? "");
    if (!parsed) return json({ error: "Could not parse AI response" });

    return json({
      current_title: parsed.current_title || null,
      department: parsed.department || null,
      seniority_level: parsed.seniority_level || null,
      linkedin_url: parsed.linkedin_url?.startsWith("http") ? parsed.linkedin_url : null,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
