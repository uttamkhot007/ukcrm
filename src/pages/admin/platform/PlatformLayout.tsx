import { useEffect } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Crown, Building2, Users, KeyRound, Plug, Activity, Radar, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recordRedirect, shouldForceCleanup } from "@/lib/redirect-loop-guard";
import { forceFreshReload } from "@/lib/cache-cleanup";

const TABS = [
  { to: "/admin/platform/tenants", label: "Tenants", icon: Building2 },
  { to: "/admin/platform/users", label: "User Management", icon: Users },
  { to: "/admin/platform/licenses", label: "License Management", icon: KeyRound },
  { to: "/admin/platform/integrations", label: "Integrations", icon: Plug },
  { to: "/admin/platform/status", label: "System Status", icon: Activity },
  { to: "/admin/platform/observability", label: "Observability", icon: Radar },
];

export default function PlatformLayout() {
  const { user, isAuthResolved, isPlatformAdmin, isSuperAdmin } = useAuth();
  const { isLoading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthResolved && !user) navigate("/auth", { replace: true });
  }, [user, isAuthResolved, navigate]);

  // Redirect bare /admin/platform → tenants
  useEffect(() => {
    if (location.pathname === "/admin/platform" || location.pathname === "/admin/platform/") {
      const target = "/admin/platform/tenants";
      recordRedirect(location.pathname, target);
      if (shouldForceCleanup(location.pathname, target)) {
        console.warn("[redirect-loop-guard] Loop on PlatformLayout, halting redirect");
        return;
      }
      navigate(target, { replace: true });
    }
  }, [location.pathname, navigate]);

  if (!isAuthResolved || tenantLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Platform Console Restricted</CardTitle>
            <CardDescription>
              The Platform Console is reserved for administrators. It controls
              configuration that spans every tenant on this deployment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-platform-shell="1">
      {/* Platform banner — visually distinct from per-tenant pages */}
      <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/5 to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Platform Console</h1>
              <p className="text-sm text-muted-foreground">
                Operating across <span className="font-medium text-foreground">all tenants</span> · changes here are global
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-300">
              {isSuperAdmin ? "Super Admin" : "Admin"}
          </Badge>
        </div>
      </div>

      {/* Sub-nav tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
