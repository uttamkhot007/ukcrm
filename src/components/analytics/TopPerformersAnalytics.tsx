import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Users, MapPin, Award, Crown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function TopPerformersAnalytics() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: performersData, isLoading } = useQuery({
    queryKey: ["top-performers-analytics"],
    queryFn: async () => {
      const { data: deals } = await supabase.from("deals").select("id, value, stage, assigned_to, created_at").eq("stage", "closed_won");
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, job_title, department");

      const salesPerformers: Record<string, { dealsCount: number; totalValue: number }> = {};
      deals?.forEach(deal => {
        if (deal.assigned_to) {
          if (!salesPerformers[deal.assigned_to]) salesPerformers[deal.assigned_to] = { dealsCount: 0, totalValue: 0 };
          salesPerformers[deal.assigned_to].dealsCount += 1;
          salesPerformers[deal.assigned_to].totalValue += Number(deal.value) || 0;
        }
      });

      const topSalesReps = Object.entries(salesPerformers).map(([userId, stats]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return { id: userId, name: profile?.full_name || "Unknown", role: profile?.job_title || "Sales Rep", team: profile?.department || "Sales", dealsCount: stats.dealsCount, totalValue: stats.totalValue };
      }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

      const teamPerformance: Record<string, { dealsCount: number; totalValue: number; members: Set<string> }> = {};
      Object.entries(salesPerformers).forEach(([userId, stats]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        const team = profile?.department || "General";
        if (!teamPerformance[team]) teamPerformance[team] = { dealsCount: 0, totalValue: 0, members: new Set() };
        teamPerformance[team].dealsCount += stats.dealsCount;
        teamPerformance[team].totalValue += stats.totalValue;
        teamPerformance[team].members.add(userId);
      });

      const topTeams = Object.entries(teamPerformance).map(([team, stats]) => ({ team, dealsCount: stats.dealsCount, totalValue: stats.totalValue, memberCount: stats.members.size })).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);

      const topOrders = deals?.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 5).map(deal => {
        const profile = profiles?.find(p => p.user_id === deal.assigned_to);
        return { id: deal.id, value: Number(deal.value) || 0, closedBy: profile?.full_name || "Unknown", date: deal.created_at };
      }) || [];

      return { topSalesReps, topTeams, topOrders };
    },
  });

  if (isLoading) return <div className="grid gap-6 lg:grid-cols-2">{[1, 2].map((i) => (<Card key={i} className="glass"><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><div className="space-y-4">{[1, 2, 3].map((j) => (<div key={j} className="flex items-center gap-4"><Skeleton className="w-8 h-8 rounded-full" /><Skeleton className="h-4 w-32" /></div>))}</div></CardContent></Card>))}</div>;

  return (
    <div className="space-y-6">
      <Card className="glass border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Top Sales Performers</CardTitle></CardHeader>
        <CardContent>
          {performersData?.topSalesReps.length === 0 ? <p className="text-muted-foreground text-center py-4">No data available</p> : (
            <div className="space-y-4">{performersData?.topSalesReps.map((performer, index) => (
              <div key={performer.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">{index === 0 ? <Crown className="h-4 w-4" /> : index + 1}</div>
                <div className="flex-1 min-w-0"><p className="font-medium text-foreground truncate">{performer.name}</p><p className="text-xs text-muted-foreground">{performer.role} · {performer.team}</p></div>
                <div className="text-right"><p className="font-semibold text-primary">{formatCurrency(performer.totalValue)}</p><p className="text-xs text-muted-foreground">{performer.dealsCount} deals</p></div>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Top Performing Teams</CardTitle></CardHeader>
        <CardContent>
          {performersData?.topTeams.length === 0 ? <p className="text-muted-foreground text-center py-8">No team data available</p> : (
            <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={performersData?.topTeams} layout="vertical"><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} /><YAxis type="category" dataKey="team" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={100} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Revenue']} /><Bar dataKey="totalValue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Top Achievement Orders</CardTitle></CardHeader>
        <CardContent>
          {performersData?.topOrders.length === 0 ? <p className="text-muted-foreground text-center py-4">No orders data available</p> : (
            <div className="space-y-4">{performersData?.topOrders.map((order, index) => (
              <div key={order.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>#{index + 1}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-primary">{formatCurrency(order.value)}</p><p className="text-xs text-muted-foreground">Closed by {order.closedBy}</p></div>
                <Badge variant="secondary" className="text-xs">{new Date(order.date).toLocaleDateString()}</Badge>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
