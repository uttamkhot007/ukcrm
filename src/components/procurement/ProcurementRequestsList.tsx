import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, CheckCircle, XCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  status: string;
  priority: string;
  department: string | null;
  total_estimated_amount: number | null;
  required_by: string | null;
  created_at: string;
  requested_by: string;
}

interface ProcurementRequestsListProps {
  requests: ProcurementRequest[];
  onRefresh: () => void;
  onViewDetails: (request: ProcurementRequest) => void;
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

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-destructive/10 text-destructive",
};

export function ProcurementRequestsList({ requests, onRefresh, onViewDetails }: ProcurementRequestsListProps) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    setProcessing(requestId);
    try {
      const updateData: Record<string, any> = { status: newStatus };
      
      if (newStatus === "approved") {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === "rejected") {
        updateData.rejected_by = user?.id;
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await (supabase
        .from("procurement_requests" as any)
        .update(updateData)
        .eq("id", requestId) as any);

      if (error) throw error;
      toast.success(`Request ${newStatus} successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update request");
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Est. Amount</TableHead>
            <TableHead>Required By</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No procurement requests found
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.request_number}</TableCell>
                <TableCell>{request.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[request.status] || ""}>
                    {request.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={priorityColors[request.priority] || ""}>
                    {request.priority}
                  </Badge>
                </TableCell>
                <TableCell>{request.department || "-"}</TableCell>
                <TableCell>{formatCurrency(request.total_estimated_amount)}</TableCell>
                <TableCell>
                  {request.required_by ? format(new Date(request.required_by), "MMM d, yyyy") : "-"}
                </TableCell>
                <TableCell>{format(new Date(request.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={processing === request.id}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(request)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      {request.status === "submitted" && (
                        <>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(request.id, "approved")}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(request.id, "rejected")}>
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {request.status === "approved" && (
                        <DropdownMenuItem onClick={() => onViewDetails(request)}>
                          <Package className="mr-2 h-4 w-4" /> Create PO
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
