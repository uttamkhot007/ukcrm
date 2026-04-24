import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Building2, Globe, Linkedin, Twitter, Facebook, 
  Plus, X, Save, Loader2, Search, Shield, ShieldCheck, ShieldX, ShieldAlert,
  ExternalLink, RefreshCw, Upload, UserCircle, Crown, Users, ChevronDown, Star, Phone, Mail
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const COMPANY_TYPES = ["Public", "Private", "Non-Profit", "Government", "Partnership", "Other"];

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  avatar_url?: string;
  is_champion?: boolean;
}

export function OrganizationProfilePage() {
  const { isAdmin } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isEnriching, setIsEnriching] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [newManagementMember, setNewManagementMember] = useState<Partial<TeamMember>>({});
  const [newCoreMember, setNewCoreMember] = useState<Partial<TeamMember>>({});
  const [showAddManagement, setShowAddManagement] = useState(false);
  const [showAddCore, setShowAddCore] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const toggleMemberExpand = (id: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleChampion = (teamType: 'management_team' | 'core_team', memberId: string) => {
    const members = formData[teamType] || [];
    const updated = members.map((m: TeamMember) => 
      m.id === memberId ? { ...m, is_champion: !m.is_champion } : m
    );
    updateField(teamType, updated);
  };

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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      toast.error("Please upload a PNG file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = 'png';
      const fileName = `org-logo-${currentTenant?.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(filePath);

      updateField('logo_url', publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = () => updateMutation.mutate(formData);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addManagementMember = () => {
    if (newManagementMember.name?.trim()) {
      const members = formData.management_team || [];
      const member: TeamMember = {
        id: crypto.randomUUID(),
        name: newManagementMember.name || '',
        designation: newManagementMember.designation || '',
        email: newManagementMember.email || '',
        phone: newManagementMember.phone || '',
        avatar_url: newManagementMember.avatar_url,
      };
      updateField('management_team', [...members, member]);
      setNewManagementMember({});
      setShowAddManagement(false);
    }
  };

  const removeManagementMember = (id: string) => {
    const members = formData.management_team || [];
    updateField('management_team', members.filter((m: TeamMember) => m.id !== id));
  };

  const addCoreMember = () => {
    if (newCoreMember.name?.trim()) {
      const members = formData.core_team || [];
      const member: TeamMember = {
        id: crypto.randomUUID(),
        name: newCoreMember.name || '',
        designation: newCoreMember.designation || '',
        email: newCoreMember.email || '',
        phone: newCoreMember.phone || '',
        avatar_url: newCoreMember.avatar_url,
      };
      updateField('core_team', [...members, member]);
      setNewCoreMember({});
      setShowAddCore(false);
    }
  };

  const removeCoreMember = (id: string) => {
    const members = formData.core_team || [];
    updateField('core_team', members.filter((m: TeamMember) => m.id !== id));
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
    <div className="perspective-container">
      <div className="page-3d space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain bg-muted" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={() => logoInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-white" />
                )}
              </button>
            )}
            <input 
              ref={logoInputRef}
              type="file" 
              accept=".png,image/png" 
              className="hidden" 
              onChange={handleLogoUpload}
            />
          </div>
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

      {/* Company Details & Online Presence */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-3d">
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

        <Card className="card-3d">
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
              <Label className="flex items-center gap-2"><Upload className="w-4 h-4" /> Logo (PNG only)</Label>
              <div className="flex gap-2">
                <Input value={formData.logo_url || ""} onChange={(e) => updateField('logo_url', e.target.value)} disabled={!isAdmin} placeholder="Logo URL" className="flex-1" />
                {isAdmin && (
                  <Button size="icon" variant="secondary" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}>
                    {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Click the logo image or use this button to upload a PNG file (max 2MB)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Security Status */}
      <Card className="card-3d">
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

      {/* Management Team */}
      <Card className="card-3d">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-4 h-4" /> Management Team
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowAddManagement(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Member
              </Button>
            )}
          </div>
          <CardDescription>Key decision makers and leadership</CardDescription>
        </CardHeader>
        <CardContent>
          {showAddManagement && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Name *" value={newManagementMember.name || ''} 
                       onChange={(e) => setNewManagementMember(prev => ({ ...prev, name: e.target.value }))} />
                <Input placeholder="Designation" value={newManagementMember.designation || ''} 
                       onChange={(e) => setNewManagementMember(prev => ({ ...prev, designation: e.target.value }))} />
                <Input placeholder="Email" type="email" value={newManagementMember.email || ''} 
                       onChange={(e) => setNewManagementMember(prev => ({ ...prev, email: e.target.value }))} />
                <Input placeholder="Phone" value={newManagementMember.phone || ''} 
                       onChange={(e) => setNewManagementMember(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={newManagementMember.is_champion || false}
                    onCheckedChange={(checked) => setNewManagementMember(prev => ({ ...prev, is_champion: checked }))}
                  />
                  <Label className="flex items-center gap-1 text-sm">
                    <Star className="w-3 h-3 text-yellow-500" /> Champion
                  </Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addManagementMember}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddManagement(false); setNewManagementMember({}); }}>Cancel</Button>
              </div>
            </div>
          )}
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(formData.management_team || []).map((member: TeamMember) => (
              <Collapsible 
                key={member.id} 
                open={expandedMembers.has(member.id)}
                onOpenChange={() => toggleMemberExpand(member.id)}
              >
                <div className="border rounded-lg group card-3d-deep overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback><UserCircle className="w-6 h-6" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {member.name}
                          {member.is_champion && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500 gap-1">
                              <Star className="w-3 h-3 fill-yellow-500" /> Champion
                            </Badge>
                          )}
                        </div>
                        {member.designation && <div className="text-sm text-muted-foreground truncate">{member.designation}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedMembers.has(member.id) ? 'rotate-180' : ''}`} />
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" 
                                  onClick={(e) => { e.stopPropagation(); removeManagementMember(member.id); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 space-y-2 border-t bg-muted/20">
                      <div className="pt-2">
                        {member.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${member.email}`} className="hover:text-primary">{member.email}</a>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${member.phone}`} className="hover:text-primary">{member.phone}</a>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                            <Switch 
                              checked={member.is_champion || false}
                              onCheckedChange={() => toggleChampion('management_team', member.id)}
                            />
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 text-yellow-500" /> Mark as Champion
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
            {(!formData.management_team || formData.management_team.length === 0) && !showAddManagement && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">No management team members added</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Core Team */}
      <Card className="card-3d">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-4 h-4" /> Core Team
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowAddCore(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Member
              </Button>
            )}
          </div>
          <CardDescription>Key team members and department heads</CardDescription>
        </CardHeader>
        <CardContent>
          {showAddCore && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Name *" value={newCoreMember.name || ''} 
                       onChange={(e) => setNewCoreMember(prev => ({ ...prev, name: e.target.value }))} />
                <Input placeholder="Designation" value={newCoreMember.designation || ''} 
                       onChange={(e) => setNewCoreMember(prev => ({ ...prev, designation: e.target.value }))} />
                <Input placeholder="Email" type="email" value={newCoreMember.email || ''} 
                       onChange={(e) => setNewCoreMember(prev => ({ ...prev, email: e.target.value }))} />
                <Input placeholder="Phone" value={newCoreMember.phone || ''} 
                       onChange={(e) => setNewCoreMember(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={newCoreMember.is_champion || false}
                    onCheckedChange={(checked) => setNewCoreMember(prev => ({ ...prev, is_champion: checked }))}
                  />
                  <Label className="flex items-center gap-1 text-sm">
                    <Star className="w-3 h-3 text-yellow-500" /> Champion
                  </Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addCoreMember}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddCore(false); setNewCoreMember({}); }}>Cancel</Button>
              </div>
            </div>
          )}
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(formData.core_team || []).map((member: TeamMember) => (
              <Collapsible 
                key={member.id} 
                open={expandedMembers.has(member.id)}
                onOpenChange={() => toggleMemberExpand(member.id)}
              >
                <div className="border rounded-lg group card-3d-deep overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback><UserCircle className="w-6 h-6" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {member.name}
                          {member.is_champion && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500 gap-1">
                              <Star className="w-3 h-3 fill-yellow-500" /> Champion
                            </Badge>
                          )}
                        </div>
                        {member.designation && <div className="text-sm text-muted-foreground truncate">{member.designation}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedMembers.has(member.id) ? 'rotate-180' : ''}`} />
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" 
                                  onClick={(e) => { e.stopPropagation(); removeCoreMember(member.id); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 space-y-2 border-t bg-muted/20">
                      <div className="pt-2">
                        {member.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${member.email}`} className="hover:text-primary">{member.email}</a>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${member.phone}`} className="hover:text-primary">{member.phone}</a>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                            <Switch 
                              checked={member.is_champion || false}
                              onCheckedChange={() => toggleChampion('core_team', member.id)}
                            />
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 text-yellow-500" /> Mark as Champion
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
            {(!formData.core_team || formData.core_team.length === 0) && !showAddCore && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">No core team members added</p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
