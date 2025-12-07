import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { Monitor, Package, Warehouse, Wrench, Ticket, FolderKanban, History } from "lucide-react";
import { AssetsStats } from "@/components/assets/AssetsStats";
import { AssetsList } from "@/components/assets/AssetsList";
import { InventoryList } from "@/components/assets/InventoryList";
import { MaintenanceList } from "@/components/assets/MaintenanceList";
import { AssetAssignmentHistory } from "@/components/assets/AssetAssignmentHistory";
import { ITSupportTickets } from "./ITSupportTickets";
import { ITWorkflows } from "./ITWorkflows";

const navItems: ModuleNavItem[] = [
  { value: "assets", label: "Assets", icon: Package },
  { value: "inventory", label: "Inventory", icon: Warehouse },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "support", label: "IT Support", icon: Ticket },
  { value: "workflows", label: "Workflows", icon: FolderKanban },
  { value: "history", label: "History", icon: History },
];

interface ITModuleProps {
  defaultTab?: string;
}

export function ITModule({ defaultTab = "assets" }: ITModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderContent = () => {
    switch (activeTab) {
      case "assets":
        return <AssetsList />;
      case "inventory":
        return <InventoryList />;
      case "maintenance":
        return <MaintenanceList />;
      case "support":
        return <ITSupportTickets />;
      case "workflows":
        return <ITWorkflows />;
      case "history":
        return <AssetAssignmentHistory />;
      default:
        return <AssetsList />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-tech/10 flex items-center justify-center">
          <Monitor className="w-6 h-6 text-tech" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">IT Service Management</h1>
          <p className="text-muted-foreground">
            Manage digital assets, inventory, IT support, and infrastructure
          </p>
        </div>
      </div>

      <AssetsStats />

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
