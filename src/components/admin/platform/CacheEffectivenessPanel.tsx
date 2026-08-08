/**
 * Observability → Cache effectiveness.
 *
 * Validates the two mechanisms behind instant tab switching:
 *   - KeepAlive: how often a revisited sub-module was still mounted (hit) vs
 *     evicted by the LRU and remounted from scratch (miss).
 *   - React Query: how often a mounting component found data in the (persisted)
 *     cache — fresh (no network at all) or stale (instant paint, background
 *     revalidation) — vs a cold miss that shows a loading state.
 *
 * Samples are collected in this browser tab only, so the panel reflects the
 * session of whoever is looking at it.
 */

import { useEffect, useState } from "react";
import { Boxes, Database, RotateCcw, Snowflake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getCacheStats, onCacheEvent, resetCacheStats } from "@/lib/cache-metrics";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`);

function tone(ratio: number) {
  if (ratio >= 0.8) return "text-primary";
  if (ratio >= 0.5) return "text-foreground";
  return "text-destructive";
}

function Stat({
  title,
  value,
  hint,
  Icon,
  ratio,
}: {
  title: string;
  value: string;
  hint: string;
  Icon: typeof Boxes;
  ratio?: number;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", ratio !== undefined && tone(ratio))}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function CacheEffectivenessPanel({
  windowMs,
  paused = false,
}: {
  windowMs: number;
  paused?: boolean;
}) {
  const [stats, setStats] = useState(() => getCacheStats(windowMs));

  useEffect(() => {
    if (paused) return;
    const refresh = () => setStats(getCacheStats(windowMs));
    refresh();
    const unsubscribe = onCacheEvent(refresh);
    const timer = window.setInterval(refresh, 5_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [windowMs, paused]);

  const { pane, query } = stats;
  const hasData = pane.total > 0 || query.total > 0;

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" aria-hidden="true" /> Cache effectiveness
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">This session</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                resetCacheStats();
                setStats(getCacheStats(windowMs));
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </Button>
          </div>
        </div>
        <CardDescription>
          Keep-alive and query-cache hit rates behind instant sub-module switching.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!hasData ? (
          <p className="text-sm text-muted-foreground">
            No cache activity recorded yet — switch between a few sub-modules and the
            hit rates will appear here.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                title="Keep-alive hit rate"
                value={pct(pane.hitRatio)}
                hint={`${pane.hits} of ${pane.total} revisits stayed mounted`}
                Icon={Boxes}
                ratio={pane.hitRatio}
              />
              <Stat
                title="Query cache hit rate"
                value={pct(query.hitRatio)}
                hint={`${query.total - query.miss} of ${query.total} reads served from cache`}
                Icon={Database}
                ratio={query.hitRatio}
              />
              <Stat
                title="Served fresh"
                value={pct(query.freshRatio)}
                hint="Painted with zero network round-trips"
                Icon={Snowflake}
                ratio={query.freshRatio}
              />
              <Stat
                title="Median data age"
                value={ms(query.medianAgeMs)}
                hint="How old cached data was when reused"
                Icon={RotateCcw}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section aria-labelledby="keepalive-modules">
                <h3 id="keepalive-modules" className="mb-2 text-sm font-medium">
                  Keep-alive by module
                </h3>
                {pane.byModule.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sub-module revisits yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {pane.byModule.map((m) => (
                      <li key={m.module} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{m.module}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {pct(m.hitRatio)} · {m.total} revisits
                          </span>
                        </div>
                        <Progress value={m.hitRatio * 100} className="h-1.5" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="query-scopes">
                <h3 id="query-scopes" className="mb-2 text-sm font-medium">
                  Busiest query scopes
                </h3>
                {query.topScopes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No query reads yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {query.topScopes.map((s) => (
                      <li key={s.scope} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate font-medium" title={s.scope}>
                            {s.scope}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {pct(s.hitRatio)} · {s.total} reads
                          </span>
                        </div>
                        <Progress value={s.hitRatio * 100} className="h-1.5" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <p className="text-xs text-muted-foreground">
              Query reads: {query.fresh} fresh · {query.stale} stale (revalidated) ·{" "}
              {query.miss} cold. Keep-alive misses: {pane.misses}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
