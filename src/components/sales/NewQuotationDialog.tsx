import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileText, Settings, Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { TemplateSelector, DocumentTemplate } from "@/components/templates/TemplateSelector";
import { SolutionServiceSelector, PREDEFINED_SOLUTIONS, PREDEFINED_SERVICES, PAYMENT_TERMS } from "@/components/templates/SolutionServiceSelector";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface NewQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewQuotationDialog({ open, onOpenChange, onSuccess }: NewQuotationDialogProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("template");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedBuiltInIndex, setSelectedBuiltInIndex] = useState<number>(0);
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<string>("net_30");
  const [customPaymentTerms, setCustomPaymentTerms] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    contact_id: "",
    currency: "INR",
    valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    tax_rate: 18,
    terms: "",
    notes: "",
  });
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0 }
  ]);

  const { data: contacts } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name, company").order("name");
      if (error) throw error;
      return data;
    },
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = (subtotal * formData.tax_rate) / 100;
  const total = subtotal + taxAmount;

  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleTemplateSelect = (template: DocumentTemplate | null, isBuiltIn?: boolean, builtInIndex?: number) => {
    setSelectedTemplate(template);
    if (isBuiltIn && builtInIndex !== undefined) {
      setSelectedBuiltInIndex(builtInIndex);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const paymentTermLabel = PAYMENT_TERMS.find(p => p.id === selectedPaymentTerms)?.name || selectedPaymentTerms;
      const solutionLabels = selectedSolutions.map(id => PREDEFINED_SOLUTIONS.find(s => s.id === id)?.name || id);
      const serviceLabels = selectedServices.map(id => PREDEFINED_SERVICES.find(s => s.id === id)?.name || id);
      
      const { error } = await supabase.from("quotations").insert({
        quotation_number: "TEMP",
        title: formData.title || `Quote - ${solutionLabels.join(', ') || 'General'}`,
        description: formData.description || `Solutions: ${solutionLabels.join(', ')}\nServices: ${serviceLabels.join(', ')}\nPayment Terms: ${paymentTermLabel}`,
        subtotal,
        tax_rate: formData.tax_rate,
        tax_amount: taxAmount,
        total,
        status: "draft",
        valid_until: formData.valid_until || null,
        terms: formData.terms || `Payment Terms: ${paymentTermLabel}${customPaymentTerms ? ` - ${customPaymentTerms}` : ''}`,
        notes: formData.notes,
        user_id: user!.id,
        currency: formData.currency,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation created successfully");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create quotation");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      contact_id: "",
      currency: "INR",
      valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      tax_rate: 18,
      terms: "",
      notes: "",
    });
    setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setSelectedSolutions([]);
    setSelectedServices([]);
    setSelectedPaymentTerms("net_30");
    setActiveTab("template");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Quotation
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="template" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Terms
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="template" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Choose Quote Template</Label>
                <TemplateSelector
                  templateType="quote"
                  selectedTemplateId={selectedTemplate?.id}
                  onSelect={handleTemplateSelect}
                />
              </div>
              <SolutionServiceSelector
                selectedSolutions={selectedSolutions}
                selectedServices={selectedServices}
                selectedPaymentTerms={selectedPaymentTerms}
                customPaymentTerms={customPaymentTerms}
                onSolutionsChange={setSelectedSolutions}
                onServicesChange={setSelectedServices}
                onPaymentTermsChange={setSelectedPaymentTerms}
                onCustomPaymentTermsChange={setCustomPaymentTerms}
              />
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Quote title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer / Distributor</Label>
                  <Select value={formData.contact_id} onValueChange={(v) => setFormData({ ...formData, contact_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts?.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.company ? `(${contact.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
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
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        className="w-28"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal, formData.currency)}</span></div>
                <div className="flex justify-between"><span>Tax ({formData.tax_rate}%)</span><span>{formatCurrency(taxAmount, formData.currency)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(total, formData.currency)}</span></div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} rows={4} placeholder="Enter terms and conditions..." />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Additional notes..." />
              </div>
            </TabsContent>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Quotation
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
