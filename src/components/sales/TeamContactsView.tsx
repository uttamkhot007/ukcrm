import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AllianceOrgProfilePage } from "@/components/admin/AllianceOrgProfilePage";
import { AllianceContactDetailsSheet } from "@/components/admin/AllianceContactDetailsSheet";
import {
  Building2,
  Search,
  Users,
  Loader2,
  UserCircle,
  Phone,
  Mail,
  Globe,
  ChevronRight,
  TrendingUp,
  Award,
} from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface AllianceOrganization {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  status: string | null;
  organization_type: string | null;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  created_at: string;
  account_manager_id: string | null;
  technical_account_manager_id: string | null;
  tenant_id: string | null;
  solutions: string[] | null;
  services: string[] | null;
  security_controls: string[] | null;
  solution_configs: any;
  infrastructure_config: any;
  team_config: any;
  created_by: string;
  updated_at: string;
}

interface AllianceContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  role: string | null;
  organization_id: string | null;
  organization?: AllianceOrganization;
  created_by: string;
  tenant_id: string | null;
  status: string | null;
  linkedin_url: string | null;
  location: string | null;
  notes: string | null;
  dob: string | null;
  anniversary_date: string | null;
  profile_image_url: string | null;
  escalation_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export function TeamContactsView() {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<AllianceOrganization | null>(null);
  const [selectedContact, setSelectedContact] = useState<AllianceContact | null>(null);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // Recursively fetch all subordinates at all levels within tenant
  const { data: teamMembers, isLoading: loadingTeam } = useQuery({
    queryKey: ["team-members-recursive", user?.id, currentTenant?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch all profiles within tenant to build hierarchy
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, manager_id, tenant_id");
      
      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }
      
      const { data: allProfiles, error } = await query;
      
      if (error) throw error;
      if (!allProfiles) return [];
      
      // Recursively find all subordinates
      const findAllSubordinates = (managerId: string, visited = new Set<string>()): TeamMember[] => {
        if (visited.has(managerId)) return []; // Prevent infinite loops
        visited.add(managerId);
        
        const directReports = allProfiles.filter(p => p.manager_id === managerId);
        let allSubordinates: TeamMember[] = [];
        
        for (const report of directReports) {
          allSubordinates.push({
            user_id: report.user_id,
            full_name: report.full_name,
            email: report.email,
            avatar_url: report.avatar_url,
          });
          // Recursively get subordinates of this report
          const nestedSubordinates = findAllSubordinates(report.user_id, visited);
          allSubordinates = [...allSubordinates, ...nestedSubordinates];
        }
        
        return allSubordinates;
      };
      
      return findAllSubordinates(user.id);
    },
    enabled: !!user?.id,
  });

  // Get all team member IDs
  const teamMemberIds = teamMembers?.map(m => m.user_id) || [];

  // Fetch organizations assigned to team members within tenant
  const { data: teamOrganizations, isLoading: loadingOrgs } = useQuery({
    queryKey: ["team-organizations-recursive", teamMemberIds, currentTenant?.id],
    queryFn: async () => {
      if (teamMemberIds.length === 0) return [];
      
      // Build OR condition for all team members
      const conditions = teamMemberIds.map(id => 
        `account_manager_id.eq.${id},technical_account_manager_id.eq.${id}`
      ).join(',');
      
      let query = supabase
        .from("alliance_organizations")
        .select("*")
        .or(conditions);
      
      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }
      
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as AllianceOrganization[];
    },
    enabled: teamMemberIds.length > 0,
  });

  // Fetch contacts from team organizations
  const { data: teamContacts, isLoading: loadingContacts } = useQuery({
    queryKey: ["team-contacts", teamOrganizations?.map(o => o.id)],
    queryFn: async () => {
      if (!teamOrganizations?.length) return [];
      const orgIds = teamOrganizations.map(o => o.id);
      const { data, error } = await supabase
        .from("alliance_users")
        .select("*, organization:alliance_organizations(*)")
        .in("organization_id", orgIds)
        .order("name");
      if (error) throw error;
      return data as AllianceContact[];
    },
    enabled: !!teamOrganizations?.length,
  });

  // Filter contacts based on search and selected member
  const filteredContacts = teamContacts?.filter((contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.organization?.name?.toLowerCase().includes(search.toLowerCase());
    
    if (selectedMember === "all") return matchesSearch;
    
    // Filter by account manager
    const org = contact.organization;
    return matchesSearch && (
      org?.account_manager_id === selectedMember || 
      org?.technical_account_manager_id === selectedMember
    );
  });

  // Filter organizations based on search and selected member
  const filteredOrganizations = teamOrganizations?.filter((org) => {
    const matchesSearch = 
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.industry?.toLowerCase().includes(search.toLowerCase());
    
    if (selectedMember === "all") return matchesSearch;
    
    return matchesSearch && (
      org.account_manager_id === selectedMember || 
      org.technical_account_manager_id === selectedMember
    );
  });

  const getAccountManagerName = (managerId: string | null) => {
    if (!managerId) return "-";
    const member = teamMembers?.find(m => m.user_id === managerId);
    return member?.full_name || "Unknown";
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "prospect": return "outline";
      default: return "outline";
    }
  };

  const getOrgTypeBadgeVariant = (type: string | null) => {
    switch (type) {
      case "customer": return "default";
      case "partner": return "secondary";
      case "vendor": return "outline";
      default: return "outline";
    }
  };

  if (selectedOrg) {
    return (
      <AllianceOrgProfilePage
        organization={selectedOrg}
        onBack={() => setSelectedOrg(null)}
      />
    );
  }

  const isLoading = loadingTeam || loadingOrgs || loadingContacts;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Team Contacts & Accounts</h2>
        <p className="text-muted-foreground">
          View all contacts and organizations managed by your team members
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">{teamMembers?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold">{teamOrganizations?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <UserCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Contacts</p>
              <p className="text-2xl font-bold">{teamContacts?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Accounts</p>
              <p className="text-2xl font-bold">
                {teamOrganizations?.filter(o => o.status === "active").length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts or accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {teamMembers?.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Contacts and Organizations */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-2">
            <UserCircle className="w-4 h-4" />
            Contacts ({filteredContacts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="w-4 h-4" />
            Organizations ({filteredOrganizations?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card className="glass border-border">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No team contacts found</p>
                <p className="text-sm">Your team members have not added any contacts yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Account Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts?.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowContactDetails(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {contact.profile_image_url ? (
                            <img
                              src={contact.profile_image_url}
                              alt={contact.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCircle className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          {contact.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contact.organization?.logo_url ? (
                            <img
                              src={contact.organization.logo_url}
                              alt={contact.organization.name}
                              className="w-6 h-6 rounded object-contain bg-white"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          )}
                          {contact.organization?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{contact.designation || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getAccountManagerName(contact.organization?.account_manager_id || null)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(contact.status)}>
                          {contact.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card className="glass border-border">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrganizations?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No team accounts found</p>
                <p className="text-sm">Your team members have not been assigned any accounts yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Account Manager</TableHead>
                    <TableHead>TAM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations?.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedOrg(org)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={org.name}
                              className="w-8 h-8 rounded-lg object-contain bg-white"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{org.name}</p>
                            {org.website && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {org.website.replace(/^https?:\/\//, "").split("/")[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getOrgTypeBadgeVariant(org.organization_type)}>
                          {org.organization_type || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.industry || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getAccountManagerName(org.account_manager_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getAccountManagerName(org.technical_account_manager_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(org.status)}>
                          {org.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Details Sheet */}
      {selectedContact && (
        <AllianceContactDetailsSheet
          contact={selectedContact}
          organization={selectedContact.organization || null}
          open={showContactDetails}
          onOpenChange={setShowContactDetails}
        />
      )}
    </div>
  );
}