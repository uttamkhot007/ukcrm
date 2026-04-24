import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Wrench, Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AssetsStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["assets-stats"],
    queryFn: async () => {
      const [assetsRes, inventoryRes, maintenanceRes] = await Promise.all([
        supabase.from("assets").select("status"),
        supabase.from("inventory_items").select("quantity_on_hand, reorder_level, is_active"),
        supabase.from("asset_maintenance").select("status"),
      ]);

      const assets = assetsRes.data || [];
      const inventory = inventoryRes.data || [];
      const maintenance = maintenanceRes.data || [];

      return {
        totalAssets: assets.length,
        availableAssets: assets.filter((a) => a.status === "available").length,
        assignedAssets: assets.filter((a) => a.status === "assigned").length,
        maintenanceAssets: assets.filter((a) => a.status === "maintenance").length,
        totalInventory: inventory.filter((i) => i.is_active).length,
        lowStockItems: inventory.filter(
          (i) => i.is_active && i.quantity_on_hand <= (i.reorder_level || 0)
        ).length,
        pendingMaintenance: maintenance.filter(
          (m) => m.status === "scheduled" || m.status === "in_progress"
        ).length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalAssets || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.availableAssets || 0} available, {stats?.assignedAssets || 0} assigned
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
          <Warehouse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalInventory || 0}</div>
          <p className="text-xs text-muted-foreground">Active inventory items</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">
            {stats?.lowStockItems || 0}
          </div>
          <p className="text-xs text-muted-foreground">Items below reorder level</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Maintenance</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.pendingMaintenance || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.maintenanceAssets || 0} assets in maintenance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
