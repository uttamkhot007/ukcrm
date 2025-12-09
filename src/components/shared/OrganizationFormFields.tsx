import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Globe, Sparkles, CheckCircle, XCircle, AlertCircle, Plus, X, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export const ORGANIZATION_TYPES = [
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "distributor", label: "Distributor" },
  { value: "oem", label: "OEM" },
  { value: "reseller", label: "Reseller" },
  { value: "location", label: "Location" },
];

export const INDUSTRY_TYPES = [
  { value: "banking", label: "Banking" },
  { value: "financial_services", label: "Financial Services" },
  { value: "government", label: "Government" },
  { value: "ites", label: "ITES" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "pharma", label: "Pharma" },
  { value: "healthcare", label: "Healthcare Management" },
  { value: "hospitals", label: "Hospitals" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "telecom", label: "Telecom" },
  { value: "energy", label: "Energy & Utilities" },
  { value: "logistics", label: "Logistics & Transportation" },
  { value: "media", label: "Media & Entertainment" },
  { value: "real_estate", label: "Real Estate" },
  { value: "hospitality", label: "Hospitality" },
  { value: "technology", label: "Technology" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

export const CONTACT_ROLES = [
  { value: "ciso", label: "CISO", color: "bg-red-500" },
  { value: "cio", label: "CIO", color: "bg-blue-500" },
  { value: "cto", label: "CTO", color: "bg-purple-500" },
  { value: "cro", label: "CRO", color: "bg-green-500" },
  { value: "cfo", label: "CFO", color: "bg-yellow-500" },
  { value: "security_admin", label: "Security Admin", color: "bg-orange-500" },
  { value: "it_manager", label: "IT Manager", color: "bg-cyan-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

export interface ContactInfo {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isChampion: boolean;
}

export interface KeyTeamMember {
  name: string;
  designation: string;
  linkedinUrl?: string;
}

export interface OrganizationFormData {
  name: string;
  website: string;
  logoUrl: string;
  organizationType: string;
  industry: string;
  description: string;
  address: string;
  solutions: string;
  services: string;
  status: string;
  employeeCount?: string;
  annualRevenue?: string;
  turnover?: string;
  foundedYear?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  phone?: string;
  email?: string;
  spfStatus?: string;
  dmarcStatus?: string;
  dkimStatus?: string;
  contacts?: ContactInfo[];
  keyTeamMembers?: KeyTeamMember[];
  offerings?: string[];
}

interface ExistingAccount {
  id: string;
  name: string;
  website: string;
  logo_url?: string;
}

interface OrganizationFormFieldsProps {
  formData: OrganizationFormData;
  onChange: (data: Partial<OrganizationFormData>) => void;
  showExtendedFields?: boolean;
  showContacts?: boolean;
  isEditing?: boolean;
}

export function OrganizationFormFields({ 
  formData, 
  onChange, 
  showExtendedFields = false,
  showContacts = true,
  isEditing = false 
}: OrganizationFormFieldsProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [matchingAccounts, setMatchingAccounts] = useState<ExistingAccount[]>([]);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const { currentTenant } = useTenant();

  const contacts = formData.contacts || [];

  // Check for existing accounts when domain changes
  useEffect(() => {
    const checkExistingAccounts = async () => {
      if (!formData.website || formData.website.length < 5) {
        setMatchingAccounts([]);
        return;
      }

      try {
        setIsCheckingDomain(true);
        let domain = formData.website;
        try {
          const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
          domain = url.hostname.replace('www.', '');
        } catch {
          domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        }

        // Search for existing organizations with matching domain
        const { data: orgs } = await supabase
          .from('alliance_organizations')
          .select('id, name, website, logo_url')
          .or(`website.ilike.%${domain}%`)
          .eq('tenant_id', currentTenant?.id)
          .limit(5);

        if (orgs && orgs.length > 0) {
          setMatchingAccounts(orgs);
        } else {
          setMatchingAccounts([]);
        }
      } catch (error) {
        console.error('Error checking existing accounts:', error);
      } finally {
        setIsCheckingDomain(false);
      }
    };

    const debounce = setTimeout(checkExistingAccounts, 500);
    return () => clearTimeout(debounce);
  }, [formData.website, currentTenant?.id]);

  // Basic fetch from URL
  const fetchBasicFromUrl = async () => {
    if (!formData.website) return;
    setIsFetching(true);
    try {
      let url = formData.website;
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      
      const domain = new URL(url).hostname.replace("www.", "");
      const companyName = domain.split(".")[0];
      const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      
      onChange({
        name: formData.name || formattedName,
        logoUrl: `https://logo.clearbit.com/${domain}`,
        website: url,
      });
      
      toast.success("Basic organization details fetched");
    } catch (error) {
      toast.error("Failed to parse URL");
    } finally {
      setIsFetching(false);
    }
  };

  // AI-powered enrichment
  const enrichWithAI = async () => {
    if (!formData.website) {
      toast.error("Please enter a website URL first");
      return;
    }
    
    setIsEnriching(true);
    try {
      let url = formData.website;
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }

      // Run both enrichments in parallel
      const [companyResponse, executivesResponse] = await Promise.allSettled([
        supabase.functions.invoke('enrich-company', { body: { websiteUrl: url } }),
        supabase.functions.invoke('enrich-executives', { 
          body: { 
            company_name: formData.name || '', 
            domain: url,
            linkedin_url: formData.linkedinUrl 
          } 
        })
      ]);

      const updates: Partial<OrganizationFormData> = {};

      // Process company enrichment
      if (companyResponse.status === 'fulfilled' && companyResponse.value.data?.data) {
        const enrichedData = companyResponse.value.data.data;
        
        // Always update name if AI found it (more accurate)
        if (enrichedData.name) updates.name = enrichedData.name;
        if (enrichedData.logo_url) updates.logoUrl = enrichedData.logo_url;
        if (enrichedData.description) updates.description = enrichedData.description;
        
        // Map industry to our values
        if (enrichedData.industry) {
          const industryLower = enrichedData.industry.toLowerCase();
          const matchedIndustry = INDUSTRY_TYPES.find(t => 
            industryLower.includes(t.value) || 
            t.label.toLowerCase().includes(industryLower) ||
            industryLower.includes(t.label.toLowerCase())
          );
          updates.industry = matchedIndustry?.value || industryLower.replace(/\s+/g, '_');
        }
        
        if (enrichedData.address) updates.address = enrichedData.address;
        if (enrichedData.total_employees) updates.employeeCount = String(enrichedData.total_employees);
        if (enrichedData.annual_revenue) updates.annualRevenue = enrichedData.annual_revenue;
        if (enrichedData.turnover) updates.turnover = enrichedData.turnover;
        if (enrichedData.founded_year) updates.foundedYear = String(enrichedData.founded_year);
        if (enrichedData.linkedin_url) updates.linkedinUrl = enrichedData.linkedin_url;
        if (enrichedData.twitter_url) updates.twitterUrl = enrichedData.twitter_url;
        if (enrichedData.phone) updates.phone = enrichedData.phone;
        if (enrichedData.email) updates.email = enrichedData.email;
        if (enrichedData.spf_status) updates.spfStatus = enrichedData.spf_status;
        if (enrichedData.dmarc_status) updates.dmarcStatus = enrichedData.dmarc_status;
        if (enrichedData.dkim_status) updates.dkimStatus = enrichedData.dkim_status;
        
        // Key team members from company enrichment
        if (enrichedData.key_team_members && Array.isArray(enrichedData.key_team_members)) {
          updates.keyTeamMembers = enrichedData.key_team_members.map((m: any) => ({
            name: m.name || '',
            designation: m.designation || '',
            linkedinUrl: m.linkedin_url || '',
          }));
        }
        if (enrichedData.offerings && Array.isArray(enrichedData.offerings)) {
          updates.offerings = enrichedData.offerings;
          updates.solutions = enrichedData.offerings.join(', ');
        }
      }

      // Process executives enrichment (more focused on leadership roles)
      if (executivesResponse.status === 'fulfilled' && executivesResponse.value.data?.executives) {
        const executives = executivesResponse.value.data.executives;
        if (Array.isArray(executives) && executives.length > 0) {
          // Merge with existing key team members, avoiding duplicates
          const existingMembers = updates.keyTeamMembers || [];
          const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
          
          for (const exec of executives) {
            if (!existingNames.has(exec.name.toLowerCase())) {
              existingMembers.push({
                name: exec.name,
                designation: exec.designation,
                linkedinUrl: exec.linkedin_url || '',
              });
              existingNames.add(exec.name.toLowerCase());
            }
          }
          updates.keyTeamMembers = existingMembers;
        }
      }

      onChange(updates);
      
      const execCount = updates.keyTeamMembers?.length || 0;
      toast.success(`Organization enriched - Found ${execCount} key executives including CISO, CIO, IT Manager roles`);
    } catch (error: any) {
      console.error("Enrichment error:", error);
      toast.error("Failed to enrich organization: " + (error.message || "Unknown error"));
    } finally {
      setIsEnriching(false);
    }
  };

  const getSecurityStatusIcon = (status: string | undefined) => {
    if (!status) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    const s = status.toLowerCase();
    if (s === 'pass' || s === 'valid') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'fail' || s === 'invalid' || s === 'missing') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  // Contact management
  const addContact = (role: string) => {
    const newContact: ContactInfo = {
      name: "",
      email: "",
      phone: "",
      role,
      isChampion: false,
    };
    onChange({ contacts: [...contacts, newContact] });
  };

  const updateContact = (index: number, updates: Partial<ContactInfo>) => {
    const updatedContacts = contacts.map((c, i) => 
      i === index ? { ...c, ...updates } : c
    );
    onChange({ contacts: updatedContacts });
  };

  const removeContact = (index: number) => {
    onChange({ contacts: contacts.filter((_, i) => i !== index) });
  };

  const toggleChampion = (index: number) => {
    const updatedContacts = contacts.map((c, i) => ({
      ...c,
      isChampion: i === index ? !c.isChampion : false, // Only one champion at a time
    }));
    onChange({ contacts: updatedContacts });
  };

  const getRoleColor = (role: string) => {
    return CONTACT_ROLES.find(r => r.value === role)?.color || "bg-gray-500";
  };

  const getRoleLabel = (role: string) => {
    return CONTACT_ROLES.find(r => r.value === role)?.label || role;
  };

  return (
    <div className="space-y-4">
      {/* URL Fetch Section */}
      <div className="space-y-2">
        <Label>Fetch Organization from URL</Label>
        <div className="flex gap-2">
          <Input 
            value={formData.website}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://example.com" 
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={fetchBasicFromUrl}
            disabled={isFetching || !formData.website}
            title="Fetch basic info"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          </Button>
          <Button 
            type="button" 
            variant="default"
            onClick={enrichWithAI}
            disabled={isEnriching || !formData.website}
            title="Enrich with AI (fetches exact company name & industry)"
            className="gap-1"
          >
            {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use AI enrichment to fetch exact company name, industry type, and other details from public sources
        </p>
      </div>

      {/* Matching Accounts Suggestion */}
      {matchingAccounts.length > 0 && !isEditing && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Existing accounts found with matching domain
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {matchingAccounts.map((account) => (
                <Badge
                  key={account.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-amber-500/20 py-1.5 px-3 gap-2"
                  onClick={() => {
                    toast.info(`Selected existing account: ${account.name}`);
                    // Could emit an event to select this account instead
                  }}
                >
                  {account.logo_url && (
                    <img src={account.logo_url} alt="" className="h-4 w-4 rounded" />
                  )}
                  {account.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click to select an existing account instead of creating a new one
            </p>
          </CardContent>
        </Card>
      )}

      {/* Show fetched logo */}
      {formData.logoUrl && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <img 
            src={formData.logoUrl} 
            alt="Logo" 
            className="w-10 h-10 rounded object-contain bg-white" 
            onError={() => onChange({ logoUrl: "" })} 
          />
          <span className="text-sm text-muted-foreground">Logo fetched from website</span>
        </div>
      )}

      {/* Basic Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Name *</Label>
          <Input 
            id="org-name" 
            name="name" 
            required 
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter company name or fetch from URL"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-type">Organization Type</Label>
          <Select 
            name="organization_type" 
            value={formData.organizationType || "none"}
            onValueChange={(value) => onChange({ organizationType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {ORGANIZATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-description">Description</Label>
        <Textarea 
          id="org-description" 
          name="description" 
          rows={3}
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-industry">Industry (AI will detect automatically)</Label>
        <Select 
          name="industry" 
          value={formData.industry || "none"} 
          onValueChange={(value) => onChange({ industry: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select Industry</SelectItem>
            {INDUSTRY_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-address">Address</Label>
        <Textarea 
          id="org-address" 
          name="address" 
          rows={2}
          value={formData.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </div>

      {showExtendedFields && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employees</Label>
              <Input 
                value={formData.employeeCount || ""}
                onChange={(e) => onChange({ employeeCount: e.target.value })}
                placeholder="e.g. 500"
              />
            </div>
            <div className="space-y-2">
              <Label>Annual Revenue</Label>
              <Input 
                value={formData.annualRevenue || ""}
                onChange={(e) => onChange({ annualRevenue: e.target.value })}
                placeholder="e.g. $10M"
              />
            </div>
            <div className="space-y-2">
              <Label>Founded Year</Label>
              <Input 
                value={formData.foundedYear || ""}
                onChange={(e) => onChange({ foundedYear: e.target.value })}
                placeholder="e.g. 2010"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.phone || ""}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email || ""}
                onChange={(e) => onChange({ email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input 
                value={formData.linkedinUrl || ""}
                onChange={(e) => onChange({ linkedinUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter URL</Label>
              <Input 
                value={formData.twitterUrl || ""}
                onChange={(e) => onChange({ twitterUrl: e.target.value })}
              />
            </div>
          </div>

          {(formData.spfStatus || formData.dmarcStatus || formData.dkimStatus) && (
            <div className="p-3 bg-muted rounded-md space-y-2">
              <Label className="text-sm font-medium">Email Security Status</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  {getSecurityStatusIcon(formData.spfStatus)}
                  <span className="text-sm">SPF: {formData.spfStatus || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {getSecurityStatusIcon(formData.dmarcStatus)}
                  <span className="text-sm">DMARC: {formData.dmarcStatus || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {getSecurityStatusIcon(formData.dkimStatus)}
                  <span className="text-sm">DKIM: {formData.dkimStatus || 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Team Members Section */}
          {formData.keyTeamMembers && formData.keyTeamMembers.length > 0 && (
            <Card className="border-dashed border-primary/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Key Team Members (AI Detected)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.keyTeamMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.designation}</p>
                      </div>
                    </div>
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        LinkedIn
                      </a>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = formData.keyTeamMembers?.filter((_, i) => i !== index) || [];
                        onChange({ keyTeamMembers: updated });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Offerings Section */}
          {formData.offerings && formData.offerings.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Offerings (AI Detected)</Label>
              <div className="flex flex-wrap gap-1.5">
                {formData.offerings.map((offering, index) => (
                  <Badge key={index} variant="secondary" className="text-xs py-1 px-2 gap-1">
                    {offering}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.offerings?.filter((_, i) => i !== index) || [];
                        onChange({ offerings: updated });
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Turnover field */}
          {formData.turnover && (
            <div className="space-y-2">
              <Label>Turnover</Label>
              <Input 
                value={formData.turnover || ""}
                onChange={(e) => onChange({ turnover: e.target.value })}
                placeholder="e.g. ₹50 Cr"
              />
            </div>
          )}
        </>
      )}

      {/* Contact Details Section */}
      {showContacts && (
        <Card className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Key Contacts
              </span>
              <div className="flex flex-wrap gap-1">
                {CONTACT_ROLES.slice(0, 6).map(role => (
                  <Button
                    key={role.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => addContact(role.value)}
                  >
                    <Plus className="h-3 w-3" />
                    {role.label}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add key contacts like CISO, CIO, CTO, CRO, CFO, or Security Admin
              </p>
            ) : (
              contacts.map((contact, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getRoleColor(contact.role)} text-white`}>
                      {getRoleLabel(contact.role)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {/* Champion Toggle */}
                      <Button
                        type="button"
                        variant={contact.isChampion ? "default" : "outline"}
                        size="sm"
                        className={`h-7 gap-1 transition-all ${
                          contact.isChampion 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/30" 
                            : "hover:border-amber-500 hover:text-amber-500"
                        }`}
                        onClick={() => toggleChampion(index)}
                        title={contact.isChampion ? "Remove as Champion" : "Set as Champion"}
                      >
                        <Star className={`h-3.5 w-3.5 ${contact.isChampion ? "fill-current" : ""}`} />
                        {contact.isChampion ? "Champion" : "Set Champion"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeContact(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => updateContact(index, { name: e.target.value })}
                      className="h-8"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, { email: e.target.value })}
                      className="h-8"
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, { phone: e.target.value })}
                      className="h-8"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* OEM specific fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="org-solutions">Solutions (comma-separated)</Label>
          <Input 
            id="org-solutions" 
            name="solutions" 
            placeholder="Solution 1, Solution 2"
            value={formData.solutions}
            onChange={(e) => onChange({ solutions: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-services">Services (comma-separated)</Label>
          <Input 
            id="org-services" 
            name="services" 
            placeholder="Service 1, Service 2"
            value={formData.services}
            onChange={(e) => onChange({ services: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-status">Status</Label>
        <Select 
          name="status" 
          value={formData.status || "active"}
          onValueChange={(value) => onChange({ status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function useOrganizationFormState(initial?: Partial<OrganizationFormData>) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: initial?.name || "",
    website: initial?.website || "",
    logoUrl: initial?.logoUrl || "",
    organizationType: initial?.organizationType || "none",
    industry: initial?.industry || "none",
    description: initial?.description || "",
    address: initial?.address || "",
    solutions: initial?.solutions || "",
    services: initial?.services || "",
    status: initial?.status || "active",
    employeeCount: initial?.employeeCount || "",
    annualRevenue: initial?.annualRevenue || "",
    turnover: initial?.turnover || "",
    foundedYear: initial?.foundedYear || "",
    linkedinUrl: initial?.linkedinUrl || "",
    twitterUrl: initial?.twitterUrl || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    spfStatus: initial?.spfStatus || "",
    dmarcStatus: initial?.dmarcStatus || "",
    dkimStatus: initial?.dkimStatus || "",
    contacts: initial?.contacts || [],
    keyTeamMembers: initial?.keyTeamMembers || [],
    offerings: initial?.offerings || [],
  });

  const updateFormData = (updates: Partial<OrganizationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      website: "",
      logoUrl: "",
      organizationType: "none",
      industry: "none",
      description: "",
      address: "",
      solutions: "",
      services: "",
      status: "active",
      employeeCount: "",
      annualRevenue: "",
      turnover: "",
      foundedYear: "",
      linkedinUrl: "",
      twitterUrl: "",
      phone: "",
      email: "",
      spfStatus: "",
      dmarcStatus: "",
      dkimStatus: "",
      contacts: [],
      keyTeamMembers: [],
      offerings: [],
    });
  };

  return { formData, updateFormData, resetFormData, setFormData };
}
