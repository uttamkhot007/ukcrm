import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Phone,
  Mail,
  Clock,
  CheckCircle2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";
import { TargetProgressWidget } from "./TargetProgressWidget";

interface SalesRepDashboardProps {
  onNavigate: (module: string) => void;
}

export function SalesRepDashboard({ onNavigate }: SalesRepDashboardProps) {
  const { user, profile } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch sales rep's personal metrics
  const { data: myDeals } = useQuery({
    queryKey: ["my-deals", user?.id, currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .not("stage", "in", "(closed_won,closed_lost)")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch activities for this week
  const { data: weeklyActivities } = useQuery({
    queryKey: ["weekly-activities", user?.id],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      const { data, error } = await supabase
        .from("deal_activities")
        .select("*")
        .eq("user_id", user?.id)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch monthly performance
  const { data: monthlyPerformance } = useQuery({
    queryKey: ["monthly-performance", user?.id, currentTenant?.id],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const { data: wonDeals, error } = await supabase
        .from("deals")
        .select("value")
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .eq("stage", "closed_won")
        .gte("actual_close_date", monthStart.toISOString().split("T")[0])
        .lte("actual_close_date", monthEnd.toISOString().split("T")[0]);

      if (error) throw error;
      
      const totalWon = (wonDeals || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      return {
        dealsWon: wonDeals?.length || 0,
        revenueWon: totalWon,
        target: 500000, // This could come from a settings table
      };
    },
    enabled: !!user,
  });

  // Fetch leads
  const { data: myLeads } = useQuery({
    queryKey: ["my-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .eq("status", "new")
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const pipelineValue = (myDeals || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const targetProgress = monthlyPerformance?.target 
    ? Math.min((monthlyPerformance.revenueWon / monthlyPerformance.target) * 100, 100)
    : 0;

  const activityBreakdown = {
    calls: (weeklyActivities || []).filter(a => a.activity_type === "call").length,
    emails: (weeklyActivities || []).filter(a => a.activity_type === "email").length,
    meetings: (weeklyActivities || []).filter(a => a.activity_type === "meeting").length,
    total: weeklyActivities?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold">{myDeals?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(pipelineValue)}</p>
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
                <p className="text-sm font-medium text-muted-foreground">New Leads</p>
                <p className="text-2xl font-bold">{myLeads?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{activityBreakdown.total} activities</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress Widget - fetches from sales_targets table */}
      <TargetProgressWidget teamType="sales" showFullBreakdown />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Calls</span>
                </div>
                <Badge variant="secondary">{activityBreakdown.calls}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Emails</span>
                </div>
                <Badge variant="secondary">{activityBreakdown.emails}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Meetings</span>
                </div>
                <Badge variant="secondary">{activityBreakdown.meetings}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <TeamRemindersWidget />

        {/* My Deals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(myDeals || []).slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("sales")}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(deal.value)}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {deal.stage.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!myDeals || myDeals.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active deals
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presales Calendar Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCalendarWidget 
          teamType="sales" 
          title="My Calendar" 
        />
        <TeamCalendarWidget 
          showPresalesCalendar 
          title="Presales Team Calendar" 
        />
      </div>
    </div>
  );
}
