import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";

const PERSONA: Record<string, string> = {
  vcfo: "a virtual CFO focused on cash flow, margin, collections and financial risk",
  vciso: "a virtual CISO focused on security posture, compliance exposure and incident risk",
  vcro: "a virtual CRO focused on pipeline health, win rates, quota coverage and revenue risk",
};

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { dashboardType = "vcro", metrics = {} } = await req.json().catch(() => ({}));
    const persona = PERSONA[String(dashboardType)] ?? PERSONA.vcro;

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            `You are ${persona} for a B2B cybersecurity services company. ` +
            `Reply with JSON only: {"predictions":[3 short strings],"recommendations":[3 short strings],"risks":[3 short strings]}. ` +
            `Each string must be one concrete, metric-grounded sentence.`,
        },
        { role: "user", content: `Current metrics:\n${JSON.stringify(metrics, null, 2)}` },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });

    const parsed = parseJson<{ predictions: string[]; recommendations: string[]; risks: string[] }>(text ?? "");
    if (!parsed) return json({ error: "Could not parse AI response" });

    return json({
      predictions: parsed.predictions ?? [],
      recommendations: parsed.recommendations ?? [],
      risks: parsed.risks ?? [],
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
