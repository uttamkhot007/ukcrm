import { useState } from "react";
import { DealsView } from "./DealsView";
import { LeadsView } from "./LeadsView";
import { ContactsView } from "./ContactsView";
import { QuotationsView } from "./QuotationsView";
import { ActivityTimeline } from "./ActivityTimeline";
import { SalesReports } from "./SalesReports";
import { LogActivitySection } from "./LogActivitySection";
import { SalesQuickActions } from "./SalesQuickActions";
import { MyAccountsView } from "./MyAccountsView";
import { DealRegistrationModule } from "./DealRegistrationModule";
import { LeadScoring } from "./LeadScoring";
import { DealInsights } from "./DealInsights";
import { SalesForecasting } from "./SalesForecasting";
import { EmailSequences } from "./EmailSequences";
import { SalesAutomations } from "./SalesAutomations";
import { SalesFunnelWorkflow } from "./SalesFunnelWorkflow";
import { SalesModuleDashboard } from "./SalesModuleDashboard";

interface SalesModuleProps {
  initialTab?: string;
}

export function SalesModule({ initialTab = "dashboard" }: SalesModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <SalesModuleDashboard onNavigate={handleNavigate} />;
      case "deals":
        return <DealsView />;
      case "leads":
        return <LeadsView />;
      case "contacts":
        return <ContactsView />;
      case "my-accounts":
        return <MyAccountsView />;
      case "quotations":
        return <QuotationsView />;
      case "activity":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-2">Activity Timeline</h2>
            <p className="text-muted-foreground mb-6">Track all interactions and changes for deals</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityTimeline limit={50} />
              </div>
              <div>
                <LogActivitySection />
              </div>
            </div>
          </div>
        );
      case "reports":
        return <SalesReports />;
      case "deal-registration":
        return <DealRegistrationModule />;
      case "lead-scoring":
        return <LeadScoring />;
      case "deal-insights":
        return <DealInsights />;
      case "forecasting":
        return <SalesForecasting />;
      case "email-sequences":
        return <EmailSequences />;
      case "automations":
        return <SalesAutomations />;
      case "funnel-workflow":
        return <SalesFunnelWorkflow />;
      default:
        return <SalesModuleDashboard onNavigate={handleNavigate} />;
    }
  };

  // Show Quick Add only on deals tab
  const showQuickActions = activeTab === "deals";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deals, leads, contacts, and quotations
          </p>
        </div>
        {showQuickActions && <SalesQuickActions />}
      </div>

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
