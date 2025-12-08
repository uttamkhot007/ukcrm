import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Building2, Globe, Linkedin, Twitter, Facebook, MapPin, Users, DollarSign, 
  Plus, X, Save, Loader2, Search, Shield, ShieldCheck, ShieldX, ShieldAlert,
  Server, Cloud, Database, Lock, UserCircle, Phone, Mail, Calendar, 
  Briefcase, Building, ExternalLink, RefreshCw, CheckCircle2, AlertCircle,
  AlertTriangle, Key, Bug, Ticket, Package, FileWarning, Contact, Sparkles, Brain
} from "lucide-react";
import { OrganizationContacts } from "./OrganizationContacts";
import { AccountIntelligence } from "./AccountIntelligence";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Checkbox } from "@/components/ui/checkbox";

const COMPANY_TYPES = ["Public", "Private", "Non-Profit", "Government", "Partnership", "Other"];
const DC_TYPES = ["On-Premises", "Cloud", "Hybrid"];
const CLOUD_PROVIDERS = ["AWS", "Azure", "GCP", "Oracle Cloud", "IBM Cloud", "Other"];
const SECURITY_CONTROLS = [
  "Firewall", "IDS/IPS", "SIEM", "EDR/XDR", "DLP", "PAM", "IAM", "MFA", 
  "WAF", "Email Security", "Network Segmentation", "VPN", "Zero Trust", 
  "Vulnerability Management", "Backup & Recovery", "Encryption at Rest", 
  "Encryption in Transit", "Security Awareness Training"
];
const COMPLIANCE_FRAMEWORKS = [
  "ISO 27001", "SOC 2", "GDPR", "HIPAA", "PCI DSS", "NIST", "CIS Controls",
  "COBIT", "FedRAMP", "CCPA", "SOX", "FISMA"
];

interface SecurityTool {
  name: string;
  category: string;
  vendor: string;
}

interface ThreatIntelligence {
  breaches: Array<{ name: string; date: string; records: string; severity: string; description: string }>;
  leakedCredentials: { count: number; sources: string[]; lastSeen: string };
  vulnerabilities: Array<{ cve: string; severity: string; product: string; description: string }>;
  exposedServices: Array<{ port: number; service: string; risk: string }>;
  riskScore: number;
  lastUpdated: string;
}

export function OrganizationProfilePage() {
  const { isAdmin } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isEnriching, setIsEnriching] = useState(false);
  const [newSecurityTool, setNewSecurityTool] = useState<SecurityTool>({ name: "", category: "", vendor: "" });
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence | null>(null);
  const [isLoadingThreat, setIsLoadingThreat] = useState(false);
  const [lastThreatRefresh, setLastThreatRefresh] = useState<Date | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-profile", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Fetch support tickets count
  const { data: ticketStats } = useQuery({
    queryKey: ["org-ticket-stats", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return { total: 0, open: 0, critical: 0 };
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, priority")
        .eq("tenant_id", currentTenant.id);
      if (error) return { total: 0, open: 0, critical: 0 };
      const total = data?.length || 0;
      const open = data?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;
      const critical = data?.filter(t => t.priority === 'critical').length || 0;
      return { total, open, critical };
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch deals/services procured
  const { data: dealStats } = useQuery({
    queryKey: ["org-deal-stats", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return { total: 0, totalValue: 0, solutions: [] };
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, stage")
        .eq("tenant_id", currentTenant.id)
        .eq("stage", "closed_won");
      if (error) return { total: 0, totalValue: 0, solutions: [] };
      const total = data?.length || 0;
      const totalValue = data?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      const solutions = data?.map(d => d.title).slice(0, 5) || [];
      return { total, totalValue, solutions };
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch threat intelligence
  const fetchThreatIntelligence = async () => {
    const url = formData.website_url;
    if (!url) {
      toast.error("Please enter a website URL first");
      return;
    }

    setIsLoadingThreat(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: { domain: url, companyName: formData.name || 'Unknown' }
      });
      if (error) throw error;
      setThreatIntel(data);
      setLastThreatRefresh(new Date());
      toast.success("Threat intelligence updated");
    } catch (error: any) {
      console.error("Threat intel error:", error);
      toast.error("Failed to fetch threat intelligence");
    } finally {
      setIsLoadingThreat(false);
    }
  };

  // Auto-fetch threat intel when website changes
  useEffect(() => {
    if (formData.website_url && !threatIntel) {
      fetchThreatIntelligence();
    }
  }, [formData.website_url]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!currentTenant?.id) throw new Error("No tenant selected");
      
      const { id, created_at, updated_at, ...updateData } = data;
      
      if (settings?.id) {
        const { error } = await supabase
          .from("organization_settings")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert({ ...updateData, tenant_id: currentTenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-profile", currentTenant?.id] });
      toast.success("Organization profile updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const enrichCompany = async () => {
    const url = formData.website_url;
    if (!url) {
      toast.error("Please enter a website URL first");
      return;
    }

    setIsEnriching(true);
    try {
      const response = await supabase.functions.invoke('enrich-company', {
        body: { url }
      });

      if (response.error) throw new Error(response.error.message);

      const { data } = response.data;
      if (data) {
        setFormData(prev => ({
          ...prev,
          ...data,
          last_enriched_at: new Date().toISOString(),
          enrichment_data: data,
        }));
        toast.success("Company information enriched successfully");
      }
    } catch (error: any) {
      console.error('Error enriching company:', error);
      toast.error("Failed to enrich: " + (error.message || "Unknown error"));
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSave = () => updateMutation.mutate(formData);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: string, value: string) => {
    if (value.trim()) {
      const current = formData[field] || [];
      if (!current.includes(value.trim())) {
        updateField(field, [...current, value.trim()]);
      }
    }
  };

  const removeFromArray = (field: string, value: string) => {
    const current = formData[field] || [];
    updateField(field, current.filter((v: string) => v !== value));
  };

  const addSecurityTool = () => {
    if (newSecurityTool.name.trim()) {
      const tools = formData.existing_security_tools || [];
      updateField('existing_security_tools', [...tools, newSecurityTool]);
      setNewSecurityTool({ name: "", category: "", vendor: "" });
    }
  };

  const removeSecurityTool = (index: number) => {
    const tools = formData.existing_security_tools || [];
    updateField('existing_security_tools', tools.filter((_: any, i: number) => i !== index));
  };

  const getSecurityStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'fail': return <ShieldX className="w-4 h-4 text-red-500" />;
      default: return <ShieldAlert className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSecurityStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return <Badge variant="default" className="bg-green-500">Pass</Badge>;
      case 'fail': return <Badge variant="destructive">Fail</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {formData.logo_url ? (
            <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain bg-muted" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{formData.name || "Organization Profile"}</h1>
            {formData.website_url && (
              <a href={formData.website_url} target="_blank" rel="noopener noreferrer" 
                 className="text-sm text-primary hover:underline flex items-center gap-1">
                {formData.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {formData.last_enriched_at && (
            <span className="text-xs text-muted-foreground">
              Last enriched: {new Date(formData.last_enriched_at).toLocaleDateString()}
            </span>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" onClick={enrichCompany} disabled={isEnriching || !formData.website_url}>
                {isEnriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Enrich with AI
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vinca">Vinca Services</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-1 bg-gradient-to-r from-primary/10 to-transparent">
            <Sparkles className="w-3 h-3 text-primary" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <div className="flex gap-2">
                      <Input value={formData.website_url || ""} onChange={(e) => updateField('website_url', e.target.value)} 
                             placeholder="https://company.com" disabled={!isAdmin} className="flex-1" />
                      {isAdmin && (
                        <Button size="icon" variant="secondary" onClick={enrichCompany} disabled={isEnriching}>
                          {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={formData.name || ""} onChange={(e) => updateField('name', e.target.value)} disabled={!isAdmin} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description || ""} onChange={(e) => updateField('description', e.target.value)} 
                            rows={3} disabled={!isAdmin} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input value={formData.industry || ""} onChange={(e) => updateField('industry', e.target.value)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Type</Label>
                    <Select value={formData.company_type || ""} onValueChange={(v) => updateField('company_type', v)} disabled={!isAdmin}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Founded Year</Label>
                    <Input type="number" value={formData.founded_year || ""} 
                           onChange={(e) => updateField('founded_year', parseInt(e.target.value) || null)} disabled={!isAdmin} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Annual Revenue</Label>
                    <Input value={formData.annual_revenue || ""} onChange={(e) => updateField('annual_revenue', e.target.value)} 
                           placeholder="e.g., $50M-$100M" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Employees</Label>
                    <Input type="number" value={formData.total_employees || ""} 
                           onChange={(e) => updateField('total_employees', parseInt(e.target.value) || null)} disabled={!isAdmin} />
                  </div>
                </div>
                {formData.stock_symbol && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Stock Symbol</Label>
                      <Input value={formData.stock_symbol || ""} onChange={(e) => updateField('stock_symbol', e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock Exchange</Label>
                      <Input value={formData.stock_exchange || ""} onChange={(e) => updateField('stock_exchange', e.target.value)} disabled={!isAdmin} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Online Presence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Label>
                  <Input value={formData.linkedin_url || ""} onChange={(e) => updateField('linkedin_url', e.target.value)} 
                         placeholder="https://linkedin.com/company/..." disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Twitter className="w-4 h-4" /> Twitter / X</Label>
                  <Input value={formData.twitter_url || ""} onChange={(e) => updateField('twitter_url', e.target.value)} 
                         placeholder="https://twitter.com/..." disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Facebook className="w-4 h-4" /> Facebook</Label>
                  <Input value={formData.facebook_url || ""} onChange={(e) => updateField('facebook_url', e.target.value)} 
                         placeholder="https://facebook.com/..." disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input value={formData.logo_url || ""} onChange={(e) => updateField('logo_url', e.target.value)} disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Security Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-4 h-4" /> Email Security Status
              </CardTitle>
              <CardDescription>DNS-based email authentication records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getSecurityStatusIcon(formData.spf_status)}
                    <div>
                      <div className="font-medium">SPF</div>
                      <div className="text-xs text-muted-foreground">Sender Policy Framework</div>
                    </div>
                  </div>
                  {getSecurityStatusBadge(formData.spf_status)}
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getSecurityStatusIcon(formData.dmarc_status)}
                    <div>
                      <div className="font-medium">DMARC</div>
                      <div className="text-xs text-muted-foreground">Domain-based Message Authentication</div>
                    </div>
                  </div>
                  {getSecurityStatusBadge(formData.dmarc_status)}
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getSecurityStatusIcon(formData.dkim_status)}
                    <div>
                      <div className="font-medium">DKIM</div>
                      <div className="text-xs text-muted-foreground">DomainKeys Identified Mail</div>
                    </div>
                  </div>
                  {getSecurityStatusBadge(formData.dkim_status)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-4 h-4" /> Infrastructure Scale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Number of Branches/Offices</Label>
                    <Input type="number" value={formData.num_branches || 0} 
                           onChange={(e) => updateField('num_branches', parseInt(e.target.value) || 0)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Users</Label>
                    <Input type="number" value={formData.num_users || 0} 
                           onChange={(e) => updateField('num_users', parseInt(e.target.value) || 0)} disabled={!isAdmin} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Number of Systems</Label>
                    <Input type="number" value={formData.num_systems || 0} 
                           onChange={(e) => updateField('num_systems', parseInt(e.target.value) || 0)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Endpoints</Label>
                    <Input type="number" value={formData.num_endpoints || 0} 
                           onChange={(e) => updateField('num_endpoints', parseInt(e.target.value) || 0)} disabled={!isAdmin} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Number of Servers</Label>
                  <Input type="number" value={formData.num_servers || 0} 
                         onChange={(e) => updateField('num_servers', parseInt(e.target.value) || 0)} disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="w-4 h-4" /> Datacenter Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Datacenter Type</Label>
                  <Select value={formData.datacenter_type || ""} onValueChange={(v) => updateField('datacenter_type', v)} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {DC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {(formData.datacenter_type === 'Cloud' || formData.datacenter_type === 'Hybrid') && (
                  <div className="space-y-2">
                    <Label>Cloud Providers</Label>
                    <div className="flex flex-wrap gap-2">
                      {CLOUD_PROVIDERS.map(provider => (
                        <div key={provider} className="flex items-center space-x-2">
                          <Checkbox 
                            id={provider}
                            checked={(formData.cloud_providers || []).includes(provider)}
                            onCheckedChange={(checked) => {
                              if (checked) addToArray('cloud_providers', provider);
                              else removeFromArray('cloud_providers', provider);
                            }}
                            disabled={!isAdmin}
                          />
                          <label htmlFor={provider} className="text-sm">{provider}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Technologies Used</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(formData.technologies_used || []).map((tech: string) => (
                      <Badge key={tech} variant="secondary" className="flex items-center gap-1">
                        {tech}
                        {isAdmin && <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('technologies_used', tech)} />}
                      </Badge>
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Input placeholder="Add technology" onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('technologies_used', (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* Vinca Services Tab */}
        <TabsContent value="vinca" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dealStats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Solutions Procured</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{((dealStats?.totalValue || 0) / 100000).toFixed(1)}L</p>
                    <p className="text-xs text-muted-foreground">Total Investment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Ticket className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ticketStats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <FileWarning className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ticketStats?.critical || 0}</p>
                    <p className="text-xs text-muted-foreground">Critical Issues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-4 h-4" /> Solutions & Services from Vinca
                </CardTitle>
                <CardDescription>Products and services procured through Vinca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dealStats?.solutions && dealStats.solutions.length > 0 ? (
                  <div className="space-y-2">
                    {dealStats.solutions.map((solution, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="font-medium">{solution}</span>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No solutions procured yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="w-4 h-4" /> Support Ticket Summary
                </CardTitle>
                <CardDescription>Recent support activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Open Tickets</span>
                    <Badge variant={ticketStats?.open ? "destructive" : "secondary"}>{ticketStats?.open || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical Priority</span>
                    <Badge variant={ticketStats?.critical ? "destructive" : "secondary"}>{ticketStats?.critical || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Tickets</span>
                    <Badge variant="outline">{ticketStats?.total || 0}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notable Issues</Label>
                  <Textarea 
                    placeholder="Add notable issues or concerns..."
                    value={formData.notable_issues || ""}
                    onChange={(e) => updateField('notable_issues', e.target.value)}
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-4">
          <AccountIntelligence organizationName={formData.name} organizationType="own" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
