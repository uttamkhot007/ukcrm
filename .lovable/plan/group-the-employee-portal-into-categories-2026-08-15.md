# Group the Employee Portal into categories

Today the Employee Portal shows every screen as one long, flat strip of tabs (up to 16 depending on role), driven by the sidebar's child list. Sales solved this with a two-level layout: a small row of section tabs, and under it only the sub-tabs of the active section. The Employee Portal will get the same treatment.

## Proposed categories

```text
Me            My Profile · My Organization · My Compensation · Skill Matrix
Work          Attendance · Attendance Reports · Activity Tracker · My Workflows · Tasks · Projects
Requests      Leave & Travel · Expenses · Assets · Support Tickets · Request Approvals
Grow          Resources & Docs · Learning Hub · Team Communication · Events & Recognition · My AI Assistant
```

Each category shows 4-6 sub-tabs at a time instead of 16 in one row. Categories only show the items the signed-in person actually has access to; a category with no available items is hidden entirely, so an employee-only account still sees a short, clean set.

## Behaviour

- Landing on the portal opens the section and sub-tab you last used (remembered per tenant), exactly like Sales.
- Every existing entry point keeps working: sidebar links, notification deep links and older saved links to a specific employee screen open the right section automatically.
- Previously visited sub-tabs stay in memory, so switching back is instant and keeps filters and scroll position.
- Sub-tabs preload on hover/focus so the first open feels immediate.
- Section and sub-tab rows behave as proper tab strips for keyboard and screen-reader users (arrow keys, Home/End, announced selection).

## Sidebar

The "Employee Portal" sidebar entry becomes a single item without the long child list (the way Sales already works). Navigation between employee screens then happens inside the portal, which also removes the duplicated employee child lists currently repeated across several role branches of the sidebar.

## Technical notes

- New `src/components/employee/EmployeePortalModule.tsx`, modelled directly on `src/components/sales/SalesModule.tsx`: a `groups[]` structure of `{ id, label, icon, tabs[] }`, lazy `lazyNamed` imports, `usePersistentState` for the active tab (tenant-scoped), `KeepAlive`, `ProgressiveSuspense`, `ModuleErrorBoundary`, `ModuleRefreshButton` and `beginModuleSwitch` telemetry.
- Tabs render the existing components unchanged (`EmployeeProfileModule`, `MyOrganization`, `EmployeeBenefitsModule`, `SkillMatrixModule`, `AttendanceModule`, `AttendanceReports`, `DailyActivityTracker`, `EmployeeWorkflowsModule`, `RequestsModule`, `RequestApprovalModule`, `EmployeeResourcesModule`, `LearningHubModule`, `TeamCommunication`, `EmployeeEventsModule`, `EmployeeAIAssistant`, plus the tickets/expenses/assets/projects/tasks screens currently wired in `Index.tsx`).
- An `aliases` map translates the legacy ids (`employee-profile`, `employee-requests`, `employee-skill-matrix`, …) to the new internal tab ids, mirroring the Sales alias approach.
- `src/pages/Index.tsx`: the `employee-*` cases collapse into one case that renders `<EmployeePortalModule initialTab={activeModule} />`, keeping deep links intact.
- `src/components/layout/Sidebar.tsx`: drop the `children` arrays from the Employee Portal entries in all role branches (workspace, employee-only, admin and team variants) so `ModuleTabBar` no longer renders the flat strip.
- Visibility per tab is derived from the same role/team checks the sidebar branches use today, so no one gains access to a screen they cannot currently reach.
