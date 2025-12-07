import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  vendor_id: string | null;
  expected_delivery: string | null;
  created_at: string;
}

interface PurchaseOrdersListProps {
  orders: PurchaseOrder[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-500",
  acknowledged: "bg-yellow-500/10 text-yellow-500",
  partially_received: "bg-orange-500/10 text-orange-500",
  received: "bg-green-500/10 text-green-500",
  cancelled: "bg-destructive/10 text-destructive",
};

export function PurchaseOrdersList({ orders, onRefresh }: PurchaseOrdersListProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleStatusUpdate = async (poId: string, newStatus: string) => {
    setProcessing(poId);
    try {
      const updateData: Record<string, any> = { status: newStatus };

      if (newStatus === "sent") {
        updateData.sent_at = new Date().toISOString();
      } else if (newStatus === "received") {
        updateData.received_at = new Date().toISOString();
      }

      const { error } = await (supabase
        .from("purchase_orders" as any)
        .update(updateData)
        .eq("id", poId) as any);

      if (error) throw error;
      toast.success(`PO status updated to ${newStatus}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update PO status");
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No purchase orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.po_number}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[po.status] || ""}>
                    {po.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                <TableCell>
                  {po.expected_delivery ? format(new Date(po.expected_delivery), "MMM d, yyyy") : "-"}
                </TableCell>
                <TableCell>{format(new Date(po.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={processing === po.id}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      {po.status === "draft" && (
                        <DropdownMenuItem onClick={() => handleStatusUpdate(po.id, "sent")}>
                          <Send className="mr-2 h-4 w-4" /> Send to Vendor
                        </DropdownMenuItem>
                      )}
                      {(po.status === "sent" || po.status === "acknowledged") && (
                        <DropdownMenuItem onClick={() => handleStatusUpdate(po.id, "received")}>
                          <CheckCircle className="mr-2 h-4 w-4" /> Mark Received
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
