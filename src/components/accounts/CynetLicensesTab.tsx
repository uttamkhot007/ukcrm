import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Shield,
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Upload,
  Brain,
  RefreshCw,
  Server,
  Users,
  BarChart3,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CynetLicense {
  id: string;
  cynet_id: string;
  site_name: string;
  status: string;
  billing_type: string | null;
  total_groups: number;
  endpoints_used: number;
  procured_licenses: number;
  assigned_endpoints: number;
  clm_retention: string | null;
  monthly_data_ingestion: number;
  parent_name: string | null;
  integrations_count: number;
  integrations_info: string | null;
  created_at: string;
  notes: string | null;
}

interface AIInsight {
  type: 'prediction' | 'recommendation' | 'alert';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export function CynetLicensesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<CynetLicense | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [newLicense, setNewLicense] = useState({
    cynet_id: "",
    site_name: "",
    status: "Active",
    billing_type: "Client",
    endpoints_used: 0,
    procured_licenses: 0,
    total_groups: 0,
    parent_name: "",
    notes: "",
  });
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["cynet-licenses", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cynet_licenses")
        .select("*")
        .order("site_name");

      if (error) throw error;
      return data as CynetLicense[];
    },
  });

  const createLicenseMutation = useMutation({
    mutationFn: async (license: typeof newLicense) => {
      const { error } = await supabase
        .from("cynet_licenses")
        .insert({
          ...license,
          created_by: user?.id,
          tenant_id: currentTenant?.id,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cynet-licenses"] });
      toast.success("Cynet license added successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add license: " + error.message);
    },
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ id, procured_licenses }: { id: string; procured_licenses: number }) => {
      const { error } = await supabase
        .from("cynet_licenses")
        .update({ procured_licenses })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cynet-licenses"] });
      toast.success("Procured licenses updated");
      setSelectedLicense(null);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const resetForm = () => {
    setNewLicense({
      cynet_id: "",
      site_name: "",
      status: "Active",
      billing_type: "Client",
      endpoints_used: 0,
      procured_licenses: 0,
      total_groups: 0,
      parent_name: "",
      notes: "",
    });
  };

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke("executive-insights", {
        body: {
          role: "vciso",
          context: {
            cynetLicenses: licenses.map(l => ({
              site: l.site_name,
              used: l.endpoints_used,
              procured: l.procured_licenses,
              utilization: l.procured_licenses > 0 ? Math.round((l.endpoints_used / l.procured_licenses) * 100) : 0,
              status: l.status,
              type: l.billing_type,
            })),
            totalEndpoints: licenses.reduce((sum, l) => sum + l.endpoints_used, 0),
            totalProcured: licenses.reduce((sum, l) => sum + l.procured_licenses, 0),
            overUtilized: licenses.filter(l => l.procured_licenses > 0 && l.endpoints_used > l.procured_licenses).length,
            underUtilized: licenses.filter(l => l.procured_licenses > 0 && l.endpoints_used < l.procured_licenses * 0.5).length,
          },
          customPrompt: `Analyze Cynet license utilization data and provide:
1. Predictions for license usage growth
2. Recommendations for license optimization
3. Alerts for over/under-utilized sites
Focus on cost optimization and security coverage.`,
        },
      });

      if (error) throw error;

      const insights: AIInsight[] = [];
      if (data?.predictions?.length) {
        data.predictions.forEach((p: string) => {
          insights.push({ type: 'prediction', title: 'Usage Prediction', description: p, priority: 'medium' });
        });
      }
      if (data?.recommendations?.length) {
        data.recommendations.forEach((r: string) => {
          insights.push({ type: 'recommendation', title: 'Optimization', description: r, priority: 'high' });
        });
      }
      if (data?.risks?.length) {
        data.risks.forEach((r: string) => {
          insights.push({ type: 'alert', title: 'Alert', description: r, priority: 'high' });
        });
      }
      setAiInsights(insights);
    } catch (error: any) {
      toast.error("Failed to fetch AI insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  const filteredLicenses = licenses.filter((license) =>
    license.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    license.cynet_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    license.billing_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalSites: licenses.length,
    totalEndpoints: licenses.reduce((sum, l) => sum + l.endpoints_used, 0),
    totalProcured: licenses.reduce((sum, l) => sum + l.procured_licenses, 0),
    overUtilized: licenses.filter(l => l.procured_licenses > 0 && l.endpoints_used > l.procured_licenses).length,
    underUtilized: licenses.filter(l => l.procured_licenses > 0 && l.endpoints_used < l.procured_licenses * 0.5).length,
    activeSites: licenses.filter(l => l.status === 'Active').length,
  };

  const getUtilizationBadge = (used: number, procured: number) => {
    if (procured === 0) return <Badge variant="outline">Not Set</Badge>;
    const ratio = (used / procured) * 100;
    if (ratio > 100) return <Badge variant="destructive">Over ({ratio.toFixed(0)}%)</Badge>;
    if (ratio > 80) return <Badge className="bg-orange-500">High ({ratio.toFixed(0)}%)</Badge>;
    if (ratio < 50) return <Badge variant="secondary">Low ({ratio.toFixed(0)}%)</Badge>;
    return <Badge className="bg-green-500">Optimal ({ratio.toFixed(0)}%)</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sites</p>
                <p className="text-2xl font-bold">{stats.totalSites}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Server className="w-5 h-5 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Sites</p>
                <p className="text-2xl font-bold">{stats.activeSites}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Endpoints Used</p>
                <p className="text-2xl font-bold">{stats.totalEndpoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Procured</p>
                <p className="text-2xl font-bold">{stats.totalProcured.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Over Utilized</p>
                <p className="text-2xl font-bold">{stats.overUtilized}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Under Utilized</p>
                <p className="text-2xl font-bold">{stats.underUtilized}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">AI License Intelligence</CardTitle>
              <CardDescription>AI-powered predictions and recommendations for license optimization</CardDescription>
            </div>
          </div>
          <Button onClick={fetchAIInsights} disabled={loadingInsights || licenses.length === 0}>
            {loadingInsights ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Insights
          </Button>
        </CardHeader>
        {aiInsights.length > 0 && (
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      insight.type === 'alert' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                      insight.type === 'recommendation' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' :
                      'border-purple-200 bg-purple-50 dark:bg-purple-950/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {insight.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />}
                      {insight.type === 'recommendation' && <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />}
                      {insight.type === 'prediction' && <Brain className="w-4 h-4 text-purple-500 mt-0.5" />}
                      <div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* Utilization Alert */}
      {stats.overUtilized > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              License Over-Utilization Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-400">
              {stats.overUtilized} site(s) are using more endpoints than procured licenses. Consider purchasing additional licenses.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cynet License Management</CardTitle>
            <CardDescription>Track and manage Cynet endpoint licenses across sites</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add License
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Cynet License</DialogTitle>
                  <DialogDescription>Add a new Cynet site license entry</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cynet ID</Label>
                      <Input
                        value={newLicense.cynet_id}
                        onChange={(e) => setNewLicense({ ...newLicense, cynet_id: e.target.value })}
                        placeholder="2000093"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={newLicense.status}
                        onValueChange={(value) => setNewLicense({ ...newLicense, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Trial">Trial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Site Name</Label>
                    <Input
                      value={newLicense.site_name}
                      onChange={(e) => setNewLicense({ ...newLicense, site_name: e.target.value })}
                      placeholder="VC - Company Name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Billing Type</Label>
                      <Select
                        value={newLicense.billing_type}
                        onValueChange={(value) => setNewLicense({ ...newLicense, billing_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Client">Client</SelectItem>
                          <SelectItem value="Test">Test</SelectItem>
                          <SelectItem value="NFR">NFR</SelectItem>
                          <SelectItem value="Trial">Trial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Total Groups</Label>
                      <Input
                        type="number"
                        value={newLicense.total_groups}
                        onChange={(e) => setNewLicense({ ...newLicense, total_groups: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Endpoints Used</Label>
                      <Input
                        type="number"
                        value={newLicense.endpoints_used}
                        onChange={(e) => setNewLicense({ ...newLicense, endpoints_used: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Procured Licenses</Label>
                      <Input
                        type="number"
                        value={newLicense.procured_licenses}
                        onChange={(e) => setNewLicense({ ...newLicense, procured_licenses: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Parent Name</Label>
                    <Input
                      value={newLicense.parent_name}
                      onChange={(e) => setNewLicense({ ...newLicense, parent_name: e.target.value })}
                      placeholder="Parent organization"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={newLicense.notes}
                      onChange={(e) => setNewLicense({ ...newLicense, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createLicenseMutation.mutate(newLicense)}
                    disabled={!newLicense.cynet_id || !newLicense.site_name || createLicenseMutation.isPending}
                  >
                    {createLicenseMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Add License
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by site name, ID, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[300px]"
              />
            </div>
          </div>

          {filteredLicenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No Cynet licenses found</p>
              <p className="text-sm">Add licenses manually or import from the sheet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cynet ID</TableHead>
                    <TableHead>Site Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Endpoints</TableHead>
                    <TableHead>Procured</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell className="font-mono text-sm">{license.cynet_id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={license.site_name}>
                        {license.site_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={license.status === 'Active' ? 'default' : 'secondary'}>
                          {license.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{license.billing_type || '-'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{license.endpoints_used.toLocaleString()}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={selectedLicense?.id === license.id ? selectedLicense.procured_licenses : license.procured_licenses}
                          onChange={(e) => {
                            if (selectedLicense?.id === license.id) {
                              setSelectedLicense({ ...selectedLicense, procured_licenses: parseInt(e.target.value) || 0 });
                            } else {
                              setSelectedLicense({ ...license, procured_licenses: parseInt(e.target.value) || 0 });
                            }
                          }}
                          onBlur={() => {
                            if (selectedLicense && selectedLicense.procured_licenses !== license.procured_licenses) {
                              updateLicenseMutation.mutate({ id: license.id, procured_licenses: selectedLicense.procured_licenses });
                            }
                          }}
                          className="w-24 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        {getUtilizationBadge(license.endpoints_used, license.procured_licenses)}
                      </TableCell>
                      <TableCell>{license.total_groups}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLicense(license)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
