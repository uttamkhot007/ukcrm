import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Plus, Users, Briefcase, Shield, AlertTriangle, ExternalLink, 
  RefreshCw, Star, Phone, Mail, MapPin, Globe, Linkedin, Twitter, Facebook,
  CheckCircle, Loader2, ChevronDown, ChevronRight, ArrowLeft, 
  FileText, PhoneCall, Video, Sparkles, Copy, Database, Key, Bug
} from "lucide-react";
import { CONTACT_ROLES } from "@/components/shared/OrganizationFormFields";

interface AllianceOrganization {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  organization_type: string | null;
  logo_url: string | null;
  address: string | null;
  solutions: string[] | null;
  services: string[] | null;
}

interface AllianceUser {
  id: string;
  organization_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string;
  notes: string | null;
}

interface ThreatIntelligence {
  breaches: Array<{
    name: string;
    date: string;
    records: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  leakedCredentials: {
    count: number;
    sources: string[];
    lastSeen: string;
  };
  vulnerabilities: Array<{
    cve: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    product: string;
    description: string;
  }>;
  exposedServices: Array<{
    port: number;
    service: string;
    risk: string;
  }>;
  riskScore: number;
  lastUpdated: string;
}

const SECURITY_CONTROLS = [
  { id: 'firewall', name: 'Next-Gen Firewall', category: 'Network Security' },
  { id: 'siem', name: 'SIEM Solution', category: 'Monitoring' },
  { id: 'edr', name: 'EDR/XDR', category: 'Endpoint Security' },
  { id: 'dlp', name: 'Data Loss Prevention', category: 'Data Security' },
  { id: 'iam', name: 'Identity & Access Management', category: 'Identity' },
  { id: 'pam', name: 'Privileged Access Management', category: 'Identity' },
  { id: 'mfa', name: 'Multi-Factor Authentication', category: 'Identity' },
  { id: 'casb', name: 'CASB', category: 'Cloud Security' },
  { id: 'waf', name: 'Web Application Firewall', category: 'Application Security' },
  { id: 'vapt', name: 'Vulnerability Assessment', category: 'Risk Management' },
  { id: 'soar', name: 'SOAR Platform', category: 'Automation' },
  { id: 'backup', name: 'Backup & Recovery', category: 'Business Continuity' },
  { id: 'email_security', name: 'Email Security Gateway', category: 'Email Security' },
  { id: 'zero_trust', name: 'Zero Trust Architecture', category: 'Architecture' },
];

interface AllianceOrgProfilePageProps {
  organization: AllianceOrganization;
  onBack: () => void;
}

export function AllianceOrgProfilePage({ organization, onBack }: AllianceOrgProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence | null>(null);
  const [isLoadingThreat, setIsLoadingThreat] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(true);
  const [dealsExpanded, setDealsExpanded] = useState(true);
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch contacts
  const { data: contacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["org-contacts", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("alliance_users")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");
      if (error) throw error;
      return data as AllianceUser[];
    },
    enabled: !!organization?.id,
  });

  // Fetch deals
  const { data: deals = [], refetch: refetchDeals } = useQuery({
    queryKey: ["org-deals", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data: orgContacts } = await supabase
        .from("contacts")
        .select("id")
        .ilike("company", `%${organization.name}%`);
      
      if (!orgContacts || orgContacts.length === 0) return [];
      
      const contactIds = orgContacts.map(c => c.id);
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Fetch threat intelligence
  const fetchThreatIntelligence = async () => {
    if (!organization?.website) {
      toast.error("No website URL available for threat analysis");
      return;
    }

    setIsLoadingThreat(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: { domain: organization.website, companyName: organization.name }
      });
      if (error) throw error;
      setThreatIntel(data);
      setLastRefresh(new Date());
      toast.success("Threat intelligence updated");
    } catch (error: any) {
      console.error("Threat intel error:", error);
      toast.error("Failed to fetch threat intelligence");
    } finally {
      setIsLoadingThreat(false);
    }
  };

  // Enrich company
  const enrichCompany = async () => {
    if (!organization?.website) {
      toast.error("No website URL available for enrichment");
      return;
    }

    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { url: organization.website }
      });
      if (error) throw error;
      toast.success("Company data enriched successfully");
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
    } catch (error: any) {
      console.error("Enrichment error:", error);
      toast.error("Failed to enrich company data");
    } finally {
      setIsEnriching(false);
    }
  };

  useEffect(() => {
    if (organization?.website && !threatIntel) {
      fetchThreatIntelligence();
    }
  }, [organization?.website]);

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const { error } = await supabase
        .from("alliance_users")
        .insert({
          tenant_id: currentTenant?.id,
          organization_id: organization?.id,
          name: contactData.name,
          email: contactData.email || null,
          phone: contactData.phone || null,
          role: contactData.role,
          notes: contactData.isChampion ? '[CHAMPION]' : null,
          status: 'active',
          created_by: user?.id!,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchContacts();
      setIsAddContactOpen(false);
      toast.success("Contact added");
    },
    onError: (error) => {
      toast.error("Failed to add contact: " + error.message);
    },
  });

  // Add deal mutation
  const addDealMutation = useMutation({
    mutationFn: async (dealData: any) => {
      let contactId = null;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .ilike("company", `%${organization?.name}%`)
        .limit(1)
        .single();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            tenant_id: currentTenant?.id,
            user_id: user?.id!,
            name: organization?.name || 'Unknown',
            company: organization?.name,
          })
          .select('id')
          .single();
        if (contactError) throw contactError;
        contactId = newContact.id;
      }

      const { error } = await supabase
        .from("deals")
        .insert({
          tenant_id: currentTenant?.id,
          user_id: user?.id!,
          contact_id: contactId,
          title: dealData.title,
          value: parseFloat(dealData.value) || 0,
          stage: 'pipeline',
          description: dealData.description,
          expected_close_date: dealData.expectedCloseDate || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchDeals();
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsAddDealOpen(false);
      toast.success("Deal created");
    },
    onError: (error) => {
      toast.error("Failed to create deal: " + error.message);
    },
  });

  const toggleControl = (controlId: string) => {
    setSelectedControls(prev => 
      prev.includes(controlId) ? prev.filter(c => c !== controlId) : [...prev, controlId]
    );
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

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'closed_won': return 'text-green-600';
      case 'closed_lost': return 'text-red-600';
      case 'negotiation': return 'text-orange-600';
      case 'proposal': return 'text-blue-600';
      default: return 'text-primary';
    }
  };

  const champion = contacts.find(c => c.notes?.includes('[CHAMPION]'));
  const websiteClean = organization.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background rounded-lg border overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-72 border-r bg-card flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-primary">
                <ArrowLeft className="h-4 w-4" />
                Companies
              </Button>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={organization.logo_url || ""} alt={organization.name} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">{organization.name}</h1>
                {organization.website && (
                  <a href={organization.website} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-primary hover:underline flex items-center gap-1">
                    {websiteClean}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 mb-6 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                <FileText className="h-3 w-3" />Note
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                <Mail className="h-3 w-3" />Email
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                <PhoneCall className="h-3 w-3" />Call
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                <Video className="h-3 w-3" />Meet
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">About this company</h3>
              <div className="space-y-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">Website URL</Label><p>{websiteClean || '--'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p>{organization.organization_type || '--'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Industry</Label><p>{organization.industry || '--'}</p></div>
                {organization.address && <div><Label className="text-xs text-muted-foreground">Address</Label><p>{organization.address}</p></div>}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={organization.status === "active" ? "default" : "secondary"}>{organization.status}</Badge>
                  </div>
                </div>
                {champion && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Champion</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{champion.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b bg-card px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-11 bg-transparent border-0 p-0 gap-4">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Overview</TabsTrigger>
              <TabsTrigger value="activities" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Activities</TabsTrigger>
              <TabsTrigger value="intelligence" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Intelligence</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {activeTab === "overview" && (
              <>
                {/* Enrichment Card */}
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <p className="text-sm">AI can enrich data for {organization.name}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={enrichCompany} disabled={isEnriching} className="gap-1">
                      {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Enrich record
                    </Button>
                  </CardContent>
                </Card>

                {/* Company Card */}
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={organization.logo_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">{organization.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{organization.name}</h3>
                        {organization.website && (
                          <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                            {websiteClean}<ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-sm ml-6"><span className="font-medium">Employees</span><p className="text-muted-foreground">--</p></div>
                      <div className="text-sm ml-4"><span className="font-medium">Annual revenue</span><p className="text-muted-foreground">--</p></div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon"><Facebook className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Linkedin className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Twitter className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>

                {organization.description && (
                  <Card><CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{organization.description}</p></CardContent>
                  </Card>
                )}

                {(organization.solutions?.length || organization.services?.length) && (
                  <Card><CardHeader><CardTitle className="text-sm">Solutions & Services</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {organization.solutions && organization.solutions.length > 0 && (
                        <div><Label className="text-xs text-muted-foreground">Solutions</Label>
                          <div className="flex flex-wrap gap-1 mt-1">{organization.solutions.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}</div>
                        </div>
                      )}
                      {organization.services && organization.services.length > 0 && (
                        <div><Label className="text-xs text-muted-foreground">Services</Label>
                          <div className="flex flex-wrap gap-1 mt-1">{organization.services.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-sm">Security Controls</CardTitle>
                    <Badge variant="outline">{selectedControls.length} selected</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {SECURITY_CONTROLS.map(control => (
                        <Button key={control.id} variant={selectedControls.includes(control.id) ? "default" : "outline"}
                          className={`justify-start h-auto py-2 px-3 ${selectedControls.includes(control.id) ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                          onClick={() => toggleControl(control.id)}>
                          <div className="flex items-center gap-2 w-full">
                            {selectedControls.includes(control.id) ? <CheckCircle className="h-4 w-4" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
                            <div className="text-left"><p className="text-sm font-medium">{control.name}</p><p className="text-xs opacity-75">{control.category}</p></div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "activities" && (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Activity timeline coming soon</p>
              </Card>
            )}

            {activeTab === "intelligence" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Threat Intelligence</h3>
                    {lastRefresh && <p className="text-xs text-muted-foreground">Last updated: {lastRefresh.toLocaleTimeString()}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={fetchThreatIntelligence} disabled={isLoadingThreat} className="gap-1">
                    {isLoadingThreat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh
                  </Button>
                </div>

                {isLoadingThreat ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : threatIntel ? (
                  <div className="space-y-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className={getRiskScoreColor(threatIntel.riskScore)} />Overall Risk Score</CardTitle></CardHeader>
                      <CardContent><div className="flex items-center gap-4"><span className={`text-4xl font-bold ${getRiskScoreColor(threatIntel.riskScore)}`}>{threatIntel.riskScore}</span><Progress value={threatIntel.riskScore} className="flex-1" /></div></CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-red-500" />Data Breaches ({threatIntel.breaches.length})</CardTitle></CardHeader>
                      <CardContent>{threatIntel.breaches.length === 0 ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />No known breaches found</p> : <div className="space-y-2">{threatIntel.breaches.map((b, i) => <div key={i} className="p-2 bg-muted rounded flex items-center justify-between"><div><p className="font-medium text-sm">{b.name}</p><p className="text-xs text-muted-foreground">{b.date} - {b.records} records</p></div><Badge className={getSeverityColor(b.severity)}>{b.severity}</Badge></div>)}</div>}</CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4 text-orange-500" />Leaked Credentials</CardTitle></CardHeader>
                      <CardContent>{threatIntel.leakedCredentials.count === 0 ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />No leaked credentials found</p> : <div><p className="text-2xl font-bold text-orange-500">{threatIntel.leakedCredentials.count}</p><p className="text-xs text-muted-foreground">Last seen: {threatIntel.leakedCredentials.lastSeen}</p></div>}</CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bug className="h-4 w-4 text-purple-500" />Vulnerabilities ({threatIntel.vulnerabilities.length})</CardTitle></CardHeader>
                      <CardContent>{threatIntel.vulnerabilities.length === 0 ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />No known vulnerabilities</p> : <div className="space-y-2">{threatIntel.vulnerabilities.map((v, i) => <div key={i} className="p-2 bg-muted rounded"><div className="flex items-center justify-between"><code className="text-xs font-mono">{v.cve}</code><Badge className={getSeverityColor(v.severity)}>{v.severity}</Badge></div><p className="text-xs text-muted-foreground mt-1">{v.product}</p></div>)}</div>}</CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" />Exposed Services ({threatIntel.exposedServices.length})</CardTitle></CardHeader>
                      <CardContent><div className="space-y-1">{threatIntel.exposedServices.map((svc, i) => <div key={i} className="flex items-center justify-between text-sm"><span>Port {svc.port}: {svc.service}</span><Badge variant={svc.risk === 'Low' ? 'secondary' : 'destructive'}>{svc.risk}</Badge></div>)}</div></CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No threat intelligence available</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchThreatIntelligence}>Scan Now</Button>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 border-l bg-card flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Contacts */}
            <Collapsible open={contactsExpanded} onOpenChange={setContactsExpanded}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-sm hover:text-primary">
                  {contactsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Contacts ({contacts.length})
                </CollapsibleTrigger>
                <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-primary gap-1 h-7"><Plus className="h-4 w-4" />Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Contact to {organization.name}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addContactMutation.mutate({ name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), role: fd.get('role'), isChampion: fd.get('isChampion') === 'on' }); }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div>
                        <div className="space-y-2"><Label>Role</Label><Select name="role" defaultValue="other"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" /></div>
                        <div className="space-y-2"><Label>Phone</Label><Input name="phone" /></div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                        <input type="checkbox" name="isChampion" id="isChampion" className="h-5 w-5 rounded accent-amber-500" />
                        <Label htmlFor="isChampion" className="flex items-center gap-2 cursor-pointer"><Star className="h-5 w-5 text-amber-500 fill-amber-500" /><span className="font-medium">Set as Champion</span></Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={addContactMutation.isPending}>{addContactMutation.isPending ? "Adding..." : "Add Contact"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {contacts.length === 0 ? (
                  <div className="text-center py-6"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">See the people associated with this record.</p></div>
                ) : contacts.map(c => (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{c.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1"><p className="font-medium text-sm truncate">{c.name}</p>{c.notes?.includes('[CHAMPION]') && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}</div>
                        <p className="text-xs text-muted-foreground">{c.role || 'No role'}</p>
                        {c.email && <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>}
                      </div>
                    </div>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Deals */}
            <Collapsible open={dealsExpanded} onOpenChange={setDealsExpanded}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-sm hover:text-primary">
                  {dealsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Deals ({deals.length})
                </CollapsibleTrigger>
                <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-primary gap-1 h-7"><Plus className="h-4 w-4" />Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Deal for {organization.name}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addDealMutation.mutate({ title: fd.get('title'), value: fd.get('value'), description: fd.get('description'), expectedCloseDate: fd.get('expectedCloseDate') }); }} className="space-y-4">
                      <div className="space-y-2"><Label>Deal Title *</Label><Input name="title" required placeholder={`${organization.name} - Solution`} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Value</Label><Input name="value" type="number" placeholder="0" /></div>
                        <div className="space-y-2"><Label>Expected Close Date</Label><Input name="expectedCloseDate" type="date" /></div>
                      </div>
                      <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={3} /></div>
                      <Button type="submit" className="w-full" disabled={addDealMutation.isPending}>{addDealMutation.isPending ? "Creating..." : "Create Deal"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {deals.length === 0 ? (
                  <div className="text-center py-6"><Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No deals yet</p></div>
                ) : deals.map((d: any) => (
                  <Card key={d.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 text-green-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-primary truncate">{d.title}</p>
                        {d.value > 0 && <p className="text-sm">Amount: <span className="font-medium">₹{d.value.toLocaleString()}</span></p>}
                        {d.expected_close_date && <p className="text-xs text-muted-foreground">Close: {new Date(d.expected_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        <p className={`text-xs font-medium ${getStageColor(d.stage)}`}>Stage: {d.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
