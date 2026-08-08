/**
 * NexusCRM API Client
 * 
 * Drop-in replacement for Supabase client. This client communicates with the
 * self-hosted Fastify backend and AWS Cognito for authentication.
 * 
 * Usage:
 *   import { api } from '@/lib/api-client';
 *   const contacts = await api.contacts.list({ page: 1, limit: 25 });
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============= Token Management =============
// Tokens are held in memory only (see src/lib/token-store.ts). They are never
// written to localStorage/sessionStorage so an XSS bug cannot exfiltrate them.
import { tokenStore } from './token-store';

function setTokens(tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) {
  tokenStore.set(tokens);
}

function clearTokens() {
  tokenStore.clear();
}

function getAuthHeaders(): Record<string, string> {
  const accessToken = tokenStore.get();
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}

// ============= HTTP Client =============
async function request<T = any>(
  path: string,
  options: RequestInit & { params?: Record<string, any> } = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  let url = `${API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.message || data.error || 'Request failed', response.status, data);
  }

  return data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============= Auth =============
export const auth = {
  async login(email: string, password: string) {
    const data = await request<{
      accessToken: string;
      idToken: string;
      refreshToken: string;
      expiresIn: number;
      user: any;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setTokens(data);
    return data;
  },

  async register(email: string, password: string, fullName: string) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
  },

  async confirmEmail(email: string, code: string) {
    return request('/api/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async forgotPassword(email: string) {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearTokens();
    }
  },

  async getUser() {
    return request('/api/auth/me');
  },

  isAuthenticated(): boolean {
    return !!accessToken && Date.now() < tokenExpiresAt;
  },

  getToken(): string | null {
    return accessToken;
  },

  onAuthChange(callback: (isAuthenticated: boolean) => void) {
    const handler = () => callback(false);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  },
};

// ============= CRUD Factory =============
function createCrudApi<T = any>(basePath: string) {
  return {
    async list(params?: { page?: number; limit?: number; search?: string; [key: string]: any }) {
      return request<{ data: T[]; pagination: any }>(`/api/${basePath}`, { params });
    },

    async get(id: string) {
      return request<{ data: T }>(`/api/${basePath}/${id}`);
    },

    async create(data: Partial<T>) {
      return request<{ data: T }>(`/api/${basePath}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Partial<T>) {
      return request<{ data: T }>(`/api/${basePath}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string) {
      return request(`/api/${basePath}/${id}`, { method: 'DELETE' });
    },
  };
}

// ============= AI =============
export const ai = {
  async chat(messages: Array<{ role: string; content: string }>, context = 'general', provider?: string) {
    return request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, context, provider }),
    });
  },

  async getInsights(type: string, data: any, provider?: string) {
    return request('/api/ai/insights', {
      method: 'POST',
      body: JSON.stringify({ type, data, provider }),
    });
  },

  async getProviders() {
    return request('/api/ai/providers');
  },
};

// ============= API Object =============
// Mirrors the routes registered in backend/src/routes/all-routes.ts so
// callers get autocompletion for every table in the system.
const tableRoutes = [
  'contacts', 'deals', 'tickets', 'alliance-organizations', 'alliance-users',
  'assets', 'asset-categories', 'asset-assignments', 'asset-maintenance',
  'attendance', 'attendance-activities', 'activity-definitions',
  'calendar-events', 'chat-conversations', 'chat-messages', 'chat-participants',
  'compliance-frameworks', 'compliance-controls', 'compliance-evidence',
  'compliance-assessments', 'contractors', 'quotations', 'quotation-items',
  'invoices', 'invoice-items', 'estimates', 'estimate-items',
  'deal-activities', 'deal-products', 'deal-registrations', 'deal-stage-log',
  'employee-requests', 'leave-requests', 'leave-policies', 'leave-balances',
  'expense-reports', 'expense-items', 'expense-categories',
  'travel-requests', 'travel-bookings', 'renewals',
  'sales-teams', 'sales-team-members', 'sales-targets', 'sales-territories',
  'sales-forecasts', 'inside-sales-prospects', 'leads',
  'projects', 'project-tasks', 'project-members', 'project-milestones',
  'project-documents', 'tenders', 'tender-documents', 'sops',
  'customer-support-contracts', 'customer-support-tickets', 'customer-deliveries',
  'notifications', 'profiles', 'user-roles', 'user-teams',
  'tenant-members', 'tenants', 'tenant-modules', 'module-definitions',
  'account-groups', 'ledger-accounts', 'voucher-types', 'vouchers',
  'voucher-entries', 'budgets', 'budget-items', 'currencies',
  'cost-centers', 'bank-reconciliation', 'day-book-entries', 'fiscal-years',
  'stock-items', 'stock-groups', 'inventory-items',
  'gst-transactions', 'gst-returns', 'product-catalog',
  'vendors', 'distributors', 'job-postings', 'job-applicants',
  'hr-workflows', 'onboarding-requests', 'resignation-requests',
  'employee-documents', 'employee-events', 'employee-certifications',
  'daily-activities', 'presales-opportunities', 'poc-requests',
  'demo-schedules', 'payment-records', 'post-sale-workflows',
  'accounts-workflows', 'order-processing-requests', 'legal-documents',
  'email-templates', 'email-sequences', 'document-templates',
  'training-sessions', 'learning-courses', 'approval-workflows',
  'canned-responses', 'cybersecurity-news', 'cynet-licenses',
  'integrations', 'team-chat-messages', 'team-reminders',
  'video-calls', 'remote-sessions', 'landing-pages', 'web-form-captures',
  'marketing-journeys', 'sales-automations', 'rotten-deal-settings',
  'tenant-audit-log', 'tenant-invitations', 'organization-settings',
  'organization-notes', 'organization-meetings', 'organization-tasks',
  'support-slas', 'oem-technologies', 'contact-lifecycle-stages',
  'notification-preferences',
] as const;

type TableRoute = typeof tableRoutes[number];
type ApiTables = { [K in TableRoute]: ReturnType<typeof createCrudApi> };

const tableApis = tableRoutes.reduce((acc, route) => {
  acc[route] = createCrudApi(route);
  return acc;
}, {} as ApiTables);

export const api = {
  auth,
  ai,
  ...tableApis,
  // Convenience alias so existing `api.organizations` keeps working
  organizations: createCrudApi('alliance-organizations'),
  // Raw request for custom endpoints
  request,
};

export default api;
