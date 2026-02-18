import { useEffect, useState } from 'react';
import { AppConfig } from '../../../shared/types';
import { useAppStore } from '../state/appStore';

export function SettingsPage() {
  const config = useAppStore((state) => state.config);
  const saveConfig = useAppStore((state) => state.saveConfig);
  const startStream = useAppStore((state) => state.startStream);
  const stopStream = useAppStore((state) => state.stopStream);
  const purgeRecords = useAppStore((state) => state.purgeRecords);
  const parseErrors = useAppStore((state) => state.parseErrors);
  const refreshParseErrors = useAppStore((state) => state.refreshParseErrors);

  const [purgeDays, setPurgeDays] = useState('60');
  const [draft, setDraft] = useState<AppConfig | undefined>();

  useEffect(() => {
    if (config) {
      setDraft(structuredClone(config));
    }
  }, [config]);

  if (!draft) {
    return (
      <div className="card p-4">
        <p style={{ color: 'var(--muted)' }}>Loading configuration...</p>
      </div>
    );
  }

  const setControllerIps = (value: string) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          connection: {
            ...prev.connection,
            controllerIps: value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          }
        };
      });
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          MiVoice Business Connection
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Set your MiVB controller IP address in the field below and keep port 1752 unless your PBX team configured a different SMDR port.
        </p>
      </div>
      <div className="card grid gap-3 p-4 lg:grid-cols-2">
        <label className="text-sm" style={{ color: 'var(--text)' }}>
          MiVoice Business Controller IPs (comma separated)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            value={draft.connection.controllerIps.join(',')}
            onChange={(e) => setControllerIps(e.target.value)}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Port
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
            value={draft.connection.port}
            onChange={(e) => {
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: { ...prev.connection, port: Number(e.target.value) || 1752 }
                    }
                  : prev
              );
            }}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Concurrent Connections (1-10)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
            min={1}
            max={10}
            value={draft.connection.concurrentConnections}
            onChange={(e) => {
              const parsed = Number(e.target.value) || 1;
              const bounded = Math.max(1, Math.min(10, parsed));
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: { ...prev.connection, concurrentConnections: bounded }
                    }
                  : prev
              );
            }}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Auto reconnect delay (ms)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
            value={draft.connection.reconnectDelayMs}
            onChange={(e) => {
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: { ...prev.connection, reconnectDelayMs: Number(e.target.value) || 5000 }
                    }
                  : prev
              );
            }}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Primary recheck delay (ms)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
            value={draft.connection.primaryRecheckDelayMs}
            onChange={(e) => {
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: { ...prev.connection, primaryRecheckDelayMs: Number(e.target.value) || 60000 }
                    }
                  : prev
              );
            }}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          IP Whitelist (comma separated)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            value={draft.connection.ipWhitelist?.join(',') ?? ''}
            onChange={(e) => {
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: {
                        ...prev.connection,
                        ipWhitelist: e.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }
                    }
                  : prev
              );
            }}
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Retention Days
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
            value={draft.storage.retentionDays}
            onChange={(e) => {
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      storage: { ...prev.storage, retentionDays: Number(e.target.value) || 60 }
                    }
                  : prev
              );
            }}
          />
        </label>

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={draft.connection.autoReconnect}
            onChange={(e) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: { ...prev.connection, autoReconnect: e.target.checked }
                    }
                  : prev
              )
            }
          />
          Auto Reconnect
        </label>

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={draft.connection.autoReconnectPrimary}
            onChange={(e) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      connection: { ...prev.connection, autoReconnectPrimary: e.target.checked }
                    }
                  : prev
              )
            }
          />
          Auto Failback To Primary
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Long Call Alert (minutes)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
            value={draft.alerts.longCallMinutes}
            onChange={(e) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      alerts: { ...prev.alerts, longCallMinutes: Number(e.target.value) || 30 }
                    }
                  : prev
              )
            }
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Watch Numbers (comma separated)
          <input
            className="mt-1 w-full rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            value={draft.alerts.watchNumbers.join(',')}
            onChange={(e) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      alerts: {
                        ...prev.alerts,
                        watchNumbers: e.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }
                    }
                  : prev
              )
            }
          />
        </label>
      </div>

      <div className="card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
        <button className="rounded-2xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => saveConfig(draft)}>
          Save Configuration
        </button>
        <button className="rounded-2xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border)' }} onClick={() => startStream()}>
          Start Stream
        </button>
        <button className="rounded-2xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border)' }} onClick={() => stopStream()}>
          Stop Stream
        </button>
        <button
          className="rounded-2xl border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => purgeRecords(Number(purgeDays) || 60)}
        >
          Purge Data
        </button>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <label className="text-sm" style={{ color: 'var(--text)' }}>
          Purge Days
          <input
            value={purgeDays}
            onChange={(e) => setPurgeDays(e.target.value)}
            className="ml-3 rounded-2xl border px-3 py-2"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            type="number"
          />
        </label>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Recent Parse Errors
          </p>
          <button
            onClick={() => refreshParseErrors()}
            className="rounded-2xl border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border)' }}
          >
            Refresh
          </button>
        </div>
        <div className="space-y-2">
          {parseErrors.slice(0, 10).map((error, index) => (
            <div key={`${error.createdAt ?? 'na'}-${index}`} className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                {error.reason}
              </p>
              <p className="mt-1 break-all text-xs" style={{ color: 'var(--muted)' }}>
                {error.line}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                {error.createdAt}
              </p>
            </div>
          ))}
          {parseErrors.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              No parse errors recorded.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
