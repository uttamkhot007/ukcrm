import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BarChart3,
  DollarSign,
  FileText,
  Target,
  AlertTriangle,
  Award,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
  Lock,
  Building2,
  Server,
  Shield,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// Detailed MEDDIC stages with sub-questions
const MEDDIC_STAGES = [
  {
    id: 'customer_environment',
    label: 'Customer Environment',
    shortLabel: 'ENV',
    icon: Building2,
    color: 'bg-slate-500',
    description: 'Understand the customer\'s current situation and infrastructure',
    subQuestions: [
      { id: 'org_overview', label: 'Organization Overview', placeholder: 'Company size, industry, key business lines...' },
      { id: 'existing_infra', label: 'Existing Infrastructure', placeholder: 'Current systems, tools, platforms in use...' },
      { id: 'security_posture', label: 'Current Security Posture', placeholder: 'Existing security tools, compliance requirements...' },
      { id: 'key_stakeholders', label: 'Key Stakeholders', placeholder: 'IT team structure, decision makers, influencers...' },
    ],
  },
  {
    id: 'metrics',
    label: 'Metrics',
    shortLabel: 'M',
    icon: BarChart3,
    color: 'bg-blue-500',
    description: 'Quantifiable measures of value the customer expects',
    subQuestions: [
      { id: 'success_metrics', label: 'What metrics does the customer use to measure success?', placeholder: 'e.g., Uptime %, incident response time, cost per user...' },
      { id: 'quantify_value', label: 'How will they quantify the value of this solution?', placeholder: 'e.g., Time saved, cost reduction, risk mitigation value...' },
      { id: 'roi_timeline', label: 'What is the expected ROI timeline?', placeholder: 'e.g., Break-even in 6 months, 300% ROI in year 1...' },
    ],
  },
  {
    id: 'economic_buyer',
    label: 'Economic Buyer',
    shortLabel: 'E',
    icon: DollarSign,
    color: 'bg-green-500',
    description: 'The person with budget authority and final decision power',
    subQuestions: [
      { id: 'budget_authority', label: 'Who has the authority to approve this budget?', placeholder: 'Name, title, department...' },
      { id: 'met_buyer', label: 'Have you met with the economic buyer directly?', placeholder: 'Yes/No, meeting dates, outcomes...' },
      { id: 'buyer_priorities', label: 'What are their priorities and concerns?', placeholder: 'Cost control, risk management, growth initiatives...' },
      { id: 'budget_cycle', label: 'What is their budget cycle and approval process?', placeholder: 'Fiscal year, Q1 planning, approval limits...' },
    ],
  },
  {
    id: 'decision_criteria',
    label: 'Decision Criteria',
    shortLabel: 'D',
    icon: FileText,
    color: 'bg-purple-500',
    description: 'The formal criteria used to evaluate and select a vendor',
    subQuestions: [
      { id: 'must_have', label: 'What are the must-have requirements?', placeholder: 'Technical requirements, certifications, integrations...' },
      { id: 'nice_to_have', label: 'What are the nice-to-have features?', placeholder: 'Additional capabilities, future roadmap alignment...' },
      { id: 'solution_fit', label: 'How does our solution meet each criterion?', placeholder: 'Feature mapping, compliance coverage, gaps...' },
      { id: 'competitive_edge', label: 'What differentiates us from competition?', placeholder: 'Unique capabilities, pricing, support...' },
    ],
  },
  {
    id: 'decision_process',
    label: 'Decision Process',
    shortLabel: 'D',
    icon: Target,
    color: 'bg-orange-500',
    description: 'The steps and timeline for making a purchase decision',
    subQuestions: [
      { id: 'approval_steps', label: 'What is the approval process?', placeholder: 'Technical eval → Security → Legal → Procurement...' },
      { id: 'stakeholders', label: 'Who are all the stakeholders involved?', placeholder: 'Names, roles, influence level...' },
      { id: 'timeline', label: 'What is the expected timeline for each step?', placeholder: 'Week 1: Demo, Week 2-3: POC, Week 4: Approval...' },
      { id: 'blockers', label: 'What could delay or block the decision?', placeholder: 'Budget freeze, competing priorities, key person OOO...' },
    ],
  },
  {
    id: 'identify_pain',
    label: 'Identify Pain',
    shortLabel: 'I',
    icon: AlertTriangle,
    color: 'bg-red-500',
    description: 'The business pain points driving the purchase decision',
    subQuestions: [
      { id: 'primary_pain', label: 'What is the primary business pain?', placeholder: 'Manual processes, security gaps, compliance risk...' },
      { id: 'cost_of_inaction', label: 'What happens if they do nothing?', placeholder: 'Continued losses, increased risk, missed opportunities...' },
      { id: 'urgency', label: 'How urgent is solving this problem?', placeholder: 'Critical/High/Medium/Low, deadline drivers...' },
      { id: 'pain_impact', label: 'Who is most affected by this pain?', placeholder: 'Departments, roles, quantified impact...' },
    ],
  },
  {
    id: 'champion',
    label: 'Champion',
    shortLabel: 'C',
    icon: Award,
    color: 'bg-yellow-500',
    description: 'An internal advocate who supports and sells your solution internally',
    subQuestions: [
      { id: 'champion_identity', label: 'Who is actively selling your solution internally?', placeholder: 'Name, title, department, motivation...' },
      { id: 'champion_influence', label: 'Do they have influence with the economic buyer?', placeholder: 'Relationship, access, credibility...' },
      { id: 'champion_support', label: 'What can you do to support their efforts?', placeholder: 'Materials, data, executive sponsorship...' },
      { id: 'backup_champion', label: 'Is there a backup champion?', placeholder: 'Alternative advocates, their roles...' },
    ],
  },
];

interface MEDDICWizardProps {
  deal: {
    id: string;
    title: string;
    organization_name?: string;
    problem_requirement?: string;
    meddic_details?: Record<string, Record<string, string>>;
    customer_environment?: Record<string, string>;
    meddic_current_stage?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function MEDDICWizard({ deal, open, onOpenChange, onComplete }: MEDDICWizardProps) {
  const queryClient = useQueryClient();
  
  // Initialize current stage from deal or default to first stage
  const initialStageIndex = MEDDIC_STAGES.findIndex(s => s.id === deal.meddic_current_stage);
  const [currentStageIndex, setCurrentStageIndex] = useState(initialStageIndex >= 0 ? initialStageIndex : 0);
  
  // Form values for all stages
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>(() => {
    return deal.meddic_details || {};
  });
  
  // AI insights
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  // Expanded sections
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  
  const currentStage = MEDDIC_STAGES[currentStageIndex];
  const currentStageValues = formValues[currentStage.id] || {};
  
  // Check if current stage is complete (all questions answered)
  const isStageComplete = (stageId: string) => {
    const stage = MEDDIC_STAGES.find(s => s.id === stageId);
    if (!stage) return false;
    const values = formValues[stageId] || {};
    return stage.subQuestions.every(q => values[q.id]?.trim().length >= 3);
  };
  
  // Calculate overall progress
  const completedStages = MEDDIC_STAGES.filter(s => isStageComplete(s.id)).length;
  const overallProgress = (completedStages / MEDDIC_STAGES.length) * 100;
  
  // Update a specific answer
  const updateAnswer = (questionId: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [currentStage.id]: {
        ...(prev[currentStage.id] || {}),
        [questionId]: value,
      },
    }));
  };
  
  // Toggle question expansion
  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('deals')
        .update({
          meddic_details: formValues as any,
          meddic_current_stage: currentStage.id,
          // Also update legacy single-text MEDDIC fields for backwards compatibility
          meddic_metrics: Object.values(formValues.metrics || {}).filter(Boolean).join('\n'),
          meddic_economic_buyer: Object.values(formValues.economic_buyer || {}).filter(Boolean).join('\n'),
          meddic_decision_criteria: Object.values(formValues.decision_criteria || {}).filter(Boolean).join('\n'),
          meddic_decision_process: Object.values(formValues.decision_process || {}).filter(Boolean).join('\n'),
          meddic_identify_pain: Object.values(formValues.identify_pain || {}).filter(Boolean).join('\n'),
          meddic_champion: Object.values(formValues.champion || {}).filter(Boolean).join('\n'),
          customer_environment: formValues.customer_environment as any,
        })
        .eq('id', deal.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-meddic'] });
      toast.success('Progress saved!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save');
    },
  });
  
  // Get AI insights
  const getAIInsights = async () => {
    setIsLoadingInsights(true);
    setAiInsights(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('meddic-insights', {
        body: {
          stage: currentStage.id,
          currentAnswers: currentStageValues,
          customerContext: {
            organizationName: deal.organization_name,
            problemRequirement: deal.problem_requirement,
            existingInfra: formValues.customer_environment?.existing_infra,
          },
        },
      });
      
      if (error) throw error;
      setAiInsights(data.insights);
    } catch (error: any) {
      console.error('AI insights error:', error);
      if (error.message?.includes('429') || error.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402') || error.status === 402) {
        toast.error('AI credits exhausted. Please add funds.');
      } else {
        toast.error('Failed to get AI insights');
      }
    } finally {
      setIsLoadingInsights(false);
    }
  };
  
  // Navigation
  const goToNextStage = () => {
    if (currentStageIndex < MEDDIC_STAGES.length - 1) {
      saveMutation.mutate();
      setCurrentStageIndex(prev => prev + 1);
      setAiInsights(null);
    }
  };
  
  const goToPreviousStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(prev => prev - 1);
      setAiInsights(null);
    }
  };
  
  const canProceed = isStageComplete(currentStage.id);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            MEDDIC Qualification Wizard
          </SheetTitle>
          <SheetDescription>
            {deal.title} • {deal.organization_name || 'Unknown Organization'}
          </SheetDescription>
        </SheetHeader>
        
        {/* Progress Overview */}
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{completedStages}/{MEDDIC_STAGES.length} stages</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          
          {/* Stage Indicators */}
          <div className="flex items-center gap-1 justify-between">
            {MEDDIC_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isComplete = isStageComplete(stage.id);
              const isCurrent = idx === currentStageIndex;
              const isLocked = idx > currentStageIndex && !isStageComplete(MEDDIC_STAGES[idx - 1]?.id);
              
              return (
                <button
                  key={stage.id}
                  onClick={() => !isLocked && setCurrentStageIndex(idx)}
                  disabled={isLocked}
                  className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    isCurrent 
                      ? 'bg-primary/10 border-2 border-primary' 
                      : isComplete 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : isLocked 
                          ? 'bg-muted/30 opacity-50 cursor-not-allowed'
                          : 'hover:bg-accent cursor-pointer'
                  }`}
                >
                  <div className={`p-1.5 rounded-full ${isCurrent ? stage.color : isComplete ? 'bg-green-500' : 'bg-muted'}`}>
                    {isComplete ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : isLocked ? (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <Icon className={`w-3 h-3 ${isCurrent ? 'text-white' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <span className="text-[10px] font-medium truncate max-w-full">{stage.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <Separator />
        
        {/* Current Stage Content */}
        <ScrollArea className="flex-1 pr-4">
          <div className="py-4 space-y-4">
            {/* Stage Header */}
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${currentStage.color}`}>
                <currentStage.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{currentStage.label}</h3>
                <p className="text-sm text-muted-foreground">{currentStage.description}</p>
              </div>
              <Badge variant={isStageComplete(currentStage.id) ? 'default' : 'secondary'}>
                {isStageComplete(currentStage.id) ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
            
            {/* Sub-Questions */}
            <div className="space-y-3">
              {currentStage.subQuestions.map((question, idx) => {
                const value = currentStageValues[question.id] || '';
                const isAnswered = value.trim().length >= 3;
                const isExpanded = expandedQuestions.has(question.id) || !isAnswered;
                
                return (
                  <Collapsible 
                    key={question.id} 
                    open={isExpanded}
                    onOpenChange={() => toggleQuestion(question.id)}
                  >
                    <Card className={isAnswered ? 'border-green-500/30 bg-green-500/5' : ''}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-2 cursor-pointer hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                                {idx + 1}
                              </span>
                              <CardTitle className="text-sm font-medium">{question.label}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAnswered && <Check className="w-4 h-4 text-green-500" />}
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Textarea
                            value={value}
                            onChange={(e) => updateAnswer(question.id, e.target.value)}
                            placeholder={question.placeholder}
                            className="min-h-[100px]"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            {value.length < 3 ? `Minimum 3 characters required (${value.length}/3)` : `${value.length} characters`}
                          </p>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
            
            {/* AI Insights Section */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Insights
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={getAIInsights}
                    disabled={isLoadingInsights}
                  >
                    {isLoadingInsights ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Get Insights
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Get AI-powered suggestions based on your responses
                </CardDescription>
              </CardHeader>
              {aiInsights && (
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded-lg">
                      {aiInsights}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </ScrollArea>
        
        <Separator />
        
        {/* Navigation Footer */}
        <div className="flex items-center justify-between py-4">
          <Button
            variant="outline"
            onClick={goToPreviousStage}
            disabled={currentStageIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Progress
            </Button>
            
            {currentStageIndex < MEDDIC_STAGES.length - 1 ? (
              <Button
                onClick={goToNextStage}
                disabled={!canProceed}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  saveMutation.mutate();
                  onComplete?.();
                  onOpenChange(false);
                }}
                disabled={!canProceed}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Complete MEDDIC
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
