import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";
import { logRedirect, logNoRedirect } from "@/lib/route-diagnostics";
import { BuildStatusIndicator } from "@/components/system/BuildStatusIndicator";
import { StaleBuildBanner } from "@/components/system/StaleBuildBanner";
import { StaleBuildGuardProvider } from "@/contexts/StaleBuildGuardContext";



export default function AdminLayout() {
  const { user, isAuthResolved, isPlatformAdmin } = useAuth();
  const { isLoading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveModule = () => {
    const path = location.pathname;
    if (path.includes("/admin/platform/tenants")) return "platform-tenants";
    if (path.includes("/admin/platform/users")) return "platform-users";
    if (path.includes("/admin/platform/licenses")) return "platform-licenses";
    if (path.includes("/admin/platform/integrations")) return "platform-integrations";
    if (path.includes("/admin/platform/status")) return "platform-status";
    if (path.includes("/admin/organization")) return "admin-center-organization";
    if (path.includes("/admin/whitelabel")) return "admin-center-whitelabel";
    if (path.includes("/admin/users")) return "admin-center-users";
    if (path.includes("/admin/integrations")) return "admin-center-integrations";
    if (path.includes("/admin/documentation")) return "admin-center-documentation";
    if (path.includes("/admin/portal")) return "admin-center-portal";
    if (path.includes("/admin/health")) return "admin-center-health";
    if (path.includes("/admin/tenants")) return "platform-tenants";
    if (path.includes("/admin/alliance")) return "admin-center-alliance";
    if (path.includes("/admin/offerings")) return "admin-center-offerings";
    if (path.includes("/admin/procurement")) return "admin-center-procurement";
    if (path.includes("/admin/support-management")) return "admin-center-support-management";
    if (path.includes("/admin/authorized-domains")) return "admin-center-authorized-domains";
    return "admin-center";
  };

  const [activeModule, setActiveModule] = useState(getActiveModule());

  useEffect(() => {
    setActiveModule(getActiveModule());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Strict order: never decide where to send the user until auth + tenant
  // contexts are fully resolved. This is what stops the "bounce back to /
  // and re-render the tenant dashboard" loop.
  useEffect(() => {
    if (!isAuthResolved || tenantLoading) return;

    if (!user) {
      logRedirect("AdminLayout", location.pathname, "/auth", "no authenticated user");
      navigate("/auth", { replace: true });
      return;
    }

    if (!isPlatformAdmin) {
      console.info("[admin-guard] non-admin on %s → /", location.pathname);
      logRedirect("AdminLayout", location.pathname, "/", "user is not a platform admin");
      navigate("/", { replace: true });
      return;
    }

    logNoRedirect("AdminLayout", location.pathname, "admin shell allowed", { isPlatformAdmin: true });
  }, [user, isAuthResolved, tenantLoading, isPlatformAdmin, navigate, location.pathname]);

  if (!isAuthResolved || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isPlatformAdmin) {
    // While the redirect effect runs, render nothing (no tenant dashboard).
    return null;
  }

  const handleModuleChange = (module: string) => {
    setActiveModule(module);

    if (module.startsWith("admin-center-")) {
      navigate(`/admin/${module.replace("admin-center-", "")}`);
      return;
    }
    if (module === "super-admin-tenants" || module === "platform-tenants") {
      navigate("/admin/platform/tenants");
      return;
    }
    if (module.startsWith("platform-")) {
      navigate(`/admin/platform/${module.replace("platform-", "")}`);
      return;
    }

    // Any regular application module (sales, hr, finance, …) lives on "/".
    // Without this the admin shell kept rendering the platform page no matter
    // which module was clicked.
    navigate("/", { state: { module, fromAdminNavigation: true } });
  };


  return (
    <StaleBuildGuardProvider>
      <MainLayout activeModule={activeModule} onModuleChange={handleModuleChange}>
        <div className="p-6 overflow-auto min-h-[calc(100vh-4rem)] relative space-y-4">
          <StaleBuildBanner />
          <BuildStatusIndicator />
          <Outlet />
        </div>
      </MainLayout>
    </StaleBuildGuardProvider>
  );
}

