import { create } from 'zustand';
import dayjs from 'dayjs';
import {
  AlertEvent,
  AnalyticsSnapshot,
  AppConfig,
  DashboardMetrics,
  ParseError,
  RecordFilters,
  SMDRRecord
} from '../../../shared/types';

export type PageId = 'dashboard' | 'calls' | 'analytics' | 'settings' | 'alerts';

const defaultAnalytics: AnalyticsSnapshot = {
  volumeByHour: [],
  heatmap: [],
  extensionUsage: [],
  transferConference: [],
  correlations: []
};

const defaultDashboard: DashboardMetrics = {
  totalCallsToday: 0,
  totalDurationSeconds: 0,
  incomingCalls: 0,
  outgoingCalls: 0,
  topExtensions: [],
  topDialedNumbers: [],
  longCalls: [],
  activeStream: false
};

interface AppState {
  initialized: boolean;
  isAuthenticated: boolean;
  activePage: PageId;
  theme: 'light' | 'dark';
  connectionStatus: string;
  activeController?: string;
  parserOptions: Record<string, unknown>;
  config?: AppConfig;
  records: SMDRRecord[];
  recordsLoading: boolean;
  alerts: AlertEvent[];
  parseErrors: ParseError[];
  dashboard: DashboardMetrics;
  analytics: AnalyticsSnapshot;
  filters: RecordFilters;
  statusText: string;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  setActivePage: (page: PageId) => void;
  toggleTheme: () => void;
  setFilters: (filters: Partial<RecordFilters>) => void;

  refreshRecords: () => Promise<void>;
  refreshDashboard: (date?: string) => Promise<void>;
  refreshAnalytics: (startDate?: string, endDate?: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshParseErrors: () => Promise<void>;

  saveConfig: (config: AppConfig) => Promise<void>;
  updateAlertRules: (rules: AppConfig['alerts']) => Promise<void>;
  startStream: () => Promise<void>;
  stopStream: () => Promise<void>;
  exportRecords: (format: 'csv' | 'xlsx') => Promise<string | null>;
  purgeRecords: (days: number) => Promise<number>;
}

let unsubscribeEvents: (() => void) | undefined;
let dashboardRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let analyticsRefreshTimer: ReturnType<typeof setTimeout> | undefined;

function durationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  isAuthenticated: false,
  activePage: 'dashboard',
  theme: 'dark',
  connectionStatus: 'disconnected',
  parserOptions: {},
  records: [],
  recordsLoading: false,
  alerts: [],
  parseErrors: [],
  dashboard: defaultDashboard,
  analytics: defaultAnalytics,
  filters: {
    date: dayjs().format('YYYY-MM-DD'),
    limit: 500,
    offset: 0
  },
  statusText: 'Ready',

  initialize: async () => {
    if (get().initialized) return;

    const [config, state, records, dashboard, analytics, alerts, parseErrors] = await Promise.all([
      window.smdrInsight.getConfig(),
      window.smdrInsight.getState(),
      window.smdrInsight.getRecords(get().filters),
      window.smdrInsight.getDashboard(get().filters.date),
      window.smdrInsight.getAnalytics(get().filters.date, get().filters.date),
      window.smdrInsight.getAlerts(200),
      window.smdrInsight.getParseErrors(200)
    ]);

    set({
      config,
      records,
      dashboard,
      analytics,
      alerts: alerts as AlertEvent[],
      parseErrors: parseErrors as ParseError[],
      connectionStatus: String(state.connectionStatus ?? 'disconnected'),
      activeController: state.activeController as string | undefined,
      parserOptions: (state.parserOptions as Record<string, unknown>) ?? {},
      initialized: true,
      statusText: 'Initialized'
    });

    if (!unsubscribeEvents) {
      unsubscribeEvents = window.smdrInsight.onServiceEvent((event) => {
        if (event.type === 'status') {
          set({ connectionStatus: String(event.payload) });
          get().refreshDashboard(get().filters.date);
        }

        if (event.type === 'record') {
          const record = event.payload as SMDRRecord;
          const selectedDate = get().filters.date ?? dayjs().format('YYYY-MM-DD');
          set((state) => {
            const nextDashboard =
              record.date === selectedDate
                ? {
                  ...state.dashboard,
                  totalCallsToday: state.dashboard.totalCallsToday + 1,
                  totalDurationSeconds: state.dashboard.totalDurationSeconds + durationToSeconds(record.duration),
                  outgoingCalls: state.dashboard.outgoingCalls + (record.digitsDialed ? 1 : 0),
                  incomingCalls: state.dashboard.incomingCalls + (record.digitsDialed ? 0 : 1),
                  activeStream: true
                }
                : state.dashboard;

            return {
              records: [record, ...state.records].slice(0, 2000),
              dashboard: nextDashboard,
              statusText: `Live record: ${record.callingParty} -> ${record.calledParty}`
            };
          });

          if (dashboardRefreshTimer) clearTimeout(dashboardRefreshTimer);
          dashboardRefreshTimer = setTimeout(() => {
            void get().refreshDashboard(get().filters.date).catch((error) => {
              console.error('Dashboard refresh failed', error);
            });
          }, 500);

          if (get().activePage === 'analytics') {
            if (analyticsRefreshTimer) clearTimeout(analyticsRefreshTimer);
            analyticsRefreshTimer = setTimeout(() => {
              void get().refreshAnalytics(get().filters.date, get().filters.date).catch((error) => {
                console.error('Analytics refresh failed', error);
              });
            }, 1200);
          }
        }

        if (event.type === 'alert') {
          const alert = event.payload as AlertEvent;
          set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 500) }));
        }

        if (event.type === 'connection-event') {
          const payload = event.payload as { message?: string };
          set({ statusText: payload.message ?? 'Connection event' });
        }

        if (event.type === 'parse-error') {
          const parseError = event.payload as ParseError;
          set((state) => ({
            parseErrors: [parseError, ...state.parseErrors].slice(0, 500),
            statusText: `Parse error: ${parseError.reason}`
          }));
        }
      });
    }
  },

  login: async (username, password) => {
    const ok = await window.smdrInsight.login({ username, password });
    if (ok) {
      set({ isAuthenticated: true });
      await get().initialize();
    }
    return ok;
  },

  setActivePage: (page) => set({ activePage: page }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme: next });
  },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  refreshRecords: async () => {
    set({ recordsLoading: true });
    try {
      const rows = await window.smdrInsight.getRecords(get().filters);
      set({ records: rows });
    } catch (error) {
      console.error('Records refresh failed', error);
      set({ statusText: 'Failed to load filtered call logs' });
    } finally {
      set({ recordsLoading: false });
    }
  },

  refreshDashboard: async (date) => {
    const dashboard = await window.smdrInsight.getDashboard(date ?? get().filters.date);
    set({ dashboard });
  },

  refreshAnalytics: async (startDate, endDate) => {
    const analytics = await window.smdrInsight.getAnalytics(startDate ?? get().filters.date, endDate ?? get().filters.date);
    set({ analytics });
  },

  refreshAlerts: async () => {
    const alerts = (await window.smdrInsight.getAlerts(200)) as AlertEvent[];
    set({ alerts });
  },

  refreshParseErrors: async () => {
    const parseErrors = (await window.smdrInsight.getParseErrors(200)) as ParseError[];
    set({ parseErrors });
  },

  saveConfig: async (config) => {
    await window.smdrInsight.updateConfig(config);
    const state = await window.smdrInsight.getState();
    set({
      config,
      statusText: 'Configuration saved',
      connectionStatus: String(state.connectionStatus ?? 'disconnected'),
      activeController: state.activeController as string | undefined,
      parserOptions: (state.parserOptions as Record<string, unknown>) ?? {}
    });
  },

  updateAlertRules: async (rules) => {
    await window.smdrInsight.updateAlertRules(rules);
    set((state) => ({
      config: state.config ? { ...state.config, alerts: rules } : state.config,
      statusText: 'Alert rules saved'
    }));
  },

  startStream: async () => {
    await window.smdrInsight.startStream();
    set({ statusText: 'Stream started' });
    await get().refreshDashboard(get().filters.date);
  },

  stopStream: async () => {
    await window.smdrInsight.stopStream();
    set({ statusText: 'Stream stopped' });
    await get().refreshDashboard(get().filters.date);
  },

  exportRecords: async (format) => {
    const savedPath = await window.smdrInsight.exportRecordsWithDialog({
      format,
      filters: get().filters
    });
    if (!savedPath) {
      set({ statusText: 'Export canceled' });
      return null;
    }
    set({ statusText: `Export completed: ${savedPath}` });
    return savedPath;
  },

  purgeRecords: async (days) => {
    const removed = await window.smdrInsight.purgeRecords(days);
    set({ statusText: `Purged ${removed} records older than ${days} days` });
    return removed;
  }
}));
