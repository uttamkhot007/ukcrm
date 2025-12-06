import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign,
  ArrowRight,
  Phone,
  Calendar,
  FileText,
  Briefcase
} from "lucide-react";
import { format, subDays } from "date-fns";

interface TeamSpecificWidgetsProps {
  onNavigate: (module: string) => void;
}

export function TeamSpecificWidgets({ onNavigate }: TeamSpecificWidgetsProps) {
  const { user, teams } = useAuth();
  
  const isSalesTeam = teams.includes("sales") || teams.includes("inside_sales");
  const isPresalesTeam = teams.includes("presales");
  const isHRTeam = teams.includes("hr");
  const isFinanceTeam = teams.includes("finance");

  if (isSalesTeam || isPresalesTeam) {
    return <SalesTeamWidgets onNavigate={onNavigate} userId={user?.id} />;
  }

  if (isHRTeam) {
    return <HRTeamWidgets onNavigate={onNavigate} />;
  }

  if (isFinanceTeam) {
    return <FinanceTeamWidgets onNavigate={onNavigate} />;
  }

  return null;
}

function SalesTeamWidgets({ onNavigate, userId }: { onNavigate: (module: string) => void; userId?: string }) {
  // Fetch my deals
  const { data: myDeals } = useQuery({
    queryKey: ["my-deals", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("assigned_to", userId)
        .not("stage", "in", "(closed_won,closed_lost)")
        .order("expected_close_date", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch my leads
  const { data: myLeads } = useQuery({
    queryKey: ["my-leads", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("assigned_to", userId)
        .in("status", ["new", "contacted", "qualified"])
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch my stats
  const { data: myStats } = useQuery({
    queryKey: ["my-sales-stats", userId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const [dealsResult, leadsResult, wonResult] = await Promise.all([
        supabase
          .from("deals")
          .select("id, value")
          .eq("assigned_to", userId)
          .not("stage", "in", "(closed_won,closed_lost)"),
        supabase
          .from("leads")
          .select("id")
          .eq("assigned_to", userId)
          .in("status", ["new", "contacted", "qualified"]),
        supabase
          .from("deals")
          .select("value")
          .eq("assigned_to", userId)
          .eq("stage", "closed_won")
          .gte("actual_close_date", thirtyDaysAgo),
      ]);

      const pipelineValue = dealsResult.data?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      const activeLeads = leadsResult.data?.length || 0;
      const wonValue = wonResult.data?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      const activeDeals = dealsResult.data?.length || 0;

      return { pipelineValue, activeLeads, wonValue, activeDeals };
    },
    enabled: !!userId,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">My Sales Dashboard</h2>
      
      {/* My Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{myStats?.activeDeals || 0}</p>
            <p className="text-xs text-muted-foreground">Active Deals</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{formatCurrency(myStats?.pipelineValue || 0)}</p>
            <p className="text-xs text-muted-foreground">My Pipeline</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{myStats?.activeLeads || 0}</p>
            <p className="text-xs text-muted-foreground">Active Leads</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{formatCurrency(myStats?.wonValue || 0)}</p>
            <p className="text-xs text-muted-foreground">Won (30d)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Deals */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">My Active Deals</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate("sales")}
              className="text-primary hover:text-primary/80"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!myDeals || myDeals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active deals assigned to you</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {deal.expected_close_date 
                          ? `Close: ${format(new Date(deal.expected_close_date), "MMM d")}`
                          : "No close date"
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(deal.value)}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {deal.stage.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Leads */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">My Active Leads</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate("sales")}
              className="text-primary hover:text-primary/80"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!myLeads || myLeads.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active leads assigned to you</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{lead.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.source || "No source"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {lead.estimated_value ? formatCurrency(lead.estimated_value) : "-"}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {lead.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HRTeamWidgets({ onNavigate }: { onNavigate: (module: string) => void }) {
  // Fetch pending employee requests
  const { data: pendingRequests } = useQuery({
    queryKey: ["hr-pending-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("*, profiles!employee_requests_user_id_fkey(full_name)")
        .in("status", ["pending", "under_review"])
        .order("sla_deadline", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch request stats by type
  const { data: requestStats } = useQuery({
    queryKey: ["hr-request-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("type, status")
        .in("status", ["pending", "under_review"]);
      
      if (error) throw error;
      
      const byType = data.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return { total: data.length, byType };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">HR Dashboard</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{requestStats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{requestStats?.byType?.leave || 0}</p>
            <p className="text-xs text-muted-foreground">Leave Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{requestStats?.byType?.work_from_home || 0}</p>
            <p className="text-xs text-muted-foreground">WFH Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{requestStats?.byType?.advance_salary || 0}</p>
            <p className="text-xs text-muted-foreground">Advance Requests</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate("hr")}
            className="text-primary hover:text-primary/80"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {!pendingRequests || pendingRequests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(request.profiles as any)?.full_name || "Unknown"} • {request.type.replace("_", " ")}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="capitalize"
                  >
                    {request.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceTeamWidgets({ onNavigate }: { onNavigate: (module: string) => void }) {
  // Fetch deals in closed_won with payment pending
  const { data: paymentPending } = useQuery({
    queryKey: ["finance-payment-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("stage", "closed_won")
        .in("closed_won_substage", ["odf_approved", "invoice_raised"])
        .order("actual_close_date", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch advance salary requests
  const { data: advanceRequests } = useQuery({
    queryKey: ["finance-advance-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("*, profiles!employee_requests_user_id_fkey(full_name)")
        .eq("type", "advance_salary")
        .in("status", ["pending", "under_review", "approved"])
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const totalPending = paymentPending?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
  const totalAdvance = advanceRequests?.reduce((sum, r) => sum + (r.advance_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Finance Dashboard</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-muted-foreground">Pending Payments</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{paymentPending?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Invoices Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{advanceRequests?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Advance Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{formatCurrency(totalAdvance)}</p>
            <p className="text-xs text-muted-foreground">Advance Amount</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Pending Payments</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate("finance")}
              className="text-primary hover:text-primary/80"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!paymentPending || paymentPending.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentPending.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {deal.closed_won_substage?.replace("_", " ") || "Pending"}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-green-500">
                      {formatCurrency(deal.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Advance Salary Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {!advanceRequests || advanceRequests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No advance requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {advanceRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {(request.profiles as any)?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {request.status.replace("_", " ")}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-orange-500">
                      {formatCurrency(request.advance_amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
