import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, BellRing, CheckCircle2, IndianRupee, Timer, Wallet, Zap } from "lucide-react";
import {
  analyzeCollections,
  formatINR,
  type FinanceInvoice,
  type FinancePayment,
  type InvoiceCollectionIntel,
} from "@/lib/finance-intelligence";

const LEVEL_STYLES: Record<string, { label: string; className: string }> = {
  on_track: { label: "On track", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  watch: { label: "Watch", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  overdue: { label: "Overdue", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PAYMENT_METHODS = ["bank_transfer", "neft", "rtgs", "upi", "cheque", "cash", "card", "other"];

export function PaymentTrackingPanel() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const [selected, setSelected] = useState<InvoiceCollectionIntel | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["fin-collections-invoices", tenantId],
    queryFn: async (): Promise<FinanceInvoice[]> => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("invoices") as any)
        .select("id, invoice_number, contact_id, total, amount_paid, status, issue_date, due_date, currency")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as FinanceInvoice[];
    },
    enabled: !!tenantId,
  });

  const invoiceIds = useMemo(() => invoices.map((i) => i.id), [invoices]);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["fin-collections-payments", tenantId, invoiceIds.length],
    queryFn: async (): Promise<FinancePayment[]> => {
      if (!invoiceIds.length) return [];
      const { data, error } = await (supabase.from("payment_records") as any)
        .select("id, invoice_id, amount, payment_date, payment_method, reference_number")
        .in("invoice_id", invoiceIds);
      if (error) throw error;
      return (data || []) as FinancePayment[];
    },
    enabled: invoiceIds.length > 0,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["fin-collections-contacts", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase.from("contacts") as any)
        .select("id, name, company")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const contactMap = useMemo(() => {
    const map = new Map<string, string>();
    (contacts as any[]).forEach((c) => map.set(c.id, c.company || c.name || "—"));
    return map;
  }, [contacts]);

  const { items, summary } = useMemo(() => analyzeCollections(invoices, payments), [invoices, payments]);

  const openItems = useMemo(
    () => items.filter((i) => i.outstanding > 0 && (levelFilter === "all" || i.level === levelFilter)),
    [items, levelFilter],
  );

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No invoice selected");
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a payment amount greater than zero");
      if (value > selected.outstanding + 0.5) {
        throw new Error(`Amount exceeds the outstanding balance of ${formatINR(selected.outstanding)}`);
      }
      if (new Date(paymentDate) > new Date()) throw new Error("Payment date cannot be in the future");

      const { error: insertError } = await (supabase.from("payment_records") as any).insert({
        invoice_id: selected.invoiceId,
        amount: value,
        payment_method: method,
        payment_date: paymentDate,
        reference_number: reference || null,
        notes: notes || null,
        recorded_by: user?.id ?? null,
      });
      if (insertError) throw insertError;

      const newPaid = selected.paid + value;
      const fullySettled = newPaid >= selected.total - 0.5;
      const { error: updateError } = await (supabase.from("invoices") as any)
        .update({
          amount_paid: newPaid,
          status: fullySettled ? "paid" : "partially_paid",
        })
        .eq("id", selected.invoiceId)
        .eq("tenant_id", tenantId);
      if (updateError) throw updateError;
      return { fullySettled };
    },
    onSuccess: ({ fullySettled }) => {
      toast.success(fullySettled ? "Payment recorded — invoice settled" : "Partial payment recorded");
      queryClient.invalidateQueries({ queryKey: ["fin-collections-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["fin-collections-payments"] });
      queryClient.invalidateQueries({ queryKey: ["fi-invoices"] });
      setSelected(null);
      setAmount("");
      setReference("");
      setNotes("");
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not record the payment"),
  });

  const sendReminder = useMutation({
    mutationFn: async (item: InvoiceCollectionIntel) => {
      if (!user?.id || !tenantId) throw new Error("Not authenticated");
      const { error } = await (supabase.from("notifications") as any).insert({
        user_id: user.id,
        tenant_id: tenantId,
        title: `Collection follow-up: ${item.invoiceNumber}`,
        message: `${formatINR(item.outstanding)} outstanding${item.daysOverdue > 0 ? `, overdue ${item.daysOverdue} days` : ""}. Next best action: ${item.actions[0]?.label ?? "Follow up with the customer"}.`,
        type: item.level === "critical" ? "warning" : "info",
        category: "finance",
        reference_id: item.invoiceId,
        reference_type: "invoice",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Follow-up queued in your notifications"),
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not queue the follow-up"),
  });

  const isLoading = invoicesLoading || paymentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          title="Open Receivables"
          value={formatINR(summary.totalOutstanding)}
          subtitle={`${summary.invoicesTracked} invoices tracked`}
        />
        <StatCard
          icon={AlertTriangle}
          title="Overdue"
          value={formatINR(summary.overdueOutstanding)}
          subtitle={`${summary.overdueCount} invoices past due`}
          tone="danger"
        />
        <StatCard
          icon={Timer}
          title="Value at Risk"
          value={formatINR(summary.atRiskValue)}
          subtitle={`Weighted risk ${summary.weightedRisk.toFixed(0)}/100`}
          tone="warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Collection Rate"
          value={`${summary.collectionRate.toFixed(1)}%`}
          subtitle={`${summary.partiallyPaidCount} part-paid invoices`}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Collection Worklist
            </CardTitle>
            <CardDescription>
              Invoices ranked by deterministic collection risk with the next best action for each.
            </CardDescription>
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="watch">Watch</SelectItem>
              <SelectItem value="on_track">On track</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {openItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium">No open receivables match this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Ageing</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Next best action</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openItems.slice(0, 60).map((item) => {
                    const style = LEVEL_STYLES[item.level];
                    return (
                      <TableRow key={item.invoiceId}>
                        <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {item.contactId ? contactMap.get(item.contactId) ?? "—" : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatINR(item.outstanding)}</TableCell>
                        <TableCell className="w-32">
                          <Progress value={item.paidPercent} className="h-2" />
                          <span className="text-xs text-muted-foreground">{item.paidPercent.toFixed(0)}% paid</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item.bucket}</span>
                          {item.daysOverdue > 0 && (
                            <span className="block text-xs text-muted-foreground">{item.daysOverdue}d overdue</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={style.className}>
                            {style.label} · {item.riskScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="text-sm">{item.actions[0]?.label ?? "Monitor"}</span>
                          {item.reasons[0] && (
                            <span className="block text-xs text-muted-foreground truncate">{item.reasons[0]}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => sendReminder.mutate(item)}
                            disabled={sendReminder.isPending}
                          >
                            <BellRing className="h-4 w-4" />
                            Follow up
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 ml-1"
                            onClick={() => {
                              setSelected(item);
                              setAmount(String(Math.round(item.outstanding)));
                            }}
                          >
                            <IndianRupee className="h-4 w-4" />
                            Record
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment · {selected?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Outstanding {selected ? formatINR(selected.outstanding) : "—"}. The invoice status updates automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount received</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Payment date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Reference / UTR</Label>
                <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea id="pay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  tone = "default",
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-500"
        : tone === "success"
          ? "text-emerald-500"
          : "text-primary";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className={`h-4 w-4 ${toneClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
