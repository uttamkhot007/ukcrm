import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileCheck,
  Package,
  FileText,
  DollarSign,
  Headphones,
  Settings,
  RefreshCw,
  Search,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getPostSaleStagesForType,
  getPostSaleStageProgress,
  getWorkflowDisplayInfo,
  POST_SALE_WORKFLOW_TEMPLATES,
} from "@/lib/post-sale-workflow-templates";

const workflowTypeIcons: Record<string, React.ElementType> = {
  odf_approval: FileCheck,
  order_processing: Package,
  invoicing: FileText,
  payment_collection: DollarSign,
  support_onboarding: Headphones,
  managed_service_onboarding: Settings,
  renewal_setup: RefreshCw,
};

interface PostSaleWorkflow {
  id: string;
  deal_id: string;
  workflow_type: string;
  status: string;
  current_stage: string | null;
  stage_progress: number;
  order_type: string | null;
  includes_support: boolean;
  includes_managed_service: boolean;
  includes_renewal: boolean;
  payment_status: string | null;
  payment_received: number;
  total_amount: number;
  metadata: any;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
  deals?: {
    title: string;
    value: number;
    organization_name: string | null;
    contacts?: {
      name: string;
      company: string | null;
    };
  };
}

export function PostSaleWorkflowView() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<PostSaleWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [completeStageDialog, setCompleteStageDialog] = useState<{ open: boolean; stageId: string; stageName: string } | null>(null);
  const [stageNotes, setStageNotes] = useState("");

  // Fetch all post-sale workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["post-sale-workflows", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_sale_workflows")
        .select(`
          *,
          deals:deal_id (
            title,
            value,
            organization_name,
            contacts:contact_id (name, company)
          )
        `)
        .eq("tenant_id", currentTenant?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PostSaleWorkflow[];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch workflow stages for selected workflow
  const { data: workflowStages } = useQuery({
    queryKey: ["post-sale-workflow-stages", selectedWorkflow?.id],
    queryFn: async () => {
      if (!selectedWorkflow) return [];
      const { data, error } = await supabase
        .from("post_sale_workflow_stages")
        .select("*")
        .eq("workflow_id", selectedWorkflow.id)
        .order("stage_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedWorkflow?.id,
  });

  // Complete stage mutation
  const completeStage = useMutation({
    mutationFn: async ({ stageId, notes }: { stageId: string; notes: string }) => {
      if (!selectedWorkflow || !user) throw new Error("Missing data");

      const stages = getPostSaleStagesForType(selectedWorkflow.workflow_type as any);
      const currentStageIndex = stages.findIndex(s => s.id === selectedWorkflow.current_stage);
      const completedStage = stages.find(s => s.id === stageId);
      const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

      // Update stage completion
      const { error: stageError } = await supabase
        .from("post_sale_workflow_stages")
        .update({
          status: "completed",
          completed_by: user.id,
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq("workflow_id", selectedWorkflow.id)
        .eq("stage_id", stageId);

      if (stageError) throw stageError;

      // Check if this is the last stage
      const isLastStage = !nextStage;
      const newProgress = getPostSaleStageProgress(
        nextStage?.id || stageId,
        selectedWorkflow.workflow_type as any
      );

      // Update workflow
      const { error: workflowError } = await supabase
        .from("post_sale_workflows")
        .update({
          current_stage: nextStage?.id || stageId,
          stage_progress: isLastStage ? 100 : newProgress,
          status: isLastStage ? "completed" : "in_progress",
          completed_at: isLastStage ? new Date().toISOString() : null,
        })
        .eq("id", selectedWorkflow.id);

      if (workflowError) throw workflowError;

      // If next stage exists, create or update it
      if (nextStage) {
        const { error: nextStageError } = await supabase
          .from("post_sale_workflow_stages")
          .upsert({
            workflow_id: selectedWorkflow.id,
            stage_id: nextStage.id,
            stage_name: nextStage.name,
            stage_order: nextStage.order,
            status: "in_progress",
          }, { onConflict: "workflow_id,stage_id" });

        if (nextStageError) throw nextStageError;
      }

      // If workflow is completed, trigger next workflow if applicable
      if (isLastStage) {
        await triggerNextWorkflow(selectedWorkflow);
      }

      return { isLastStage, nextStage };
    },
    onSuccess: ({ isLastStage, nextStage }) => {
      queryClient.invalidateQueries({ queryKey: ["post-sale-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["post-sale-workflow-stages"] });
      toast.success(
        isLastStage
          ? "Workflow completed! Next workflow triggered."
          : `Stage completed. Moving to ${nextStage?.name}`
      );
      setCompleteStageDialog(null);
      setStageNotes("");
    },
    onError: (error: any) => {
      toast.error("Failed to complete stage: " + error.message);
    },
  });

  // Trigger next workflow based on completion
  const triggerNextWorkflow = async (workflow: PostSaleWorkflow) => {
    if (!user || !currentTenant) return;

    const { workflow_type, deal_id, order_type, includes_support, includes_managed_service, includes_renewal } = workflow;

    let nextType: string | null = null;

    switch (workflow_type) {
      case "odf_approval":
        // If product or product_with_service, go to order_processing; else skip to invoicing
        nextType = order_type === "service" ? "invoicing" : "order_processing";
        break;
      case "order_processing":
        nextType = "invoicing";
        break;
      case "invoicing":
        nextType = "payment_collection";
        break;
      case "payment_collection":
        // On full payment, trigger applicable downstream workflows
        if (includes_support) await createWorkflow(deal_id, "support_onboarding", workflow);
        if (includes_managed_service) await createWorkflow(deal_id, "managed_service_onboarding", workflow);
        if (includes_renewal) await createWorkflow(deal_id, "renewal_setup", workflow);
        return;
    }

    if (nextType) {
      await createWorkflow(deal_id, nextType, workflow);
    }
  };

  const createWorkflow = async (dealId: string, workflowType: string, parentWorkflow: PostSaleWorkflow) => {
    if (!user || !currentTenant) return;

    const stages = getPostSaleStagesForType(workflowType as any);
    const firstStage = stages[0];

    // Create workflow
    const { data: newWorkflow, error: workflowError } = await supabase
      .from("post_sale_workflows")
      .insert({
        deal_id: dealId,
        workflow_type: workflowType as any,
        status: "in_progress" as any,
        current_stage: firstStage?.id,
        stage_progress: 0,
        order_type: parentWorkflow.order_type,
        includes_support: parentWorkflow.includes_support,
        includes_managed_service: parentWorkflow.includes_managed_service,
        includes_renewal: parentWorkflow.includes_renewal,
        total_amount: parentWorkflow.total_amount,
        started_at: new Date().toISOString(),
        created_by: user.id,
        tenant_id: currentTenant.id,
      })
      .select()
      .single();

    if (workflowError) {
      console.error("Error creating workflow:", workflowError);
      return;
    }

    // Create first stage
    if (firstStage && newWorkflow) {
      await supabase.from("post_sale_workflow_stages").insert({
        workflow_id: newWorkflow.id,
        stage_id: firstStage.id,
        stage_name: firstStage.name,
        stage_order: firstStage.order,
        status: "in_progress",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
      pending: { variant: "secondary", icon: Clock },
      in_progress: { variant: "default", icon: Play },
      completed: { variant: "outline", icon: CheckCircle },
      skipped: { variant: "secondary", icon: ChevronRight },
      on_hold: { variant: "destructive", icon: Pause },
    };
    const { variant, icon: Icon } = variants[status] || variants.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const filteredWorkflows = workflows?.filter((w) => {
    const matchesSearch =
      w.deals?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.deals?.organization_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && w.status === "in_progress") ||
      (activeTab === "completed" && w.status === "completed") ||
      (activeTab === "odf" && w.workflow_type === "odf_approval") ||
      (activeTab === "order" && w.workflow_type === "order_processing") ||
      (activeTab === "invoicing" && w.workflow_type === "invoicing") ||
      (activeTab === "payment" && w.workflow_type === "payment_collection");
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: workflows?.length || 0,
    active: workflows?.filter(w => w.status === "in_progress").length || 0,
    completed: workflows?.filter(w => w.status === "completed").length || 0,
    odf: workflows?.filter(w => w.workflow_type === "odf_approval" && w.status === "in_progress").length || 0,
    payment: workflows?.filter(w => w.workflow_type === "payment_collection" && w.status === "in_progress").length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.completed}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.odf}</div>
            <p className="text-sm text-muted-foreground">ODF Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.payment}</div>
            <p className="text-sm text-muted-foreground">Payment Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="odf">ODF</TabsTrigger>
            <TabsTrigger value="order">Orders</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Workflows Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Workflow Type</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows?.map((workflow) => {
                const Icon = workflowTypeIcons[workflow.workflow_type] || FileCheck;
                const displayInfo = getWorkflowDisplayInfo(workflow.workflow_type as any);
                const stages = getPostSaleStagesForType(workflow.workflow_type as any);
                const currentStageName = stages.find(s => s.id === workflow.current_stage)?.name || workflow.current_stage;

                return (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workflow.deals?.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {workflow.deals?.organization_name || workflow.deals?.contacts?.company}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${displayInfo.color} text-white`}>
                        <Icon className="w-3 h-3" />
                        {displayInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{currentStageName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={workflow.stage_progress} className="w-20 h-2" />
                        <span className="text-sm">{workflow.stage_progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                    <TableCell>
                      {format(new Date(workflow.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredWorkflows || filteredWorkflows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No workflows found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Workflow Details Sheet */}
      <Sheet open={!!selectedWorkflow} onOpenChange={(open) => !open && setSelectedWorkflow(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedWorkflow && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = workflowTypeIcons[selectedWorkflow.workflow_type];
                    return Icon && <Icon className="w-5 h-5" />;
                  })()}
                  {getWorkflowDisplayInfo(selectedWorkflow.workflow_type as any).label}
                </SheetTitle>
                <SheetDescription>
                  {selectedWorkflow.deals?.title} • {selectedWorkflow.deals?.organization_name}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Progress Overview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Progress value={selectedWorkflow.stage_progress} className="flex-1" />
                      <span className="font-bold">{selectedWorkflow.stage_progress}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                      <span>Status: {getStatusBadge(selectedWorkflow.status)}</span>
                      {selectedWorkflow.order_type && (
                        <Badge variant="outline">{selectedWorkflow.order_type}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Stages List */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Workflow Stages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getPostSaleStagesForType(selectedWorkflow.workflow_type as any).map((stage) => {
                      const stageData = workflowStages?.find(ws => ws.stage_id === stage.id);
                      const isCompleted = stageData?.status === "completed";
                      const isCurrent = selectedWorkflow.current_stage === stage.id;
                      const isPending = !stageData || stageData.status === "pending";

                      return (
                        <div
                          key={stage.id}
                          className={`p-3 rounded-lg border ${
                            isCompleted
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                              : isCurrent
                              ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400" />
                              ) : isCurrent ? (
                                <Play className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div>
                                <div className="font-medium">{stage.name}</div>
                                <div className="text-sm text-muted-foreground">{stage.description}</div>
                              </div>
                            </div>
                            {isCurrent && selectedWorkflow.status === "in_progress" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setCompleteStageDialog({ open: true, stageId: stage.id, stageName: stage.name })
                                }
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                          {stageData?.notes && (
                            <p className="mt-2 text-sm text-muted-foreground pl-8">{stageData.notes}</p>
                          )}
                          {stageData?.completed_at && (
                            <p className="mt-1 text-xs text-muted-foreground pl-8">
                              Completed on {format(new Date(stageData.completed_at), "MMM d, yyyy h:mm a")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Delivery Info */}
                <div className="flex gap-2 flex-wrap">
                  {selectedWorkflow.includes_support && (
                    <Badge variant="outline" className="gap-1">
                      <Headphones className="w-3 h-3" /> Support Included
                    </Badge>
                  )}
                  {selectedWorkflow.includes_managed_service && (
                    <Badge variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" /> Managed Service
                    </Badge>
                  )}
                  {selectedWorkflow.includes_renewal && (
                    <Badge variant="outline" className="gap-1">
                      <RefreshCw className="w-3 h-3" /> Renewal Expected
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Complete Stage Dialog */}
      <Dialog
        open={completeStageDialog?.open || false}
        onOpenChange={(open) => !open && setCompleteStageDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Stage: {completeStageDialog?.stageName}</DialogTitle>
            <DialogDescription>
              Add any notes and confirm to complete this stage and move to the next.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add completion notes (optional)"
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteStageDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                completeStageDialog &&
                completeStage.mutate({ stageId: completeStageDialog.stageId, notes: stageNotes })
              }
              disabled={completeStage.isPending}
            >
              {completeStage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
