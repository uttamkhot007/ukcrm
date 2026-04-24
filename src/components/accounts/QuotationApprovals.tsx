import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Search, Receipt, ArrowRight, Eye, DollarSign, Clock, CheckCircle2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { workflows } from "@/lib/workflows";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  expired: "bg-yellow-500/20 text-yellow-400",
};

export function QuotationApprovals() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"proforma" | "invoice">("invoice");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["accounts-quotations", currentTenant?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("quotations")
        .select("*, contacts(name, company)")
        .order("created_at", { ascending: false });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      // For accounts, show sent & accepted quotations primarily
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "draft" | "sent" | "accepted" | "rejected" | "expired");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const generateInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedQuotation || !user) throw new Error("Missing data");

      const isProforma = invoiceType === "proforma";

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: "TEMP",
          contact_id: selectedQuotation.contact_id,
          deal_id: selectedQuotation.deal_id,
          subtotal: selectedQuotation.subtotal,
          tax_rate: selectedQuotation.tax_rate,
          tax_amount: selectedQuotation.tax_amount,
          discount_amount: selectedQuotation.discount_amount || 0,
          total: selectedQuotation.total,
          currency: selectedQuotation.currency || "INR",
          due_date: dueDate,
          notes: `${isProforma ? "[PROFORMA] " : ""}Generated from Quotation ${selectedQuotation.quotation_number}. ${invoiceNotes}`.trim(),
          status: isProforma ? "draft" : "draft",
          billing_frequency: "one_time",
          created_by: user.id,
          tenant_id: currentTenant?.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Copy quotation items to invoice items
      const { data: quotationItems } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", selectedQuotation.id)
        .order("sort_order");

      if (quotationItems && quotationItems.length > 0) {
        const invoiceItems = quotationItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItems);
        if (itemsError) throw itemsError;
      }

      workflows.invoiceCreated(invoice.id);
      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
      setInvoiceDialogOpen(false);
      setSelectedQuotation(null);
      setInvoiceNotes("");
      toast.success(
        `${invoiceType === "proforma" ? "Proforma Invoice" : "Invoice"} generated successfully from quotation`
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate invoice");
    },
  });

  const filtered = quotations.filter((q: any) => {
    const matchesSearch =
      !search ||
      q.quotation_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.title?.toLowerCase().includes(search.toLowerCase()) ||
      q.contacts?.name?.toLowerCase().includes(search.toLowerCase()) ||
      q.contacts?.company?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: quotations.length,
    sent: quotations.filter((q: any) => q.status === "sent").length,
    accepted: quotations.filter((q: any) => q.status === "accepted").length,
    totalValue: quotations.reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0),
  };

  const openInvoiceDialog = (quotation: any, type: "proforma" | "invoice") => {
    setSelectedQuotation(quotation);
    setInvoiceType(type);
    setInvoiceDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Quotation → Invoice Workflow</h2>
        <p className="text-muted-foreground">
          Review sales quotations and generate proforma or actual invoices
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Quotations</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Awaiting Action</p>
                <p className="text-xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="text-xl font-bold">{stats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading quotations...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No quotations found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">{q.quotation_number}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{q.title}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{q.contacts?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{q.contacts?.company || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(q.total)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[q.status] || "bg-muted"} variant="secondary">
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(q.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInvoiceDialog(q, "proforma")}
                          className="text-xs"
                        >
                          <Receipt className="h-3.5 w-3.5 mr-1" />
                          Proforma
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openInvoiceDialog(q, "invoice")}
                          className="text-xs"
                        >
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          Invoice
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Generate {invoiceType === "proforma" ? "Proforma Invoice" : "Invoice"}
            </DialogTitle>
          </DialogHeader>

          {selectedQuotation && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50 space-y-1">
                <p className="text-sm font-medium">From Quotation: {selectedQuotation.quotation_number}</p>
                <p className="text-xs text-muted-foreground">{selectedQuotation.title}</p>
                <p className="text-sm font-bold mt-1">{formatCurrency(selectedQuotation.total)}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Invoice Type</Label>
                  <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proforma">Proforma Invoice</SelectItem>
                      <SelectItem value="invoice">Tax Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Additional notes for the invoice..."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateInvoice.mutate()}
              disabled={generateInvoice.isPending}
            >
              {generateInvoice.isPending ? "Generating..." : `Generate ${invoiceType === "proforma" ? "Proforma" : "Invoice"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
