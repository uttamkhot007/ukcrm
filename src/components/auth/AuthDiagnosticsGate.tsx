import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthDiagnosticsPanel } from "./AuthDiagnosticsPanel";

/**
 * Globally mounts the diagnostics panel for users who should see it:
 *  - Super admins and admins (always — they need to triage tenant logins)
 *  - Anyone visiting with `?diag=1` in the URL (one-time debugging)
 *  - Anyone who failed at least one auth step (so the user can self-diagnose)
 *
 * Hidden on the /auth page because Auth.tsx already mounts the panel itself.
 */
export function AuthDiagnosticsGate() {
  const { isAdmin, isSuperAdmin, diagnostics, user } = useAuth();
  const location = useLocation();
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("diag") === "1") {
      setForced(true);
      sessionStorage.setItem("auth_diag_forced", "1");
    } else if (sessionStorage.getItem("auth_diag_forced") === "1") {
      setForced(true);
    }
  }, [location.search]);

  // Don't double-mount on the auth screen
  if (location.pathname.startsWith("/auth")) return null;

  const hasFailure = diagnostics.some((s) => s.status === "error");
  const shouldShow = forced || (user && (isAdmin || isSuperAdmin)) || hasFailure;

  if (!shouldShow) return null;

  return <AuthDiagnosticsPanel />;
}
