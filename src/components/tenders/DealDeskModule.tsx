import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, FileText, Users, Activity, Calendar, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle,
  Gavel, FileCheck, Target, BarChart3, Building2, Brain,
  ArrowRight, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TenderOpportunitiesTab } from './TenderOpportunitiesTab';
import { TenderBidPreparationTab } from './TenderBidPreparationTab';
import { TenderEvaluationTab } from './TenderEvaluationTab';
import { NewTenderDialog } from './NewTenderDialog';
import { TenderDetailsSheet } from './TenderDetailsSheet';
import { DealRegistrationTab } from './DealRegistrationTab';
import { OEMFunnelTab } from './OEMFunnelTab';
import { NewDealRegistrationDialog } from '@/components/sales/NewDealRegistrationDialog';
import { DealRegistrationDetailsSheet } from '@/components/sales/DealRegistrationDetailsSheet';
import { TenderDocumentWorkspace } from './TenderDocumentWorkspace';

interface DealDeskModuleProps {
  initialTab?: string;
}

interface TenderStats {
  total: number;
  identified: number;
  inProgress: number;
  submitted: number;
  won: number;
  lost: number;
  totalValue: number;
  wonValue: number;
}

interface DRStats {
  total: number;
  pending: number;
  inProgress: number;
  approved: number;
  rejected: number;
  totalValue: number;
}

export function DealDeskModule({ initialTab = 'deal-registration' }: DealDeskModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tenders, setTenders] = useState<any[]>([]);
  const [dealRegistrations, setDealRegistrations] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTenderDialog, setShowNewTenderDialog] = useState(false);
  const [showNewDRDialog, setShowNewDRDialog] = useState(false);
  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [selectedDRId, setSelectedDRId] = useState<string | null>(null);
  const [showTenderDetails, setShowTenderDetails] = useState(false);
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tenders
      let tenderQuery = supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentTenant) {
        tenderQuery = tenderQuery.eq('tenant_id', currentTenant.id);
      }

      const { data: tenderData, error: tenderError } = await tenderQuery;
      if (tenderError) throw tenderError;
      setTenders(tenderData || []);

      // Fetch deal registrations
      let drQuery = supabase
        .from('deal_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentTenant) {
        drQuery = drQuery.eq('tenant_id', currentTenant.id);
      }

      const { data: drData, error: drError } = await drQuery;
      if (drError) throw drError;
      setDealRegistrations(drData || []);

      // Fetch deals for OEM funnel (all registered deals from sales team)
      let dealsQuery = supabase
        .from('deals')
        .select('id, title, value, stage, organization_name, alliance_organization_id, solution_id')
        .order('created_at', { ascending: false });

      if (currentTenant) {
        dealsQuery = dealsQuery.eq('tenant_id', currentTenant.id);
      }

      const { data: dealsData, error: dealsError } = await dealsQuery;
      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTenant]);

  const tenderStats: TenderStats = {
    total: tenders.length,
    identified: tenders.filter(t => t.status === 'identified').length,
    inProgress: tenders.filter(t => ['evaluating', 'bid_preparation', 'submitted', 'under_evaluation'].includes(t.status)).length,
    submitted: tenders.filter(t => t.status === 'submitted').length,
    won: tenders.filter(t => t.status === 'won').length,
    lost: tenders.filter(t => t.status === 'lost').length,
    totalValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0),
    wonValue: tenders.filter(t => t.status === 'won').reduce((sum, t) => sum + (t.estimated_value || 0), 0),
  };

  const drStats: DRStats = {
    total: dealRegistrations.length,
    pending: dealRegistrations.filter(r => r.status === 'pending').length,
    inProgress: dealRegistrations.filter(r => r.status === 'in_progress').length,
    approved: dealRegistrations.filter(r => r.status === 'approved').length,
    rejected: dealRegistrations.filter(r => r.status === 'rejected').length,
    totalValue: dealRegistrations.reduce((sum, r) => sum + (r.opportunity_value || 0), 0),
  };

  const filteredTenders = tenders.filter(t =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tender_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDRs = dealRegistrations.filter(dr =>
    dr.dr_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dr.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dr.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewTenderDetails = (tender: any) => {
    setSelectedTender(tender);
    setShowTenderDetails(true);
  };

  const handleViewDRDetails = (drId: string) => {
    setSelectedDRId(drId);
  };

  // Get unique OEMs/Vendors from deal registrations
  const uniqueOEMs = [...new Set(dealRegistrations.map(dr => dr.vendor_name).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenders & Deal Desk</h1>
          <p className="text-muted-foreground">
            Manage tenders, deal registrations, and track OEM funnels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewDRDialog(true)}>
            <FileCheck className="h-4 w-4 mr-2" />
            New DR Request
          </Button>
          <Button onClick={() => setShowNewTenderDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Tender
          </Button>
        </div>
      </div>

      {/* Combined Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DR Requests</CardTitle>
            <FileCheck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {drStats.pending} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DR Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{drStats.approved}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(drStats.totalValue / 100000).toFixed(1)}L value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
            <Gavel className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderStats.total}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(tenderStats.totalValue / 100000).toFixed(1)}L total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenders Won</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tenderStats.won}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(tenderStats.wonValue / 100000).toFixed(1)}L value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OEMs Tracked</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueOEMs.length}</div>
            <p className="text-xs text-muted-foreground">
              Active vendors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((drStats.totalValue + tenderStats.totalValue) / 100000).toFixed(1)}L
            </div>
            <p className="text-xs text-muted-foreground">
              Combined value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Premium 3D Navigation Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* AI Workspace Card */}
        <button
          onClick={() => setActiveTab('ai-workspace')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'ai-workspace' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'ai-workspace' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">AI Workspace</h3>
          <p className="text-xs text-muted-foreground mb-3">AI-powered RFP analysis</p>
          <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            Smart
          </Badge>
        </button>

        {/* Deal Registration Card */}
        <button
          onClick={() => setActiveTab('deal-registration')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'deal-registration' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'deal-registration' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">Deal Registration</h3>
          <p className="text-xs text-muted-foreground mb-3">OEM registrations</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs">
              {drStats.total}
            </Badge>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
              {drStats.pending} Pending
            </Badge>
          </div>
        </button>

        {/* Tender Documents Card */}
        <button
          onClick={() => setActiveTab('document-workspace')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'document-workspace' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'document-workspace' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">Tender Docs</h3>
          <p className="text-xs text-muted-foreground mb-3">RFP specs & responses</p>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Documents
          </Badge>
        </button>

        {/* OEM Funnel Card */}
        <button
          onClick={() => setActiveTab('oem-funnel')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'oem-funnel' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'oem-funnel' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">OEM Funnel</h3>
          <p className="text-xs text-muted-foreground mb-3">Vendor pipelines</p>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {uniqueOEMs.length} OEMs
          </Badge>
        </button>

        {/* Opportunities Card */}
        <button
          onClick={() => setActiveTab('opportunities')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'opportunities' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Target className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'opportunities' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">Opportunities</h3>
          <p className="text-xs text-muted-foreground mb-3">Tender tracking</p>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {tenderStats.identified}
          </Badge>
        </button>

        {/* Bid Preparation Card */}
        <button
          onClick={() => setActiveTab('bid-preparation')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'bid-preparation' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Gavel className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'bid-preparation' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">Bid Preparation</h3>
          <p className="text-xs text-muted-foreground mb-3">Prepare submissions</p>
          <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
            {tenderStats.inProgress}
          </Badge>
        </button>

        {/* Awards/Evaluation Card */}
        <button
          onClick={() => setActiveTab('evaluation')}
          className={cn(
            "premium-card group text-left p-5 rounded-2xl transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-xl",
            activeTab === 'evaluation' 
              ? "ring-2 ring-primary shadow-lg bg-primary/5" 
              : "hover:bg-accent/30"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-all duration-300",
              activeTab === 'evaluation' ? "text-primary" : "group-hover:text-primary group-hover:translate-x-1"
            )} />
          </div>
          <h3 className="text-base font-semibold mb-1">Awards</h3>
          <p className="text-xs text-muted-foreground mb-3">Won & evaluation</p>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {tenderStats.won} Won
          </Badge>
        </button>
      </div>

      {/* Search */}
      {activeTab && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenders, DRs, OEMs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'ai-workspace' && (
        <div className="animate-fade-in">
          <TenderDocumentWorkspace />
        </div>
      )}

      {activeTab === 'deal-registration' && (
        <div className="animate-fade-in">
          <DealRegistrationTab 
            dealRegistrations={filteredDRs}
            loading={loading}
            onViewDetails={handleViewDRDetails}
            onRefresh={fetchData}
          />
        </div>
      )}

      {activeTab === 'document-workspace' && (
        <div className="animate-fade-in">
          <TenderDocumentWorkspace />
        </div>
      )}

      {activeTab === 'oem-funnel' && (
        <div className="animate-fade-in">
          <OEMFunnelTab 
            dealRegistrations={dealRegistrations}
            deals={deals}
            loading={loading}
          />
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="animate-fade-in">
          <TenderOpportunitiesTab 
            tenders={filteredTenders}
            loading={loading}
            onViewDetails={handleViewTenderDetails}
            onRefresh={fetchData}
          />
        </div>
      )}

      {activeTab === 'bid-preparation' && (
        <div className="animate-fade-in">
          <TenderBidPreparationTab 
            tenders={tenders.filter(t => ['evaluating', 'bid_preparation'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewTenderDetails}
            onRefresh={fetchData}
          />
        </div>
      )}

      {activeTab === 'evaluation' && (
        <div className="animate-fade-in">
          <TenderEvaluationTab 
            tenders={tenders.filter(t => ['submitted', 'under_evaluation', 'won', 'lost'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewTenderDetails}
            onRefresh={fetchData}
          />
        </div>
      )}

      {/* Dialogs */}
      <NewTenderDialog 
        open={showNewTenderDialog} 
        onOpenChange={setShowNewTenderDialog}
        onSuccess={fetchData}
      />

      <NewDealRegistrationDialog 
        open={showNewDRDialog} 
        onOpenChange={setShowNewDRDialog}
        onSuccess={fetchData}
      />

      <TenderDetailsSheet
        tender={selectedTender}
        open={showTenderDetails}
        onOpenChange={setShowTenderDetails}
        onRefresh={fetchData}
      />

      <DealRegistrationDetailsSheet
        drId={selectedDRId}
        open={!!selectedDRId}
        onOpenChange={(open) => !open && setSelectedDRId(null)}
      />
    </div>
  );
}
