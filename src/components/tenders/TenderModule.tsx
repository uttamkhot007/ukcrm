import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, FileText, Users, Activity, Calendar, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle 
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

interface TenderModuleProps {
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

export function TenderModule({ initialTab = 'opportunities' }: TenderModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tenders, setTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const fetchTenders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentTenant) {
        query = query.eq('tenant_id', currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error('Error fetching tenders:', error);
      toast.error('Failed to load tenders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, [currentTenant]);

  const stats: TenderStats = {
    total: tenders.length,
    identified: tenders.filter(t => t.status === 'identified').length,
    inProgress: tenders.filter(t => ['evaluating', 'bid_preparation', 'submitted', 'under_evaluation'].includes(t.status)).length,
    submitted: tenders.filter(t => t.status === 'submitted').length,
    won: tenders.filter(t => t.status === 'won').length,
    lost: tenders.filter(t => t.status === 'lost').length,
    totalValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0),
    wonValue: tenders.filter(t => t.status === 'won').reduce((sum, t) => sum + (t.estimated_value || 0), 0),
  };

  const filteredTenders = tenders.filter(t =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tender_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (tender: any) => {
    setSelectedTender(tender);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tender Management</h1>
          <p className="text-muted-foreground">
            Track tender opportunities, manage bids, and monitor evaluations
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tender
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(stats.totalValue / 100000).toFixed(1)}L total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              {stats.submitted} submitted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.won}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(stats.wonValue / 100000).toFixed(1)}L value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.won + stats.lost > 0 
                ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lost} lost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="opportunities" className="gap-2">
            <FileText className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="bid-preparation" className="gap-2">
            <Users className="h-4 w-4" />
            Bid Preparation
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-2">
            <Activity className="h-4 w-4" />
            Evaluation & Awards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4">
          <TenderOpportunitiesTab 
            tenders={filteredTenders.filter(t => ['identified', 'evaluating'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchTenders}
          />
        </TabsContent>

        <TabsContent value="bid-preparation" className="mt-4">
          <TenderBidPreparationTab 
            tenders={filteredTenders.filter(t => ['bid_preparation', 'submitted'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchTenders}
          />
        </TabsContent>

        <TabsContent value="evaluation" className="mt-4">
          <TenderEvaluationTab 
            tenders={filteredTenders.filter(t => ['under_evaluation', 'won', 'lost', 'cancelled'].includes(t.status))}
            loading={loading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchTenders}
          />
        </TabsContent>
      </Tabs>

      <NewTenderDialog 
        open={showNewDialog} 
        onOpenChange={setShowNewDialog}
        onSuccess={fetchTenders}
      />

      <TenderDetailsSheet
        tender={selectedTender}
        open={showDetails}
        onOpenChange={setShowDetails}
        onRefresh={fetchTenders}
      />
    </div>
  );
}
