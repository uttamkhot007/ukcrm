import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Bot, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENTS, getAgentMeta } from "@/lib/agents/registry";
import { AgentPanel } from "./AgentPanel";
import { DeliverableLibrary } from "./DeliverableLibrary";
import { cn } from "@/lib/utils";

interface RunRow {
  id: string;
  agent_key: string;
  instruction: string;
  status: string;
  duration_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
  error: string | null;
}

function RunHistory() {
  const { currentTenant } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-agent-runs", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_runs")
        .select("id,agent_key,instruction,status,duration_ms,prompt_tokens,completion_tokens,created_at,error")
        .eq("tenant_id", currentTenant!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RunRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No agent runs yet.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((run) => {
        const meta = getAgentMeta(run.agent_key);
        const Icon = run.status === "completed" ? CheckCircle2 : run.status === "failed" ? XCircle : Clock;
        return (
          <div key={run.id} className="flex items-start gap-3 rounded-lg border p-3">
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                run.status === "completed"
                  ? "text-emerald-500"
                  : run.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{run.instruction}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{meta?.name ?? run.agent_key}</Badge>
                <span>{new Date(run.created_at).toLocaleString()}</span>
                {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                <span>{run.prompt_tokens + run.completion_tokens} tokens</span>
                {run.error && <span className="text-destructive">{run.error}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AgentConsole() {
  const [selected, setSelected] = useState<string>("document");
  const meta = getAgentMeta(selected)!;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Bot className="h-7 w-7 text-primary" />
          Agent Console
        </h1>
        <p className="mt-1 text-muted-foreground">
          Specialist AI agents that read your live workspace data and deliver finished work — documents,
          tender analyses, accounts and reports.
        </p>
      </div>

      <Tabs defaultValue="workbench">
        <TabsList>
          <TabsTrigger value="workbench">Workbench</TabsTrigger>
          <TabsTrigger value="library">Deliverables</TabsTrigger>
          <TabsTrigger value="runs">
            <Activity className="mr-1.5 h-3.5 w-3.5" /> Run history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workbench" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-2">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                const isActive = agent.key === selected;
                return (
                  <button
                    key={agent.key}
                    onClick={() => setSelected(agent.key)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", agent.accent)} />
                      <span className="text-sm font-semibold">{agent.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{agent.tagline}</p>
                  </button>
                );
              })}
            </div>

            <AgentPanel
              key={selected}
              module={meta.module}
              agentKey={meta.key}
              title={meta.name}
              context={{ surface: "agent-console" }}
            />
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <DeliverableLibrary />
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent runs</CardTitle>
            </CardHeader>
            <CardContent>
              <RunHistory />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
