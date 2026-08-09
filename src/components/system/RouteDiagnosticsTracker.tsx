import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logRoute } from "@/lib/route-diagnostics";

/**
 * Records every rendered location into the diagnostics log.
 * Mounted once inside the router in App.tsx.
 */
export function RouteDiagnosticsTracker() {
  const location = useLocation();

  useEffect(() => {
    logRoute(location.pathname + location.search, {
      state: location.state ?? null,
      key: location.key,
    });
  }, [location.pathname, location.search, location.state, location.key]);

  return null;
}
