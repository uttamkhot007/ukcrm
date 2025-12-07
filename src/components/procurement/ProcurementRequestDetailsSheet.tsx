import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { CheckCircle, XCircle, Package, Send } from "lucide-react";

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  estimated_unit_price: number | null;
}

interface ProcurementRequestDetailsSheetProps {
  request: {
    id: string;
    request_number: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    department: string | null;
    cost_center: string | null;
    justification: string | null;
    total_estimated_amount: number | null;
    required_by: string | null;
    created_at: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-500",
  under_review: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  po_created: "bg-purple-500/10 text-purple-500",
};

export function ProcurementRequestDetailsSheet({ request, open, onOpenChange, onRefresh }: ProcurementRequestDetailsSheetProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  useEffect(() => {
    if (request?.id) {
      fetchItems();
    }
  }, [request?.id]);

  const fetchItems = async () => {
    if (!request) return;
    const { data, error } = await (supabase
      .from("procurement_items" as any)
      .select("*")
      .eq("procurement_request_id", request.id)
      .order("sort_order") as any);

    if (!error && data) {
      setItems(data as ProcurementItem[]);
    }
  };

  const handleStatusUpdate = async (newStatus: string, reason?: string) => {
    if (!request || !user) return;
    setLoading(true);

    try {
      const updateData: Record<string, any> = { status: newStatus };

      if (newStatus === "approved") {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === "rejected") {
        updateData.rejected_by = user.id;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = reason;
      }

      const { error } = await (supabase
        .from("procurement_requests" as any)
        .update(updateData)
        .eq("id", request.id) as any);

      if (error) throw error;
      toast.success(`Request ${newStatus} successfully`);
      setShowRejectionInput(false);
      setRejectionReason("");
      onRefresh();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update request");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = async () => {
    if (!request || !user) return;
    setLoading(true);

    try {
      // Create purchase order
      const { data: po, error: poError } = await (supabase
        .from("purchase_orders" as any)
        .insert({
          procurement_request_id: request.id,
          total_amount: request.total_estimated_amount || 0,
          created_by: user.id,
          tenant_id: currentTenant?.id || null,
        })
        .select()
        .single() as any);

      if (poError) throw poError;

      // Update request status
      await (supabase
        .from("procurement_requests" as any)
        .update({ status: "po_created" })
        .eq("id", request.id) as any);

      toast.success(`Purchase Order ${po.po_number} created successfully`);
      onRefresh();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create purchase order");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  if (!request) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {request.request_number}
            <Badge variant="secondary" className={statusColors[request.status] || ""}>
              {request.status.replace("_", " ")}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{request.title}</h3>
            {request.description && (
              <p className="text-muted-foreground mt-1">{request.description}</p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Priority:</span>
              <Badge variant="outline" className="ml-2">{request.priority}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Department:</span>
              <span className="ml-2">{request.department || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cost Center:</span>
              <span className="ml-2">{request.cost_center || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Required By:</span>
              <span className="ml-2">
                {request.required_by ? format(new Date(request.required_by), "MMM d, yyyy") : "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2">{format(new Date(request.created_at), "MMM d, yyyy")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Est. Amount:</span>
              <span className="ml-2 font-medium">{formatCurrency(request.total_estimated_amount)}</span>
            </div>
          </div>

          {request.justification && (
            <div>
              <h4 className="font-medium mb-1">Business Justification</h4>
              <p className="text-sm text-muted-foreground">{request.justification}</p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Items</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>{formatCurrency(item.estimated_unit_price)}</TableCell>
                    <TableCell>
                      {formatCurrency((item.estimated_unit_price || 0) * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {request.status === "draft" && (
              <Button onClick={() => handleStatusUpdate("submitted")} disabled={loading}>
                <Send className="mr-2 h-4 w-4" /> Submit for Approval
              </Button>
            )}

            {request.status === "submitted" && (
              <>
                <div className="flex gap-2">
                  <Button onClick={() => handleStatusUpdate("approved")} disabled={loading} className="flex-1">
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectionInput(true)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>

                {showRejectionInput && (
                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => handleStatusUpdate("rejected", rejectionReason)}
                        disabled={loading || !rejectionReason}
                      >
                        Confirm Rejection
                      </Button>
                      <Button variant="outline" onClick={() => setShowRejectionInput(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {request.status === "approved" && (
              <Button onClick={handleCreatePO} disabled={loading}>
                <Package className="mr-2 h-4 w-4" /> Create Purchase Order
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
