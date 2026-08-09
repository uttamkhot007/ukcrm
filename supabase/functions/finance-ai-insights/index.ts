import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { analysisType = "dashboard", metrics = {}, context = {} } = await req.json().catch(() => ({}));

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            "You are a chartered accountant advising an Indian B2B company (GST, TDS, Tally-style books). " +
            'Reply with JSON only: {"summary":"one paragraph","insights":[3 short strings],' +
            '"recommendations":[3 short strings],"risks":[2 short strings]}. Be specific and quote the numbers given.',
        },
        {
          role: "user",
          content: `Analysis type: ${analysisType}\nMetrics:\n${JSON.stringify(metrics, null, 2)}\nContext:\n${JSON.stringify(context)}`,
        },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });

    const parsed = parseJson<Record<string, unknown>>(text ?? "");
    if (!parsed) return json({ error: "Could not parse AI response" });

    return json({
      summary: parsed.summary ?? "",
      insights: parsed.insights ?? [],
      recommendations: parsed.recommendations ?? [],
      risks: parsed.risks ?? [],
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
