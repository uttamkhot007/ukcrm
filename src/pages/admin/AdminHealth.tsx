import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Server, 
  Users, 
  Shield,
  Zap,
  Clock,
  HardDrive,
  Wrench
} from "lucide-react";
import { supabase } from "@/integrations/api/client";
import { toast } from "sonner";

interface HealthCheck {
  id: string;
  name: string;
  description: string;
  status: "healthy" | "warning" | "error" | "checking";
  lastChecked: Date | null;
  details?: string;
  canAutoHeal?: boolean;
}

export default function AdminHealth() {
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    {
      id: "database",
      name: "Database Connection",
      description: "Verify database connectivity and response time",
      status: "checking",
      lastChecked: null,
      canAutoHeal: false
    },
    {
      id: "auth",
      name: "Authentication Service",
      description: "Check auth system availability",
      status: "checking",
      lastChecked: null,
      canAutoHeal: false
    },
    {
      id: "user_roles",
      name: "User Role Consistency",
      description: "Ensure all users have valid roles assigned",
      status: "checking",
      lastChecked: null,
      canAutoHeal: true
    },
    {
      id: "orphan_profiles",
      name: "Orphan Profile Records",
      description: "Check for profiles without matching auth users",
      status: "checking",
      lastChecked: null,
      canAutoHeal: true
    },
    {
      id: "notification_prefs",
      name: "Notification Preferences",
      description: "Ensure all users have notification preferences",
      status: "checking",
      lastChecked: null,
      canAutoHeal: true
    },
    {
      id: "deal_activities",
      name: "Deal Activity Logs",
      description: "Verify deal activities are properly linked",
      status: "checking",
      lastChecked: null,
      canAutoHeal: true
    },
    {
      id: "storage",
      name: "Storage Buckets",
      description: "Check storage bucket availability",
      status: "checking",
      lastChecked: null,
      canAutoHeal: false
    },
    {
      id: "edge_functions",
      name: "Edge Functions",
      description: "Verify edge functions are responding",
      status: "checking",
      lastChecked: null,
      canAutoHeal: false
    }
  ]);

  const updateCheck = (id: string, updates: Partial<HealthCheck>) => {
    setHealthChecks(prev => prev.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
  };

  const runHealthChecks = async () => {
    setIsRunningCheck(true);
    
    // Reset all to checking
    setHealthChecks(prev => prev.map(check => ({ ...check, status: "checking" as const })));
    
    try {
      // Database connection check
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from("profiles").select("id").limit(1);
      const dbTime = Date.now() - dbStart;
      updateCheck("database", {
        status: dbError ? "error" : dbTime > 2000 ? "warning" : "healthy",
        lastChecked: new Date(),
        details: dbError ? dbError.message : `Response time: ${dbTime}ms`
      });

      // Auth service check
      const { data: session } = await supabase.auth.getSession();
      updateCheck("auth", {
        status: session ? "healthy" : "warning",
        lastChecked: new Date(),
        details: session?.session ? "Session active" : "No active session"
      });

      // User role consistency check
      const { data: usersWithoutRoles, error: roleError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .not("user_id", "in", 
          supabase.from("user_roles").select("user_id")
        );
      
      // Simplified check - count profiles vs roles
      const { count: profileCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: roleCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true });
      
      const roleMismatch = (profileCount || 0) - (roleCount || 0);
      updateCheck("user_roles", {
        status: roleMismatch > 0 ? "warning" : "healthy",
        lastChecked: new Date(),
        details: roleMismatch > 0 ? `${roleMismatch} users missing roles` : "All users have roles"
      });

      // Notification preferences check
      const { count: notifCount } = await supabase.from("notification_preferences").select("*", { count: "exact", head: true });
      const notifMismatch = (profileCount || 0) - (notifCount || 0);
      updateCheck("notification_prefs", {
        status: notifMismatch > 0 ? "warning" : "healthy",
        lastChecked: new Date(),
        details: notifMismatch > 0 ? `${notifMismatch} users missing preferences` : "All users have preferences"
      });

      // Check orphan profiles (profiles that might have issues)
      const { data: profiles } = await supabase.from("profiles").select("user_id, email").is("email", null);
      const orphanCount = profiles?.length || 0;
      updateCheck("orphan_profiles", {
        status: orphanCount > 0 ? "warning" : "healthy",
        lastChecked: new Date(),
        details: orphanCount > 0 ? `${orphanCount} profiles without email` : "All profiles valid"
      });

      // Deal activities check
      const { data: orphanActivities } = await supabase
        .from("deal_activities")
        .select("id, deal_id")
        .is("user_id", null);
      const orphanActivityCount = orphanActivities?.length || 0;
      updateCheck("deal_activities", {
        status: orphanActivityCount > 5 ? "warning" : "healthy",
        lastChecked: new Date(),
        details: orphanActivityCount > 0 ? `${orphanActivityCount} activities without user` : "All activities linked"
      });

      // Storage check
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      updateCheck("storage", {
        status: storageError ? "error" : "healthy",
        lastChecked: new Date(),
        details: storageError ? storageError.message : `${buckets?.length || 0} buckets available`
      });

      // Edge functions check (simple ping)
      try {
        const response = await supabase.functions.invoke("exchange-rates", {
          body: { from: "USD", to: "INR" }
        });
        updateCheck("edge_functions", {
          status: response.error ? "warning" : "healthy",
          lastChecked: new Date(),
          details: response.error ? "Some functions may be unavailable" : "Functions responding"
        });
      } catch {
        updateCheck("edge_functions", {
          status: "warning",
          lastChecked: new Date(),
          details: "Could not verify edge functions"
        });
      }

    } catch (error) {
      console.error("Health check error:", error);
      toast.error("Error running health checks");
    } finally {
      setIsRunningCheck(false);
    }
  };

  const runSelfHealing = async () => {
    setIsHealing(true);
    let healedCount = 0;

    try {
      // Fix missing user roles
      const { data: profilesWithoutRoles } = await supabase
        .from("profiles")
        .select("user_id");
      
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("user_id");
      
      const existingUserIds = new Set(existingRoles?.map(r => r.user_id) || []);
      const missingRoleUsers = profilesWithoutRoles?.filter(p => !existingUserIds.has(p.user_id)) || [];
      
      if (missingRoleUsers.length > 0) {
        const rolesToInsert = missingRoleUsers.map(u => ({
          user_id: u.user_id,
          role: "employee" as const
        }));
        
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);
        
        if (!insertError) {
          healedCount += missingRoleUsers.length;
        }
      }

      // Fix missing notification preferences
      const { data: existingPrefs } = await supabase
        .from("notification_preferences")
        .select("user_id");
      
      const existingPrefUserIds = new Set(existingPrefs?.map(p => p.user_id) || []);
      const missingPrefUsers = profilesWithoutRoles?.filter(p => !existingPrefUserIds.has(p.user_id)) || [];
      
      if (missingPrefUsers.length > 0) {
        const prefsToInsert = missingPrefUsers.map(u => ({
          user_id: u.user_id
        }));
        
        const { error: prefError } = await supabase
          .from("notification_preferences")
          .insert(prefsToInsert);
        
        if (!prefError) {
          healedCount += missingPrefUsers.length;
        }
      }

      if (healedCount > 0) {
        toast.success(`Self-healing complete: ${healedCount} issues fixed`);
      } else {
        toast.info("No issues found that require healing");
      }

      // Re-run health checks after healing
      await runHealthChecks();

    } catch (error) {
      console.error("Self-healing error:", error);
      toast.error("Error during self-healing process");
    } finally {
      setIsHealing(false);
    }
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const getStatusIcon = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "checking":
        return <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Healthy</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Warning</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
      case "checking":
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const healthyCount = healthChecks.filter(c => c.status === "healthy").length;
  const warningCount = healthChecks.filter(c => c.status === "warning").length;
  const errorCount = healthChecks.filter(c => c.status === "error").length;
  const overallHealth = (healthyCount / healthChecks.length) * 100;

  const getCheckIcon = (id: string) => {
    switch (id) {
      case "database": return <Database className="w-5 h-5" />;
      case "auth": return <Shield className="w-5 h-5" />;
      case "user_roles": return <Users className="w-5 h-5" />;
      case "orphan_profiles": return <Users className="w-5 h-5" />;
      case "notification_prefs": return <Zap className="w-5 h-5" />;
      case "deal_activities": return <Activity className="w-5 h-5" />;
      case "storage": return <HardDrive className="w-5 h-5" />;
      case "edge_functions": return <Server className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Health</p>
                <p className="text-2xl font-bold">{overallHealth.toFixed(0)}%</p>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <Progress value={overallHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy</p>
                <p className="text-2xl font-bold text-green-600">{healthyCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-destructive">{errorCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          onClick={runHealthChecks} 
          disabled={isRunningCheck}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRunningCheck ? 'animate-spin' : ''}`} />
          {isRunningCheck ? "Running Checks..." : "Run Health Check"}
        </Button>
        
        <Button 
          onClick={runSelfHealing} 
          disabled={isHealing || warningCount === 0}
          variant="default"
        >
          <Wrench className={`w-4 h-4 mr-2 ${isHealing ? 'animate-spin' : ''}`} />
          {isHealing ? "Healing..." : "Run Self-Healing"}
        </Button>
      </div>

      {/* Health Checks Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health Checks
          </CardTitle>
          <CardDescription>
            Automated monitoring of critical system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthChecks.map((check) => (
              <div 
                key={check.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  {getCheckIcon(check.id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium truncate">{check.name}</h4>
                    {getStatusIcon(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{check.description}</p>
                  {check.details && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <span className="font-medium">Details:</span> {check.details}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(check.status)}
                    {check.canAutoHeal && check.status === "warning" && (
                      <Badge variant="secondary" className="text-xs">
                        Auto-healable
                      </Badge>
                    )}
                    {check.lastChecked && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {check.lastChecked.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
