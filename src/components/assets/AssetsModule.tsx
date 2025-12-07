import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { Package, Wrench, Warehouse, History } from "lucide-react";
import { AssetsStats } from "./AssetsStats";
import { AssetsList } from "./AssetsList";
import { InventoryList } from "./InventoryList";
import { MaintenanceList } from "./MaintenanceList";
import { AssetAssignmentHistory } from "./AssetAssignmentHistory";

const navItems: ModuleNavItem[] = [
  { value: "assets", label: "Assets", icon: Package },
  { value: "inventory", label: "Inventory", icon: Warehouse },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "history", label: "Assignment History", icon: History },
];

interface AssetsModuleProps {
  defaultTab?: string;
}

export function AssetsModule({ defaultTab = "assets" }: AssetsModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderContent = () => {
    switch (activeTab) {
      case "assets":
        return <AssetsList />;
      case "inventory":
        return <InventoryList />;
      case "maintenance":
        return <MaintenanceList />;
      case "history":
        return <AssetAssignmentHistory />;
      default:
        return <AssetsList />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Asset & Inventory Management</h1>
        <p className="text-muted-foreground">
          Track company assets, equipment, and inventory items
        </p>
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
