import { useState, useEffect } from "react";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  FolderKanban,
  UserPlus,
  UserMinus,
  Laptop,
  Key,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ITWorkflow {
  id: string;
  title: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  target_user_id: string | null;
  created_at: string;
  target_user_name?: string;
}

const WORKFLOW_TYPES = [
  { value: "onboarding", label: "IT Onboarding", icon: UserPlus, color: "text-green-700 dark:text-green-400" },
  { value: "offboarding", label: "IT Offboarding", icon: UserMinus, color: "text-red-600" },
  { value: "equipment_request", label: "Equipment Request", icon: Laptop, color: "text-blue-600" },
  { value: "access_request", label: "Access Request", icon: Key, color: "text-yellow-600" },
  { value: "security_review", label: "Security Review", icon: Shield, color: "text-purple-600" },
];

const IT_ONBOARDING_STAGES = [
  { id: "equipment_request", name: "Equipment Request", order: 1 },
  { id: "equipment_procurement", name: "Equipment Procurement", order: 2 },
  { id: "equipment_setup", name: "Equipment Setup", order: 3 },
  { id: "account_creation", name: "Account Creation", order: 4 },
  { id: "access_provisioning", name: "Access Provisioning", order: 5 },
  { id: "software_installation", name: "Software Installation", order: 6 },
  { id: "security_setup", name: "Security Setup", order: 7 },
  { id: "handover", name: "Handover to Employee", order: 8 },
  { id: "completed", name: "Completed", order: 9 },
];

const IT_OFFBOARDING_STAGES = [
  { id: "initiated", name: "Offboarding Initiated", order: 1 },
  { id: "access_audit", name: "Access Audit", order: 2 },
  { id: "data_backup", name: "Data Backup", order: 3 },
  { id: "access_revocation", name: "Access Revocation", order: 4 },
  { id: "device_collection", name: "Device Collection", order: 5 },
  { id: "device_inspection", name: "Device Inspection", order: 6 },
  { id: "data_wipe", name: "Data Wipe", order: 7 },
  { id: "asset_return", name: "Asset Return to Inventory", order: 8 },
  { id: "clearance_given", name: "IT Clearance Given", order: 9 },
  { id: "completed", name: "Completed", order: 10 },
];

export function ITWorkflows() {
  const { currentTenant } = useTenant();
  const [workflows, setWorkflows] = useState<ITWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkflows = async () => {
    if (!currentTenant) return;

    setIsLoading(true);

    // Fetch HR workflows that have IT-related stages
    const { data, error } = await supabase
      .from("hr_workflows")
      .select(`
        id,
        title,
        workflow_type,
        status,
        current_stage,
        target_user_id,
        created_at
      `)
      .eq("tenant_id", currentTenant.id)
      .in("workflow_type", ["onboarding", "offboarding"])
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch IT workflows",
        variant: "destructive",
      });
    } else {
      setWorkflows(data || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchWorkflows();
  }, [currentTenant]);

  const getWorkflowIcon = (type: string) => {
    const config = WORKFLOW_TYPES.find((w) => w.value === type);
    const Icon = config?.icon || FolderKanban;
    return <Icon className={`w-5 h-5 ${config?.color || "text-muted-foreground"}`} />;
  };

  const getStageProgress = (type: string, currentStage: string) => {
    const stages = type === "offboarding" ? IT_OFFBOARDING_STAGES : IT_ONBOARDING_STAGES;
    const currentIndex = stages.findIndex((s) => s.id === currentStage);
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / stages.length) * 100);
  };

  const getStageName = (type: string, stageId: string) => {
    const stages = type === "offboarding" ? IT_OFFBOARDING_STAGES : IT_ONBOARDING_STAGES;
    return stages.find((s) => s.id === stageId)?.name || stageId.replace(/_/g, " ");
  };

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.status === "in_progress").length,
    onboarding: workflows.filter((w) => w.workflow_type === "onboarding").length,
    offboarding: workflows.filter((w) => w.workflow_type === "offboarding").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" />
              Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.onboarding}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-red-500" />
              Offboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.offboarding}</div>
          </CardContent>
        </Card>
      </div>

      {/* IT Workflow Stages Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-green-700 dark:text-green-400" />
              IT Onboarding Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {IT_ONBOARDING_STAGES.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-sm">{stage.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserMinus className="w-5 h-5 text-red-600" />
              IT Offboarding Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {IT_OFFBOARDING_STAGES.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-sm">{stage.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="glass rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Active IT Workflows</h3>
          <p className="text-sm text-muted-foreground">
            IT tasks from onboarding and offboarding workflows
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-8 text-center">
            <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No IT workflows found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Workflows from HR onboarding/offboarding will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {getWorkflowIcon(workflow.workflow_type)}
                    <div>
                      <h4 className="font-medium">{workflow.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {workflow.workflow_type.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            workflow.status === "completed"
                              ? "bg-green-500/20 text-green-700 dark:text-green-400"
                              : workflow.status === "in_progress"
                              ? "bg-blue-500/20 text-blue-600"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {workflow.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {getStageName(workflow.workflow_type, workflow.current_stage)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">
                      {getStageProgress(workflow.workflow_type, workflow.current_stage)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(workflow.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
