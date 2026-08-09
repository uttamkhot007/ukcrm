import { corsHeaders, json, preflight } from "../_shared/ai.ts";

const FALLBACK: Record<string, number> = { "USD:INR": 87.5, "INR:USD": 1 / 87.5 };

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    let from = "USD";
    let to = "INR";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      from = String(body.from ?? from).toUpperCase();
      to = String(body.to ?? to).toUpperCase();
    }

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      return json({ error: "Invalid currency code" }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);

    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.[to];
        if (typeof rate === "number") {
          return json({ from, to, rate, date: data.date ?? today });
        }
      }
    } catch (_) {
      // fall through to fallback rate
    }

    const fallback = FALLBACK[`${from}:${to}`];
    if (typeof fallback === "number") {
      return json({ from, to, rate: fallback, date: today, stale: true });
    }
    return json({ error: `No rate available for ${from}->${to}` }, 502);
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
