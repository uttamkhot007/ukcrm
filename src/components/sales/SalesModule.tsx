import { useState, useEffect } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { DealsView } from "./DealsView";
import { LeadsView } from "./LeadsView";
import { ContactsView } from "./ContactsView";
import { QuotationsView } from "./QuotationsView";
import { ActivityTimeline } from "./ActivityTimeline";
import { SalesReports } from "./SalesReports";
import { LogActivitySection } from "./LogActivitySection";
import { SalesQuickActions } from "./SalesQuickActions";
import { Handshake, Users, UserPlus, FileText, Clock, BarChart3 } from "lucide-react";

const navItems: ModuleNavItem[] = [
  { value: "deals", label: "Deals", icon: Handshake },
  { value: "leads", label: "Leads", icon: UserPlus },
  { value: "contacts", label: "Contacts", icon: Users },
  { value: "quotations", label: "Quotations", icon: FileText },
  { value: "activity", label: "Activity", icon: Clock },
  { value: "reports", label: "Reports", icon: BarChart3 },
];

interface SalesModuleProps {
  initialTab?: string;
}

export function SalesModule({ initialTab = "deals" }: SalesModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "deals":
        return <DealsView />;
      case "leads":
        return <LeadsView />;
      case "contacts":
        return <ContactsView />;
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
      default:
        return <DealsView />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deals, leads, contacts, and quotations
          </p>
        </div>
        <SalesQuickActions />
      </div>

      <div className="flex gap-6">
        <ModuleVerticalNav
          items={navItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
