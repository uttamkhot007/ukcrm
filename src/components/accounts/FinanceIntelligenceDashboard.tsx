import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, subDays, isBefore, parseISO, differenceInDays } from "date-fns";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Receipt,
  Wallet,
  CalendarClock,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FinanceMetrics {
  totalReceivables: number;
  overdueReceivables: number;
  paidThisMonth: number;
  pendingInvoices: number;
  cashInHand: number;
  bankBalance: number;
  gstPayable: number;
  gstInputCredit: number;
  netGstPosition: number;
  dso: number;
  todayReceipts: number;
  todayPayments: number;
}

interface FinanceInsights {
  summary: string;
  insights: string[];
  recommendations: string[];
  risks: string[];
}

const AGE_BUCKETS = [
  { label: "Current", max: 30, color: "hsl(var(--chart-1))" },
  { label: "1-30 days", max: 60, color: "hsl(var(--chart-2))" },
  { label: "31-60 days", max: 90, color: "hsl(var(--chart-3))" },
  { label: "61-90 days", max: 120, color: "hsl(var(--chart-4))" },
  { label: "90+ days", max: Infinity, color: "hsl(var(--chart-5))" },
];

function formatCurrency(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function FinanceIntelligenceDashboard() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("overview");
  const [aiInsights, setAiInsights] = useState<FinanceInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const tenantId = currentTenant?.id;

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["fi-invoices", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("invoices") as any)
        .select("id, total, amount_paid, status, due_date, issue_date, contact_id")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const invoiceIds = useMemo(() => (invoices as any[]).map((i: any) => i.id), [invoices]);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({

    queryKey: ["fi-payments", tenantId, invoiceIds.length],
    queryFn: async () => {
      if (!invoiceIds.length) return [];
      const { data, error } = await (supabase.from("payment_records") as any)
        .select("amount, payment_date, invoice_id")
        .in("invoice_id", invoiceIds)
        .gte("payment_date", format(subDays(new Date(), 90), "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: invoiceIds.length > 0,
  });


  const { data: ledgers = [], isLoading: ledgersLoading } = useQuery({
    queryKey: ["fi-ledgers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("ledger_accounts") as any)
        .select("name, current_balance, balance_type, is_bank_account, account_groups!inner(name, nature)")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: gstTxns = [], isLoading: gstLoading } = useQuery({
    queryKey: ["fi-gst", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("gst_transactions") as any)
        .select("cgst_amount, sgst_amount, igst_amount, transaction_type, invoice_date")
        .eq("tenant_id", tenantId)
        .gte("invoice_date", format(subDays(new Date(), 90), "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: dayBook = [], isLoading: dayBookLoading } = useQuery({
    queryKey: ["fi-daybook", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("day_book_entries") as any)
        .select("debit_amount, credit_amount, entry_date, voucher_type")
        .eq("tenant_id", tenantId)
        .eq("entry_date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const metrics = useMemo<FinanceMetrics>(() => {
    const today = new Date();
    const totalReceivables = invoices.reduce((s: number, i: any) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
    const overdueReceivables = invoices
      .filter((i: any) => i.due_date && isBefore(parseISO(i.due_date), today) && i.status !== "paid")
      .reduce((s: number, i: any) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);

    const thisMonthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
    const paidThisMonth = invoices
      .filter((i: any) => i.status === "paid" && i.issue_date >= thisMonthStart)
      .reduce((s: number, i: any) => s + Number(i.total), 0);
    const pendingInvoices = invoices.filter((i: any) => i.status !== "paid").length;

    const cashLedgers = ledgers.filter((l: any) => l.name?.toLowerCase().includes("cash"));
    const bankLedgers = ledgers.filter((l: any) => l.is_bank_account || l.name?.toLowerCase().includes("bank"));
    const cashInHand = cashLedgers.reduce((s: number, l: any) => s + Number(l.current_balance || 0), 0);
    const bankBalance = bankLedgers.reduce((s: number, l: any) => s + Number(l.current_balance || 0), 0);

    const gstPayable = gstTxns
      .filter((t: any) => t.transaction_type === "outward")
      .reduce((s: number, t: any) => s + Number(t.cgst_amount || 0) + Number(t.sgst_amount || 0) + Number(t.igst_amount || 0), 0);
    const gstInputCredit = gstTxns
      .filter((t: any) => t.transaction_type === "inward")
      .reduce((s: number, t: any) => s + Number(t.cgst_amount || 0) + Number(t.sgst_amount || 0) + Number(t.igst_amount || 0), 0);

    // DSO approximation: average collection days over paid invoices in last 90 days.
    const paidInvoices = invoices.filter((i: any) => i.status === "paid" && i.due_date && i.issue_date);
    const avgCollectionDays = paidInvoices.length
      ? paidInvoices.reduce((s: number, i: any) => s + Math.max(0, differenceInDays(parseISO(i.due_date), parseISO(i.issue_date))), 0) /
        paidInvoices.length
      : 0;

    const todayReceipts = dayBook.reduce((s: number, e: any) => s + Number(e.credit_amount || 0), 0);
    const todayPayments = dayBook.reduce((s: number, e: any) => s + Number(e.debit_amount || 0), 0);

    return {
      totalReceivables,
      overdueReceivables,
      paidThisMonth,
      pendingInvoices,
      cashInHand,
      bankBalance,
      gstPayable,
      gstInputCredit,
      netGstPosition: gstPayable - gstInputCredit,
      dso: avgCollectionDays,
      todayReceipts,
      todayPayments,
    };
  }, [invoices, ledgers, gstTxns, dayBook]);

  const agingBuckets = useMemo(() => {
    const today = new Date();
    const buckets = AGE_BUCKETS.map((b) => ({ ...b, value: 0 }));
    invoices.forEach((inv: any) => {
      if (!inv.due_date || inv.status === "paid") return;
      const days = differenceInDays(today, parseISO(inv.due_date));
      const bucket = buckets.find((b) => days < b.max) ?? buckets[buckets.length - 1];
      bucket.value += Number(inv.total) - Number(inv.amount_paid || 0);
    });
    return buckets;
  }, [invoices]);

  const fetchAiInsights = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-ai-insights", {
        body: {
          analysisType: "dashboard",
          metrics: {
            totalReceivables: metrics.totalReceivables,
            overdueReceivables: metrics.overdueReceivables,
            paidThisMonth: metrics.paidThisMonth,
            pendingInvoices: metrics.pendingInvoices,
            cashInHand: metrics.cashInHand,
            bankBalance: metrics.bankBalance,
            gstPayable: metrics.gstPayable,
            gstInputCredit: metrics.gstInputCredit,
            netGstPosition: metrics.netGstPosition,
            dso: Math.round(metrics.dso),
            todayReceipts: metrics.todayReceipts,
            todayPayments: metrics.todayPayments,
          },
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAiInsights(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI insight failed");
    } finally {
      setAiLoading(false);
    }
  };

  const isLoading = invoicesLoading || paymentsLoading || ledgersLoading || gstLoading || dayBookLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Real-time cash, receivables, GST position and AI-driven recommendations.
          </p>
        </div>
        <Button onClick={fetchAiInsights} disabled={aiLoading} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {aiLoading ? "Analysing…" : "Generate AI Insights"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collections">Payment Tracking</TabsTrigger>
          <TabsTrigger value="dso-pnl">DSO & P&amp;L</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="taxation">Taxation</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>

        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Receivables"
              value={formatCurrency(metrics.totalReceivables)}
              subtitle={`${metrics.pendingInvoices} pending invoices`}
              icon={Receipt}
              trend={metrics.overdueReceivables > 0 ? "negative" : "positive"}
            />
            <MetricCard
              title="Cash & Bank"
              value={formatCurrency(metrics.cashInHand + metrics.bankBalance)}
              subtitle={`Cash ${formatCurrency(metrics.cashInHand)} • Bank ${formatCurrency(metrics.bankBalance)}`}
              icon={Wallet}
              trend={metrics.cashInHand + metrics.bankBalance > 0 ? "positive" : "neutral"}
            />
            <MetricCard
              title="Collected This Month"
              value={formatCurrency(metrics.paidThisMonth)}
              subtitle={`DSO ~${Math.round(metrics.dso)} days`}
              icon={TrendingUp}
              trend="positive"
            />
            <MetricCard
              title="Net GST Position"
              value={formatCurrency(Math.abs(metrics.netGstPosition))}
              subtitle={metrics.netGstPosition >= 0 ? "Payable to Government" : "Input credit surplus"}
              icon={IndianRupee}
              trend={metrics.netGstPosition > 50000 ? "negative" : "neutral"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Today's Book Movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Receipts</p>
                    <p className="text-2xl font-semibold text-emerald-500">{formatCurrency(metrics.todayReceipts)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Payments</p>
                    <p className="text-2xl font-semibold text-rose-500">{formatCurrency(metrics.todayPayments)}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${metrics.todayReceipts + metrics.todayPayments > 0 ? (metrics.todayReceipts / (metrics.todayReceipts + metrics.todayPayments)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Overdue Exposure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(metrics.overdueReceivables)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.totalReceivables > 0
                    ? `${((metrics.overdueReceivables / metrics.totalReceivables) * 100).toFixed(1)}% of total receivables`
                    : "No receivables"}
                </p>
                <Progress
                  value={metrics.totalReceivables > 0 ? (metrics.overdueReceivables / metrics.totalReceivables) * 100 : 0}
                  className="mt-4"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AR Aging</CardTitle>
              <CardDescription>Overdue amount by bucket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {agingBuckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TaxCard title="Output GST (Payable)" value={metrics.gstPayable} type="outward" />
            <TaxCard title="Input GST (Credit)" value={metrics.gstInputCredit} type="inward" />
            <TaxCard title="Net Position" value={metrics.netGstPosition} type={metrics.netGstPosition >= 0 ? "outward" : "inward"} />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {aiInsights ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <InsightCard title="Summary" icon={Lightbulb} items={[aiInsights.summary]} />
              <InsightCard title="Insights" icon={TrendingUp} items={aiInsights.insights} />
              <InsightCard title="Recommendations" icon={CheckCircle2} items={aiInsights.recommendations} />
              <InsightCard title="Risks" icon={AlertTriangle} items={aiInsights.risks} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-4 text-primary" />
              <p className="text-lg font-medium">Generate AI insights to see recommendations</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend: "positive" | "negative" | "neutral";
}) {
  const TrendIcon = trend === "positive" ? TrendingUp : trend === "negative" ? TrendingDown : ArrowRight;
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <TrendIcon
            className={`h-5 w-5 ${
              trend === "positive" ? "text-emerald-500" : trend === "negative" ? "text-rose-500" : "text-muted-foreground"
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TaxCard({ title, value, type }: { title: string; value: number; type: "outward" | "inward" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${type === "outward" ? "text-rose-500" : "text-emerald-500"}`}>
          {formatCurrency(Math.abs(value))}
        </p>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.filter(Boolean).map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed border-l-2 border-primary/30 pl-3">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
