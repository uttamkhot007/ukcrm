import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileCheck,
  Package,
  FileText,
  DollarSign,
  Headphones,
  Settings,
  RefreshCw,
  Play,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Target,
  Wrench,
  ClipboardCheck,
  Shield,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getApplicableWorkflows, getPostSaleStagesForType, getWorkflowDisplayInfo } from "@/lib/post-sale-workflow-templates";

interface Deal {
  id: string;
  title: string;
  value: number;
  organization_name: string | null;
  order_type?: string | null;
  includes_support?: boolean;
  includes_managed_service?: boolean;
  includes_renewal?: boolean;
  meddic_identify_pain?: string;
  meddic_decision_criteria?: string;
  meddic_metrics?: string;
  contacts?: {
    name: string;
    company: string | null;
  };
}

// Service types that can be included in the deal
const SERVICE_TYPES = [
  { id: 'assessment', label: 'Assessment', icon: ClipboardCheck, description: 'Security/Technical assessment services' },
  { id: 'implementation', label: 'Implementation', icon: Wrench, description: 'Solution deployment & configuration' },
  { id: 'support', label: 'Support', icon: Headphones, description: 'Technical support contract' },
  { id: 'managed_service', label: 'Managed Service', icon: Shield, description: 'Ongoing managed services' },
] as const;

type ServiceType = typeof SERVICE_TYPES[number]['id'];

interface ClosedWonWorkflowInitiatorProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowCreated?: () => void;
}

const workflowIcons: Record<string, React.ElementType> = {
  odf_approval: FileCheck,
  order_processing: Package,
  invoicing: FileText,
  payment_collection: DollarSign,
  support_onboarding: Headphones,
  managed_service_onboarding: Settings,
  renewal_setup: RefreshCw,
};

export function ClosedWonWorkflowInitiator({
  deal,
  open,
  onOpenChange,
  onWorkflowCreated,
}: ClosedWonWorkflowInitiatorProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Proposal Type: Product, Service, or Hybrid
  const [proposalType, setProposalType] = useState<'product' | 'service' | 'hybrid'>(
    deal.order_type === 'product' ? 'product' : 
    deal.order_type === 'service' ? 'service' : 'hybrid'
  );
  
  // Services included in the deal
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(() => {
    const services: ServiceType[] = [];
    if (deal.includes_support) services.push('support');
    if (deal.includes_managed_service) services.push('managed_service');
    return services;
  });

  // Engagement type: One-time or Continuous
  const [engagementType, setEngagementType] = useState<'one_time' | 'continuous'>('continuous');
  
  // Is the deal renewable?
  const [isRenewable, setIsRenewable] = useState(deal.includes_renewal !== false);
  
  // Pain areas and requirements from MEDDIC
  const [painAreas, setPainAreas] = useState(deal.meddic_identify_pain || '');
  const [requirements, setRequirements] = useState(deal.meddic_decision_criteria || '');

  const toggleService = (serviceId: ServiceType) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Derive inclusions from selections
  const includesSupport = selectedServices.includes('support');
  const includesManagedService = selectedServices.includes('managed_service');
  const includesRenewal = isRenewable;
  
  // Map proposal type to order_type
  const orderType = proposalType === 'product' ? 'product' : 
                    proposalType === 'service' ? 'service' : 'product_with_service';

  const applicableWorkflows = getApplicableWorkflows(
    orderType,
    includesSupport,
    includesManagedService,
    includesRenewal
  );

  const initiateWorkflow = useMutation({
    mutationFn: async () => {
      if (!user || !currentTenant) throw new Error("Missing auth data");

      // Prepare metadata with all selections
      const workflowMetadata = {
        proposal_type: proposalType,
        services_included: selectedServices,
        engagement_type: engagementType,
        pain_areas: painAreas,
        requirements: requirements,
      };

      // First update the deal with order type and inclusions
      const { error: dealError } = await supabase
        .from("deals")
        .update({
          order_type: orderType,
          includes_support: includesSupport,
          includes_managed_service: includesManagedService,
          includes_renewal: includesRenewal,
        })
        .eq("id", deal.id);

      if (dealError) throw dealError;

      // Check if ODF workflow already exists
      const { data: existingWorkflow } = await supabase
        .from("post_sale_workflows")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("workflow_type", "odf_approval")
        .single();

      if (existingWorkflow) {
        throw new Error("Workflow already initiated for this deal");
      }

      // Create ODF Approval workflow (first workflow in chain)
      const stages = getPostSaleStagesForType("odf_approval");
      const firstStage = stages[0];

      const { data: workflow, error: workflowError } = await supabase
        .from("post_sale_workflows")
        .insert({
          deal_id: deal.id,
          workflow_type: "odf_approval",
          status: "in_progress",
          current_stage: firstStage?.id,
          stage_progress: 0,
          order_type: orderType,
          includes_support: includesSupport,
          includes_managed_service: includesManagedService,
          includes_renewal: includesRenewal,
          total_amount: deal.value,
          started_at: new Date().toISOString(),
          created_by: user.id,
          tenant_id: currentTenant.id,
          metadata: workflowMetadata,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create first stage entry
      if (workflow && firstStage) {
        const { error: stageError } = await supabase
          .from("post_sale_workflow_stages")
          .insert({
            workflow_id: workflow.id,
            stage_id: firstStage.id,
            stage_name: firstStage.name,
            stage_order: firstStage.order,
            status: "in_progress",
          });

        if (stageError) throw stageError;
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-sale-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Post-sale workflow initiated successfully!");
      onOpenChange(false);
      onWorkflowCreated?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to initiate workflow");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Configure Closed Won Workflow
          </DialogTitle>
          <DialogDescription>
            Configure the deal details for: <strong>{deal.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* MEDDIC Summary - Pain & Requirements */}
            <Accordion type="single" collapsible defaultValue="meddic">
              <AccordionItem value="meddic" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium">MEDDIC Summary</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Identified Pain Areas
                    </Label>
                    <Textarea
                      value={painAreas}
                      onChange={(e) => setPainAreas(e.target.value)}
                      placeholder="What are the customer's pain points driving this purchase?"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Requirements & Decision Criteria
                    </Label>
                    <Textarea
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="What are the key requirements and criteria for this solution?"
                      className="min-h-[80px]"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Proposal Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Proposal Type *</Label>
              <RadioGroup 
                value={proposalType} 
                onValueChange={(v) => setProposalType(v as 'product' | 'service' | 'hybrid')}
                className="grid grid-cols-3 gap-4"
              >
                <div className="relative">
                  <RadioGroupItem value="product" id="product" className="peer sr-only" />
                  <Label 
                    htmlFor="product" 
                    className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <Package className="w-6 h-6" />
                    <span className="font-medium">Product</span>
                    <span className="text-xs text-muted-foreground text-center">License/Hardware only</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="service" id="service" className="peer sr-only" />
                  <Label 
                    htmlFor="service" 
                    className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <Settings className="w-6 h-6" />
                    <span className="font-medium">Service</span>
                    <span className="text-xs text-muted-foreground text-center">Services only (no order)</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="hybrid" id="hybrid" className="peer sr-only" />
                  <Label 
                    htmlFor="hybrid" 
                    className="flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <Target className="w-6 h-6" />
                    <span className="font-medium">Hybrid</span>
                    <span className="text-xs text-muted-foreground text-center">Product + Services</span>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {proposalType === 'service'
                  ? "Order Processing stage will be skipped (no product fulfillment required)"
                  : proposalType === 'product'
                  ? "Full order processing workflow will be triggered"
                  : "Includes both order processing and service delivery"}
              </p>
            </div>

            <Separator />

            {/* Services Included */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Services Included</Label>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TYPES.map(service => {
                  const Icon = service.icon;
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <div 
                      key={service.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                      }`}
                      onClick={() => toggleService(service.id)}
                    >
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleService(service.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{service.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Engagement Type & Renewable */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Engagement Type</Label>
                <RadioGroup 
                  value={engagementType} 
                  onValueChange={(v) => setEngagementType(v as 'one_time' | 'continuous')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one_time" id="one_time" />
                    <Label htmlFor="one_time" className="flex items-center gap-2 cursor-pointer">
                      <Clock className="w-4 h-4" />
                      One-time
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="continuous" id="continuous" />
                    <Label htmlFor="continuous" className="flex items-center gap-2 cursor-pointer">
                      <CalendarCheck className="w-4 h-4" />
                      Continuous / Subscription
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Is this Renewable?</Label>
                <div 
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    isRenewable ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                  onClick={() => setIsRenewable(!isRenewable)}
                >
                  <Checkbox 
                    checked={isRenewable} 
                    onCheckedChange={(checked) => setIsRenewable(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-sm">Renewal Expected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isRenewable 
                        ? "Renewal tracking will be set up after payment"
                        : "No renewal workflow will be triggered"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Workflow Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Workflow Sequence</CardTitle>
                <CardDescription>Based on your selections, these workflows will be triggered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {applicableWorkflows.map((wfType, index) => {
                    const Icon = workflowIcons[wfType];
                    const info = getWorkflowDisplayInfo(wfType);
                    return (
                      <div key={wfType} className="flex items-center gap-2">
                        <Badge className={`gap-1 ${info.color} text-white`}>
                          {Icon && <Icon className="w-3 h-3" />}
                          {info.label}
                        </Badge>
                        {index < applicableWorkflows.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Workflow Explanations */}
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {!includesSupport && (
                    <p className="flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      Support onboarding will not trigger (Support not selected)
                    </p>
                  )}
                  {!includesManagedService && (
                    <p className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Managed service onboarding will not trigger (Managed Service not selected)
                    </p>
                  )}
                  {!includesRenewal && (
                    <p className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Renewal setup will not trigger (Not marked as renewable)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deal Summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Deal Value:</span>
                    <p className="font-medium">₹{deal.value?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organization:</span>
                    <p className="font-medium">{deal.organization_name || deal.contacts?.company || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => initiateWorkflow.mutate()} disabled={initiateWorkflow.isPending}>
            {initiateWorkflow.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
