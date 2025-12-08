import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Trophy, Target, DollarSign,
  BarChart3, Award, Gem, Crown, Star, Medal
} from "lucide-react";

interface OrgAccountMetricsProps {
  organizationId: string;
  organizationType?: string | null;
}

// Tier thresholds in INR (lakhs)
const TIER_THRESHOLDS = {
  bronze: 2500000,    // 25 lakhs
  silver: 5000000,    // 50 lakhs
  gold: 10000000,     // 1 Cr
  diamond: 25000000,  // 2.5 Cr
  platinum: 25000001, // Above 2.5 Cr
};

const DEAL_STAGES = {
  pipeline: { label: "Pipeline", color: "bg-blue-500" },
  qualified: { label: "Qualified", color: "bg-cyan-500" },
  proposal: { label: "Proposal", color: "bg-purple-500" },
  negotiation: { label: "Negotiation", color: "bg-orange-500" },
  closed_won: { label: "Won", color: "bg-green-500" },
  closed_lost: { label: "Lost", color: "bg-red-500" },
};

export function OrgAccountMetrics({ organizationId, organizationType }: OrgAccountMetricsProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Check if organization type qualifies for tier
  const showTiers = organizationType === "Customer" || organizationType === "Partner";

  // Fetch deals linked to this organization via contacts
  const { data: orgDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["org-deals", organizationId, currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id || !organizationId) return [];

      // Get contacts linked to this organization
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("alliance_organization_id", organizationId);

      if (!contacts?.length) return [];

      const contactIds = contacts.map(c => c.id);

      // Get deals linked to these contacts
      const { data: deals, error } = await supabase
        .from("deals")
        .select("id, title, value, stage, closed_won_substage, created_at, actual_close_date")
        .eq("tenant_id", currentTenant.id)
        .in("contact_id", contactIds);

      if (error) throw error;
      return deals || [];
    },
    enabled: !!currentTenant?.id && !!organizationId,
  });

  // Fetch all deals for contribution calculation
  const { data: allDeals = [], isLoading: allDealsLoading } = useQuery({
    queryKey: ["all-deals-contribution", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from("deals")
        .select("id, value, stage")
        .eq("tenant_id", currentTenant.id)
        .eq("stage", "closed_won");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const dealsByStage: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    let wonValue = 0;
    let lostValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    Object.keys(DEAL_STAGES).forEach(stage => {
      dealsByStage[stage] = { count: 0, value: 0 };
    });

    orgDeals.forEach(deal => {
      const stage = deal.stage || "pipeline";
      if (!dealsByStage[stage]) {
        dealsByStage[stage] = { count: 0, value: 0 };
      }
      dealsByStage[stage].count++;
      dealsByStage[stage].value += deal.value || 0;
      totalValue += deal.value || 0;

      if (stage === "closed_won") {
        wonValue += deal.value || 0;
        wonCount++;
      } else if (stage === "closed_lost") {
        lostValue += deal.value || 0;
        lostCount++;
      }
    });

    const closedDeals = wonCount + lostCount;
    const winRate = closedDeals > 0 ? (wonCount / closedDeals) * 100 : 0;
    const lossRate = closedDeals > 0 ? (lostCount / closedDeals) * 100 : 0;

    // Calculate contribution ratio
    const totalCompanyWonValue = allDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const contributionRatio = totalCompanyWonValue > 0 ? (wonValue / totalCompanyWonValue) * 100 : 0;

    return {
      dealsByStage,
      totalDeals: orgDeals.length,
      totalValue,
      wonValue,
      lostValue,
      wonCount,
      lostCount,
      winRate,
      lossRate,
      contributionRatio,
      totalCompanyWonValue,
    };
  }, [orgDeals, allDeals]);

  // Determine account tier
  const accountTier = useMemo(() => {
    if (!showTiers) return null;

    const { wonValue } = metrics;

    if (wonValue >= TIER_THRESHOLDS.platinum) {
      return {
        name: "Platinum",
        icon: Crown,
        color: "bg-gradient-to-r from-slate-400 to-slate-600",
        textColor: "text-slate-600 dark:text-slate-300",
        borderColor: "border-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-900/30",
      };
    }
    if (wonValue >= TIER_THRESHOLDS.diamond) {
      return {
        name: "Diamond",
        icon: Gem,
        color: "bg-gradient-to-r from-cyan-400 to-blue-500",
        textColor: "text-cyan-600 dark:text-cyan-300",
        borderColor: "border-cyan-400",
        bgColor: "bg-cyan-50 dark:bg-cyan-900/30",
      };
    }
    if (wonValue >= TIER_THRESHOLDS.gold) {
      return {
        name: "Gold",
        icon: Trophy,
        color: "bg-gradient-to-r from-yellow-400 to-amber-500",
        textColor: "text-amber-600 dark:text-amber-300",
        borderColor: "border-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/30",
      };
    }
    if (wonValue >= TIER_THRESHOLDS.silver) {
      return {
        name: "Silver",
        icon: Medal,
        color: "bg-gradient-to-r from-gray-300 to-gray-400",
        textColor: "text-gray-600 dark:text-gray-300",
        borderColor: "border-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-900/30",
      };
    }
    return {
      name: "Bronze",
      icon: Award,
      color: "bg-gradient-to-r from-orange-400 to-orange-600",
      textColor: "text-orange-600 dark:text-orange-300",
      borderColor: "border-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/30",
    };
  }, [metrics.wonValue, showTiers]);

  if (dealsLoading || allDealsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Account Performance
          </CardTitle>
          {accountTier && (
            <Badge className={`${accountTier.bgColor} ${accountTier.textColor} border ${accountTier.borderColor} gap-1`}>
              <accountTier.icon className="h-3 w-3" />
              {accountTier.name} Account
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tier Progress (for Customer/Partner) */}
        {showTiers && accountTier && (
          <div className={`p-4 rounded-lg ${accountTier.bgColor} border ${accountTier.borderColor}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${accountTier.color}`}>
                <accountTier.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${accountTier.textColor}`}>{accountTier.name} Tier</span>
                  <span className="text-sm font-medium">{formatCurrency(metrics.wonValue)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total won business value
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Deals</span>
            </div>
            <p className="text-xl font-bold">{metrics.totalDeals}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-xl font-bold text-green-600">{metrics.winRate.toFixed(1)}%</p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Loss Rate</span>
            </div>
            <p className="text-xl font-bold text-red-600">{metrics.lossRate.toFixed(1)}%</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Contribution</span>
            </div>
            <p className="text-xl font-bold text-primary">{metrics.contributionRatio.toFixed(1)}%</p>
          </div>
        </div>

        {/* Win/Loss Values */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-600">Won Value</span>
              <Badge variant="outline" className="text-green-600 border-green-500/30">
                {metrics.wonCount} deals
              </Badge>
            </div>
            <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.wonValue)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-600">Lost Value</span>
              <Badge variant="outline" className="text-red-600 border-red-500/30">
                {metrics.lostCount} deals
              </Badge>
            </div>
            <p className="text-lg font-bold text-red-600">{formatCurrency(metrics.lostValue)}</p>
          </div>
        </div>

        {/* Deals by Stage */}
        <div>
          <h4 className="text-sm font-medium mb-3">Deals by Sales Stage</h4>
          <div className="space-y-2">
            {Object.entries(DEAL_STAGES).map(([stage, config]) => {
              const stageData = metrics.dealsByStage[stage] || { count: 0, value: 0 };
              const percentage = metrics.totalDeals > 0 
                ? (stageData.count / metrics.totalDeals) * 100 
                : 0;
              
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      <span>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{stageData.count} deals</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">{formatCurrency(stageData.value)}</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Contribution to Overall Business */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Business Contribution</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.contributionRatio.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">of total company revenue</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatCurrency(metrics.wonValue)}</p>
              <p className="text-xs text-muted-foreground">
                out of {formatCurrency(metrics.totalCompanyWonValue)}
              </p>
            </div>
          </div>
          <Progress 
            value={metrics.contributionRatio} 
            className="h-2 mt-3" 
          />
        </div>
      </CardContent>
    </Card>
  );
}
