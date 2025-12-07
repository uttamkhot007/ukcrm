import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ContactDetailsSheet } from "./ContactDetailsSheet";
import { Plus, Search, Users, Building, Mail, Loader2, MoreHorizontal, Pencil, Trash2, Handshake, UserPlus, Download, Eye, Sparkles } from "lucide-react";
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
  company: "",
  designation: "",
  notes: "",
};

export function ContactsView() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactWithRelations | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactWithRelations | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [enrichingContactId, setEnrichingContactId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts-with-relations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, deals:deals(id), leads:leads(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactWithRelations[];
    },
  });

  const createContact = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("contacts").insert({
        name: data.name.trim(),
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        company: data.company.trim() || null,
        designation: data.designation.trim() || null,
        notes: data.notes.trim() || null,
        user_id: user!.id,
        tenant_id: currentTenant?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      closeDialog();
      toast({ title: "Contact created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating contact", description: error.message, variant: "destructive" });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          name: data.name.trim(),
          email: data.email.trim() || null,
          phone: data.phone.trim() || null,
          company: data.company.trim() || null,
          designation: data.designation.trim() || null,
          notes: data.notes.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      company: contact.company || "",
      designation: contact.designation || "",
      notes: contact.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      updateContact.mutate({ id: editingContact.id, data: formData });
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
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    maxLength={100}
                  />
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
                <TableHead>Related</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No contacts found. Create your first contact to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts?.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>{contact.company || "-"}</TableCell>
                    <TableCell>{contact.designation || "-"}</TableCell>
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
                          <DropdownMenuItem onClick={() => setSelectedContact(contact)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
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
    </div>
  );
}
