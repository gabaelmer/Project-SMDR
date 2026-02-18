import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { SMDRService } from '../SMDRService';
import { SMDRRecord } from '../../shared/types';

export class WebServer {
    private readonly app = express();
    private readonly port = 3000;

    constructor(private readonly service: SMDRService) {
        this.app.use(cors());
        this.app.use(express.json());

        this.setupRoutes();
        this.setupStatic();
    }

    start(): void {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`[Web] Server listening on http://0.0.0.0:${this.port}`);
        });
    }

    private setupRoutes(): void {
        // Auth
        this.app.post('/api/auth/login', (req, res) => {
            const { username, password } = req.body;
            console.log(`[Web] API Login attempt: ${username}`);
            const ok = this.service.verifyLogin({ username, password });
            console.log(`[Web] API Login result for ${username}: ${ok}`);
            if (ok) {
                // Return a simple mock token for session persistence
                res.json({ success: true, token: `mock-token-${username}-${Date.now()}` });
            } else {
                res.json({ success: false });
            }
        });

        this.app.get('/api/auth/verify', (req, res) => {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer mock-token-')) {
                res.json({ success: true });
            } else {
                res.status(401).json({ success: false });
            }
        });

        // Config & State
        this.app.get('/api/config', (req, res) => {
            res.json(this.service.getConfig());
        });

        this.app.post('/api/config/update', (req, res) => {
            try {
                this.service.updateConfig(req.body);
                res.json({ success: true });
            } catch (err: any) {
                res.status(500).json({ success: false, error: err.message });
            }
        });

        this.app.post('/api/alerts/update-rules', (req, res) => {
            try {
                this.service.updateAlertRules(req.body);
                res.json({ success: true });
            } catch (err: any) {
                res.status(500).json({ success: false, error: err.message });
            }
        });

        this.app.get('/api/state', (req, res) => {
            res.json(this.service.getState());
        });

        // Data
        this.app.get('/api/dashboard', (req, res) => {
            const { date } = req.query;
            res.json(this.service.getDashboard(date as string));
        });

        this.app.get('/api/records', (req, res) => {
            const filters = req.query as any;
            res.json(this.service.getRecords(filters));
        });

        this.app.get('/api/analytics', (req, res) => {
            const { startDate, endDate } = req.query;
            res.json(this.service.getAnalytics(startDate as string, endDate as string));
        });

        this.app.get('/api/alerts', (req, res) => {
            const { limit } = req.query;
            res.json(this.service.getAlerts(Number(limit) || 100));
        });

        this.app.get('/api/parse-errors', (req, res) => {
            const { limit } = req.query;
            res.json(this.service.getParseErrors(Number(limit) || 100));
        });

        // Stream control
        this.app.post('/api/stream/start', (req, res) => {
            this.service.start();
            res.json({ success: true });
        });

        this.app.post('/api/stream/stop', (req, res) => {
            this.service.stop();
            res.json({ success: true });
        });

        // Real-time Events (SSE)
        this.app.get('/api/events', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const handler = (event: any) => {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            };

            this.service.on('event', handler);

            req.on('close', () => {
                this.service.off('event', handler);
                res.end();
            });
        });

        // Export
        this.app.get('/api/records/export', (req, res) => {
            const filters = req.query as any;
            try {
                const records = this.service.getRecords(filters);
                const csv = this.toCsv(records);

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=smdr-export-${Date.now()}.csv`);
                res.send(csv);
            } catch (err: any) {
                console.error('[Web] Export Error:', err);
                res.status(500).json({ error: 'Export failed', details: err.message });
            }
        });
    }

    private setupStatic(): void {
        // Try multiple locations for the renderer assets
        const pathsToTry = [
            path.join(__dirname, '../../../renderer'), // Production (dist/main/backend/web -> dist/renderer)
            path.join(process.cwd(), 'dist/renderer'),  // From root dist folder
            path.join(__dirname, '../../../../renderer'), // Alternative deep production
        ];

        let rendererPath = '';
        for (const p of pathsToTry) {
            if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
                rendererPath = p;
                break;
            }
        }

        if (!rendererPath) {
            console.error('[Web] FATAL: Could not find renderer assets in any of:', pathsToTry);
            // Fallback to first one anyway to avoid crash, but error is logged
            rendererPath = pathsToTry[0];
        } else {
            console.log(`[Web] Serving static files from: ${rendererPath}`);
        }

        this.app.use(express.static(rendererPath));

        // For SPA routing
        this.app.get(/(.*)/, (req, res) => {
            if (!req.path.startsWith('/api')) {
                const indexFile = path.join(rendererPath, 'index.html');
                if (fs.existsSync(indexFile)) {
                    res.sendFile(indexFile);
                } else {
                    res.status(404).send(`Renderer not found at ${indexFile}. Please run build.`);
                }
            } else {
                res.status(404).json({ error: 'API endpoint not found' });
            }
        });

        // Global error handler
        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
            console.error('[Web] Server Error:', err);
            res.status(500).json({ error: 'Internal Server Error', details: err.message });
        });
    }

    private toCsv(records: SMDRRecord[]): string {
        if (records.length === 0) return '';
        const headers = Object.keys(records[0]) as Array<keyof SMDRRecord>;
        const lines = [headers.join(',')];
        for (const record of records) {
            const row = headers.map((header) => {
                const value = String(record[header] ?? '');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            lines.push(row.join(','));
        }
        return `${lines.join('\n')}\n`;
    }
}
