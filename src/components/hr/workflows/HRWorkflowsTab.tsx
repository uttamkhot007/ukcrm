import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  UserMinus,
  Heart,
  Plus,
  LayoutGrid,
  List,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Settings,
} from "lucide-react";
import { WorkflowKanbanView } from "./WorkflowKanbanView";
import { WorkflowTimelineView } from "./WorkflowTimelineView";
import { NewOnboardingWorkflowDialog } from "./NewOnboardingWorkflowDialog";
import { WorkflowDetailsSheet } from "./WorkflowDetailsSheet";
import { WorkflowSettingsDialog } from "./WorkflowSettingsDialog";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow-templates";

const WORKFLOW_TYPES = [
  { id: "all", label: "All Workflows", icon: LayoutGrid },
  { id: "onboarding", label: "Onboarding", icon: UserPlus },
  { id: "offboarding", label: "Offboarding", icon: UserMinus },
  { id: "retention", label: "Retention", icon: Heart },
];

export function HRWorkflowsTab() {
  const { user, isAdmin, role } = useAuth();
  const [viewMode, setViewMode] = useState<"kanban" | "timeline">("kanban");
  const [workflowType, setWorkflowType] = useState("all");
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: workflows = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-workflows", workflowType],
    queryFn: async () => {
      let query = supabase
        .from("hr_workflows")
        .select("*, onboarding_requests(*), resignation_requests(*)")
        .order("created_at", { ascending: false });

      if (workflowType !== "all") {
        query = query.eq("workflow_type", workflowType as "onboarding" | "offboarding" | "retention");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["hr-workflow-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_workflows")
        .select("status, workflow_type");
      if (error) throw error;

      const total = data?.length || 0;
      const active = data?.filter((w) => w.status === "active").length || 0;
      const pending = data?.filter((w) => w.status === "pending_approval").length || 0;
      const completed = data?.filter((w) => w.status === "completed").length || 0;
      const onboarding = data?.filter((w) => w.workflow_type === "onboarding").length || 0;
      const offboarding = data?.filter((w) => w.workflow_type === "offboarding").length || 0;
      const retention = data?.filter((w) => w.workflow_type === "retention").length || 0;

      return { total, active, pending, completed, onboarding, offboarding, retention };
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Workflows</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.active || 0}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completed || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-wrap">
          {WORKFLOW_TYPES.map((type) => (
            <Button
              key={type.id}
              variant={workflowType === type.id ? "default" : "outline"}
              size="sm"
              onClick={() => setWorkflowType(type.id)}
              className="gap-2"
            >
              <type.icon className="w-4 h-4" />
              {type.label}
              {type.id !== "all" && stats && (
                <Badge variant="secondary" className="ml-1">
                  {type.id === "onboarding" ? stats.onboarding : 
                   type.id === "offboarding" ? stats.offboarding : stats.retention}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          {(isAdmin || role === "manager") && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                Settings
              </Button>
              <Button size="sm" onClick={() => setShowNewWorkflow(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Workflow
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Workflow Views */}
      {viewMode === "kanban" ? (
        <WorkflowKanbanView
          workflows={workflows}
          workflowType={workflowType}
          isLoading={isLoading}
          onSelectWorkflow={setSelectedWorkflowId}
        />
      ) : (
        <WorkflowTimelineView
          workflows={workflows}
          isLoading={isLoading}
          onSelectWorkflow={setSelectedWorkflowId}
        />
      )}

      {/* Dialogs */}
      <NewOnboardingWorkflowDialog
        open={showNewWorkflow}
        onOpenChange={setShowNewWorkflow}
        onSuccess={() => {
          refetch();
          setShowNewWorkflow(false);
        }}
      />

      <WorkflowDetailsSheet
        workflowId={selectedWorkflowId}
        open={!!selectedWorkflowId}
        onOpenChange={(open) => !open && setSelectedWorkflowId(null)}
        onUpdate={refetch}
      />

      <WorkflowSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  );
}
