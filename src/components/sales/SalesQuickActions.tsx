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
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Wrench 
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
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    mutationFn: async (data: { name: string; organization_type?: string; website?: string; industry?: string; address?: string }) => {
      const { error } = await supabase.from("alliance_organizations").insert({
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
        name: data.name,
        organization_type: data.organization_type || null,
        website: data.website || null,
        industry: data.industry || null,
        address: data.address || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
      toast.success("Organization created successfully");
      setActiveDialog(null);
    },
    onError: (error) => {
      toast.error("Failed to create organization: " + error.message);
    },
  });

  // Generic item mutation (for solutions/services)
  const itemMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; type: string }) => {
      // Store in alliance_organizations with the appropriate type and data
      const { error } = await supabase.from("alliance_organizations").insert({
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
        name: data.name,
        description: data.description || null,
        organization_type: "oem", // Solutions and services are OEM related
        solutions: data.type === "solution" ? [data.name] : null,
        services: data.type !== "solution" ? [data.name] : null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
      toast.success("Item created successfully");
      setActiveDialog(null);
    },
    onError: (error) => {
      toast.error("Failed to create item: " + error.message);
    },
  });

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
      name: formData.get("name") as string,
      organization_type: orgType === "none" ? undefined : orgType,
      website: formData.get("website") as string,
      industry: formData.get("industry") as string,
      address: formData.get("address") as string,
    });
  };

  const handleItemSubmit = (e: React.FormEvent<HTMLFormElement>, type: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    itemMutation.mutate({
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
      <Dialog open={activeDialog === "organization"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrgSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name *</Label>
                <Input id="org-name" name="name" required />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-website">Website</Label>
                <Input id="org-website" name="website" placeholder="https://example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-industry">Industry</Label>
                <Input id="org-industry" name="industry" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-address">Address</Label>
              <Textarea id="org-address" name="address" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
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
            <form onSubmit={(e) => handleItemSubmit(e, type)} className="space-y-4">
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
                <Button type="submit" disabled={itemMutation.isPending}>
                  {itemMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}