import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import Store from 'electron-store';
import log from 'electron-log';
import { SMDRService } from '../backend/SMDRService';
import { AppConfig } from '../shared/types';
import { buildDefaultConfig } from './defaultConfig';
import { registerIpc } from './ipc';
import { ConfigStore } from './configStore';
import { WebServer } from '../backend/web/WebServer';

console.log('[Main] Application starting...');
let mainWindow: BrowserWindow | null = null;
let service: SMDRService | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#071022',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Main] Window failed to load: ${errorCode} - ${errorDescription}`);
    log.error(`Window failed to load: ${errorCode} - ${errorDescription}`);
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    if (process.env.OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html')).catch((err) => {
      console.error('[Main] Failed to load index.html:', err);
    });
  }

  win.webContents.on('did-finish-load', () => {
    console.log('[Main] Window finished loading');
  });

  win.on('show', () => console.log('[Main] Window shown'));
  win.on('hide', () => console.log('[Main] Window hidden'));
  win.on('close', (e) => {
    console.log('[Main] Window close event triggered');
    console.trace('Window Close Stack Trace');
    // e.preventDefault(); // Uncomment this if we want to force it to stay open
  });

  win.on('closed', () => {
    console.log('[Main] Window closed event triggered');
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error(`[Main] Renderer process gone: ${details.reason} (exitCode: ${details.exitCode})`);
    log.error(`Renderer process gone: ${details.reason} (exitCode: ${details.exitCode})`);
  });

  win.webContents.on('unresponsive', () => {
    console.warn('[Main] Window content unresponsive');
  });

  return win;
}

app.whenReady().then(() => {
  try {
    console.log('[Main] app.whenReady() triggered');
    log.initialize();
    console.log('[Main] Logger initialized');

    const defaultConfig = buildDefaultConfig(app.getPath('userData'));
    const configStore = new Store<{ config: AppConfig }>({
      name: 'settings',
      defaults: { config: defaultConfig }
    }) as unknown as ConfigStore;

    const persisted = configStore.get('config');
    const mergedConfig: AppConfig = {
      ...defaultConfig,
      ...persisted,
      connection: { ...defaultConfig.connection, ...(persisted?.connection ?? {}) },
      storage: { ...defaultConfig.storage, ...(persisted?.storage ?? {}) },
      alerts: { ...defaultConfig.alerts, ...(persisted?.alerts ?? {}) }
    };
    configStore.set('config', mergedConfig);

    console.log('[Main] Config loaded and merged');

    service = new SMDRService(mergedConfig);
    console.log('[Main] SMDRService created');

    const isHeadless = process.argv.includes('--headless');
    if (isHeadless) {
      console.log('[Main] Running in HEADLESS mode');
    } else {
      mainWindow = createWindow();
      console.log('[Main] MainWindow created');
    }

    registerIpc(() => mainWindow, service, configStore);
    console.log('[Main] IPC registered and SMDR Service ready');

    const webServer = new WebServer(service);
    webServer.start();
    console.log('[Main] Web Server started');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error('[Main] Initialization failed:', message);
    dialog.showErrorBox('SMDR Insight Startup Error', message);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
  console.error('[Main] Unhandled promise rejection:', message);
  log.error('Unhandled promise rejection:', message);
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error.stack ?? error.message);
  log.error('Uncaught exception:', error.stack ?? error.message);
});

app.on('window-all-closed', () => {
  // During startup/development, don't exit if window closes unexpectedly
  if (process.platform !== 'darwin') {
    console.log('[Main] All windows closed. Quitting app...');
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[Main] App quitting, closing services...');
  service?.close();
});
