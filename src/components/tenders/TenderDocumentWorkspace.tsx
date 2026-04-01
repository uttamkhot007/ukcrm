import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, FileText, Wand2, Upload, Download, FileSpreadsheet, 
  FileCheck, Clock, CheckCircle, AlertCircle, Loader2, Brain,
  FileType, Settings2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RFPSpecsWorkspace } from './RFPSpecsWorkspace';
import { RFPResponseWorkspace } from './RFPResponseWorkspace';
import { NewWorkspaceDialog } from './NewWorkspaceDialog';
import { WorkspaceDetailsSheet } from './WorkspaceDetailsSheet';

interface TenderDocumentWorkspaceProps {
  initialTab?: string;
}

interface WorkspaceStats {
  total: number;
  rfpSpecs: number;
  rfpResponses: number;
  draft: number;
  inProgress: number;
  completed: number;
}

export function TenderDocumentWorkspace({ initialTab = 'rfp-specs' }: TenderDocumentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tender_workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentTenant) {
        query = query.eq('tenant_id', currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTenant) {
      fetchWorkspaces();
    }
  }, [currentTenant]);

  const stats: WorkspaceStats = {
    total: workspaces.length,
    rfpSpecs: workspaces.filter(w => w.workspace_type === 'rfp_spec').length,
    rfpResponses: workspaces.filter(w => w.workspace_type === 'rfp_response').length,
    draft: workspaces.filter(w => w.status === 'draft').length,
    inProgress: workspaces.filter(w => ['generating', 'review'].includes(w.status)).length,
    completed: workspaces.filter(w => ['approved', 'exported'].includes(w.status)).length,
  };

  const filteredWorkspaces = workspaces.filter(w =>
    w.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.solution_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.oem_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rfpSpecWorkspaces = filteredWorkspaces.filter(w => w.workspace_type === 'rfp_spec');
  const rfpResponseWorkspaces = filteredWorkspaces.filter(w => w.workspace_type === 'rfp_response');
  const technicalProposalWorkspaces = filteredWorkspaces.filter(w => w.workspace_type === 'technical_proposal');

  const handleViewDetails = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setShowDetails(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      draft: { color: 'bg-muted text-muted-foreground', icon: Clock },
      generating: { color: 'bg-blue-500/20 text-blue-600', icon: Loader2 },
      review: { color: 'bg-yellow-500/20 text-yellow-600', icon: AlertCircle },
      approved: { color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
      exported: { color: 'bg-emerald-500/20 text-emerald-600', icon: FileCheck },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className={`w-3 h-3 ${status === 'generating' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Tender Document Workspace
          </h1>
          <p className="text-muted-foreground">
            AI-powered RFP specifications & response generation
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFP Specs</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.rfpSpecs}</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFP Responses</CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.rfpResponses}</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wand2 className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workspaces, solutions, OEMs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="rfp-specs" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">RFP Specifications</span>
            <span className="sm:hidden">Specs</span>
            {stats.rfpSpecs > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.rfpSpecs}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rfp-response" className="gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">RFP Responses</span>
            <span className="sm:hidden">Responses</span>
            {stats.rfpResponses > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.rfpResponses}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="proposals" className="gap-2">
            <FileType className="h-4 w-4" />
            <span className="hidden sm:inline">Technical Proposals</span>
            <span className="sm:hidden">Proposals</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rfp-specs" className="mt-4">
          <RFPSpecsWorkspace
            workspaces={rfpSpecWorkspaces}
            loading={loading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchWorkspaces}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="rfp-response" className="mt-4">
          <RFPResponseWorkspace
            workspaces={rfpResponseWorkspaces}
            loading={loading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchWorkspaces}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          <RFPResponseWorkspace
            workspaces={technicalProposalWorkspaces}
            loading={loading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchWorkspaces}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewWorkspaceDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={fetchWorkspaces}
      />

      <WorkspaceDetailsSheet
        workspace={selectedWorkspace}
        open={showDetails}
        onOpenChange={setShowDetails}
        onRefresh={fetchWorkspaces}
      />
    </div>
  );
}
