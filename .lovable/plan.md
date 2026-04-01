
## 🔴 Critical Bugs (Navigation Broken)

### 1. Marketing Module — No routing (clicking sidebar items shows Dashboard instead)
All 6 sidebar items (`marketing-campaigns`, `marketing-content`, `marketing-leads`, `marketing-analytics`, `marketing-social`, `marketing-events`) have **NO case statements** in `Index.tsx`. Clicking any marketing sub-item falls through to the default Dashboard.

### 2. Communications Module — No routing
All 5 sidebar items (`communications-internal`, `communications-external`, `communications-newsletters`, `communications-announcements`, `communications-templates`) have **NO case statements** in Index.tsx.

### 3. Public Relations Module — No routing  
All 6 sidebar items (`pr-media`, `pr-press`, `pr-coverage`, `pr-contacts`, `pr-events`, `pr-crisis`) have **NO case statements** in Index.tsx.

### 4. HR Module — Missing useEffect sync
`HRModule` doesn't have `useEffect` to sync `initialTab` prop changes (same bug fixed in other modules). Clicking different HR sidebar items may not update the view.

---

## 🟡 Placeholder / Stub Modules (Show "Coming Soon")

### 5. Administration Module
All sub-items (Facilities, Asset Management, Vendor Management, Procurement) render `PlaceholderModule`.

### 6. Managed Security Services (MSS)
All 6 sub-items (SOC, Threat Monitoring, Incident Response, Alerts, Reports, Client Portals) render `PlaceholderModule`.

### 7. Offensive Security
All 6 sub-items render `PlaceholderModule`.

### 8. Management > People Performance
Renders `PlaceholderModule`.

---

## 🟡 Mock Data / Limited Functionality

### 9. Marketing Module uses hardcoded mock data
Campaigns and content are static arrays (`MOCK_CAMPAIGNS`, `MOCK_CONTENT`), not connected to the database. "New Campaign" dialog exists but doesn't persist.

### 10. HR Sub-modules are stubs
"People Management", "Salary & Benefits", and "Onboarding" tabs only show placeholder "Configure" cards with no real functionality.

---

## 🟢 Enhancement Opportunities

### 11. Marketing Module — Missing sidebar tab mapping
Sidebar has `social` and `events` items but MarketingModule only has tabs for campaigns, content, leads, analytics, assets.

### 12. Duplicate billing case
`case "billing"` appears twice in Index.tsx (lines ~414 and ~509).

---

## Proposed Fix (Priority 1 — Critical routing bugs)

1. Add Marketing routing (6 cases) in Index.tsx
2. Add Communications routing (5 cases) in Index.tsx  
3. Add PR routing (6 cases) in Index.tsx
4. Add `useEffect` sync in HRModule
5. Add missing `social` and `events` tabs to MarketingModule

Shall I proceed with fixing all critical routing bugs first?
