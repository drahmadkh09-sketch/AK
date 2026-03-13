import { Account, Metric, AuditLog, Insight, Settings } from './types';

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('nio_token') || 'NIO2026';
  return {
    'Content-Type': 'application/json',
    'Authorization': token
  };
};

const handleResponse = async (res: Response, defaultError: string) => {
  if (!res.ok) {
    const text = await res.text();
    let error;
    try {
      error = JSON.parse(text);
    } catch (e) {
      error = { error: text || res.statusText || defaultError };
    }
    throw new Error(error.error || defaultError);
  }
  return res.json();
};

export const api = {
  // Auth
  verifyToken: async (token: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    return res.ok;
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    const res = await fetch(`${API_BASE}/accounts`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch accounts');
    return Array.isArray(data) ? data : [];
  },
  createAccount: async (account: Partial<Account>): Promise<{ id: number }> => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(account),
    });
    return handleResponse(res, 'Failed to create account');
  },
  updateAccount: async (id: number, data: Partial<Account>): Promise<void> => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    await handleResponse(res, 'Failed to update account');
  },
  exportAccounts: async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/accounts/export`, { headers: getHeaders() });
    if (!res.ok) {
      await handleResponse(res, 'Failed to export accounts');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accounts.csv';
    a.click();
  },
  importAccounts: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getHeaders();
    delete (headers as any)['Content-Type']; // Let browser set it for FormData
    const res = await fetch(`${API_BASE}/accounts/import`, {
      method: 'POST',
      headers: headers as any,
      body: formData,
    });
    await handleResponse(res, 'Failed to import accounts');
  },

  // Metrics
  getMetrics: async (accountId: number): Promise<Metric[]> => {
    const res = await fetch(`${API_BASE}/metrics/${accountId}`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch metrics');
    return Array.isArray(data) ? data : [];
  },
  addMetric: async (metric: Partial<Metric>): Promise<void> => {
    const res = await fetch(`${API_BASE}/metrics`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(metric),
    });
    await handleResponse(res, 'Failed to add metric');
  },

  // Alerts
  getAlerts: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/alerts`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch alerts');
    return Array.isArray(data) ? data : [];
  },
  resolveAlert: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status: 'resolved' }),
    });
    await handleResponse(res, 'Failed to resolve alert');
  },

  // Scheduled Posts
  getScheduledPosts: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/scheduled-posts`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch scheduled posts');
    return Array.isArray(data) ? data : [];
  },

  // Ready Assets
  getReadyAssets: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/ready-assets`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch ready assets');
    return Array.isArray(data) ? data : [];
  },
  uploadReadyAssets: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getHeaders();
    delete (headers as any)['Content-Type'];
    const res = await fetch(`${API_BASE}/ready-assets/upload`, {
      method: 'POST',
      headers: headers as any,
      body: formData,
    });
    await handleResponse(res, 'Failed to upload ready assets');
  },
  getExternalAssets: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/external-assets`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch external assets');
    return Array.isArray(data) ? data : [];
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${API_BASE}/audit-logs`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch audit logs');
    return Array.isArray(data) ? data : [];
  },
  addAuditLog: async (log: Partial<AuditLog>): Promise<void> => {
    const res = await fetch(`${API_BASE}/audit-logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(log),
    });
    await handleResponse(res, 'Failed to add audit log');
  },
  batchUpdateAuditLogs: async (ids: number[], data: Partial<AuditLog>): Promise<void> => {
    const res = await fetch(`${API_BASE}/audit-logs/batch`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ ids, data }),
    });
    await handleResponse(res, 'Failed to batch update audit logs');
  },

  // Insights
  getInsights: async (): Promise<Insight[]> => {
    const res = await fetch(`${API_BASE}/insights`, { headers: getHeaders() });
    const data = await handleResponse(res, 'Failed to fetch insights');
    return Array.isArray(data) ? data : [];
  },
  addInsight: async (insight: { content: string; tags: number[] }): Promise<void> => {
    const res = await fetch(`${API_BASE}/insights`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(insight),
    });
    await handleResponse(res, 'Failed to add insight');
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
    return handleResponse(res, 'Failed to fetch settings');
  },
  updateSettings: async (key: string, value: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, value }),
    });
    await handleResponse(res, 'Failed to update settings');
  },

  // Ingestion
  getIngestionStatus: async (): Promise<{ status: string; lastRun: string | null; error: string | null }> => {
    const res = await fetch(`${API_BASE}/ingest/status`, { headers: getHeaders() });
    return handleResponse(res, 'Failed to fetch ingestion status');
  },
  triggerIngestion: async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/ingest/trigger`, {
      method: 'POST',
      headers: getHeaders(),
    });
    await handleResponse(res, 'Failed to trigger ingestion');
  },
};
