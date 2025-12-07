import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Loader2, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SelectWorkspace() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { tenantMemberships, switchTenant, isSuperAdmin, isLoading: tenantLoading, currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');

  // If user already has a current tenant, redirect to home
  useEffect(() => {
    if (currentTenant && !tenantLoading) {
      navigate('/');
    }
  }, [currentTenant, tenantLoading, navigate]);

  // For non-super-admin users with exactly one tenant, auto-select it
  useEffect(() => {
    if (!isSuperAdmin && tenantMemberships.length === 1 && !tenantLoading) {
      handleSelectTenant(tenantMemberships[0].tenant_id);
    }
  }, [isSuperAdmin, tenantMemberships, tenantLoading]);

  const handleSelectTenant = async (tenantId: string) => {
    try {
      await switchTenant(tenantId);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to select workspace');
    }
  };

  const handleSearchTenant = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a workspace ID or name');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      // Search by slug (unique ID) or name
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, name, slug, tier, logo_url')
        .or(`slug.eq.${searchQuery.toLowerCase()},name.ilike.%${searchQuery}%`)
        .limit(1) as { data: any[] | null; error: any };

      if (error) throw error;

      if (!tenants || tenants.length === 0) {
        setSearchError('No workspace found with that ID or name');
        return;
      }

      const tenant = tenants[0];

      // Check if user has access to this tenant
      const { data: membership, error: membershipError } = await supabase
        .from('tenant_members')
        .select('role, status')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        setSearchError('You do not have access to this workspace');
        return;
      }

      setSearchResult({ ...tenant, role: membership.role });
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError('An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'default';
      case 'professional':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">NexusCRM</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Select Workspace</h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin
                ? 'Choose a workspace to manage'
                : 'Enter your workspace ID to continue'}
            </p>
          </div>

          {/* Super Admin: Show all workspaces */}
          {isSuperAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Workspaces</CardTitle>
                <CardDescription>
                  You have access to {tenantMemberships.length} workspace(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {tenantMemberships.map((membership) => (
                  <button
                    key={membership.tenant_id}
                    onClick={() => handleSelectTenant(membership.tenant_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={membership.tenant.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(membership.tenant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{membership.tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {membership.tenant.slug}
                      </p>
                    </div>
                    <Badge variant={getTierBadgeVariant(membership.tenant.tier)}>
                      {membership.tenant.tier}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : (
            /* Regular Users: Search by ID/Name */
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enter Workspace ID</CardTitle>
                <CardDescription>
                  Use your organization's workspace ID or name
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., acme-corp or ACME Corporation"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchError('');
                      setSearchResult(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchTenant()}
                  />
                  <Button onClick={handleSearchTenant} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchError && (
                  <p className="text-sm text-destructive">{searchError}</p>
                )}

                {searchResult && (
                  <button
                    onClick={() => handleSelectTenant(searchResult.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={searchResult.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(searchResult.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{searchResult.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {searchResult.role} access
                      </p>
                    </div>
                    <Badge variant={getTierBadgeVariant(searchResult.tier)}>
                      {searchResult.tier}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </button>
                )}

                {/* Show user's available workspaces if they have any */}
                {tenantMemberships.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Or select from your workspaces:
                    </p>
                    <div className="space-y-2">
                      {tenantMemberships.map((membership) => (
                        <button
                          key={membership.tenant_id}
                          onClick={() => handleSelectTenant(membership.tenant_id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={membership.tenant.logo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(membership.tenant.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate text-sm">
                            {membership.tenant.name}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* User info */}
          <div className="text-center text-sm text-muted-foreground">
            Signed in as {profile?.email || user?.email}
          </div>
        </div>
      </main>
    </div>
  );
}
