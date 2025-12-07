import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
import { EmployeeResourcesModule } from "@/components/employee/EmployeeResourcesModule";
import { TicketingModule } from "@/components/ticketing/TicketingModule";
import { BillingModule } from "@/components/billing/BillingModule";
import { ComplianceModule } from "@/components/compliance/ComplianceModule";
import { HRModule } from "@/components/hr/HRModule";
import { AccountsModule } from "@/components/accounts/AccountsModule";
import { CustomerPortal } from "@/components/customer/CustomerPortal";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const { user, isLoading, portalMode, isCustomer, isAdminMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

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

  if (isLoading) {
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
      case "contacts":
        return <SalesModule initialTab="contacts" />;
      case "inside-sales":
        return <InsideSalesModule />;
      
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
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      
      <div className={cn("transition-all duration-300 ml-64")}>
        <Header onAIToggle={() => setIsAIOpen(!isAIOpen)} />
        
        <main className="min-h-[calc(100vh-4rem)]">
          {renderContent()}
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

export default Index;
