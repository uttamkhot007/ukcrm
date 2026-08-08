import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RevalidationBar, RevalidationBadge } from "@/components/shared/RevalidationIndicator";
import { QuickAddLeadDialog } from "./QuickAddLeadDialog";

import { toast } from "sonner";
import { Brain, RefreshCw, TrendingUp, AlertCircle, CheckCircle, Zap, Plus } from "lucide-react";


interface LeadScore {
  score: number;
  breakdown: {
    company_presence: number;
    email_quality: number;
    source_quality: number;
    engagement: number;
    industry_fit: number;
  };
  insights: string;
  recommended_actions: string[];
}

type SegmentKey = "hot" | "warm" | "cool" | "unscored";

const SEGMENTS: { key: SegmentKey; label: string; min?: number; max?: number }[] = [
  { key: "hot", label: "Hot", min: 80 },
  { key: "warm", label: "Warm", min: 60, max: 80 },
  { key: "cool", label: "Cool", min: 1, max: 60 },
  { key: "unscored", label: "Unscored" },
];

const PAGE_SIZE = 20;

function applySegmentFilter(query: any, segment: SegmentKey) {
  const def = SEGMENTS.find((s) => s.key === segment)!;
  if (segment === "unscored") return query.is("lead_score", null);
  let q = query.gte("lead_score", def.min);
  if (def.max !== undefined) q = q.lt("lead_score", def.max);
  return q;
}

export function LeadScoring() {
  const queryClient = useQueryClient();
  const [scoringLeadId, setScoringLeadId] = useState<string | null>(null);
  const [segment, setSegment] = useState<SegmentKey>("hot");
  const [page, setPage] = useState(0);

  const changeSegment = (next: SegmentKey) => {
    setSegment(next);
    setPage(0);
  };

  // Lightweight counts per segment (head-only, no rows transferred)
  const { data: counts } = useQuery({
    queryKey: ["lead-score-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        SEGMENTS.map(async (s) => {
          const base = supabase.from("leads").select("id", { count: "exact", head: true });
          const { count, error } = await applySegmentFilter(base, s.key);
          if (error) throw error;
          return [s.key, count || 0] as const;
        })
      );
      const total = await supabase.from("leads").select("id", { count: "exact", head: true });
      return {
        ...Object.fromEntries(entries),
        total: total.count || 0,
      } as Record<SegmentKey | "total", number>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const { data: leads, isLoading, isFetching } = useQuery({
    queryKey: ['leads-with-scores', segment, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const base = supabase
        .from('leads')
        .select('*')
        .order('lead_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      const { data, error } = await applySegmentFilter(base, segment);

      if (error) throw error;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: any) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leads-with-scores'] });
    queryClient.invalidateQueries({ queryKey: ['lead-score-counts'] });
  };

  const scoreLead = useMutation({
    mutationFn: async (lead: any) => {
      setScoringLeadId(lead.id);
      const { data, error } = await supabase.functions.invoke('sales-ai-insights', {
        body: { action: 'score_lead', data: { lead } }
      });
      
      if (error) throw error;
      return data as LeadScore;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Lead scored successfully");
    },
    onError: (error) => {
      toast.error("Failed to score lead: " + error.message);
    },
    onSettled: () => {
      setScoringLeadId(null);
    }
  });

  const scoreAllLeads = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .is('lead_score', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      for (const lead of data || []) {
        await scoreLead.mutateAsync(lead);
      }
    },
    onSuccess: () => {
      toast.success("All leads scored");
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Hot", variant: "default" as const, icon: Zap };
    if (score >= 60) return { label: "Warm", variant: "secondary" as const, icon: TrendingUp };
    if (score >= 40) return { label: "Cool", variant: "outline" as const, icon: AlertCircle };
    return { label: "Cold", variant: "destructive" as const, icon: AlertCircle };
  };

  const isRevalidating = isFetching && !isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading lead scores">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
        <span className="sr-only">Loading lead scores…</span>
      </div>
    );
  }


  const segmentCount = counts?.[segment] ?? 0;
  const unscoredCount = counts?.unscored ?? 0;
  const pageCount = Math.max(1, Math.ceil(segmentCount / PAGE_SIZE));


  return (
    <div className="space-y-6">
      <RevalidationBar active={isRevalidating} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Lead Scoring
            <RevalidationBadge active={isRevalidating} label="Refreshing scores…" />
          </h2>
          <p className="text-muted-foreground">AI-powered lead scoring to identify hot prospects</p>
        </div>

        <Button
          onClick={() => scoreAllLeads.mutate()}
          disabled={scoreAllLeads.isPending || unscoredCount === 0}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${scoreAllLeads.isPending ? 'animate-spin' : ''}`} />
          Score Next 10 ({unscoredCount})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-green-500">{counts?.hot ?? 0}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
                <p className="text-2xl font-bold text-yellow-500">{counts?.warm ?? 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{counts?.total ?? 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unscored</p>
                <p className="text-2xl font-bold text-muted-foreground">{unscoredCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segment selector */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Lead score segments">
        {SEGMENTS.map((s) => (
          <Button
            key={s.key}
            role="tab"
            aria-selected={segment === s.key}
            size="sm"
            variant={segment === s.key ? "default" : "outline"}
            onClick={() => changeSegment(s.key)}
          >
            {s.label} ({counts?.[s.key] ?? 0})
          </Button>
        ))}
      </div>


      {/* Lead List */}
      <div className="space-y-4">
        {leads?.map((lead) => {
          const score = lead.lead_score || 0;
          const badge = getScoreBadge(score);
          const BadgeIcon = badge.icon;
          const breakdown = lead.score_breakdown as LeadScore['breakdown'] | null;

          return (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{lead.title || 'Unnamed Lead'}</h3>
                      {score > 0 && (
                        <Badge variant={badge.variant} className="flex items-center gap-1">
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{lead.source || 'Unknown'} • {lead.status}</p>
                    
                    {lead.ai_insights && (
                      <p className="mt-2 text-sm bg-muted/50 p-2 rounded">{lead.ai_insights}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {score > 0 ? (
                      <div className="text-center">
                        <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => scoreLead.mutate(lead)}
                        disabled={scoringLeadId === lead.id}
                      >
                        {scoringLeadId === lead.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-1" />
                            Score
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {breakdown && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {Object.entries(breakdown).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <Progress value={value * 5} className="h-2 mb-1" />
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-medium">{value}/20</p>
                      </div>
                    ))}
                  </div>
                )}

                {score > 0 && (
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last scored: {lead.last_scored_at ? new Date(lead.last_scored_at).toLocaleDateString() : 'Never'}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => scoreLead.mutate(lead)}
                      disabled={scoringLeadId === lead.id}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${scoringLeadId === lead.id ? 'animate-spin' : ''}`} />
                      Rescore
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!leads || leads.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No leads in this segment.
            </CardContent>
          </Card>
        )}
      </div>

      {segmentCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, segmentCount)} of {segmentCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {pageCount}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1 || isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
