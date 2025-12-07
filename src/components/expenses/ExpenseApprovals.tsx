import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Receipt, Plane } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ExpenseApprovals() {
  const { user, role, teams } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("expenses");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: "expense" | "travel"; id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isFinance = teams.includes("finance");
  const isManager = role === "manager" || role === "admin";

  // Fetch pending expense reports
  const { data: pendingExpenses } = useQuery({
    queryKey: ["pending-expense-approvals", currentTenant?.id],
    queryFn: async () => {
      const statuses = isFinance ? ["manager_approved"] : ["submitted"];
      
      let query = supabase
        .from("expense_reports")
        .select("*, profiles!expense_reports_user_id_fkey(full_name, email)")
        .in("status", statuses)
        .order("submitted_at", { ascending: true });

      if (currentTenant) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && (isManager || isFinance),
  });

  // Fetch pending travel requests
  const { data: pendingTravel } = useQuery({
    queryKey: ["pending-travel-approvals", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("travel_requests")
        .select("*, profiles!travel_requests_user_id_fkey(full_name, email)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true });

      if (currentTenant) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && isManager,
  });

  const approveExpenseMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const newStatus = isFinance ? "finance_approved" : "manager_approved";
      const updateData = isFinance 
        ? { status: newStatus, finance_approved_by: user?.id, finance_approved_at: new Date().toISOString() }
        : { status: newStatus, approved_by: user?.id, approved_at: new Date().toISOString() };
      
      const { error } = await supabase
        .from("expense_reports")
        .update(updateData)
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-expense-approvals"] });
      toast.success("Expense report approved");
    },
  });

  const rejectExpenseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("expense_reports")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-expense-approvals"] });
      toast.success("Expense report rejected");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
    },
  });

  const approveTravelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("travel_requests")
        .update({ 
          status: "approved", 
          approved_by: user?.id, 
          approved_at: new Date().toISOString() 
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-travel-approvals"] });
      toast.success("Travel request approved");
    },
  });

  const rejectTravelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("travel_requests")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-travel-approvals"] });
      toast.success("Travel request rejected");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleReject = () => {
    if (!selectedItem || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    if (selectedItem.type === "expense") {
      rejectExpenseMutation.mutate({ id: selectedItem.id, reason: rejectionReason });
    } else {
      rejectTravelMutation.mutate({ id: selectedItem.id, reason: rejectionReason });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Expenses ({pendingExpenses?.length || 0})
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="travel" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Travel ({pendingTravel?.length || 0})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="expenses" className="mt-4">
            {!pendingExpenses?.length ? (
              <p className="text-center py-8 text-muted-foreground">
                No expense reports pending approval
              </p>
            ) : (
              <div className="space-y-4">
                {pendingExpenses.map((report: any) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {report.report_number}
                        </span>
                        <Badge variant="secondary">
                          {isFinance ? "Finance Review" : "Manager Review"}
                        </Badge>
                      </div>
                      <h4 className="font-medium mt-1">{report.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        By {report.profiles?.full_name || "Unknown"} •{" "}
                        {report.submitted_at && format(new Date(report.submitted_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(report.total_amount))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveExpenseMutation.mutate(report.id)}
                        disabled={approveExpenseMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedItem({ type: "expense", id: report.id });
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="travel" className="mt-4">
            {!pendingTravel?.length ? (
              <p className="text-center py-8 text-muted-foreground">
                No travel requests pending approval
              </p>
            ) : (
              <div className="space-y-4">
                {pendingTravel.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {request.request_number}
                        </span>
                        <Badge variant="outline">{request.travel_type}</Badge>
                      </div>
                      <h4 className="font-medium mt-1">{request.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        By {request.profiles?.full_name || "Unknown"} •{" "}
                        {request.departure_city} → {request.destination_city}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.departure_date), "MMM d")} -{" "}
                        {format(new Date(request.return_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(request.estimated_cost || 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">estimated</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveTravelMutation.mutate(request.id)}
                        disabled={approveTravelMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedItem({ type: "travel", id: request.id });
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedItem?.type === "expense" ? "Expense Report" : "Travel Request"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectExpenseMutation.isPending || rejectTravelMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
