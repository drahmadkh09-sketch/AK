import { Account, Metric, AuditLog, Insight, Settings } from './types';

const API_BASE = '/api';

// Debug check for fetch
if (typeof fetch === 'undefined') {
  console.error('CRITICAL: window.fetch is undefined in api.ts');
}

export const api = {
  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    const res = await fetch(`${API_BASE}/accounts`);
    return res.json();
  },
  createAccount: async (account: Partial<Account>): Promise<{ id: number }> => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    return res.json();
  },
  updateAccount: async (id: number, data: Partial<Account>): Promise<void> => {
    await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Metrics
  getMetrics: async (accountId: number): Promise<Metric[]> => {
    const res = await fetch(`${API_BASE}/metrics/${accountId}`);
    return res.json();
  },
  addMetric: async (metric: Partial<Metric>): Promise<void> => {
    await fetch(`${API_BASE}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${API_BASE}/audit-logs`);
    return res.json();
  },
  addAuditLog: async (log: Partial<AuditLog>): Promise<void> => {
    await fetch(`${API_BASE}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
  },
  batchUpdateAuditLogs: async (ids: number[], data: Partial<AuditLog>): Promise<void> => {
    await fetch(`${API_BASE}/audit-logs/batch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, data }),
    });
  },

  // Insights
  getInsights: async (): Promise<Insight[]> => {
    const res = await fetch(`${API_BASE}/insights`);
    return res.json();
  },
  addInsight: async (insight: { content: string; tags: number[] }): Promise<void> => {
    await fetch(`${API_BASE}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insight),
    });
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  updateSettings: async (key: string, value: any): Promise<void> => {
    await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  },
};
