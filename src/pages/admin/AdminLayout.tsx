import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Loader2, Settings, Building2, Users, Puzzle, BookOpen, Shield, Activity } from "lucide-react";
import { NavLink } from "react-router-dom";

const adminTabs = [
  { path: "/admin/organization", label: "Organization", icon: Building2 },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/integrations", label: "Integrations", icon: Puzzle },
  { path: "/admin/documentation", label: "Documentation", icon: BookOpen },
  { path: "/admin/portal", label: "Admin Portal", icon: Shield },
  { path: "/admin/health", label: "Platform Health", icon: Activity },
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
      <Header onAIToggle={() => {}} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Vertical Sidebar Navigation */}
        <aside className="w-64 border-r border-border bg-card/50 p-4 flex flex-col">
          {/* Admin Center Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Center</h1>
              <p className="text-xs text-muted-foreground">System settings</p>
            </div>
          </div>

          {/* Vertical Navigation */}
          <nav className="flex flex-col gap-1 flex-1">
            {adminTabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
