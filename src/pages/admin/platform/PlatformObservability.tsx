/**
 * Platform Console → Observability
 *
 * Real-time distributed tracing across the gateway and every service. The
 * gateway acts as the trace collector; this page tails it over SSE (falling
 * back to polling) and renders:
 *
 *  - golden signals for the selected time window (throughput, errors, latency)
 *  - per-service health with p95 latency and error rate
 *  - the live service dependency map derived from client spans
 *  - a searchable live trace feed, with a span waterfall per trace
 *
 * Every row is keyed by both the W3C trace id and the human-shareable
 * correlation id, so a support ticket can be traced end to end.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Gauge,
  Layers,
  Loader2,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  Server,
  Timer,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ModulePerfBenchmarks } from "@/components/admin/platform/ModulePerfBenchmarks";
import { CacheEffectivenessPanel } from "@/components/admin/platform/CacheEffectivenessPanel";
import {
  fetchTraceDetail,
  fetchTraceStats,
  useTraceFeed,
  type TraceSpan,
  type TraceSummary,
} from "@/hooks/useTraceFeed";

const WINDOWS = [
  { label: "Last 5 minutes", value: String(5 * 60_000) },
  { label: "Last 15 minutes", value: String(15 * 60_000) },
  { label: "Last hour", value: String(60 * 60_000) },
];

const KIND_STYLES: Record<string, string> = {
  server: "bg-primary/10 text-primary border-primary/30",
  client: "bg-accent/10 text-accent-foreground border-accent/30",
  producer: "bg-secondary text-secondary-foreground border-border",
  consumer: "bg-secondary text-secondary-foreground border-border",
  internal: "bg-muted text-muted-foreground border-border",
};

function ms(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(value >= 0.01 ? 1 : 2)}%`;
}

function relative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

function copy(value: string, label: string) {
  void navigator.clipboard?.writeText(value);
  toast({ title: `${label} copied`, description: value });
}

/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  hint,
  Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint: string;
  Icon: typeof Activity;
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", tone === "danger" ? "text-destructive" : "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-semibold", tone === "danger" && "text-destructive")}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SpanWaterfall({ traceId }: { traceId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trace-detail", traceId],
    queryFn: () => fetchTraceDetail(traceId),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        This trace is no longer in the collector buffer. Traces are retained in memory for live debugging only.
      </p>
    );
  }

  const start = data.startTime;
  const total = Math.max(data.durationMs, 1);
  const depth = new Map<string, number>();
  const ordered = [...data.spans].sort((a, b) => a.startTime - b.startTime);
  for (const span of ordered) {
    const parentDepth = span.parentSpanId != null ? depth.get(span.parentSpanId) : undefined;
    depth.set(span.spanId, parentDepth === undefined ? 0 : parentDepth + 1);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-medium">{ms(data.durationMs)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Spans</p>
          <p className="font-medium">{data.spanCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Services</p>
          <p className="font-medium">{data.services.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Errors</p>
          <p className={cn("font-medium", data.errorCount > 0 && "text-destructive")}>{data.errorCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => copy(data.traceId, "Trace ID")}>
          <Copy className="mr-2 h-3.5 w-3.5" /> {data.traceId.slice(0, 16)}…
        </Button>
        <Button variant="outline" size="sm" onClick={() => copy(data.correlationId, "Correlation ID")}>
          <Copy className="mr-2 h-3.5 w-3.5" /> {data.correlationId}
        </Button>
        {data.tenantId && <Badge variant="secondary">tenant {data.tenantId.slice(0, 8)}</Badge>}
      </div>

      <div className="space-y-1.5">
        {ordered.map((span: TraceSpan) => {
          const offset = ((span.startTime - start) / total) * 100;
          const width = Math.max((span.durationMs / total) * 100, 0.75);
          return (
            <div key={span.spanId} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="font-medium text-foreground"
                  style={{ paddingLeft: `${(depth.get(span.spanId) ?? 0) * 12}px` }}
                >
                  {span.name}
                </span>
                <Badge variant="outline" className={cn("text-[10px]", KIND_STYLES[span.kind])}>
                  {span.kind}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {span.service}
                </Badge>
                {span.status === "error" && (
                  <Badge variant="destructive" className="text-[10px]">
                    error
                  </Badge>
                )}
                <span className="ml-auto tabular-nums text-muted-foreground">{ms(span.durationMs)}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    span.status === "error" ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ marginLeft: `${Math.min(offset, 99)}%`, width: `${Math.min(width, 100 - Math.min(offset, 99))}%` }}
                />
              </div>
              {span.statusMessage && (
                <p className="mt-1.5 text-xs text-destructive">{span.statusMessage}</p>
              )}
              {Object.keys(span.attributes ?? {}).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(span.attributes).map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {key}={String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function PlatformObservability() {
  const [windowMs, setWindowMs] = useState(WINDOWS[0].value);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [selected, setSelected] = useState<TraceSummary | null>(null);
  const [, forceTick] = useState(0);

  const { traces, status, error, refresh } = useTraceFeed({ paused });

  // Keeps the "x seconds ago" column honest without refetching.
  useEffect(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const stats = useQuery({
    queryKey: ["trace-stats", windowMs],
    queryFn: () => fetchTraceStats(Number(windowMs)),
    refetchInterval: paused ? false : 5000,
    retry: false,
  });

  const services = useMemo(() => {
    const set = new Set<string>();
    traces.forEach((t) => t.services.forEach((s) => set.add(s)));
    stats.data?.services.forEach((s) => set.add(s.service));
    return Array.from(set).sort();
  }, [traces, stats.data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return traces.filter((t) => {
      if (errorsOnly && t.status !== "error") return false;
      if (serviceFilter !== "all" && !t.services.includes(serviceFilter)) return false;
      if (!q) return true;
      return (
        t.rootName.toLowerCase().includes(q) ||
        t.traceId.includes(q) ||
        t.correlationId.toLowerCase().includes(q) ||
        (t.tenantId ?? "").includes(q)
      );
    });
  }, [traces, search, serviceFilter, errorsOnly]);

  const feedBadge = {
    streaming: { label: "Live", className: "bg-primary/10 text-primary border-primary/30", Icon: RadioTower },
    polling: { label: "Polling", className: "bg-muted text-muted-foreground border-border", Icon: RefreshCw },
    connecting: { label: "Connecting", className: "bg-muted text-muted-foreground border-border", Icon: Loader2 },
    offline: { label: "Collector offline", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: WifiOff },
  }[status];

  const totals = stats.data?.totals;
  const latency = stats.data?.latency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Observability</h2>
          <p className="text-sm text-muted-foreground">
            Distributed traces stitched across the gateway and every service via W3C trace context and correlation IDs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("gap-1.5", feedBadge.className)}>
            <feedBadge.Icon className={cn("h-3.5 w-3.5", status === "connecting" && "animate-spin")} />
            {feedBadge.label}
          </Badge>
          <Select value={windowMs} onValueChange={setWindowMs}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
              void stats.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {status === "offline" && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="text-sm">
              <p className="font-medium">Trace collector unreachable</p>
              <p className="text-muted-foreground">
                {error ?? "The API gateway is not responding."} Tracing is emitted by the gateway and every service;
                start the mesh (or point <code className="text-xs">VITE_API_URL</code> at it) to see live traces.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Traces"
          value={totals ? String(totals.traces) : "—"}
          hint={`${totals?.spans ?? 0} spans in window`}
          Icon={Layers}
        />
        <StatCard
          title="Error rate"
          value={totals ? pct(totals.errorRate) : "—"}
          hint={`${totals?.errors ?? 0} failed spans`}
          Icon={AlertTriangle}
          tone={totals && totals.errorRate > 0.01 ? "danger" : "default"}
        />
        <StatCard
          title="p95 latency"
          value={latency ? ms(latency.p95) : "—"}
          hint={`p50 ${latency ? ms(latency.p50) : "—"} · p99 ${latency ? ms(latency.p99) : "—"}`}
          Icon={Timer}
        />
        <StatCard
          title="Services reporting"
          value={String(stats.data?.services.length ?? 0)}
          hint="Emitting spans in this window"
          Icon={Server}
        />
      </div>

      <ModulePerfBenchmarks windowMs={Number(windowMs)} paused={paused} />

      <CacheEffectivenessPanel windowMs={Number(windowMs)} paused={paused} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" /> Service health
            </CardTitle>
            <CardDescription>Latency and error rate per service, derived from live spans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats.data?.services ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No spans reported yet.</p>
            )}
            {(stats.data?.services ?? []).map((s) => (
              <div key={s.service} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.service}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.spans} spans · avg {ms(s.avgMs)}
                  </p>
                </div>
                <Badge variant="outline" className="tabular-nums">
                  p95 {ms(s.p95Ms)}
                </Badge>
                <Badge
                  variant={s.errors > 0 ? "destructive" : "secondary"}
                  className="tabular-nums"
                >
                  {s.errors > 0 ? pct(s.errorRate) : "healthy"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-4 w-4" /> Dependency map
            </CardTitle>
            <CardDescription>Observed service-to-service calls in this window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats.data?.dependencies ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No cross-service calls observed yet.</p>
            )}
            {(stats.data?.dependencies ?? []).map((d) => (
              <div
                key={`${d.from}->${d.to}`}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{d.from}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{d.to}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {d.calls} calls · avg {ms(d.avgMs)}
                </span>
                {d.errors > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {d.errors} err
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> Live traces
              </CardTitle>
              <CardDescription>
                {visible.length} of {traces.length} traces{paused ? " (feed paused)" : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Trace ID, correlation ID, route…"
                  className="w-64 pl-8"
                />
              </div>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={errorsOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setErrorsOnly((v) => !v)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" /> Errors only
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px] pr-3">
            {visible.length === 0 ? (
              <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-center">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No traces yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Traces appear the moment a request flows through the gateway. Every request carries a correlation ID
                  you can search here.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {visible.map((t) => (
                  <button
                    key={t.traceId}
                    onClick={() => setSelected(t)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                      "border-border hover:bg-muted/60",
                      t.status === "error" && "border-destructive/40",
                    )}
                  >
                    {t.status === "error" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.rootName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.correlationId} · {t.services.join(" → ")}
                      </p>
                    </div>
                    {typeof t.httpStatus === "number" && (
                      <Badge variant={t.httpStatus >= 500 ? "destructive" : "secondary"} className="tabular-nums">
                        {t.httpStatus}
                      </Badge>
                    )}
                    <Badge variant="outline" className="tabular-nums">
                      {t.spanCount} spans
                    </Badge>
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {ms(t.durationMs)}
                    </span>
                    <span className="w-20 text-right text-xs text-muted-foreground">{relative(t.startTime)}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="truncate">{selected?.rootName}</SheetTitle>
            <SheetDescription>
              Span waterfall across {selected?.services.join(", ")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">{selected && <SpanWaterfall traceId={selected.traceId} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
