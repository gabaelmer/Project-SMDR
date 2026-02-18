import path from 'node:path';
import fs from 'node:fs';
import { SMDRService } from '../backend/SMDRService';
import { AppConfig } from '../shared/types';
import { buildDefaultConfig } from './defaultConfig';
import { WebServer } from '../backend/web/WebServer';

console.log('[NodeServer] Starting SMDR Insight in Pure Node mode...');

// In non-electron mode, we use a local config folder
const configDir = process.env.SMDR_CONFIG_DIR || path.join(process.cwd(), 'config');
const configPath = path.join(configDir, 'settings.json');

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

function loadConfig(): AppConfig {
    const defaultConfig = buildDefaultConfig(configDir);
    if (fs.existsSync(configPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('[NodeServer] Config loaded from:', configPath);
            return {
                ...defaultConfig,
                ...data,
                connection: { ...defaultConfig.connection, ...(data.connection ?? {}) },
                storage: { ...defaultConfig.storage, ...(data.storage ?? {}) },
                alerts: { ...defaultConfig.alerts, ...(data.alerts ?? {}) }
            };
        } catch (err) {
            console.error('[NodeServer] Failed to parse config, using defaults:', err);
        }
    }
    console.log('[NodeServer] Using default configuration');
    return defaultConfig;
}

const config = loadConfig();

// Ensure DB directory exists
const dbDir = path.dirname(config.storage.dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const service = new SMDRService(config);
console.log('[NodeServer] SMDRService initialized');

// Persistence logic: Save config when it changes
service.on('config-change', (updatedConfig: AppConfig) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
        console.log('[NodeServer] Configuration persisted to disco:', configPath);
    } catch (err) {
        console.error('[NodeServer] Failed to persist configuration:', err);
    }
});

const webServer = new WebServer(service);
webServer.start();
console.log('[NodeServer] Web Server started on port 3000');

service.start();
console.log('[NodeServer] SMDR Data Stream started');

// Handle process termination
process.on('SIGTERM', () => {
    console.log('[NodeServer] SIGTERM received, shutting down...');
    service.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[NodeServer] SIGINT received, shutting down...');
    service.close();
    process.exit(0);
});
