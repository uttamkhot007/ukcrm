import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  UserMinus,
  Heart,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";

interface WorkflowKanbanViewProps {
  workflows: any[];
  workflowType: string;
  isLoading: boolean;
  onSelectWorkflow: (id: string) => void;
}

const ONBOARDING_STAGES = [
  { id: "requirement_submitted", label: "Requirement Submitted", color: "bg-slate-500" },
  { id: "hr_sourcing", label: "HR Sourcing", color: "bg-blue-500" },
  { id: "profile_review", label: "Profile Review", color: "bg-purple-500" },
  { id: "manager_interview", label: "Manager Interview", color: "bg-indigo-500" },
  { id: "senior_interview", label: "Senior Interview", color: "bg-violet-500" },
  { id: "ceo_interview", label: "CEO Interview", color: "bg-pink-500" },
  { id: "management_interview", label: "Management Interview", color: "bg-rose-500" },
  { id: "offer_preparation", label: "Offer Preparation", color: "bg-orange-500" },
  { id: "offer_sent", label: "Offer Sent", color: "bg-amber-500" },
  { id: "offer_accepted", label: "Offer Accepted", color: "bg-lime-500" },
  { id: "completed", label: "Completed", color: "bg-green-500" },
];

const OFFBOARDING_STAGES = [
  { id: "resignation_submitted", label: "Resignation Submitted", color: "bg-slate-500" },
  { id: "manager_review", label: "Manager Review", color: "bg-blue-500" },
  { id: "retention_review", label: "Retention Review", color: "bg-purple-500" },
  { id: "exit_approved", label: "Exit Approved", color: "bg-orange-500" },
  { id: "knowledge_transfer", label: "Knowledge Transfer", color: "bg-amber-500" },
  { id: "asset_return", label: "Asset Return", color: "bg-yellow-500" },
  { id: "exit_interview", label: "Exit Interview", color: "bg-lime-500" },
  { id: "final_settlement", label: "Final Settlement", color: "bg-emerald-500" },
  { id: "completed", label: "Completed", color: "bg-green-500" },
];

const getStages = (workflowType: string) => {
  if (workflowType === "offboarding" || workflowType === "retention") {
    return OFFBOARDING_STAGES;
  }
  return ONBOARDING_STAGES;
};

const getWorkflowIcon = (type: string) => {
  switch (type) {
    case "onboarding":
      return <UserPlus className="w-4 h-4 text-green-500" />;
    case "offboarding":
      return <UserMinus className="w-4 h-4 text-red-500" />;
    case "retention":
      return <Heart className="w-4 h-4 text-pink-500" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function WorkflowKanbanView({
  workflows,
  workflowType,
  isLoading,
  onSelectWorkflow,
}: WorkflowKanbanViewProps) {
  const stages = workflowType === "all" ? ONBOARDING_STAGES : getStages(workflowType);

  const getWorkflowsForStage = (stageId: string) => {
    return workflows.filter((w) => w.current_stage === stageId);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="min-w-[280px] space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {stages.map((stage) => {
          const stageWorkflows = getWorkflowsForStage(stage.id);
          return (
            <div key={stage.id} className="min-w-[300px] max-w-[300px]">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                <h3 className="font-medium text-sm">{stage.label}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {stageWorkflows.length}
                </Badge>
              </div>
              <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-lg p-2">
                {stageWorkflows.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                    onClick={() => onSelectWorkflow(workflow.id)}
                  >
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getWorkflowIcon(workflow.workflow_type)}
                          <span className="font-medium text-sm line-clamp-1">
                            {workflow.title}
                          </span>
                        </div>
                        <Badge
                          variant={
                            workflow.priority === "high" || workflow.priority === "urgent"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {workflow.priority}
                        </Badge>
                      </div>

                      {workflow.onboarding_requests?.[0] && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {workflow.onboarding_requests[0].job_title}
                          </div>
                          {workflow.onboarding_requests[0].department && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {workflow.onboarding_requests[0].department}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(workflow.created_at), "MMM d")}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            workflow.status === "active" && "border-blue-500 text-blue-500",
                            workflow.status === "pending_approval" && "border-yellow-500 text-yellow-500",
                            workflow.status === "completed" && "border-green-500 text-green-500"
                          )}
                        >
                          {workflow.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageWorkflows.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No workflows
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
