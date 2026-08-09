import { callAI, json, parseJson, preflight } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { documentType, verificationType, extractedText, employeeName, employeeData } =
      await req.json().catch(() => ({}));

    const { text, error } = await callAI(
      [
        {
          role: "system",
          content:
            "You are an HR background-verification analyst. Compare the document text against the employee record. " +
            'Reply with JSON only: {"match_confidence":0-100,"verdict":"verified|needs_review|mismatch",' +
            '"findings":[short strings],"discrepancies":[short strings],"extracted_fields":{}}. ' +
            "Never assert verification when key fields are missing.",
        },
        {
          role: "user",
          content:
            `Document type: ${documentType ?? ""}\nVerification type: ${verificationType ?? ""}\n` +
            `Employee: ${employeeName ?? ""}\nRecord: ${JSON.stringify(employeeData ?? {})}\n\n` +
            `Document text:\n${String(extractedText ?? "").slice(0, 12000)}`,
        },
      ],
      { jsonMode: true },
    );

    if (error) return json({ error });
    const parsed = parseJson<Record<string, unknown>>(text ?? "");
    if (!parsed) return json({ error: "Could not parse AI response" });

    return json({ analysis: parsed, ...parsed });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
