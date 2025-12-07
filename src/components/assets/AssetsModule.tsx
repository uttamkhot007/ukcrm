import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Wrench, Warehouse, History } from "lucide-react";
import { AssetsStats } from "./AssetsStats";
import { AssetsList } from "./AssetsList";
import { InventoryList } from "./InventoryList";
import { MaintenanceList } from "./MaintenanceList";
import { AssetAssignmentHistory } from "./AssetAssignmentHistory";

interface AssetsModuleProps {
  defaultTab?: string;
}

export function AssetsModule({ defaultTab = "assets" }: AssetsModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Asset & Inventory Management</h1>
        <p className="text-muted-foreground">
          Track company assets, equipment, and inventory items
        </p>
      </div>

      <AssetsStats />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Assignment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-6">
          <AssetsList />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryList />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceList />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <AssetAssignmentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
