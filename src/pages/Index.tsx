import { Suspense, useState, useEffect } from "react";
import { lazyNamed, preloadWhenIdle } from "@/lib/lazy-module";
import { moduleFamily } from "@/lib/module-preload";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { useNavigate, useLocation } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";
import {
  recordRedirect,
  shouldForceCleanup,
} from "@/lib/redirect-loop-guard";
import { forceFreshReload } from "@/lib/cache-cleanup";


// ---------------------------------------------------------------------------
// Every module is a separate chunk.
//
// Previously all 49 modules were imported eagerly, so opening the app parsed
// several megabytes of JavaScript before anything could paint and every click
// competed with that work. Now a module's code is fetched only when it is
// first opened, and preloaded on hover so the click itself feels instant.
// ---------------------------------------------------------------------------
const Dashboard = lazyNamed(() => import("@/components/dashboard/Dashboard"), "Dashboard");
const SalesModule = lazyNamed(() => import("@/components/sales/SalesModule"), "SalesModule");
const SalesAIAssistant = lazyNamed(() => import("@/components/sales/SalesAIAssistant"), "SalesAIAssistant");
const LegalModule = lazyNamed(() => import("@/components/legal/LegalModule"), "LegalModule");
const RenewalsWrapper = lazyNamed(() => import("@/components/renewals/RenewalsWrapper"), "RenewalsWrapper");
const InsideSalesModule = lazyNamed(() => import("@/components/sales/InsideSalesModule"), "InsideSalesModule");
const RequestsModule = lazyNamed(() => import("@/components/employee/RequestsModule"), "RequestsModule");
const EmployeeAIAssistant = lazyNamed(() => import("@/components/employee/EmployeeAIAssistant"), "EmployeeAIAssistant");
const RequestApprovalModule = lazyNamed(() => import("@/components/employee/RequestApprovalModule"), "RequestApprovalModule");
const EmployeeEventsModule = lazyNamed(() => import("@/components/employee/EmployeeEventsModule"), "EmployeeEventsModule");
const AttendanceModule = lazyNamed(() => import("@/components/employee/AttendanceModule"), "AttendanceModule");
const AttendanceReports = lazyNamed(() => import("@/components/employee/AttendanceReports"), "AttendanceReports");
const DocumentationModule = lazyNamed(() => import("@/components/employee/DocumentationModule"), "DocumentationModule");
const MyOrganization = lazyNamed(() => import("@/components/employee/MyOrganization"), "MyOrganization");
const EmployeeWorkflowsModule = lazyNamed(() => import("@/components/employee/EmployeeWorkflowsModule"), "EmployeeWorkflowsModule");
const EmployeeBenefitsModule = lazyNamed(() => import("@/components/employee/EmployeeBenefitsModule"), "EmployeeBenefitsModule");
const EmployeeProfileModule = lazyNamed(() => import("@/components/employee/EmployeeProfileModule"), "EmployeeProfileModule");
const EmployeeResourcesModule = lazyNamed(() => import("@/components/employee/EmployeeResourcesModule"), "EmployeeResourcesModule");
const TicketingModule = lazyNamed(() => import("@/components/ticketing/TicketingModule"), "TicketingModule");
const EmployeeTicketSection = lazyNamed(() => import("@/components/ticketing/EmployeeTicketSection"), "EmployeeTicketSection");
const BillingModule = lazyNamed(() => import("@/components/billing/BillingModule"), "BillingModule");
const ComplianceModule = lazyNamed(() => import("@/components/compliance/ComplianceModule"), "ComplianceModule");
const HRModule = lazyNamed(() => import("@/components/hr/HRModule"), "HRModule");
const PeopleIntelligenceModule = lazyNamed(() => import("@/components/people/PeopleIntelligenceModule"), "PeopleIntelligenceModule");
const AccountsModule = lazyNamed(() => import("@/components/accounts/AccountsModule"), "AccountsModule");
const ProcurementInventoryModule = lazyNamed(() => import("@/components/accounts/ProcurementInventoryModule"), "ProcurementInventoryModule");
const TallyModule = lazyNamed(() => import("@/components/tally/TallyModule"), "TallyModule");
const SolutionEngineeringModule = lazyNamed(() => import("@/components/presales/SolutionEngineeringModule"), "SolutionEngineeringModule");
const CustomerPortal = lazyNamed(() => import("@/components/customer/CustomerPortal"), "CustomerPortal");
const AllianceModule = lazyNamed(() => import("@/components/admin/AllianceModule"), "AllianceModule");
const OfferingsModule = lazyNamed(() => import("@/components/admin/OfferingsModule"), "OfferingsModule");
const DocumentTemplatesModule = lazyNamed(() => import("@/components/admin/DocumentTemplatesModule"), "DocumentTemplatesModule");
const ExpenseModule = lazyNamed(() => import("@/components/expenses/ExpenseModule"), "ExpenseModule");
const AssetsModule = lazyNamed(() => import("@/components/assets/AssetsModule"), "AssetsModule");
const ProjectsModule = lazyNamed(() => import("@/components/projects/ProjectsModule"), "ProjectsModule");
const ITModule = lazyNamed(() => import("@/components/it/ITModule"), "ITModule");
const ManagementAnalyticsModule = lazyNamed(() => import("@/components/analytics/ManagementAnalyticsModule"), "ManagementAnalyticsModule");
const VCFODashboard = lazyNamed(() => import("@/components/dashboard/VCFODashboard"), "VCFODashboard");
const VCISODashboard = lazyNamed(() => import("@/components/dashboard/VCISODashboard"), "VCISODashboard");
const VCRODashboard = lazyNamed(() => import("@/components/dashboard/VCRODashboard"), "VCRODashboard");
const TechnicalModule = lazyNamed(() => import("@/components/technical/TechnicalModule"), "TechnicalModule");
const DailyActivityTracker = lazyNamed(() => import("@/components/employee/DailyActivityTracker"), "DailyActivityTracker");
const DealDeskModule = lazyNamed(() => import("@/components/tenders/DealDeskModule"), "DealDeskModule");
const MarketingModule = lazyNamed(() => import("@/components/marketing/MarketingModule"), "MarketingModule");
const CommunicationsModule = lazyNamed(() => import("@/components/communications/CommunicationsModule"), "CommunicationsModule");
const PublicRelationsModule = lazyNamed(() => import("@/components/pr/PublicRelationsModule"), "PublicRelationsModule");
const TeamCommunication = lazyNamed(() => import("@/components/employee/TeamCommunication"), "TeamCommunication");
const LearningHubModule = lazyNamed(() => import("@/components/employee/LearningHubModule"), "LearningHubModule");
const RemoteSessionsModule = lazyNamed(() => import("@/components/remote-sessions/RemoteSessionsModule"), "RemoteSessionsModule");
const SkillMatrixModule = lazyNamed(() => import("@/components/employee/SkillMatrixModule"), "SkillMatrixModule");

export const MODULE_COMPONENTS = {
  Dashboard,
  SalesModule,
  SalesAIAssistant,
  LegalModule,
  RenewalsWrapper,
  InsideSalesModule,
  RequestsModule,
  EmployeeAIAssistant,
  RequestApprovalModule,
  EmployeeEventsModule,
  AttendanceModule,
  AttendanceReports,
  DocumentationModule,
  MyOrganization,
  EmployeeWorkflowsModule,
  EmployeeBenefitsModule,
  EmployeeProfileModule,
  EmployeeResourcesModule,
  TicketingModule,
  EmployeeTicketSection,
  BillingModule,
  ComplianceModule,
  HRModule,
  AccountsModule,
  ProcurementInventoryModule,
  TallyModule,
  SolutionEngineeringModule,
  CustomerPortal,
  AllianceModule,
  OfferingsModule,
  DocumentTemplatesModule,
  ExpenseModule,
  AssetsModule,
  ProjectsModule,
  ITModule,
  ManagementAnalyticsModule,
  VCFODashboard,
  VCISODashboard,
  VCRODashboard,
  TechnicalModule,
  DailyActivityTracker,
  DealDeskModule,
  MarketingModule,
  CommunicationsModule,
  PublicRelationsModule,
  TeamCommunication,
  LearningHubModule,
  RemoteSessionsModule,
  SkillMatrixModule,
};

const Index = () => {
  const location = useLocation();
  // A module can be requested from elsewhere (e.g. the admin shell sidebar)
  // via router state, or deep-linked with ?module=sales-leads.
  const requestedModule =
    (location.state as { module?: string } | null)?.module ??
    new URLSearchParams(location.search).get("module") ??
    null;

  const [activeModule, setActiveModule] = useState(requestedModule ?? "dashboard");
  const {
    user,
    isLoading,
    isAuthResolved,
    portalMode,
    isCustomer,
    profile,
    role,
    isPlatformAdmin,
  } = useAuth();
  const { isLoading: tenantLoading, tenantMemberships } = useTenant();
  const navigate = useNavigate();

  // Keep in sync when navigated to "/" again with a different module.
  useEffect(() => {
    if (requestedModule) setActiveModule(requestedModule);
  }, [requestedModule]);


  // Decide what "/" should do once auth + tenant info are resolved.
  //
  // IMPORTANT: platform admins are NOT permanently pinned to the Platform
  // Console. They are sent there once per browser session (as a convenience
  // landing page) and only when they have no tenant workspace of their own.
  // Otherwise "/" renders the normal app so every module and sub-module stays
  // reachable for admins too.
  const hasTenantAccess = tenantMemberships.length > 0 || !!profile?.tenant_id;

  useEffect(() => {
    if (isLoading || !isAuthResolved || tenantLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!hasTenantAccess) {
      if (isPlatformAdmin) {
        const target = "/admin/platform/tenants";
        recordRedirect("/", target);
        if (shouldForceCleanup("/", target)) {
          console.warn(
            "[redirect-loop-guard] Detected repeated /→%s redirects, forcing cache cleanup",
            target,
          );
          forceFreshReload(target);
          return;
        }
        navigate(target, { replace: true });
        return;
      }
      navigate("/workspace/new", { replace: true });
      return;
    }

    // Admin with a workspace: land on the console the first time only, and
    // never when a specific module was explicitly requested.
    if (
      isPlatformAdmin &&
      !requestedModule &&
      !sessionStorage.getItem("platform-admin-landed")
    ) {
      sessionStorage.setItem("platform-admin-landed", "1");
      navigate("/admin/platform/tenants", { replace: true });
    }

  }, [
    isLoading,
    isAuthResolved,
    tenantLoading,
    user,
    isPlatformAdmin,
    hasTenantAccess,
    requestedModule,
    navigate,

  ]);

  // Set initial module for customer portal once.
  useEffect(() => {
    if (isCustomer || portalMode === "customer") {
      setActiveModule("customer-support");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the chunks people reach for most, once the browser is idle. This is
  // what makes the second and third module click feel instant rather than
  // paying a fresh download each time.
  useEffect(() => {
    if (!user) return;
    preloadWhenIdle([Dashboard, SalesModule, HRModule, AccountsModule, ProjectsModule]);
  }, [user]);


  // Only block rendering while we genuinely don't know yet, or while an
  // unavoidable redirect (no session / no workspace) is in flight.
  const shouldBlockRender =
    isLoading ||
    !isAuthResolved ||
    tenantLoading ||
    !user ||
    !hasTenantAccess;


  if (shouldBlockRender) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Loading…</p>
            <p className="text-sm text-muted-foreground">
              {!isAuthResolved
                ? "Checking your access…"
                : isPlatformAdmin
                ? "Opening Platform Console…"
                : "Preparing your workspace"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeModule) {
      // Sales modules
      case "sales":
        return <SalesModule initialTab="dashboard" />;
      // Legacy routes - all redirect to MEDDIC workflow
      case "sales-funnel":
      case "sales-funnel-workflow":
      case "sales-meddic-workflow":
        return <SalesModule initialTab="meddic-workflow" />;
      case "sales-ai-assistant":
        return <SalesModule initialTab="sales-ai" />;
      case "sales-quotations":
        return <SalesModule initialTab="quotations" />;
      case "sales-leads":
        return <SalesModule initialTab="leads" />;
      case "sales-my-accounts":
        return <SalesModule initialTab="my-accounts" />;
      case "sales-contacts":
        return <SalesModule initialTab="contacts" />;
      case "sales-team-contacts":
        return <SalesModule initialTab="team-contacts" />;
      case "sales-offerings":
        return <SalesModule initialTab="offerings" />;
      case "sales-deal-registration":
        return <SalesModule initialTab="deal-registration" />;
      case "sales-documentation":
        return <SalesModule initialTab="sops" />;
      
      // Inside Sales with sub-routes
      case "inside-sales":
      case "inside-sales-prospects":
        return <InsideSalesModule initialTab="prospects" />;
      case "inside-sales-leads":
        return <InsideSalesModule initialTab="leads" />;
      case "inside-sales-contacts":
        return <InsideSalesModule initialTab="contacts" />;
      case "inside-sales-accounts":
        return <InsideSalesModule initialTab="accounts" />;
      case "inside-sales-offerings":
        return <InsideSalesModule initialTab="offerings" />;
      
      // Tenders & Deal Desk with sub-routes
      case "deal-desk":
      case "deal-desk-registration":
        return <DealDeskModule initialTab="deal-registration" />;
      case "deal-desk-oem-funnel": // Legacy route alias
      case "deal-desk-oem-pipeline":
        return <DealDeskModule initialTab="oem-pipeline" />;
      case "deal-desk-opportunities":
        return <DealDeskModule initialTab="opportunities" />;
      case "deal-desk-bid-preparation":
        return <DealDeskModule initialTab="bid-preparation" />;
      case "deal-desk-evaluation":
        return <DealDeskModule initialTab="evaluation" />;
      // Alliance module
      case "admin-center-alliance":
        return <AllianceModule />;
      
      // Offerings module
      case "admin-center-offerings":
        return <OfferingsModule />;
      
      // Document Templates module
      case "admin-center-document-templates":
        return <DocumentTemplatesModule />;
      
      // Legal module
      case "legal":
      case "legal-documents":
      case "legal-approvals":
        return <LegalModule />;
      
      // Renewals module
      case "renewals":
      case "renewals-tracker":
        return <RenewalsWrapper initialTab="tracker" />;
      case "renewals-customers":
        return <RenewalsWrapper initialTab="customers" />;
      case "renewals-contracts":
        return <RenewalsWrapper initialTab="contracts" />;
      case "renewals-licenses":
        return <RenewalsWrapper initialTab="licenses" />;
      case "renewals-subscriptions":
        return <RenewalsWrapper initialTab="subscriptions" />;
      
      // Employee Portal modules - Simplified structure
      case "employee-ai-assistant":
        return <EmployeeAIAssistant />;
      case "employee-attendance":
        return <AttendanceModule />;
      case "employee-attendance-reports":
        return <AttendanceReports />;
      case "employee-requests":
        return <ExpenseModule />; // Combined: Leave, Travel, Expenses
      case "employee-resources":
        return <EmployeeResourcesModule />; // Includes docs, trainings, policies
      case "employee-tasks":
        return <EmployeeWorkflowsModule />; // Workflows & HR tasks
      case "employee-approvals":
        return <RequestApprovalModule />;
      case "employee-events":
        return <EmployeeEventsModule />;
      case "employee-documentation":
        return <DocumentationModule />;
      case "employee-organization":
        return <MyOrganization />;
      case "employee-workflows":
        return <EmployeeWorkflowsModule />;
      case "employee-benefits":
        return <EmployeeBenefitsModule />;
      case "employee-profile":
        return <EmployeeProfileModule />;
      case "employee-skill-matrix":
        return <SkillMatrixModule viewMode="employee" />;
      case "employee-leave":
        return <RequestsModule />;
      case "employee-tickets":
        return <EmployeeTicketSection />;
      case "employee-communication":
        return <TeamCommunication />;
      case "learning-hub":
        return <LearningHubModule />;
      case "employee-travel":
      case "employee-expenses":
        return <ExpenseModule />;
      case "employee-assets":
        return <AssetsModule />;
      case "employee-projects":
        return <ProjectsModule />;
      
      // IT Module
      case "it":
        return <ITModule defaultTab="assets" />;
      case "it-tickets":
        return <ITModule defaultTab="support" />;
      case "it-assets":
        return <ITModule defaultTab="assets" />;
      case "it-inventory":
        return <ITModule defaultTab="inventory" />;
      case "it-workflows":
        return <ITModule defaultTab="workflows" />;
      
      // HR modules
      case "hr":
      case "hr-directory":
        return <HRModule initialTab="directory" />;
      case "hr-workflows":
        return <HRModule initialTab="workflows" />;
      case "hr-people":
        return <HRModule initialTab="people" />;
      case "hr-salary":
        return <HRModule initialTab="salary" />;
      case "hr-onboarding":
        return <HRModule initialTab="onboarding" />;
      case "hr-compliance":
        return <HRModule initialTab="compliance" />;
      case "hr-documents":
        return <HRModule initialTab="documents" />;
      case "hr-skill-matrix":
        return <SkillMatrixModule viewMode="hr" />;

      // People Intelligence
      case "people-intel":
      case "people-intel-wellbeing":
        return <PeopleIntelligenceModule initialTab="wellbeing" />;
      case "people-intel-productivity":
        return <PeopleIntelligenceModule initialTab="productivity" />;
      case "people-intel-accountability":
        return <PeopleIntelligenceModule initialTab="accountability" />;
      case "people-intel-recognition":
        return <PeopleIntelligenceModule initialTab="recognition" />;
      
      // Finance & Accounting - Unified Module
      // Dashboard
      case "finance":
      case "finance-dashboard":
        return <TallyModule initialTab="dashboard" />;
      
      // Accounting Core
      case "finance-chart-of-accounts":
        return <TallyModule initialTab="chart-of-accounts" />;
      case "finance-voucher-entry":
        return <TallyModule initialTab="voucher-entry" />;
      case "finance-billing":
        return <BillingModule />;
      
      // Bookkeeping (Consolidated Module)
      case "finance-bookkeeping":
        return <TallyModule initialTab="bookkeeping" />;
      case "finance-day-book":
        return <TallyModule initialTab="day-book" />;
      case "finance-cash-book":
        return <TallyModule initialTab="cash-book" />;
      case "finance-bank-book":
        return <TallyModule initialTab="bank-book" />;
      case "finance-bank-reconciliation":
        return <TallyModule initialTab="bank-reconciliation" />;
      
      // Reports & Analytics
      case "finance-trial-balance":
        return <TallyModule initialTab="trial-balance" />;
      case "finance-profit-loss":
        return <TallyModule initialTab="profit-loss" />;
      case "finance-balance-sheet":
        return <TallyModule initialTab="balance-sheet" />;
      case "finance-analytics":
        return <AccountsModule initialTab="analytics" />;
      case "finance-ar-aging":
        return <AccountsModule initialTab="ar-aging" />;
      case "finance-dso":
        return <AccountsModule initialTab="analytics" />;
      
      // Taxation & Compliance (Consolidated Module)
      case "finance-taxation":
        return <TallyModule initialTab="taxation" />;
      case "finance-gst":
        return <TallyModule initialTab="gst" />;
      case "finance-gst-reports":
        return <TallyModule initialTab="gst-reports" />;
      case "finance-e-invoicing":
        return <TallyModule initialTab="e-invoicing" />;
      case "finance-eway-bill":
        return <TallyModule initialTab="eway-bill" />;
      case "finance-tds-tcs":
        return <TallyModule initialTab="tds-tcs" />;
      
      // New Reports & Planning
      case "finance-cash-flow":
        return <TallyModule initialTab="cash-flow" />;
      case "finance-ratio-analysis":
        return <TallyModule initialTab="ratio-analysis" />;
      case "finance-budgets":
        return <TallyModule initialTab="budgets" />;
      case "finance-estimates":
        return <TallyModule initialTab="estimates" />;
      
      // Operations
      case "finance-contracts":
        return <AccountsModule initialTab="contracts" />;
      case "finance-post-sale":
        return <AccountsModule initialTab="post-sale" />;
      case "finance-workflows":
        return <AccountsModule initialTab="workflows" />;
      case "finance-procurement":
        return <ProcurementInventoryModule initialTab="procurement" />;
      case "finance-stocking":
        return <ProcurementInventoryModule initialTab="stocking" />;
      case "finance-inventory":
        return <ProcurementInventoryModule initialTab="inventory" />;
      case "finance-sla-reminders":
        return <AccountsModule initialTab="sla-reminders" />;
      case "finance-quotation-approvals":
        return <AccountsModule initialTab="quotation-approvals" />;
      
      // Legacy accounts-finance routes (backward compatibility)
      case "accounts-finance":
      case "accounts-finance-contracts":
        return <AccountsModule initialTab="contracts" />;
      case "accounts-finance-analytics":
        return <AccountsModule initialTab="analytics" />;
      case "accounts-finance-post-sale":
        return <AccountsModule initialTab="post-sale" />;
      case "accounts-finance-workflows":
        return <AccountsModule initialTab="workflows" />;
      case "accounts-finance-procurement":
        return <ProcurementInventoryModule initialTab="procurement" />;
      case "accounts-finance-stocking":
        return <ProcurementInventoryModule initialTab="stocking" />;
      case "accounts-finance-ar-aging":
        return <AccountsModule initialTab="ar-aging" />;
      case "accounts-finance-sla-reminders":
        return <AccountsModule initialTab="sla-reminders" />;
      case "accounts-finance-billing":
        return <BillingModule />;
      
      // Legacy accounting routes (backward compatibility)
      case "accounting":
      case "accounting-dashboard":
        return <TallyModule initialTab="dashboard" />;
      case "accounting-chart-of-accounts":
        return <TallyModule initialTab="chart-of-accounts" />;
      case "accounting-voucher-entry":
        return <TallyModule initialTab="voucher-entry" />;
      case "accounting-gst":
        return <TallyModule initialTab="gst" />;
      case "accounting-inventory":
        return <TallyModule initialTab="inventory" />;
      
      // Legacy accounts modules (backward compatibility)
      case "accounts":
      case "accounts-contracts":
        return <AccountsModule initialTab="contracts" />;
      case "accounts-workflows":
        return <AccountsModule initialTab="workflows" />;
      case "accounts-ar-aging":
        return <AccountsModule initialTab="ar-aging" />;
      case "accounts-sla-reminders":
        return <AccountsModule initialTab="sla-reminders" />;
      
      // Billing standalone
      case "billing":
        return <BillingModule />;
      
      // Technical Team modules
      case "tech":
      case "tech-contracts":
        return <TechnicalModule initialTab="contracts" />;
      case "tech-customers":
        return <TechnicalModule initialTab="customers" />;
      case "tech-contacts":
        return <TechnicalModule initialTab="contacts" />;
      case "tech-recommendations":
        return <TechnicalModule initialTab="recommendations" />;
      case "tech-implementation-plan":
        return <TechnicalModule initialTab="implementation-plan" />;
      case "tech-remote-sessions":
        return <TechnicalModule initialTab="remote-sessions" />;
      
      // Activity Tracker
      case "employee-activity-tracker":
        return <DailyActivityTracker />;
      
      // Solution Engineering / Presales modules
      case "presales":
        return <SolutionEngineeringModule initialTab="poc" />;
      case "presales-poc":
        return <SolutionEngineeringModule initialTab="poc" />;
      case "presales-demos":
        return <SolutionEngineeringModule initialTab="demos" />;
      case "presales-assessments":
        return <SolutionEngineeringModule initialTab="assessments" />;
      case "presales-rfp":
        return <SolutionEngineeringModule initialTab="rfp" />;
      case "presales-recommendations":
        return <SolutionEngineeringModule initialTab="recommendations" />;
      case "presales-poc-plans":
        return <SolutionEngineeringModule initialTab="poc-plans" />;
      
      // Project Management Module
      case "projects":
      case "projects-list":
        return <ProjectsModule defaultTab="projects" />;
      case "projects-tasks":
        return <ProjectsModule defaultTab="tasks" />;
      case "projects-milestones":
        return <ProjectsModule defaultTab="milestones" />;
      case "projects-timesheet":
        return <ProjectsModule defaultTab="timesheet" />;
      
      // Marketing modules
      case "marketing":
      case "marketing-campaigns":
        return <MarketingModule initialTab="campaigns" />;
      case "marketing-content":
        return <MarketingModule initialTab="content" />;
      case "marketing-leads":
        return <MarketingModule initialTab="leads" />;
      case "marketing-analytics":
        return <MarketingModule initialTab="analytics" />;
      case "marketing-social":
        return <MarketingModule initialTab="assets" />;
      case "marketing-events":
        return <MarketingModule initialTab="campaigns" />;
      
      // Communications modules
      case "communications":
      case "communications-internal":
        return <CommunicationsModule initialTab="internal" />;
      case "communications-external":
        return <CommunicationsModule initialTab="press" />;
      case "communications-newsletters":
        return <CommunicationsModule initialTab="media" />;
      case "communications-announcements":
        return <CommunicationsModule initialTab="internal" />;
      case "communications-templates":
        return <CommunicationsModule initialTab="press" />;
      
      // Public Relations modules
      case "pr":
      case "pr-media":
      case "pr-coverage":
        return <PublicRelationsModule initialTab="coverage" />;
      case "pr-press":
        return <PublicRelationsModule initialTab="coverage" />;
      case "pr-contacts":
        return <PublicRelationsModule initialTab="partnerships" />;
      case "pr-events":
        return <PublicRelationsModule initialTab="events" />;
      case "pr-crisis":
        return <PublicRelationsModule initialTab="reputation" />;
      

      // Admin modules
      case "admin":
      case "admin-facilities":
      case "admin-assets":
      case "admin-vendors":
      case "admin-procurement":
        return <PlaceholderModule title="Administration" section={activeModule} />;
      
      // Help Desk / Support Center
      case "helpdesk":
      case "helpdesk-tickets":
        return <TicketingModule initialTab="all" />;
      case "helpdesk-open":
        return <TicketingModule initialTab="open" />;
      case "helpdesk-escalated":
        return <TicketingModule initialTab="escalated" />;
      case "helpdesk-remote-sessions":
        return <RemoteSessionsModule context="support" />;
      case "helpdesk-templates":
        return <TicketingModule initialTab="templates" />;
      case "helpdesk-analytics":
        return <TicketingModule initialTab="analytics" />;
      case "helpdesk-automation":
        return <TicketingModule initialTab="automation" />;
      
      // Managed Security Services (MSS)
      case "mss":
      case "mss-soc":
      case "mss-monitoring":
      case "mss-incidents":
      case "mss-alerts":
      case "mss-reports":
      case "mss-clients":
        return <PlaceholderModule title="Managed Security Services" section={activeModule} />;
      
      // Offensive Security
      case "offensive":
      case "offensive-pentest":
      case "offensive-vapt":
      case "offensive-redteam":
      case "offensive-audits":
      case "offensive-findings":
      case "offensive-remediation":
        return <PlaceholderModule title="Offensive Security" section={activeModule} />;
      
      // Billing (duplicate removed - already handled at line ~414)
      
      // Compliance
      case "compliance":
        return <ComplianceModule />;
      
      // Management modules
      case "management":
      case "management-analytics":
        return <ManagementAnalyticsModule />;
      case "management-vcfo":
        return <VCFODashboard />;
      case "management-vciso":
        return <VCISODashboard />;
      case "management-vcro":
        return <VCRODashboard />;
      case "management-performance":
        return <PlaceholderModule title="Management" section={activeModule} />;
      
      // Customer Portal
      case "customer-support":
        return <CustomerPortal />;
      
      default:
        // Customers should only see their portal
        if (isCustomer || portalMode === 'customer') {
          return <CustomerPortal />;
        }
        return <Dashboard onModuleChange={setActiveModule} />;
    }
  };

  // Polished placeholder for modules not yet implemented
  const PlaceholderModule = ({ title, section }: { title: string; section: string }) => {
    const sectionLabels: Record<string, string> = {
      "hr-people": "People Management",
      "hr-salary": "Salary & Benefits",
      "hr-onboarding": "Onboarding",
      "finance-payments": "Payment Tracking",
      "finance-dso": "DSO Trends",
      "finance-pnl": "Profit & Loss",
      "finance-tax": "GST Reports",
      "tech-projects": "Project Management",
      "tech-knowledge": "Knowledge Base",
      "tech-updates": "Updates & Alerts",
      "marketing-campaigns": "Campaigns",
      "marketing-leads": "SQL/MQL Tracking",
      "accounts-receivable": "Accounts Receivable",
      "accounts-payable": "Accounts Payable",
      "accounts-ledger": "General Ledger",
      "accounts-reconciliation": "Bank Reconciliation",
      "admin-facilities": "Facilities",
      "admin-assets": "Asset Management",
      "admin-vendors": "Vendor Management",
      "admin-procurement": "Procurement",
      "management-performance": "People Performance",
      "management-cashflow": "Inflow vs Outflow",
      "mss-soc": "SOC Operations",
      "mss-monitoring": "Threat Monitoring",
      "mss-incidents": "Incident Response",
      "mss-alerts": "Security Alerts",
      "mss-reports": "Security Reports",
      "mss-clients": "Client Portals",
      "offensive-pentest": "Penetration Testing",
      "offensive-vapt": "VAPT Assessments",
      "offensive-redteam": "Red Team Operations",
      "offensive-audits": "Security Audits",
      "offensive-findings": "Findings & Reports",
      "offensive-remediation": "Remediation Tracking",
    };

    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-2xl border border-border/50 p-12 text-center max-w-lg w-full space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-lg text-muted-foreground">
            {sectionLabels[section] || section.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
          </p>
          <p className="text-sm text-muted-foreground/70">
            This module is under development. It will be available in a future release.
          </p>
        </div>
      </div>
    );
  };

  // Intercept clicks on Platform Console and Admin Center sidebar items so
  // they navigate to their dedicated routes instead of trying to render
  // inside the Index page (which has no renderer for them).
  const handleModuleChange = (module: string) => {
    if (module === "platform-console" || module === "platform-tenants") {
      navigate("/admin/platform/tenants");
      return;
    }
    if (module.startsWith("platform-")) {
      const subPath = module.replace("platform-", "");
      navigate(`/admin/platform/${subPath}`);
      return;
    }
    if (module === "admin-center") {
      navigate("/admin/organization");
      return;
    }
    if (module.startsWith("admin-center-")) {
      const subPath = module.replace("admin-center-", "");
      navigate(`/admin/${subPath}`);
      return;
    }
    setActiveModule(module);
  };

  return (
    <MainLayout activeModule={activeModule} onModuleChange={handleModuleChange}>
      {/* Keyed by chunk *family* rather than by module id: switching between
          sub-modules of the same module (Sales → Leads → Deals) then keeps the
          already-mounted tree and its cached queries instead of tearing the
          whole module down and refetching. A different family still shows the
          skeleton while its chunk downloads. */}
      <ModuleErrorBoundary
        resetKey={moduleFamily(activeModule)}
        onRetry={() => loadModule(activeModule)}
      >
        <Suspense key={moduleFamily(activeModule)} fallback={<ModuleSkeleton />}>
          {renderContent()}
        </Suspense>
      </ModuleErrorBoundary>
    </MainLayout>
  );

};

export default Index;
