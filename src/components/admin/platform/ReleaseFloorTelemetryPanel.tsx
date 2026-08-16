/**
 * Observability → Release floor.
 *
 * Every time a browser was stopped from running (or accepting) a bundle older
 * than one it has already seen, the client writes a `release_floor_blocks` row.
 * This panel tails that stream platform-wide and also shows the local log of
 * this browser session, which survives the forced reload that follows a block.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownToLine, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  clearReleaseFloorLog,
  getReleaseFloorLog,
  getTelemetrySessionId,
  subscribeReleaseFloorEvents,
  type ReleaseFloorEvent,
} from "@/lib/release-floor-telemetry";

type BlockRow = {
  id: string;
  occurred_at: string;
  session_id: string;
  user_id: string | null;
  event_kind: string;
  trigger: string | null;
  running_release_id: string;
  floor_release_id: string | null;
  served_release_id: string | null;
  reason: string | null;
  action: string | null;
  page_url: string | null;
};

const KIND_LABEL: Record<string, string> = {
  boot_blocked: "Old bundle blocked at boot",
  served_blocked: "Server served an old bundle",
  downgrade_prevented: "Downgrade prevented",
  floor_raised: "Release floor raised",
};

function kindTone(kind: string): string {
  if (kind === "floor_raised") return "bg-muted text-muted-foreground border-border";
  if (kind === "downgrade_prevented") return "bg-accent/10 text-accent-foreground border-accent/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function shortRelease(value: string | null): string {
  if (!value) return "—";
  return value.length > 42 ? `${value.slice(0, 39)}…` : value;
}

function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function Row({
  kind,
  occurredAt,
  trigger,
  running,
  floor,
  served,
  reason,
  action,
  session,
  user,
  page,
}: {
  kind: string;
  occurredAt: string;
  trigger: string | null;
  running: string;
  floor: string | null;
  served: string | null;
  reason: string | null;
  action: string | null;
  session: string;
  user?: string | null;
  page: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("border", kindTone(kind))}>
          {KIND_LABEL[kind] ?? kind}
        </Badge>
        {trigger ? <Badge variant="outline">{trigger}</Badge> : null}
        {action ? <Badge variant="secondary">{action}</Badge> : null}
        <span className="ml-auto text-xs text-muted-foreground">{when(occurredAt)}</span>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Running</dt>
          <dd className="font-mono">{shortRelease(running)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Floor</dt>
          <dd className="font-mono">{shortRelease(floor)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Served</dt>
          <dd className="font-mono">{shortRelease(served)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Session</dt>
          <dd className="font-mono">{shortRelease(session)}</dd>
        </div>
        {user ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">User</dt>
            <dd className="font-mono">{shortRelease(user)}</dd>
          </div>
        ) : null}
        {page ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Page</dt>
            <dd className="font-mono">{page}</dd>
          </div>
        ) : null}
      </dl>
      {reason ? <p className="mt-2 text-xs text-muted-foreground">{reason}</p> : null}
    </div>
  );
}

export function ReleaseFloorTelemetryPanel({ paused = false }: { paused?: boolean }) {
  const [local, setLocal] = useState<ReleaseFloorEvent[]>([]);

  useEffect(() => {
    const sync = () => setLocal(getReleaseFloorLog());
    sync();
    return subscribeReleaseFloorEvents(sync);
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["release-floor-blocks"],
    refetchInterval: paused ? false : 60_000,
    queryFn: async (): Promise<BlockRow[]> => {
      const { data, error } = await supabase
        .from("release_floor_blocks")
        .select(
          "id,occurred_at,session_id,user_id,event_kind,trigger,running_release_id,floor_release_id,served_release_id,reason,action,page_url",
        )
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as BlockRow[];
    },
  });

  const rows = data ?? [];
  const blocks = rows.filter((row) => row.event_kind !== "floor_raised");
  const sessions = new Set(blocks.map((row) => row.session_id)).size;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
            Release floor blocks
          </CardTitle>
          <CardDescription>
            Every time an outdated bundle was refused, with the release IDs and the browser session
            it happened in. Sessions are anonymous ids — no tokens are recorded.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh release floor telemetry"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Blocks recorded</p>
            <p className="text-2xl font-semibold">{blocks.length}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Affected sessions</p>
            <p className="text-2xl font-semibold">{sessions}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">This session</p>
            <p className="truncate font-mono text-xs">{getTelemetrySessionId()}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            No outdated bundle has been blocked yet.
          </div>
        ) : (
          <ScrollArea className="h-[340px] pr-3">
            <div className="space-y-2">
              {rows.map((row) => (
                <Row
                  key={row.id}
                  kind={row.event_kind}
                  occurredAt={row.occurred_at}
                  trigger={row.trigger}
                  running={row.running_release_id}
                  floor={row.floor_release_id}
                  served={row.served_release_id}
                  reason={row.reason}
                  action={row.action}
                  session={row.session_id}
                  user={row.user_id}
                  page={row.page_url}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              This browser ({local.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearReleaseFloorLog();
                setLocal([]);
              }}
              disabled={local.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Clear local log
            </Button>
          </div>
          {local.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing blocked in this browser since the log was last cleared.
            </p>
          ) : (
            <div className="space-y-2">
              {local.slice(0, 10).map((event) => (
                <Row
                  key={event.id}
                  kind={event.eventKind}
                  occurredAt={event.occurredAt}
                  trigger={event.trigger}
                  running={event.runningReleaseId}
                  floor={event.floorReleaseId}
                  served={event.servedReleaseId}
                  reason={event.reason}
                  action={event.action}
                  session={event.sessionId}
                  page={event.pageUrl}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
