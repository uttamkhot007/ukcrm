import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Plus, Search, FileText, DollarSign, CheckCircle, Loader2, MoreHorizontal, Pencil, Trash2, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { exportToCSV } from "@/lib/csv-export";

type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

const statusColors: Record<QuotationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  expired: "bg-amber-500/20 text-amber-400",
};

const statusLabels: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

const initialFormData = {
  title: "",
  description: "",
  subtotal: "",
  tax_rate: "18",
  status: "draft" as QuotationStatus,
  valid_until: "",
  terms: "",
  notes: "",
  currency: "INR",
};

export function QuotationsView() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency, currency: orgCurrency } = useOrganizationSettings();
  const { formatConvertedAmount } = useExchangeRates();
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quotation[];
    },
  });

  const createQuotation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const subtotal = parseFloat(data.subtotal) || 0;
      const taxRate = parseFloat(data.tax_rate) || 18;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const { error } = await supabase.from("quotations").insert({
        quotation_number: "TEMP", // Will be replaced by trigger
        title: data.title.trim(),
        description: data.description.trim() || null,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        status: data.status,
        valid_until: data.valid_until || null,
        terms: data.terms.trim() || null,
        notes: data.notes.trim() || null,
        user_id: user!.id,
        currency: data.currency,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      closeDialog();
      toast({ title: "Quotation created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating quotation", description: error.message, variant: "destructive" });
    },
  });

  const updateQuotation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const subtotal = parseFloat(data.subtotal) || 0;
      const taxRate = parseFloat(data.tax_rate) || 18;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const { error } = await supabase
        .from("quotations")
        .update({
          title: data.title.trim(),
          description: data.description.trim() || null,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          status: data.status,
          valid_until: data.valid_until || null,
          terms: data.terms.trim() || null,
          notes: data.notes.trim() || null,
          currency: data.currency,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      closeDialog();
      toast({ title: "Quotation updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating quotation", description: error.message, variant: "destructive" });
    },
  });

  const deleteQuotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setDeleteTarget(null);
      toast({ title: "Quotation deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting quotation", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingQuotation(null);
    setFormData(initialFormData);
  };

  const openEditDialog = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormData({
      title: quotation.title,
      description: quotation.description || "",
      subtotal: String(quotation.subtotal),
      tax_rate: String(quotation.tax_rate || 18),
      status: quotation.status,
      valid_until: quotation.valid_until || "",
      terms: quotation.terms || "",
      notes: quotation.notes || "",
      currency: (quotation as any).currency || orgCurrency,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuotation) {
      updateQuotation.mutate({ id: editingQuotation.id, data: formData });
    } else {
      createQuotation.mutate(formData);
    }
  };

  const filteredQuotations = quotations?.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.quotation_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    if (!filteredQuotations?.length) return;
    exportToCSV(filteredQuotations, "quotations", [
      { key: "quotation_number", label: "Number" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status", transform: (v) => statusLabels[v as QuotationStatus] || String(v) },
      { key: "subtotal", label: "Subtotal", transform: (v) => String(v) },
      { key: "tax_rate", label: "Tax Rate (%)", transform: (v) => String(v || "") },
      { key: "tax_amount", label: "Tax Amount", transform: (v) => String(v) },
      { key: "total", label: "Total", transform: (v) => String(v) },
      { key: "valid_until", label: "Valid Until", transform: (v) => v ? format(new Date(v as string), "yyyy-MM-dd") : "" },
      { key: "description", label: "Description", transform: (v) => String(v || "") },
      { key: "created_at", label: "Created", transform: (v) => format(new Date(v as string), "yyyy-MM-dd") },
    ]);
  };

  const totalValue = quotations?.reduce((sum, q) => sum + Number(q.total), 0) || 0;
  const acceptedCount = quotations?.filter((q) => q.status === "accepted").length || 0;
  const isPending = createQuotation.isPending || updateQuotation.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Quotations</p>
              <p className="text-2xl font-bold">{quotations?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accepted</p>
              <p className="text-2xl font-bold">{acceptedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!filteredQuotations?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Quotation
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingQuotation ? "Edit Quotation" : "Create New Quotation"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={500}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as QuotationStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal ({formData.currency === "INR" ? "₹" : "$"})</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    min="0"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  maxLength={2000}
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingQuotation ? "Update Quotation" : "Create Quotation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="glass border-border">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No quotations found. Create your first quotation to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations?.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-mono text-sm">{quotation.quotation_number}</TableCell>
                    <TableCell className="font-medium">{quotation.title}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[quotation.status]}>
                        {statusLabels[quotation.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(quotation.subtotal), (quotation as any).currency || orgCurrency)}</TableCell>
                    <TableCell className="font-semibold">
                      <div>
                        <span>{formatCurrency(Number(quotation.total), (quotation as any).currency || orgCurrency)}</span>
                        {(() => {
                          const qCurrency = (quotation as any).currency || orgCurrency;
                          const altCurrency = qCurrency === "INR" ? "USD" : "INR";
                          const converted = formatConvertedAmount(Number(quotation.total), qCurrency, altCurrency, formatCurrency);
                          return converted ? (
                            <span className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              ≈ {converted}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {quotation.valid_until
                        ? format(new Date(quotation.valid_until), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(quotation.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(quotation)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(quotation)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteQuotation.mutate(deleteTarget.id)}
        title="Delete Quotation"
        description={`Are you sure you want to delete quotation "${deleteTarget?.quotation_number}"? This action cannot be undone.`}
        isDeleting={deleteQuotation.isPending}
      />
    </div>
  );
}
