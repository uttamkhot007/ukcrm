/**
 * template-autofill
 *
 * Fills a tenant document template using that tenant's own CRM data
 * (deal, contact, project or employee) with Lovable AI. Nothing is written to
 * the database here — the caller reviews and edits the draft before finalising.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-3.6-flash";

type Row = Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Collects the section keys a template expects the AI to write. */
function templateSections(content: Row): string[] {
  const skip = new Set(["role", "solution", "theme"]);
  const keys = Object.keys(content ?? {}).filter((k) => !skip.has(k));
  return keys.length > 0 ? keys : ["introduction", "scope", "commercials", "next_steps"];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SERVICE_ROLE) return json({ error: "Server not configured" }, 500);
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured for this workspace" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as Row;
    const tenantId = body.tenant_id;
    const templateId = body.template_id;
    const sourceType = String(body.source_type ?? "");
    const sourceId = body.source_id;
    const instructions = typeof body.instructions === "string" ? body.instructions.slice(0, 2000) : "";

    if (!isUuid(tenantId)) return json({ error: "tenant_id must be a valid id" }, 400);
    if (!isUuid(templateId)) return json({ error: "template_id must be a valid id" }, 400);
    if (!["deal", "contact", "project", "employee"].includes(sourceType)) {
      return json({ error: "source_type must be deal, contact, project or employee" }, 400);
    }
    if (!isUuid(sourceId)) return json({ error: "source_id must be a valid id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // The caller must be an active member of this workspace.
    const { data: membership } = await admin
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const { data: isAdmin } = await admin.rpc("is_platform_admin", { _user_id: userId });
    if (!membership && !isAdmin) return json({ error: "Forbidden" }, 403);

    // Template — always scoped to the caller's tenant.
    const { data: template, error: tplErr } = await admin
      .from("document_templates")
      .select("id, name, description, template_type, content, header_content, footer_content, branding")
      .eq("id", templateId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (tplErr) return json({ error: "Template lookup failed", details: tplErr.message }, 500);
    if (!template) return json({ error: "Template not found in this workspace" }, 404);

    // CRM context — every query is tenant-scoped.
    const context: Row = { source_type: sourceType };

    if (sourceType === "deal") {
      const { data: deal } = await admin
        .from("deals")
        .select(
          "id, title, description, value, stage, probability, expected_close_date, organization_name, problem_requirement, deal_type, existing_solution, quantity, buying_timeline, tentative_budget, next_steps, requirement_category, customer_environment, contact_id",
        )
        .eq("id", sourceId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!deal) return json({ error: "Deal not found in this workspace" }, 404);
      context.deal = deal;

      if (deal.contact_id) {
        const { data: contact } = await admin
          .from("contacts")
          .select("name, email, phone, company, designation, department")
          .eq("id", deal.contact_id)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        context.contact = contact ?? null;
      }

      const { data: dealProducts } = await admin
        .from("deal_products")
        .select("quantity, unit_price, discount_percent, total_price, notes, product_id")
        .eq("deal_id", deal.id);
      if (dealProducts?.length) {
        const ids = dealProducts.map((p: Row) => p.product_id).filter(Boolean);
        const { data: catalog } = ids.length
          ? await admin
              .from("product_catalog")
              .select("id, name, sku, description, unit_price, currency, category")
              .in("id", ids)
              .eq("tenant_id", tenantId)
          : { data: [] as Row[] };
        const byId = new Map((catalog ?? []).map((c: Row) => [c.id, c]));
        context.products = dealProducts.map((p: Row) => ({ ...p, product: byId.get(p.product_id) ?? null }));
      }
    } else if (sourceType === "contact") {
      const { data: contact } = await admin
        .from("contacts")
        .select("id, name, email, phone, company, designation, department, notes, role_in_deal, seniority_level")
        .eq("id", sourceId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!contact) return json({ error: "Contact not found in this workspace" }, 404);
      context.contact = contact;
    } else if (sourceType === "project") {
      const { data: project } = await admin
        .from("projects")
        .select(
          "id, name, description, status, priority, project_type, start_date, end_date, budget, progress, client_name, scope_inclusions, scope_exclusions, deliverables, project_category, duration_weeks",
        )
        .eq("id", sourceId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!project) return json({ error: "Project not found in this workspace" }, 404);
      context.project = project;
    } else {
      const { data: employee } = await admin
        .from("profiles")
        .select("user_id, full_name, email, department, job_title, employee_code, hire_date, location, employment_status")
        .eq("id", sourceId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!employee) return json({ error: "Employee not found in this workspace" }, 404);
      context.employee = employee;
    }

    const branding = (template.branding ?? {}) as Row;
    const sections = templateSections(template.content as Row);

    const systemPrompt =
      "You draft business documents for an enterprise B2B technology company. " +
      "Use ONLY the supplied workspace data — never invent customer names, prices, dates or commitments. " +
      "When a fact is missing, write a clearly marked placeholder such as [TO CONFIRM: pricing]. " +
      "Write concise, professional prose suitable for a customer-facing document.";

    const userPrompt = [
      `Template: ${template.name} (${template.template_type})`,
      template.description ? `Template purpose: ${template.description}` : "",
      `Company: ${branding.companyName ?? "the tenant"}`,
      `Sections to fill (return one entry per key): ${sections.join(", ")}`,
      instructions ? `Extra instructions from the user: ${instructions}` : "",
      "Template skeleton (JSON):",
      JSON.stringify(template.content ?? {}).slice(0, 6000),
      "Workspace CRM data (JSON):",
      JSON.stringify(context).slice(0, 12000),
      "",
      'Respond with JSON only: {"title": string, "fields": { "<section key>": string }, "notes": string, "missing": string[] }.',
      "`notes` summarises assumptions; `missing` lists data that a human must confirm before sending.",
    ]
      .filter(Boolean)
      .join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "AI rate limit reached — please retry shortly" }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted for this workspace" }, 402);
    if (!aiRes.ok) {
      const details = await aiRes.text();
      console.error(`AI gateway failed [${aiRes.status}]: ${details}`);
      return json({ error: "AI generation failed" }, 502);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Row = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const fields: Row = {};
    for (const key of sections) {
      const value = parsed.fields?.[key];
      fields[key] = typeof value === "string" ? value : value ? JSON.stringify(value) : "";
    }

    return json({
      title: typeof parsed.title === "string" && parsed.title ? parsed.title : template.name,
      fields,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String).slice(0, 20) : [],
      model: MODEL,
      template: { id: template.id, name: template.name, template_type: template.template_type },
    });
  } catch (error) {
    console.error("template-autofill error", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
