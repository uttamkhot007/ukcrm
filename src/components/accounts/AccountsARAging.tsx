import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, differenceInDays } from "date-fns";
import {
  Search,
  Download,
  Filter,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  Building2,
  User,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface Invoice {
  id: string;
  invoice_number: string;
  contact_id: string | null;
  total: number;
  amount_paid: number | null;
  due_date: string;
  issue_date: string;
  status: string;
  contact?: {
    name: string;
    company: string | null;
  };
}

interface AgingBucket {
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
}

const AGING_BUCKETS: AgingBucket[] = [
  { label: "Current", range: "0-30 days", min: 0, max: 30, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  { label: "31-60 Days", range: "31-60 days", min: 31, max: 60, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  { label: "61-90 Days", range: "61-90 days", min: 61, max: 90, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  { label: "91-120 Days", range: "91-120 days", min: 91, max: 120, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  { label: "Over 120 Days", range: ">120 days", min: 121, max: Infinity, color: "text-red-800", bgColor: "bg-red-200 dark:bg-red-900/50" },
];

export function AccountsARaging() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<string>("all");
  const { formatCurrency } = useOrganizationSettings();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["ar-aging-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          contact_id,
          total,
          amount_paid,
          due_date,
          issue_date,
          status,
          contacts:contact_id (name, company)
        `)
        .in("status", ["sent", "overdue", "partially_paid"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as Invoice[];
    },
  });

  const getAgingDays = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    return differenceInDays(today, due);
  };

  const getAgingBucket = (dueDate: string): AgingBucket => {
    const days = getAgingDays(dueDate);
    return AGING_BUCKETS.find((b) => days >= b.min && days <= b.max) || AGING_BUCKETS[4];
  };

  const getOutstandingAmount = (invoice: Invoice): number => {
    return invoice.total - (invoice.amount_paid || 0);
  };

  const calculateAgingStats = () => {
    const stats = AGING_BUCKETS.map((bucket) => {
      const bucketInvoices = invoices.filter((inv) => {
        const days = getAgingDays(inv.due_date);
        return days >= bucket.min && days <= bucket.max;
      });
      const totalAmount = bucketInvoices.reduce((sum, inv) => sum + getOutstandingAmount(inv), 0);
      return {
        ...bucket,
        count: bucketInvoices.length,
        amount: totalAmount,
      };
    });
    return stats;
  };

  const agingStats = calculateAgingStats();
  const totalOutstanding = invoices.reduce((sum, inv) => sum + getOutstandingAmount(inv), 0);
  const totalOverdue = invoices
    .filter((inv) => getAgingDays(inv.due_date) > 0)
    .reduce((sum, inv) => sum + getOutstandingAmount(inv), 0);

  const filteredInvoices = invoices.filter((invoice) => {
    // Filter by bucket
    if (selectedBucket !== "all") {
      const bucket = AGING_BUCKETS.find((b) => b.label === selectedBucket);
      if (bucket) {
        const days = getAgingDays(invoice.due_date);
        if (days < bucket.min || days > bucket.max) return false;
      }
    }

    // Filter by search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        invoice.invoice_number.toLowerCase().includes(searchLower) ||
        invoice.contact?.name?.toLowerCase().includes(searchLower) ||
        invoice.contact?.company?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ["Invoice #", "Company", "Contact", "Due Date", "Days Overdue", "Amount Due", "Status"];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number,
      inv.contact?.company || "-",
      inv.contact?.name || "-",
      format(new Date(inv.due_date), "yyyy-MM-dd"),
      Math.max(0, getAgingDays(inv.due_date)),
      getOutstandingAmount(inv),
      inv.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ar-aging-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Overdue</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Days Overdue</p>
                <p className="text-2xl font-bold">
                  {invoices.length > 0
                    ? Math.round(
                        invoices.reduce((sum, inv) => sum + Math.max(0, getAgingDays(inv.due_date)), 0) /
                          invoices.length
                      )
                    : 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Buckets */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Summary</CardTitle>
          <CardDescription>Outstanding receivables by aging period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {agingStats.map((bucket) => (
              <Card
                key={bucket.label}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedBucket === bucket.label ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedBucket(selectedBucket === bucket.label ? "all" : bucket.label)}
              >
                <CardContent className={`p-4 ${bucket.bgColor}`}>
                  <p className={`text-sm font-medium ${bucket.color}`}>{bucket.label}</p>
                  <p className={`text-xl font-bold ${bucket.color}`}>{formatCurrency(bucket.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{bucket.count} invoices</p>
                  <Progress
                    value={totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0}
                    className="h-1 mt-2"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedBucket} onValueChange={setSelectedBucket}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Buckets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buckets</SelectItem>
              {AGING_BUCKETS.map((bucket) => (
                <SelectItem key={bucket.label} value={bucket.label}>
                  {bucket.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts Receivable Detail</CardTitle>
          <CardDescription>Individual invoice aging details</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const agingDays = getAgingDays(invoice.due_date);
                  const bucket = getAgingBucket(invoice.due_date);
                  const outstanding = getOutstandingAmount(invoice);

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {invoice.contact?.company || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {invoice.contact?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(invoice.due_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agingDays > 0 ? (
                          <span className={bucket.color}>{agingDays} days</span>
                        ) : (
                          <span className="text-green-600">Due in {Math.abs(agingDays)} days</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(outstanding)}</TableCell>
                      <TableCell>
                        <Badge className={bucket.bgColor + " " + bucket.color}>{bucket.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
