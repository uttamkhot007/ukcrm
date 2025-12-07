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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Plus, 
  User, 
  Building2, 
  Loader2,
} from "lucide-react";
import { OrganizationFormFields, useOrganizationFormState } from "@/components/shared/OrganizationFormFields";

const QUICK_ADD_OPTIONS = [
  { id: "contact", label: "Contact", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
];

export function SalesQuickActions() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use shared organization form state
  const { formData: orgFormData, updateFormData: updateOrgFormData, resetFormData: resetOrgForm } = useOrganizationFormState();

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
    mutationFn: async (data: {
      name: string;
      organization_type?: string;
      website?: string;
      industry?: string;
      address?: string;
      logo_url?: string;
      description?: string;
      solutions?: string[] | null;
      services?: string[] | null;
    }) => {
      const { error } = await supabase.from("alliance_organizations").insert({
        tenant_id: currentTenant?.id,
        created_by: user?.id!,
        name: data.name,
        organization_type: data.organization_type || null,
        website: data.website || null,
        industry: data.industry || null,
        address: data.address || null,
        logo_url: data.logo_url || null,
        description: data.description || null,
        solutions: data.solutions,
        services: data.services,
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
    
    const solutions = orgFormData.solutions ? orgFormData.solutions.split(",").map(s => s.trim()).filter(Boolean) : null;
    const services = orgFormData.services ? orgFormData.services.split(",").map(s => s.trim()).filter(Boolean) : null;
    
    orgMutation.mutate({
      name: orgFormData.name,
      organization_type: orgFormData.organizationType === "none" ? undefined : orgFormData.organizationType,
      website: orgFormData.website,
      industry: orgFormData.industry === "none" ? undefined : orgFormData.industry,
      address: orgFormData.address,
      logo_url: orgFormData.logoUrl,
      description: orgFormData.description,
      solutions,
      services,
    });
  };

  const getDialogTitle = () => {
    switch (activeDialog) {
      case "contact": return "Add New Contact";
      case "organization": return "Add New Organization";
      default: return "Quick Add";
    }
  };

  // Show loading state if tenant or user not yet loaded
  const isLoading = !currentTenant || !user;
  
  if (isLoading) {
    return (
      <Button className="gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
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

      {/* Organization Dialog - uses shared form */}
      <Dialog open={activeDialog === "organization"} onOpenChange={(open) => {
        if (!open) {
          setActiveDialog(null);
          resetOrgForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrgSubmit} className="space-y-4">
            <OrganizationFormFields 
              formData={orgFormData}
              onChange={updateOrgFormData}
              showExtendedFields={true}
            />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setActiveDialog(null); resetOrgForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={orgMutation.isPending}>
                {orgMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
