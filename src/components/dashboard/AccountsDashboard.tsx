import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calculator,
  Receipt
} from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";

interface AccountsDashboardProps {
  onNavigate: (module: string) => void;
}

export function AccountsDashboard({ onNavigate }: AccountsDashboardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch invoices data
  const { data: invoicesData } = useQuery({
    queryKey: ["accounts-invoices", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch pending orders/workflows
  const { data: pendingWorkflows = [] } = useQuery({
    queryKey: ["accounts-pending-workflows", user?.id, currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("accounts_workflows")
        .select("*")
        .not("status", "eq", "completed")
        .order("created_at", { ascending: false });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch expense reports
  const { data: expenseReports = [] } = useQuery({
    queryKey: ["pending-expense-approvals", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("expense_reports")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate stats
  const invoices = invoicesData || [];
  const pendingInvoices = invoices.filter(i => i.status === "sent" || i.status === "draft");
  const overdueInvoices = invoices.filter(i => 
    i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date()
  );
  const paidThisMonth = invoices.filter(i => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    return i.status === "paid" && i.updated_at && 
      new Date(i.updated_at) >= monthStart && new Date(i.updated_at) <= monthEnd;
  });

  const totalPendingAmount = pendingInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const totalCollectedThisMonth = paidThisMonth.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const totalPendingExpenses = expenseReports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

  // Collection efficiency
  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                <p className="text-2xl font-bold">{pendingInvoices.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalPendingAmount)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{overdueInvoices.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalOverdueAmount)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collected (MTD)</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCollectedThisMonth)}</p>
                <p className="text-xs text-muted-foreground">{paidThisMonth.length} invoices</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Expenses</p>
                <p className="text-2xl font-bold">{expenseReports.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalPendingExpenses)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Collection Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Collection Rate</span>
              <span className="text-sm text-muted-foreground">{collectionRate.toFixed(1)}%</span>
            </div>
            <Progress value={collectionRate} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Collected: {formatCurrency(totalPaid)}</span>
              <span>Total Invoiced: {formatCurrency(totalInvoiced)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Workflows */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pendingWorkflows.slice(0, 5).map((workflow) => (
                <div
                  key={workflow.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("accounts")}
                >
                  <p className="font-medium text-sm truncate">{workflow.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {workflow.workflow_type.replace("_", " ")}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {workflow.current_stage.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
              {pendingWorkflows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending workflows
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {overdueInvoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("billing")}
                >
                  <p className="font-medium text-sm truncate">{invoice.invoice_number}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-red-500">
                      {differenceInDays(new Date(), new Date(invoice.due_date))} days overdue
                    </span>
                    <span className="text-xs font-medium">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                </div>
              ))}
              {overdueInvoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No overdue invoices 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <TeamRemindersWidget />
      </div>

      {/* Calendar */}
      <TeamCalendarWidget 
        teamType="accounts" 
        title="Accounts Team Calendar" 
      />
    </div>
  );
}
