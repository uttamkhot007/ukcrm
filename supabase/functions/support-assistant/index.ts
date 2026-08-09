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
          "You are a first-line support assistant for a cybersecurity services platform. " +
          "Give clear troubleshooting steps. If the issue needs human action, tell the user to raise a support ticket.",
      },
      ...(Array.isArray(messages) ? messages.slice(-20) : []),
    ]);

    if (error) return json({ error });
    return json({ response: text });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
