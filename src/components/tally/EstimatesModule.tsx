import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Download, Send, CheckCircle, XCircle, Clock, ArrowRight, Search, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

interface EstimateItem {
  id?: string;
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  amount: number;
}

export function EstimatesModule() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState<EstimateItem[]>([
    { item_name: "", description: "", quantity: 1, unit: "Nos", unit_price: 0, discount_percent: 0, tax_rate: 18, amount: 0 }
  ]);
  
  const [formData, setFormData] = useState({
    estimate_date: format(new Date(), "yyyy-MM-dd"),
    valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    contact_id: "",
    reference_number: "",
    notes: "",
    terms_and_conditions: "1. Prices are subject to change without prior notice.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Delivery within 7-10 working days."
  });

  // Fetch estimates
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["estimates", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("estimates") as any)
        .select(`
          *,
          contact:contacts(name, company, email),
          items:estimate_items(*)
        `)
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch contacts for dropdown
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-estimates", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, company, email")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate totals
  const calculateItemAmount = (item: EstimateItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = (subtotal * item.discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * item.tax_rate) / 100;
    return afterDiscount + taxAmount;
  };

  const updateItemAmount = (index: number, field: keyof EstimateItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].amount = calculateItemAmount(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { item_name: "", description: "", quantity: 1, unit: "Nos", unit_price: 0, discount_percent: 0, tax_rate: 18, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price * item.discount_percent) / 100), 0);
    const taxAmount = items.reduce((sum, item) => {
      const afterDiscount = (item.quantity * item.unit_price) - ((item.quantity * item.unit_price * item.discount_percent) / 100);
      return sum + ((afterDiscount * item.tax_rate) / 100);
    }, 0);
    const total = subtotal - discountAmount + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  };

  // Create estimate mutation
  const createEstimate = useMutation({
    mutationFn: async () => {
      const totals = calculateTotals();
      
      const { data: estimate, error: estimateError } = await (supabase
        .from("estimates") as any)
        .insert({
          tenant_id: currentTenant?.id,
          ...formData,
          contact_id: formData.contact_id || null,
          subtotal: totals.subtotal,
          discount_amount: totals.discountAmount,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          status: "draft"
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Insert items
      const itemsToInsert = items.map((item, index) => ({
        estimate_id: estimate.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        tax_rate: item.tax_rate,
        tax_amount: ((item.quantity * item.unit_price * (1 - item.discount_percent / 100)) * item.tax_rate) / 100,
        amount: item.amount,
        display_order: index
      }));

      const { error: itemsError } = await (supabase
        .from("estimate_items") as any)
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return estimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Estimate created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create estimate");
      console.error(error);
    }
  });

  // Update estimate status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (supabase
        .from("estimates") as any)
        .update({ 
          status,
          ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
          ...(status === "accepted" ? { accepted_at: new Date().toISOString() } : {})
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Status updated");
    }
  });

  const resetForm = () => {
    setFormData({
      estimate_date: format(new Date(), "yyyy-MM-dd"),
      valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      contact_id: "",
      reference_number: "",
      notes: "",
      terms_and_conditions: "1. Prices are subject to change without prior notice.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Delivery within 7-10 working days."
    });
    setItems([{ item_name: "", description: "", quantity: 1, unit: "Nos", unit_price: 0, discount_percent: 0, tax_rate: 18, amount: 0 }]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-500"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      case "converted":
        return <Badge className="bg-purple-500"><ArrowRight className="h-3 w-3 mr-1" />Converted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredEstimates = estimates.filter((est: any) =>
    est.estimate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    est.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    est.contact?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: estimates.length,
    draft: estimates.filter((e: any) => e.status === "draft").length,
    sent: estimates.filter((e: any) => e.status === "sent").length,
    accepted: estimates.filter((e: any) => e.status === "accepted").length,
    totalValue: estimates.filter((e: any) => e.status === "accepted").reduce((sum: number, e: any) => sum + (e.total_amount || 0), 0)
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Estimates & Quotations
          </h2>
          <p className="text-muted-foreground">Create and manage quotations for customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Estimates</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Draft</div>
            <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Sent</div>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Accepted</div>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Accepted Value</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Estimates List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredEstimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No estimates found. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEstimates.map((est: any) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-mono">{est.estimate_number}</TableCell>
                    <TableCell>{format(new Date(est.estimate_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{est.contact?.name || "-"}</div>
                        <div className="text-sm text-muted-foreground">{est.contact?.company}</div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(est.valid_until), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(est.total_amount)}</TableCell>
                    <TableCell>{getStatusBadge(est.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        {est.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: est.id, status: "sent" })}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {est.status === "sent" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => updateStatus.mutate({ id: est.id, status: "accepted" })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => updateStatus.mutate({ id: est.id, status: "declined" })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {est.status === "accepted" && (
                          <Button variant="ghost" size="sm" className="text-purple-600">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Estimate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Estimate</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Customer</Label>
                <Select value={formData.contact_id} onValueChange={(v) => setFormData({ ...formData, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.company ? `(${contact.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimate Date</Label>
                <Input
                  type="date"
                  value={formData.estimate_date}
                  onChange={(e) => setFormData({ ...formData, estimate_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
              <div>
                <Label>Reference No.</Label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="PO/RFQ Number"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[80px]">Unit</TableHead>
                    <TableHead className="w-[100px]">Rate</TableHead>
                    <TableHead className="w-[80px]">Disc %</TableHead>
                    <TableHead className="w-[80px]">Tax %</TableHead>
                    <TableHead className="w-[120px] text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateItemAmount(index, "item_name", e.target.value)}
                          placeholder="Item name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItemAmount(index, "description", e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemAmount(index, "quantity", parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItemAmount(index, "unit", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItemAmount(index, "unit_price", parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.discount_percent}
                          onChange={(e) => updateItemAmount(index, "discount_percent", parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) => updateItemAmount(index, "tax_rate", parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(calculateItemAmount(item))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(totals.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-mono">{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for the customer..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createEstimate.mutate()} disabled={createEstimate.isPending || items.every(i => !i.item_name)}>
              {createEstimate.isPending ? "Creating..." : "Create Estimate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
