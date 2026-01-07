import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, FileText, Users, Activity, Calendar, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle,
  Gavel, FileCheck, Target, BarChart3, Building2, Brain
} from 'lucide-react';
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenders, DRs, OEMs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="deal-registration" className="gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Deal Reg</span>
            <span className="sm:hidden">DR</span>
          </TabsTrigger>
          <TabsTrigger value="document-workspace" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI Workspace</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="oem-funnel" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">OEM Funnel</span>
            <span className="sm:hidden">Funnel</span>
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Opportunities</span>
            <span className="sm:hidden">Opps</span>
          </TabsTrigger>
          <TabsTrigger value="bid-preparation" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Bid Prep</span>
            <span className="sm:hidden">Bids</span>
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Awards</span>
            <span className="sm:hidden">Won</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deal-registration" className="mt-4">
          <DealRegistrationTab 
            dealRegistrations={filteredDRs}
            loading={loading}
            onViewDetails={handleViewDRDetails}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="document-workspace" className="mt-4">
          <TenderDocumentWorkspace />
        </TabsContent>

        <TabsContent value="oem-funnel" className="mt-4">
          <OEMFunnelTab 
            dealRegistrations={dealRegistrations}
            deals={deals}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <TenderOpportunitiesTab 
            tenders={filteredTenders.filter(t => ['identified', 'evaluating'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewTenderDetails}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="bid-preparation" className="mt-4">
          <TenderBidPreparationTab 
            tenders={filteredTenders.filter(t => ['bid_preparation', 'submitted'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewTenderDetails}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="evaluation" className="mt-4">
          <TenderEvaluationTab 
            tenders={filteredTenders.filter(t => ['under_evaluation', 'won', 'lost', 'cancelled'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewTenderDetails}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>

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
