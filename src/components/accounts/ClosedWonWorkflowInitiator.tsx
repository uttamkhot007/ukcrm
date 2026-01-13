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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CheckCircle,
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
  contacts?: {
    name: string;
    company: string | null;
  };
}

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

  const [orderType, setOrderType] = useState<string>(deal.order_type || "product");
  const [includesSupport, setIncludesSupport] = useState(deal.includes_support || false);
  const [includesManagedService, setIncludesManagedService] = useState(deal.includes_managed_service || false);
  const [includesRenewal, setIncludesRenewal] = useState(deal.includes_renewal || false);

  const applicableWorkflows = getApplicableWorkflows(
    orderType,
    includesSupport,
    includesManagedService,
    includesRenewal
  );

  // Check if workflow already exists for this deal
  const initiateWorkflow = useMutation({
    mutationFn: async () => {
      if (!user || !currentTenant) throw new Error("Missing auth data");

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Initiate Post-Sale Workflow
          </DialogTitle>
          <DialogDescription>
            Configure and start the post-sale workflow for: <strong>{deal.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Type Selection */}
          <div className="space-y-2">
            <Label>Order Type *</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger>
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product Only</SelectItem>
                <SelectItem value="service">Service Only</SelectItem>
                <SelectItem value="product_with_service">Product with Service</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {orderType === "service"
                ? "Order Processing stage will be skipped"
                : "Full workflow including order processing"}
            </p>
          </div>

          {/* Inclusions */}
          <div className="space-y-3">
            <Label>What's included in this deal?</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="support"
                  checked={includesSupport}
                  onCheckedChange={(checked) => setIncludesSupport(checked === true)}
                />
                <Label htmlFor="support" className="flex items-center gap-2 cursor-pointer">
                  <Headphones className="w-4 h-4" />
                  Support Contract
                  <span className="text-xs text-muted-foreground">(Will create support portal access after payment)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="managed"
                  checked={includesManagedService}
                  onCheckedChange={(checked) => setIncludesManagedService(checked === true)}
                />
                <Label htmlFor="managed" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" />
                  Managed Service
                  <span className="text-xs text-muted-foreground">(Will trigger managed service onboarding)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="renewal"
                  checked={includesRenewal}
                  onCheckedChange={(checked) => setIncludesRenewal(checked === true)}
                />
                <Label htmlFor="renewal" className="flex items-center gap-2 cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                  Renewal Expected
                  <span className="text-xs text-muted-foreground">(Will set up renewal tracking)</span>
                </Label>
              </div>
            </div>
          </div>

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
              <p className="text-xs text-muted-foreground mt-3">
                Each workflow will automatically trigger the next upon completion
              </p>
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

        <DialogFooter>
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
