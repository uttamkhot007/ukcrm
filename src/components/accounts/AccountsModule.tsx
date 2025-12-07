import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { AccountsContractWorkflow } from "./AccountsContractWorkflow";
import { AccountsWorkflows } from "./AccountsWorkflows";
import { AccountsARaging } from "./AccountsARAging";
import { AccountsSLAReminders } from "./AccountsSLAReminders";
import { AccountsProcurement } from "./AccountsProcurement";
import { AccountsStocking } from "./AccountsStocking";
import { 
  FileText, 
  GitBranch, 
  Clock, 
  Bell, 
  ShoppingCart, 
  Package,
  CheckCircle,
  Key,
  Receipt,
  CreditCard,
  ClipboardList,
} from "lucide-react";

const navItems: ModuleNavItem[] = [
  { value: "contracts-all", label: "All Contracts", icon: FileText },
  { value: "contracts-request_odf", label: "Request ODF", icon: ClipboardList },
  { value: "contracts-odf_approved", label: "ODF Approved", icon: CheckCircle },
  { value: "contracts-process_order", label: "Process Order", icon: Package },
  { value: "contracts-get_license", label: "Get License", icon: Key },
  { value: "contracts-raise_invoice", label: "Raise Invoice", icon: Receipt },
  { value: "contracts-collect_payment", label: "Collect Payment", icon: CreditCard },
  { value: "contracts-completed", label: "Completed", icon: CheckCircle },
  { value: "workflows", label: "Workflows", icon: GitBranch },
  { value: "procurement", label: "Procurement", icon: ShoppingCart },
  { value: "stocking", label: "Stocking", icon: Package },
  { value: "ar-aging", label: "AR Aging", icon: Clock },
  { value: "sla-reminders", label: "SLA & Reminders", icon: Bell },
];

interface AccountsModuleProps {
  initialTab?: string;
}

export function AccountsModule({ initialTab = "contracts-all" }: AccountsModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const renderContent = () => {
    if (activeTab.startsWith("contracts-")) {
      const stage = activeTab.replace("contracts-", "");
      return <AccountsContractWorkflow filterStage={stage} />;
    }
    
    switch (activeTab) {
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
        return <AccountsContractWorkflow filterStage="all" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage contracts, workflows, procurement, stocking, AR aging, and SLA reminders
        </p>
      </div>

      <ModuleVerticalNav
        items={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
