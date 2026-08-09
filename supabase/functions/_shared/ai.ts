export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const MODEL = "google/gemini-2.5-flash";

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function preflight(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return null;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Calls the Lovable AI gateway. Returns either { text } or { error } — never throws
 * for upstream 429/402 so callers can surface a friendly message.
 */
export async function callAI(
  messages: ChatMessage[],
  opts: { jsonMode?: boolean; model?: string } = {},
): Promise<{ text?: string; error?: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { error: "AI is not configured (missing gateway key)." };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      messages,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429) return { error: "Rate limit reached. Please retry shortly." };
  if (res.status === 402) return { error: "AI credits exhausted. Please contact your administrator." };
  if (!res.ok) return { error: `AI gateway error (${res.status})` };

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { text };
}

/** Parses a model response into JSON, tolerating code fences and surrounding prose. */
export function parseJson<T = Record<string, unknown>>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
