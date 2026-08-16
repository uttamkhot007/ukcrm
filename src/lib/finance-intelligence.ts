/**
 * Deterministic finance collections + profitability engine (Phase B).
 *
 * Runs client-side on data already fetched from the database so the Finance
 * module renders collection risk, true DSO and P&L instantly, with no AI
 * round-trip. The AI layer stays for narrative commentary only.
 */

export interface FinanceInvoice {
  id: string;
  invoice_number: string | null;
  contact_id: string | null;
  total: number | null;
  amount_paid: number | null;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency?: string | null;
}

export interface FinancePayment {
  id: string;
  invoice_id: string | null;
  amount: number | null;
  payment_date: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
}

export interface FinanceLedger {
  name: string | null;
  current_balance: number | null;
  balance_type?: string | null;
  nature?: string | null;
}

export type CollectionLevel = "on_track" | "watch" | "overdue" | "critical";

export interface CollectionAction {
  code: string;
  label: string;
  priority: number;
  rationale: string;
}

export interface InvoiceCollectionIntel {
  invoiceId: string;
  invoiceNumber: string;
  contactId: string | null;
  total: number;
  paid: number;
  outstanding: number;
  paidPercent: number;
  daysOverdue: number;
  daysToDue: number | null;
  ageDays: number;
  bucket: string;
  riskScore: number;
  level: CollectionLevel;
  reasons: string[];
  actions: CollectionAction[];
  lastPaymentDate: string | null;
  expectedCollectionDate: string | null;
}

export interface CollectionsSummary {
  totalOutstanding: number;
  overdueOutstanding: number;
  atRiskValue: number;
  invoicesTracked: number;
  overdueCount: number;
  partiallyPaidCount: number;
  collectionRate: number;
  weightedRisk: number;
  buckets: { label: string; value: number; count: number }[];
}

export interface DsoMetrics {
  /** Days Sales Outstanding using the true payment ledger (weighted by amount). */
  dso: number;
  /** Best possible DSO if every invoice were paid exactly on terms. */
  bestPossibleDso: number;
  /** dso - bestPossibleDso: the collection efficiency gap in days. */
  dsoGap: number;
  /** Average agreed credit period across invoices. */
  averageTerms: number;
  /** Share of invoices settled on or before due date. */
  onTimeRate: number;
  samples: number;
  /** Cash locked per day of DSO — used to quantify improvement opportunities. */
  cashPerDsoDay: number;
  trend: { period: string; dso: number; collected: number }[];
}

export interface PnlPeriod {
  period: string;
  revenue: number;
  cogs: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
}

export interface PnlSummary {
  revenue: number;
  cogs: number;
  expenses: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  breakEvenRevenue: number;
  periods: PnlPeriod[];
  status: "profit" | "loss" | "breakeven";
}

export const AGING_BUCKETS = [
  { label: "Not due", min: -Infinity, max: 0 },
  { label: "1-30 days", min: 0, max: 30 },
  { label: "31-60 days", min: 30, max: 60 },
  { label: "61-90 days", min: 60, max: 90 },
  { label: "90+ days", min: 90, max: Infinity },
] as const;

const DAY_MS = 86_400_000;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function bucketFor(daysOverdue: number): string {
  const match = AGING_BUCKETS.find((b) => daysOverdue > b.min && daysOverdue <= b.max);
  return match?.label ?? AGING_BUCKETS[AGING_BUCKETS.length - 1].label;
}

/** Per-invoice collection risk, explainable and fully deterministic. */
export function analyzeInvoice(
  invoice: FinanceInvoice,
  payments: FinancePayment[],
  now: Date = new Date(),
): InvoiceCollectionIntel {
  const total = num(invoice.total);
  const invoicePayments = payments.filter((p) => p.invoice_id === invoice.id);
  const ledgerPaid = invoicePayments.reduce((s, p) => s + num(p.amount), 0);
  const paid = Math.max(num(invoice.amount_paid), ledgerPaid);
  const outstanding = Math.max(0, total - paid);
  const paidPercent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  const issued = toDate(invoice.issue_date);
  const due = toDate(invoice.due_date);
  const ageDays = issued ? Math.max(0, diffDays(now, issued)) : 0;
  const daysOverdue = due ? Math.max(0, diffDays(now, due)) : 0;
  const daysToDue = due ? diffDays(due, now) : null;

  const lastPayment = invoicePayments
    .map((p) => p.payment_date)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  const reasons: string[] = [];
  const actions: CollectionAction[] = [];
  let risk = 0;

  if (outstanding <= 0 || invoice.status === "paid") {
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number ?? "—",
      contactId: invoice.contact_id,
      total,
      paid,
      outstanding: 0,
      paidPercent: 100,
      daysOverdue: 0,
      daysToDue,
      ageDays,
      bucket: "Settled",
      riskScore: 0,
      level: "on_track",
      reasons: ["Invoice fully settled"],
      actions: [],
      lastPaymentDate: lastPayment,
      expectedCollectionDate: lastPayment,
    };
  }

  if (daysOverdue > 90) {
    risk += 45;
    reasons.push(`Overdue ${daysOverdue} days — beyond 90-day provisioning threshold`);
    actions.push({
      code: "escalate_legal",
      label: "Escalate to recovery / legal review",
      priority: 100,
      rationale: "Invoices past 90 days recover materially less without formal escalation.",
    });
  } else if (daysOverdue > 60) {
    risk += 32;
    reasons.push(`Overdue ${daysOverdue} days`);
    actions.push({
      code: "escalate_owner",
      label: "Escalate to account owner + finance head",
      priority: 80,
      rationale: "60+ days overdue needs a joint sales/finance push.",
    });
  } else if (daysOverdue > 30) {
    risk += 22;
    reasons.push(`Overdue ${daysOverdue} days`);
    actions.push({
      code: "call_customer",
      label: "Call the billing contact for a payment date",
      priority: 60,
      rationale: "A committed date at 30+ days sharply improves recovery.",
    });
  } else if (daysOverdue > 0) {
    risk += 12;
    reasons.push(`Overdue ${daysOverdue} days`);
    actions.push({
      code: "send_reminder",
      label: "Send a payment reminder",
      priority: 40,
      rationale: "Early, polite reminders clear most sub-30-day balances.",
    });
  } else if (daysToDue !== null && daysToDue <= 7) {
    risk += 5;
    reasons.push(`Due in ${daysToDue} day(s)`);
    actions.push({
      code: "pre_due_nudge",
      label: "Send a pre-due courtesy nudge",
      priority: 25,
      rationale: "Pre-due confirmation prevents the invoice from ageing at all.",
    });
  }

  if (outstanding >= 1_000_000) {
    risk += 15;
    reasons.push("High-value exposure (₹10L+) concentrated in one invoice");
  } else if (outstanding >= 250_000) {
    risk += 8;
    reasons.push("Material exposure (₹2.5L+)");
  }

  if (paid > 0 && outstanding > 0) {
    risk -= 6;
    reasons.push(`Part-paid: ${paidPercent.toFixed(0)}% already collected`);
    actions.push({
      code: "collect_balance",
      label: "Chase the remaining balance",
      priority: 45,
      rationale: "Part-paying customers usually settle the balance on a single follow-up.",
    });
  }

  if (!due) {
    risk += 10;
    reasons.push("No due date on the invoice — payment terms are unenforceable");
    actions.push({
      code: "set_terms",
      label: "Set payment terms / due date",
      priority: 70,
      rationale: "Invoices without terms cannot be aged or chased consistently.",
    });
  }

  if (invoice.status === "draft") {
    risk += 18;
    reasons.push("Invoice still in draft — not yet issued to the customer");
    actions.push({
      code: "issue_invoice",
      label: "Issue the invoice to the customer",
      priority: 90,
      rationale: "Revenue cannot be collected while the invoice remains unsent.",
    });
  }

  if (ageDays > 180) {
    risk += 10;
    reasons.push("Raised more than 180 days ago");
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(risk)));
  const level: CollectionLevel =
    riskScore >= 70 ? "critical" : riskScore >= 40 ? "overdue" : riskScore >= 15 ? "watch" : "on_track";

  const expected = due ? new Date(due.getTime() + Math.min(daysOverdue, 30) * DAY_MS) : null;

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number ?? "—",
    contactId: invoice.contact_id,
    total,
    paid,
    outstanding,
    paidPercent,
    daysOverdue,
    daysToDue,
    ageDays,
    bucket: bucketFor(daysOverdue),
    riskScore,
    level,
    reasons,
    actions: actions.sort((a, b) => b.priority - a.priority),
    lastPaymentDate: lastPayment,
    expectedCollectionDate: expected ? expected.toISOString().slice(0, 10) : null,
  };
}

export function analyzeCollections(
  invoices: FinanceInvoice[],
  payments: FinancePayment[],
  now: Date = new Date(),
): { items: InvoiceCollectionIntel[]; summary: CollectionsSummary } {
  const items = invoices
    .map((inv) => analyzeInvoice(inv, payments, now))
    .sort((a, b) => b.riskScore - a.riskScore || b.outstanding - a.outstanding);

  const open = items.filter((i) => i.outstanding > 0);
  const totalOutstanding = open.reduce((s, i) => s + i.outstanding, 0);
  const overdue = open.filter((i) => i.daysOverdue > 0);
  const invoicedTotal = items.reduce((s, i) => s + i.total, 0);
  const collectedTotal = items.reduce((s, i) => s + i.paid, 0);

  const buckets = AGING_BUCKETS.map((b) => {
    const rows = open.filter((i) => bucketFor(i.daysOverdue) === b.label);
    return {
      label: b.label,
      value: rows.reduce((s, i) => s + i.outstanding, 0),
      count: rows.length,
    };
  });

  return {
    items,
    summary: {
      totalOutstanding,
      overdueOutstanding: overdue.reduce((s, i) => s + i.outstanding, 0),
      atRiskValue: open.filter((i) => i.level === "critical" || i.level === "overdue").reduce((s, i) => s + i.outstanding, 0),
      invoicesTracked: open.length,
      overdueCount: overdue.length,
      partiallyPaidCount: open.filter((i) => i.paid > 0).length,
      collectionRate: invoicedTotal > 0 ? (collectedTotal / invoicedTotal) * 100 : 0,
      weightedRisk: totalOutstanding > 0 ? open.reduce((s, i) => s + i.riskScore * i.outstanding, 0) / totalOutstanding : 0,
      buckets,
    },
  };
}

/**
 * True DSO from the payment ledger: each settled amount is weighted by the days
 * it took from invoice issue to cash-in. Falls back to open-invoice ageing when
 * there is no payment history yet.
 */
export function computeDso(
  invoices: FinanceInvoice[],
  payments: FinancePayment[],
  now: Date = new Date(),
  windowDays = 365,
): DsoMetrics {
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);

  let weightedDays = 0;
  let weightedAmount = 0;
  let onTime = 0;
  let samples = 0;
  const monthly = new Map<string, { days: number; amount: number; collected: number }>();

  for (const payment of payments) {
    const invoice = payment.invoice_id ? invoiceById.get(payment.invoice_id) : undefined;
    const paidOn = toDate(payment.payment_date);
    const issued = invoice ? toDate(invoice.issue_date) : null;
    if (!invoice || !paidOn || !issued || paidOn < windowStart) continue;
    const amount = num(payment.amount);
    if (amount <= 0) continue;
    const days = Math.max(0, diffDays(paidOn, issued));
    weightedDays += days * amount;
    weightedAmount += amount;
    samples += 1;
    const due = toDate(invoice.due_date);
    if (due && paidOn <= due) onTime += 1;

    const period = payment.payment_date!.slice(0, 7);
    const entry = monthly.get(period) ?? { days: 0, amount: 0, collected: 0 };
    entry.days += days * amount;
    entry.amount += amount;
    entry.collected += amount;
    monthly.set(period, entry);
  }

  const openInvoices = invoices.filter((i) => num(i.total) - num(i.amount_paid) > 0.01 && i.status !== "paid");
  const openOutstanding = openInvoices.reduce((s, i) => s + (num(i.total) - num(i.amount_paid)), 0);

  let dso: number;
  if (weightedAmount > 0) {
    dso = weightedDays / weightedAmount;
  } else if (openInvoices.length > 0) {
    // No payment history: approximate with the value-weighted age of open invoices.
    const aged = openInvoices.reduce((s, i) => {
      const issued = toDate(i.issue_date);
      const outstanding = num(i.total) - num(i.amount_paid);
      return s + (issued ? Math.max(0, diffDays(now, issued)) : 0) * outstanding;
    }, 0);
    dso = openOutstanding > 0 ? aged / openOutstanding : 0;
  } else {
    dso = 0;
  }

  const termSamples = invoices
    .map((i) => {
      const issued = toDate(i.issue_date);
      const due = toDate(i.due_date);
      return issued && due ? Math.max(0, diffDays(due, issued)) : null;
    })
    .filter((v): v is number => v !== null);
  const averageTerms = termSamples.length ? termSamples.reduce((s, v) => s + v, 0) / termSamples.length : 30;

  const trend = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([period, v]) => ({
      period,
      dso: v.amount > 0 ? Math.round(v.days / v.amount) : 0,
      collected: Math.round(v.collected),
    }));

  const revenueWindow = invoices
    .filter((i) => {
      const issued = toDate(i.issue_date);
      return issued ? issued >= windowStart : false;
    })
    .reduce((s, i) => s + num(i.total), 0);
  const cashPerDsoDay = revenueWindow > 0 ? revenueWindow / windowDays : 0;

  return {
    dso: Math.round(dso * 10) / 10,
    bestPossibleDso: Math.round(averageTerms * 10) / 10,
    dsoGap: Math.round((dso - averageTerms) * 10) / 10,
    averageTerms: Math.round(averageTerms * 10) / 10,
    onTimeRate: samples > 0 ? (onTime / samples) * 100 : 0,
    samples,
    cashPerDsoDay,
    trend,
  };
}

/**
 * Profit & loss from issued invoices (revenue) against ledger expense accounts
 * and reimbursed expense reports (cost). COGS is derived from ledger groups
 * flagged as affecting gross profit ("direct" natures).
 */
export function computePnl(
  invoices: FinanceInvoice[],
  ledgers: FinanceLedger[],
  expenseReports: { total_amount: number | null; status: string | null; created_at: string | null }[],
  months = 6,
  now: Date = new Date(),
): PnlSummary {
  const periods: PnlPeriod[] = [];
  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const directCost = ledgers
    .filter((l) => (l.nature ?? "").toLowerCase().includes("direct") || (l.nature ?? "").toLowerCase() === "cogs")
    .reduce((s, l) => s + Math.abs(num(l.current_balance)), 0);
  const indirectCost = ledgers
    .filter((l) => {
      const nature = (l.nature ?? "").toLowerCase();
      return (nature.includes("expense") || nature.includes("indirect")) && !nature.includes("direct");
    })
    .reduce((s, l) => s + Math.abs(num(l.current_balance)), 0);

  const reimbursed = expenseReports
    .filter((r) => ["approved", "paid", "completed"].includes((r.status ?? "").toLowerCase()))
    .reduce((s, r) => s + num(r.total_amount), 0);

  const revenueByMonth = new Map<string, number>();
  for (const inv of invoices) {
    if (!inv.issue_date || inv.status === "cancelled" || inv.status === "draft") continue;
    const key = inv.issue_date.slice(0, 7);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + num(inv.total));
  }

  const expenseByMonth = new Map<string, number>();
  for (const report of expenseReports) {
    if (!report.created_at) continue;
    if (!["approved", "paid", "completed"].includes((report.status ?? "").toLowerCase())) continue;
    const key = report.created_at.slice(0, 7);
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + num(report.total_amount));
  }

  const totalRevenueInWindow = monthKeys.reduce((s, k) => s + (revenueByMonth.get(k) ?? 0), 0);

  for (const key of monthKeys) {
    const revenue = revenueByMonth.get(key) ?? 0;
    const share = totalRevenueInWindow > 0 ? revenue / totalRevenueInWindow : 1 / monthKeys.length;
    const cogs = directCost * share;
    const expenses = indirectCost * share + (expenseByMonth.get(key) ?? 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    periods.push({
      period: key,
      revenue,
      cogs,
      expenses,
      grossProfit,
      netProfit,
      margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    });
  }

  const revenue = periods.reduce((s, p) => s + p.revenue, 0);
  const cogs = directCost;
  const expenses = indirectCost + reimbursed;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;
  const grossMarginRatio = revenue > 0 ? grossProfit / revenue : 0;

  return {
    revenue,
    cogs,
    expenses,
    grossProfit,
    grossMargin: revenue > 0 ? grossMarginRatio * 100 : 0,
    netProfit,
    netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    breakEvenRevenue: grossMarginRatio > 0 ? expenses / grossMarginRatio : 0,
    periods,
    status: netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "breakeven",
  };
}

export function formatINR(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
