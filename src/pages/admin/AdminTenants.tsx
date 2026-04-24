import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Users, Settings, Package, MoreHorizontal, Loader2, Shield, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useTenant, TenantTier, Tenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TenantMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface TenantModule {
  id: string;
  module_key: string;
  is_enabled: boolean;
}

interface ModuleDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  tier_required: TenantTier | null;
}

export default function AdminTenants() {
  const { isSuperAdmin, refetchTenants } = useTenant();
  const [tenants, setTenants] = useState<any[]>([]);
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
  const [tenantModules, setTenantModules] = useState<TenantModule[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    slug: '',
    tier: 'starter' as TenantTier,
  });

  // Fetch all tenants
  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch module definitions
  const fetchModuleDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('module_definitions')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      console.error('Error fetching modules:', error);
    }
  };

  // Fetch tenant details (members and modules)
  const fetchTenantDetails = async (tenantId: string) => {
    setIsLoadingDetails(true);
    try {
      // Fetch members with profiles
      const { data: members, error: membersError } = await supabase
        .from('tenant_members')
        .select(`
          id,
          user_id,
          role,
          status,
          created_at
        `)
        .eq('tenant_id', tenantId)
        .order('created_at');

      if (membersError) throw membersError;

      // Fetch profiles for members using the safe view that hides super admin status
      const userIds = members?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles_safe')
        .select('user_id, full_name, email, avatar_url, is_super_admin')
        .in('user_id', userIds);

      // Filter out super admins from the member list (they won't be visible to non-super-admins anyway)
      // Super admins accessing this will see all members
      const membersWithProfiles: TenantMember[] = (members || [])
        .filter(m => {
          const profile = profiles?.find(p => p.user_id === m.user_id);
          // Keep member if profile is not a super admin (or if current user is super admin - they see all)
          return !profile?.is_super_admin;
        })
        .map(m => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role as 'owner' | 'admin' | 'member',
          status: m.status,
          created_at: m.created_at,
          profile: profiles?.find(p => p.user_id === m.user_id),
        }));

      setTenantMembers(membersWithProfiles);

      // Fetch tenant modules
      const { data: tenantMods, error: modsError } = await supabase
        .from('tenant_modules')
        .select('id, module_key, is_enabled')
        .eq('tenant_id', tenantId);

      if (modsError) throw modsError;
      setTenantModules(tenantMods || []);
    } catch (error: any) {
      console.error('Error fetching tenant details:', error);
      toast.error('Failed to load tenant details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
      fetchModuleDefinitions();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedTenant) {
      fetchTenantDetails(selectedTenant.id);
    }
  }, [selectedTenant]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Create new tenant
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: newTenantForm.name.trim(),
          slug: newTenantForm.slug.trim(),
          tier: newTenantForm.tier,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A workspace with this URL already exists');
        }
        throw error;
      }

      toast.success('Tenant created successfully!');
      setIsCreateDialogOpen(false);
      setNewTenantForm({ name: '', slug: '', tier: 'starter' });
      fetchTenants();
      refetchTenants();
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast.error(error.message || 'Failed to create tenant');
    } finally {
      setIsCreating(false);
    }
  };

  // Update tenant tier
  const handleUpdateTier = async (tenantId: string, tier: TenantTier) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ tier })
        .eq('id', tenantId);

      if (error) throw error;

      toast.success('Tier updated successfully');
      fetchTenants();
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant({ ...selectedTenant, tier });
      }
    } catch (error: any) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier');
    }
  };

  // Toggle module for tenant
  const handleToggleModule = async (tenantId: string, moduleKey: string, currentState: boolean) => {
    try {
      const existingModule = tenantModules.find(m => m.module_key === moduleKey);

      if (existingModule) {
        const { error } = await supabase
          .from('tenant_modules')
          .update({ is_enabled: !currentState })
          .eq('id', existingModule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_modules')
          .insert({
            tenant_id: tenantId,
            module_key: moduleKey,
            is_enabled: true,
          });

        if (error) throw error;
      }

      toast.success('Module updated');
      fetchTenantDetails(tenantId);
    } catch (error: any) {
      console.error('Error toggling module:', error);
      toast.error('Failed to update module');
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (memberId: string, newRole: 'owner' | 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('tenant_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated');
      if (selectedTenant) {
        fetchTenantDetails(selectedTenant.id);
      }
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  // Filter tenants by search
  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierBadgeVariant = (tier: TenantTier) => {
    switch (tier) {
      case 'enterprise': return 'default';
      case 'professional': return 'secondary';
      default: return 'outline';
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Only super administrators can access tenant management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage all workspaces, configure modules, and assign administrators
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Set up a new workspace for an organization
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Organization Name</Label>
                <Input
                  id="tenant-name"
                  placeholder="Acme Corporation"
                  value={newTenantForm.name}
                  onChange={(e) => setNewTenantForm({
                    ...newTenantForm,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Workspace URL</Label>
                <Input
                  id="tenant-slug"
                  placeholder="acme-corp"
                  value={newTenantForm.slug}
                  onChange={(e) => setNewTenantForm({
                    ...newTenantForm,
                    slug: generateSlug(e.target.value),
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-tier">Subscription Tier</Label>
                <Select
                  value={newTenantForm.tier}
                  onValueChange={(value: TenantTier) => setNewTenantForm({ ...newTenantForm, tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Tenant
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tenants found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant={getTierBadgeVariant(tenant.tier)}>
                        {tenant.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTenant(tenant)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedTenant(tenant)}>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedTenant(tenant)}>
                            <Package className="mr-2 h-4 w-4" />
                            Manage Modules
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tenant Details Sheet */}
      <Sheet open={!!selectedTenant} onOpenChange={(open) => !open && setSelectedTenant(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedTenant?.name}
            </SheetTitle>
            <SheetDescription>
              Configure tenant settings, modules, and administrators
            </SheetDescription>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="settings" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="modules">Modules</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <Label>Organization Name</Label>
                    <Input value={selectedTenant?.name || ''} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label>Workspace Slug</Label>
                    <Input value={selectedTenant?.slug || ''} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label>Subscription Tier</Label>
                    <Select
                      value={selectedTenant?.tier}
                      onValueChange={(value: TenantTier) => selectedTenant && handleUpdateTier(selectedTenant.id, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changing tier affects available modules and features
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Modules Tab */}
              <TabsContent value="modules" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Enable or disable modules for this tenant based on their subscription
                </p>
                <div className="space-y-3">
                  {modules.map((module) => {
                    const isEnabled = tenantModules.some(tm => tm.module_key === module.key && tm.is_enabled);
                    const tierRequired = module.tier_required;
                    const currentTier = selectedTenant?.tier || 'starter';
                    const tierOrder = { starter: 0, professional: 1, enterprise: 2 };
                    const canEnable = !tierRequired || tierOrder[currentTier] >= tierOrder[tierRequired];

                    return (
                      <div
                        key={module.id}
                        className="flex items-center justify-between py-3 px-4 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{module.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {module.description || `${module.category || 'General'} module`}
                          </p>
                          {tierRequired && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Requires {tierRequired}
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={isEnabled}
                          disabled={!canEnable}
                          onCheckedChange={() => selectedTenant && handleToggleModule(selectedTenant.id, module.key, isEnabled)}
                        />
                      </div>
                    );
                  })}
                  {modules.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No modules configured in the system
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Manage tenant administrators and members
                </p>
                <div className="space-y-2">
                  {tenantMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 px-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCog className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>
                      <Select
                        value={member.role}
                        onValueChange={(value: 'owner' | 'admin' | 'member') => handleUpdateMemberRole(member.id, value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {tenantMembers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No members in this tenant yet
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
