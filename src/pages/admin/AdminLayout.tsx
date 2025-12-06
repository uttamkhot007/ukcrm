import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Loader2, Settings, Building2, Users, Puzzle, BookOpen, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";

const adminTabs = [
  { path: "/admin/organization", label: "Organization", icon: Building2 },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/integrations", label: "Integrations", icon: Puzzle },
  { path: "/admin/documentation", label: "Documentation", icon: BookOpen },
  { path: "/admin/portal", label: "Admin Portal", icon: Shield },
];

export default function AdminLayout() {
  const { user, isLoading, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user && role !== "admin") {
      navigate("/");
    }
  }, [user, isLoading, role, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule="admin-center" onModuleChange={() => {}} />
      
      <div className={cn("transition-all duration-300 ml-64")}>
        <Header onAIToggle={() => {}} />
        
        <main className="min-h-[calc(100vh-4rem)] p-6">
          {/* Admin Center Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Center</h1>
              <p className="text-muted-foreground">Manage system settings, integrations, and configurations</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <nav className="flex gap-1">
              {adminTabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                return (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
