import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Plane, Clock, CheckCircle } from "lucide-react";

export function ExpenseStats() {
  const { user } = useAuth();

  const { data: expenseStats } = useQuery({
    queryKey: ["expense-stats", user?.id],
    queryFn: async () => {
      const { data: reports } = await supabase
        .from("expense_reports")
        .select("status, total_amount")
        .eq("user_id", user?.id);

      const { data: travelRequests } = await supabase
        .from("travel_requests")
        .select("status, estimated_cost")
        .eq("user_id", user?.id);

      const pending = reports?.filter(r => ["submitted", "manager_approved"].includes(r.status)) || [];
      const approved = reports?.filter(r => r.status === "finance_approved") || [];
      const paid = reports?.filter(r => r.status === "paid") || [];
      const pendingTravel = travelRequests?.filter(t => t.status === "submitted") || [];

      return {
        pendingAmount: pending.reduce((sum, r) => sum + Number(r.total_amount), 0),
        pendingCount: pending.length,
        approvedAmount: approved.reduce((sum, r) => sum + Number(r.total_amount), 0),
        approvedCount: approved.length,
        paidAmount: paid.reduce((sum, r) => sum + Number(r.total_amount), 0),
        paidCount: paid.length,
        pendingTravelCount: pendingTravel.length,
        pendingTravelCost: pendingTravel.reduce((sum, t) => sum + Number(t.estimated_cost || 0), 0),
      };
    },
    enabled: !!user,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(expenseStats?.pendingAmount || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {expenseStats?.pendingCount || 0} report(s) awaiting approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(expenseStats?.approvedAmount || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {expenseStats?.approvedCount || 0} report(s) ready for payment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reimbursed</CardTitle>
          <Receipt className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(expenseStats?.paidAmount || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {expenseStats?.paidCount || 0} report(s) this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Travel</CardTitle>
          <Plane className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {expenseStats?.pendingTravelCount || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Est. {formatCurrency(expenseStats?.pendingTravelCost || 0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
