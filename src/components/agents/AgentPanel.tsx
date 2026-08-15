import { useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { agentsForModule, getAgentMeta } from "@/lib/agents/registry";
import { useAgentRun, type AgentAttachment } from "@/hooks/useAgentRun";
import { AgentRunTimeline } from "./AgentRunTimeline";
import { DeliverablePreview } from "./DeliverablePreview";
import { cn } from "@/lib/utils";

interface AgentPanelProps {
  /** App module — decides which specialists are offered. */
  module: string;
  /** Force a single agent instead of the module's roster. */
  agentKey?: string;
  /** Screen context handed to the agent (record ids, filters, period…). */
  context?: Record<string, unknown>;
  title?: string;
  className?: string;
  compact?: boolean;
}

async function readAttachment(file: File): Promise<AgentAttachment> {
  const type = file.name.split(".").pop()?.toLowerCase();
  if (type === "pdf") {
    const { parsePDFFile } = await import("@/lib/file-parser");
    const rows = await parsePDFFile(file);
    return { name: file.name, text: rows.map((r) => r.join(" ")).join("\n") };
  }
  if (type === "docx") {
    const { parseWordFile } = await import("@/lib/file-parser");
    const rows = await parseWordFile(file);
    return { name: file.name, text: rows.map((r) => r.join(" ")).join("\n") };
  }
  return { name: file.name, text: await file.text() };
}

export function AgentPanel({ module, agentKey, context, title, className, compact }: AgentPanelProps) {
  const roster = useMemo(
    () => (agentKey ? [getAgentMeta(agentKey)].filter(Boolean) : agentsForModule(module)),
    [agentKey, module],
  ) as ReturnType<typeof agentsForModule>;

  const [active, setActive] = useState(roster[0]?.key ?? "orchestrator");
  const [instruction, setInstruction] = useState("");
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [parsing, setParsing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const { run, isRunning, steps, result, pending, error } = useAgentRun();

  const activeAgent = getAgentMeta(active) ?? roster[0];

  useEffect(() => {
    if (!pending) return;
    const prefilled: Record<string, string> = {};
    for (const q of pending.questions) if (q.suggestion) prefilled[q.id] = q.suggestion;
    setAnswers(prefilled);
  }, [pending]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setParsing(true);
    try {
      const parsed = await Promise.all(Array.from(files).slice(0, 3).map(readAttachment));
      setAttachments((prev) => [...prev, ...parsed].slice(0, 3));
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!instruction.trim() || isRunning) return;
    await run({ agentKey: active, instruction: instruction.trim(), context, attachments });
  };

  const submitAnswers = async () => {
    if (!pending || isRunning) return;
    const summary = pending.questions
      .map((q) => `${q.label}: ${answers[q.id]?.trim() || "not provided"}`)
      .join("\n");
    await run({
      agentKey: active,
      instruction: summary,
      context,
      answers,
      resume: { toolCallId: pending.toolCallId, messages: pending.messages },
    });
  };


  return (
    <Card className={cn("border-primary/20 bg-card/70 backdrop-blur", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {title ?? "AI Agents"}
        </CardTitle>
        {activeAgent && <p className="text-xs text-muted-foreground">{activeAgent.tagline}</p>}
      </CardHeader>

      <CardContent className="space-y-4">
        {roster.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Available agents">
            {roster.map((agent) => {
              const Icon = agent.icon;
              const isActive = agent.key === active;
              return (
                <button
                  key={agent.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(agent.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {agent.name}
                </button>
              );
            })}
          </div>
        )}

        {activeAgent && !compact && (
          <div className="flex flex-wrap gap-2">
            {activeAgent.skills.map((skill) => (
              <Badge
                key={skill.label}
                variant="outline"
                className="cursor-pointer hover:border-primary hover:text-primary"
                onClick={() => setInstruction(skill.prompt)}
              >
                {skill.label}
              </Badge>
            ))}
          </div>
        )}

        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={`Tell the ${activeAgent?.name ?? "agent"} what to prepare…`}
          rows={compact ? 3 : 4}
          aria-label="Instruction for the agent"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <Badge key={a.name} variant="secondary" className="gap-1">
                {a.name}
                <button
                  aria-label={`Remove ${a.name}`}
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.name !== a.name))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.csv,.md,.html"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" />}
            Attach
          </Button>
          <Button size="sm" onClick={submit} disabled={isRunning || !instruction.trim()} className="ml-auto">
            {isRunning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {isRunning ? "Working…" : "Run agent"}
          </Button>
        </div>

        {(isRunning || steps.length > 0) && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <AgentRunTimeline steps={steps} isRunning={isRunning} />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result?.text && !result.deliverable && (
          <div className="whitespace-pre-wrap rounded-lg border bg-card/50 p-4 text-sm">{result.text}</div>
        )}

        {result?.deliverable && (
          <DeliverablePreview
            title={result.deliverable.title}
            html={result.deliverable.html}
            subtitle={`Prepared by the ${activeAgent?.name ?? "agent"}`}
          />
        )}
      </CardContent>
    </Card>
  );
}
