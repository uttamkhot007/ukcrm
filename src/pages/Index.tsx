import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SalesModule } from "@/components/sales/SalesModule";
import { SalesAIAssistant } from "@/components/sales/SalesAIAssistant";
import { LegalModule } from "@/components/legal/LegalModule";
import { RenewalsModule } from "@/components/renewals/RenewalsModule";
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
import { SolutionEngineeringModule } from "@/components/presales/SolutionEngineeringModule";
import { CustomerPortal } from "@/components/customer/CustomerPortal";
import { AllianceModule } from "@/components/admin/AllianceModule";
import { OfferingsModule } from "@/components/admin/OfferingsModule";
import { ExpenseModule } from "@/components/expenses/ExpenseModule";
import { AssetsModule } from "@/components/assets/AssetsModule";
import { ProjectsModule } from "@/components/projects/ProjectsModule";
import { ITModule } from "@/components/it/ITModule";
import { ManagementAnalyticsModule } from "@/components/analytics/ManagementAnalyticsModule";
import { TechnicalModule } from "@/components/technical/TechnicalModule";
import { DailyActivityTracker } from "@/components/employee/DailyActivityTracker";
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
      
      // Only redirect to create workspace if user has NO tenant memberships at all
      // If they have memberships but no current tenant selected, wait for auto-selection
      if (tenantMemberships.length === 0) {
        navigate("/workspace/new");
      }
      // If user has exactly one tenant, TenantContext will auto-select it
      // If user has multiple tenants, TenantContext will select from localStorage or first one
      // So we don't need to redirect to /workspace/select anymore
    }
  }, [user, isLoading, tenantLoading, tenantMemberships, isUserSuperAdmin, navigate, profileLoaded]);

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
      case "sales-funnel":
        return <SalesModule initialTab="deals" />;
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
      
      // Alliance module
      case "admin-center-alliance":
        return <AllianceModule />;
      
      // Offerings module
      case "admin-center-offerings":
        return <OfferingsModule />;
      
      // Legal module
      case "legal":
      case "legal-documents":
      case "legal-approvals":
        return <LegalModule />;
      
      // Renewals module
      case "renewals":
      case "renewals-contracts":
      case "renewals-licenses":
      case "renewals-subscriptions":
        return <RenewalsModule />;
      
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
      case "employee-leave":
        return <RequestsModule />;
      case "employee-tickets":
        return <EmployeeTicketSection />;
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
      case "hr-documents":
        return <HRModule initialTab="documents" />;
      
      // Accounts & Finance merged modules
      case "accounts-finance":
      case "accounts-finance-contracts":
        return <AccountsModule initialTab="contracts" />;
      case "accounts-finance-workflows":
        return <AccountsModule initialTab="workflows" />;
      case "accounts-finance-procurement":
        return <AccountsModule initialTab="procurement" />;
      case "accounts-finance-stocking":
        return <AccountsModule initialTab="stocking" />;
      case "accounts-finance-ar-aging":
        return <AccountsModule initialTab="ar-aging" />;
      case "accounts-finance-sla-reminders":
        return <AccountsModule initialTab="sla-reminders" />;
      case "accounts-finance-payments":
      case "accounts-finance-dso":
      case "accounts-finance-pnl":
      case "accounts-finance-tax":
        return <AccountsModule initialTab="contracts" />;
      case "accounts-finance-billing":
        return <BillingModule />;
      
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
      
      // Legacy finance modules (backward compatibility)
      case "finance":
      case "finance-payments":
      case "finance-dso":
      case "finance-pnl":
      case "finance-tax":
        return <AccountsModule initialTab="contracts" />;
      
      // Billing
      case "billing":
        return <BillingModule />;
      
      // Technical Team modules
      case "tech":
      case "tech-contracts":
        return <TechnicalModule initialTab="contracts" />;
      case "tech-contacts":
        return <TechnicalModule initialTab="contacts" />;
      case "tech-recommendations":
        return <TechnicalModule initialTab="recommendations" />;
      case "tech-implementation-sow":
        return <TechnicalModule initialTab="implementation-sow" />;
      
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
      
      // Admin modules
      case "admin":
      case "admin-facilities":
      case "admin-assets":
      case "admin-vendors":
      case "admin-procurement":
        return <PlaceholderModule title="Administration" section={activeModule} />;
      
      // Help Desk
      case "helpdesk":
        return <TicketingModule initialTab="all" />;
      case "helpdesk-tickets":
        return <TicketingModule initialTab="all" />;
      
      // Billing
      case "billing":
        return <BillingModule />;
      
      // Compliance
      case "compliance":
        return <ComplianceModule />;
      
      // Management modules
      case "management":
      case "management-analytics":
        return <ManagementAnalyticsModule />;
      case "management-performance":
      case "management-cashflow":
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

  // Placeholder component for modules not yet implemented
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
    };

    return (
      <div className="p-6">
        <div className="glass rounded-xl border border-border p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-lg text-muted-foreground mb-4">
            {sectionLabels[section] || section.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
          </p>
          <p className="text-sm text-muted-foreground">
            This module is coming soon. Configure workflows and customize as needed.
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
