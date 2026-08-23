import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import {
  TrendingUp, Target, DollarSign, Users, Calendar,
  ArrowRight, Clock, CheckCircle2, AlertTriangle, Sparkles,
  FileText, Phone, BarChart3, Award, Zap
} from "lucide-react";

interface SalesModuleDashboardProps {
  onNavigate: (tab: string) => void;
}

export function SalesModuleDashboard({ onNavigate }: SalesModuleDashboardProps) {
  const { user } = useAuth();
  const { formatCurrency } = useOrganizationSettings();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const quarterStart = startOfQuarter(now);
  const quarterEnd = endOfQuarter(now);

  // Fetch sales metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['sales-dashboard-metrics', user?.id],
    queryFn: async () => {
      // Deals by stage
      const { data: deals } = await supabase
        .from('deals')
        .select('id, value, stage, expected_close_date, meddic_score, created_at') as any;

      // Calculate metrics
      const allDeals = deals || [];
      const activeDeals = allDeals.filter((d: any) => !['closed_won', 'closed_lost'].includes(d.stage));
      const wonDeals = allDeals.filter((d: any) => d.stage === 'closed_won');
      const thisMonthWon = wonDeals.filter((d: any) => 
        new Date(d.created_at) >= monthStart && new Date(d.created_at) <= monthEnd
      );

      const pipelineValue = activeDeals.reduce((sum: number, d: any) => sum + Number(d.value), 0);
      const wonValue = thisMonthWon.reduce((sum: number, d: any) => sum + Number(d.value), 0);
      const avgMeddicScore = activeDeals.length > 0
        ? Math.round(activeDeals.reduce((sum: number, d: any) => sum + (d.meddic_score || 0), 0) / activeDeals.length)
        : 0;

      const closingThisMonth = activeDeals.filter((d: any) => {
        if (!d.expected_close_date) return false;
        const closeDate = new Date(d.expected_close_date);
        return closeDate >= monthStart && closeDate <= monthEnd;
      });

      return {
        pipelineValue,
        wonValue,
        activeDealsCount: activeDeals.length,
        wonDealsCount: thisMonthWon.length,
        avgMeddicScore,
        activitiesCount: 0,
        hotLeads: 0,
        pendingQuotations: 0,
        closingThisMonth: closingThisMonth.length,
        closingValue: closingThisMonth.reduce((sum: number, d: any) => sum + Number(d.value), 0),
        dealsByStage: {
          pipeline: allDeals.filter((d: any) => d.stage === 'pipeline').length,
          upside: allDeals.filter((d: any) => d.stage === 'upside').length,
          strong_upside: allDeals.filter((d: any) => d.stage === 'strong_upside').length,
          commit: allDeals.filter((d: any) => d.stage === 'commit').length,
        }
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-sales/20 to-primary/10 rounded-xl p-6 border border-sales/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-sales" />
              Sales Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's your sales overview for {format(now, 'MMMM yyyy')}
            </p>
          </div>
          <Button onClick={() => onNavigate('meddic-workflow')} className="bg-sales hover:bg-sales/90">
            <Sparkles className="h-4 w-4 mr-2" />
            MEDDIC Workflow
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('deals')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.pipelineValue || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.activeDealsCount} active deals
                </p>
              </div>
              <div className="p-3 rounded-full bg-sales/20">
                <DollarSign className="h-6 w-6 text-sales" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('deals')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won This Month</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(metrics?.wonValue || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.wonDealsCount} deals closed
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Award className="h-6 w-6 text-green-700 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('leads')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-orange-600">{metrics?.hotLeads || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Score ≥70%
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('meddic-workflow')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg MEDDIC Score</p>
                <p className="text-2xl font-bold">{metrics?.avgMeddicScore || 0}%</p>
                <Progress value={metrics?.avgMeddicScore || 0} className="h-2 mt-2 w-24" />
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by Stage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sales" />
              Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: 'Pipeline', count: metrics?.dealsByStage.pipeline || 0, color: 'bg-blue-500' },
                { stage: 'Upside', count: metrics?.dealsByStage.upside || 0, color: 'bg-purple-500' },
                { stage: 'Strong Upside', count: metrics?.dealsByStage.strong_upside || 0, color: 'bg-orange-500' },
                { stage: 'Commit', count: metrics?.dealsByStage.commit || 0, color: 'bg-green-500' },
              ].map(item => (
                <div key={item.stage} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium">{item.stage}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div 
                      className={`h-full ${item.color} flex items-center justify-end pr-2`}
                      style={{ width: `${Math.min((item.count / Math.max(metrics?.activeDealsCount || 1, 1)) * 100, 100)}%` }}
                    >
                      <span className="text-white text-xs font-medium">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('deals')}>
              <Target className="h-4 w-4 mr-2" />
              Manage Deals
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('leads')}>
              <Users className="h-4 w-4 mr-2" />
              View Leads
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('quotations')}>
              <FileText className="h-4 w-4 mr-2" />
              Quotations
              {metrics?.pendingQuotations ? (
                <Badge variant="secondary" className="ml-auto">{metrics.pendingQuotations}</Badge>
              ) : (
                <ArrowRight className="h-4 w-4 ml-auto" />
              )}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('meddic-workflow')}>
              <Sparkles className="h-4 w-4 mr-2" />
              MEDDIC Workflow
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Closing This Month */}
      {(metrics?.closingThisMonth || 0) > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Deals Closing This Month</p>
                  <p className="text-sm text-muted-foreground">
                    {metrics?.closingThisMonth} deals worth {formatCurrency(metrics?.closingValue || 0)}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => onNavigate('deals')}>
                View Deals
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
