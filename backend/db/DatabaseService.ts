import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  AlertEvent,
  AnalyticsSnapshot,
  ConnectionEvent,
  DashboardMetrics,
  ExportOptions,
  ParseError,
  RecordFilters,
  SMDRRecord
} from '../../shared/types';
import { CryptoUtil } from '../security/CryptoUtil';

interface DbRecordRow {
  date: string;
  start_time: string;
  duration: string;
  calling_party: string;
  called_party: string;
  third_party?: string;
  trunk_number?: string;
  digits_dialed?: string;
  account_code?: string;
  call_completion_status?: string;
  transfer_flag?: string;
  call_identifier?: string;
  call_sequence_identifier?: string;
  associated_call_identifier?: string;
  network_oli?: string;
  call_type?: 'internal' | 'external';
  raw_line?: string;
}

export class DatabaseService {
  private readonly db: Database.Database;
  private readonly crypto: CryptoUtil;

  constructor(private readonly dbPath: string, encryptionKey?: string) {
    console.log(`[DB] Opening database at ${dbPath}`);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    console.log('[DB] Database opened and PRAGMA set');
    this.crypto = new CryptoUtil(encryptionKey);
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS smdr_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        duration TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        calling_party TEXT NOT NULL,
        called_party TEXT NOT NULL,
        third_party TEXT,
        trunk_number TEXT,
        digits_dialed TEXT,
        account_code TEXT,
        call_completion_status TEXT,
        transfer_flag TEXT,
        call_identifier TEXT,
        call_sequence_identifier TEXT,
        associated_call_identifier TEXT,
        network_oli TEXT,
        call_type TEXT,
        raw_line TEXT,
        calling_party_hash TEXT,
        called_party_hash TEXT,
        account_code_hash TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS parse_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        line TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS connection_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        record_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_smdr_date ON smdr_records(date);
      CREATE INDEX IF NOT EXISTS idx_smdr_calling ON smdr_records(calling_party_hash);
      CREATE INDEX IF NOT EXISTS idx_smdr_called ON smdr_records(called_party_hash);
      CREATE INDEX IF NOT EXISTS idx_smdr_call_identifier ON smdr_records(call_identifier);
      CREATE INDEX IF NOT EXISTS idx_smdr_account ON smdr_records(account_code_hash);
      CREATE INDEX IF NOT EXISTS idx_smdr_calling_plain ON smdr_records(calling_party);
      CREATE INDEX IF NOT EXISTS idx_smdr_called_plain ON smdr_records(called_party);
      CREATE INDEX IF NOT EXISTS idx_smdr_third_plain ON smdr_records(third_party);
      CREATE INDEX IF NOT EXISTS idx_smdr_account_plain ON smdr_records(account_code);
      CREATE INDEX IF NOT EXISTS idx_smdr_completion ON smdr_records(call_completion_status);
      CREATE INDEX IF NOT EXISTS idx_smdr_call_type ON smdr_records(call_type);
    `);
  }

  getRawDb(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  insertRecord(record: SMDRRecord): void {
    const insert = this.db.prepare(`
      INSERT INTO smdr_records (
        date,
        start_time,
        duration,
        duration_seconds,
        calling_party,
        called_party,
        third_party,
        trunk_number,
        digits_dialed,
        account_code,
        call_completion_status,
        transfer_flag,
        call_identifier,
        call_sequence_identifier,
        associated_call_identifier,
        network_oli,
        call_type,
        raw_line,
        calling_party_hash,
        called_party_hash,
        account_code_hash
      ) VALUES (
        @date,
        @start_time,
        @duration,
        @duration_seconds,
        @calling_party,
        @called_party,
        @third_party,
        @trunk_number,
        @digits_dialed,
        @account_code,
        @call_completion_status,
        @transfer_flag,
        @call_identifier,
        @call_sequence_identifier,
        @associated_call_identifier,
        @network_oli,
        @call_type,
        @raw_line,
        @calling_party_hash,
        @called_party_hash,
        @account_code_hash
      );
    `);

    insert.run({
      date: record.date,
      start_time: record.startTime,
      duration: record.duration,
      duration_seconds: durationToSeconds(record.duration),
      calling_party: this.crypto.encrypt(record.callingParty) ?? '',
      called_party: this.crypto.encrypt(record.calledParty) ?? '',
      third_party: this.crypto.encrypt(record.thirdParty),
      trunk_number: record.trunkNumber,
      digits_dialed: this.crypto.encrypt(record.digitsDialed),
      account_code: this.crypto.encrypt(record.accountCode),
      call_completion_status: record.callCompletionStatus,
      transfer_flag: record.transferFlag,
      call_identifier: record.callIdentifier,
      call_sequence_identifier: record.callSequenceIdentifier,
      associated_call_identifier: record.associatedCallIdentifier,
      network_oli: record.networkOLI,
      call_type: record.callType,
      raw_line: record.rawLine,
      calling_party_hash: this.crypto.hashForIndex(record.callingParty),
      called_party_hash: this.crypto.hashForIndex(record.calledParty),
      account_code_hash: this.crypto.hashForIndex(record.accountCode)
    });
  }

  insertParseError(error: ParseError): void {
    this.db
      .prepare('INSERT INTO parse_errors (line, reason) VALUES (?, ?)')
      .run(error.line, error.reason);
  }

  getParseErrors(limit = 100): ParseError[] {
    const rows = this.db
      .prepare('SELECT line, reason, created_at FROM parse_errors ORDER BY id DESC LIMIT ?')
      .all(limit) as Array<{ line: string; reason: string; created_at: string }>;

    return rows.map((row) => ({
      line: row.line,
      reason: row.reason,
      createdAt: row.created_at
    }));
  }

  insertConnectionEvent(event: ConnectionEvent): void {
    this.db
      .prepare('INSERT INTO connection_events (level, message) VALUES (?, ?)')
      .run(event.level, event.message);
  }

  insertAlert(event: AlertEvent): void {
    this.db
      .prepare('INSERT INTO alert_events (type, message, record_json) VALUES (?, ?, ?)')
      .run(event.type, event.message, JSON.stringify(event.record ?? null));
  }

  getAlerts(limit = 100): AlertEvent[] {
    const rows = this.db
      .prepare('SELECT id, type, message, record_json, created_at FROM alert_events ORDER BY id DESC LIMIT ?')
      .all(limit) as Array<{ id: number; type: string; message: string; record_json: string | null; created_at: string }>;

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      record: row.record_json ? (JSON.parse(row.record_json) as SMDRRecord) : undefined,
      createdAt: row.created_at
    }));
  }

  getRecords(filters: RecordFilters = {}): SMDRRecord[] {
    const where: string[] = [];
    const params: Array<string | number> = [];

    if (filters.date) {
      where.push('date = ?');
      params.push(filters.date);
    }

    const extension = filters.extension?.trim();
    if (extension) {
      if (this.crypto.isEnabled()) {
        where.push('(calling_party_hash = ? OR called_party_hash = ?)');
        const hash = this.crypto.hashForIndex(extension) ?? '';
        params.push(hash, hash);
      } else {
        const exactExtension = /^[A-Za-z0-9*#_-]{2,24}$/.test(extension);
        if (exactExtension) {
          where.push('(calling_party = ? OR called_party = ? OR third_party = ?)');
          params.push(extension, extension, extension);
        } else {
          where.push('(calling_party LIKE ? OR called_party LIKE ? OR third_party LIKE ?)');
          const pattern = `%${extension}%`;
          params.push(pattern, pattern, pattern);
        }
      }
    }

    const accountCode = filters.accountCode?.trim();
    if (accountCode) {
      if (this.crypto.isEnabled()) {
        where.push('account_code_hash = ?');
        params.push(this.crypto.hashForIndex(accountCode) ?? '');
      } else {
        const exactAccountCode = /^[A-Za-z0-9*#_-]{2,32}$/.test(accountCode);
        if (exactAccountCode) {
          where.push('account_code = ?');
          params.push(accountCode);
        } else {
          where.push('account_code LIKE ?');
          params.push(`%${accountCode}%`);
        }
      }
    }

    if (filters.callType) {
      where.push('call_type = ?');
      params.push(filters.callType);
    }

    if (filters.completionStatus) {
      where.push('call_completion_status = ?');
      params.push(filters.completionStatus);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(filters.limit ?? 500, 50_000);
    const offset = Math.max(filters.offset ?? 0, 0);

    const query = `
      SELECT
        date,
        start_time,
        duration,
        calling_party,
        called_party,
        third_party,
        trunk_number,
        digits_dialed,
        account_code,
        call_completion_status,
        transfer_flag,
        call_identifier,
        call_sequence_identifier,
        associated_call_identifier,
        network_oli,
        call_type,
        raw_line
      FROM smdr_records
      ${clause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(query).all(...params, limit, offset) as DbRecordRow[];
    return rows.map((row) => this.mapRecord(row));
  }

  getDashboardMetrics(date = dayjs().format('YYYY-MM-DD')): DashboardMetrics {
    const totalCallsToday = (this.db.prepare('SELECT COUNT(1) as count FROM smdr_records WHERE date = ?').get(date) as { count: number }).count;
    const totalDurationSeconds =
      (this.db.prepare('SELECT COALESCE(SUM(duration_seconds), 0) as sum FROM smdr_records WHERE date = ?').get(date) as { sum: number }).sum ?? 0;

    const outgoingCalls =
      (this.db
        .prepare("SELECT COUNT(1) as count FROM smdr_records WHERE date = ? AND (digits_dialed IS NOT NULL AND digits_dialed <> '')")
        .get(date) as { count: number }).count;
    const incomingCalls = Math.max(totalCallsToday - outgoingCalls, 0);

    const topExtensionsRows = this.db
      .prepare(
        'SELECT calling_party, COUNT(1) as count FROM smdr_records WHERE date = ? GROUP BY calling_party ORDER BY count DESC LIMIT 10'
      )
      .all(date) as Array<{ calling_party: string; count: number }>;

    const topDialedRows = this.db
      .prepare(
        'SELECT called_party, COUNT(1) as count FROM smdr_records WHERE date = ? GROUP BY called_party ORDER BY count DESC LIMIT 10'
      )
      .all(date) as Array<{ called_party: string; count: number }>;

    const longCallRows = this.db
      .prepare(
        `SELECT
          date,
          start_time,
          duration,
          calling_party,
          called_party,
          third_party,
          trunk_number,
          digits_dialed,
          account_code,
          call_completion_status,
          transfer_flag,
          call_identifier,
          call_sequence_identifier,
          associated_call_identifier,
          network_oli,
          call_type,
          raw_line
        FROM smdr_records
        WHERE date = ? AND duration_seconds >= 1800
        ORDER BY duration_seconds DESC
        LIMIT 100`
      )
      .all(date) as DbRecordRow[];

    return {
      totalCallsToday,
      totalDurationSeconds,
      incomingCalls,
      outgoingCalls,
      topExtensions: topExtensionsRows.map((row) => ({
        extension: this.crypto.decrypt(row.calling_party) ?? row.calling_party,
        count: row.count
      })),
      topDialedNumbers: topDialedRows.map((row) => ({
        number: this.crypto.decrypt(row.called_party) ?? row.called_party,
        count: row.count
      })),
      longCalls: longCallRows.map((row) => this.mapRecord(row)),
      activeStream: false
    };
  }

  getAnalyticsSnapshot(startDate?: string, endDate?: string): AnalyticsSnapshot {
    const where: string[] = [];
    const params: string[] = [];

    if (startDate) {
      where.push('date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      where.push('date <= ?');
      params.push(endDate);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const volumeByHour = this.db
      .prepare(
        `SELECT substr(start_time, 1, 2) as hour, COUNT(1) as count
         FROM smdr_records ${clause}
         GROUP BY hour ORDER BY hour ASC`
      )
      .all(...params) as Array<{ hour: string; count: number }>;

    const heatmap = this.db
      .prepare(
        `SELECT date as day, CAST(substr(start_time, 1, 2) AS INTEGER) as hour, COUNT(1) as count
         FROM smdr_records ${clause}
         GROUP BY day, hour
         ORDER BY day, hour`
      )
      .all(...params) as Array<{ day: string; hour: number; count: number }>;

    const extensionUsageRows = this.db
      .prepare(
        `SELECT calling_party as extension, COUNT(1) as calls, COALESCE(SUM(duration_seconds), 0) as total_duration_seconds
         FROM smdr_records ${clause}
         GROUP BY extension
         ORDER BY calls DESC
         LIMIT 100`
      )
      .all(...params) as Array<{ extension: string; calls: number; total_duration_seconds: number }>;

    const transferConference = this.db
      .prepare(
        `SELECT COALESCE(transfer_flag, 'none') as flag, COUNT(1) as count
         FROM smdr_records ${clause}
         GROUP BY transfer_flag`
      )
      .all(...params) as Array<{ flag: string; count: number }>;

    const correlationsWhere = [
      ...where,
      '(call_identifier IS NOT NULL OR associated_call_identifier IS NOT NULL OR network_oli IS NOT NULL)'
    ];
    const correlationsClause = correlationsWhere.length ? `WHERE ${correlationsWhere.join(' AND ')}` : '';

    const correlations = this.db
      .prepare(
        `SELECT
          call_identifier,
          associated_call_identifier,
          network_oli,
          COUNT(1) as count
         FROM smdr_records ${correlationsClause}
         GROUP BY call_identifier, associated_call_identifier, network_oli
         ORDER BY count DESC
         LIMIT 100`
      )
      .all(...params) as Array<{
        call_identifier?: string;
        associated_call_identifier?: string;
        network_oli?: string;
        count: number;
      }>;

    return {
      volumeByHour,
      heatmap,
      extensionUsage: extensionUsageRows.map((row) => ({
        extension: this.crypto.decrypt(row.extension) ?? row.extension,
        calls: row.calls,
        totalDurationSeconds: row.total_duration_seconds
      })),
      transferConference,
      correlations: correlations.map((row) => ({
        callIdentifier: row.call_identifier,
        associatedCallIdentifier: row.associated_call_identifier,
        networkOLI: row.network_oli,
        count: row.count
      }))
    };
  }

  export(options: ExportOptions): string {
    const records = this.getRecords({
      ...(options.filters ?? {}),
      limit: 75_000,
      offset: 0
    });

    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });

    if (options.format === 'csv') {
      const csv = toCsv(records);
      fs.writeFileSync(options.outputPath, csv, 'utf8');
    } else {
      const sheet = XLSX.utils.json_to_sheet(records);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'SMDR');
      XLSX.writeFile(workbook, options.outputPath);
    }

    return options.outputPath;
  }

  purgeOlderThan(days: number): number {
    const cutoff = dayjs().subtract(days, 'day').format('YYYY-MM-DD');
    const info = this.db.prepare('DELETE FROM smdr_records WHERE date < ?').run(cutoff);
    return info.changes;
  }

  runDailyRollover(archiveDirectory: string, retentionDays: number): { archivedFile?: string; purged: number } {
    fs.mkdirSync(archiveDirectory, { recursive: true });
    const previousDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const count = (this.db.prepare('SELECT COUNT(1) as count FROM smdr_records WHERE date = ?').get(previousDate) as { count: number }).count;

    let archivedFile: string | undefined;
    if (count > 0) {
      const outputPath = path.join(archiveDirectory, `smdr-${previousDate}.csv`);
      if (!fs.existsSync(outputPath)) {
        this.export({ format: 'csv', outputPath, filters: { date: previousDate, limit: 75_000 } });
        archivedFile = outputPath;
      }
    }

    const purged = this.purgeOlderThan(retentionDays);
    return { archivedFile, purged };
  }

  private mapRecord(row: DbRecordRow): SMDRRecord {
    return {
      date: row.date,
      startTime: row.start_time,
      duration: row.duration,
      callingParty: this.crypto.decrypt(row.calling_party) ?? row.calling_party,
      calledParty: this.crypto.decrypt(row.called_party) ?? row.called_party,
      thirdParty: this.crypto.decrypt(row.third_party),
      trunkNumber: row.trunk_number,
      digitsDialed: this.crypto.decrypt(row.digits_dialed),
      accountCode: this.crypto.decrypt(row.account_code),
      callCompletionStatus: row.call_completion_status,
      transferFlag: row.transfer_flag,
      callIdentifier: row.call_identifier,
      callSequenceIdentifier: row.call_sequence_identifier,
      associatedCallIdentifier: row.associated_call_identifier,
      networkOLI: row.network_oli,
      callType: row.call_type,
      rawLine: row.raw_line
    };
  }
}

function durationToSeconds(duration: string): number {
  const chunks = duration.split(':').map((chunk) => Number(chunk));
  if (chunks.some(Number.isNaN)) return 0;
  if (chunks.length === 2) return chunks[0] * 60 + chunks[1];
  return chunks[0] * 3600 + chunks[1] * 60 + chunks[2];
}

function toCsv(records: SMDRRecord[]): string {
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
