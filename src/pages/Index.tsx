import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SalesModule } from "@/components/sales/SalesModule";
import { SalesAIAssistant } from "@/components/sales/SalesAIAssistant";
import { LegalModule } from "@/components/legal/LegalModule";
import { RenewalsWrapper } from "@/components/renewals/RenewalsWrapper";
import { InsideSalesModule } from "@/components/sales/InsideSalesModule";
import { RequestsModule } from "@/components/employee/RequestsModule";
import { EmployeeAIAssistant } from "@/components/employee/EmployeeAIAssistant";
import { RequestApprovalModule } from "@/components/employee/RequestApprovalModule";
import { EmployeeEventsModule } from "@/components/employee/EmployeeEventsModule";
import { AttendanceModule } from "@/components/employee/AttendanceModule";
import { AttendanceReports } from "@/components/employee/AttendanceReports";
import { DocumentationModule } from "@/components/employee/DocumentationModule";
import { MyOrganization } from "@/components/employee/MyOrganization";
import { EmployeeWorkflowsModule } from "@/components/employee/EmployeeWorkflowsModule";
import { EmployeeBenefitsModule } from "@/components/employee/EmployeeBenefitsModule";
import { EmployeeProfileModule } from "@/components/employee/EmployeeProfileModule";
import { EmployeeResourcesModule } from "@/components/employee/EmployeeResourcesModule";
import { TicketingModule } from "@/components/ticketing/TicketingModule";
import { EmployeeTicketSection } from "@/components/ticketing/EmployeeTicketSection";
import { BillingModule } from "@/components/billing/BillingModule";
import { ComplianceModule } from "@/components/compliance/ComplianceModule";
import { HRModule } from "@/components/hr/HRModule";
import { AccountsModule } from "@/components/accounts/AccountsModule";
import { ProcurementInventoryModule } from "@/components/accounts/ProcurementInventoryModule";
import { TallyModule } from "@/components/tally/TallyModule";
import { SolutionEngineeringModule } from "@/components/presales/SolutionEngineeringModule";
import { CustomerPortal } from "@/components/customer/CustomerPortal";
import { AllianceModule } from "@/components/admin/AllianceModule";
import { OfferingsModule } from "@/components/admin/OfferingsModule";
import { DocumentTemplatesModule } from "@/components/admin/DocumentTemplatesModule";
import { ExpenseModule } from "@/components/expenses/ExpenseModule";
import { AssetsModule } from "@/components/assets/AssetsModule";
import { ProjectsModule } from "@/components/projects/ProjectsModule";
import { ITModule } from "@/components/it/ITModule";
import { ManagementAnalyticsModule } from "@/components/analytics/ManagementAnalyticsModule";
import { VCFODashboard } from "@/components/dashboard/VCFODashboard";
import { VCISODashboard } from "@/components/dashboard/VCISODashboard";
import { VCRODashboard } from "@/components/dashboard/VCRODashboard";
import { TechnicalModule } from "@/components/technical/TechnicalModule";
import { DailyActivityTracker } from "@/components/employee/DailyActivityTracker";
import { DealDeskModule } from "@/components/tenders/DealDeskModule";
import { MarketingModule } from "@/components/marketing/MarketingModule";
import { CommunicationsModule } from "@/components/communications/CommunicationsModule";
import { PublicRelationsModule } from "@/components/pr/PublicRelationsModule";
import { TeamCommunication } from "@/components/employee/TeamCommunication";
import { LearningHubModule } from "@/components/employee/LearningHubModule";
import { RemoteSessionsModule } from "@/components/remote-sessions/RemoteSessionsModule";
import { SkillMatrixModule } from "@/components/employee/SkillMatrixModule";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const { user, isLoading, portalMode, isCustomer, isAdminMode, profile } = useAuth();
  const { currentTenant, isLoading: tenantLoading, tenantMemberships, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  // Wait for profile to be loaded before checking super admin status
  const profileLoaded = !isLoading && profile !== null;
  
  // Check if user is super admin directly from profile to avoid race conditions
  const isUserSuperAdmin = profile?.is_super_admin === true || isSuperAdmin;
  
  // Only redirect to workspace creation if user has no tenant memberships at all
  // The TenantContext automatically selects a tenant if available
  useEffect(() => {
    // Don't redirect until we know the user's super admin status and tenant loading is complete
    if (!isLoading && !tenantLoading && user && profileLoaded) {
      // Super admins bypass all tenant requirements - they manage all tenants from Admin Center
      if (isUserSuperAdmin) {
        return;
      }
      
      // Check if user has tenant access via memberships OR profile tenant_id (for employees)
      const hasTenantAccess = tenantMemberships.length > 0 || profile?.tenant_id;
      
      // Only redirect to create workspace if user has NO tenant access at all
      if (!hasTenantAccess) {
        navigate("/workspace/new");
      }
      // If user has exactly one tenant, TenantContext will auto-select it
      // If user has multiple tenants, TenantContext will select from localStorage or first one
      // So we don't need to redirect to /workspace/select anymore
    }
  }, [user, isLoading, tenantLoading, tenantMemberships, isUserSuperAdmin, navigate, profileLoaded, profile?.tenant_id]);

  // Set initial module based on portal mode - only on initial mount
  useEffect(() => {
    if (isCustomer || portalMode === 'customer') {
      setActiveModule('customer-support');
    }
    // Only run on initial mount, not on every portalMode change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Loading...</p>
            <p className="text-sm text-muted-foreground">Preparing your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
        return <SalesAIAssistant />;
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
        return <OfferingsModule readOnly />;
      case "sales-deal-registration":
        return <SalesModule initialTab="deal-registration" />;
      case "sales-documentation":
        return <DocumentationModule />;
      
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

  return (
    <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      {renderContent()}
    </MainLayout>
  );
};

export default Index;
