import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TenantTier = 'starter' | 'professional' | 'enterprise';
export type TenantMemberRole = 'owner' | 'admin' | 'member';

export interface TenantBranding {
  display_name?: string;
  primary_color?: string;
  secondary_color?: string;
  favicon_url?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tier: TenantTier;
  logo_url: string | null;
  branding: TenantBranding | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface TenantMembership {
  tenant_id: string;
  role: TenantMemberRole;
  tenant: Tenant;
}

export interface TenantModule {
  module_key: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenantMemberships: TenantMembership[];
  currentRole: TenantMemberRole | null;
  enabledModules: TenantModule[];
  isLoading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  hasModule: (moduleKey: string) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refetchTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([]);
  const [currentRole, setCurrentRole] = useState<TenantMemberRole | null>(null);
  const [enabledModules, setEnabledModules] = useState<TenantModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = profile?.is_super_admin === true;

  const fetchTenantMemberships = async () => {
    if (!user) {
      setTenantMemberships([]);
      setCurrentTenant(null);
      setCurrentRole(null);
      setEnabledModules([]);
      setIsLoading(false);
      return;
    }
    
    // Wait for profile to be loaded before fetching - this ensures isSuperAdmin is accurate
    if (profile === null) {
      // Profile not yet loaded, keep loading state
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let formattedMemberships: TenantMembership[] = [];

      if (isSuperAdmin) {
        // Super admins can access ALL tenants
        // Using raw query to avoid type issues with columns not yet in generated types
        const { data: allTenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, name, slug, tier, logo_url, branding, settings, created_at')
          .order('name') as { data: any[] | null; error: any };

        if (tenantsError) throw tenantsError;

        formattedMemberships = (allTenants || []).map((tenant) => ({
          tenant_id: tenant.id,
          role: 'owner' as TenantMemberRole,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            tier: tenant.tier as TenantTier,
            logo_url: tenant.logo_url,
            branding: tenant.branding as TenantBranding | null,
            settings: tenant.settings || {},
            is_active: true,
            created_at: tenant.created_at,
          } as Tenant,
        }));
      } else {
        // Regular users only see tenants they're members of
        const { data: memberships, error: membershipError } = await supabase
          .from('tenant_members')
          .select(`
            tenant_id,
            role,
            tenant:tenants (id, name, slug, tier, logo_url, branding, settings, created_at)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active') as { data: any[] | null; error: any };

        if (membershipError) throw membershipError;

        formattedMemberships = (memberships || [])
          .filter((m) => m.tenant)
          .map((m) => ({
            tenant_id: m.tenant_id,
            role: m.role as TenantMemberRole,
            tenant: {
              id: m.tenant.id,
              name: m.tenant.name,
              slug: m.tenant.slug,
              tier: m.tenant.tier as TenantTier,
              logo_url: m.tenant.logo_url,
              branding: m.tenant.branding as TenantBranding | null,
              settings: m.tenant.settings || {},
              is_active: true,
              created_at: m.tenant.created_at,
            } as Tenant,
          }));
      }

      setTenantMemberships(formattedMemberships);

      // Get saved tenant preference or use first available
      const savedTenantId = localStorage.getItem(`tenant_${user.id}`);
      let selectedMembership = formattedMemberships.find(
        (m) => m.tenant_id === savedTenantId
      );

      if (!selectedMembership && formattedMemberships.length > 0) {
        selectedMembership = formattedMemberships[0];
      }

      // If no membership found but profile has tenant_id (for employees), fetch that tenant
      if (!selectedMembership && profile?.tenant_id) {
        const { data: employeeTenant } = await supabase
          .from('tenants')
          .select('id, name, slug, tier, logo_url, branding, settings, created_at')
          .eq('id', profile.tenant_id)
          .single() as { data: any | null; error: any };

        if (employeeTenant) {
          const employeeTenantData: Tenant = {
            id: employeeTenant.id,
            name: employeeTenant.name,
            slug: employeeTenant.slug,
            tier: employeeTenant.tier as TenantTier,
            logo_url: employeeTenant.logo_url,
            branding: employeeTenant.branding as TenantBranding | null,
            settings: employeeTenant.settings || {},
            is_active: true,
            created_at: employeeTenant.created_at,
          };
          setCurrentTenant(employeeTenantData);
          setCurrentRole('member');
          localStorage.setItem(`tenant_${user.id}`, profile.tenant_id);
          await fetchTenantModules(profile.tenant_id);
          return;
        }
      }

      if (selectedMembership) {
        setCurrentTenant(selectedMembership.tenant);
        setCurrentRole(isSuperAdmin ? 'owner' : selectedMembership.role);
        localStorage.setItem(`tenant_${user.id}`, selectedMembership.tenant_id);
        await fetchTenantModules(selectedMembership.tenant_id);
      }
    } catch (err) {
      console.error('Error fetching tenant memberships:', err);
      setError('Failed to load workspace information');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantModules = async (tenantId: string) => {
    try {
      const { data: modules, error: modulesError } = await supabase
        .from('tenant_modules')
        .select('module_key, is_enabled, settings')
        .eq('tenant_id', tenantId)
        .eq('is_enabled', true);

      if (modulesError) throw modulesError;

      setEnabledModules(
        (modules || []).map((m) => ({
          module_key: m.module_key,
          is_enabled: m.is_enabled,
          settings: (m.settings as Record<string, unknown>) || {},
        }))
      );
    } catch (err) {
      console.error('Error fetching tenant modules:', err);
    }
  };

  const switchTenant = async (tenantId: string) => {
    const membership = tenantMemberships.find((m) => m.tenant_id === tenantId);
    if (!membership) {
      throw new Error('You do not have access to this workspace');
    }

    setCurrentTenant(membership.tenant);
    setCurrentRole(isSuperAdmin ? 'owner' : membership.role);
    if (user) {
      localStorage.setItem(`tenant_${user.id}`, tenantId);
    }
    await fetchTenantModules(tenantId);
  };

  const hasModule = (moduleKey: string): boolean => {
    // Super admins have access to all modules
    if (isSuperAdmin) return true;
    return enabledModules.some((m) => m.module_key === moduleKey && m.is_enabled);
  };

  const refetchTenants = async () => {
    await fetchTenantMemberships();
  };

  useEffect(() => {
    fetchTenantMemberships();
  }, [user, profile, isSuperAdmin]);

  const value: TenantContextType = {
    currentTenant,
    tenantMemberships,
    currentRole,
    enabledModules,
    isLoading,
    error,
    switchTenant,
    hasModule,
    isOwner: currentRole === 'owner',
    isAdmin: currentRole === 'owner' || currentRole === 'admin' || isSuperAdmin,
    isSuperAdmin,
    refetchTenants,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
