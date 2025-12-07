import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Package, Warehouse, Wrench, Ticket, FolderKanban, History, Settings } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState(defaultTab);

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
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
          <TabsTrigger value="support" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            IT Support
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
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

        <TabsContent value="support" className="mt-6">
          <ITSupportTickets />
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          <ITWorkflows />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <AssetAssignmentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
