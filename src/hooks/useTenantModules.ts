import { useTenant } from '@/contexts/TenantContext';

// Module keys that can be enabled/disabled per tenant
export type ModuleKey =
  | 'sales'
  | 'presales'
  | 'inside_sales'
  | 'accounts'
  | 'billing'
  | 'hr'
  | 'ticketing'
  | 'compliance'
  | 'legal'
  | 'renewals'
  | 'tenders'
  | 'ai_assistant'
  | 'projects'
  | 'mss'
  | 'offensive';

interface ModuleConfig {
  key: ModuleKey;
  name: string;
  description: string;
  category: 'sales' | 'operations' | 'hr' | 'finance' | 'support' | 'ai';
  icon: string;
  tierRequired: 'starter' | 'professional' | 'enterprise';
}

export const MODULE_DEFINITIONS: ModuleConfig[] = [
  {
    key: 'sales',
    name: 'Sales Management',
    description: 'Manage leads, deals, contacts, and sales pipeline',
    category: 'sales',
    icon: 'TrendingUp',
    tierRequired: 'starter',
  },
  {
    key: 'presales',
    name: 'Pre-Sales Engineering',
    description: 'POC requests, demos, technical assessments, and RFP responses',
    category: 'sales',
    icon: 'Presentation',
    tierRequired: 'professional',
  },
  {
    key: 'inside_sales',
    name: 'Inside Sales',
    description: 'Prospect management and lead nurturing',
    category: 'sales',
    icon: 'PhoneCall',
    tierRequired: 'professional',
  },
  {
    key: 'accounts',
    name: 'Accounts & Order Processing',
    description: 'Order workflows, AR aging, and contract management',
    category: 'operations',
    icon: 'FileSpreadsheet',
    tierRequired: 'starter',
  },
  {
    key: 'billing',
    name: 'Billing & Invoicing',
    description: 'Invoice management and payment tracking',
    category: 'finance',
    icon: 'Receipt',
    tierRequired: 'starter',
  },
  {
    key: 'hr',
    name: 'HR & Workflows',
    description: 'Employee onboarding, offboarding, and HR workflows',
    category: 'hr',
    icon: 'Users',
    tierRequired: 'professional',
  },
  {
    key: 'ticketing',
    name: 'Support Ticketing',
    description: 'Customer support ticket management',
    category: 'support',
    icon: 'Ticket',
    tierRequired: 'starter',
  },
  {
    key: 'compliance',
    name: 'Compliance Management',
    description: 'Compliance frameworks, controls, and assessments',
    category: 'operations',
    icon: 'Shield',
    tierRequired: 'enterprise',
  },
  {
    key: 'legal',
    name: 'Legal Document Management',
    description: 'Contract and legal document workflows',
    category: 'operations',
    icon: 'Scale',
    tierRequired: 'professional',
  },
  {
    key: 'renewals',
    name: 'Renewal Management',
    description: 'License, contract, and subscription renewals',
    category: 'operations',
    icon: 'RefreshCw',
    tierRequired: 'professional',
  },
  {
    key: 'tenders',
    name: 'Tender Management',
    description: 'Track tender opportunities, bid preparation, and evaluations',
    category: 'sales',
    icon: 'Gavel',
    tierRequired: 'professional',
  },
  {
    key: 'ai_assistant',
    name: 'AI Assistant',
    description: 'AI-powered assistance for employees',
    category: 'ai',
    icon: 'Bot',
    tierRequired: 'professional',
  },
  {
    key: 'projects',
    name: 'Project Management',
    description: 'Manage projects, tasks, milestones, and time tracking',
    category: 'operations',
    icon: 'FolderKanban',
    tierRequired: 'starter',
  },
];

export function useTenantModules() {
  const { currentTenant, enabledModules, hasModule } = useTenant();

  const getAvailableModules = () => {
    if (!currentTenant) return [];

    const tierOrder = { starter: 0, professional: 1, enterprise: 2 };
    const currentTierLevel = tierOrder[currentTenant.tier];

    return MODULE_DEFINITIONS.filter((module) => {
      const requiredTierLevel = tierOrder[module.tierRequired];
      return requiredTierLevel <= currentTierLevel;
    });
  };

  const getEnabledModuleConfigs = () => {
    return MODULE_DEFINITIONS.filter((module) => hasModule(module.key));
  };

  const getModuleSettings = (moduleKey: ModuleKey) => {
    const module = enabledModules.find((m) => m.module_key === moduleKey);
    return module?.settings || {};
  };

  const canAccessModule = (moduleKey: ModuleKey): boolean => {
    return hasModule(moduleKey);
  };

  return {
    availableModules: getAvailableModules(),
    enabledModules: getEnabledModuleConfigs(),
    hasModule,
    canAccessModule,
    getModuleSettings,
    currentTier: currentTenant?.tier || 'starter',
  };
}
