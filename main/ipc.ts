import { BrowserWindow, Notification, dialog, ipcMain } from 'electron';
import {
  AlertRuleSet,
  AnalyticsSnapshot,
  AppConfig,
  AuthCredentials,
  ExportDialogOptions,
  ExportOptions,
  RecordFilters
} from '../shared/types';
import { SMDRService } from '../backend/SMDRService';
import { ConfigStore } from './configStore';

interface ServiceEvent {
  type: 'status' | 'record' | 'alert' | 'connection-event' | 'parse-error';
  payload: unknown;
}

export function registerIpc(
  getMainWindow: () => BrowserWindow | null,
  service: SMDRService,
  configStore: ConfigStore
): void {
  service.on('event', (event: ServiceEvent) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('smdr:event', event);
    }

    if (event.type === 'alert') {
      const payload = event.payload as { message?: string };
      new Notification({
        title: 'SMDR Insight Alert',
        body: payload.message ?? 'Alert triggered'
      }).show();
    }
  });

  ipcMain.handle('auth:login', async (_, credentials: AuthCredentials) => {
    console.log(`[Main] Auth login attempt for user: ${credentials.username}`);
    const result = await service.verifyLogin(credentials);
    console.log(`[Main] Auth login result: ${result}`);
    return result;
  });

  ipcMain.handle('auth:create-user', (_, credentials: AuthCredentials) => {
    service.createUser(credentials);
    return true;
  });

  ipcMain.handle('config:get', () => service.getConfig());

  ipcMain.handle('config:update', (_, config: AppConfig) => {
    service.updateConfig(config);
    configStore.set('config', config);
    return true;
  });

  ipcMain.handle('alerts:update-rules', (_, rules: AlertRuleSet) => {
    service.updateAlertRules(rules);
    const current = service.getConfig();
    configStore.set('config', current);
    return true;
  });

  ipcMain.handle('stream:start', () => {
    service.start();
    return true;
  });

  ipcMain.handle('stream:stop', () => {
    service.stop();
    return true;
  });

  ipcMain.handle('state:get', () => service.getState());

  ipcMain.handle('records:list', (_, filters: RecordFilters) => {
    return service.getRecords(filters ?? {});
  });

  ipcMain.handle('records:recent', () => service.getRecentRecords());

  ipcMain.handle('dashboard:get', (_, date?: string) => service.getDashboard(date));

  ipcMain.handle('analytics:get', (_, startDate?: string, endDate?: string): AnalyticsSnapshot => {
    return service.getAnalytics(startDate, endDate);
  });

  ipcMain.handle('alerts:list', (_, limit?: number) => service.getAlerts(limit));
  ipcMain.handle('parse-errors:list', (_, limit?: number) => service.getParseErrors(limit));

  ipcMain.handle('records:export', (_, options: ExportOptions) => {
    return service.exportRecords(options);
  });

  ipcMain.handle('records:export-with-dialog', async (_, options: ExportDialogOptions) => {
    const ext = options.format === 'csv' ? 'csv' : 'xlsx';
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const suggestedName = `smdr-export-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.${ext}`;

    const saveDialogOptions = {
      title: `Save ${options.format.toUpperCase()} Export`,
      defaultPath: suggestedName,
      filters: [{ name: options.format.toUpperCase(), extensions: [ext] }]
    };
    const parent = getMainWindow();
    const result = parent
      ? await dialog.showSaveDialog(parent, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions);

    if (result.canceled || !result.filePath) {
      return null;
    }

    return service.exportRecords({
      format: options.format,
      outputPath: result.filePath,
      filters: options.filters
    });
  });

  ipcMain.handle('records:purge', (_, days: number) => {
    return service.purge(days);
  });

  ipcMain.on('renderer:log', (_, level: string, message: string) => {
    console.log(`[Renderer:${level}] ${message}`);
  });
}
