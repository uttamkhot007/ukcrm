import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Trash2, FileText, ArrowRight, ArrowLeft, Check, 
  Palette, Users, CreditCard, Package, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { TemplateSelector, DocumentTemplate } from "@/components/templates/TemplateSelector";
import { PREDEFINED_SOLUTIONS, PREDEFINED_SERVICES, PAYMENT_TERMS } from "@/components/templates/SolutionServiceSelector";
import { workflows } from "@/lib/workflows";

export type DocumentType = "quote" | "invoice" | "purchase_order";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface DocumentCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  onSuccess?: () => void;
}

const WIZARD_STEPS = [
  { id: "template", title: "Template", icon: Palette, description: "Choose design" },
  { id: "customer", title: "Customer", icon: Users, description: "Select customer" },
  { id: "items", title: "Items", icon: Package, description: "Add line items" },
  { id: "terms", title: "Terms", icon: CreditCard, description: "Payment terms" },
];

const DOCUMENT_LABELS: Record<DocumentType, { title: string; numberPrefix: string }> = {
  quote: { title: "Quotation", numberPrefix: "QT" },
  invoice: { title: "Invoice", numberPrefix: "INV" },
  purchase_order: { title: "Purchase Order", numberPrefix: "PO" },
};

export function DocumentCreationWizard({ 
  open, 
  onOpenChange, 
  documentType, 
  onSuccess 
}: DocumentCreationWizardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedBuiltInIndex, setSelectedBuiltInIndex] = useState<number>(0);

  // Customer/Vendor selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");

  // Solutions & Services
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Payment Terms
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<string>("net_30");
  const [customPaymentTerms, setCustomPaymentTerms] = useState<string>("");

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    currency: "INR",
    valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    tax_rate: 18,
    notes: "",
    terms: "",
  });

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0 }
  ]);

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, company, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch organizations (for customers/distributors)
  const { data: organizations = [] } = useQuery({
    queryKey: ["alliance-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name, organization_type, industry")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch vendors for PO
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors" as any)
        .select("id, company_name, contact_name, email")
        .eq("status", "active")
        .order("company_name");
      if (error) return [];
      return data || [];
    },
    enabled: documentType === "purchase_order",
  });

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = (subtotal * formData.tax_rate) / 100;
  const total = subtotal + taxAmount;

  // Line item handlers
  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Template selection handler
  const handleTemplateSelect = (template: DocumentTemplate | null, isBuiltIn?: boolean, builtInIndex?: number) => {
    setSelectedTemplate(template);
    if (isBuiltIn && builtInIndex !== undefined) {
      setSelectedBuiltInIndex(builtInIndex);
    }
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 0: // Template
        return true; // Template is optional, built-in default is used
      case 1: // Customer
        return documentType === "purchase_order" 
          ? !!selectedCustomerId || vendors.length === 0 
          : !!selectedCustomerId || !!selectedOrganizationId || contacts.length === 0;
      case 2: // Items
        return lineItems.some(item => item.description && item.unit_price > 0);
      case 3: // Terms
        return !!selectedPaymentTerms;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset form
  const resetForm = () => {
    setCurrentStep(0);
    setSelectedTemplate(null);
    setSelectedBuiltInIndex(0);
    setSelectedCustomerId("");
    setSelectedOrganizationId("");
    setSelectedSolutions([]);
    setSelectedServices([]);
    setSelectedPaymentTerms("net_30");
    setCustomPaymentTerms("");
    setFormData({
      title: "",
      description: "",
      currency: "INR",
      valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      tax_rate: 18,
      notes: "",
      terms: "",
    });
    setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const paymentTermLabel = PAYMENT_TERMS.find(p => p.id === selectedPaymentTerms)?.name || selectedPaymentTerms;
      const solutionLabels = selectedSolutions.map(id => PREDEFINED_SOLUTIONS.find(s => s.id === id)?.name || id);
      const serviceLabels = selectedServices.map(id => PREDEFINED_SERVICES.find(s => s.id === id)?.name || id);

      if (documentType === "quote") {
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
          user_id: user.id,
          currency: formData.currency,
        } as any);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["quotations"] });
        toast.success("Quotation created successfully");

      } else if (documentType === "invoice") {
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert([{
            invoice_number: "TEMP",
            contact_id: selectedCustomerId || null,
            billing_frequency: "one_time",
            due_date: formData.due_date,
            tax_rate: formData.tax_rate,
            subtotal,
            tax_amount: taxAmount,
            total,
            notes: formData.notes,
            created_by: user.id,
            currency: formData.currency,
            tenant_id: currentTenant?.id,
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Insert line items
        const itemsToInsert = lineItems.filter(item => item.description).map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          sort_order: index,
        }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }

        workflows.invoiceCreated(invoice.id);
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
        toast.success("Invoice created successfully");

      } else if (documentType === "purchase_order") {
        const { data: po, error: poError } = await (supabase
          .from("purchase_orders" as any)
          .insert({
            total_amount: total,
            created_by: user.id,
            tenant_id: currentTenant?.id || null,
            vendor_id: selectedCustomerId || null,
            notes: formData.notes,
          })
          .select()
          .single() as any);

        if (poError) throw poError;

        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast.success(`Purchase Order ${po?.po_number || ''} created successfully`);
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || `Failed to create ${DOCUMENT_LABELS[documentType].title.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Choose Template</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Pick one of your installed templates, or a built-in design
              </p>
              <TemplateSelector
                templateType={documentType}
                selectedTemplateId={selectedTemplate?.id}
                onSelect={handleTemplateSelect}
                relatedTypes={documentType === 'quote' ? ['proposal', 'rfp_response'] : []}
              />
            </div>


            <div className="space-y-4">
              <Label className="text-base font-medium">Solutions & Services (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Solution Type</Label>
                  <Select 
                    value={selectedSolutions[0] || ''} 
                    onValueChange={(v) => setSelectedSolutions(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select solution" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_SOLUTIONS.map((solution) => (
                        <SelectItem key={solution.id} value={solution.id}>
                          {solution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Service Type</Label>
                  <Select 
                    value={selectedServices[0] || ''} 
                    onValueChange={(v) => setSelectedServices(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_SERVICES.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">
                {documentType === "purchase_order" ? "Select Vendor" : "Select Customer / Organization"}
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                {documentType === "purchase_order" 
                  ? "Choose the vendor for this purchase order"
                  : "Choose the customer or organization for this document"}
              </p>
            </div>

            {documentType === "purchase_order" ? (
              <div className="space-y-4">
                <Label>Vendor</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(vendors as any[]).map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.company_name} {vendor.contact_name ? `(${vendor.contact_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.company ? `(${contact.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-2">
                            <span>{org.name}</span>
                            {org.organization_type && (
                              <Badge variant="outline" className="text-xs">
                                {org.organization_type}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
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
                <Label>{documentType === "quote" ? "Valid Until" : "Due Date"}</Label>
                <Input
                  type="date"
                  value={documentType === "quote" ? formData.valid_until : formData.due_date}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    [documentType === "quote" ? "valid_until" : "due_date"]: e.target.value 
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Line Items</Label>
                <p className="text-sm text-muted-foreground">Add products or services to the document</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            placeholder="Unit Price"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="w-28 text-right font-medium pt-2">
                          {formatCurrency(item.quantity * item.unit_price, formData.currency)}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeLineItem(index)} 
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, formData.currency)}</span>
                </div>
                <div className="flex justify-between text-sm items-center gap-2">
                  <span>Tax</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-16 h-8 text-center"
                    />
                    <span>%</span>
                    <span className="ml-2">{formatCurrency(taxAmount, formData.currency)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total, formData.currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Payment Terms</Label>
              <p className="text-sm text-muted-foreground mb-4">Select payment terms and add any additional notes</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {PAYMENT_TERMS.map((term) => (
                <Card 
                  key={term.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary",
                    selectedPaymentTerms === term.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedPaymentTerms(term.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{term.name}</p>
                        <p className="text-sm text-muted-foreground">{term.description}</p>
                      </div>
                      {selectedPaymentTerms === term.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedPaymentTerms === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Payment Terms</Label>
                <Input
                  placeholder="Enter custom payment terms..."
                  value={customPaymentTerms}
                  onChange={(e) => setCustomPaymentTerms(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                placeholder="Enter terms and conditions..."
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Document Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Type</span>
                  <span className="font-medium">{DOCUMENT_LABELS[documentType].title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">{formatCurrency(total, formData.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Terms</span>
                  <span className="font-medium">
                    {PAYMENT_TERMS.find(p => p.id === selectedPaymentTerms)?.name || selectedPaymentTerms}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create {DOCUMENT_LABELS[documentType].title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              return (
                <div 
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    isActive && "text-primary font-medium",
                    isComplete && "text-primary",
                    !isActive && !isComplete && "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isActive && "bg-primary text-primary-foreground",
                    isComplete && "bg-primary/20 text-primary",
                    !isActive && !isComplete && "bg-muted"
                  )}>
                    {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <ScrollArea className="flex-1 pr-4">
          <div className="py-4">
            {renderStepContent()}
          </div>
        </ScrollArea>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={goBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create {DOCUMENT_LABELS[documentType].title}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
