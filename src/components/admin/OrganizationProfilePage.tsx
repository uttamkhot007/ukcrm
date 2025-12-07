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
import { toast } from "sonner";
import { 
  Building2, Globe, Linkedin, Twitter, Facebook, MapPin, Users, DollarSign, 
  Plus, X, Save, Loader2, Search, Shield, ShieldCheck, ShieldX, ShieldAlert,
  Server, Cloud, Database, Lock, UserCircle, Phone, Mail, Calendar, 
  Briefcase, Building, ExternalLink, RefreshCw, CheckCircle2, AlertCircle
} from "lucide-react";
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

export function OrganizationProfilePage() {
  const { isAdmin } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isEnriching, setIsEnriching] = useState(false);
  const [newSecurityTool, setNewSecurityTool] = useState<SecurityTool>({ name: "", category: "", vendor: "" });

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contact">Contact & Location</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
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

        {/* Contact & Location Tab */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Headquarters Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Address</Label>
                  <Textarea value={formData.address || ""} onChange={(e) => updateField('address', e.target.value)} 
                            rows={2} disabled={!isAdmin} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={formData.hq_city || ""} onChange={(e) => updateField('hq_city', e.target.value)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Region</Label>
                    <Input value={formData.hq_state || ""} onChange={(e) => updateField('hq_state', e.target.value)} disabled={!isAdmin} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={formData.hq_country || ""} onChange={(e) => updateField('hq_country', e.target.value)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input value={formData.postal_code || ""} onChange={(e) => updateField('postal_code', e.target.value)} disabled={!isAdmin} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</Label>
                  <Input value={formData.phone || ""} onChange={(e) => updateField('phone', e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                  <Input type="email" value={formData.email || ""} onChange={(e) => updateField('email', e.target.value)} disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>
          </div>
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

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Existing Security Tools
                </CardTitle>
                <CardDescription>Security solutions currently in use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {(formData.existing_security_tools || []).map((tool: SecurityTool, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">{tool.category} • {tool.vendor}</div>
                      </div>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => removeSecurityTool(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="grid gap-2 md:grid-cols-3">
                      <Input placeholder="Tool name" value={newSecurityTool.name} 
                             onChange={(e) => setNewSecurityTool(p => ({ ...p, name: e.target.value }))} />
                      <Input placeholder="Category (e.g., EDR)" value={newSecurityTool.category} 
                             onChange={(e) => setNewSecurityTool(p => ({ ...p, category: e.target.value }))} />
                      <Input placeholder="Vendor" value={newSecurityTool.vendor} 
                             onChange={(e) => setNewSecurityTool(p => ({ ...p, vendor: e.target.value }))} />
                    </div>
                    <Button size="sm" onClick={addSecurityTool}><Plus className="w-4 h-4 mr-1" /> Add Tool</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Security Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 grid-cols-2">
                  {SECURITY_CONTROLS.map(control => (
                    <div key={control} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`control-${control}`}
                        checked={(formData.security_controls || []).includes(control)}
                        onCheckedChange={(checked) => {
                          if (checked) addToArray('security_controls', control);
                          else removeFromArray('security_controls', control);
                        }}
                        disabled={!isAdmin}
                      />
                      <label htmlFor={`control-${control}`} className="text-sm">{control}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance & Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Compliance Frameworks</Label>
                <div className="flex flex-wrap gap-2">
                  {COMPLIANCE_FRAMEWORKS.map(framework => (
                    <div key={framework} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`framework-${framework}`}
                        checked={(formData.compliance_frameworks || []).includes(framework)}
                        onCheckedChange={(checked) => {
                          if (checked) addToArray('compliance_frameworks', framework);
                          else removeFromArray('compliance_frameworks', framework);
                        }}
                        disabled={!isAdmin}
                      />
                      <label htmlFor={`framework-${framework}`} className="text-sm">{framework}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Last Security Audit</Label>
                  <Input type="date" value={formData.last_security_audit || ""} 
                         onChange={(e) => updateField('last_security_audit', e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Next Security Audit</Label>
                  <Input type="date" value={formData.next_security_audit || ""} 
                         onChange={(e) => updateField('next_security_audit', e.target.value)} disabled={!isAdmin} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCircle className="w-4 h-4" /> Account Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.account_manager_name || ""} 
                         onChange={(e) => updateField('account_manager_name', e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.account_manager_email || ""} 
                         onChange={(e) => updateField('account_manager_email', e.target.value)} disabled={!isAdmin} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.account_manager_phone || ""} 
                       onChange={(e) => updateField('account_manager_phone', e.target.value)} disabled={!isAdmin} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Customer Since</Label>
                  <Input type="date" value={formData.customer_since || ""} 
                         onChange={(e) => updateField('customer_since', e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Contract Start Date</Label>
                  <Input type="date" value={formData.contract_start_date || ""} 
                         onChange={(e) => updateField('contract_start_date', e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Contract End Date</Label>
                  <Input type="date" value={formData.contract_end_date || ""} 
                         onChange={(e) => updateField('contract_end_date', e.target.value)} disabled={!isAdmin} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
