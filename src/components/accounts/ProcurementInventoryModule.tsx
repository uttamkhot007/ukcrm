import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, Warehouse } from "lucide-react";
import { AccountsProcurement } from "./AccountsProcurement";
import { AccountsStocking } from "./AccountsStocking";
import { InventoryModule } from "@/components/tally/InventoryModule";

interface ProcurementInventoryModuleProps {
  initialTab?: string;
}

export function ProcurementInventoryModule({ initialTab = "procurement" }: ProcurementInventoryModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          Procurement & Inventory
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage procurement requests, stocking orders, and inventory
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="procurement" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Procurement
          </TabsTrigger>
          <TabsTrigger value="stocking" className="gap-2">
            <Package className="h-4 w-4" />
            Stocking
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Warehouse className="h-4 w-4" />
            Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procurement" className="mt-6">
          <AccountsProcurement />
        </TabsContent>

        <TabsContent value="stocking" className="mt-6">
          <AccountsStocking />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
