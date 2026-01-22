# Vinca ERP - System Architecture

## Overview
Vinca ERP is a comprehensive enterprise resource planning system built with modern web technologies, designed for sales management, employee operations, and business process automation.

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library |
| **React Router** | Client-side routing |
| **TanStack Query** | Data fetching & caching |
| **Recharts** | Data visualization |

### Backend (Lovable Cloud / Supabase)
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Relational database |
| **Supabase Auth** | Authentication |
| **Edge Functions** | Serverless backend logic |
| **Row Level Security** | Data access control |
| **Realtime** | Live data subscriptions |
| **Storage** | File management |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │   Sales     │  │  Employee   │  │   Admin     │        │
│  │   Module    │  │   Module    │  │   Portal    │  │   Panel     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Ticketing  │  │   Billing   │  │ Compliance  │  │  Accounts   │        │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Shared Components & Hooks                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ useAuth  │ │useTheme  │ │  Toast   │ │  Forms   │ │  Tables  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/WSS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Lovable Cloud)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Edge Functions                                │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │   │
│  │  │ employee-      │  │ workflow-      │  │ exchange-      │         │   │
│  │  │ assistant      │  │ trigger        │  │ rates          │         │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │   │
│  │  │ hubspot-sync   │  │ office365-sync │  │ scheduled-     │         │   │
│  │  │                │  │                │  │ checks         │         │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL Database                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ profiles │ │  deals   │ │ tickets  │ │ invoices │ │ renewals │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ contacts │ │  leads   │ │ employee │ │compliance│ │  legal   │   │   │
│  │  │          │ │          │ │ requests │ │frameworks│ │documents │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │    Auth     │  │   Storage   │  │  Realtime   │                         │
│  │   Service   │  │   Buckets   │  │   Engine    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        External Integrations (Optional)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   HubSpot   │  │ Office 365  │  │   Resend    │  │ Lovable AI  │        │
│  │     CRM     │  │  Calendar   │  │   (Email)   │  │  (Chat AI)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

### 1. Dashboard Module (`src/components/dashboard/`)
- **MetricCard.tsx** - KPI display cards
- **RevenueChart.tsx** - Revenue visualization
- **MEDDICPipeline.tsx** - MEDDIC sales pipeline widget
- **TeamPerformance.tsx** - Team metrics
- **ActivityFeed.tsx** - Recent activities
- **QuickActions.tsx** - Shortcut actions

### 2. Sales Module (`src/components/sales/`)
- **DealsView.tsx** - Deal management with Kanban
- **LeadsView.tsx** - Lead tracking
- **ContactsView.tsx** - Contact management
- **QuotationsView.tsx** - Quote generation
- **SalesReports.tsx** - Analytics & reports

### 3. Employee Portal (`src/components/employee/`)
- **AttendanceModule.tsx** - Check-in/out tracking
- **RequestsModule.tsx** - Leave, WFH, hardware requests
- **EmployeeEventsModule.tsx** - Birthdays, anniversaries
- **DocumentationModule.tsx** - SOPs & guides
- **EmployeeAIAssistant.tsx** - AI-powered help

### 4. Ticketing System (`src/components/ticketing/`)
- **TicketingModule.tsx** - Main ticketing interface
- **TicketsList.tsx** - Ticket list view
- **TicketDetailsSheet.tsx** - Ticket details
- **NewTicketDialog.tsx** - Ticket creation

### 5. Billing Module (`src/components/billing/`)
- **BillingModule.tsx** - Invoice management
- **InvoicesList.tsx** - Invoice list
- **NewInvoiceDialog.tsx** - Invoice creation
- **InvoiceDetailsSheet.tsx** - Invoice details

### 6. Accounts Module (`src/components/accounts/`)
- **AccountsModule.tsx** - Main accounts interface
- **AccountsContractWorkflow.tsx** - Contract management
- **AccountsWorkflows.tsx** - ODF, payment workflows
- **AccountsARAging.tsx** - AR aging reports
- **AccountsSLAReminders.tsx** - SLA tracking

### 7. Compliance Module (`src/components/compliance/`)
- **ComplianceModule.tsx** - Framework management
- **FrameworksList.tsx** - Compliance frameworks
- **FrameworkDetailsSheet.tsx** - Framework details

### 8. Legal Module (`src/components/legal/`)
- **LegalModule.tsx** - Document management

### 9. Renewals Module (`src/components/renewals/`)
- **RenewalsModule.tsx** - Subscription/contract renewals

### 10. Admin Panel (`src/pages/admin/`)
- **AdminOrganization.tsx** - Organization settings
- **AdminUsers.tsx** - User management
- **AdminIntegrations.tsx** - Integration setup
- **AdminHealth.tsx** - Platform health monitoring

---

## Database Schema (Key Tables)

### User Management
```sql
profiles          -- User profiles with department, job title, etc.
user_roles        -- Role assignments (admin, manager, employee)
user_teams        -- Team memberships (sales, presales, management, etc.)
```

### Sales & CRM
```sql
contacts          -- Customer/prospect contacts
leads             -- Sales leads
deals             -- Sales opportunities with pipeline stages
deal_activities   -- Activity log for deals
quotations        -- Price quotes
quotation_items   -- Line items for quotes
```

### Employee Operations
```sql
attendance        -- Check-in/out records
employee_requests -- Leave, WFH, hardware requests
employee_events   -- Birthdays, anniversaries, holidays
event_wishes      -- Birthday/anniversary wishes
sops              -- Standard operating procedures
sop_versions      -- SOP version history
```

### Ticketing
```sql
tickets           -- Support tickets
ticket_comments   -- Ticket comments/replies
ticket_history    -- Ticket status changes
```

### Billing & Finance
```sql
invoices          -- Customer invoices
invoice_items     -- Invoice line items
payment_records   -- Payment tracking
renewals          -- Contract/subscription renewals
```

### Compliance & Legal
```sql
compliance_frameworks  -- Compliance standards (ISO, SOC, etc.)
compliance_controls    -- Control requirements
compliance_evidence    -- Evidence documents
legal_documents        -- Contracts, NDAs, etc.
legal_document_approvals -- Approval workflow
```

### System
```sql
notifications            -- User notifications
notification_preferences -- Notification settings
organization_settings    -- Company configuration
integrations            -- External service connections
workflow_logs           -- Automation logs
```

---

## Security Architecture

### Row Level Security (RLS)
All tables have RLS policies ensuring:
- Users can only access their own data
- Managers can access team data
- Admins have full access
- Public data is explicitly marked

### Authentication Flow
```
User → Supabase Auth → JWT Token → API Request → RLS Policy → Data
```

### Role-Based Access Control
```
admin     → Full system access
manager   → Team management + approvals
employee  → Personal data + team visibility
```

---

## API & Edge Functions

### employee-assistant
AI-powered assistant for employee queries using Lovable AI gateway.

### workflow-trigger
Automation engine for:
- ODF creation workflows
- Payment collection reminders
- Order processing automation
- Invoice generation

### exchange-rates
Currency conversion using external API.

### hubspot-sync / office365-sync
Optional integrations for CRM and calendar sync.

### scheduled-checks
Background jobs for:
- SLA monitoring
- Renewal reminders
- Escalation triggers

---

## Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer     │────▶│    Lovable      │────▶│   Production    │
│   (Browser)     │     │   Platform      │     │    (CDN)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Lovable Cloud  │
                        │   (Supabase)    │
                        └─────────────────┘
```

---

## File Structure
```
src/
├── components/
│   ├── accounts/       # Accounts module components
│   ├── admin/          # Admin panel components
│   ├── ai/             # AI assistant components
│   ├── billing/        # Billing/invoicing components
│   ├── compliance/     # Compliance module components
│   ├── dashboard/      # Dashboard widgets
│   ├── employee/       # Employee portal components
│   ├── hr/             # HR module components
│   ├── layout/         # Header, Sidebar, etc.
│   ├── legal/          # Legal document components
│   ├── notifications/  # Notification components
│   ├── renewals/       # Renewal tracking components
│   ├── sales/          # Sales CRM components
│   ├── ticketing/      # Ticketing system components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/
│   └── supabase/       # Supabase client & types
├── lib/                # Utility functions
├── pages/              # Page components
│   └── admin/          # Admin portal pages
└── main.tsx            # App entry point

supabase/
├── functions/          # Edge functions
│   ├── employee-assistant/
│   ├── workflow-trigger/
│   ├── exchange-rates/
│   ├── hubspot-auth/
│   ├── hubspot-sync/
│   ├── office365-auth/
│   ├── office365-sync/
│   └── scheduled-checks/
└── config.toml         # Supabase configuration
```

---

## Performance Optimizations

1. **React Query Caching** - 5-minute stale time for most queries
2. **Lazy Loading** - Components loaded on demand
3. **Optimistic Updates** - Instant UI feedback
4. **Database Indexes** - On frequently queried columns
5. **Edge Functions** - Serverless scaling

---

## Getting Started (Local Development)

```bash
# Clone repository
git clone <your-github-repo-url>

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Environment Variables
```
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
```

---

*Generated for Vinca ERP - Enterprise Resource Planning System*
