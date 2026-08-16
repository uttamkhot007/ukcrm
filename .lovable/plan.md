# Remove Security Delivery Modules, Enhance the Rest

## Part 1 — Remove Managed Security & Offensive Security

Both sections today are navigation entries that render a generic placeholder screen (no real data, no tables of their own). Removal is clean.

- Delete the "Managed Security" and "Offensive Security" groups from the sidebar (all 12 sub-items).
- Delete their routes/cases and title labels in the main router, so old deep links (`/mss-soc`, `/offensive-vapt`, ...) redirect to the dashboard instead of a dead placeholder.
- Remove `mss` and `offensive` from the tenant module registry so they no longer appear in tenant licensing/module toggles in the Platform Console.
- Remove `mss` / `offensive` from the console access team-type pickers and template permission lists; existing users holding those team types get mapped to `technical` so nobody loses access.
- Keep untouched: the Offerings catalog (Managed Security / Offensive Security are still sellable service lines), MSS and VAPT quotation templates, and Alliance/MSSP partner records. These are commercial data, not the removed delivery modules.

## Part 2 — Enhancement pass on the remaining modules

Phased, highest business impact first. Each phase reuses the existing agentic layer, live DB queries, and progressive-loading patterns already in the app — no new frameworks.

### Phase A — Sales, MEDDIC & Presales
- Next-Best-Action engine: per-deal ranked actions derived from stage age, MEDDIC gaps, last-activity recency and value, surfaced on the deal card and pipeline board.
- Deal risk scoring with explainable factors (rotten-deal age, missing champion/economic buyer, no activity in N days) plus an at-risk queue.
- Sales agent upgrades: multi-entity creation in one instruction (account + contact + product + deal), quotation drafting from a won-deal, and meeting-note-to-activity capture.
- Forecast improvements: weighted vs. committed vs. best-case, quarter-over-quarter trend, per-owner attainment.

### Phase B — Finance & Accounting
- Automated reconciliation suggestions matching payments to invoices by amount/date/party with a confirm step.
- Anomaly detection on ledgers (duplicate invoices, out-of-band amounts, aged receivables) as an actionable worklist.
- Cashflow projection dashboard driven by real invoice, PO and payment data.
- Finance agent: "prepare the monthly P&L / GST summary / receivables report" producing a saved deliverable.

### Phase C — Projects, Ticketing & Support
- SLA intelligence: breach prediction, auto-escalation rules, and an at-risk ticket lane.
- Workload balancing view with auto-assignment suggestions based on open load and skills from the skill matrix.
- Project health scoring (schedule, budget, blockers) with automatic status-report generation by the reporting agent.

### Phase D — HR & Employee Portal
- Onboarding/offboarding journeys that auto-create task sets, approvals and document requests.
- Attendance/leave anomaly flags and self-service approvals with fewer clicks.
- HR agent: policy Q&A, appraisal summary drafting, and letter generation from the template library.

### Cross-cutting
- Every enhanced module gets: live DB-backed metrics (no hardcoded numbers), skeleton/progressive loading, an agent dock scoped to that module, and export to the deliverable library.
- An automation rules surface in the Platform Console so tenants can enable/disable each automation.

## Technical notes
- Files touched in Part 1: `src/components/layout/Sidebar.tsx`, `src/pages/Index.tsx`, `src/hooks/useTenantModules.ts`, `src/hooks/useAuth.tsx` (TeamType), `src/components/admin/users/ConsoleAccessManagement.tsx`, `src/components/admin/TemplatePermissionsPanel.tsx`.
- Team-type cleanup needs a migration to remap existing `mss`/`offensive` rows before the enum values are dropped from the UI; the DB enum values stay in place to avoid breaking historical rows.
- All new scoring/automation logic stays tenant-scoped via `tenant_id` filters; agent tools reuse the existing validation guard rails.
- Phases ship one at a time so each can be reviewed in the preview before the next begins.
