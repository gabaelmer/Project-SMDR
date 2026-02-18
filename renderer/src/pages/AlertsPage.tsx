import { useAppStore } from '../state/appStore';

export function AlertsPage() {
  const alerts = useAppStore((state) => state.alerts);
  const refreshAlerts = useAppStore((state) => state.refreshAlerts);

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between p-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Alert Log
        </p>
        <button
          onClick={() => refreshAlerts()}
          className="rounded-2xl border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: 'var(--border)' }}
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div key={`${alert.createdAt ?? index}-${alert.type}`} className="card p-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {alert.type}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {alert.message}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              {alert.createdAt}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
