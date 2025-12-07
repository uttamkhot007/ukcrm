import { useState } from "react";
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
import { toast } from "sonner";
import { Plus, Building2, Users, Search, Pencil, Trash2 } from "lucide-react";

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
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Create/Update organization mutation
  const orgMutation = useMutation({
    mutationFn: async (orgData: Partial<AllianceOrganization>) => {
      if (editingOrg) {
        const { error } = await supabase
          .from("alliance_organizations")
          .update({
            name: orgData.name,
            description: orgData.description,
            website: orgData.website,
            industry: orgData.industry,
            status: orgData.status,
          })
          .eq("id", editingOrg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alliance_organizations")
          .insert({
            tenant_id: currentTenant?.id,
            name: orgData.name!,
            description: orgData.description,
            website: orgData.website,
            industry: orgData.industry,
            status: orgData.status || "active",
            created_by: user?.id!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
      setIsOrgDialogOpen(false);
      setEditingOrg(null);
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
      setIsUserDialogOpen(false);
      setEditingUser(null);
      toast.success(editingUser ? "User updated" : "User created");
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
      toast.success("User deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete user: " + error.message);
    },
  });

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allianceUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOrgSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    orgMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      website: formData.get("website") as string,
      industry: formData.get("industry") as string,
      status: formData.get("status") as string,
    });
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
      organization_id: formData.get("organization_id") as string || null,
      escalation_manager_id: formData.get("escalation_manager_id") as string || null,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string,
    });
  };

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
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Alliance Users ({filteredUsers.length})</h3>
            <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
              setIsUserDialogOpen(open);
              if (!open) setEditingUser(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
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
                      <Select name="organization_id" defaultValue={editingUser?.organization_id || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {organizations.map(org => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="escalation_manager_id">Escalation Manager</Label>
                      <Select name="escalation_manager_id" defaultValue={editingUser?.escalation_manager_id || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>{user.location || "-"}</TableCell>
                      <TableCell>{user.role || "-"}</TableCell>
                      <TableCell>{(user.organization as any)?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingUser(user);
                              setIsUserDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Alliance Organizations ({filteredOrgs.length})</h3>
            <Dialog open={isOrgDialogOpen} onOpenChange={(open) => {
              setIsOrgDialogOpen(open);
              if (!open) setEditingOrg(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingOrg ? "Edit Organization" : "Add New Organization"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleOrgSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Name *</Label>
                    <Input id="org-name" name="name" required defaultValue={editingOrg?.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-description">Description</Label>
                    <Textarea id="org-description" name="description" defaultValue={editingOrg?.description || ""} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-website">Website</Label>
                      <Input id="org-website" name="website" defaultValue={editingOrg?.website || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-industry">Industry</Label>
                      <Input id="org-industry" name="industry" defaultValue={editingOrg?.industry || ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-status">Status</Label>
                    <Select name="status" defaultValue={editingOrg?.status || "active"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOrgDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={orgMutation.isPending}>
                      {orgMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgsLoading ? (
              <p>Loading...</p>
            ) : filteredOrgs.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">No organizations found</p>
            ) : (
              filteredOrgs.map(org => (
                <Card key={org.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <CardDescription>{org.industry || "No industry"}</CardDescription>
                      </div>
                      <Badge variant={org.status === "active" ? "default" : "secondary"}>{org.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {org.description && (
                      <p className="text-sm text-muted-foreground">{org.description}</p>
                    )}
                    {org.website && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Website:</span>{" "}
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {org.website}
                        </a>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {allianceUsers.filter(u => u.organization_id === org.id).length} user(s)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingOrg(org);
                          setIsOrgDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteOrgMutation.mutate(org.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
