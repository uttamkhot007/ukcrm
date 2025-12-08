import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Building2, Users, Search, Pencil, Trash2, UserPlus, ExternalLink, ChevronDown, ChevronRight, Mail, Phone, MapPin, Linkedin, Star, Sparkles, Brain, Shield, Calendar, Briefcase, Loader2, Globe, UserCircle, Handshake, Upload } from "lucide-react";
import { BulkUploadDialog, BulkUploadType } from "./BulkUploadDialog";
import { AllianceContactDetailsSheet } from "./AllianceContactDetailsSheet";
import { OrganizationFormFields, useOrganizationFormState, ORGANIZATION_TYPES, INDUSTRY_TYPES } from "@/components/shared/OrganizationFormFields";
import { AllianceOrgProfilePage } from "./AllianceOrgProfilePage";
import { AllianceContactProfilePage } from "./AllianceContactProfilePage";

interface AllianceOrganization {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  created_by: string;
  organization_type: string | null;
  logo_url: string | null;
  address: string | null;
  solutions: string[] | null;
  services: string[] | null;
}

interface AllianceUser {
  id: string;
  tenant_id: string | null;
  organization_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  role: string | null;
  escalation_manager_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string;
  organization?: AllianceOrganization;
  escalation_manager?: AllianceUser;
}

export function AllianceModule() {
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<AllianceOrganization | null>(null);
  const [editingUser, setEditingUser] = useState<AllianceUser | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<AllianceOrganization | null>(null);
  const [showOrgProfile, setShowOrgProfile] = useState(false);
  const [isAddUserToOrgOpen, setIsAddUserToOrgOpen] = useState(false);
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>("all");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userIntelligence, setUserIntelligence] = useState<Record<string, any>>({});
  const [selectedContact, setSelectedContact] = useState<AllianceUser | null>(null);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploadType, setBulkUploadType] = useState<BulkUploadType>("alliance-contacts");
  
  // Use shared organization form state
  const { formData: orgFormData, updateFormData: updateOrgFormData, resetFormData: resetOrgFormData, setFormData: setOrgFormData } = useOrganizationFormState();
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing contacts for organization when editing
  const fetchOrgContacts = async (orgId: string) => {
    const { data } = await supabase
      .from('alliance_users')
      .select('*')
      .eq('organization_id', orgId)
      .eq('tenant_id', currentTenant?.id);
    return data || [];
  };

  // Update form when editing organization changes
  useEffect(() => {
    const loadEditingOrg = async () => {
      if (editingOrg) {
        const existingContacts = await fetchOrgContacts(editingOrg.id);
        const formattedContacts = existingContacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          role: c.role || 'other',
          isChampion: c.notes?.includes('[CHAMPION]') || false,
        }));

        setOrgFormData({
          name: editingOrg.name || "",
          website: editingOrg.website || "",
          logoUrl: editingOrg.logo_url || "",
          organizationType: editingOrg.organization_type || "none",
          industry: editingOrg.industry || "none",
          description: editingOrg.description || "",
          address: editingOrg.address || "",
          solutions: editingOrg.solutions?.join(", ") || "",
          services: editingOrg.services?.join(", ") || "",
          status: editingOrg.status || "active",
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
          contacts: formattedContacts,
        });
      }
    };
    loadEditingOrg();
  }, [editingOrg, setOrgFormData, currentTenant?.id]);

  // Fetch organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["alliance-organizations", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data as AllianceOrganization[];
    },
    enabled: !!currentTenant,
  });

  // Fetch users
  const { data: allianceUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["alliance-users", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("alliance_users")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data as AllianceUser[];
    },
    enabled: !!currentTenant,
  });

  // Fetch metadata from URL
  const fetchMetadataFromUrl = async (url: string) => {
    if (!url) return null;
    try {
      // Using a simple approach - in production, you'd use a proper metadata API
      const domain = new URL(url).hostname;
      const logoUrl = `https://logo.clearbit.com/${domain}`;
      return { logoUrl };
    } catch {
      return null;
    }
  };

  // Create/Update organization mutation
  const orgMutation = useMutation({
    mutationFn: async (orgData: Partial<AllianceOrganization> & { contacts?: any[] }) => {
      // Try to fetch logo from website
      let logoUrl = orgData.logo_url;
      if (orgData.website && !logoUrl) {
        const metadata = await fetchMetadataFromUrl(orgData.website);
        if (metadata?.logoUrl) {
          logoUrl = metadata.logoUrl;
        }
      }

      let orgId = editingOrg?.id;

      if (editingOrg) {
        const { error } = await supabase
          .from("alliance_organizations")
          .update({
            name: orgData.name,
            description: orgData.description,
            website: orgData.website,
            industry: orgData.industry,
            status: orgData.status,
            organization_type: orgData.organization_type,
            logo_url: logoUrl,
            address: orgData.address,
            solutions: orgData.solutions,
            services: orgData.services,
          })
          .eq("id", editingOrg.id);
        if (error) throw error;
      } else {
        const { data: newOrg, error } = await supabase
          .from("alliance_organizations")
          .insert({
            tenant_id: currentTenant?.id,
            name: orgData.name!,
            description: orgData.description,
            website: orgData.website,
            industry: orgData.industry,
            status: orgData.status || "active",
            created_by: user?.id!,
            organization_type: orgData.organization_type,
            logo_url: logoUrl,
            address: orgData.address,
            solutions: orgData.solutions,
            services: orgData.services,
          })
          .select('id')
          .single();
        if (error) throw error;
        orgId = newOrg.id;
      }

      // Handle contacts
      if (orgData.contacts && orgData.contacts.length > 0 && orgId) {
        for (const contact of orgData.contacts) {
          const contactNotes = contact.isChampion ? '[CHAMPION] ' + (contact.notes || '') : contact.notes || '';
          
          if (contact.id) {
            // Update existing contact
            await supabase
              .from('alliance_users')
              .update({
                name: contact.name,
                email: contact.email || null,
                phone: contact.phone || null,
                role: contact.role,
                notes: contactNotes,
              })
              .eq('id', contact.id);
          } else if (contact.name) {
            // Create new contact
            await supabase
              .from('alliance_users')
              .insert({
                tenant_id: currentTenant?.id,
                organization_id: orgId,
                name: contact.name,
                email: contact.email || null,
                phone: contact.phone || null,
                role: contact.role,
                notes: contactNotes,
                status: 'active',
                created_by: user?.id!,
              });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["alliance-users"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsOrgDialogOpen(false);
      resetOrgForm();
      toast.success(editingOrg ? "Organization updated" : "Organization created");
    },
    onError: (error) => {
      toast.error("Failed to save organization: " + error.message);
    },
  });

  // Create/Update user mutation
  const userMutation = useMutation({
    mutationFn: async (userData: Partial<AllianceUser>) => {
      if (editingUser) {
        const { error } = await supabase
          .from("alliance_users")
          .update({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            location: userData.location,
            role: userData.role,
            organization_id: userData.organization_id,
            escalation_manager_id: userData.escalation_manager_id,
            status: userData.status,
            notes: userData.notes,
          })
          .eq("id", editingUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alliance_users")
          .insert({
            tenant_id: currentTenant?.id,
            name: userData.name!,
            email: userData.email,
            phone: userData.phone,
            location: userData.location,
            role: userData.role,
            organization_id: userData.organization_id,
            escalation_manager_id: userData.escalation_manager_id,
            status: userData.status || "active",
            notes: userData.notes,
            created_by: user?.id!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-users"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsUserDialogOpen(false);
      setIsAddUserToOrgOpen(false);
      setEditingUser(null);
      setShowContactDetails(false);
      toast.success(editingUser ? "Contact updated" : "Contact created");
    },
    onError: (error) => {
      toast.error("Failed to save user: " + error.message);
    },
  });

  // Delete mutations
  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alliance_organizations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
      toast.success("Organization deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete organization: " + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alliance_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-users"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-with-relations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete contact: " + error.message);
    },
  });

  // Filter organizations - exclude resellers (resellers have their own tab)
  const nonResellerOrgs = organizations.filter(org => 
    org.organization_type?.toLowerCase() !== "reseller"
  );
  
  const filteredOrgs = nonResellerOrgs.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = orgTypeFilter === "all" || org.organization_type === orgTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredUsers = allianceUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOrgUsers = (orgId: string) => allianceUsers.filter(u => u.organization_id === orgId);

  const resetOrgForm = () => {
    resetOrgFormData();
    setEditingOrg(null);
  };

  const handleOrgSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const solutions = orgFormData.solutions ? orgFormData.solutions.split(",").map(s => s.trim()).filter(Boolean) : null;
    const services = orgFormData.services ? orgFormData.services.split(",").map(s => s.trim()).filter(Boolean) : null;

    orgMutation.mutate({
      name: orgFormData.name,
      description: orgFormData.description,
      website: orgFormData.website,
      industry: orgFormData.industry === "none" ? null : orgFormData.industry,
      status: orgFormData.status,
      organization_type: orgFormData.organizationType === "none" ? null : orgFormData.organizationType,
      address: orgFormData.address,
      logo_url: orgFormData.logoUrl,
      solutions,
      services,
      contacts: orgFormData.contacts,
    } as any);
  };

  const handleUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    userMutation.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      location: formData.get("location") as string,
      role: formData.get("role") as string,
      organization_id: (formData.get("organization_id") as string) === "none" ? null : (formData.get("organization_id") as string) || null,
      escalation_manager_id: (formData.get("escalation_manager_id") as string) === "none" ? null : (formData.get("escalation_manager_id") as string) || null,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string,
    });
  };

  const handleAddUserToOrg = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg) return;
    const formData = new FormData(e.currentTarget);
    userMutation.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      location: formData.get("location") as string,
      role: formData.get("role") as string,
      organization_id: selectedOrg.id,
      status: "active",
    });
  };

  const getOrgTypeLabel = (type: string | null) => {
    const found = ORGANIZATION_TYPES.find(t => t.value === type);
    return found?.label || type || "Unknown";
  };

  const getOrgTypeBadgeVariant = (type: string | null): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case "customer": return "default";
      case "distributor": return "secondary";
      case "oem": return "outline";
      case "reseller": return "default";
      case "location": return "secondary";
      default: return "outline";
    }
  };

  // Filter resellers (case-insensitive)
  const resellers = organizations.filter(org => 
    org.organization_type?.toLowerCase() === "reseller"
  );
  const filteredResellers = resellers.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Alliance Management</h2>
          <p className="text-muted-foreground">Manage alliance partners, users, and organizations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="resellers" className="gap-2">
            <Handshake className="h-4 w-4" />
            Resellers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Alliance Contacts ({filteredUsers.length})</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  setBulkUploadType("alliance-contacts");
                  setBulkUploadOpen(true);
                }}
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
              <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
                setIsUserDialogOpen(open);
                if (!open) setEditingUser(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Contact
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required defaultValue={editingUser?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" defaultValue={editingUser?.email || ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" defaultValue={editingUser?.phone || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" name="location" defaultValue={editingUser?.location || ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" name="role" defaultValue={editingUser?.role || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization_id">Organization</Label>
                      <Select name="organization_id" defaultValue={editingUser?.organization_id || "none"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {nonResellerOrgs.map(org => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="escalation_manager_id">Escalation Manager</Label>
                      <Select name="escalation_manager_id" defaultValue={editingUser?.escalation_manager_id || "none"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allianceUsers.filter(u => u.id !== editingUser?.id).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editingUser?.status || "active"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" defaultValue={editingUser?.notes || ""} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={userMutation.isPending}>
                      {userMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No contacts found</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(allianceUser => {
                    const org = organizations.find(o => o.id === allianceUser.organization_id);
                    const isExpanded = expandedUserId === allianceUser.id;
                    const intel = userIntelligence[allianceUser.id];
                    
                    return (
                      <>
                        <TableRow 
                          key={allianceUser.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedContact(allianceUser);
                            setShowContactDetails(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{allianceUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span>{allianceUser.name}</span>
                              {allianceUser.notes?.includes('[CHAMPION]') && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell>{allianceUser.email || "-"}</TableCell>
                          <TableCell>{allianceUser.phone || "-"}</TableCell>
                          <TableCell>{allianceUser.location || "-"}</TableCell>
                          <TableCell>{allianceUser.role || "-"}</TableCell>
                          <TableCell>
                            {org ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrg(org);
                                  setShowOrgProfile(true);
                                }}
                              >
                                {org.name}
                              </Button>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={allianceUser.status === "active" ? "default" : "secondary"}>
                              {allianceUser.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingUser(allianceUser);
                                  setIsUserDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteUserMutation.mutate(allianceUser.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded User Details */}
                        {isExpanded && (
                          <TableRow key={`${allianceUser.id}-expanded`} className="bg-muted/30">
                            <TableCell colSpan={8} className="p-0">
                              <div className="p-6 space-y-6">
                                {/* User Profile Header */}
                                <div className="flex items-start gap-6">
                                  <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                                      {allianceUser.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <h3 className="text-xl font-bold flex items-center gap-2">
                                        {allianceUser.name}
                                        {allianceUser.notes?.includes('[CHAMPION]') && (
                                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                            <Star className="h-3 w-3 mr-1 fill-amber-500" /> Champion
                                          </Badge>
                                        )}
                                      </h3>
                                      <p className="text-muted-foreground">{allianceUser.role || 'No role assigned'}</p>
                                      {org && (
                                        <Button 
                                          variant="link" 
                                          className="h-auto p-0 text-sm"
                                          onClick={() => { setSelectedOrg(org); setShowOrgProfile(true); }}
                                        >
                                          <Building2 className="h-3 w-3 mr-1" />{org.name}
                                        </Button>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                      {allianceUser.email && (
                                        <a href={`mailto:${allianceUser.email}`} className="flex items-center gap-1 text-primary hover:underline">
                                          <Mail className="h-4 w-4" /> {allianceUser.email}
                                        </a>
                                      )}
                                      {allianceUser.phone && (
                                        <a href={`tel:${allianceUser.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                          <Phone className="h-4 w-4" /> {allianceUser.phone}
                                        </a>
                                      )}
                                      {allianceUser.location && (
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                          <MapPin className="h-4 w-4" /> {allianceUser.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Intelligence Cards */}
                                <div className="grid gap-4 md:grid-cols-3">
                                  {/* Engagement Score */}
                                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50">
                                    <CardContent className="pt-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-muted-foreground">Engagement Score</span>
                                        <Brain className="h-4 w-4 text-blue-500" />
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold text-blue-600">78</span>
                                        <span className="text-muted-foreground mb-1">/100</span>
                                      </div>
                                      <Progress value={78} className="mt-2 h-2" />
                                    </CardContent>
                                  </Card>

                                  {/* Relationship Health */}
                                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50">
                                    <CardContent className="pt-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-muted-foreground">Relationship Health</span>
                                        <Shield className="h-4 w-4 text-green-500" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-green-600">Strong</span>
                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">Last interaction: 3 days ago</p>
                                    </CardContent>
                                  </Card>

                                  {/* Influence Level */}
                                  <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200/50">
                                    <CardContent className="pt-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-muted-foreground">Influence Level</span>
                                        <Star className="h-4 w-4 text-purple-500" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-purple-600">
                                          {allianceUser.role?.includes('admin') || allianceUser.role?.includes('manager') ? 'High' : 'Medium'}
                                        </span>
                                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Decision Maker</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">Key stakeholder in procurement</p>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* AI Insights */}
                                <Card className="border-primary/20">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 bg-primary/10 rounded-lg">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                      </div>
                                      <CardTitle className="text-sm">AI Contact Intelligence</CardTitle>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="p-3 bg-muted/50 rounded-lg">
                                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Communication Preference</h4>
                                        <p className="text-sm font-medium">Email preferred, responds within 24hrs</p>
                                      </div>
                                      <div className="p-3 bg-muted/50 rounded-lg">
                                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Best Time to Contact</h4>
                                        <p className="text-sm font-medium">Weekdays, 10 AM - 4 PM IST</p>
                                      </div>
                                      <div className="p-3 bg-muted/50 rounded-lg">
                                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Topics of Interest</h4>
                                        <p className="text-sm font-medium">Cybersecurity, Cloud Migration, Compliance</p>
                                      </div>
                                      <div className="p-3 bg-muted/50 rounded-lg">
                                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Next Action</h4>
                                        <p className="text-sm font-medium text-primary">Schedule quarterly review meeting</p>
                                      </div>
                                    </div>
                                    <div className="p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
                                      <h4 className="text-xs font-medium text-muted-foreground mb-1">AI Recommendation</h4>
                                      <p className="text-sm">Consider inviting to upcoming security summit. High engagement likelihood based on past interactions and expressed interests in cybersecurity solutions.</p>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Notes */}
                                {allianceUser.notes && !allianceUser.notes.startsWith('[CHAMPION]') && (
                                  <Card>
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-sm">Notes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-sm text-muted-foreground">{allianceUser.notes.replace('[CHAMPION] ', '')}</p>
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h3 className="text-lg font-semibold">Alliance Organizations ({filteredOrgs.length})</h3>
            <div className="flex items-center gap-3">
              <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ORGANIZATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isOrgDialogOpen} onOpenChange={(open) => {
                setIsOrgDialogOpen(open);
                if (!open) resetOrgForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Organization
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingOrg ? "Edit Organization" : "Add New Organization"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleOrgSubmit} className="space-y-4">
                    <OrganizationFormFields 
                      formData={orgFormData}
                      onChange={updateOrgFormData}
                      showExtendedFields={true}
                      isEditing={!!editingOrg}
                    />
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsOrgDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={orgMutation.isPending}>
                        {orgMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgsLoading ? (
              <p>Loading...</p>
            ) : filteredOrgs.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">No organizations found</p>
            ) : (
              filteredOrgs.map(org => {
                const orgUsers = getOrgUsers(org.id);
                return (
                  <Card 
                    key={org.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedOrg(org);
                      setShowOrgProfile(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={org.logo_url || ""} alt={org.name} />
                            <AvatarFallback>{org.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{org.name}</CardTitle>
                            <CardDescription>{org.industry || "No industry"}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={getOrgTypeBadgeVariant(org.organization_type)}>
                            {getOrgTypeLabel(org.organization_type)}
                          </Badge>
                          <Badge variant={org.status === "active" ? "default" : "secondary"} className="text-xs">
                            {org.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {org.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{org.description}</p>
                      )}
                      {org.address && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{org.address}</p>
                      )}
                      {org.website && (
                        <p className="text-sm flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <a 
                            href={org.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {org.website.replace(/^https?:\/\//, "")}
                          </a>
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {orgUsers.length} user(s)
                        </p>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingOrg(org);
                              setIsOrgDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteOrgMutation.mutate(org.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Resellers Tab */}
        <TabsContent value="resellers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cyber Security Resellers & MSSPs ({filteredResellers.length})</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  setBulkUploadType("resellers");
                  setBulkUploadOpen(true);
                }}
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
              <Dialog open={isOrgDialogOpen && activeTab === 'resellers' && !editingOrg} onOpenChange={(open) => {
                if (open) {
                  resetOrgForm();
                  updateOrgFormData({ organizationType: "reseller" });
                }
                setIsOrgDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Reseller
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Reseller / MSSP</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleOrgSubmit} className="space-y-4">
                    <OrganizationFormFields 
                      formData={orgFormData}
                      onChange={updateOrgFormData}
                      showExtendedFields={true}
                      isEditing={false}
                    />
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsOrgDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={orgMutation.isPending}>
                        {orgMutation.isPending ? "Saving..." : "Save Reseller"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgsLoading ? (
              <p>Loading...</p>
            ) : filteredResellers.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">No resellers found. Add cyber security MSSPs and resellers from India, Kenya, Uganda, Rwanda and other regions.</p>
            ) : (
              filteredResellers.map(org => {
                const orgUsers = getOrgUsers(org.id);
                return (
                  <Card 
                    key={org.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedOrg(org);
                      setShowOrgProfile(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={org.logo_url || ""} alt={org.name} />
                            <AvatarFallback>{org.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{org.name}</CardTitle>
                            <CardDescription>{org.address || org.industry || "No location"}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={org.status === "active" ? "default" : "secondary"}>
                          {org.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {org.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{org.description}</p>
                      )}
                      {org.solutions && org.solutions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {org.solutions.slice(0, 3).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                          {org.solutions.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{org.solutions.length - 3}</Badge>
                          )}
                        </div>
                      )}
                      {org.website && (
                        <p className="text-sm flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <a 
                            href={org.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {org.website.replace(/^https?:\/\//, "")}
                          </a>
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {orgUsers.length} contact(s)
                        </p>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingOrg(org);
                              setIsOrgDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteOrgMutation.mutate(org.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Organization Profile Page */}
      {showOrgProfile && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-background">
          <AllianceOrgProfilePage 
            organization={selectedOrg}
            onBack={() => setShowOrgProfile(false)}
          />
        </div>
      )}

      {/* Contact Profile Page - Full Window */}
      {showContactDetails && selectedContact && (
        <div className="fixed inset-0 z-50 bg-background">
          <AllianceContactProfilePage
            contact={selectedContact}
            organization={organizations.find(o => o.id === selectedContact.organization_id) || null}
            onBack={() => setShowContactDetails(false)}
            onEdit={(contact) => {
              setEditingUser(contact as AllianceUser);
              setShowContactDetails(false);
              setIsUserDialogOpen(true);
            }}
          />
        </div>
      )}

      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        uploadType={bulkUploadType}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
          queryClient.invalidateQueries({ queryKey: ["alliance-users"] });
        }}
      />
    </div>
  );
}