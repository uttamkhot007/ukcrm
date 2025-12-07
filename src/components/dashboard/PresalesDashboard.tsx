import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Presentation, 
  Target, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Users,
  Calendar,
  BookOpen,
  BarChart3
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isAfter, isBefore, addDays } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";

interface PresalesDashboardProps {
  onNavigate: (module: string) => void;
  isManager?: boolean;
}

export function PresalesDashboard({ onNavigate, isManager = false }: PresalesDashboardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch presales opportunities
  const { data: opportunities = [] } = useQuery({
    queryKey: ["presales-opportunities", user?.id, currentTenant?.id, isManager],
    queryFn: async () => {
      let query = supabase
        .from("presales_opportunities")
        .select(`
          *,
          deals(id, title, value, stage)
        `)
        .order("created_at", { ascending: false });

      if (!isManager) {
        query = query.eq("presales_member_id", user?.id);
      }

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch demo schedules
  const { data: demos = [] } = useQuery({
    queryKey: ["presales-demos", user?.id, currentTenant?.id, isManager],
    queryFn: async () => {
      let query = supabase
        .from("demo_schedules")
        .select("*")
        .order("scheduled_date", { ascending: true });

      if (!isManager) {
        query = query.eq("presenter_id", user?.id);
      }

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch POC requests
  const { data: pocs = [] } = useQuery({
    queryKey: ["presales-pocs", user?.id, currentTenant?.id, isManager],
    queryFn: async () => {
      let query = supabase
        .from("poc_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isManager) {
        query = query.eq("assigned_to", user?.id);
      }

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch training sessions
  const { data: trainings = [] } = useQuery({
    queryKey: ["presales-trainings", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .or("target_team.eq.presales,target_team.eq.all")
        .gte("scheduled_date", new Date().toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate stats
  const activeOpportunities = opportunities.filter(o => o.status === "active");
  const completedOpportunities = opportunities.filter(o => o.status === "completed");
  const successfulOutcomes = completedOpportunities.filter(o => o.outcome === "success");
  const successRate = completedOpportunities.length > 0 
    ? (successfulOutcomes.length / completedOpportunities.length) * 100 
    : 0;

  const upcomingDemos = demos.filter(
    d => d.status === "scheduled" && isAfter(new Date(d.scheduled_date), new Date())
  );
  const completedDemos = demos.filter(d => d.status === "completed");
  const thisWeekDemos = upcomingDemos.filter(
    d => isBefore(new Date(d.scheduled_date), addDays(new Date(), 7))
  );

  const activePocs = pocs.filter(p => p.status === "in_progress");
  const completedPocs = pocs.filter(p => p.status === "completed");

  const totalOpportunityValue = activeOpportunities.reduce(
    (sum, o) => sum + (Number(o.deals?.value) || 0), 0
  );

  // Involvement breakdown
  const involvementStats = {
    solution_design: opportunities.filter(o => o.involvement_type === "solution_design").length,
    demo: opportunities.filter(o => o.involvement_type === "demo").length,
    poc: opportunities.filter(o => o.involvement_type === "poc").length,
    technical_assessment: opportunities.filter(o => o.involvement_type === "technical_assessment").length,
    rfp_response: opportunities.filter(o => o.involvement_type === "rfp_response").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Opportunities</p>
                <p className="text-2xl font-bold">{activeOpportunities.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalOpportunityValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Demos</p>
                <p className="text-2xl font-bold">{upcomingDemos.length}</p>
                <p className="text-xs text-muted-foreground">{thisWeekDemos.length} this week</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Presentation className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active POCs</p>
                <p className="text-2xl font-bold">{activePocs.length}</p>
                <p className="text-xs text-muted-foreground">{completedPocs.length} completed</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{successfulOutcomes.length} successful</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Involvement Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Involvement Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(involvementStats).map(([type, count]) => (
              <div key={type} className="p-4 rounded-lg bg-accent/50 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {type.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Demos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Presentation className="h-5 w-5 text-purple-500" />
              Upcoming Demos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {upcomingDemos.slice(0, 5).map((demo) => (
                <div
                  key={demo.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <p className="font-medium text-sm truncate">{demo.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(demo.scheduled_date), "MMM d, h:mm a")}
                    </span>
                    <Badge variant="outline">{demo.demo_type}</Badge>
                  </div>
                </div>
              ))}
              {upcomingDemos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming demos
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active POCs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Active POCs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {activePocs.slice(0, 5).map((poc) => (
                <div
                  key={poc.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <p className="font-medium text-sm truncate">{poc.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      Started {format(new Date(poc.created_at), "MMM d")}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={poc.status === "in_progress" ? "text-orange-600" : ""}
                    >
                      {poc.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
              {activePocs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active POCs
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <TeamRemindersWidget />
      </div>

      {/* Training Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-500" />
            Upcoming Training Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map((training) => (
              <div
                key={training.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{training.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {training.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {training.training_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(training.scheduled_date), "MMM d, h:mm a")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {training.duration_minutes} min
                  </span>
                </div>
              </div>
            ))}
            {trainings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-full">
                No upcoming training sessions
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCalendarWidget 
          teamType="presales" 
          title={isManager ? "Presales Team Calendar" : "My Calendar"} 
        />
        {!isManager && (
          <TeamCalendarWidget 
            teamType="sales" 
            title="Sales Team Calendar" 
          />
        )}
      </div>
    </div>
  );
}
