import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { analyzeDeal, summarize, type DealIntelligence, type IntelligenceDeal, type NextBestAction, type RiskLevel } from "@/lib/deal-intelligence";
import { automateBatch, automateNextBestAction, dueInDaysFor } from "@/lib/pipeline-followups";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  ListChecks,
  Loader2,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";


const LEVEL_META: Record<RiskLevel, { label: string; className: string; icon: typeof Flame }> = {
  critical: { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30", icon: Flame },
  at_risk: { label: "At risk", className: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: AlertTriangle },
  watch: { label: "Watch", className: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: Clock },
  healthy: { label: "Healthy", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
};

const FILTERS: Array<{ id: "all" | RiskLevel; label: string }> = [
  { id: "all", label: "All open deals" },
  { id: "critical", label: "Critical" },
  { id: "at_risk", label: "At risk" },
  { id: "watch", label: "Watch" },
  { id: "healthy", label: "Healthy" },
];

interface PipelineCoachProps {
  /** Optional callback so parent tab bars can jump to the Deals workspace. */
  onOpenDeals?: () => void;
}

export function PipelineCoach({ onOpenDeals }: PipelineCoachProps) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useOrganizationSettings();
  const [filter, setFilter] = useState<"all" | RiskLevel>("all");
  const [search, setSearch] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [automating, setAutomating] = useState(false);
  const [automated, setAutomated] = useState<Set<string>>(new Set());


  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["pipeline-coach-deals", currentTenant?.id],
    enabled: !!currentTenant?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id,title,value,stage,probability,expected_close_date,updated_at,created_at,next_steps,contact_id,organization_name,assigned_to,meddic_score,meddic_metrics,meddic_economic_buyer,meddic_decision_criteria,meddic_decision_process,meddic_identify_pain,meddic_champion",
        )
        .eq("tenant_id", currentTenant!.id)
        .not("stage", "in", "(closed_won,closed_lost)")
        .order("value", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as IntelligenceDeal[];
    },
  });

  const analyzed = useMemo(() => {
    const now = new Date();
    return deals
      .map((deal) => ({ deal, intel: analyzeDeal(deal, now) }))
      .sort((a, b) => b.intel.riskScore - a.intel.riskScore || (b.deal.value ?? 0) - (a.deal.value ?? 0));
  }, [deals]);

  const summary = useMemo(
    () => summarize(analyzed.map((a) => a.intel), deals),
    [analyzed, deals],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return analyzed.filter(({ deal, intel }) => {
      if (filter !== "all" && intel.level !== filter) return false;
      if (!term) return true;
      return (
        (deal.title ?? "").toLowerCase().includes(term) ||
        (deal.organization_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [analyzed, filter, search]);

  const coverage = summary.totalValue > 0 ? Math.round(100 - (summary.valueAtRisk / summary.totalValue) * 100) : 100;

  const canAutomate = Boolean(currentTenant?.id && user?.id);

  /** Schedule the follow-up task + notify the owner for a single action. */
  const runAction = useCallback(
    async (deal: IntelligenceDeal, action: NextBestAction) => {
      if (!currentTenant?.id || !user?.id) return;
      const key = `${deal.id}:${action.code}`;
      setBusyAction(key);
      try {
        const outcome = await automateNextBestAction({
          tenantId: currentTenant.id,
          actorId: user.id,
          deal,
          action,
        });
        setAutomated((prev) => new Set(prev).add(key));
        toast({
          title: outcome.created ? "Follow-up scheduled" : "Already scheduled",
          description: outcome.created
            ? `"${action.label}" is due in ${dueInDaysFor(action)} day(s) and the deal owner was notified.`
            : outcome.reason,
        });
      } catch (error) {
        toast({
          title: "Could not create the follow-up",
          description: error instanceof Error ? error.message : "Unexpected error",
          variant: "destructive",
        });
      } finally {
        setBusyAction(null);
      }
    },
    [currentTenant?.id, user?.id, toast],
  );

  /** Automate the top action for every deal currently in view that needs one. */
  const runBulkAutomation = useCallback(async () => {
    if (!currentTenant?.id || !user?.id) return;
    const targets = visible
      .filter(({ intel }) => intel.level === "critical" || intel.level === "at_risk")
      .map(({ deal, intel }) => ({ deal, action: intel.actions[0] }))
      .filter((t): t is { deal: IntelligenceDeal; action: NextBestAction } => Boolean(t.action));

    if (targets.length === 0) {
      toast({ title: "Nothing to automate", description: "No critical or at-risk deals in this view." });
      return;
    }

    setAutomating(true);
    try {
      const result = await automateBatch(
        targets.map(({ deal, action }) => ({ tenantId: currentTenant.id, actorId: user.id, deal, action })),
      );
      setAutomated((prev) => {
        const next = new Set(prev);
        targets.forEach(({ deal, action }) => next.add(`${deal.id}:${action.code}`));
        return next;
      });
      toast({
        title: `Automated ${result.created} follow-up(s)`,
        description: `${result.skipped} already open${result.failed ? `, ${result.failed} failed` : ""}. Owners were notified.`,
        variant: result.failed ? "destructive" : undefined,
      });
    } finally {
      setAutomating(false);
    }
  }, [currentTenant?.id, user?.id, visible, toast]);


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
              Pipeline Coach
            </h2>
            <p className="text-muted-foreground">
              Explainable risk scoring and the next best action for every open deal — recalculated live, no waiting on AI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void runBulkAutomation()} disabled={!canAutomate || automating}>
              {automating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Automate follow-ups
            </Button>
            {onOpenDeals && (
              <Button variant="outline" onClick={onOpenDeals}>
                Open Deals
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </header>


        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Deals needing attention"
            value={`${summary.critical + summary.atRisk}`}
            hint={`${summary.critical} critical / ${summary.atRisk} at risk`}
            icon={AlertTriangle}
            tone="warn"
          />
          <SummaryCard
            title="Value at risk"
            value={formatCurrency(summary.valueAtRisk)}
            hint={`of ${formatCurrency(summary.totalValue)} open pipeline`}
            icon={Flame}
            tone="danger"
          />
          <SummaryCard
            title="Pipeline health"
            value={`${coverage}%`}
            hint={`${summary.healthy} healthy of ${summary.total} deals`}
            icon={ShieldCheck}
            tone="good"
          />
          <SummaryCard
            title="Most common action"
            value={summary.topActions[0]?.label ?? "Nothing pending"}
            hint={summary.topActions[0] ? `${summary.topActions[0].count} deals` : "Pipeline is clean"}
            icon={ListChecks}
            tone="neutral"
            compact
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
            >
              {f.label}
            </Button>
          ))}
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deal or account"
              aria-label="Search deals"
              className="pl-9"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden="true" />
              <p className="font-medium">No deals match this view</p>
              <p className="text-sm text-muted-foreground">
                {deals.length === 0
                  ? "Create a deal to start getting coaching signals."
                  : "Try another risk filter or clear the search."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map(({ deal, intel }) => (
              <DealCoachCard
                key={deal.id}
                deal={deal}
                intel={intel}
                formatCurrency={formatCurrency}
                canAutomate={canAutomate}
                busyAction={busyAction}
                automated={automated}
                onRunAction={runAction}
              />

            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
  compact,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Flame;
  tone: "good" | "warn" | "danger" | "neutral";
  compact?: boolean;
}) {
  const toneClass = {
    good: "text-emerald-500",
    warn: "text-amber-500",
    danger: "text-destructive",
    neutral: "text-primary",
  }[tone];

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", toneClass)} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className={cn("font-bold", compact ? "text-base leading-tight" : "text-2xl")}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function DealCoachCard({
  deal,
  intel,
  formatCurrency,
  canAutomate,
  busyAction,
  automated,
  onRunAction,
}: {
  deal: IntelligenceDeal;
  intel: DealIntelligence;
  formatCurrency: (value: number) => string;
  canAutomate: boolean;
  busyAction: string | null;
  automated: Set<string>;
  onRunAction: (deal: IntelligenceDeal, action: NextBestAction) => void | Promise<void>;
}) {

  const meta = LEVEL_META[intel.level];
  const LevelIcon = meta.icon;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{deal.title ?? "Untitled deal"}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {deal.organization_name ?? "No account"} · {formatCurrency(deal.value ?? 0)}
            </p>
          </div>
          <Badge variant="outline" className={cn("shrink-0 gap-1", meta.className)}>
            <LevelIcon className="h-3 w-3" aria-hidden="true" />
            {meta.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Risk score</span>
            <span>{intel.riskScore}/100 · {formatCurrency(intel.valueAtRisk)} at risk</span>
          </div>
          <Progress
            value={intel.riskScore}
            aria-label={`Risk score ${intel.riskScore} out of 100`}
          />
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {intel.daysSinceActivity}d since update
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {intel.daysToClose === null
              ? "No close date"
              : intel.daysToClose < 0
                ? `${Math.abs(intel.daysToClose)}d overdue`
                : `${intel.daysToClose}d to close`}
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            MEDDIC {6 - intel.meddicGaps.length}/6
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next best actions</p>
          <ul className="space-y-2">
            {intel.actions.slice(0, 3).map((action) => {
              const key = `${deal.id}:${action.code}`;
              const busy = busyAction === key;
              const done = automated.has(key);
              return (
                <li key={action.code} className="flex items-start gap-2 text-sm">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted underline-offset-4">{action.label}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {action.rationale} Creates a task due in {dueInDaysFor(action)} day(s) and notifies the deal owner.
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "ghost"}
                    className="ml-auto h-7 shrink-0 px-2 text-xs"
                    disabled={!canAutomate || busy}
                    onClick={() => void onRunAction(deal, action)}
                    aria-label={`Schedule follow-up and notify owner: ${action.label}`}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : done ? (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <BellRing className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {busy ? "" : done ? "Scheduled" : "Follow up"}
                  </Button>
                </li>
              );
            })}
          </ul>

        </div>

        {intel.factors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {intel.factors.map((factor) => (
              <Tooltip key={factor.code}>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="cursor-help text-[11px]">
                    {factor.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{factor.detail}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PipelineCoach;
