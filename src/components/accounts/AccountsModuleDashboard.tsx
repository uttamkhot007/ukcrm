import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import {
  Calculator, DollarSign, FileText, Clock,
  ArrowRight, AlertTriangle, CheckCircle2, TrendingUp,
  CreditCard, Receipt, BarChart3, Package, RefreshCw
} from "lucide-react";

interface AccountsModuleDashboardProps {
  onNavigate: (tab: string) => void;
}

export function AccountsModuleDashboard({ onNavigate }: AccountsModuleDashboardProps) {
  const { user } = useAuth();
  const { formatCurrency } = useOrganizationSettings();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch accounts metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['accounts-dashboard-metrics'],
    queryFn: async () => {
      // Simplified metrics - use 'as any' to avoid type issues
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total, status, due_date, created_at') as any;

      const { data: workflows } = await supabase
        .from('accounts_workflows')
        .select('id, workflow_type, status')
        .eq('status', 'active') as any;

      const allInvoices = invoices || [];
      const pendingInvoices = allInvoices.filter((i: any) => i.status === 'pending' || i.status === 'sent');
      const overdueInvoices = pendingInvoices.filter((i: any) => {
        if (!i.due_date) return false;
        return new Date(i.due_date) < now;
      });

      const totalReceivables = pendingInvoices.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);
      const overdueAmount = overdueInvoices.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);

      const activeWorkflows = workflows || [];

      return {
        totalReceivables,
        overdueAmount,
        overdueCount: overdueInvoices.length,
        collectedThisMonth: 0,
        avgDSO: 0,
        activeWorkflows: activeWorkflows.length,
        workflowsByType: {
          order_processing: activeWorkflows.filter((w: any) => w.workflow_type === 'order_processing').length,
          invoice_processing: activeWorkflows.filter((w: any) => w.workflow_type === 'invoice_processing').length,
          payment_collection: activeWorkflows.filter((w: any) => w.workflow_type === 'payment_collection').length,
        },
        pendingOrdersCount: 0,
        pendingOrdersValue: 0,
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-finance/20 to-primary/10 rounded-xl p-6 border border-finance/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6 text-finance" />
              Accounts & Finance Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Financial overview for {format(now, 'MMMM yyyy')}
            </p>
          </div>
          <Button onClick={() => onNavigate('workflows')} className="bg-finance hover:bg-finance/90">
            <RefreshCw className="h-4 w-4 mr-2" />
            View Workflows
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('ar-aging')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Receivables</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.totalReceivables || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-500/30" onClick={() => onNavigate('ar-aging')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics?.overdueAmount || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.overdueCount} invoices
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('payments')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collected This Month</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(metrics?.collectedThisMonth || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-700 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('dso')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg DSO</p>
                <p className="text-2xl font-bold">{metrics?.avgDSO || 0} days</p>
                <p className="text-xs text-muted-foreground mt-1">Days Sales Outstanding</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Workflows */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-finance" />
              Active Workflows
              <Badge variant="secondary">{metrics?.activeWorkflows}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center cursor-pointer hover:bg-muted" onClick={() => onNavigate('workflows')}>
                <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold">{metrics?.workflowsByType.order_processing || 0}</p>
                <p className="text-sm text-muted-foreground">Order Processing</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center cursor-pointer hover:bg-muted" onClick={() => onNavigate('billing')}>
                <FileText className="h-8 w-8 mx-auto text-green-700 dark:text-green-400 mb-2" />
                <p className="text-2xl font-bold">{metrics?.workflowsByType.invoice_processing || 0}</p>
                <p className="text-sm text-muted-foreground">Invoice Processing</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center cursor-pointer hover:bg-muted" onClick={() => onNavigate('payments')}>
                <CreditCard className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold">{metrics?.workflowsByType.payment_collection || 0}</p>
                <p className="text-sm text-muted-foreground">Payment Collection</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('workflows')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Manage Workflows
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('billing')}>
              <Receipt className="h-4 w-4 mr-2" />
              View Invoices
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('ar-aging')}>
              <Clock className="h-4 w-4 mr-2" />
              AR Aging Report
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Sales Analytics
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Alert */}
      {(metrics?.pendingOrdersCount || 0) > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Pending Order Requests</p>
                  <p className="text-sm text-muted-foreground">
                    {metrics?.pendingOrdersCount} orders worth {formatCurrency(metrics?.pendingOrdersValue || 0)}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => onNavigate('procurement')}>
                Process Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
