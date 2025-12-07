import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Plus, 
  User, 
  Building2, 
  Lightbulb, 
  Shield, 
  ShieldCheck, 
  Wrench,
  Loader2,
  Globe
} from "lucide-react";

const QUICK_ADD_OPTIONS = [
  { id: "contact", label: "Contact", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "solution", label: "Solution", icon: Lightbulb },
  { id: "offensive_security", label: "Offensive Security Service", icon: Shield },
  { id: "managed_security", label: "Managed Security Service", icon: ShieldCheck },
  { id: "professional_services", label: "Professional Services", icon: Wrench },
];

const ORGANIZATION_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "distributor", label: "Distributor" },
  { value: "oem", label: "OEM" },
  { value: "partner", label: "Partner" },
  { value: "location", label: "Location" },
];

export function SalesQuickActions() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [isFetchingOrg, setIsFetchingOrg] = useState(false);
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch offerings for dropdowns
  const { data: solutions = [] } = useQuery({
    queryKey: ["offerings", "solutions", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data } = await supabase.from("offerings_solutions").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: offensiveServices = [] } = useQuery({
    queryKey: ["offerings", "offensive_security", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data } = await supabase.from("offerings_offensive_security").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: managedServices = [] } = useQuery({
    queryKey: ["offerings", "managed_security", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data } = await supabase.from("offerings_managed_security").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const { data: professionalServices = [] } = useQuery({
    queryKey: ["offerings", "professional_services", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data } = await supabase.from("offerings_professional_services").select("id, name").eq("tenant_id", currentTenant.id).eq("status", "active");
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Fetch organization details from URL
  const fetchOrgFromUrl = async () => {
    if (!orgWebsite) return;
    setIsFetchingOrg(true);
    try {
      let url = orgWebsite;
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      
      const domain = new URL(url).hostname.replace("www.", "");
      const companyName = domain.split(".")[0];
      const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      
      setOrgName(formattedName);
      setOrgLogo(`https://logo.clearbit.com/${domain}`);
      
      toast.success("Organization details fetched from URL");
    } catch (error) {
      toast.error("Failed to parse URL");
    } finally {
      setIsFetchingOrg(false);
    }
  };

  // Contact mutation
  const contactMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; company?: string; designation?: string }) => {
      const { error } = await supabase.from("contacts").insert({
        tenant_id: currentTenant?.id,
        user_id: user?.id!,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        designation: data.designation || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created successfully");
      setActiveDialog(null);
    },
    onError: (error) => {
      toast.error("Failed to create contact: " + error.message);
    },
  });

  // Organization mutation
  const orgMutation = useMutation({
    mutationFn: async (data: { name: string; organization_type?: string; website?: string; industry?: string; address?: string; logo_url?: string }) => {
      const { error } = await supabase.from("alliance_organizations").insert({
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
        name: data.name,
        organization_type: data.organization_type || null,
        website: data.website || null,
        industry: data.industry || null,
        address: data.address || null,
        logo_url: data.logo_url || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
      toast.success("Organization created successfully");
      setActiveDialog(null);
      resetOrgForm();
    },
    onError: (error) => {
      toast.error("Failed to create organization: " + error.message);
    },
  });

  // Offerings mutation - saves to actual offerings tables
  const offeringMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; type: string }) => {
      const insertData = {
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
        name: data.name,
        description: data.description || null,
        status: "active",
      };

      let error;
      switch (data.type) {
        case "solution":
          ({ error } = await supabase.from("offerings_solutions").insert({ ...insertData, category: null }));
          break;
        case "offensive_security":
          ({ error } = await supabase.from("offerings_offensive_security").insert({ ...insertData, service_type: null }));
          break;
        case "managed_security":
          ({ error } = await supabase.from("offerings_managed_security").insert({ ...insertData, service_type: null }));
          break;
        case "professional_services":
          ({ error } = await supabase.from("offerings_professional_services").insert({ ...insertData, service_type: null }));
          break;
      }
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["offerings", variables.type] });
      toast.success("Offering created successfully");
      setActiveDialog(null);
    },
    onError: (error) => {
      toast.error("Failed to create offering: " + error.message);
    },
  });

  const resetOrgForm = () => {
    setOrgWebsite("");
    setOrgName("");
    setOrgLogo("");
    setOrgAddress("");
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    contactMutation.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      company: formData.get("company") as string,
      designation: formData.get("designation") as string,
    });
  };

  const handleOrgSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const orgType = formData.get("organization_type") as string;
    orgMutation.mutate({
      name: orgName || formData.get("name") as string,
      organization_type: orgType === "none" ? undefined : orgType,
      website: orgWebsite || formData.get("website") as string,
      industry: formData.get("industry") as string,
      address: orgAddress || formData.get("address") as string,
      logo_url: orgLogo,
    });
  };

  const handleOfferingSubmit = (e: React.FormEvent<HTMLFormElement>, type: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    offeringMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type,
    });
  };

  const getDialogTitle = () => {
    switch (activeDialog) {
      case "contact": return "Quick Add Contact";
      case "organization": return "Quick Add Organization";
      case "solution": return "Quick Add Solution";
      case "offensive_security": return "Quick Add Offensive Security Service";
      case "managed_security": return "Quick Add Managed Security Service";
      case "professional_services": return "Quick Add Professional Services";
      default: return "Quick Add";
    }
  };

  // Don't render if no tenant or user
  if (!currentTenant || !user) {
    return (
      <Button className="gap-2" disabled>
        <Plus className="h-4 w-4" />
        Quick Add
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Add New</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUICK_ADD_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.id}
                onClick={() => setActiveDialog(option.id)}
                className="gap-2 cursor-pointer"
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Contact Dialog */}
      <Dialog open={activeDialog === "contact"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name *</Label>
                <Input id="contact-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" name="email" type="email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input id="contact-phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-company">Company</Label>
                <Input id="contact-company" name="company" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-designation">Designation</Label>
              <Input id="contact-designation" name="designation" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={contactMutation.isPending}>
                {contactMutation.isPending ? "Creating..." : "Create Contact"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Organization Dialog */}
      <Dialog open={activeDialog === "organization"} onOpenChange={(open) => {
        if (!open) {
          setActiveDialog(null);
          resetOrgForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrgSubmit} className="space-y-4">
            {/* URL Fetch Section */}
            <div className="space-y-2">
              <Label htmlFor="org-website-fetch">Fetch from URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="org-website-fetch" 
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  placeholder="https://example.com" 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={fetchOrgFromUrl}
                  disabled={isFetchingOrg || !orgWebsite}
                >
                  {isFetchingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Show fetched logo */}
            {orgLogo && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <img src={orgLogo} alt="Logo" className="w-10 h-10 rounded object-contain bg-white" onError={() => setOrgLogo("")} />
                <span className="text-sm text-muted-foreground">Logo fetched from website</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name *</Label>
                <Input 
                  id="org-name" 
                  name="name" 
                  required 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-type">Type</Label>
                <Select name="organization_type" defaultValue="none">
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
              <Label htmlFor="org-industry">Industry</Label>
              <Input id="org-industry" name="industry" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-address">Address</Label>
              <Textarea 
                id="org-address" 
                name="address" 
                rows={2}
                value={orgAddress}
                onChange={(e) => setOrgAddress(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setActiveDialog(null); resetOrgForm(); }}>Cancel</Button>
              <Button type="submit" disabled={orgMutation.isPending}>
                {orgMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Solution/Service Dialogs */}
      {["solution", "offensive_security", "managed_security", "professional_services"].map(type => (
        <Dialog key={type} open={activeDialog === type} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => handleOfferingSubmit(e, type)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${type}-name`}>Name *</Label>
                <Input id={`${type}-name`} name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${type}-description`}>Description</Label>
                <Textarea id={`${type}-description`} name="description" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={offeringMutation.isPending}>
                  {offeringMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}