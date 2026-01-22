import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export function InventoryModule() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse className="h-6 w-6" />
          Inventory Module
        </h2>
        <p className="text-muted-foreground">Stock groups, items, godowns, and valuation</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Inventory management with FIFO/LIFO/Weighted Average costing, stock ledger, and godown management will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
