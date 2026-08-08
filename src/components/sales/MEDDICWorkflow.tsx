import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import { 
  Target, TrendingUp, Users, DollarSign, FileText, 
  CheckCircle2, Circle, ArrowRight, Zap, AlertTriangle,
  ChevronRight, Clock, Award, BarChart3, Settings,
  Sparkles, Play, Pause, RefreshCw, Info, History, Save,
  Trash2, Pencil, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClosedWonWorkflowInitiator } from "@/components/accounts/ClosedWonWorkflowInitiator";
import { MEDDICWizard } from "@/components/sales/MEDDICWizard";
import { DealWizard } from "@/components/sales/DealWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { workflows } from "@/lib/workflows";

// MEDDIC Framework Definition
const MEDDIC_CRITERIA = [
  {
    key: 'metrics',
    label: 'Metrics',
    shortLabel: 'M',
    description: 'Quantifiable measures of value the customer expects',
    placeholder: 'e.g., 30% cost reduction, 2x productivity increase, ROI within 6 months',
    icon: BarChart3,
    color: 'bg-blue-500',
    weight: 20,
    questions: [
      'What metrics does the customer use to measure success?',
      'How will they quantify the value of this solution?',
      'What is the expected ROI timeline?'
    ]
  },
  {
    key: 'economic_buyer',
    label: 'Economic Buyer',
    shortLabel: 'E',
    description: 'The person with budget authority and final decision power',
    placeholder: 'e.g., CFO John Smith - Controls IT budget, final approval authority',
    icon: DollarSign,
    color: 'bg-green-500',
    weight: 20,
    questions: [
      'Who has the authority to approve this budget?',
      'Have you met with the economic buyer directly?',
      'What are their priorities and concerns?'
    ]
  },
  {
    key: 'decision_criteria',
    label: 'Decision Criteria',
    shortLabel: 'D',
    description: 'The formal criteria used to evaluate and select a vendor',
    placeholder: 'e.g., Must have SOC2 certification, integrate with Salesforce, 99.9% uptime SLA',
    icon: FileText,
    color: 'bg-purple-500',
    weight: 15,
    questions: [
      'What are the must-have requirements?',
      'What are the nice-to-have features?',
      'How does our solution meet each criterion?'
    ]
  },
  {
    key: 'decision_process',
    label: 'Decision Process',
    shortLabel: 'D',
    description: 'The steps and timeline for making a purchase decision',
    placeholder: 'e.g., Tech eval → Security review → Legal → Procurement → Board approval by Q2',
    icon: Target,
    color: 'bg-orange-500',
    weight: 15,
    questions: [
      'What is the approval process?',
      'Who are all the stakeholders involved?',
      'What is the expected timeline for each step?'
    ]
  },
  {
    key: 'identify_pain',
    label: 'Identify Pain',
    shortLabel: 'I',
    description: 'The business pain points driving the purchase decision',
    placeholder: 'e.g., Current system causing 20hrs/week in manual work, compliance risk exposure',
    icon: AlertTriangle,
    color: 'bg-red-500',
    weight: 15,
    questions: [
      'What is the primary business pain?',
      'What happens if they do nothing?',
      'How urgent is solving this problem?'
    ]
  },
  {
    key: 'champion',
    label: 'Champion',
    shortLabel: 'C',
    description: 'An internal advocate who supports and sells your solution internally',
    placeholder: 'e.g., Sarah Lee (IT Director) - Strong advocate, presenting to leadership next week',
    icon: Award,
    color: 'bg-yellow-500',
    weight: 15,
    questions: [
      'Who is actively selling your solution internally?',
      'Do they have influence with the economic buyer?',
      'What can you do to support their efforts?'
    ]
  }
];

// Stage progression rules based on MEDDIC score
// NOTE: Stage values must match the backend enum `deal_stage`.
const STAGE_PROGRESSION_RULES = [
  { fromStage: 'pipeline', toStage: 'qualified', minScore: 30, label: 'Pipeline → Qualified' },
  { fromStage: 'qualified', toStage: 'proposal', minScore: 50, label: 'Qualified → Proposal' },
  { fromStage: 'proposal', toStage: 'negotiation', minScore: 70, label: 'Proposal → Negotiation' },
  { fromStage: 'negotiation', toStage: 'closed_won', minScore: 85, label: 'Negotiation → Closed Won' },
];

const STAGE_LABELS: Record<string, string> = {
  pipeline: 'Pipeline',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  upside: 'Upside',
  strong_upside: 'Strong Upside',
  commit: 'Commit',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  meddic_metrics?: string;
  meddic_economic_buyer?: string;
  meddic_decision_criteria?: string;
  meddic_decision_process?: string;
  meddic_identify_pain?: string;
  meddic_champion?: string;
  meddic_score?: number;
  auto_progression_enabled?: boolean;
  organization_name?: string;
  expected_close_date?: string;
  user_id: string;
  assigned_to?: string;
}

export function MEDDICWorkflow() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  // Local state for MEDDIC form values (to enable typing without triggering mutations)
  const [meddicFormValues, setMeddicFormValues] = useState<Record<string, string>>({});
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  // State for workflow initiator when deal moves to closed_won
  const [workflowDeal, setWorkflowDeal] = useState<Deal | null>(null);
  // State for MEDDIC wizard
  const [wizardDeal, setWizardDeal] = useState<Deal | null>(null);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  // State for new-deal wizard (adds a deal directly into the MEDDIC pipeline)
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);

  // Delete deal mutation with cascade
  const deleteDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const relatedTables = [
        "deal_activities", "deal_products", "deal_stage_progression_log",
        "quotations", "invoices", "estimates", "renewals",
        "inside_sales_prospects", "order_processing_requests",
        "accounts_workflows", "poc_requests", "demo_schedules",
        "technical_assessments", "rfp_responses", "customer_deliveries",
        "deal_registrations", "deal_contact_roles"
      ];
      for (const table of relatedTables) {
        await supabase.from(table as any).delete().eq("deal_id", dealId);
      }
      await supabase.from("projects").update({ deal_id: null } as any).eq("deal_id", dealId);
      await supabase.from("tenders").update({ deal_id: null } as any).eq("deal_id", dealId);
      const { error } = await supabase.from("deals").delete().eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setSelectedDeal(null);
      setDealToDelete(null);
      toast.success("Deal deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete deal: " + error.message);
    },
  });
  // Sync form values when deal changes
  useEffect(() => {
    if (selectedDeal) {
      const values: Record<string, string> = {};
      MEDDIC_CRITERIA.forEach(c => {
        const key = `meddic_${c.key}` as keyof Deal;
        values[c.key] = (selectedDeal[key] as string) || '';
      });
      setMeddicFormValues(values);
      setPendingSaves(new Set());
    }
  }, [selectedDeal?.id]);

  // Fetch deals with MEDDIC data
  const { data: deals, isLoading, isFetching } = useQuery({
    queryKey: ['deals-meddic', currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('deals')
        .select('*')
        .not('stage', 'in', '("closed_lost")');
      if (currentTenant?.id) query = query.eq('tenant_id', currentTenant.id);
      const { data, error } = await query.order('meddic_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Deal[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: Deal[] | undefined) => prev,
  });

  // Create a new deal straight from the MEDDIC board
  const createDeal = useMutation({
    mutationFn: async (data: any) => {
      const nowIso = new Date().toISOString();
      const { data: created, error } = await supabase
        .from('deals')
        .insert({
          title: String(data.title || '').trim(),
          value: parseFloat(data.value) || 0,
          stage: data.stage || 'pipeline',
          description: String(data.description || '').trim() || null,
          expected_close_date: data.expected_close_date || null,
          probability: parseInt(data.probability) || 10,
          contact_id: data.contact_id || null,
          user_id: user!.id,
          tenant_id: currentTenant?.id,
          organization_name: String(data.organization_name || '').trim(),
          problem_requirement: String(data.problem_requirement || '').trim(),
          deal_type: data.deal_type === 'cross_sale' ? 'replacement' : 'new',
          existing_solution: data.deal_type === 'cross_sale' ? String(data.existing_solution || '').trim() : null,
          quantity: parseInt(data.quantity) || 1,
          buying_timeline: data.buying_timeline || null,
          is_budgeted: !!data.is_budgeted,
          tentative_budget: parseFloat(data.tentative_budget) || 0,
          next_steps: String(data.next_steps || '').trim(),
          solution_id: data.solution_id || null,
          alliance_organization_id: data.alliance_organization_id || null,
          requirement_category: data.requirement_category || null,
          last_stage_change_at: nowIso,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      return created as Deal;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsNewDealOpen(false);
      setSelectedDeal(created);
      toast.success('Deal added to MEDDIC pipeline');
    },
    onError: (error: any) => toast.error('Failed to create deal: ' + error.message),
  });

  // Fetch progression history
  const { data: progressionHistory } = useQuery({
    queryKey: ['progression-history', selectedDeal?.id],
    queryFn: async () => {
      if (!selectedDeal) return [];
      const { data, error } = await supabase
        .from('deal_stage_progression_log')
        .select('*')
        .eq('deal_id', selectedDeal.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDeal
  });

  // Update MEDDIC fields
  const updateMeddic = useMutation({
    mutationFn: async ({ dealId, field, value }: { dealId: string; field: string; value: string }) => {
      const fieldName = `meddic_${field}`;
      const updateData: Record<string, any> = { [fieldName]: value };
      
      // Recalculate MEDDIC score - any non-empty value counts
      const deal = deals?.find(d => d.id === dealId);
      let score = 0;
      let currentStage = deal?.stage || 'pipeline';
      
      if (deal) {
        MEDDIC_CRITERIA.forEach(c => {
          const key = `meddic_${c.key}` as keyof Deal;
          const fieldValue = c.key === field ? value : deal[key];
          // Count as complete if has meaningful content (at least 3 chars)
          if (fieldValue && String(fieldValue).trim().length >= 3) {
            score += c.weight;
          }
        });
        updateData.meddic_score = score;
      }

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);
      
      if (error) throw error;
      return { newScore: score, dealId, currentStage, autoProgressEnabled: deal?.auto_progression_enabled !== false };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
      
      if (selectedDeal && result.dealId === selectedDeal.id) {
        setSelectedDeal(prev => prev ? { ...prev, meddic_score: result.newScore } : null);
      }
      
      toast.success(`MEDDIC updated - Score: ${result.newScore}%`);
      
      // Check for auto-progression with the NEW score - chain through all eligible stages
      if (result.autoProgressEnabled) {
        // Find the final stage this score qualifies for by chaining through rules
        let currentStage = result.currentStage;
        let finalStage = currentStage;
        
        // Keep progressing through stages as long as score meets thresholds
        let iterations = 0;
        while (iterations < 10) { // Safety limit
          const nextRule = STAGE_PROGRESSION_RULES.find(
            r => r.fromStage === finalStage && result.newScore >= r.minScore
          );
          if (nextRule) {
            finalStage = nextRule.toStage;
            iterations++;
          } else {
            break;
          }
        }

        // If we can progress to a higher stage, do it
        if (finalStage !== currentStage) {
          toast.info(`🚀 Score ${result.newScore}% reached! Progressing to ${STAGE_LABELS[finalStage]}...`);
          
          // Slight delay for UX
          setTimeout(() => {
            progressDeal.mutate({
              dealId: result.dealId,
              fromStage: currentStage,
              toStage: finalStage
            });
          }, 500);
        }
      }
    }
  });

  // Auto-progress deal
  const progressDeal = useMutation({
    mutationFn: async ({ dealId, fromStage, toStage }: { dealId: string; fromStage: string; toStage: string }) => {
      const nowIso = new Date().toISOString();

      // Update deal stage
      const { error: dealError } = await supabase
        .from("deals")
        .update({
          stage: toStage as any,
          last_stage_change_at: nowIso,
          ...(toStage === "closed_won" ? { actual_close_date: nowIso } : {}),
        })
        .eq("id", dealId);

      if (dealError) throw dealError;

      // Log progression
      const { error: logError } = await supabase.from("deal_stage_progression_log").insert({
        deal_id: dealId,
        from_stage: fromStage,
        to_stage: toStage,
        progression_type: "auto",
        meddic_score_at_change: selectedDeal?.meddic_score || 0,
        triggered_by: user?.id,
        trigger_reason: "MEDDIC score threshold reached",
      });

      if (logError) throw logError;

      // If closed won, notify everyone (handled server-side)
      if (toStage === "closed_won") {
        await workflows.dealStageChanged(dealId, fromStage, toStage);
      }

      return { dealId, toStage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["deals-meddic"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["meddic-pipeline-stats"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // If progressed to closed_won, show celebration and workflow initiator
      if (result.toStage === "closed_won") {
        const wonDeal = deals?.find((d) => d.id === result.dealId);

        // Show big celebration toast
        toast.success("🎉🏆🎊 CONGRATULATIONS! 🎊🏆🎉", {
          description: `Deal "${wonDeal?.title || "Deal"}" has been WON! 🥳✨🎈`,
          duration: 8000,
        });

        if (wonDeal) {
          setWorkflowDeal(wonDeal);
          setSelectedDeal(null); // Close the deal sheet
        }
      } else {
        toast.success("Deal progressed to next stage!");
      }
    },
  });


  // Toggle auto progression
  const toggleAutoProgression = useMutation({
    mutationFn: async ({ dealId, enabled }: { dealId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('deals')
        .update({ auto_progression_enabled: enabled })
        .eq('id', dealId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
      toast.success('Auto-progression setting updated');
    }
  });

  const checkAutoProgression = () => {
    if (!selectedDeal || !selectedDeal.auto_progression_enabled) return;
    
    const score = selectedDeal.meddic_score || 0;
    const rule = STAGE_PROGRESSION_RULES.find(
      r => r.fromStage === selectedDeal.stage && score >= r.minScore
    );

    if (rule) {
      toast.info(
        `Ready to progress: ${STAGE_LABELS[rule.fromStage]} → ${STAGE_LABELS[rule.toStage]}`,
        {
          action: {
            label: 'Progress Now',
            onClick: () => progressDeal.mutate({
              dealId: selectedDeal.id,
              fromStage: rule.fromStage,
              toStage: rule.toStage
            })
          }
        }
      );
    }
  };

  const getMeddicValue = (deal: Deal, key: string): string => {
    const fieldKey = `meddic_${key}` as keyof Deal;
    return (deal[fieldKey] as string) || '';
  };

  const calculateMeddicScore = (deal: Deal): number => {
    let score = 0;
    MEDDIC_CRITERIA.forEach(c => {
      const value = getMeddicValue(deal, c.key);
      // Count as complete if has meaningful content (at least 3 chars)
      if (value && value.trim().length >= 3) {
        score += c.weight;
      }
    });
    return score;
  };

  const getNextStageInfo = (deal: Deal) => {
    const score = deal.meddic_score || calculateMeddicScore(deal);
    const rule = STAGE_PROGRESSION_RULES.find(r => r.fromStage === deal.stage);
    if (!rule) return null;
    
    const progress = Math.min((score / rule.minScore) * 100, 100);
    const canProgress = score >= rule.minScore;
    
    return { rule, progress, canProgress, currentScore: score };
  };

  // Group deals by stage
  const dealsByStage = deals?.reduce((acc, deal) => {
    if (!acc[deal.stage]) acc[deal.stage] = [];
    acc[deal.stage].push(deal);
    return acc;
  }, {} as Record<string, Deal[]>) || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            MEDDIC Workflow
          </h2>
          <p className="text-muted-foreground">
            Qualify deals using MEDDIC methodology with automatic stage progression
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button onClick={() => setIsNewDealOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="font-semibold mb-1">MEDDIC Methodology</p>
              <p className="text-sm">
                MEDDIC is a sales qualification framework: Metrics, Economic Buyer, 
                Decision Criteria, Decision Process, Identify Pain, Champion. 
                Complete each criterion to auto-progress deals.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        </div>
      </div>

      {/* New Deal Wizard */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Deal to MEDDIC Pipeline</DialogTitle>
          </DialogHeader>
          <DealWizard
            onSubmit={(data) => createDeal.mutate(data)}
            onCancel={() => setIsNewDealOpen(false)}
            isSubmitting={createDeal.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* MEDDIC Score Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">MEDDIC Components:</span>
            {MEDDIC_CRITERIA.map(c => (
              <div key={c.key} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full ${c.color} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">{c.shortLabel}</span>
                </div>
                <span className="text-sm">{c.label}</span>
                <Badge variant="outline" className="text-xs">{c.weight}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {['pipeline', 'qualified', 'proposal', 'negotiation', 'closed_won'].map((stage, idx) => {
          const stageDeals = dealsByStage[stage] || [];
          const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);
          const avgScore = stageDeals.length > 0 
            ? Math.round(stageDeals.reduce((sum, d) => sum + (d.meddic_score || 0), 0) / stageDeals.length)
            : 0;
          const rule = STAGE_PROGRESSION_RULES.find(r => r.fromStage === stage);

          return (
            <Card key={stage} className="relative overflow-hidden">
              {/* Stage Progress Indicator */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 bg-primary/20"
              >
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(idx + 1) * 20}%` }}
                />
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{STAGE_LABELS[stage]}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatCurrency(totalValue)}</span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Avg: {avgScore}%
                  </span>
                </div>
                {rule && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Need {rule.minScore}% to progress
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {stageDeals.map(deal => {
                  const nextStage = getNextStageInfo(deal);
                  const score = deal.meddic_score || calculateMeddicScore(deal);

                  return (
                    <div
                      key={deal.id}
                      className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDeal(deal);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDeal(deal);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate max-w-[100px]">
                          {deal.title}
                        </span>
                        <div className="flex items-center gap-1">
                          {nextStage?.canProgress && (
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedDeal(deal); }}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit / Enrich
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDealToDelete(deal); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.organization_name || 'No organization'}
                      </p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>MEDDIC: {score}%</span>
                          <span className="text-muted-foreground">{formatCurrency(deal.value)}</span>
                        </div>
                        <Progress 
                          value={score} 
                          className="h-1.5"
                        />
                      </div>
                      {/* MEDDIC Mini Indicators */}
                      <div className="flex gap-1 mt-2 pointer-events-none">
                        {MEDDIC_CRITERIA.map(c => {
                          const hasValue = getMeddicValue(deal, c.key).length >= 3;
                          return (
                            <div
                              key={c.key}
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                hasValue ? c.color + ' text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                              }`}
                            >
                              {c.shortLabel}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {stageDeals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No deals in this stage
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Deal Detail Sheet */}
      <Sheet open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedDeal && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    {selectedDeal.title}
                    <Badge>{STAGE_LABELS[selectedDeal.stage]}</Badge>
                  </SheetTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDealToDelete(selectedDeal)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <SheetDescription>
                  {selectedDeal.organization_name} • {formatCurrency(selectedDeal.value)}
                </SheetDescription>
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="meddic">MEDDIC</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Score Summary */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">MEDDIC Score</p>
                          <p className="text-3xl font-bold">{selectedDeal.meddic_score || 0}%</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="auto-progress">Auto-Progress</Label>
                            <Switch
                              id="auto-progress"
                              checked={selectedDeal.auto_progression_enabled !== false}
                              onCheckedChange={(checked) => 
                                toggleAutoProgression.mutate({ 
                                  dealId: selectedDeal.id, 
                                  enabled: checked 
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <Progress value={selectedDeal.meddic_score || 0} className="h-3" />
                      
                      {/* Launch MEDDIC Wizard Button */}
                      <Button 
                        className="w-full mt-4"
                        onClick={() => {
                          setWizardDeal(selectedDeal);
                          setSelectedDeal(null);
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Open Detailed MEDDIC Wizard
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Next Stage Readiness */}
                  {(() => {
                    const nextStage = getNextStageInfo(selectedDeal);
                    if (!nextStage) return null;

                    return (
                      <Card className={nextStage.canProgress ? 'border-primary' : ''}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Next Stage: {STAGE_LABELS[nextStage.rule.toStage]}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm">
                              {nextStage.currentScore}% / {nextStage.rule.minScore}% required
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(nextStage.progress)}% ready
                            </span>
                          </div>
                          <Progress value={nextStage.progress} className="h-2 mb-4" />
                          
                          {nextStage.canProgress ? (
                            <Button 
                              className="w-full"
                              onClick={() => progressDeal.mutate({
                                dealId: selectedDeal.id,
                                fromStage: selectedDeal.stage,
                                toStage: nextStage.rule.toStage
                              })}
                              disabled={progressDeal.isPending}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Progress to {STAGE_LABELS[nextStage.rule.toStage]}
                            </Button>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">
                              Complete more MEDDIC criteria to unlock progression
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* MEDDIC Completion Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">MEDDIC Completion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {MEDDIC_CRITERIA.map(c => {
                          const value = getMeddicValue(selectedDeal, c.key);
                          const isComplete = value.length >= 3;
                          const Icon = c.icon;

                          return (
                            <div
                              key={c.key}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                isComplete ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
                              }`}
                              onClick={() => setActiveTab('meddic')}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-full ${isComplete ? c.color : 'bg-muted'}`}>
                                  <Icon className={`h-3 w-3 ${isComplete ? 'text-white' : 'text-muted-foreground'}`} />
                                </div>
                                <span className={`text-sm font-medium ${isComplete ? '' : 'text-muted-foreground'}`}>
                                  {c.label}
                                </span>
                                {isComplete && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="meddic" className="space-y-4 mt-4">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-4 pr-4">
                      {MEDDIC_CRITERIA.map(c => {
                        const savedValue = getMeddicValue(selectedDeal, c.key);
                        const currentValue = meddicFormValues[c.key] ?? savedValue;
                        const isComplete = currentValue.length >= 3;
                        const hasChanges = currentValue !== savedValue;
                        const Icon = c.icon;

                        return (
                          <Card key={c.key} className={isComplete ? 'border-primary/30' : ''}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <div className={`p-1.5 rounded-full ${c.color}`}>
                                    <Icon className="h-4 w-4 text-white" />
                                  </div>
                                  {c.label}
                                  <Badge variant="outline" className="text-xs">{c.weight}%</Badge>
                                  {hasChanges && (
                                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
                                      Unsaved
                                    </Badge>
                                  )}
                                </CardTitle>
                                {isComplete && !hasChanges && <CheckCircle2 className="h-5 w-5 text-primary" />}
                              </div>
                              <CardDescription>{c.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Textarea
                                placeholder={c.placeholder}
                                value={currentValue}
                                onChange={(e) => {
                                  setMeddicFormValues(prev => ({
                                    ...prev,
                                    [c.key]: e.target.value
                                  }));
                                }}
                                className="min-h-[80px]"
                              />
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground mb-1">Key questions to answer:</p>
                                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                                    {c.questions.map((q, i) => (
                                      <li key={i}>{q}</li>
                                    ))}
                                  </ul>
                                </div>
                                {hasChanges && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateMeddic.mutate({
                                        dealId: selectedDeal.id,
                                        field: c.key,
                                        value: currentValue
                                      });
                                    }}
                                    disabled={updateMeddic.isPending}
                                    className="ml-2"
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Stage Progression History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressionHistory && progressionHistory.length > 0 ? (
                        <div className="space-y-4">
                          {progressionHistory.map((log: any) => (
                            <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                              <div className={`p-2 rounded-full ${
                                log.progression_type === 'auto' ? 'bg-primary/10' : 'bg-muted'
                              }`}>
                                {log.progression_type === 'auto' ? (
                                  <Zap className="h-4 w-4 text-primary" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{STAGE_LABELS[log.from_stage]}</Badge>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  <Badge>{STAGE_LABELS[log.to_stage]}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {log.trigger_reason || 'Manual progression'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  MEDDIC Score: {log.meddic_score_at_change}% • {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No progression history yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Workflow Initiator Dialog - shows when deal is progressed to closed_won */}
      {workflowDeal && (
        <ClosedWonWorkflowInitiator
          deal={{
            id: workflowDeal.id,
            title: workflowDeal.title,
            value: Number(workflowDeal.value),
            organization_name: workflowDeal.organization_name,
            order_type: (workflowDeal as any).order_type,
            includes_support: (workflowDeal as any).includes_support || false,
            includes_managed_service: (workflowDeal as any).includes_managed_service || false,
            includes_renewal: (workflowDeal as any).includes_renewal || false,
            meddic_identify_pain: workflowDeal.meddic_identify_pain || '',
            meddic_decision_criteria: workflowDeal.meddic_decision_criteria || '',
          }}
          open={!!workflowDeal}
          onOpenChange={(open) => !open && setWorkflowDeal(null)}
          onWorkflowCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
            queryClient.invalidateQueries({ queryKey: ['deals'] });
            queryClient.invalidateQueries({ queryKey: ['post-sale-workflows'] });
          }}
        />
      )}

      {/* MEDDIC Wizard */}
      {wizardDeal && (
        <MEDDICWizard
          deal={{
            id: wizardDeal.id,
            title: wizardDeal.title,
            organization_name: wizardDeal.organization_name,
            problem_requirement: (wizardDeal as any).problem_requirement,
            meddic_details: (wizardDeal as any).meddic_details,
            customer_environment: (wizardDeal as any).customer_environment,
            meddic_current_stage: (wizardDeal as any).meddic_current_stage,
          }}
          open={!!wizardDeal}
          onOpenChange={(open) => !open && setWizardDeal(null)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
            queryClient.invalidateQueries({ queryKey: ['deals'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!dealToDelete} onOpenChange={(open) => !open && setDealToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{dealToDelete?.title}"? This will also remove all related activities, quotations, invoices, and other associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => dealToDelete && deleteDeal.mutate(dealToDelete.id)}
            >
              {deleteDeal.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
