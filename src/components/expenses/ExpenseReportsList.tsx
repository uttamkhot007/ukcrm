import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { NewExpenseReportDialog } from "./NewExpenseReportDialog";
import { ExpenseReportDetailsSheet } from "./ExpenseReportDetailsSheet";

interface ExpenseReportsListProps {
  viewMode: "personal" | "all";
}

export function ExpenseReportsList({ viewMode }: ExpenseReportsListProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["expense-reports", viewMode, user?.id, currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("expense_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (viewMode === "personal") {
        query = query.eq("user_id", user?.id);
      }

      if (currentTenant) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("expense_reports")
        .update({ 
          status: "submitted",
          submitted_at: new Date().toISOString()
        })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-reports"] });
      toast.success("Expense report submitted for approval");
    },
    onError: () => {
      toast.error("Failed to submit report");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("expense_reports")
        .delete()
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-reports"] });
      toast.success("Expense report deleted");
    },
    onError: () => {
      toast.error("Failed to delete report");
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "outline" },
      submitted: { label: "Submitted", variant: "secondary" },
      manager_approved: { label: "Manager Approved", variant: "secondary" },
      finance_approved: { label: "Finance Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      paid: { label: "Paid", variant: "default" },
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {viewMode === "personal" ? "My Expense Reports" : "All Expense Reports"}
        </CardTitle>
        {viewMode === "personal" && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !reports?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No expense reports found. Create your first one!
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      {report.report_number}
                    </span>
                    {getStatusBadge(report.status)}
                  </div>
                  <h4 className="font-medium mt-1">{report.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(report.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-lg font-semibold">
                    {formatCurrency(Number(report.total_amount))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {report.status === "draft" && viewMode === "personal" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => submitMutation.mutate(report.id)}
                        disabled={Number(report.total_amount) === 0}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(report.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <NewExpenseReportDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {selectedReport && (
        <ExpenseReportDetailsSheet
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
        />
      )}
    </Card>
  );
}
