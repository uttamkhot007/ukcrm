import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ContactDetailsSheet } from "./ContactDetailsSheet";
import { AllianceContactDetailsSheet } from "@/components/admin/AllianceContactDetailsSheet";
import { Plus, Search, Users, Building, Mail, Loader2, MoreHorizontal, Pencil, Trash2, Handshake, UserPlus, Download, Eye, Sparkles, Link2, Building2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { exportToCSV } from "@/lib/csv-export";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

type ContactWithRelations = Contact & {
  deals: { id: string }[];
  leads: { id: string }[];
};

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  organization_id: "",
  designation: "",
  notes: "",
  role: "",
  contact_owner_id: "",
};

export function ContactsView() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactWithRelations | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactWithRelations | null>(null);
  const [selectedAllianceContact, setSelectedAllianceContact] = useState<any>(null);
  const [showAllianceDetails, setShowAllianceDetails] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [enrichingContactId, setEnrichingContactId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Recursively fetch all subordinates at all levels within tenant
  const { data: allUserIds } = useQuery({
    queryKey: ["contacts-user-ids", user?.id, currentTenant?.id],
    queryFn: async () => {
      if (!user?.id) return [user?.id];
      
      // Fetch all profiles within tenant to build hierarchy
      let query = supabase
        .from("profiles")
        .select("user_id, manager_id, tenant_id");
      
      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }
      
      const { data: allProfiles, error } = await query;
      
      if (error) throw error;
      if (!allProfiles) return [user.id];
      
      // Recursively find all subordinates
      const findAllSubordinates = (managerId: string, visited = new Set<string>()): string[] => {
        if (visited.has(managerId)) return [];
        visited.add(managerId);
        
        const directReports = allProfiles.filter(p => p.manager_id === managerId);
        let allSubordinates: string[] = [];
        
        for (const report of directReports) {
          allSubordinates.push(report.user_id);
          const nestedSubordinates = findAllSubordinates(report.user_id, visited);
          allSubordinates = [...allSubordinates, ...nestedSubordinates];
        }
        
        return allSubordinates;
      };
      
      // Include current user + all subordinates
      return [user.id, ...findAllSubordinates(user.id)];
    },
    enabled: !!user?.id,
  });

  // Fetch alliance organizations where user or any subordinate is account manager
  const { data: myAllianceOrgs } = useQuery({
    queryKey: ["my-alliance-orgs", allUserIds, currentTenant?.id],
    queryFn: async () => {
      if (!allUserIds?.length) return [];
      
      // Build OR condition for user and all subordinates
      const conditions = allUserIds.map(id => 
        `account_manager_id.eq.${id},technical_account_manager_id.eq.${id}`
      ).join(',');
      
      let query = supabase
        .from("alliance_organizations")
        .select("id")
        .or(conditions);
      
      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.map(o => o.id) || [];
    },
    enabled: !!allUserIds?.length,
  });

  // Fetch all team members for contact owner selection
  const { data: salesTeamMembers = [] } = useQuery({
    queryKey: ["all-team-members", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department")
        .eq("tenant_id", currentTenant.id)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch all profiles for owner display in table
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles-for-owner", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("tenant_id", currentTenant.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch all non-reseller organizations for the dropdown
  const { data: allOrganizations = [] } = useQuery({
    queryKey: ["alliance-organizations-non-reseller", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .not("organization_type", "ilike", "reseller")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts-with-relations", myAllianceOrgs, allUserIds],
    queryFn: async () => {
      // Fetch all contacts accessible to the user
      // The sync_alliance_user_to_contacts trigger already syncs alliance_users to contacts table
      // So we only need to query the contacts table
      
      let allContacts: ContactWithRelations[] = [];
      
      // Fetch contacts created by user or subordinates
      if (allUserIds?.length) {
        const { data, error } = await supabase
          .from("contacts")
          .select("*, deals:deals(id), leads:leads(id)")
          .in("user_id", allUserIds)
          .order("created_at", { ascending: false });
        if (!error && data) {
          allContacts = [...allContacts, ...data as ContactWithRelations[]];
        }
      }

      // Also fetch contacts linked to alliance orgs managed by user/subordinates
      if (myAllianceOrgs && myAllianceOrgs.length > 0) {
        const { data: allianceData, error: allianceError } = await supabase
          .from("contacts")
          .select("*, deals:deals(id), leads:leads(id)")
          .in("alliance_organization_id", myAllianceOrgs)
          .order("created_at", { ascending: false });
        
        if (!allianceError && allianceData) {
          allContacts = [...allContacts, ...allianceData as ContactWithRelations[]];
        }
      }

      // Deduplicate by ID first, then by email (case-insensitive)
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();
      const uniqueContacts: ContactWithRelations[] = [];
      
      for (const contact of allContacts) {
        // Skip if we've already seen this ID
        if (seenIds.has(contact.id)) continue;
        seenIds.add(contact.id);
        
        // Skip if we've already seen this email (case-insensitive)
        const emailKey = contact.email?.toLowerCase().trim();
        if (emailKey && seenEmails.has(emailKey)) continue;
        if (emailKey) seenEmails.add(emailKey);
        
        uniqueContacts.push(contact);
      }
      
      return uniqueContacts;
    },
  });

  const createContact = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.contact_owner_id) {
        throw new Error("Contact Owner is required");
      }
      const emailToCheck = data.email.trim().toLowerCase();
      
      // Check for duplicate email in alliance_users
      if (emailToCheck) {
        const { data: existingAllianceUser } = await supabase
          .from("alliance_users")
          .select("id, email")
          .ilike("email", emailToCheck)
          .eq("tenant_id", currentTenant?.id || "")
          .maybeSingle();
        
        if (existingAllianceUser) {
          throw new Error("A contact with this email already exists");
        }

        // Also check contacts table
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id, email")
          .ilike("email", emailToCheck)
          .eq("tenant_id", currentTenant?.id || "")
          .maybeSingle();
        
        if (existingContact) {
          throw new Error("A contact with this email already exists");
        }
      }

      // Create in alliance_users which will sync to contacts via trigger
      const { error } = await supabase.from("alliance_users").insert({
        name: data.name.trim(),
        email: emailToCheck || null,
        phone: data.phone.trim() || null,
        organization_id: data.organization_id || null,
        designation: data.designation.trim() || null,
        role: data.role.trim() || null,
        notes: data.notes.trim() || null,
        status: "active",
        created_by: data.contact_owner_id,
        tenant_id: currentTenant?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["alliance-users"] });
      closeDialog();
      toast({ title: "Contact created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating contact", description: error.message, variant: "destructive" });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, data, isAllianceUser }: { id: string; data: typeof formData; isAllianceUser?: boolean }) => {
      const emailToCheck = data.email.trim().toLowerCase();
      
      // Check for duplicate email (excluding current contact)
      if (emailToCheck) {
        const { data: existingAllianceUser } = await supabase
          .from("alliance_users")
          .select("id, email")
          .ilike("email", emailToCheck)
          .eq("tenant_id", currentTenant?.id || "")
          .neq("id", id)
          .maybeSingle();
        
        if (existingAllianceUser) {
          throw new Error("A contact with this email already exists");
        }

        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id, email")
          .ilike("email", emailToCheck)
          .eq("tenant_id", currentTenant?.id || "")
          .neq("id", id)
          .maybeSingle();
        
        if (existingContact) {
          throw new Error("A contact with this email already exists");
        }
      }

      if (isAllianceUser) {
        // Update alliance_user which will sync to contacts via trigger
        const { error } = await supabase
          .from("alliance_users")
          .update({
            name: data.name.trim(),
            email: emailToCheck || null,
            phone: data.phone.trim() || null,
            organization_id: data.organization_id || null,
            designation: data.designation.trim() || null,
            role: data.role.trim() || null,
            notes: data.notes.trim() || null,
            created_by: data.contact_owner_id || undefined,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        // Update regular contact
        const { error } = await supabase
          .from("contacts")
          .update({
            name: data.name.trim(),
            email: emailToCheck || null,
            phone: data.phone.trim() || null,
            alliance_organization_id: data.organization_id || null,
            designation: data.designation.trim() || null,
            notes: data.notes.trim() || null,
            user_id: data.contact_owner_id || undefined,
          })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["alliance-users"] });
      closeDialog();
      toast({ title: "Contact updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating contact", description: error.message, variant: "destructive" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDeleteTarget(null);
      toast({ title: "Contact deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting contact", description: error.message, variant: "destructive" });
    },
  });

  // Enrich contact with AI
  const enrichContact = async (contact: ContactWithRelations) => {
    setEnrichingContactId(contact.id);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-user', {
        body: { 
          userName: contact.name, 
          organizationName: contact.company || '' 
        }
      });
      
      if (error) throw error;
      
      if (data?.data) {
        const enrichedData = data.data;
        
        // Update the contact with enriched data
        const updateData: any = {};
        
        if (enrichedData.current_title || enrichedData.designation) {
          if (!contact.designation) {
            updateData.designation = enrichedData.designation || enrichedData.current_title;
          }
        }
        if (enrichedData.email && !contact.email) {
          updateData.email = enrichedData.email;
        }
        if (enrichedData.phone && !contact.phone) {
          updateData.phone = enrichedData.phone;
        }
        
        // Add enriched info to notes
        let enrichmentNotes = [];
        if (enrichedData.linkedin_url) enrichmentNotes.push(`LinkedIn: ${enrichedData.linkedin_url}`);
        if (enrichedData.location) enrichmentNotes.push(`Location: ${enrichedData.location}`);
        if (enrichedData.bio) enrichmentNotes.push(`Bio: ${enrichedData.bio}`);
        if (enrichedData.education?.length) enrichmentNotes.push(`Education: ${enrichedData.education.join(', ')}`);
        if (enrichedData.skills?.length) enrichmentNotes.push(`Skills: ${enrichedData.skills.slice(0, 5).join(', ')}`);
        if (enrichedData.experience?.length) {
          const recentExp = enrichedData.experience.slice(0, 3).map((e: any) => `${e.title} at ${e.company}`).join('; ');
          enrichmentNotes.push(`Experience: ${recentExp}`);
        }
        
        if (enrichmentNotes.length > 0) {
          const existingNotes = contact.notes || '';
          updateData.notes = existingNotes 
            ? `${existingNotes}\n\n--- AI Enriched Data ---\n${enrichmentNotes.join('\n')}`
            : `--- AI Enriched Data ---\n${enrichmentNotes.join('\n')}`;
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("contacts")
            .update(updateData)
            .eq("id", contact.id);
          
          if (updateError) throw updateError;
          queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          toast({ title: `Enriched data for ${contact.name}` });
        } else {
          toast({ title: "No additional information found for this contact" });
        }
      }
    } catch (error: any) {
      console.error("User enrichment error:", error);
      toast({ title: "Failed to enrich contact data", variant: "destructive" });
    } finally {
      setEnrichingContactId(null);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    setFormData(initialFormData);
  };

  const openEditDialog = (contact: ContactWithRelations) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      organization_id: contact.alliance_organization_id || "",
      designation: contact.designation || "",
      notes: contact.notes || "",
      role: contact.role_in_deal || "",
      contact_owner_id: contact.user_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact && !formData.contact_owner_id) {
      toast({ title: "Contact Owner is required", variant: "destructive" });
      return;
    }
    if (editingContact) {
      const isAllianceUser = editingContact.source_type === 'alliance' || !!editingContact.alliance_user_id;
      updateContact.mutate({ id: editingContact.alliance_user_id || editingContact.id, data: formData, isAllianceUser });
    } else {
      createContact.mutate(formData);
    }
  };

  const filteredContacts = contacts?.filter(
    (contact) =>
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    if (!filteredContacts?.length) return;
    exportToCSV(filteredContacts, "contacts", [
      { key: "name", label: "Name" },
      { key: "email", label: "Email", transform: (v) => String(v || "") },
      { key: "phone", label: "Phone", transform: (v) => String(v || "") },
      { key: "company", label: "Company", transform: (v) => String(v || "") },
      { key: "designation", label: "Designation", transform: (v) => String(v || "") },
      { key: "deals", label: "Deals", transform: (v) => String((v as any[])?.length || 0) },
      { key: "leads", label: "Leads", transform: (v) => String((v as any[])?.length || 0) },
      { key: "notes", label: "Notes", transform: (v) => String(v || "") },
      { key: "created_at", label: "Created", transform: (v) => format(new Date(v as string), "yyyy-MM-dd") },
    ]);
  };

  const uniqueCompanies = new Set(contacts?.map((c) => c.company).filter(Boolean)).size;
  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Contacts</p>
              <p className="text-2xl font-bold">{contacts?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Building className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Companies</p>
              <p className="text-2xl font-bold">{uniqueCompanies}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">With Email</p>
              <p className="text-2xl font-bold">
                {contacts?.filter((c) => c.email).length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!filteredContacts?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingContact ? "Edit Contact" : "Create New Contact"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization_id">Organization</Label>
                  <Select 
                    value={formData.organization_id} 
                    onValueChange={(value) => setFormData({ ...formData, organization_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_owner_id">Contact Owner *</Label>
                <Select 
                  value={formData.contact_owner_id} 
                  onValueChange={(value) => setFormData({ ...formData, contact_owner_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesTeamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex flex-col">
                          <span>{member.full_name || 'Unknown'}</span>
                          {member.department && (
                            <span className="text-xs text-muted-foreground">{member.department}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Decision Maker, Technical Contact"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  maxLength={1000}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingContact ? "Update Contact" : "Create Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="glass border-border">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Related</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No contacts found. Create your first contact to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts?.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {contact.name}
                        {(contact as any).alliance_user_id && (
                          <span title="Linked to Alliance"><Link2 className="h-3 w-3 text-muted-foreground" /></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {contact.company || "-"}
                        {(contact as any).alliance_organization_id && (
                          <span title="Alliance Organization"><Building2 className="h-3 w-3 text-blue-500" /></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{contact.designation || "-"}</TableCell>
                    <TableCell>
                      {allProfiles.find(m => m.user_id === contact.user_id)?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(contact as any).source_type === 'alliance' ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <Building2 className="h-3 w-3 mr-1" />Alliance
                          </Badge>
                        ) : (contact as any).source_type === 'lead' ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <UserPlus className="h-3 w-3 mr-1" />Lead
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Manual
                          </Badge>
                        )}
                        {myAllianceOrgs?.includes((contact as any).alliance_organization_id) && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            My Account
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {contact.deals.length > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Handshake className="w-3 h-3" />
                            {contact.deals.length}
                          </Badge>
                        )}
                        {contact.leads.length > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <UserPlus className="w-3 h-3" />
                            {contact.leads.length}
                          </Badge>
                        )}
                        {contact.deals.length === 0 && contact.leads.length === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(contact.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(contact as any).alliance_user_id ? (
                            <DropdownMenuItem 
                              onClick={async () => {
                                // Fetch the alliance user data
                                const { data: allianceUser } = await supabase
                                  .from("alliance_users")
                                  .select("*")
                                  .eq("id", (contact as any).alliance_user_id)
                                  .single();
                                
                                if (allianceUser) {
                                  let allianceOrg = null;
                                  if (allianceUser.organization_id) {
                                    const { data: org } = await supabase
                                      .from("alliance_organizations")
                                      .select("*")
                                      .eq("id", allianceUser.organization_id)
                                      .single();
                                    allianceOrg = org;
                                  }
                                  setSelectedAllianceContact({ contact: allianceUser, organization: allianceOrg });
                                  setShowAllianceDetails(true);
                                }
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setSelectedContact(contact)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          {(contact as any).alliance_user_id && (
                            <DropdownMenuItem onClick={() => navigate("/admin/alliance")}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open in Alliance Management
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => enrichContact(contact)}
                            disabled={enrichingContactId === contact.id}
                          >
                            {enrichingContactId === contact.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2 text-primary" />
                            )}
                            Enrich with AI
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(contact)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteContact.mutate(deleteTarget.id)}
        title="Delete Contact"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove the contact but keep associated deals and leads.`}
        isDeleting={deleteContact.isPending}
      />

      <ContactDetailsSheet
        contact={selectedContact}
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      />

      <AllianceContactDetailsSheet
        contact={selectedAllianceContact?.contact}
        organization={selectedAllianceContact?.organization}
        open={showAllianceDetails}
        onOpenChange={setShowAllianceDetails}
      />
    </div>
  );
}
