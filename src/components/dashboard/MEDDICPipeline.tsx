import { cn } from "@/lib/utils";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface FunnelStage {
  name: string;
  value: number;
  amount: number;
  color: string;
  progress: number;
  substages?: SubStage[];
}

interface SubStage {
  name: string;
  value: number;
  amount: number;
  color: string;
}

const SUBSTAGE_LABELS: Record<string, string> = {
  request_odf: "Request ODF",
  odf_created: "ODF Created",
  odf_approved: "ODF Approved",
  process_order: "Process Order",
  get_license: "Get License",
  raise_invoice: "Raise Invoice",
  invoice_raised: "Invoice Raised",
  collect_payment: "Collect Payment",
  payment_received: "Payment Received",
};

const SUBSTAGE_COLORS: Record<string, string> = {
  request_odf: "bg-blue-400/60",
  odf_created: "bg-blue-500/70",
  odf_approved: "bg-green-500/70",
  process_order: "bg-yellow-500/70",
  get_license: "bg-purple-500/70",
  raise_invoice: "bg-orange-500/70",
  invoice_raised: "bg-orange-600/70",
  collect_payment: "bg-pink-500/70",
  payment_received: "bg-emerald-500",
};

interface MEDDICPipelineProps {
  onNavigate?: (module: string) => void;
}

export function MEDDICPipeline({ onNavigate }: MEDDICPipelineProps) {
  const { formatCurrency } = useOrganizationSettings();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const { data: dealStats, isLoading } = useQuery({
    queryKey: ["meddic-pipeline-stats"],
    queryFn: async () => {
      const { data: deals, error } = await supabase
        .from("deals")
        .select("stage, value, closed_won_substage");

      if (error) throw error;

      const stageStats: Record<string, { count: number; value: number }> = {
        pipeline: { count: 0, value: 0 },
        qualified: { count: 0, value: 0 },
        proposal: { count: 0, value: 0 },
        negotiation: { count: 0, value: 0 },
        closed_won: { count: 0, value: 0 },
      };

      const substageStats: Record<string, { count: number; value: number }> = {};

      deals?.forEach(deal => {
        if (stageStats[deal.stage]) {
          stageStats[deal.stage].count++;
          stageStats[deal.stage].value += Number(deal.value) || 0;
        }

        if (deal.stage === "closed_won" && deal.closed_won_substage) {
          if (!substageStats[deal.closed_won_substage]) {
            substageStats[deal.closed_won_substage] = { count: 0, value: 0 };
          }
          substageStats[deal.closed_won_substage].count++;
          substageStats[deal.closed_won_substage].value += Number(deal.value) || 0;
        }
      });

      return { stageStats, substageStats };
    },
  });

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 border border-border animate-fade-in">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i}>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Each stage represents 20% of the sales progress (5 stages = 100%)
  const STAGE_PROGRESS: Record<string, number> = {
    pipeline: 20,
    qualified: 40,
    proposal: 60,
    negotiation: 80,
    closed_won: 100,
  };

  const stages: FunnelStage[] = [
    { 
      name: "Pipeline", 
      value: dealStats?.stageStats.pipeline.count || 0, 
      amount: dealStats?.stageStats.pipeline.value || 0, 
      color: "bg-sales/20",
      progress: STAGE_PROGRESS.pipeline,
    },
    { 
      name: "Qualified", 
      value: dealStats?.stageStats.qualified.count || 0, 
      amount: dealStats?.stageStats.qualified.value || 0, 
      color: "bg-sales/40",
      progress: STAGE_PROGRESS.qualified,
    },
    { 
      name: "Proposal", 
      value: dealStats?.stageStats.proposal.count || 0, 
      amount: dealStats?.stageStats.proposal.value || 0, 
      color: "bg-sales/60",
      progress: STAGE_PROGRESS.proposal,
    },
    { 
      name: "Negotiation", 
      value: dealStats?.stageStats.negotiation.count || 0, 
      amount: dealStats?.stageStats.negotiation.value || 0, 
      color: "bg-sales/80",
      progress: STAGE_PROGRESS.negotiation,
    },
    { 
      name: "Closed Won", 
      value: dealStats?.stageStats.closed_won.count || 0, 
      amount: dealStats?.stageStats.closed_won.value || 0, 
      color: "bg-sales",
      progress: STAGE_PROGRESS.closed_won,
      substages: Object.entries(dealStats?.substageStats || {}).map(([key, val]) => ({
        name: SUBSTAGE_LABELS[key] || key,
        value: val.count,
        amount: val.value,
        color: SUBSTAGE_COLORS[key] || "bg-sales/50",
      })),
    },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);
  const totalLeads = stages.reduce((sum, s) => sum + s.value, 0);
  const closedWon = stages.find(s => s.name === "Closed Won")?.value || 0;
  const conversionRate = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : "0";

  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div 
        className="flex items-center justify-between mb-6 cursor-pointer hover:opacity-80"
        // Clicking this widget should take users to the MEDDIC workflow (new flow)
        onClick={() => onNavigate?.("sales-meddic-workflow")}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">MEDDIC Pipeline</h3>
        </div>
        <select className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 text-muted-foreground">
          <option>All Time</option>
          <option>This Quarter</option>
          <option>Last Quarter</option>
          <option>This Year</option>
        </select>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const width = (stage.value / maxValue) * 100;
          const hasSubstages = stage.substages && stage.substages.length > 0;
          const isExpanded = expandedStage === stage.name;

          return (
            <div key={stage.name}>
              <div 
                className={cn("group", hasSubstages && "cursor-pointer")}
                onClick={() => hasSubstages && setExpandedStage(isExpanded ? null : stage.name)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {hasSubstages && (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {stage.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-sales/10 text-sales font-medium">
                      {stage.progress}%
                    </span>
                    {hasSubstages && (
                      <span className="text-xs text-muted-foreground">
                        ({stage.substages!.length} substages)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {stage.value.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-sales">
                      {formatCurrency(stage.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-lg transition-all duration-500 group-hover:opacity-80",
                      stage.color
                    )}
                    style={{
                      width: `${Math.max(width, 2)}%`,
                      transitionDelay: `${index * 100}ms`,
                    }}
                  />
                </div>
              </div>

              {/* Substages for Closed Won */}
              {hasSubstages && isExpanded && (
                <div className="ml-6 mt-2 space-y-2 animate-fade-in border-l-2 border-sales/30 pl-4">
                  {stage.substages!.map((substage, subIndex) => {
                    const subWidth = stage.value > 0 ? (substage.value / stage.value) * 100 : 0;
                    return (
                      <div key={substage.name} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {substage.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {substage.value}
                            </span>
                            <span className="text-xs font-semibold text-sales">
                              {formatCurrency(substage.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="h-5 bg-muted/20 rounded overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded transition-all duration-300",
                              substage.color
                            )}
                            style={{
                              width: `${Math.max(subWidth, 2)}%`,
                              transitionDelay: `${subIndex * 50}ms`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Conversion Rate
          </span>
          <span className="text-lg font-bold text-sales">{conversionRate}%</span>
        </div>
      </div>
    </div>
  );
}
