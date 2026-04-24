import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  User, Mail, Phone, Building2, Crown, Star, Target, Users, 
  Sparkles, Search, Plus, Edit2, Trash2, Loader2, ExternalLink,
  Linkedin, UserCheck, TrendingUp, Shield, ChevronRight, Zap
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ROLE_IN_DEAL_OPTIONS = [
  { value: "decision_maker", label: "Decision Maker", icon: Crown, color: "bg-amber-500" },
  { value: "influencer", label: "Influencer", icon: TrendingUp, color: "bg-purple-500" },
  { value: "evaluator", label: "Evaluator", icon: Target, color: "bg-blue-500" },
  { value: "champion", label: "Champion", icon: Star, color: "bg-green-500" },
  { value: "blocker", label: "Blocker", icon: Shield, color: "bg-red-500" },
  { value: "end_user", label: "End User", icon: User, color: "bg-gray-500" },
  { value: "technical_buyer", label: "Technical Buyer", icon: Zap, color: "bg-cyan-500" },
  { value: "economic_buyer", label: "Economic Buyer", icon: Building2, color: "bg-emerald-500" },
];

const SENIORITY_OPTIONS = [
  { value: "c_level", label: "C-Level" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "individual_contributor", label: "Individual Contributor" },
  { value: "unknown", label: "Unknown" },
];

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  designation: string | null;
  linkedin_url: string | null;
  role_in_deal: string | null;
  is_champion: boolean;
  department: string | null;
  seniority_level: string | null;
  engagement_score: number;
  last_contacted_at: string | null;
  avatar_url: string | null;
  reporting_manager_id: string | null;
  notes: string | null;
}

export function OrganizationContacts() {
  const { currentTenant } = useTenant();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["org-contacts", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!currentTenant?.id,
  });

  const updateContactMutation = useMutation({
    mutationFn: async (contact: Partial<Contact> & { id: string }) => {
      const { error } = await supabase
        .from("contacts")
        .update(contact)
        .eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-contacts"] });
      toast.success("Contact updated");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update contact: " + error.message);
    },
  });

  const enrichContactWithAI = async (contact: Contact) => {
    setIsEnriching(contact.id);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-user", {
        body: { 
          userName: contact.name, 
          organizationName: contact.company || "Unknown" 
        },
      });
      
      if (error) throw error;
      
      if (data) {
        await updateContactMutation.mutateAsync({
          id: contact.id,
          designation: data.current_title || contact.designation,
          linkedin_url: data.linkedin_url || contact.linkedin_url,
          department: data.department || contact.department,
          seniority_level: data.seniority_level || contact.seniority_level,
        });
        toast.success("Contact enriched with AI");
      }
    } catch (error: any) {
      toast.error("Failed to enrich contact: " + error.message);
    } finally {
      setIsEnriching(null);
    }
  };

  const toggleChampion = async (contact: Contact) => {
    await updateContactMutation.mutateAsync({
      id: contact.id,
      is_champion: !contact.is_champion,
    });
  };

  const getRoleIcon = (role: string | null) => {
    const option = ROLE_IN_DEAL_OPTIONS.find((r) => r.value === role);
    if (!option) return User;
    return option.icon;
  };

  const getRoleColor = (role: string | null) => {
    const option = ROLE_IN_DEAL_OPTIONS.find((r) => r.value === role);
    return option?.color || "bg-muted";
  };

  const getRoleLabel = (role: string | null) => {
    const option = ROLE_IN_DEAL_OPTIONS.find((r) => r.value === role);
    return option?.label || "No Role";
  };

  const filteredContacts = contacts?.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === "all" || contact.role_in_deal === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const champions = filteredContacts?.filter((c) => c.is_champion) || [];
  const decisionMakers = filteredContacts?.filter((c) => c.role_in_deal === "decision_maker") || [];

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getReportingManager = (managerId: string | null) => {
    if (!managerId) return null;
    return contacts?.find((c) => c.id === managerId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{decisionMakers.length}</p>
                <p className="text-sm text-muted-foreground">Decision Makers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Star className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{champions.length}</p>
                <p className="text-sm text-muted-foreground">Champions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {contacts?.filter((c) => c.engagement_score >= 50).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Engaged Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_IN_DEAL_OPTIONS.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                <div className="flex items-center gap-2">
                  <role.icon className="w-4 h-4" />
                  {role.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredContacts?.map((contact) => {
          const RoleIcon = getRoleIcon(contact.role_in_deal);
          const reportingManager = getReportingManager(contact.reporting_manager_id);
          
          return (
            <Card 
              key={contact.id} 
              className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                contact.is_champion && "ring-2 ring-green-500/50"
              )}
            >
              {/* Champion Badge */}
              {contact.is_champion && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-green-500 text-white gap-1">
                    <Star className="w-3 h-3" /> Champion
                  </Badge>
                </div>
              )}
              
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="w-16 h-16 ring-2 ring-background shadow-lg">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Role indicator */}
                    <div className={cn(
                      "absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-background",
                      getRoleColor(contact.role_in_deal)
                    )}>
                      <RoleIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.designation || "No title"}
                    </p>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground/70 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {contact.company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 space-y-2">
                  {contact.email && (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a 
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                  {contact.linkedin_url && (
                    <a 
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Reporting Manager */}
                {reportingManager && (
                  <div className="mt-3 p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Reports to:</span>
                    <span className="text-sm font-medium">{reportingManager.name}</span>
                  </div>
                )}

                {/* Role Badge */}
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="secondary" className="gap-1">
                    <RoleIcon className="w-3 h-3" />
                    {getRoleLabel(contact.role_in_deal)}
                  </Badge>
                  
                  {/* Engagement Score */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Engagement:</span>
                    <span className={cn("font-semibold", getEngagementColor(contact.engagement_score))}>
                      {contact.engagement_score}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedContact(contact);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={contact.is_champion ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleChampion(contact)}
                    disabled={updateContactMutation.isPending}
                  >
                    <Star className={cn("w-4 h-4", contact.is_champion && "fill-current text-yellow-500")} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enrichContactWithAI(contact)}
                    disabled={isEnriching === contact.id}
                  >
                    {isEnriching === contact.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!filteredContacts || filteredContacts.length === 0) && (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No contacts found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try adjusting your search" : "Add contacts to get started"}
          </p>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information and deal role
            </DialogDescription>
          </DialogHeader>
          
          {selectedContact && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={selectedContact.name}
                    onChange={(e) => setSelectedContact({ ...selectedContact, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input 
                    value={selectedContact.designation || ""}
                    onChange={(e) => setSelectedContact({ ...selectedContact, designation: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={selectedContact.email || ""}
                    onChange={(e) => setSelectedContact({ ...selectedContact, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={selectedContact.phone || ""}
                    onChange={(e) => setSelectedContact({ ...selectedContact, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input 
                    value={selectedContact.department || ""}
                    onChange={(e) => setSelectedContact({ ...selectedContact, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input 
                    value={selectedContact.linkedin_url || ""}
                    onChange={(e) => setSelectedContact({ ...selectedContact, linkedin_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role in Deal</Label>
                  <Select 
                    value={selectedContact.role_in_deal || ""} 
                    onValueChange={(v) => setSelectedContact({ ...selectedContact, role_in_deal: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_IN_DEAL_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="w-4 h-4" />
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seniority Level</Label>
                  <Select 
                    value={selectedContact.seniority_level || ""} 
                    onValueChange={(v) => setSelectedContact({ ...selectedContact, seniority_level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {SENIORITY_OPTIONS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reporting Manager</Label>
                  <Select 
                    value={selectedContact.reporting_manager_id || ""} 
                    onValueChange={(v) => setSelectedContact({ ...selectedContact, reporting_manager_id: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts?.filter((c) => c.id !== selectedContact.id).map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Engagement Score</Label>
                  <Input 
                    type="number"
                    min={0}
                    max={100}
                    value={selectedContact.engagement_score}
                    onChange={(e) => setSelectedContact({ 
                      ...selectedContact, 
                      engagement_score: parseInt(e.target.value) || 0 
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={selectedContact.notes || ""}
                  onChange={(e) => setSelectedContact({ ...selectedContact, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedContact) {
                  updateContactMutation.mutate(selectedContact);
                }
              }}
              disabled={updateContactMutation.isPending}
            >
              {updateContactMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
