import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  BarChart3,
  Trophy,
  AlertTriangle
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";

interface SalesManagerDashboardProps {
  onNavigate: (module: string) => void;
}

export function SalesManagerDashboard({ onNavigate }: SalesManagerDashboardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch team members (profiles with sales team)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["sales-team-members", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_teams!inner(team)
        `)
        .eq("user_teams.team", "sales");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all team deals
  const { data: teamDeals = [] } = useQuery({
    queryKey: ["team-deals", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .not("stage", "in", "(closed_won,closed_lost)");

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch monthly closed deals
  const { data: monthlyStats } = useQuery({
    queryKey: ["monthly-team-stats", currentTenant?.id],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      let query = supabase
        .from("deals")
        .select("value, user_id, assigned_to, stage")
        .gte("actual_close_date", monthStart.toISOString().split("T")[0])
        .lte("actual_close_date", monthEnd.toISOString().split("T")[0]);

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const wonDeals = (data || []).filter(d => d.stage === "closed_won");
      const lostDeals = (data || []).filter(d => d.stage === "closed_lost");

      return {
        won: wonDeals.length,
        lost: lostDeals.length,
        revenue: wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
        winRate: wonDeals.length + lostDeals.length > 0 
          ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 
          : 0,
      };
    },
    enabled: !!user,
  });

  // Calculate team performance by member
  const teamPerformance = teamMembers.map(member => {
    const memberDeals = teamDeals.filter(
      d => d.user_id === member.user_id || d.assigned_to === member.user_id
    );
    const pipelineValue = memberDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    return {
      ...member,
      dealCount: memberDeals.length,
      pipelineValue,
    };
  }).sort((a, b) => b.pipelineValue - a.pipelineValue);

  // Identify at-risk deals (high value, stuck in stage)
  const atRiskDeals = teamDeals
    .filter(d => {
      const daysSinceUpdate = Math.floor(
        (new Date().getTime() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 14 || (Number(d.value) > 100000 && daysSinceUpdate > 7);
    })
    .slice(0, 5);

  const totalPipeline = teamDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const teamTarget = 2000000; // Could come from settings
  const targetProgress = Math.min((monthlyStats?.revenue || 0) / teamTarget * 100, 100);

  return (
    <div className="space-y-6">
      {/* Team Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Size</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pipeline</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPipeline)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{(monthlyStats?.winRate || 0).toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MTD Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyStats?.revenue || 0)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Target Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Team Monthly Target - {format(new Date(), "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {formatCurrency(monthlyStats?.revenue || 0)} of {formatCurrency(teamTarget)}
              </span>
              <span className="text-sm text-muted-foreground">
                {targetProgress.toFixed(1)}% achieved
              </span>
            </div>
            <Progress value={targetProgress} className="h-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-600">{monthlyStats?.won || 0}</p>
                <p className="text-xs text-muted-foreground">Deals Won</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <p className="text-2xl font-bold text-red-600">{monthlyStats?.lost || 0}</p>
                <p className="text-xs text-muted-foreground">Deals Lost</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <p className="text-2xl font-bold text-blue-600">{teamDeals.length}</p>
                <p className="text-xs text-muted-foreground">In Pipeline</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Team Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {teamPerformance.map((member, index) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/50"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {member.full_name?.split(" ").map(n => n[0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.dealCount} deals
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(member.pipelineValue)}
                  </p>
                </div>
              ))}
              {teamPerformance.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Deals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              At-Risk Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {atRiskDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-lg border-l-4 border-l-orange-500 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("sales")}
                >
                  <p className="font-medium text-sm truncate">{deal.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(deal.value)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {Math.floor((new Date().getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days idle
                    </Badge>
                  </div>
                </div>
              ))}
              {atRiskDeals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No at-risk deals
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <TeamRemindersWidget />
      </div>

      {/* Team Calendar */}
      <TeamCalendarWidget 
        teamType="sales" 
        title="Sales Team Calendar" 
      />
    </div>
  );
}
