# Complete Security Module Purge + Phased Platform Enhancement

## Part 1 — Full purge of Managed Security & Offensive Security

### 1.1 Database cleanup
- Remove `mss` and `offensive` from the `team_type` enum after remapping existing users to `technical` or `managed_services` so no auth/employee rows break.
- Drop `offerings_managed_security` and `offerings_offensive_security` tables; remove any dependent foreign keys first.
- Remove MSS/VAPT quotation templates from `document_templates` and `document_template_versions` where the solution/category matches `managed_security` or `offensive_security`.
- Delete related support configuration entries (`organization_support_config`, `organization_support_types`, `organization_support_solutions`) for Managed Security / Offensive Security service lines.
- Remove any security-only post-sale workflow templates/stages from `post_sale_workflows` and `post_sale_workflow_stages`.

### 1.2 Code cleanup
- Remove `mss` and `offensive` from the `ModuleKey` union in `useTenantModules.ts` and clean up any remaining references in the tenant registry, Console Access Management, and Template Permissions panels.
- Remove Managed Security / Offensive Security entries from the offerings catalog UI and any catalog filters.
- Remove MSS/VAPT template packs from the template library (`src/lib/template-library.ts`) and the template pack installer.
- Delete or redirect any remaining route handlers (`/mss-soc`, `/offensive-vapt`, etc.) in `src/pages/Index.tsx` to the dashboard.
- Remove unused security-related icons and sidebar groups entirely.

### 1.3 Migration safety
- All deletions are scoped by tenant; never delete from shared reference tables used by other modules.
- A DB migration remaps `team_type` rows before dropping enum values, and drops tables only after FKs are removed.
- No anonymous sign-up changes; no auth schema changes.

## Part 2 — Phased enhancements (Finance, Projects, HR)

Each phase ships automation, AI agents, and analytics together. Every new dashboard is live-DB-backed, uses skeleton/progressive loading, gets a module-scoped agent dock, and can export deliverables to the document library.

### Phase B — Finance & Accounting
- **Automation:**
  - Reconciliation engine that proposes payment-to-invoice matches by amount, date, and party, with one-click confirm/reject.
  - Aged-receivables auto-aging background job that updates buckets nightly and flags overdue invoices.
- **AI agents:**
  - Finance agent in the module dock with write-capable tools: prepare monthly P&L, GST summary, and receivables reports, then save them as `ai_deliverables`.
  - Anomaly agent: flags duplicate invoices, out-of-band amounts, and suspicious ledger entries.
- **Analytics:**
  - Cashflow projection dashboard driven by real invoices, POs, and payment records.
  - Reconciliation hit-rate and anomaly summary cards.
  - Export to PDF/Excel from the deliverable library.
- **Files likely touched:** finance module shell, `src/lib/finance-intelligence.ts`, bank reconciliation module, invoices/payments queries, agent tools, new migration for `finance_automation_rules`.

### Phase C — Projects, Ticketing & Support
- **Automation:**
  - SLA breach predictor that scans open tickets and projects every 15 minutes and triggers escalation before breach.
  - Auto-assignment suggestions based on open workload and skill-matrix matches.
- **AI agents:**
  - Project agent: generates status reports from tasks, milestones, time entries, and blockers, and saves them as deliverables.
  - Support agent: drafts ticket responses, suggests escalation paths, and summarizes ticket threads.
- **Analytics:**
  - Project health score dashboard (schedule, budget, blockers, risks).
  - Workload-balancing view with heatmaps and auto-assignment recommendations.
  - At-risk ticket lane and SLA compliance KPIs.
- **Files likely touched:** project module shell, support ticket module, `src/lib/project-intelligence.ts`, `src/lib/support-intelligence.ts`, agent tools, new migration for `project_automation_rules` and `support_escalation_rules`.

### Phase D — HR & Employee Portal
- **Automation:**
  - Onboarding/offboarding journey templates that auto-create tasks, approvals, document requests, and checklists for a new hire or exiting employee.
  - Attendance/leave anomaly flags (unusual patterns, missing clock-out, leave balance conflicts) surfaced as an HR worklist.
- **AI agents:**
  - HR agent in the Employee Portal dock: answers policy questions, drafts appraisal summaries, and generates offer/exit/appointment letters from the template library.
- **Analytics:**
  - HR dashboard with headcount, attrition risk, onboarding funnel, and leave/attendance trends — all live-DB-backed.
  - Journey progress tracking and completion KPIs.
- **Files likely touched:** `EmployeePortalModule.tsx`, HR workflows, `src/lib/hr-intelligence.ts`, agent tools, new migration for `hr_journey_templates` and `hr_automation_rules`.

## Cross-cutting requirements
- **Tenant isolation:** Every new query and policy is filtered by `tenant_id`. Existing RLS patterns (`user_has_tenant_access`) are reused.
- **Agentic layer:** All new agents register in the existing agent registry (`_shared/agents.ts`) and use the existing `ask_user` / tool-call loop with validation guardrails.
- **Progressive loading:** New dashboards use `ProgressiveSuspense`, `KeepAlive`, and skeleton states to keep tab switching instant.
- **Platform Console:** Automation rules for each phase appear under a new "Automation Rules" panel so tenants can enable/disable each automation.
- **Deliverable library:** Every AI-generated report and document is saved as an `ai_deliverable` linked to the tenant and module.
- **Tests:** Each intelligence module gets unit tests for scoring, summaries, and edge cases before the phase is considered shipped.

## Phased delivery order
1. Phase B: Finance & Accounting
2. Phase C: Projects, Ticketing & Support
3. Phase D: HR & Employee Portal

Each phase will be reviewed in the preview before the next begins.
