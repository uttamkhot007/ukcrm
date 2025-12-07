import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Calendar, MapPin, Tag, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface AssetDetailsSheetProps {
  asset: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDetailsSheet({
  asset,
  open,
  onOpenChange,
}: AssetDetailsSheetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle>{asset.name}</SheetTitle>
            {getStatusBadge(asset.status)}
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {asset.asset_number}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{asset.category?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Serial Number:</span>
                  <p className="font-medium">{asset.serial_number || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <p className="font-medium">{asset.model || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Manufacturer:</span>
                  <p className="font-medium">{asset.manufacturer || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{asset.location || "No location set"}</p>
            </CardContent>
          </Card>

          {/* Financial Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <p className="font-medium">
                    {asset.purchase_price
                      ? formatCurrency(Number(asset.purchase_price))
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Value:</span>
                  <p className="font-medium">
                    {asset.current_value
                      ? formatCurrency(Number(asset.current_value))
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Purchase Date:</span>
                  <p className="font-medium">
                    {asset.purchase_date
                      ? format(new Date(asset.purchase_date), "MMM d, yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Warranty Expiry:</span>
                  <p className="font-medium">
                    {asset.warranty_expiry
                      ? format(new Date(asset.warranty_expiry), "MMM d, yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">
                    {format(new Date(asset.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description & Notes */}
          {(asset.description || asset.notes) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {asset.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Description:
                    </span>
                    <p className="text-sm mt-1">{asset.description}</p>
                  </div>
                )}
                {asset.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1">{asset.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
