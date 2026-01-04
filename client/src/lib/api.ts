/**
 * API Client - Handles all backend communication
 */

const BASE_URL = "";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || "Request failed", response.status);
  }

  return data;
}

// Auth API
export const auth = {
  login: (email: string, password: string) =>
    request<{ id: string; email: string; role: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  signup: (email: string, password: string) =>
    request<{ id: string; email: string; role: string; orgId: string }>("/api/auth/signup", {
      method: "POST",
      body: { email, password },
    }),

  guest: () =>
    request<{ id: string; email: string; role: string; orgId: string; isGuest: boolean }>("/api/auth/guest", {
      method: "POST",
    }),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  me: () => request<{ id: string; email: string; role: string }>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
};

// Dashboard API
export const dashboard = {
  getStats: () =>
    request<{
      usage: { totalTokens: number; totalCostUsd: number; periodDays: number };
      integrations: { total: number; connected: number };
      roundtables: { total: number; active: number };
    }>("/api/dashboard/stats"),
};

// Projects API
export const projects = {
  list: () => request<any[]>("/api/projects"),
  get: (id: string) => request<any>(`/api/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<any>("/api/projects", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    request<any>(`/api/projects/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    request(`/api/projects/${id}`, { method: "DELETE" }),
};

// Agent API
export const agents = {
  run: (data: { projectId: string; goal: string; mode?: string; provider?: string; model?: string }) =>
    request<{ runId: string }>("/api/agents/run", { method: "POST", body: data }),
  getRun: (runId: string) => request<any>(`/api/agents/run/${runId}`),
  getTraces: (runId: string) => request<any[]>(`/api/agents/run/${runId}/traces`),
};

// Chat/Assistant API
export const assistant = {
  chat: (message: string, context?: string) =>
    request<{ response: string; actions?: any[] }>("/api/assistant/chat", {
      method: "POST",
      body: { message, context },
    }),
};

// Fleet Engine API
export const fleet = {
  getStatus: () => request<any>("/api/fleet/status"),
  createMission: (data: any) =>
    request<any>("/api/fleet/missions", { method: "POST", body: data }),
  getMissions: () => request<any[]>("/api/fleet/missions"),
  getMission: (id: string) => request<any>(`/api/fleet/missions/${id}`),
};

// Roundtable API
export const roundtable = {
  getSessions: () => request<any[]>("/api/roundtable/sessions"),
  createSession: (data: { topic: string; participants: string[] }) =>
    request<any>("/api/roundtable/sessions", { method: "POST", body: data }),
  getSession: (id: string) => request<any>(`/api/roundtable/sessions/${id}`),
  addMessage: (sessionId: string, content: string) =>
    request<any>(`/api/roundtable/sessions/${sessionId}/messages`, {
      method: "POST",
      body: { content },
    }),
};

// Integrations API
export const integrations = {
  list: () => request<any[]>("/api/integrations"),
  connect: (provider: string, metadata?: any) =>
    request<any>("/api/integrations/connect", {
      method: "POST",
      body: { provider, metadataJson: metadata },
    }),
  disconnect: (id: string) =>
    request("/api/integrations/disconnect", { method: "POST", body: { id } }),
};

// Vault/Credentials API
export const vault = {
  getCredentials: () =>
    request<{ credentials: any[]; supportedProviders: string[] }>("/api/vault/credentials"),
  storeCredential: (provider: string, apiKey: string, label?: string) =>
    request<any>("/api/vault/credentials", {
      method: "POST",
      body: { provider, apiKey, label },
    }),
  deleteCredential: (id: string) =>
    request(`/api/vault/credentials/${id}`, { method: "DELETE" }),
  testCredential: (provider: string, apiKey: string) =>
    request<{ valid: boolean; error?: string }>("/api/vault/credentials/test", {
      method: "POST",
      body: { provider, apiKey },
    }),
  getUsage: () => request<any>("/api/vault/usage"),
};

// AI Providers API
export const ai = {
  getProviders: () => request<{ providers: any[]; timestamp: string }>("/api/ai/providers"),
};

// Audit Logs API
export const audit = {
  getLogs: (limit?: number) => request<any[]>(`/api/audit-logs?limit=${limit || 50}`),
};

// System API
export const system = {
  health: () => request<{ status: string; timestamp: string; version: string }>("/api/health"),
  status: () => request<any>("/api/status"),
};

export { ApiError };


// Shopify API
export const shopify = {
  getSession: () =>
    request<{ authenticated: boolean; shop?: string }>("/api/shopify/auth/session"),
  
  getShop: () =>
    request<{ shop: { name: string; email: string; myshopifyDomain: string; plan: { displayName: string }; primaryDomain: { url: string } } }>("/api/shopify/shop"),
  
  getProducts: () =>
    request<{ products: Array<{ id: string; title: string; description: string; handle: string; status: string; image?: string; price?: string }> }>("/api/shopify/products"),
  
  generateDescription: (productId: string, options: { tone?: string; keywords?: string; aiModel?: string }) =>
    request<{ productId: string; originalDescription: string; generatedDescription: string; aiModel: string }>(`/api/shopify/products/${encodeURIComponent(productId)}/generate-description`, {
      method: "POST",
      body: options,
    }),
  
  updateDescription: (productId: string, description: string) =>
    request<{ success: boolean; product: any }>(`/api/shopify/products/${encodeURIComponent(productId)}/description`, {
      method: "PUT",
      body: { description },
    }),
  
  getAuthUrl: (shop: string) => `/api/shopify/auth?shop=${encodeURIComponent(shop)}`,
};
