import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

export default function AdminLayout() {
  const { user, isLoading, role } = useAuth();
  const { isSuperAdmin, isLoading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if this is a super-admin-only route
  const isSuperAdminRoute = location.pathname.includes("/admin/tenants");

  // Map route to module id for sidebar highlighting
  const getActiveModule = () => {
    const path = location.pathname;
    if (path.includes("/admin/organization")) return "admin-center-organization";
    if (path.includes("/admin/whitelabel")) return "admin-center-whitelabel";
    if (path.includes("/admin/users")) return "admin-center-users";
    if (path.includes("/admin/integrations")) return "admin-center-integrations";
    if (path.includes("/admin/documentation")) return "admin-center-documentation";
    if (path.includes("/admin/portal")) return "admin-center-portal";
    if (path.includes("/admin/health")) return "admin-center-health";
    if (path.includes("/admin/tenants")) return "super-admin-tenants";
    if (path.includes("/admin/alliance")) return "admin-center-alliance";
    if (path.includes("/admin/offerings")) return "admin-center-offerings";
    if (path.includes("/admin/procurement")) return "admin-center-procurement";
    if (path.includes("/admin/support-management")) return "admin-center-support-management";
    return "admin-center";
  };

  const [activeModule, setActiveModule] = useState(getActiveModule());

  useEffect(() => {
    setActiveModule(getActiveModule());
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && !tenantLoading && user) {
      // Super admin routes require super admin status
      if (isSuperAdminRoute && !isSuperAdmin) {
        navigate("/");
        return;
      }
      // Regular admin routes require admin role (or super admin)
      if (!isSuperAdminRoute && role !== "admin" && !isSuperAdmin) {
        navigate("/");
      }
    }
  }, [user, isLoading, tenantLoading, role, isSuperAdmin, isSuperAdminRoute, navigate]);

  if (isLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow access if: super admin OR (admin role AND not super admin route)
  const hasAccess = isSuperAdmin || (role === "admin" && !isSuperAdminRoute);

  if (!user || !hasAccess) {
    return null;
  }

  const handleModuleChange = (module: string) => {
    setActiveModule(module);
    // Navigate to the appropriate route based on module
    if (module === "dashboard") {
      navigate("/");
    } else if (module.startsWith("admin-center-")) {
      const subPath = module.replace("admin-center-", "");
      navigate(`/admin/${subPath}`);
    } else if (module === "super-admin-tenants") {
      navigate("/admin/tenants");
    }
  };

  return (
    <MainLayout activeModule={activeModule} onModuleChange={handleModuleChange}>
      <div className="p-6 overflow-auto min-h-[calc(100vh-4rem)] relative">
        <Outlet />
      </div>
    </MainLayout>
  );
}
