import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TenantTier = 'starter' | 'professional' | 'enterprise';
export type TenantMemberRole = 'owner' | 'admin' | 'member';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tier: TenantTier;
  logo_url: string | null;
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
  refetchTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([]);
  const [currentRole, setCurrentRole] = useState<TenantMemberRole | null>(null);
  const [enabledModules, setEnabledModules] = useState<TenantModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantMemberships = async () => {
    if (!user) {
      setTenantMemberships([]);
      setCurrentTenant(null);
      setCurrentRole(null);
      setEnabledModules([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's tenant memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('tenant_members')
        .select(`
          tenant_id,
          role,
          tenant:tenants (
            id,
            name,
            slug,
            tier,
            logo_url,
            settings,
            is_active,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      const formattedMemberships: TenantMembership[] = (memberships || [])
        .filter((m: any) => m.tenant && m.tenant.is_active)
        .map((m: any) => ({
          tenant_id: m.tenant_id,
          role: m.role as TenantMemberRole,
          tenant: m.tenant as Tenant,
        }));

      setTenantMemberships(formattedMemberships);

      // Get saved tenant preference or use first available
      const savedTenantId = localStorage.getItem(`tenant_${user.id}`);
      let selectedMembership = formattedMemberships.find(
        (m) => m.tenant_id === savedTenantId
      );

      if (!selectedMembership && formattedMemberships.length > 0) {
        selectedMembership = formattedMemberships[0];
      }

      if (selectedMembership) {
        setCurrentTenant(selectedMembership.tenant);
        setCurrentRole(selectedMembership.role);
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
    setCurrentRole(membership.role);
    if (user) {
      localStorage.setItem(`tenant_${user.id}`, tenantId);
    }
    await fetchTenantModules(tenantId);
  };

  const hasModule = (moduleKey: string): boolean => {
    return enabledModules.some((m) => m.module_key === moduleKey && m.is_enabled);
  };

  const refetchTenants = async () => {
    await fetchTenantMemberships();
  };

  useEffect(() => {
    fetchTenantMemberships();
  }, [user]);

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
    isAdmin: currentRole === 'owner' || currentRole === 'admin',
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
