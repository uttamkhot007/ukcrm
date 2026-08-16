import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, Gauge, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import {
  computeDso,
  computePnl,
  formatINR,
  type FinanceInvoice,
  type FinanceLedger,
  type FinancePayment,
} from "@/lib/finance-intelligence";

export function DsoProfitInsights() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["fin-pnl-invoices", tenantId],
    queryFn: async (): Promise<FinanceInvoice[]> => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("invoices") as any)
        .select("id, invoice_number, contact_id, total, amount_paid, status, issue_date, due_date")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as FinanceInvoice[];
    },
    enabled: !!tenantId,
  });

  const invoiceIds = useMemo(() => invoices.map((i) => i.id), [invoices]);

  const { data: payments = [], isLoading: payLoading } = useQuery({
    queryKey: ["fin-pnl-payments", tenantId, invoiceIds.length],
    queryFn: async (): Promise<FinancePayment[]> => {
      if (!invoiceIds.length) return [];
      const { data, error } = await (supabase.from("payment_records") as any)
        .select("id, invoice_id, amount, payment_date")
        .in("invoice_id", invoiceIds);
      if (error) throw error;
      return (data || []) as FinancePayment[];
    },
    enabled: invoiceIds.length > 0,
  });

  const { data: ledgers = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ["fin-pnl-ledgers", tenantId],
    queryFn: async (): Promise<FinanceLedger[]> => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("ledger_accounts") as any)
        .select("name, current_balance, balance_type, account_groups(nature)")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return ((data || []) as any[]).map((l) => ({
        name: l.name,
        current_balance: l.current_balance,
        balance_type: l.balance_type,
        nature: l.account_groups?.nature ?? null,
      }));
    },
    enabled: !!tenantId,
  });

  const { data: expenseReports = [], isLoading: expLoading } = useQuery({
    queryKey: ["fin-pnl-expenses", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("expense_reports") as any)
        .select("total_amount, status, created_at")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const dso = useMemo(() => computeDso(invoices, payments), [invoices, payments]);
  const pnl = useMemo(() => computePnl(invoices, ledgers, expenseReports as any[]), [invoices, ledgers, expenseReports]);

  const cashOpportunity = Math.max(0, dso.dsoGap) * dso.cashPerDsoDay;

  const isLoading = invLoading || payLoading || ledgerLoading || expLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const pnlChart = pnl.periods.map((p) => ({
    period: p.period,
    Revenue: Math.round(p.revenue),
    Cost: Math.round(p.cogs + p.expenses),
    Profit: Math.round(p.netProfit),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Days Sales Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dso.dso.toFixed(1)}d</p>
            <p className="text-xs text-muted-foreground mt-1">
              Terms {dso.averageTerms.toFixed(0)}d · {dso.samples} settled payments
            </p>
            <div className="mt-3">
              <Progress value={Math.min(100, dso.bestPossibleDso > 0 ? (dso.bestPossibleDso / Math.max(dso.dso, 1)) * 100 : 0)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Collection efficiency vs agreed terms</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {dso.dsoGap > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-destructive" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-emerald-500" />
              )}
              DSO Gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${dso.dsoGap > 0 ? "text-destructive" : "text-emerald-500"}`}>
              {dso.dsoGap > 0 ? "+" : ""}
              {dso.dsoGap.toFixed(1)}d
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {cashOpportunity > 0
                ? `${formatINR(cashOpportunity)} cash unlockable by collecting on terms`
                : "Collecting at or ahead of terms"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              On-time Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dso.onTimeRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Payments received on or before due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {pnl.status === "loss" ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              )}
              Net Profit / Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${pnl.netProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {formatINR(pnl.netProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Net margin {pnl.netMargin.toFixed(1)}% · Gross {pnl.grossMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profit vs Loss Trend</CardTitle>
            <CardDescription>Revenue against total cost with net profit overlay (last 6 months).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pnlChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatINR(Number(v))} />
                  <Tooltip
                    formatter={(value: number | string) => formatINR(Number(value))}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cost" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Profit" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Profitability Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Revenue (recognised)" value={formatINR(pnl.revenue)} />
            <Row label="Direct cost (COGS)" value={formatINR(pnl.cogs)} tone="negative" />
            <Row label="Gross profit" value={formatINR(pnl.grossProfit)} tone={pnl.grossProfit >= 0 ? "positive" : "negative"} />
            <Row label="Operating & reimbursed expenses" value={formatINR(pnl.expenses)} tone="negative" />
            <div className="h-px bg-border" />
            <Row
              label="Net result"
              value={formatINR(pnl.netProfit)}
              tone={pnl.netProfit >= 0 ? "positive" : "negative"}
              bold
            />
            <div className="pt-2">
              <Badge variant="outline" className="w-full justify-center py-1.5">
                Break-even revenue {formatINR(pnl.breakEvenRevenue)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DSO Trend & Cash Collected</CardTitle>
          <CardDescription>Monthly value-weighted collection days derived from the payment ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          {dso.trend.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No settled payments yet — record payments to build the DSO trend.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dso.trend}>
                  <defs>
                    <linearGradient id="dsoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Area type="monotone" dataKey="dso" name="DSO (days)" stroke="hsl(var(--primary))" fill="url(#dsoFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "neutral",
  bold,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  bold?: boolean;
}) {
  const toneClass = tone === "positive" ? "text-emerald-500" : tone === "negative" ? "text-rose-500" : "";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? "text-base font-bold" : "font-semibold"} ${toneClass}`}>{value}</span>
    </div>
  );
}
