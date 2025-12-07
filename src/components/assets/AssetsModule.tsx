import { AssetsStats } from "./AssetsStats";
import { AssetsList } from "./AssetsList";
import { InventoryList } from "./InventoryList";
import { MaintenanceList } from "./MaintenanceList";
import { AssetAssignmentHistory } from "./AssetAssignmentHistory";

interface AssetsModuleProps {
  defaultTab?: string;
}

export function AssetsModule({ defaultTab = "assets" }: AssetsModuleProps) {
  const renderContent = () => {
    switch (defaultTab) {
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

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
