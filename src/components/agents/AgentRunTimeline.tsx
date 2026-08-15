import { CheckCircle2, CircleAlert, Database, FileOutput, Loader2, Sparkles } from "lucide-react";
import type { AgentRunStep } from "@/hooks/useAgentRun";
import { cn } from "@/lib/utils";

interface AgentRunTimelineProps {
  steps: AgentRunStep[];
  isRunning: boolean;
}

const iconFor = (step: AgentRunStep) => {
  if (step.status === "error") return CircleAlert;
  if (step.step_type === "deliverable") return FileOutput;
  if (step.step_type === "answer") return Sparkles;
  return Database;
};

export function AgentRunTimeline({ steps, isRunning }: AgentRunTimelineProps) {
  if (!steps.length && !isRunning) return null;

  return (
    <ol className="space-y-2" aria-live="polite" aria-label="Agent progress">
      {steps.map((step) => {
        const Icon = iconFor(step);
        return (
          <li key={step.id} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                step.status === "error"
                  ? "border-destructive/40 text-destructive"
                  : "border-primary/30 text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium capitalize">{step.label ?? step.tool_name ?? "Step"}</p>
              {step.duration_ms != null && (
                <p className="text-xs text-muted-foreground">{step.duration_ms} ms</p>
              )}
            </div>
            {step.status !== "error" && <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-500" />}
          </li>
        );
      })}
      {isRunning && (
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          </span>
          Working…
        </li>
      )}
    </ol>
  );
}
