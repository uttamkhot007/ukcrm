import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Mail, 
  Target, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";
import { TargetProgressWidget } from "./TargetProgressWidget";

interface InsideSalesDashboardProps {
  onNavigate: (module: string) => void;
}

export function InsideSalesDashboard({ onNavigate }: InsideSalesDashboardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch prospects assigned to user
  const { data: myProspects = [] } = useQuery({
    queryKey: ["my-prospects", user?.id, currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inside_sales_prospects")
        .select("*")
        .eq("assigned_to", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch leads assigned to user
  const { data: myLeads = [] } = useQuery({
    queryKey: ["my-inside-leads", user?.id, currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .not("status", "in", "(qualified,disqualified)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch weekly activities
  const { data: weeklyActivities = [] } = useQuery({
    queryKey: ["inside-weekly-activities", user?.id],
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

  // Calculate stats
  const prospectStats = {
    total: myProspects.length,
    new: myProspects.filter(p => p.status === "new").length,
    contacted: myProspects.filter(p => p.status === "contacted").length,
    interested: myProspects.filter(p => p.status === "interested").length,
    converted: myProspects.filter(p => p.status === "converted").length,
  };

  const activityBreakdown = {
    calls: weeklyActivities.filter(a => a.activity_type === "call").length,
    emails: weeklyActivities.filter(a => a.activity_type === "email").length,
    meetings: weeklyActivities.filter(a => a.activity_type === "meeting").length,
    total: weeklyActivities.length,
  };

  const overdueFollowUps = myProspects.filter(p => 
    p.follow_up_date && new Date(p.follow_up_date) < new Date() && 
    !["converted", "archived", "not_interested"].includes(p.status)
  );

  return (
    <div className="space-y-6">
      {/* MEDDIC Workflow Quick Access */}
      <Card 
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 cursor-pointer hover:shadow-md transition-all group"
        onClick={() => onNavigate("sales-meddic-workflow")}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">MEDDIC Workflow</h3>
              <p className="text-sm text-muted-foreground">Qualify deals with MEDDIC methodology</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            Open <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Prospects</p>
                <p className="text-2xl font-bold">{prospectStats.total}</p>
                <p className="text-xs text-muted-foreground">{prospectStats.new} new</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold">{myLeads.length}</p>
                <p className="text-xs text-muted-foreground">Being worked</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{activityBreakdown.total}</p>
                <p className="text-xs text-muted-foreground">activities</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold">{prospectStats.converted}</p>
                <p className="text-xs text-muted-foreground">prospects</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress */}
      <TargetProgressWidget teamType="inside_sales" showFullBreakdown />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity */}
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
                  <Users className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Meetings</span>
                </div>
                <Badge variant="secondary">{activityBreakdown.meetings}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Follow-ups */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Overdue Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {overdueFollowUps.slice(0, 5).map((prospect) => (
                <div
                  key={prospect.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onNavigate("inside-sales")}
                >
                  <p className="font-medium text-sm truncate">{prospect.company_name || prospect.contact_name || "Unknown"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      Due: {format(new Date(prospect.follow_up_date!), "MMM d")}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {prospect.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              {overdueFollowUps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No overdue follow-ups 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <TeamRemindersWidget />
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCalendarWidget 
          teamType="sales" 
          title="My Calendar" 
        />
        <TeamCalendarWidget 
          teamType="sales" 
          title="Sales Team Calendar" 
        />
      </div>
    </div>
  );
}
