import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  usePulseHistory,
  useTenantPeople,
  useWellbeingSignals,
  useRunWellbeingAnalysis,
} from "@/hooks/usePeopleIntelligence";
import { PulseCheckInCard } from "./PulseCheckInCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Brain, Loader2, TrendingUp, HeartPulse, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const riskStyles: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function WellbeingTab() {
  const { data: pulses = [], isLoading: pulseLoading } = usePulseHistory(30);
  const { data: signals = [], isLoading: signalsLoading } = useWellbeingSignals(14);
  const { byId } = useTenantPeople();
  const runAnalysis = useRunWellbeingAnalysis();
  const { toast } = useToast();

  const trend = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number; energy: number; workload: number }>();
    for (const p of pulses) {
      const entry = byDate.get(p.checkin_date) ?? { total: 0, count: 0, energy: 0, workload: 0 };
      entry.total += p.mood_score;
      entry.energy += p.energy_level ?? 0;
      entry.workload += p.workload_level ?? 0;
      entry.count += 1;
      byDate.set(p.checkin_date, entry);
    }
    return [...byDate.entries()].map(([date, v]) => ({
      date: date.slice(5),
      mood: Number((v.total / v.count).toFixed(2)),
      energy: Number((v.energy / v.count).toFixed(2)),
      workload: Number((v.workload / v.count).toFixed(2)),
    }));
  }, [pulses]);

  const stats = useMemo(() => {
    const moodAvg = pulses.length ? pulses.reduce((s, p) => s + p.mood_score, 0) / pulses.length : 0;
    const participants = new Set(pulses.map((p) => p.user_id)).size;
    const atRisk = signals.filter((s) => s.risk_level === "high").length;
    const watch = signals.filter((s) => s.risk_level === "medium").length;
    return { moodAvg, participants, atRisk, watch };
  }, [pulses, signals]);

  const themes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of signals) for (const t of s.themes ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [signals]);

  const analyse = async () => {
    try {
      const res = await runAnalysis.mutateAsync();
      toast({
        title: "Wellbeing analysis complete",
        description: `${res.analyzed} people scored, ${res.ai_enriched} enriched with AI insight.`,
      });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PulseCheckInCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Average mood (30d)", value: stats.moodAvg ? `${stats.moodAvg.toFixed(1)}/5` : "—", icon: HeartPulse },
          { label: "People checking in", value: String(stats.participants), icon: Users },
          { label: "At risk", value: String(stats.atRisk), icon: AlertTriangle },
          { label: "Worth watching", value: String(stats.watch), icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mood, energy and workload</CardTitle>
          <CardDescription>Daily workspace averages over the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {pulseLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Loading trends…</div>
          ) : trend.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1">
              <p className="font-medium">No check-ins yet</p>
              <p className="text-sm text-muted-foreground">Trends appear once people start logging their day.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Area type="monotone" dataKey="mood" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                <Area type="monotone" dataKey="energy" stroke="hsl(var(--chart-2, var(--primary)))" fill="transparent" />
                <Area type="monotone" dataKey="workload" stroke="hsl(var(--destructive))" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Individual wellbeing signals</CardTitle>
            <CardDescription>
              Blends self-reported check-ins, tone of written notes and workload behaviour (overtime, weekend work, overdue load).
            </CardDescription>
          </div>
          <Button onClick={analyse} disabled={runAnalysis.isPending} className="shrink-0">
            {runAnalysis.isPending
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              : <Brain className="w-4 h-4 mr-2" aria-hidden="true" />}
            Run analysis
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {themes.map(([theme, count]) => (
                <Badge key={theme} variant="outline" className="capitalize">
                  {theme} · {count}
                </Badge>
              ))}
            </div>
          )}

          {signalsLoading ? (
            <p className="text-muted-foreground text-sm">Loading signals…</p>
          ) : signals.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="font-medium">No signals yet</p>
              <p className="text-sm text-muted-foreground">
                Run the analysis to score the workspace from check-ins and work patterns.
              </p>
            </div>
          ) : (
            signals.map((s) => {
              const person = byId.get(s.user_id);
              const factors = Object.entries(s.factors ?? {})
                .filter(([, v]) => Number(v) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 4);
              return (
                <div key={s.user_id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={person?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{initials(person?.full_name ?? "?")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold truncate">{person?.full_name ?? "Unknown"}</p>
                        {person?.department && (
                          <span className="text-xs text-muted-foreground">{person.department}</span>
                        )}
                        <Badge variant="outline" className={cn("capitalize", riskStyles[s.risk_level])}>
                          {s.risk_level} risk
                        </Badge>
                      </div>
                      {s.summary && <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold">{Math.round(s.risk_score)}</p>
                      <p className="text-xs text-muted-foreground">/100</p>
                    </div>
                  </div>

                  <Progress value={s.risk_score} aria-label={`Risk score ${Math.round(s.risk_score)} of 100`} />

                  {factors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {factors.map(([key, val]) => (
                        <Badge key={key} variant="secondary" className="text-xs font-normal">
                          {key.replace(/_/g, " ")} +{val}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {s.recommended_action && (
                    <p className="text-sm rounded-md bg-muted px-3 py-2">
                      <span className="font-medium">Suggested next step: </span>
                      {s.recommended_action}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
