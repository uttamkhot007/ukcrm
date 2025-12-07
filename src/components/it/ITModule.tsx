import { Monitor } from "lucide-react";
import { AssetsStats } from "@/components/assets/AssetsStats";
import { AssetsList } from "@/components/assets/AssetsList";
import { InventoryList } from "@/components/assets/InventoryList";
import { MaintenanceList } from "@/components/assets/MaintenanceList";
import { AssetAssignmentHistory } from "@/components/assets/AssetAssignmentHistory";
import { ITSupportTickets } from "./ITSupportTickets";
import { ITWorkflows } from "./ITWorkflows";

interface ITModuleProps {
  defaultTab?: string;
}

export function ITModule({ defaultTab = "assets" }: ITModuleProps) {
  const renderContent = () => {
    switch (defaultTab) {
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

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
