# Agentic AI Layer — Specialist Agents Embedded in Every Module

Build an in-platform agent fabric: a set of specialised AI agents (Document, Tender, Accounting, Reporting, Sales/MEDDIC, Support, HR) that understand natural-language instructions, pull real tenant data from the database, and produce finished deliverables — client-ready implementation guides, tender analyses, financial statements and monthly summary dashboards like the two uploaded samples.

## What the user gets

1. **Agent Console** (`/agents`) — one place to see all agents, their skills, recent runs, cost and success rate. Start a run, watch progress step by step, download the output.
2. **Embedded agent launchers** — every module gets an "Ask the agent" panel scoped to that module (Documents, Tenders/Deal Desk, Finance & Accounting, Reports, Sales MEDDIC, Support, HR). The agent already knows the tenant, module and record you are on, so no re-typing context.
3. **Deliverables** — agents output rendered documents (implementation guides, SOWs, tender bid packs, compliance matrices, board reports, monthly cyber-security summaries) as styled HTML preview plus PDF/DOCX export, saved to a document library with version history.
4. **Automation** — agents can be scheduled (e.g. "monthly client security summary on the 1st") or triggered by events (deal Closed Won → Onboarding pack; tender uploaded → auto-analysis; month end → financial pack).

## The agents

| Agent | What it does | Data it reads |
| --- | --- | --- |
| Document Agent | Drafts implementation guides, SOWs, proposals, policies from a brief + template pack. Sample: the SAMA/ISO 27001 implementation guide. | templates, offerings, accounts, deals |
| Tender Agent | Ingests a tender/RFP file, extracts scope, eligibility, deadlines, evaluation criteria; builds compliance matrix, bid/no-bid score and response skeleton | tenders, rfp_responses, offerings |
| Accounting Agent | Explains and drafts ledgers, GST/TDS positions, ratio commentary, month-end close checklist, AR-aging chase notes | invoices, payments, vouchers, GST data |
| Reporting Agent | Builds the recurring client/executive report — KPI rollups, trend commentary, risk highlights — in the dashboard style of the uploaded PKF and DIS Holdings samples | any module metrics, tickets, projects |
| Sales (MEDDIC) Agent | Qualification gaps, next-best-action, objection handling, deal risk | deals, MEDDIC fields, activities |
| Support Agent | Triage, RCA drafts, customer-ready replies | tickets, SLA data |
| HR Agent | JD, PIP, appraisal and policy drafting, compliance checks | employees, HR modules |
| Orchestrator | Routes a free-form instruction to the right agent(s), chains them (e.g. Tender Agent → Document Agent → Reporting Agent) | — |

## How it works (technical)

**Backend — one agent runtime, many agents.** A new `agent-run` edge function built on the AI SDK with tool calling, reusing the existing `supabase/functions/_shared/ai.ts` gateway helper. Each agent is a registry entry: system prompt, allowed tools, output schema, default model.

Tools available to agents (all tenant-scoped, service-role queries filtered by `tenant_id`):
- `query_module_data` — read-only, whitelisted tables per agent
- `get_template` / `list_templates` — reuse the existing 37-template library
- `read_uploaded_file` — parse PDF/DOCX/HTML attachments (tender docs, prior reports)
- `render_document` — emit structured deliverable sections
- `save_deliverable` — persist to the new document library
- `create_record` — gated behind human approval (never silent writes)

Long generations stream (`streamText` + awaited text) so multi-minute report builds do not time out.

**Data model** (new tables, RLS + GRANTs, tenant-scoped):
- `ai_agents` — registry, per-tenant enable/disable and prompt overrides
- `ai_agent_runs` — instruction, status, steps, tokens, cost, duration, error
- `ai_agent_run_steps` — tool calls and reasoning trail for the live timeline
- `ai_deliverables` — generated documents (title, type, HTML body, JSON data, version, linked record)
- `ai_agent_schedules` — cron/event triggers

**Frontend**
- `src/lib/agents/registry.ts` — shared agent definitions and module mapping
- `src/components/agents/AgentPanel.tsx` — embeddable launcher (instruction box, attachments, suggested prompts per module)
- `src/components/agents/AgentRunTimeline.tsx` — live step trail
- `src/components/agents/DeliverablePreview.tsx` — renders HTML deliverable, export to PDF/DOCX via the existing `document-export` lib
- `src/pages/Agents.tsx` + sidebar entry, plus `AgentPanel` mounted in Documents, Deal Desk/Tenders, Finance, Reports, MEDDIC, Support and HR modules
- Deliverable styling follows the existing cyber/premium theme tokens; report deliverables use the KPI-card + trend + risk-table structure seen in the uploaded samples

**Guardrails**: every run is tenant-scoped and attributed to the user; write actions require explicit approval; rate-limit and credit errors surface as actionable banners (existing `AIChatErrorBanner`); prompts never leave the server.

## Delivery order

1. Data model + RLS/GRANTs, agent registry, `agent-run` runtime with tools and streaming
2. Agent Console page, run timeline, deliverable library and export
3. Document Agent + Reporting Agent (matched to the two uploaded samples) end to end
4. Tender Agent (file ingest, compliance matrix, bid score) and Accounting Agent
5. Sales/Support/HR agents + embedded panels in every module
6. Schedules and event triggers (month-end reports, Closed Won packs)
