import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getRecentRedirects } from "@/lib/redirect-loop-guard";

interface AuthDiagnosticsPanelProps {
  /** Hide the panel entirely until user opens it. */
  defaultOpen?: boolean;
  /** Floating in the corner vs inline. */
  floating?: boolean;
}

/**
 * In-app auth diagnostics. Shows which step in the auth pipeline failed
 * (login → session → profile → role → teams → console_access → redirect)
 * WITHOUT exposing tokens or sensitive payloads.
 */
export function AuthDiagnosticsPanel({
  defaultOpen = false,
  floating = true,
}: AuthDiagnosticsPanelProps) {
  const {
    diagnostics,
    user,
    profile,
    role,
    teams,
    isSuperAdmin,
    portalMode,
    getRedirectPath,
  } = useAuth();
  const [open, setOpen] = useState(defaultOpen);

  const failed = diagnostics.find((s) => s.status === "error");
  const allOk = diagnostics.every(
    (s) => s.status === "ok" || s.status === "skipped" || s.status === "idle"
  );

  const headerColor = failed
    ? "text-destructive"
    : allOk
    ? "text-emerald-500"
    : "text-primary";

  const containerCls = floating
    ? "fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-card/95 backdrop-blur shadow-2xl"
    : "rounded-2xl border bg-card shadow-sm w-full";

  const copySafeReport = () => {
    const safe = {
      timestamp: new Date().toISOString(),
      user_present: !!user,
      user_id: user?.id ?? null,
      profile_loaded: !!profile,
      role,
      is_super_admin: isSuperAdmin,
      teams,
      portal_mode: portalMode,
      target_redirect: getRedirectPath(),
      steps: diagnostics.map((s) => ({
        step: s.key,
        status: s.status,
        message: s.message,
        duration_ms: s.durationMs,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(safe, null, 2));
    toast({
      title: "Copied",
      description: "Diagnostics report copied (no tokens included).",
    });
  };

  return (
    <div className={containerCls}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 rounded-t-2xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${headerColor}`} />
          <span className="font-semibold text-sm">Auth Diagnostics</span>
          {failed ? (
            <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
              failed at {failed.key}
            </Badge>
          ) : allOk && user ? (
            <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 text-[10px] py-0 px-1.5">
              healthy
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {user ? "running" : "no session"}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <ol className="space-y-2">
            {diagnostics.map((s) => (
              <li
                key={s.key}
                className="flex items-start gap-2 text-xs leading-relaxed"
              >
                <StatusIcon status={s.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.label}</span>
                    {typeof s.durationMs === "number" && (
                      <span className="text-muted-foreground tabular-nums">
                        {s.durationMs}ms
                      </span>
                    )}
                  </div>
                  {s.message && (
                    <p
                      className={`truncate ${
                        s.status === "error"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                      title={s.message}
                    >
                      {s.message}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground space-y-0.5">
            <div>
              <span className="font-semibold text-foreground">Role:</span>{" "}
              {role ?? "—"}
              {isSuperAdmin && " (super)"}
            </div>
            <div>
              <span className="font-semibold text-foreground">Portal:</span>{" "}
              {portalMode}
            </div>
            <div>
              <span className="font-semibold text-foreground">
                Expected redirect:
              </span>{" "}
              <code className="text-primary">{getRedirectPath()}</code>
            </div>
          </div>

          {(() => {
            const recents = getRecentRedirects(5);
            if (recents.length === 0) return null;
            return (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] font-mono">
                <div className="text-[11px] font-sans font-semibold text-amber-600 dark:text-amber-300 mb-1">
                  Recent redirects (last 10s)
                </div>
                <ul className="space-y-0.5 text-muted-foreground">
                  {recents.map((r, i) => (
                    <li
                      key={i}
                      className="truncate"
                      title={`${r.from} → ${r.to}`}
                    >
                      {r.from} → <span className="text-foreground">{r.to}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={copySafeReport}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Copy safe report (no tokens)
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />;
    case "error":
      return <XCircle className="w-4 h-4 text-destructive mt-0.5" />;
    case "pending":
      return (
        <Loader2 className="w-4 h-4 text-primary mt-0.5 animate-spin" />
      );
    case "skipped":
      return <MinusCircle className="w-4 h-4 text-muted-foreground mt-0.5" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground/50 mt-0.5" />;
  }
}
