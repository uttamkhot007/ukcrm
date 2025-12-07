import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  UserMinus,
  Heart,
  Calendar,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface WorkflowTimelineViewProps {
  workflows: any[];
  isLoading: boolean;
  onSelectWorkflow: (id: string) => void;
}

const ONBOARDING_STAGES = [
  "requirement_submitted",
  "hr_sourcing",
  "profile_review",
  "manager_interview",
  "senior_interview",
  "ceo_interview",
  "management_interview",
  "offer_preparation",
  "offer_sent",
  "offer_accepted",
  "completed",
];

const OFFBOARDING_STAGES = [
  "resignation_submitted",
  "manager_review",
  "retention_review",
  "exit_approved",
  "knowledge_transfer",
  "asset_return",
  "exit_interview",
  "final_settlement",
  "completed",
];

const getWorkflowIcon = (type: string) => {
  switch (type) {
    case "onboarding":
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case "offboarding":
      return <UserMinus className="w-5 h-5 text-red-500" />;
    case "retention":
      return <Heart className="w-5 h-5 text-pink-500" />;
    default:
      return <User className="w-5 h-5" />;
  }
};

const getProgress = (workflow: any) => {
  const stages = workflow.workflow_type === "onboarding" 
    ? ONBOARDING_STAGES 
    : OFFBOARDING_STAGES;
  const currentIndex = stages.indexOf(workflow.current_stage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / stages.length) * 100);
};

const formatStageName = (stage: string) => {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export function WorkflowTimelineView({
  workflows,
  isLoading,
  onSelectWorkflow,
}: WorkflowTimelineViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No workflows found. Create a new workflow to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {workflows.map((workflow) => {
        const progress = getProgress(workflow);
        return (
          <Card
            key={workflow.id}
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            onClick={() => onSelectWorkflow(workflow.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    {getWorkflowIcon(workflow.workflow_type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{workflow.title}</h3>
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

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <span className="capitalize">{workflow.workflow_type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Current: {formatStageName(workflow.current_stage)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(workflow.created_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10">
                      {progress}%
                    </span>
                  </div>
                </div>

                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
