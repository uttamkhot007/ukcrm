import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface AgentAttachment {
  name: string;
  text: string;
}

export interface AgentRunStep {
  id: string;
  step_index: number;
  step_type: string;
  label: string | null;
  tool_name: string | null;
  status: string;
  duration_ms: number | null;
}

export interface AgentDeliverable {
  id: string;
  title: string;
  html: string;
}

export interface AgentQuestion {
  id: string;
  label: string;
  help?: string;
  type?: string;
  options?: string[];
  required?: boolean;
  suggestion?: string;
}

export interface AgentPending {
  reason: string;
  questions: AgentQuestion[];
  toolCallId: string;
  messages: unknown[];
}

export interface AgentRunResult {
  runId: string | null;
  text: string;
  deliverable: AgentDeliverable | null;
}

interface RunArgs {
  agentKey: string;
  instruction: string;
  context?: Record<string, unknown>;
  attachments?: AgentAttachment[];
  /** Resume a paused run with the answers the user just filled in. */
  resume?: { toolCallId: string; messages: unknown[] };
  answers?: Record<string, string>;
}


/**
 * Drives one agent run: invokes the runtime, polls the step trail while it
 * works so the user sees progress, and surfaces gateway errors verbatim.
 */
export function useAgentRun() {
  const { currentTenant } = useTenant();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<AgentRunStep[]>([]);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [pending, setPending] = useState<AgentPending | null>(null);

  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const runIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const loadSteps = useCallback(async (runId: string) => {
    const { data } = await supabase
      .from("ai_agent_run_steps")
      .select("id,step_index,step_type,label,tool_name,status,duration_ms")
      .eq("run_id", runId)
      .order("step_index", { ascending: true });
    if (data) setSteps(data as AgentRunStep[]);
  }, []);

  const run = useCallback(
    async ({ agentKey, instruction, context, attachments, resume, answers }: RunArgs) => {
      setIsRunning(true);
      setError(null);
      setResult(null);
      setPending(null);
      if (!resume) setSteps([]);
      runIdRef.current = null;


      // While the runtime works, poll the newest run's steps for a live trail.
      const pollLatest = async () => {
        if (!currentTenant?.id) return;
        if (!runIdRef.current) {
          const { data } = await supabase
            .from("ai_agent_runs")
            .select("id")
            .eq("tenant_id", currentTenant.id)
            .eq("agent_key", agentKey)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data?.id) runIdRef.current = data.id;
        }
        if (runIdRef.current) await loadSteps(runIdRef.current);
      };
      pollRef.current = window.setInterval(pollLatest, 1500);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("agent-run", {
          body: {
            agentKey,
            instruction,
            tenantId: currentTenant?.id ?? null,
            context: context ?? {},
            attachments: attachments ?? [],
            resume: resume ?? null,
            answers: answers ?? null,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        if (data?.pending?.questions?.length) {
          setPending(data.pending as AgentPending);
          if (data.runId) await loadSteps(data.runId);
          return null;
        }

        const runResult: AgentRunResult = {
          runId: data?.runId ?? null,
          text: data?.text ?? "",
          deliverable: data?.deliverable?.html ? data.deliverable : null,
        };
        setResult(runResult);
        if (runResult.runId) await loadSteps(runResult.runId);
        return runResult;
      } catch (e) {
        const message = e instanceof Error ? e.message : "The agent could not complete this run.";
        setError(message);
        return null;
      } finally {
        stopPolling();
        setIsRunning(false);
      }
    },
    [currentTenant?.id, loadSteps, stopPolling],
  );

  const reset = useCallback(() => {
    setResult(null);
    setPending(null);
    setError(null);
    setSteps([]);
  }, []);

  return { run, reset, isRunning, steps, result, pending, error };
}
