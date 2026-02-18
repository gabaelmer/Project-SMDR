import { contextBridge, ipcRenderer } from 'electron';
import {
  AlertRuleSet,
  AnalyticsSnapshot,
  AppConfig,
  AuthCredentials,
  DashboardMetrics,
  ExportDialogOptions,
  ExportOptions,
  RecordFilters,
  SMDRRecord
} from '../shared/types';

type ServiceEvent = {
  type: 'status' | 'record' | 'alert' | 'connection-event' | 'parse-error';
  payload: unknown;
};

const api = {
  login: (credentials: AuthCredentials): Promise<boolean> => ipcRenderer.invoke('auth:login', credentials),
  createUser: (credentials: AuthCredentials): Promise<boolean> => ipcRenderer.invoke('auth:create-user', credentials),
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
  updateConfig: (config: AppConfig): Promise<boolean> => ipcRenderer.invoke('config:update', config),
  updateAlertRules: (rules: AlertRuleSet): Promise<boolean> => ipcRenderer.invoke('alerts:update-rules', rules),
  startStream: (): Promise<boolean> => ipcRenderer.invoke('stream:start'),
  stopStream: (): Promise<boolean> => ipcRenderer.invoke('stream:stop'),
  getState: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('state:get'),
  getRecords: (filters: RecordFilters): Promise<SMDRRecord[]> => ipcRenderer.invoke('records:list', filters),
  getRecentRecords: (): Promise<SMDRRecord[]> => ipcRenderer.invoke('records:recent'),
  getDashboard: (date?: string): Promise<DashboardMetrics> => ipcRenderer.invoke('dashboard:get', date),
  getAnalytics: (startDate?: string, endDate?: string): Promise<AnalyticsSnapshot> =>
    ipcRenderer.invoke('analytics:get', startDate, endDate),
  getAlerts: (limit?: number) => ipcRenderer.invoke('alerts:list', limit),
  getParseErrors: (limit?: number) => ipcRenderer.invoke('parse-errors:list', limit),
  exportRecords: (options: ExportOptions): Promise<string> => ipcRenderer.invoke('records:export', options),
  exportRecordsWithDialog: (options: ExportDialogOptions): Promise<string | null> =>
    ipcRenderer.invoke('records:export-with-dialog', options),
  purgeRecords: (days: number): Promise<number> => ipcRenderer.invoke('records:purge', days),
  onServiceEvent: (callback: (event: ServiceEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: ServiceEvent) => callback(event);
    ipcRenderer.on('smdr:event', handler);
    return () => ipcRenderer.removeListener('smdr:event', handler);
  },
  log: (level: string, message: string): void => ipcRenderer.send('renderer:log', level, message)
};

contextBridge.exposeInMainWorld('smdrInsight', api);

export type DesktopApi = typeof api;
