import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Search, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const presalesWorkflowTemplates = [
  {
    id: "poc_workflow",
    name: "POC Execution",
    description: "End-to-end proof of concept workflow",
    stages: [
      { name: "Requirements Gathering", icon: "📋" },
      { name: "Environment Setup", icon: "🔧" },
      { name: "Implementation", icon: "💻" },
      { name: "Testing & Validation", icon: "✅" },
      { name: "Demo & Review", icon: "🎯" },
      { name: "Documentation", icon: "📝" },
      { name: "Handoff", icon: "🤝" },
    ],
  },
  {
    id: "rfp_workflow",
    name: "RFP Response",
    description: "Complete RFP/RFI response workflow",
    stages: [
      { name: "Document Analysis", icon: "📄" },
      { name: "Team Assignment", icon: "👥" },
      { name: "Section Drafting", icon: "✏️" },
      { name: "Technical Review", icon: "🔍" },
      { name: "Management Review", icon: "👔" },
      { name: "Final Editing", icon: "📝" },
      { name: "Submission", icon: "📤" },
    ],
  },
  {
    id: "demo_workflow",
    name: "Demo Preparation",
    description: "Product demonstration preparation workflow",
    stages: [
      { name: "Requirement Analysis", icon: "📊" },
      { name: "Demo Environment", icon: "🖥️" },
      { name: "Script Preparation", icon: "📜" },
      { name: "Rehearsal", icon: "🎭" },
      { name: "Demo Delivery", icon: "🎬" },
      { name: "Follow-up", icon: "📞" },
    ],
  },
  {
    id: "technical_assessment",
    name: "Technical Assessment",
    description: "Technical evaluation and assessment workflow",
    stages: [
      { name: "Discovery Call", icon: "📞" },
      { name: "Environment Review", icon: "🔍" },
      { name: "Requirements Mapping", icon: "🗺️" },
      { name: "Gap Analysis", icon: "📊" },
      { name: "Solution Design", icon: "🎨" },
      { name: "Proposal", icon: "📋" },
    ],
  },
];


interface ActiveWorkflow {
  id: string;
  name: string;
  template: string;
  currentStage: string;
  progress: number;
  status: "on_track" | "at_risk" | "delayed";
  dueDate: string;
}

function deriveStatus(due: string | null, progress: number): ActiveWorkflow["status"] {
  if (!due) return "on_track";
  const dueTime = new Date(due).getTime();
  if (Number.isNaN(dueTime)) return "on_track";
  const daysLeft = (dueTime - Date.now()) / 86400000;
  if (daysLeft < 0 && progress < 100) return "delayed";
  if (daysLeft < 7 && progress < 70) return "at_risk";
  return "on_track";
}

export function PresalesWorkflowsTab() {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeWorkflows, setActiveWorkflows] = useState<ActiveWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = useCallback(async () => {
    if (!currentTenant?.id) {
      setActiveWorkflows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const tenantId = currentTenant.id;
    const [pocs, rfps, demos] = await Promise.all([
      supabase
        .from("poc_requests")
        .select("id, title, status, end_date")
        .eq("tenant_id", tenantId)
        .in("status", ["requested", "planning", "in_progress"]),
      supabase
        .from("rfp_responses")
        .select("id, title, status, due_date, sections_completed, total_sections")
        .eq("tenant_id", tenantId)
        .neq("status", "submitted"),
      supabase
        .from("demo_schedules")
        .select("id, title, status, scheduled_date")
        .eq("tenant_id", tenantId)
        .in("status", ["scheduled", "rescheduled"]),
    ]);

    const pocProgress: Record<string, number> = { requested: 10, planning: 30, in_progress: 60 };

    const rows: ActiveWorkflow[] = [
      ...(pocs.data ?? []).map((r) => {
        const progress = pocProgress[r.status as string] ?? 20;
        return {
          id: `poc-${r.id}`,
          name: r.title,
          template: "POC Execution",
          currentStage: String(r.status).replace(/_/g, " "),
          progress,
          status: deriveStatus(r.end_date, progress),
          dueDate: r.end_date ?? "—",
        };
      }),
      ...(rfps.data ?? []).map((r) => {
        const total = r.total_sections ?? 0;
        const progress = total > 0 ? Math.round(((r.sections_completed ?? 0) / total) * 100) : 20;
        return {
          id: `rfp-${r.id}`,
          name: r.title,
          template: "RFP Response",
          currentStage: String(r.status ?? "drafting").replace(/_/g, " "),
          progress,
          status: deriveStatus(r.due_date, progress),
          dueDate: r.due_date ?? "—",
        };
      }),
      ...(demos.data ?? []).map((r) => ({
        id: `demo-${r.id}`,
        name: r.title,
        template: "Demo Preparation",
        currentStage: String(r.status).replace(/_/g, " "),
        progress: 40,
        status: deriveStatus(r.scheduled_date, 40),
        dueDate: r.scheduled_date ? r.scheduled_date.split("T")[0] : "—",
      })),
    ];

    setActiveWorkflows(rows);
    setLoading(false);
  }, [currentTenant?.id]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const filteredWorkflows = useMemo(
    () =>
      activeWorkflows.filter((w) =>
        `${w.name} ${w.template}`.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activeWorkflows, searchQuery]
  );

  const workflowStats = useMemo(
    () => ({
      total: activeWorkflows.length,
      onTrack: activeWorkflows.filter((w) => w.status === "on_track").length,
      atRisk: activeWorkflows.filter((w) => w.status === "at_risk").length,
      delayed: activeWorkflows.filter((w) => w.status === "delayed").length,
    }),
    [activeWorkflows]
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on_track":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "at_risk":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "delayed":
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "on_track":
        return <Badge className="bg-green-500/20 text-green-500">On Track</Badge>;
      case "at_risk":
        return <Badge className="bg-yellow-500/20 text-yellow-500">At Risk</Badge>;
      case "delayed":
        return <Badge className="bg-red-500/20 text-red-500">Delayed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Active Workflows Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Active Workflows
            </h2>
            <p className="text-sm text-muted-foreground">Currently running presales workflows</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {loading && (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading workflows…</p>
          )}
          {!loading && filteredWorkflows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No active presales workflows. Start one from a template below.
            </p>
          )}
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="glass rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(workflow.status)}
                    <h3 className="font-semibold">{workflow.name}</h3>
                    {getStatusBadge(workflow.status)}
                    <Badge variant="outline">{workflow.template}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Current Stage:</span>
                    <span className="font-medium text-foreground">{workflow.currentStage}</span>
                    <span className="mx-2">•</span>
                    <span>Due: {workflow.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{workflow.progress}%</p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Templates Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Workflow Templates</h2>
          <p className="text-sm text-muted-foreground">Start a new presales workflow from a template</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {presalesWorkflowTemplates.map((template) => (
            <Card key={template.id} className="glass border-border hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {template.stages.map((stage, index) => (
                      <div key={index} className="flex items-center">
                        <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                          <span>{stage.icon}</span>
                          {stage.name}
                        </span>
                        {index < template.stages.length - 1 && (
                          <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Start Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{workflowStats.total}</p>
              <p className="text-sm text-muted-foreground">Active Workflows</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{workflowStats.onTrack}</p>
              <p className="text-sm text-muted-foreground">On Track</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{workflowStats.atRisk}</p>
              <p className="text-sm text-muted-foreground">At Risk</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{workflowStats.delayed}</p>
              <p className="text-sm text-muted-foreground">Delayed</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}