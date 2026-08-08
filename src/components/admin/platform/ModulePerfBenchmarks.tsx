/**
 * Observability → Frontend performance benchmarks.
 *
 * Answers two questions with real-user data:
 *   - how long does switching to a sub-module actually take (p50/p95, against
 *     a 1s interaction budget), and
 *   - is chunk preloading working — how often speculative warming succeeds,
 *     how many switches are served warm, and how often a fetch fails outright.
 */

import { AlertTriangle, Gauge, Timer, Wifi, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useModulePerfStats } from "@/hooks/useModulePerfStats";

const ms = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`);
const pct = (value: number) => `${Math.round(value * 100)}%`;

function Stat({
  title,
  value,
  hint,
  Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint: string;
  Icon: typeof Gauge;
  tone?: "default" | "danger" | "good";
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "good" && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ModulePerfBenchmarks({
  windowMs,
  paused = false,
}: {
  windowMs: number;
  paused?: boolean;
}) {
  const { stats, isLocalOnly } = useModulePerfStats(windowMs, paused);
  const { overall, budgetMs } = stats;
  const budgetTone = overall.withinBudgetRatio >= 0.95 ? "good" : overall.withinBudgetRatio >= 0.8 ? "default" : "danger";

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" aria-hidden="true" /> Sub-module performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="tabular-nums">
              budget {ms(budgetMs)}
            </Badge>
            <Badge variant={isLocalOnly ? "secondary" : "outline"}>
              {isLocalOnly ? "this browser only" : `${overall.sessions} sessions`}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Real-user switching latency (click to painted content) and chunk preloading success.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            title="Switch p95"
            value={overall.switches ? ms(overall.p95Ms) : "—"}
            hint={`p50 ${overall.switches ? ms(overall.p50Ms) : "—"} · ${overall.switches} switches`}
            Icon={Timer}
            tone={overall.p95Ms > budgetMs ? "danger" : "good"}
          />
          <Stat
            title="Within budget"
            value={overall.switches ? pct(overall.withinBudgetRatio) : "—"}
            hint={`Switches under ${ms(budgetMs)}`}
            Icon={Gauge}
            tone={budgetTone}
          />
          <Stat
            title="Preload success"
            value={overall.preloadAttempts ? pct(overall.preloadSuccessRatio) : "—"}
            hint={`${overall.preloadAttempts} speculative warm-ups`}
            Icon={Zap}
            tone={overall.preloadAttempts && overall.preloadSuccessRatio < 0.9 ? "danger" : "good"}
          />
          <Stat
            title="Served warm"
            value={overall.switches ? pct(overall.warmRatio) : "—"}
            hint={`${pct(overall.chunkFailureRatio)} chunk failures · ${overall.offlineFailures} offline`}
            Icon={Wifi}
            tone={overall.chunkFailureRatio > 0.02 ? "danger" : "default"}
          />
        </div>

        {stats.regressions.length > 0 && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-destructive">
                {stats.regressions.length} module{stats.regressions.length > 1 ? "s" : ""} over budget
              </p>
              <p className="text-muted-foreground">
                {stats.regressions
                  .slice(0, 4)
                  .map((r) => `${r.module} (p95 ${ms(r.p95Ms)})`)
                  .join(", ")}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {stats.modules.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No switches recorded in this window yet.
            </p>
          )}
          {stats.modules.slice(0, 12).map((m) => {
            const over = m.p95Ms > budgetMs;
            return (
              <div key={m.module} className="rounded-md border border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{m.module}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.switches} switches · {m.chunkLoads} chunk loads
                  </span>
                  <Badge variant={over ? "destructive" : "outline"} className="ml-auto tabular-nums">
                    p95 {ms(m.p95Ms)}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    p50 {ms(m.p50Ms)}
                  </Badge>
                  {m.chunkFailures > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {m.chunkFailures} failed
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress
                    value={Math.min(100, (m.p95Ms / (budgetMs * 2)) * 100)}
                    className="h-1.5 flex-1"
                    aria-label={`${m.module} p95 latency against budget`}
                  />
                  <span className="w-40 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    warm {pct(m.warmRatio)}
                    {m.preloadAttempts > 0 && ` · preload ${pct(m.preloadSuccessRatio)}`}
                  </span>
                </div>
                {m.warmP95Ms > 0 && m.coldP95Ms > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    warm p95 {ms(m.warmP95Ms)} vs cold p95 {ms(m.coldP95Ms)} — preloading saves{" "}
                    {ms(Math.max(0, m.coldP95Ms - m.warmP95Ms))}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {stats.byConnection.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {stats.byConnection.map((c) => (
              <Badge key={c.effectiveType} variant="outline" className="tabular-nums">
                {c.effectiveType}: p95 {ms(c.p95Ms)} ({c.switches})
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
