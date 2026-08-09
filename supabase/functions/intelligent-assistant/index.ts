import { callAI, json, preflight } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { messages = [] } = await req.json().catch(() => ({}));

    const { text, error } = await callAI([
      {
        role: "system",
        content:
          "You are the in-app assistant for a multi-tenant cybersecurity CRM/ERP platform " +
          "(MEDDIC sales workflow, presales, projects, finance, HR). Answer concisely and " +
          "practically, referencing the relevant module when helpful. Never invent customer data.",
      },
      ...(Array.isArray(messages) ? messages.slice(-20) : []),
    ]);

    if (error) return json({ error });
    return json({ response: text, message: text });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
