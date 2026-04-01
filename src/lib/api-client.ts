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
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt: number = 0;

function setTokens(tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) {
  accessToken = tokens.accessToken;
  if (tokens.refreshToken) refreshToken = tokens.refreshToken;
  tokenExpiresAt = Date.now() + ((tokens.expiresIn || 3600) * 1000);
  
  localStorage.setItem('nexuscrm_access_token', tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem('nexuscrm_refresh_token', tokens.refreshToken);
  localStorage.setItem('nexuscrm_token_expires', String(tokenExpiresAt));
}

function clearTokens() {
  accessToken = null;
  refreshToken = null;
  tokenExpiresAt = 0;
  localStorage.removeItem('nexuscrm_access_token');
  localStorage.removeItem('nexuscrm_refresh_token');
  localStorage.removeItem('nexuscrm_token_expires');
}

function loadTokens() {
  accessToken = localStorage.getItem('nexuscrm_access_token');
  refreshToken = localStorage.getItem('nexuscrm_refresh_token');
  tokenExpiresAt = parseInt(localStorage.getItem('nexuscrm_token_expires') || '0', 10);
}

// Load on init
loadTokens();

function getAuthHeaders(): Record<string, string> {
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
export const api = {
  auth,
  contacts: createCrudApi('contacts'),
  deals: createCrudApi('deals'),
  tickets: createCrudApi('tickets'),
  organizations: createCrudApi('organizations'),
  ai,
  
  // Raw request for custom endpoints
  request,
};

export default api;
