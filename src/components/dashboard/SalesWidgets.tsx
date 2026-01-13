import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Users, Target, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

type DealStage = Database["public"]["Enums"]["deal_stage"];

const stageLabels: Record<DealStage, string> = {
  pipeline: "Pipeline",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  upside: "Upside",
  strong_upside: "Strong Upside",
  commit: "Commit",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

interface SalesWidgetsProps {
  onNavigate?: (module: string) => void;
}

export function SalesWidgets({ onNavigate }: SalesWidgetsProps) {
  const { formatCurrency, getCurrencySymbol } = useOrganizationSettings();
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["sales-widget-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["sales-widget-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["sales-widget-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = dealsLoading || leadsLoading || contactsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate metrics
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const last30Days = subDays(now, 30);

  const totalPipeline = deals?.filter(d => !d.stage.startsWith("closed")).reduce((sum, d) => sum + Number(d.value), 0) || 0;
  const closedWonValue = deals?.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + Number(d.value), 0) || 0;
  const closedLostValue = deals?.filter(d => d.stage === "closed_lost").reduce((sum, d) => sum + Number(d.value), 0) || 0;
  const totalClosed = closedWonValue + closedLostValue;
  const winRate = totalClosed > 0 ? Math.round((closedWonValue / totalClosed) * 100) : 0;

  const recentDeals = deals?.filter(d => new Date(d.created_at) >= last30Days).length || 0;
  const recentLeads = leads?.filter(l => new Date(l.created_at) >= last30Days).length || 0;
  const recentContacts = contacts?.filter(c => new Date(c.created_at) >= last30Days).length || 0;

  const qualifiedLeads = leads?.filter(l => l.status === "qualified").length || 0;
  const convertedLeads = leads?.filter(l => l.status === "converted").length || 0;
  const conversionRate = leads?.length ? Math.round((convertedLeads / leads.length) * 100) : 0;

  // Stage breakdown
  const stageBreakdown = (Object.keys(stageLabels) as DealStage[]).map(stage => ({
    stage,
    label: stageLabels[stage],
    count: deals?.filter(d => d.stage === stage).length || 0,
    value: deals?.filter(d => d.stage === stage).reduce((sum, d) => sum + Number(d.value), 0) || 0,
  })).filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="p-4 glass border-border cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => onNavigate?.("sales")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Active Pipeline</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPipeline)}</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 glass border-border cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => onNavigate?.("sales")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Closed Won</p>
              <p className="text-2xl font-bold">{formatCurrency(closedWonValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{winRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Active Leads</p>
              <p className="text-2xl font-bold">{qualifiedLeads}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline by Stage */}
      <Card className="p-4 glass border-border">
        <h3 className="font-semibold mb-4">Pipeline by Stage</h3>
        <div className="space-y-3">
          {stageBreakdown.map(({ stage, label, count, value }) => {
            const percentage = totalPipeline > 0 ? (value / totalPipeline) * 100 : 0;
            return (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{count}</Badge>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
          {stageBreakdown.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No deals yet</p>
          )}
        </div>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 glass border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">New Deals (30 days)</h4>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{recentDeals}</span>
            <ArrowUp className="w-4 h-4 text-emerald-400" />
          </div>
        </Card>

        <Card className="p-4 glass border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">New Leads (30 days)</h4>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{recentLeads}</span>
            <ArrowUp className="w-4 h-4 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 glass border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Lead Conversion</h4>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{conversionRate}%</span>
            <span className="text-sm text-muted-foreground">({convertedLeads}/{leads?.length || 0})</span>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-4 glass border-border">
        <h3 className="font-semibold mb-4">Recent Deals</h3>
        <div className="space-y-3">
          {deals?.slice(0, 5).map(deal => (
            <div key={deal.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="font-medium text-sm">{deal.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(deal.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(Number(deal.value))}</p>
                <Badge variant="secondary" className="text-xs">
                  {stageLabels[deal.stage]}
                </Badge>
              </div>
            </div>
          ))}
          {(!deals || deals.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No deals yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
