import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Search, Wrench } from "lucide-react";
import { format } from "date-fns";
import { NewMaintenanceDialog } from "./NewMaintenanceDialog";

export function MaintenanceList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ["asset-maintenance", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("asset_maintenance")
        .select(`
          *,
          asset:assets(name, asset_number)
        `)
        .order("scheduled_date", { ascending: false });

      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Scheduled", variant: "outline" },
      in_progress: { label: "In Progress", variant: "secondary" },
      completed: { label: "Completed", variant: "default" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      preventive: { label: "Preventive", variant: "default" },
      corrective: { label: "Corrective", variant: "secondary" },
      inspection: { label: "Inspection", variant: "outline" },
    };
    const config = typeConfig[type] || { label: type, variant: "outline" as const };
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
            placeholder="Search maintenance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Maintenance
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading maintenance records...
                </TableCell>
              </TableRow>
            ) : maintenance?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Wrench className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No maintenance records found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              maintenance?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.asset?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {record.asset?.asset_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(record.maintenance_type)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.description}
                  </TableCell>
                  <TableCell>
                    {record.scheduled_date
                      ? format(new Date(record.scheduled_date), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell className="text-right">
                    {record.cost ? formatCurrency(Number(record.cost)) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewMaintenanceDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
      />
    </div>
  );
}
