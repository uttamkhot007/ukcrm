/**
 * agent-run
 *
 * One generic runtime for every specialist agent (see `../_shared/agents.ts`).
 * It runs a bounded tool-calling loop against the Lovable AI gateway, records
 * every step for the live timeline, and persists any produced deliverable.
 *
 * Hard rules:
 *  - The caller's JWT decides the tenant. The model can never widen it.
 *  - Data tools are read-only and restricted to each agent's table whitelist.
 *  - Nothing is written to business tables; only runs/steps/deliverables.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { AGENTS, getAgent } from "../_shared/agents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const DEFAULT_MODEL = "google/gemini-3.6-flash";
const MAX_STEPS = 12;

type Row = Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Strips anything that must never reach dangerouslySetInnerHTML. */
function cleanHtml(html: string): string {
  return String(html ?? "")
    .replace(/<\s*(script|style|iframe|object|embed|form)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}

interface DeliverableArgs {
  title?: string;
  deliverable_type?: string;
  summary?: string;
  kpis?: { label?: string; value?: string; delta?: string; tone?: string }[];
  sections?: { heading?: string; html?: string }[];
  tables?: { title?: string; columns?: string[]; rows?: string[][] }[];
  next_steps?: string[];
}

function renderDeliverableHtml(a: DeliverableArgs): string {
  const parts: string[] = [];
  if (a.summary) {
    parts.push(`<section data-block="summary"><h2>Executive Summary</h2><p>${esc(a.summary)}</p></section>`);
  }
  if (a.kpis?.length) {
    const cards = a.kpis
      .map(
        (k) =>
          `<div class="kpi" data-tone="${esc(k.tone ?? "neutral")}"><span class="kpi-label">${esc(k.label)}</span>` +
          `<span class="kpi-value">${esc(k.value)}</span>` +
          (k.delta ? `<span class="kpi-delta">${esc(k.delta)}</span>` : "") +
          `</div>`,
      )
      .join("");
    parts.push(`<section data-block="kpis"><div class="kpi-grid">${cards}</div></section>`);
  }
  for (const s of a.sections ?? []) {
    parts.push(
      `<section data-block="section"><h2>${esc(s.heading)}</h2>${cleanHtml(s.html ?? "")}</section>`,
    );
  }
  for (const t of a.tables ?? []) {
    const head = (t.columns ?? []).map((c) => `<th>${esc(c)}</th>`).join("");
    const body = (t.rows ?? [])
      .map((r) => `<tr>${(r ?? []).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("");
    parts.push(
      `<section data-block="table">${t.title ? `<h3>${esc(t.title)}</h3>` : ""}` +
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`,
    );
  }
  if (a.next_steps?.length) {
    parts.push(
      `<section data-block="next"><h2>Next Steps</h2><ol>${a.next_steps
        .map((s) => `<li>${esc(s)}</li>`)
        .join("")}</ol></section>`,
    );
  }
  return parts.join("\n");
}

function toolSchemas(tables: string[], extra: string[]) {
  const tools: Row[] = [
    {
      type: "function",
      function: {
        name: "query_module_data",
        description:
          "Read rows from one of the workspace's business tables. Always tenant-scoped and read-only. " +
          `Allowed tables: ${tables.join(", ")}.`,
        parameters: {
          type: "object",
          properties: {
            table: { type: "string", description: "Table name from the allowed list" },
            columns: { type: "string", description: "Comma separated columns, or * for all" },
            filters: {
              type: "array",
              description: "Equality/range filters",
              items: {
                type: "object",
                properties: {
                  column: { type: "string" },
                  op: { type: "string", description: "eq, neq, gt, gte, lt, lte, like, ilike, is" },
                  value: { type: "string" },
                },
                required: ["column", "op", "value"],
              },
            },
            order_by: { type: "string" },
            descending: { type: "boolean" },
            limit: { type: "number", description: "Max 200" },
          },
          required: ["table"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "render_deliverable",
        description:
          "Produce the finished, client-ready deliverable. Call this last, once, when the user asked for a document, report or analysis pack.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            deliverable_type: {
              type: "string",
              description: "document, report, analysis, matrix, plan or letter",
            },
            summary: { type: "string", description: "Executive summary paragraph" },
            kpis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                  delta: { type: "string" },
                  tone: { type: "string", description: "good, warn, bad or neutral" },
                },
                required: ["label", "value"],
              },
            },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  html: { type: "string", description: "Semantic HTML body for this section" },
                },
                required: ["heading", "html"],
              },
            },
            tables: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  columns: { type: "array", items: { type: "string" } },
                  rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                },
                required: ["columns", "rows"],
              },
            },
            next_steps: { type: "array", items: { type: "string" } },
          },
          required: ["title", "sections"],
        },
      },
    },
  ];

  // Always available: the agent may come back to the user for the details it
  // cannot infer. The run pauses and the UI renders these as a form.
  tools.push({
    type: "function",
    function: {
      name: "ask_user",
      description:
        "Pause and ask the user for the details you are missing. Ask for everything you need in ONE call. " +
        "Use it before creating any record when required fields are unknown.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "One line explaining why you need these details" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Short field key, e.g. deal_size" },
                label: { type: "string" },
                help: { type: "string", description: "Hint, e.g. what was found in the workspace" },
                type: { type: "string", description: "text, number, date, select or textarea" },
                options: { type: "array", items: { type: "string" } },
                required: { type: "boolean" },
                suggestion: { type: "string", description: "Pre-filled value if you have a good guess" },
              },
              required: ["id", "label"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  if (extra.includes("list_templates")) {
    tools.push({
      type: "function",
      function: {
        name: "list_templates",
        description: "List the workspace's document templates, optionally filtered by a search term.",
        parameters: {
          type: "object",
          properties: { search: { type: "string" }, limit: { type: "number" } },
        },
      },
    });
  }
  if (extra.includes("get_template")) {
    tools.push({
      type: "function",
      function: {
        name: "get_template",
        description: "Fetch one document template with its full structure by id.",
        parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
    });
  }
  if (extra.includes("create_account")) {
    tools.push({
      type: "function",
      function: {
        name: "create_account",
        description: "Create a customer account (organization) when it does not already exist.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            industry: { type: "string" },
            website: { type: "string" },
            description: { type: "string" },
          },
          required: ["name"],
        },
      },
    });
  }
  if (extra.includes("create_contact")) {
    tools.push({
      type: "function",
      function: {
        name: "create_contact",
        description: "Create a contact person on an account when they do not already exist.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            company: { type: "string", description: "Account / organization name" },
            email: { type: "string" },
            phone: { type: "string" },
            designation: { type: "string" },
            alliance_organization_id: { type: "string" },
          },
          required: ["name"],
        },
      },
    });
  }
  if (extra.includes("create_product")) {
    tools.push({
      type: "function",
      function: {
        name: "create_product",
        description: "Add a product or service to the catalog when the proposed solution does not exist yet.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string", description: "product or service category" },
            description: { type: "string" },
            unit_price: { type: "number" },
          },
          required: ["name"],
        },
      },
    });
  }
  if (extra.includes("create_deal")) {
    tools.push({
      type: "function",
      function: {
        name: "create_deal",
        description:
          "Create a deal in the sales pipeline. Only call this once every required detail is known " +
          "(account, deal type, proposed solution, quantity, value, expected close date, contact).",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            organization_name: { type: "string" },
            alliance_organization_id: { type: "string" },
            contact_id: { type: "string" },
            deal_type: { type: "string" },
            proposed_solution: { type: "string", description: "Product or service being proposed" },
            product_id: { type: "string", description: "product_catalog id, if it exists" },
            quantity: { type: "number" },
            value: { type: "number", description: "Deal size in INR" },
            expected_close_date: { type: "string", description: "YYYY-MM-DD" },
            stage: { type: "string", description: "pipeline, qualified, proposal, negotiation" },
            description: { type: "string" },
            problem_requirement: { type: "string" },
          },
          required: ["title", "organization_name", "value"],
        },
      },
    });
  }
  return tools;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const started = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  let runId: string | null = null;

  try {
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured." }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const agentKey: string = body.agentKey ?? "orchestrator";
    const instruction: string = (body.instruction ?? "").toString().trim();
    const context: Row = body.context ?? {};
    const attachments: { name?: string; text?: string }[] = Array.isArray(body.attachments)
      ? body.attachments.slice(0, 4)
      : [];

    if (!instruction) return json({ error: "An instruction is required." }, 400);
    const agent = getAgent(agentKey);
    if (!agent) return json({ error: `Unknown agent: ${agentKey}` }, 400);

    // Tenant comes from the caller's membership, never from the request body.
    const { data: membership } = await admin
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const requestedTenant = typeof body.tenantId === "string" ? body.tenantId : null;
    let tenantId = membership?.tenant_id ?? null;
    if (requestedTenant) {
      const { data: allowed } = await admin
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", requestedTenant)
        .maybeSingle();
      if (allowed) tenantId = requestedTenant;
    }
    if (!tenantId) return json({ error: "No workspace found for this user." }, 403);

    const { data: run } = await admin
      .from("ai_agent_runs")
      .insert({
        tenant_id: tenantId,
        agent_key: agent.key,
        instruction,
        module: agent.module,
        context,
        related_record_type: context.recordType ?? null,
        related_record_id: context.recordId ?? null,
        status: "running",
        model: agent.model ?? DEFAULT_MODEL,
        created_by: user.id,
      })
      .select("id")
      .single();
    runId = run?.id ?? null;

    let stepIndex = 0;
    const logStep = async (step: Row) => {
      if (!runId) return;
      await admin.from("ai_agent_run_steps").insert({
        tenant_id: tenantId,
        run_id: runId,
        step_index: stepIndex++,
        ...step,
      });
    };

    // ---------- tool implementations ----------
    async function runTool(name: string, args: Row): Promise<Row> {
      if (name === "query_module_data") {
        const table = String(args.table ?? "");
        if (!agent!.tables.includes(table)) {
          return { error: `Table "${table}" is not available to this agent.` };
        }
        let q = admin
          .from(table)
          .select(typeof args.columns === "string" && args.columns.trim() ? args.columns : "*")
          .eq("tenant_id", tenantId)
          .limit(Math.min(Number(args.limit) || 25, 200));
        for (const f of Array.isArray(args.filters) ? args.filters : []) {
          const col = String(f.column ?? "");
          const op = String(f.op ?? "eq");
          const val = f.value;
          if (!col || col === "tenant_id") continue;
          if (["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike"].includes(op)) {
            // deno-lint-ignore no-explicit-any
            q = (q as any)[op](col, val);
          } else if (op === "is") {
            // deno-lint-ignore no-explicit-any
            q = (q as any).is(col, val === "null" ? null : val === "true");
          }
        }
        if (args.order_by) q = q.order(String(args.order_by), { ascending: !args.descending });
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { table, count: data?.length ?? 0, rows: data ?? [] };
      }

      if (name === "list_templates") {
        let q = admin
          .from("document_templates")
          .select("id,name,template_type,description,department")
          .eq("tenant_id", tenantId)
          .limit(Math.min(Number(args.limit) || 25, 60));
        if (args.search) q = q.ilike("name", `%${String(args.search)}%`);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { templates: data ?? [] };
      }

      if (name === "get_template") {
        const { data, error } = await admin
          .from("document_templates")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id", String(args.id))
          .maybeSingle();
        if (error) return { error: error.message };
        return { template: data ?? null };
      }

      // ---- write tools (only reachable when the agent whitelists them) ----
      const canWrite = (t: string) => agent!.tools.includes(t);

      if (name === "create_account") {
        if (!canWrite(name)) return { error: "This agent cannot create accounts." };
        const accountName = String(args.name ?? "").trim();
        if (!accountName) return { error: "An account name is required." };
        const { data: existing } = await admin
          .from("alliance_organizations")
          .select("id,name")
          .eq("tenant_id", tenantId)
          .ilike("name", accountName)
          .maybeSingle();
        if (existing) return { created: false, account: existing, note: "Account already existed." };
        const { data, error } = await admin
          .from("alliance_organizations")
          .insert({
            tenant_id: tenantId,
            name: accountName,
            industry: args.industry ?? null,
            website: args.website ?? null,
            description: args.description ?? null,
            organization_type: "customer",
            status: "active",
            created_by: user.id,
          })
          .select("id,name")
          .single();
        if (error) return { error: error.message };
        return { created: true, account: data };
      }

      if (name === "create_contact") {
        if (!canWrite(name)) return { error: "This agent cannot create contacts." };
        const contactName = String(args.name ?? "").trim();
        if (!contactName) return { error: "A contact name is required." };
        const { data, error } = await admin
          .from("contacts")
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            created_by: user.id,
            name: contactName,
            company: args.company ?? null,
            email: args.email ?? null,
            phone: args.phone ?? null,
            designation: args.designation ?? null,
            alliance_organization_id: args.alliance_organization_id ?? null,
            source_type: "agent",
          })
          .select("id,name,company")
          .single();
        if (error) return { error: error.message };
        return { created: true, contact: data };
      }

      if (name === "create_product") {
        if (!canWrite(name)) return { error: "This agent cannot create products." };
        const productName = String(args.name ?? "").trim();
        if (!productName) return { error: "A product name is required." };
        const { data: existing } = await admin
          .from("product_catalog")
          .select("id,name")
          .eq("tenant_id", tenantId)
          .ilike("name", productName)
          .maybeSingle();
        if (existing) return { created: false, product: existing, note: "Product already existed." };
        const { data, error } = await admin
          .from("product_catalog")
          .insert({
            tenant_id: tenantId,
            name: productName,
            category: args.category ?? null,
            description: args.description ?? null,
            unit_price: Number(args.unit_price) || 0,
            currency: "INR",
            is_active: true,
            created_by: user.id,
          })
          .select("id,name")
          .single();
        if (error) return { error: error.message };
        return { created: true, product: data };
      }

      if (name === "create_deal") {
        if (!canWrite(name)) return { error: "This agent cannot create deals." };
        const title = String(args.title ?? "").trim();
        const orgName = String(args.organization_name ?? "").trim();
        const value = Number(args.value);
        const missing: string[] = [];
        if (!title) missing.push("title");
        if (!orgName) missing.push("organization_name");
        if (!Number.isFinite(value) || value <= 0) missing.push("value");
        if (missing.length) {
          return { error: `Missing required deal details: ${missing.join(", ")}. Ask the user with ask_user.` };
        }
        const quantity = Number(args.quantity);
        const { data: deal, error } = await admin
          .from("deals")
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            created_by: user.id,
            assigned_to: user.id,
            title,
            organization_name: orgName,
            alliance_organization_id: args.alliance_organization_id ?? null,
            contact_id: args.contact_id ?? null,
            deal_type: args.deal_type ?? null,
            existing_solution: args.proposed_solution ?? null,
            description: args.description ?? args.proposed_solution ?? null,
            problem_requirement: args.problem_requirement ?? null,
            quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
            value,
            expected_close_date: args.expected_close_date ?? null,
            stage: ["pipeline", "qualified", "proposal", "negotiation"].includes(String(args.stage))
              ? String(args.stage)
              : "pipeline",
          })
          .select("id,title,value,stage,expected_close_date,organization_name")
          .single();
        if (error) return { error: error.message };

        if (args.product_id) {
          const qty = Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1;
          const unit = qty > 0 ? value / qty : value;
          await admin.from("deal_products").insert({
            deal_id: deal.id,
            product_id: String(args.product_id),
            quantity: qty,
            unit_price: unit,
            total_price: value,
          });
        }
        return { created: true, deal, where: "Sales → Deals" };
      }

      return { error: `Unknown tool ${name}` };
    }


    // ---------- conversation ----------
    const contextLines = Object.entries(context)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");

    const messages: Row[] = [
      {
        role: "system",
        content:
          `${agent.prompt}\n\nToday is ${new Date().toISOString().slice(0, 10)}.\n` +
          `You can read the workspace's own data with query_module_data (already scoped to this workspace).\n` +
          (contextLines ? `Current screen context:\n${contextLines}\n` : "") +
          `Work autonomously: gather what you need, then deliver. Do not ask clarifying questions unless the request is impossible without them.`,
      },
    ];
    for (const att of attachments) {
      if (!att?.text) continue;
      messages.push({
        role: "user",
        content: `Attached file "${att.name ?? "document"}" (truncated to 30k chars):\n\n${String(att.text).slice(0, 30000)}`,
      });
    }
    messages.push({ role: "user", content: instruction });

    const tools = toolSchemas(agent.tables, agent.tools);
    let deliverable: { id: string; title: string; html: string } | null = null;
    let finalText = "";
    let promptTokens = 0;
    let completionTokens = 0;

    for (let i = 0; i < MAX_STEPS; i++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: agent.model ?? DEFAULT_MODEL,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (res.status === 429 || res.status === 402) {
        const msg = res.status === 429
          ? "Rate limit reached. Please retry shortly."
          : "AI credits exhausted. Please contact your administrator.";
        if (runId) await admin.from("ai_agent_runs").update({ status: "failed", error: msg }).eq("id", runId);
        return json({ error: msg, runId }, res.status);
      }
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`AI gateway error (${res.status}): ${detail.slice(0, 300)}`);
      }

      const data = await res.json();
      promptTokens += data?.usage?.prompt_tokens ?? 0;
      completionTokens += data?.usage?.completion_tokens ?? 0;
      const choice = data?.choices?.[0];
      const msg = choice?.message ?? {};
      const calls = msg.tool_calls ?? [];

      if (!calls.length) {
        finalText = msg.content ?? "";
        await logStep({ step_type: "answer", label: "Composed answer", output: { text: finalText.slice(0, 4000) } });
        break;
      }

      messages.push(msg);

      for (const call of calls) {
        const name = call?.function?.name ?? "";
        let args: Row = {};
        try {
          args = JSON.parse(call?.function?.arguments || "{}");
        } catch {
          args = {};
        }
        const t0 = Date.now();

        if (name === "render_deliverable") {
          const html = renderDeliverableHtml(args as DeliverableArgs);
          const { data: saved } = await admin
            .from("ai_deliverables")
            .insert({
              tenant_id: tenantId,
              run_id: runId,
              agent_key: agent.key,
              title: args.title ?? "Untitled deliverable",
              deliverable_type: args.deliverable_type ?? "document",
              module: agent.module,
              summary: args.summary ?? null,
              body_html: html,
              data: args,
              status: "draft",
              related_record_type: context.recordType ?? null,
              related_record_id: context.recordId ?? null,
              created_by: user.id,
            })
            .select("id,title")
            .single();

          deliverable = saved
            ? { id: saved.id, title: saved.title, html }
            : { id: "", title: String(args.title ?? ""), html };

          await logStep({
            step_type: "deliverable",
            label: `Rendered "${args.title ?? "deliverable"}"`,
            tool_name: name,
            output: { deliverable_id: saved?.id ?? null, sections: (args.sections ?? []).length },
            duration_ms: Date.now() - t0,
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ saved: true, id: saved?.id ?? null }),
          });
          continue;
        }

        const result = await runTool(name, args);
        await logStep({
          step_type: "tool",
          label: name === "query_module_data" ? `Read ${args.table}` : name.replace(/_/g, " "),
          tool_name: name,
          input: args,
          output: { summary: result.error ? { error: result.error } : { count: (result as Row).count ?? undefined } },
          status: result.error ? "error" : "done",
          duration_ms: Date.now() - t0,
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 60000),
        });
      }
    }

    if (!finalText && deliverable) finalText = `Prepared "${deliverable.title}".`;

    if (runId) {
      await admin
        .from("ai_agent_runs")
        .update({
          status: "completed",
          result_text: finalText,
          deliverable_id: deliverable?.id || null,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          duration_ms: Date.now() - started,
        })
        .eq("id", runId);
    }

    return json({
      runId,
      agentKey: agent.key,
      text: finalText,
      deliverable,
      usage: { promptTokens, completionTokens },
      durationMs: Date.now() - started,
    });
  } catch (e) {
    const message = (e as Error).message ?? "Agent run failed";
    if (runId) {
      await admin
        .from("ai_agent_runs")
        .update({ status: "failed", error: message, duration_ms: Date.now() - started })
        .eq("id", runId);
    }
    return json({ error: message, runId }, 500);
  }
});

export const _agentCount = AGENTS.length;
