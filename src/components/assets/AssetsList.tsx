import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Package } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { NewAssetDialog } from "./NewAssetDialog";
import { AssetDetailsSheet } from "./AssetDetailsSheet";

export function AssetsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("assets")
        .select(`
          *,
          category:asset_categories(name)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,asset_number.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      available: { label: "Available", variant: "default" },
      assigned: { label: "Assigned", variant: "secondary" },
      maintenance: { label: "Maintenance", variant: "outline" },
      retired: { label: "Retired", variant: "destructive" },
      disposed: { label: "Disposed", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading assets...
                </TableCell>
              </TableRow>
            ) : assets?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No assets found</p>
                </TableCell>
              </TableRow>
            ) : (
              assets?.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <TableCell className="font-mono text-sm">
                    {asset.asset_number}
                  </TableCell>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.category?.name || "-"}</TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell>{asset.location || "-"}</TableCell>
                  <TableCell className="text-right">
                    {asset.current_value
                      ? formatCurrency(Number(asset.current_value))
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewAssetDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
      />

      {selectedAsset && (
        <AssetDetailsSheet
          asset={selectedAsset}
          open={!!selectedAsset}
          onOpenChange={(open) => !open && setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
