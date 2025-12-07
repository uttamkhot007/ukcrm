import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { AccountsContractWorkflow } from "./AccountsContractWorkflow";
import { AccountsWorkflows } from "./AccountsWorkflows";
import { AccountsARaging } from "./AccountsARAging";
import { AccountsSLAReminders } from "./AccountsSLAReminders";
import { AccountsProcurement } from "./AccountsProcurement";
import { AccountsStocking } from "./AccountsStocking";
import { FileText, GitBranch, Clock, Bell, ShoppingCart, Package } from "lucide-react";

const navItems: ModuleNavItem[] = [
  { value: "contracts", label: "Contracts", icon: FileText },
  { value: "workflows", label: "Workflows", icon: GitBranch },
  { value: "procurement", label: "Procurement", icon: ShoppingCart },
  { value: "stocking", label: "Stocking", icon: Package },
  { value: "ar-aging", label: "AR Aging", icon: Clock },
  { value: "sla-reminders", label: "SLA & Reminders", icon: Bell },
];

interface AccountsModuleProps {
  initialTab?: string;
}

export function AccountsModule({ initialTab = "contracts" }: AccountsModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const renderContent = () => {
    switch (activeTab) {
      case "contracts":
        return <AccountsContractWorkflow initialTab="all" />;
      case "workflows":
        return <AccountsWorkflows />;
      case "procurement":
        return <AccountsProcurement />;
      case "stocking":
        return <AccountsStocking />;
      case "ar-aging":
        return <AccountsARaging />;
      case "sla-reminders":
        return <AccountsSLAReminders />;
      default:
        return <AccountsContractWorkflow initialTab="all" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage contracts, workflows, procurement, stocking, AR aging, and SLA reminders
          </p>
        </div>
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
