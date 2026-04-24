import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  CreditCard,
  Clock,
  ChevronRight,
  FileText,
  Upload,
  DollarSign,
  Calendar,
  AlertCircle,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_WORKFLOW_TEMPLATES,
  getAccountsStagesForType,
  type AccountsWorkflowTemplate,
} from "@/lib/accounts-workflow-templates";

interface AccountsWorkflowBoardsProps {
  onWorkflowCreated: () => void;
}

interface OrderFormData {
  dealId: string;
  customerPoNumber: string;
  customerPoDate: string;
  customerPaymentTerms: string;
  customerCommitments: string;
  distributorOemName: string;
  distriOemPaymentTerms: string;
  distriOemQuoteNumber: string;
  buyingCost: string;
  sellingCost: string;
  referralFees: string;
  licenseDeliveryDate: string;
  serviceDeliveryDate: string;
  licenseDeliveryNotes: string;
  serviceDeliveryNotes: string;
  hasMsa: boolean;
  hasNda: boolean;
  hasSow: boolean;
  hasSla: boolean;
  otherPrerequisites: string;
}

const initialFormData: OrderFormData = {
  dealId: "",
  customerPoNumber: "",
  customerPoDate: "",
  customerPaymentTerms: "",
  customerCommitments: "",
  distributorOemName: "",
  distriOemPaymentTerms: "",
  distriOemQuoteNumber: "",
  buyingCost: "",
  sellingCost: "",
  referralFees: "",
  licenseDeliveryDate: "",
  serviceDeliveryDate: "",
  licenseDeliveryNotes: "",
  serviceDeliveryNotes: "",
  hasMsa: false,
  hasNda: false,
  hasSow: false,
  hasSla: false,
  otherPrerequisites: "",
};

export function AccountsWorkflowBoards({ onWorkflowCreated }: AccountsWorkflowBoardsProps) {
  const { user, isAdmin, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<AccountsWorkflowTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch closed-won deals that don't have an active order processing workflow
  const { data: availableDeals = [] } = useQuery({
    queryKey: ["available-deals-for-odf"],
    queryFn: async () => {
      // Get deals that are closed_won
      const { data: deals, error: dealsError } = await supabase
        .from("deals")
        .select(`
          id,
          title,
          value,
          contact_id,
          contacts:contact_id (name, company)
        `)
        .eq("stage", "closed_won")
        .order("actual_close_date", { ascending: false });

      if (dealsError) throw dealsError;

      // Get deals that already have order processing requests
      const { data: existingRequests, error: reqError } = await supabase
        .from("order_processing_requests")
        .select("deal_id")
        .not("status", "eq", "cancelled");

      if (reqError) throw reqError;

      const existingDealIds = new Set(existingRequests?.map(r => r.deal_id) || []);
      
      // Filter out deals that already have requests
      return (deals || []).filter(deal => !existingDealIds.has(deal.id));
    },
  });

  // Fetch workflow counts
  const { data: workflowCounts = { order_processing: 0, payment_collection: 0 } } = useQuery({
    queryKey: ["accounts-workflow-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_workflows")
        .select("workflow_type")
        .in("status", ["active", "on_hold"]);

      if (error) throw error;

      const counts = { order_processing: 0, payment_collection: 0 };
      data?.forEach(w => {
        if (w.workflow_type in counts) {
          counts[w.workflow_type as keyof typeof counts]++;
        }
      });
      return counts;
    },
  });

  const getTemplateIcon = (template: AccountsWorkflowTemplate) => {
    if (template.type === "order_processing") {
      return <Package className="w-6 h-6 text-blue-500" />;
    }
    return <CreditCard className="w-6 h-6 text-green-500" />;
  };

  const getTemplateColor = (template: AccountsWorkflowTemplate) => {
    if (template.type === "order_processing") {
      return "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5";
    }
    return "border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5";
  };

  const initializeWorkflowStages = async (workflowId: string, type: "order_processing" | "payment_collection") => {
    const stages = getAccountsStagesForType(type);
    const stageCompletions = stages.map((stage, index) => ({
      workflow_id: workflowId,
      stage_id: stage.id,
      stage_order: stage.order,
      is_current: index === 0,
      completed_at: null,
      completed_by: null,
    }));

    const { error } = await supabase
      .from("accounts_workflow_stage_completions")
      .insert(stageCompletions);

    if (error) throw error;
  };

  const createOrderProcessingWorkflow = useMutation({
    mutationFn: async () => {
      if (!user?.id || !formData.dealId) throw new Error("Missing required data");

      const selectedDeal = availableDeals.find((d: any) => d.id === formData.dealId);
      if (!selectedDeal) throw new Error("Deal not found");

      // Create order processing request
      const { data: orderRequest, error: orderError } = await supabase
        .from("order_processing_requests")
        .insert({
          deal_id: formData.dealId,
          created_by: user.id,
          contact_id: selectedDeal.contact_id,
          customer_po_number: formData.customerPoNumber || null,
          customer_po_date: formData.customerPoDate || null,
          customer_payment_terms: formData.customerPaymentTerms || null,
          customer_commitments: formData.customerCommitments || null,
          distributor_oem_name: formData.distributorOemName || null,
          distri_oem_payment_terms: formData.distriOemPaymentTerms || null,
          distri_oem_quote_number: formData.distriOemQuoteNumber || null,
          buying_cost: parseFloat(formData.buyingCost) || 0,
          selling_cost: parseFloat(formData.sellingCost) || 0,
          referral_fees: parseFloat(formData.referralFees) || 0,
          license_delivery_date: formData.licenseDeliveryDate || null,
          service_delivery_date: formData.serviceDeliveryDate || null,
          license_delivery_notes: formData.licenseDeliveryNotes || null,
          service_delivery_notes: formData.serviceDeliveryNotes || null,
          has_msa: formData.hasMsa,
          has_nda: formData.hasNda,
          has_sow: formData.hasSow,
          has_sla: formData.hasSla,
          other_prerequisites: formData.otherPrerequisites || null,
          status: "active",
          current_stage: "document_review",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("accounts_workflows")
        .insert({
          workflow_type: "order_processing",
          title: `Order Processing: ${selectedDeal.title}`,
          description: `ODF workflow for deal ${selectedDeal.title}`,
          deal_id: formData.dealId,
          order_request_id: orderRequest.id,
          status: "active",
          current_stage: "document_review",
          priority: "medium",
          initiated_by: user.id,
          started_at: new Date().toISOString(),
          metadata: {
            deal_value: selectedDeal.value,
            company: selectedDeal.contacts?.company,
            contact_name: selectedDeal.contacts?.name,
          },
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Update order request with workflow id
      await supabase
        .from("order_processing_requests")
        .update({ workflow_id: workflow.id })
        .eq("id", orderRequest.id);

      // Initialize workflow stages
      await initializeWorkflowStages(workflow.id, "order_processing");

      return workflow;
    },
    onSuccess: () => {
      toast({ title: "Order Processing Started", description: "The ODF workflow has been initiated successfully." });
      queryClient.invalidateQueries({ queryKey: ["accounts-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-workflow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["available-deals-for-odf"] });
      setShowDialog(false);
      resetForm();
      onWorkflowCreated();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create workflow.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedTemplate(null);
    setCurrentStep(1);
  };

  const handleTemplateClick = (template: AccountsWorkflowTemplate) => {
    if (!template.canManuallyCreate) {
      toast({
        title: "Auto-Triggered Workflow",
        description: "This workflow is automatically created when Order Processing completes.",
        variant: "default",
      });
      return;
    }
    setSelectedTemplate(template);
    setShowDialog(true);
  };

  const calculateMargin = () => {
    const buying = parseFloat(formData.buyingCost) || 0;
    const selling = parseFloat(formData.sellingCost) || 0;
    const referral = parseFloat(formData.referralFees) || 0;
    const margin = selling - buying - referral;
    const marginPercentage = selling > 0 ? (margin / selling) * 100 : 0;
    return { margin, marginPercentage };
  };

  const { margin, marginPercentage } = calculateMargin();

  const canSubmit = formData.dealId && formData.customerPoNumber;

  const canManageWorkflows = isAdmin || role === "manager" || role === "employee"; // Sales team can initiate

  if (!canManageWorkflows) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Accounts Workflow Templates
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACCOUNTS_WORKFLOW_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "transition-all duration-200 border-2 select-none",
                template.canManuallyCreate ? "cursor-pointer" : "cursor-not-allowed opacity-75",
                getTemplateColor(template)
              )}
              role="button"
              tabIndex={template.canManuallyCreate ? 0 : -1}
              onClick={() => handleTemplateClick(template)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && template.canManuallyCreate) {
                  e.preventDefault();
                  handleTemplateClick(template);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTemplateIcon(template)}
                    {!template.canManuallyCreate && <Lock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.stages.length} stages
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {workflowCounts[template.type]} active
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                <CardDescription className="text-xs">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  {template.estimatedDuration}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  {template.triggeredBy}
                </div>
                {template.canManuallyCreate && (
                  <div className="w-full mt-3 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary hover:text-primary/80 bg-primary/5 rounded-md">
                    Start ODF Request
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Order Processing Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Start Order Processing (ODF) Request
            </DialogTitle>
            <DialogDescription>
              Fill in all required details to initiate the order processing workflow
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        currentStep >= step
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
                    </div>
                    {step < 4 && (
                      <div
                        className={cn(
                          "w-12 h-1 mx-1",
                          currentStep > step ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Select Deal */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Step 1: Select Deal
                  </h4>
                  <div className="space-y-2">
                    <Label>Select Closed-Won Deal *</Label>
                    <Select value={formData.dealId} onValueChange={(v) => setFormData({ ...formData, dealId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a deal to process" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDeals.length === 0 ? (
                          <SelectItem value="none" disabled>No deals available</SelectItem>
                        ) : (
                          availableDeals.map((deal: any) => (
                            <SelectItem key={deal.id} value={deal.id}>
                              {deal.title} - ₹{deal.value?.toLocaleString()} ({deal.contacts?.company || "No Company"})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {availableDeals.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No closed-won deals available. Deals must be in "Closed Won" stage and not already have an active order processing request.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Customer & Distributor Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Step 2: Customer & Distributor Details
                  </h4>
                  
                  <Separator />
                  <h5 className="text-sm font-medium text-muted-foreground">Customer PO Details</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer PO Number *</Label>
                      <Input
                        placeholder="e.g. PO-2024-001"
                        value={formData.customerPoNumber}
                        onChange={(e) => setFormData({ ...formData, customerPoNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PO Date</Label>
                      <Input
                        type="date"
                        value={formData.customerPoDate}
                        onChange={(e) => setFormData({ ...formData, customerPoDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer Payment Terms</Label>
                    <Textarea
                      placeholder="e.g. Net 30, 50% advance, etc."
                      value={formData.customerPaymentTerms}
                      onChange={(e) => setFormData({ ...formData, customerPaymentTerms: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Commitments to Customer</Label>
                    <Textarea
                      placeholder="Any special commitments, discounts, or agreements"
                      value={formData.customerCommitments}
                      onChange={(e) => setFormData({ ...formData, customerCommitments: e.target.value })}
                    />
                  </div>

                  <Separator />
                  <h5 className="text-sm font-medium text-muted-foreground">Distributor/OEM Details</h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Distributor/OEM Name</Label>
                      <Input
                        placeholder="e.g. Tech Solutions Ltd"
                        value={formData.distributorOemName}
                        onChange={(e) => setFormData({ ...formData, distributorOemName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quote Number</Label>
                      <Input
                        placeholder="e.g. QT-2024-001"
                        value={formData.distriOemQuoteNumber}
                        onChange={(e) => setFormData({ ...formData, distriOemQuoteNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Distri/OEM Payment Terms</Label>
                    <Textarea
                      placeholder="Payment terms with distributor/OEM"
                      value={formData.distriOemPaymentTerms}
                      onChange={(e) => setFormData({ ...formData, distriOemPaymentTerms: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Financial Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Step 3: Financial Details
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Buying Cost (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.buyingCost}
                        onChange={(e) => setFormData({ ...formData, buyingCost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Cost (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.sellingCost}
                        onChange={(e) => setFormData({ ...formData, sellingCost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Referral Fees (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.referralFees}
                        onChange={(e) => setFormData({ ...formData, referralFees: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Calculated Margin:</span>
                      <div className="text-right">
                        <span className={cn(
                          "text-lg font-bold",
                          margin >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          ₹{margin.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({marginPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Delivery Timelines
                  </h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>License Delivery Date</Label>
                      <Input
                        type="date"
                        value={formData.licenseDeliveryDate}
                        onChange={(e) => setFormData({ ...formData, licenseDeliveryDate: e.target.value })}
                      />
                      <Textarea
                        placeholder="Notes about license delivery"
                        className="mt-2"
                        value={formData.licenseDeliveryNotes}
                        onChange={(e) => setFormData({ ...formData, licenseDeliveryNotes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Delivery Date</Label>
                      <Input
                        type="date"
                        value={formData.serviceDeliveryDate}
                        onChange={(e) => setFormData({ ...formData, serviceDeliveryDate: e.target.value })}
                      />
                      <Textarea
                        placeholder="Notes about service delivery"
                        className="mt-2"
                        value={formData.serviceDeliveryNotes}
                        onChange={(e) => setFormData({ ...formData, serviceDeliveryNotes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Prerequisites & Documents */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Step 4: Prerequisites & Documents
                  </h4>

                  <div className="space-y-3">
                    <Label>Required Document Prerequisites</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has_msa"
                          checked={formData.hasMsa}
                          onCheckedChange={(checked) => setFormData({ ...formData, hasMsa: checked as boolean })}
                        />
                        <label htmlFor="has_msa" className="text-sm">MSA (Master Service Agreement)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has_nda"
                          checked={formData.hasNda}
                          onCheckedChange={(checked) => setFormData({ ...formData, hasNda: checked as boolean })}
                        />
                        <label htmlFor="has_nda" className="text-sm">NDA (Non-Disclosure Agreement)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has_sow"
                          checked={formData.hasSow}
                          onCheckedChange={(checked) => setFormData({ ...formData, hasSow: checked as boolean })}
                        />
                        <label htmlFor="has_sow" className="text-sm">SOW (Statement of Work)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has_sla"
                          checked={formData.hasSla}
                          onCheckedChange={(checked) => setFormData({ ...formData, hasSla: checked as boolean })}
                        />
                        <label htmlFor="has_sla" className="text-sm">SLA (Service Level Agreement)</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Other Prerequisites</Label>
                    <Textarea
                      placeholder="Any other required documents or prerequisites"
                      value={formData.otherPrerequisites}
                      onChange={(e) => setFormData({ ...formData, otherPrerequisites: e.target.value })}
                    />
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-amber-800 dark:text-amber-200">Document Upload</h5>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          After submitting this request, you can upload Customer PO, Distri/OEM Quote, and other supporting documents from the workflow details page.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Summary</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Customer PO: {formData.customerPoNumber || "-"}</div>
                      <div>Buying: ₹{parseFloat(formData.buyingCost || "0").toLocaleString()}</div>
                      <div>Selling: ₹{parseFloat(formData.sellingCost || "0").toLocaleString()}</div>
                      <div>Margin: ₹{margin.toLocaleString()} ({marginPercentage.toFixed(1)}%)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === 1 && !formData.dealId}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => createOrderProcessingWorkflow.mutate()}
                  disabled={!canSubmit || createOrderProcessingWorkflow.isPending}
                >
                  {createOrderProcessingWorkflow.isPending ? "Creating..." : "Start Order Processing"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
