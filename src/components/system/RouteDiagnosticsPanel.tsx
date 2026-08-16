import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  MapPin,
  RefreshCw,
  Route as RouteIcon,
  ServerCog,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  clearDiagnostics,
  getDiagnostics,
  resolveDeploymentIdentity,
  subscribeDiagnostics,
  type DeploymentIdentity,
  type DiagnosticEntry,
} from "@/lib/route-diagnostics";
import { hardReloadLatestBuild } from "@/lib/cache-cleanup";
import { cn } from "@/lib/utils";
import {
  getReleaseCoherenceDiagnostics,
  subscribeReleaseCoherence,
  type ReleaseCoherenceDiagnostic,
} from "@/lib/build-cache-strategy";

function time(t: number) {
  return new Date(t).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const KIND_STYLES: Record<DiagnosticEntry["kind"], string> = {
  route: "border-sky-500/40 text-sky-600 dark:text-sky-300",
  redirect: "border-amber-500/40 text-amber-600 dark:text-amber-300",
  blocked: "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
  info: "border-border text-muted-foreground",
};

const KIND_LABEL: Record<DiagnosticEntry["kind"], string> = {
  route: "route",
  redirect: "redirect",
  blocked: "no-redirect",
  info: "info",
};

/**
 * Full diagnostics surface: active route, every redirect decision taken by the
 * route guards, and the deployment identity of the served HTML vs the running
 * bundle — enough to tell whether an "old view" is a routing decision or a
 * stale deployment.
 */
export function RouteDiagnosticsPanel() {
  const location = useLocation();
  const [entries, setEntries] = useState<DiagnosticEntry[]>(() => getDiagnostics());
  const [deployment, setDeployment] = useState<DeploymentIdentity | null>(null);
  const [checking, setChecking] = useState(false);
  const [coherence, setCoherence] = useState<ReleaseCoherenceDiagnostic[]>(
    () => getReleaseCoherenceDiagnostics(),
  );

  useEffect(() => subscribeDiagnostics(() => setEntries(getDiagnostics())), []);
  useEffect(
    () => subscribeReleaseCoherence(() => setCoherence(getReleaseCoherenceDiagnostics())),
    [],
  );

  const refreshDeployment = useCallback(async () => {
    setChecking(true);
    try {
      setDeployment(await resolveDeploymentIdentity());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshDeployment();
  }, [refreshDeployment]);

  const redirects = useMemo(() => entries.filter((e) => e.kind !== "route"), [entries]);
  const mismatch = deployment?.mismatch ?? false;

  const copyReport = async () => {
    const report = JSON.stringify({ route: location.pathname + location.search, deployment, coherence, entries }, null, 2);
    try {
      await navigator.clipboard.writeText(report);
      toast({ title: "Diagnostics copied", description: "Route + deployment report is on your clipboard." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ServerCog className="w-5 h-5 text-primary" aria-hidden="true" />
            Route &amp; Deployment Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground">
            Why this view rendered: active route, guard decisions, and the deployment being served.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyReport}>
            <Copy className="w-4 h-4 mr-1.5" aria-hidden="true" /> Copy report
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refreshDeployment()} disabled={checking}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", checking && "animate-spin")} aria-hidden="true" />
            Re-check
          </Button>
        </div>
      </div>

      {/* Active route */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" aria-hidden="true" /> Active route
          </CardTitle>
          <CardDescription>What React Router is rendering right now.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
          <div>
            <span className="text-muted-foreground">pathname </span>
            <span className="text-primary">{location.pathname}</span>
          </div>
          <div>
            <span className="text-muted-foreground">search </span>
            <span>{location.search || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">hash </span>
            <span>{location.hash || "—"}</span>
          </div>
          <div className="break-all">
            <span className="text-muted-foreground">state </span>
            <span>{location.state ? JSON.stringify(location.state) : "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Deployment identity */}
      <Card className={mismatch ? "border-destructive/40" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {mismatch ? (
              <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            )}
            Served deployment
          </CardTitle>
          <CardDescription>
            {mismatch
              ? "The HTML served by this origin was built from a different deployment than the JavaScript running in this tab — you are looking at a stale shell."
              : "The served HTML and the running bundle come from the same deployment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs font-mono">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 p-2 space-y-1">
              <div className="font-sans font-semibold text-[11px] text-muted-foreground">Running bundle</div>
              <div>id {deployment?.bundle.id ?? "…"}</div>
              <div>built {deployment?.bundle.buildTime ?? "…"}</div>
              <div>commit {deployment?.bundle.commit ?? "…"}</div>
              <div>version v{deployment?.bundle.version ?? "…"}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-2 space-y-1">
              <div className="font-sans font-semibold text-[11px] text-muted-foreground">Served HTML</div>
              <div>id {deployment?.served.id ?? "unknown"}</div>
              <div>built {deployment?.served.buildTime ?? "unknown"}</div>
              <div>commit {deployment?.served.commit ?? "unknown"}</div>
              <div>etag {deployment?.served.etag ?? "—"}</div>
            </div>
          </div>
          <div className="text-muted-foreground">
            document meta build-time: {deployment?.served.documentBuildTime ?? "—"} · origin{" "}
            {deployment?.origin ?? "—"}
            {deployment?.error ? ` · check failed: ${deployment.error}` : ""}
          </div>
          {mismatch && (
            <Button size="sm" variant="destructive" onClick={() => void hardReloadLatestBuild()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Hard reload latest build
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inactivity &amp; resume checks</CardTitle>
          <CardDescription>
            Release checks triggered after focus, connectivity, visibility, and browser back/forward cache restores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coherence.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resume checks recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-xs font-mono">
              {coherence.slice(0, 10).map((entry, index) => (
                <li key={`${entry.checkedAt}-${index}`} className="grid gap-1 rounded-lg border p-2 sm:grid-cols-[9rem_6rem_1fr]">
                  <span>{new Date(entry.checkedAt).toLocaleTimeString()}</span>
                  <span>{entry.trigger}{entry.bfcache ? " · BFCache" : ""}</span>
                  <span className={entry.decision === "reload" ? "text-destructive" : "text-muted-foreground"}>
                    {entry.decision} · served {entry.servedId ?? "unknown"}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Redirect decisions */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-primary" aria-hidden="true" /> Redirect decisions
            </CardTitle>
            <CardDescription>
              Every guard that navigated you — or explicitly chose not to — this session.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={clearDiagnostics}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Clear
          </Button>
        </CardHeader>
        <CardContent>
          {redirects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No redirect decisions recorded yet. Navigate to “/” and come back to capture them.
            </p>
          ) : (
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-2">
                {redirects.map((e) => (
                  <li key={e.id} className="rounded-lg border p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={KIND_STYLES[e.kind]}>
                        {KIND_LABEL[e.kind]}
                      </Badge>
                      <span className="font-semibold">{e.source}</span>
                      <span className="font-mono text-muted-foreground">
                        {e.from}
                        {e.to ? ` → ${e.to}` : ""}
                      </span>
                      <span className="ml-auto text-muted-foreground">{time(e.t)}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">{e.reason}</div>
                    {e.details && (
                      <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">
                        {JSON.stringify(e.details)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Route history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Route history</CardTitle>
          <CardDescription>Locations actually rendered, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs font-mono">
            {entries.filter((e) => e.kind === "route").slice(0, 15).map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <span className="text-muted-foreground">{time(e.t)}</span>
                <span className="text-primary">{e.from}</span>
              </li>
            ))}
            {entries.every((e) => e.kind !== "route") && (
              <li className="text-muted-foreground font-sans">No route changes recorded yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default RouteDiagnosticsPanel;
