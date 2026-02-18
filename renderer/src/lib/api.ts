import {
    AlertEvent,
    AnalyticsSnapshot,
    AppConfig,
    AuthCredentials,
    DashboardMetrics,
    ExportDialogOptions,
    ExportOptions,
    ParseError,
    RecordFilters,
    SMDRRecord
} from '../../../shared/types';

const isElectron = typeof window.smdrInsight !== 'undefined';
const API_BASE = ''; // Relative to the served index.html

async function rest<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('smdr_token');
    const headers = {
        ...(options?.headers || {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (response.status === 401) {
        localStorage.removeItem('smdr_token');
    }
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;
}

export const api = {
    isElectron: () => isElectron,

    login: async (credentials: AuthCredentials): Promise<boolean> => {
        if (isElectron) return window.smdrInsight.login(credentials);
        const res = await rest<{ success: boolean; token?: string }>('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (res.success && res.token) {
            localStorage.setItem('smdr_token', res.token);
        }
        return res.success;
    },

    verifyAuth: async (): Promise<boolean> => {
        if (isElectron) return true; // Electron uses IPC, assumes auth state via appStore
        const token = localStorage.getItem('smdr_token');
        if (!token) return false;
        try {
            const res = await rest<{ success: boolean }>('/api/auth/verify');
            return res.success;
        } catch (e) {
            return false;
        }
    },

    logout: async () => {
        localStorage.removeItem('smdr_token');
    },

    getConfig: async (): Promise<AppConfig> => {
        if (isElectron) return window.smdrInsight.getConfig();
        return rest<AppConfig>('/api/config');
    },

    updateConfig: async (config: AppConfig): Promise<boolean> => {
        if (isElectron) return window.smdrInsight.updateConfig(config);
        const res = await rest<{ success: boolean }>('/api/config/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return res.success;
    },

    updateAlertRules: async (rules: AppConfig['alerts']): Promise<boolean> => {
        if (isElectron) return window.smdrInsight.updateAlertRules(rules);
        const res = await rest<{ success: boolean }>('/api/alerts/update-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rules)
        });
        return res.success;
    },

    getState: async (): Promise<Record<string, unknown>> => {
        if (isElectron) return window.smdrInsight.getState();
        return rest<Record<string, unknown>>('/api/state');
    },

    getRecords: async (filters: RecordFilters): Promise<SMDRRecord[]> => {
        if (isElectron) return window.smdrInsight.getRecords(filters);
        const params = new URLSearchParams(filters as any).toString();
        return rest<SMDRRecord[]>(`/api/records?${params}`);
    },

    getDashboard: async (date?: string): Promise<DashboardMetrics> => {
        if (isElectron) return window.smdrInsight.getDashboard(date);
        return rest<DashboardMetrics>(`/api/dashboard${date ? `?date=${date}` : ''}`);
    },

    getAnalytics: async (startDate?: string, endDate?: string): Promise<AnalyticsSnapshot> => {
        if (isElectron) return window.smdrInsight.getAnalytics(startDate, endDate);
        const q = new URLSearchParams();
        if (startDate) q.append('startDate', startDate);
        if (endDate) q.append('endDate', endDate);
        return rest<AnalyticsSnapshot>(`/api/analytics?${q.toString()}`);
    },

    getAlerts: async (limit?: number): Promise<AlertEvent[]> => {
        if (isElectron) return window.smdrInsight.getAlerts(limit) as Promise<AlertEvent[]>;
        return rest<AlertEvent[]>(`/api/alerts${limit ? `?limit=${limit}` : ''}`);
    },

    getParseErrors: async (limit?: number): Promise<ParseError[]> => {
        if (isElectron) return window.smdrInsight.getParseErrors(limit) as Promise<ParseError[]>;
        return rest<ParseError[]>(`/api/parse-errors${limit ? `?limit=${limit}` : ''}`);
    },

    startStream: async (): Promise<boolean> => {
        if (isElectron) return window.smdrInsight.startStream();
        const res = await rest<{ success: boolean }>('/api/stream/start', { method: 'POST' });
        return res.success;
    },

    stopStream: async (): Promise<boolean> => {
        if (isElectron) return window.smdrInsight.stopStream();
        const res = await rest<{ success: boolean }>('/api/stream/stop', { method: 'POST' });
        return res.success;
    },

    purgeRecords: async (days: number): Promise<number> => {
        if (isElectron) return window.smdrInsight.purgeRecords(days);
        const res = await rest<{ removed: number }>(`/api/records/purge?days=${days}`, { method: 'POST' });
        return res.removed;
    },

    exportRecordsWithDialog: async (options: ExportDialogOptions): Promise<string | null> => {
        if (isElectron) return window.smdrInsight.exportRecordsWithDialog(options);

        // Browser mode: Fetch CSV and trigger download
        const params = new URLSearchParams(options.filters as any).toString();
        const url = `${API_BASE}/api/records/export?${params}&format=${options.format}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smdr_token')}`
                }
            });
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `smdr-export-${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            return 'Browser download triggered';
        } catch (error) {
            console.error('[API] Export failed', error);
            alert('Export failed. Please check connection and try again.');
            return null;
        }
    },

    onServiceEvent: (handler: (event: any) => void): (() => void) => {
        if (isElectron) return window.smdrInsight.onServiceEvent(handler);

        console.log('[API] Initializing Real-time updates via SSE');
        const eventSource = new EventSource(`${API_BASE}/api/events`);

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                handler(data);
            } catch (err) {
                console.error('[API] SSE Parse error', err);
            }
        };

        eventSource.onerror = (e) => {
            console.error('[API] SSE Connection error', e);
        };

        return () => {
            console.log('[API] Closing SSE Connection');
            eventSource.close();
        };
    },

    log: (level: string, message: string): void => {
        if (isElectron) {
            window.smdrInsight.log(level, message);
        } else {
            console.log(`[${level.toUpperCase()}] ${message}`);
        }
    }
};
