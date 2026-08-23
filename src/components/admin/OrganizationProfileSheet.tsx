import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Plus, Users, Briefcase, Shield, AlertTriangle, ExternalLink, 
  RefreshCw, Star, Phone, Mail, MapPin, Globe, Linkedin, Twitter,
  TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Lock,
  Eye, Database, Key, Bug, Loader2, Building2, DollarSign, Calendar
} from "lucide-react";
import { CONTACT_ROLES, ContactInfo } from "@/components/shared/OrganizationFormFields";

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

interface OrganizationProfileSheetProps {
  organization: AllianceOrganization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationProfileSheet({ organization, open, onOpenChange }: OrganizationProfileSheetProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence | null>(null);
  const [isLoadingThreat, setIsLoadingThreat] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch contacts for this organization
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
    enabled: !!organization?.id && open,
  });

  // Fetch deals for this organization
  const { data: deals = [], refetch: refetchDeals } = useQuery({
    queryKey: ["org-deals", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Search deals by company name in contact
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
    enabled: !!organization?.id && open,
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
        body: { 
          domain: organization.website,
          companyName: organization.name
        }
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

  // Auto-refresh threat intel on open
  useEffect(() => {
    if (open && organization?.website && !threatIntel) {
      fetchThreatIntelligence();
    }
  }, [open, organization?.website]);

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
      // First, find or create a contact for this org
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
      prev.includes(controlId) 
        ? prev.filter(c => c !== controlId)
        : [...prev, controlId]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getChampionContact = () => contacts.find(c => c.notes?.includes('[CHAMPION]'));
  const champion = getChampionContact();

  if (!organization) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {/* Header */}
            <SheetHeader className="mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={organization.logo_url || ""} alt={organization.name} />
                  <AvatarFallback className="text-2xl">{organization.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <SheetTitle className="text-2xl">{organization.name}</SheetTitle>
                  <p className="text-muted-foreground">{organization.industry || 'Industry not specified'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>{organization.organization_type || 'Unknown'}</Badge>
                    <Badge variant={organization.status === "active" ? "default" : "secondary"}>
                      {organization.status}
                    </Badge>
                    {champion && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Champion: {champion.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{contacts.length}</p>
                      <p className="text-xs text-muted-foreground">Contacts</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{deals.length}</p>
                      <p className="text-xs text-muted-foreground">Deals</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{selectedControls.length}</p>
                      <p className="text-xs text-muted-foreground">Controls</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${threatIntel ? getRiskScoreColor(threatIntel.riskScore) : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-2xl font-bold ${threatIntel ? getRiskScoreColor(threatIntel.riskScore) : ''}`}>
                        {threatIntel?.riskScore ?? '--'}
                      </p>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                    </div>
                  </div>
                </Card>
              </div>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="deals">Deals</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="threats">Threats</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {organization.description && (
                      <p className="text-sm text-muted-foreground">{organization.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {organization.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <Label className="text-xs text-muted-foreground">Address</Label>
                            <p className="text-sm">{organization.address}</p>
                          </div>
                        </div>
                      )}
                      {organization.website && (
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <Label className="text-xs text-muted-foreground">Website</Label>
                            <a 
                              href={organization.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {organization.website.replace(/^https?:\/\//, '')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    {(organization.solutions?.length || organization.services?.length) && (
                      <div className="space-y-2 pt-2 border-t">
                        {organization.solutions && organization.solutions.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Solutions</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {organization.solutions.map((s, i) => (
                                <Badge key={i} variant="outline">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {organization.services && organization.services.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Services</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {organization.services.map((s, i) => (
                                <Badge key={i} variant="secondary">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Key Contacts ({contacts.length})</h3>
                  <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        Add Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Contact to {organization.name}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        addContactMutation.mutate({
                          name: formData.get('name'),
                          email: formData.get('email'),
                          phone: formData.get('phone'),
                          role: formData.get('role'),
                          isChampion: formData.get('isChampion') === 'on',
                        });
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input name="name" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select name="role" defaultValue="other">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTACT_ROLES.map(role => (
                                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input name="email" type="email" />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input name="phone" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" name="isChampion" id="isChampion" className="rounded" />
                          <Label htmlFor="isChampion" className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500" />
                            Set as Champion
                          </Label>
                        </div>
                        <Button type="submit" className="w-full" disabled={addContactMutation.isPending}>
                          {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {contacts.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No contacts yet</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsAddContactOpen(true)}>
                        Add First Contact
                      </Button>
                    </Card>
                  ) : (
                    contacts.map(contact => (
                      <Card key={contact.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{contact.name}</p>
                                {contact.notes?.includes('[CHAMPION]') && (
                                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs gap-0.5">
                                    <Star className="h-3 w-3 fill-current" />
                                    Champion
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{contact.role || 'No role'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.email && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={`mailto:${contact.email}`}>
                                  <Mail className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {contact.phone && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={`tel:${contact.phone}`}>
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent value="deals" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Deals ({deals.length})</h3>
                  <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        New Deal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Deal for {organization.name}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        addDealMutation.mutate({
                          title: formData.get('title'),
                          value: formData.get('value'),
                          description: formData.get('description'),
                          expectedCloseDate: formData.get('expectedCloseDate'),
                        });
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Deal Title *</Label>
                          <Input name="title" required placeholder={`${organization.name} - Solution`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input name="value" type="number" placeholder="0" />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Close Date</Label>
                            <Input name="expectedCloseDate" type="date" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea name="description" rows={3} />
                        </div>
                        <Button type="submit" className="w-full" disabled={addDealMutation.isPending}>
                          {addDealMutation.isPending ? "Creating..." : "Create Deal"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {deals.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No deals yet</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsAddDealOpen(true)}>
                        Create First Deal
                      </Button>
                    </Card>
                  ) : (
                    deals.map((deal: any) => (
                      <Card key={deal.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{deal.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{deal.stage}</Badge>
                              {deal.value > 0 && (
                                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                                  ${deal.value.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'No date'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Security Controls Tab */}
              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Existing Security Controls</h3>
                  <Badge variant="outline">{selectedControls.length} selected</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SECURITY_CONTROLS.map(control => (
                    <Button
                      key={control.id}
                      variant={selectedControls.includes(control.id) ? "default" : "outline"}
                      className={`justify-start h-auto py-2 px-3 ${
                        selectedControls.includes(control.id) 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : ''
                      }`}
                      onClick={() => toggleControl(control.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {selectedControls.includes(control.id) ? (
                          <CheckCircle className="h-4 w-4 shrink-0" />
                        ) : (
                          <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium">{control.name}</p>
                          <p className="text-xs opacity-75">{control.category}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              {/* Threat Intelligence Tab */}
              <TabsContent value="threats" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Threat Intelligence</h3>
                    {lastRefresh && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={fetchThreatIntelligence}
                    disabled={isLoadingThreat}
                    className="gap-1"
                  >
                    {isLoadingThreat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>

                {isLoadingThreat ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Scanning threat databases...</p>
                    </div>
                  </div>
                ) : threatIntel ? (
                  <div className="space-y-4">
                    {/* Risk Score Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className={getRiskScoreColor(threatIntel.riskScore)} />
                          Overall Risk Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <span className={`text-4xl font-bold ${getRiskScoreColor(threatIntel.riskScore)}`}>
                            {threatIntel.riskScore}
                          </span>
                          <Progress 
                            value={threatIntel.riskScore} 
                            className="flex-1"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Breaches */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Database className="h-4 w-4 text-red-500" />
                          Data Breaches ({threatIntel.breaches.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {threatIntel.breaches.length === 0 ? (
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            No known breaches found
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {threatIntel.breaches.map((breach, i) => (
                              <div key={i} className="p-2 bg-muted rounded flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{breach.name}</p>
                                  <p className="text-xs text-muted-foreground">{breach.date} - {breach.records} records</p>
                                </div>
                                <Badge className={getSeverityColor(breach.severity)}>{breach.severity}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Leaked Credentials */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Key className="h-4 w-4 text-orange-500" />
                          Leaked Credentials
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {threatIntel.leakedCredentials.count === 0 ? (
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            No leaked credentials found
                          </p>
                        ) : (
                          <div>
                            <p className="text-2xl font-bold text-orange-500">{threatIntel.leakedCredentials.count}</p>
                            <p className="text-xs text-muted-foreground">
                              Sources: {threatIntel.leakedCredentials.sources.join(", ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last seen: {threatIntel.leakedCredentials.lastSeen}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Vulnerabilities */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Bug className="h-4 w-4 text-yellow-500" />
                          Known Vulnerabilities ({threatIntel.vulnerabilities.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {threatIntel.vulnerabilities.length === 0 ? (
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            No critical vulnerabilities detected
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {threatIntel.vulnerabilities.slice(0, 5).map((vuln, i) => (
                              <div key={i} className="p-2 bg-muted rounded">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs">{vuln.cve}</span>
                                  <Badge className={getSeverityColor(vuln.severity)}>{vuln.severity}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{vuln.product}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Exposed Services */}
                    {threatIntel.exposedServices.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Eye className="h-4 w-4 text-purple-500" />
                            Exposed Services ({threatIntel.exposedServices.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {threatIntel.exposedServices.map((svc, i) => (
                              <Badge key={i} variant="outline">
                                {svc.service} (:{svc.port})
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Click refresh to scan for threats</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
