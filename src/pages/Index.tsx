import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SalesModule } from "@/components/sales/SalesModule";
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
import { BillingModule } from "@/components/billing/BillingModule";
import { ComplianceModule } from "@/components/compliance/ComplianceModule";
import { HRModule } from "@/components/hr/HRModule";
import { AccountsModule } from "@/components/accounts/AccountsModule";
import { SolutionEngineeringModule } from "@/components/presales/SolutionEngineeringModule";
import { CustomerPortal } from "@/components/customer/CustomerPortal";
import { AllianceModule } from "@/components/admin/AllianceModule";
import { OfferingsModule } from "@/components/admin/OfferingsModule";
import { ExpenseModule } from "@/components/expenses/ExpenseModule";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { Loader2, Menu, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
  
  // Redirect to workspace selection if no tenant selected (non-super-admins only)
  useEffect(() => {
    // Don't redirect until we know the user's super admin status
    if (!isLoading && !tenantLoading && user && profileLoaded) {
      // Super admins bypass all tenant requirements - they manage all tenants from Admin Center
      if (isUserSuperAdmin) {
        // Super admin can use the app with or without a tenant selected
        return;
      }
      
      // Non-super-admin users need a tenant
      if (!currentTenant && tenantMemberships.length === 0) {
        // No workspaces at all - redirect to create one
        navigate("/workspace/new");
      } else if (!currentTenant && tenantMemberships.length > 1) {
        // Multiple options - let them choose
        navigate("/workspace/select");
      }
    }
  }, [user, isLoading, tenantLoading, currentTenant, tenantMemberships, isUserSuperAdmin, navigate, profileLoaded]);

  // Set initial module based on portal mode
  useEffect(() => {
    if (isCustomer || portalMode === 'customer') {
      setActiveModule('customer-support');
    } else if (portalMode === 'workspace') {
      setActiveModule('dashboard');
    } else if (portalMode === 'admin' || isAdminMode) {
      setActiveModule('dashboard');
    }
  }, [isCustomer, portalMode, isAdminMode]);

  if (isLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
      case "sales-quotations":
        return <SalesModule initialTab="quotations" />;
      case "sales-leads":
        return <SalesModule initialTab="leads" />;
      case "inside-sales":
        return <InsideSalesModule />;
      
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
      
      // Employee Portal modules
      case "employee-ai-assistant":
        return <EmployeeAIAssistant />;
      case "employee-attendance":
        return <AttendanceModule />;
      case "employee-attendance-reports":
        return <AttendanceReports />;
      case "employee-requests":
        return <RequestsModule />;
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
      case "employee-resources":
        return <EmployeeResourcesModule />;
      case "employee-profile":
        return <EmployeeProfileModule />;
      case "employee-leave":
        return <RequestsModule />;
      case "employee-travel":
      case "employee-expenses":
        return <ExpenseModule />;
      
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
      
      // Finance modules
      case "finance":
      case "finance-payments":
      case "finance-dso":
      case "finance-pnl":
      case "finance-tax":
        return <PlaceholderModule title="Finance" section={activeModule} />;
      
      // Technical modules
      case "tech":
      case "tech-projects":
      case "tech-knowledge":
      case "tech-updates":
        return <PlaceholderModule title="Technical" section={activeModule} />;
      
      // Marketing modules
      case "marketing":
      case "marketing-campaigns":
      case "marketing-leads":
        return <PlaceholderModule title="Marketing" section={activeModule} />;
      
      // Accounts modules
      case "accounts":
      case "accounts-contracts":
        return <AccountsModule initialTab="contracts" />;
      case "accounts-workflows":
        return <AccountsModule initialTab="workflows" />;
      case "accounts-ar-aging":
        return <AccountsModule initialTab="ar-aging" />;
      case "accounts-sla-reminders":
        return <AccountsModule initialTab="sla-reminders" />;
      
      // Solution Engineering / Presales modules
      case "presales":
      case "presales-poc":
        return <SolutionEngineeringModule />;
      case "presales-demos":
        return <SolutionEngineeringModule />;
      case "presales-assessments":
        return <SolutionEngineeringModule />;
      case "presales-rfp":
        return <SolutionEngineeringModule />;
      
      // Admin modules
      case "admin":
      case "admin-facilities":
      case "admin-assets":
      case "admin-vendors":
      case "admin-procurement":
        return <PlaceholderModule title="Administration" section={activeModule} />;
      
      // Help Desk
      case "helpdesk":
      case "helpdesk-tickets":
        return <TicketingModule />;
      
      // Billing
      case "billing":
        return <BillingModule />;
      
      // Compliance
      case "compliance":
        return <ComplianceModule />;
      
      // Management modules
      case "management":
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
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar 
            activeModule={activeModule} 
            onModuleChange={(module) => {
              setActiveModule(module);
              setIsMobileSidebarOpen(false);
            }} 
          />
        </SheetContent>
      </Sheet>

      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
      
      <div className={cn("transition-all duration-300 relative z-10", "md:ml-64")}>
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header onAIToggle={() => setIsAIOpen(!isAIOpen)} />
        </div>
        
        <main className="min-h-[calc(100vh-4rem)] pb-safe relative">
          {renderContent()}
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

export default Index;
