import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Award, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

interface TargetProgressWidgetProps {
  teamType?: "sales" | "presales" | "inside_sales";
  showFullBreakdown?: boolean;
}

export function TargetProgressWidget({ teamType = "sales", showFullBreakdown = false }: TargetProgressWidgetProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch user's sales target for current period
  const { data: targetData, isLoading: isLoadingTarget } = useQuery({
    queryKey: ["my-sales-target", user?.id, currentTenant?.id],
    queryFn: async () => {
      const today = new Date();
      
      const { data, error } = await supabase
        .from("sales_targets")
        .select("*")
        .eq("user_id", user?.id)
        .lte("period_start", format(today, "yyyy-MM-dd"))
        .gte("period_end", format(today, "yyyy-MM-dd"))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch actual sales achievements for current period
  const { data: achievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ["my-sales-achievements", user?.id, currentTenant?.id, targetData?.period_start, targetData?.period_end],
    queryFn: async () => {
      if (!targetData) {
        // Use current month if no target
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());

        const { data, error } = await supabase
          .from("deals")
          .select("id, value, stage, deal_type, actual_close_date")
          .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
          .eq("stage", "closed_won")
          .gte("actual_close_date", format(monthStart, "yyyy-MM-dd"))
          .lte("actual_close_date", format(monthEnd, "yyyy-MM-dd"));

        if (error) throw error;
        return {
          wonDeals: data || [],
          periodStart: format(monthStart, "MMM d"),
          periodEnd: format(monthEnd, "MMM d, yyyy"),
        };
      }

      const { data, error } = await supabase
        .from("deals")
        .select("id, value, stage, deal_type, actual_close_date")
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .eq("stage", "closed_won")
        .gte("actual_close_date", targetData.period_start)
        .lte("actual_close_date", targetData.period_end);

      if (error) throw error;
      return {
        wonDeals: data || [],
        periodStart: format(parseISO(targetData.period_start), "MMM d"),
        periodEnd: format(parseISO(targetData.period_end), "MMM d, yyyy"),
      };
    },
    enabled: !!user,
  });

  const isLoading = isLoadingTarget || isLoadingAchievements;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Target Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const wonDeals = achievements?.wonDeals || [];
  const freshSalesDeals = wonDeals.filter(d => d.deal_type === "fresh" || !d.deal_type);
  const renewalDeals = wonDeals.filter(d => d.deal_type === "renewal");
  
  const totalRevenue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const freshSalesRevenue = freshSalesDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const renewalRevenue = renewalDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  // Calculate targets
  const topLineTarget = targetData?.top_line_target || 500000;
  const freshSalesTarget = targetData?.fresh_sales_top_line || (topLineTarget * 0.7);
  const renewalTarget = targetData?.renewal_top_line || (topLineTarget * 0.3);

  // Calculate progress
  const overallProgress = Math.min((totalRevenue / topLineTarget) * 100, 100);
  const freshProgress = freshSalesTarget > 0 ? Math.min((freshSalesRevenue / freshSalesTarget) * 100, 100) : 0;
  const renewalProgress = renewalTarget > 0 ? Math.min((renewalRevenue / renewalTarget) * 100, 100) : 0;

  const hasTarget = !!targetData;
  const periodLabel = achievements?.periodStart && achievements?.periodEnd 
    ? `${achievements.periodStart} - ${achievements.periodEnd}`
    : format(new Date(), "MMMM yyyy");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Target Progress
          </CardTitle>
          {hasTarget ? (
            <Badge variant="outline" className="text-xs">
              {targetData.target_period}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Monthly Default
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Target</span>
            <span className="text-muted-foreground">
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(totalRevenue)}</span>
            <span>of {formatCurrency(topLineTarget)}</span>
          </div>
        </div>

        {showFullBreakdown && (
          <>
            {/* Fresh Sales Progress */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Fresh Sales
                </span>
                <span className="text-muted-foreground">
                  {freshProgress.toFixed(1)}%
                </span>
              </div>
              <Progress value={freshProgress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(freshSalesRevenue)}</span>
                <span>of {formatCurrency(freshSalesTarget)}</span>
              </div>
            </div>

            {/* Renewal Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-blue-500" />
                  Renewals
                </span>
                <span className="text-muted-foreground">
                  {renewalProgress.toFixed(1)}%
                </span>
              </div>
              <Progress value={renewalProgress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(renewalRevenue)}</span>
                <span>of {formatCurrency(renewalTarget)}</span>
              </div>
            </div>
          </>
        )}

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {wonDeals.length} deals closed
          </span>
        </div>

        {/* Incentive Status */}
        {hasTarget && targetData.incentive_eligibility_cap && overallProgress >= 100 && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600">
              <Award className="h-5 w-5" />
              <span className="font-medium text-sm">Target Achieved!</span>
            </div>
            <p className="text-xs text-green-600/80 mt-1">
              Eligible for incentive up to {formatCurrency(targetData.incentive_cap_calculated || targetData.incentive_eligibility_cap)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
