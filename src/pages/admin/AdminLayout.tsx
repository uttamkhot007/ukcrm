import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
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
    if (path.includes("/admin/users")) return "admin-center-users";
    if (path.includes("/admin/integrations")) return "admin-center-integrations";
    if (path.includes("/admin/documentation")) return "admin-center-documentation";
    if (path.includes("/admin/portal")) return "admin-center-portal";
    if (path.includes("/admin/health")) return "admin-center-health";
    if (path.includes("/admin/tenants")) return "super-admin-tenants";
    return "admin-center";
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={getActiveModule()} onModuleChange={() => {}} />
      
      <div className={cn("transition-all duration-300 ml-64")}>
        <Header onAIToggle={() => {}} />
        
        <main className="p-6 overflow-auto min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}