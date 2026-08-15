import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [showErrors, setShowErrors] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const { run, isRunning, steps, result, pending, error } = useAgentRun();

  const activeAgent = getAgentMeta(active) ?? roster[0];

  useEffect(() => {
    if (!pending) return;
    const prefilled: Record<string, string> = {};
    for (const q of pending.questions) if (q.suggestion) prefilled[q.id] = q.suggestion;
    setAnswers(prefilled);
    setShowErrors(false);
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

  const validateAnswer = (q: { id: string; label: string; type?: string; required?: boolean }, raw: string) => {
    const value = (raw ?? "").trim();
    if (!value) return q.required === false ? null : "This is required.";

    if (q.type === "date") {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "Enter a valid date (YYYY-MM-DD).";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) return "Date cannot be in the past.";
      const maxDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
      if (parsed > maxDate) return "Date looks unrealistic (more than 5 years ahead).";
      return null;
    }

    if (q.type === "number") {
      const num = Number(value.replace(/[,\s₹]/g, ""));
      if (!Number.isFinite(num)) return "Enter a valid number.";
      if (num <= 0) return "Must be greater than zero.";
      if (/value|amount|size|price/i.test(q.label) && num > 1_000_000_000_000)
        return "Amount looks unrealistic.";
      return null;
    }

    if (/email/i.test(q.label) && /@/.test(value) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.split(/[,;]/)[0].trim()))
      return "Enter a valid email address.";

    if (value.length < 2) return "Please enter a bit more detail.";
    return null;
  };

  const answerErrors = useMemo(() => {
    if (!pending) return {} as Record<string, string>;
    const errs: Record<string, string> = {};
    for (const q of pending.questions) {
      const message = validateAnswer(q, answers[q.id] ?? "");
      if (message) errs[q.id] = message;
    }
    return errs;
  }, [pending, answers]);

  const submitAnswers = async () => {
    if (!pending || isRunning) return;
    setShowErrors(true);
    if (Object.keys(answerErrors).length > 0) return;
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

        {pending && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">{pending.reason}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {pending.questions.map((q) => {
                const fieldError = showErrors ? answerErrors[q.id] : undefined;
                return (
                <div key={q.id} className="space-y-1">
                  <Label htmlFor={`agent-q-${q.id}`} className="text-xs">
                    {q.label}
                    {q.required !== false && <span className="text-destructive"> *</span>}
                  </Label>
                  {q.options?.length ? (
                    <Select
                      value={answers[q.id] ?? ""}
                      onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                    >
                      <SelectTrigger id={`agent-q-${q.id}`} aria-invalid={!!fieldError}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : q.type === "textarea" ? (
                    <Textarea
                      id={`agent-q-${q.id}`}
                      rows={2}
                      aria-invalid={!!fieldError}
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={`agent-q-${q.id}`}
                      type={q.type === "number" || q.type === "date" ? q.type : "text"}
                      min={q.type === "number" ? 1 : q.type === "date" ? todayIso : undefined}
                      aria-invalid={!!fieldError}
                      className={cn(fieldError && "border-destructive focus-visible:ring-destructive")}
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  )}
                  {fieldError ? (
                    <p className="text-[11px] font-medium text-destructive">{fieldError}</p>
                  ) : (
                    q.help && <p className="text-[11px] text-muted-foreground">{q.help}</p>
                  )}
                </div>
                );
              })}
            </div>
            {showErrors && Object.keys(answerErrors).length > 0 && (
              <p className="text-xs font-medium text-destructive">
                Please correct the highlighted fields before continuing.
              </p>
            )}
            <Button size="sm" onClick={submitAnswers} disabled={isRunning}>
              {isRunning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Continue
            </Button>

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
