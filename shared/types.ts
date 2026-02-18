export type ConnectionStatus = 'connected' | 'disconnected' | 'retrying';

export interface SMDRRecord {
  date: string;
  startTime: string;
  duration: string;
  callingParty: string;
  calledParty: string;
  thirdParty?: string;
  trunkNumber?: string;
  digitsDialed?: string;
  accountCode?: string;
  callCompletionStatus?: string;
  transferFlag?: string;
  callIdentifier?: string;
  callSequenceIdentifier?: string;
  associatedCallIdentifier?: string;
  networkOLI?: string;
  callType?: 'internal' | 'external';
  rawLine?: string;
}

export interface ConnectionConfig {
  controllerIps: string[];
  port: number;
  concurrentConnections: number;
  autoReconnect: boolean;
  reconnectDelayMs: number;
  autoReconnectPrimary: boolean;
  primaryRecheckDelayMs: number;
  ipWhitelist?: string[];
}

export interface StorageConfig {
  dbPath: string;
  encryptionKey?: string;
  retentionDays: number;
  archiveDirectory: string;
}

export interface AlertRuleSet {
  longCallMinutes: number;
  watchNumbers: string[];
  repeatedBusyThreshold: number;
  repeatedBusyWindowMinutes: number;
  detectTagCalls: boolean;
  detectTollDenied: boolean;
}

export interface AppConfig {
  connection: ConnectionConfig;
  storage: StorageConfig;
  alerts: AlertRuleSet;
  maxInMemoryRecords: number;
}

export interface DashboardMetrics {
  totalCallsToday: number;
  totalDurationSeconds: number;
  incomingCalls: number;
  outgoingCalls: number;
  topExtensions: Array<{ extension: string; count: number }>;
  topDialedNumbers: Array<{ number: string; count: number }>;
  longCalls: SMDRRecord[];
  activeStream: boolean;
}

export interface AnalyticsSnapshot {
  volumeByHour: Array<{ hour: string; count: number }>;
  heatmap: Array<{ day: string; hour: number; count: number }>;
  extensionUsage: Array<{ extension: string; calls: number; totalDurationSeconds: number }>;
  transferConference: Array<{ flag: string; count: number }>;
  correlations: Array<{
    callIdentifier?: string;
    associatedCallIdentifier?: string;
    networkOLI?: string;
    count: number;
  }>;
}

export interface RecordFilters {
  date?: string;
  extension?: string;
  accountCode?: string;
  callType?: 'internal' | 'external';
  completionStatus?: string;
  limit?: number;
  offset?: number;
}

export interface AlertEvent {
  id?: number;
  type: string;
  message: string;
  record?: SMDRRecord;
  createdAt?: string;
}

export interface ParseError {
  line: string;
  reason: string;
  createdAt?: string;
}

export interface ConnectionEvent {
  level: 'info' | 'warn' | 'error';
  message: string;
  createdAt?: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  outputPath: string;
  filters?: RecordFilters;
}

export interface ExportDialogOptions {
  format: 'csv' | 'xlsx';
  filters?: RecordFilters;
}

export interface AuthCredentials {
  username: string;
  password: string;
}
