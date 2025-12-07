import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Sparkles, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const ORGANIZATION_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "distributor", label: "Distributor" },
  { value: "oem", label: "OEM" },
  { value: "partner", label: "Partner" },
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
  { value: "other", label: "Other" },
];

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
  // Extended fields from AI enrichment
  employeeCount?: string;
  annualRevenue?: string;
  foundedYear?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  phone?: string;
  email?: string;
  spfStatus?: string;
  dmarcStatus?: string;
  dkimStatus?: string;
}

interface OrganizationFormFieldsProps {
  formData: OrganizationFormData;
  onChange: (data: Partial<OrganizationFormData>) => void;
  showExtendedFields?: boolean;
  isEditing?: boolean;
}

export function OrganizationFormFields({ 
  formData, 
  onChange, 
  showExtendedFields = false,
  isEditing = false 
}: OrganizationFormFieldsProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // Basic fetch from URL using Clearbit logo
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

  // AI-powered enrichment using the enrich-company edge function
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

      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { websiteUrl: url }
      });

      if (error) throw error;

      if (data?.data) {
        const enrichedData = data.data;
        const updates: Partial<OrganizationFormData> = {};
        if (enrichedData.name && !formData.name) updates.name = enrichedData.name;
        if (enrichedData.logo_url) updates.logoUrl = enrichedData.logo_url;
        if (enrichedData.description) updates.description = enrichedData.description;
        if (enrichedData.industry) updates.industry = enrichedData.industry.toLowerCase().replace(/\s+/g, '_');
        if (enrichedData.address) updates.address = enrichedData.address;
        if (enrichedData.total_employees) updates.employeeCount = String(enrichedData.total_employees);
        if (enrichedData.annual_revenue) updates.annualRevenue = enrichedData.annual_revenue;
        if (enrichedData.founded_year) updates.foundedYear = String(enrichedData.founded_year);
        if (enrichedData.linkedin_url) updates.linkedinUrl = enrichedData.linkedin_url;
        if (enrichedData.twitter_url) updates.twitterUrl = enrichedData.twitter_url;
        if (enrichedData.phone) updates.phone = enrichedData.phone;
        if (enrichedData.email) updates.email = enrichedData.email;
        if (enrichedData.spf_status) updates.spfStatus = enrichedData.spf_status;
        if (enrichedData.dmarc_status) updates.dmarcStatus = enrichedData.dmarc_status;
        if (enrichedData.dkim_status) updates.dkimStatus = enrichedData.dkim_status;

        onChange(updates);
        toast.success("Organization enriched with AI");
      }
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
            title="Enrich with AI"
            className="gap-1"
          >
            {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </div>

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
        <Label htmlFor="org-industry">Industry</Label>
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
          {/* Extended Fields */}
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

          {/* Email Security Status */}
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
        </>
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
    foundedYear: initial?.foundedYear || "",
    linkedinUrl: initial?.linkedinUrl || "",
    twitterUrl: initial?.twitterUrl || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    spfStatus: initial?.spfStatus || "",
    dmarcStatus: initial?.dmarcStatus || "",
    dkimStatus: initial?.dkimStatus || "",
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
      foundedYear: "",
      linkedinUrl: "",
      twitterUrl: "",
      phone: "",
      email: "",
      spfStatus: "",
      dmarcStatus: "",
      dkimStatus: "",
    });
  };

  return { formData, updateFormData, resetFormData, setFormData };
}
