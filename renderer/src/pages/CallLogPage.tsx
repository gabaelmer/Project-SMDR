import { CallLogTable } from '../components/CallLogTable';
import { useAppStore } from '../state/appStore';

export function CallLogPage() {
  const records = useAppStore((state) => state.records);
  const filters = useAppStore((state) => state.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  const refreshRecords = useAppStore((state) => state.refreshRecords);
  const recordsLoading = useAppStore((state) => state.recordsLoading);

  const exportRecords = useAppStore((state) => state.exportRecords);

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 p-4 md:grid-cols-6">
        <input
          value={filters.date ?? ''}
          type="date"
          className="rounded-2xl border px-3 py-2"
          style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
          onChange={(e) => setFilters({ date: e.target.value })}
        />
        <input
          value={filters.extension ?? ''}
          placeholder="Extension"
          className="rounded-2xl border px-3 py-2"
          style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
          onChange={(e) => setFilters({ extension: e.target.value })}
        />
        <input
          value={filters.accountCode ?? ''}
          placeholder="Account Code"
          className="rounded-2xl border px-3 py-2"
          style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
          onChange={(e) => setFilters({ accountCode: e.target.value })}
        />
        <select
          value={filters.callType ?? ''}
          className="rounded-2xl border px-3 py-2"
          style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
          onChange={(e) => setFilters({ callType: (e.target.value || undefined) as 'internal' | 'external' | undefined })}
        >
          <option value="">Any Type</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
        <select
          value={filters.completionStatus ?? ''}
          className="rounded-2xl border px-3 py-2"
          style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
          onChange={(e) => setFilters({ completionStatus: e.target.value || undefined })}
        >
          <option value="">Any Status</option>
          {['A', 'B', 'E', 'T', 'I', 'O', 'D', 'S', 'U'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          onClick={() => refreshRecords()}
          disabled={recordsLoading}
          className="rounded-2xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          {recordsLoading ? 'Applying...' : 'Apply Filters'}
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => exportRecords('csv')}
            className="rounded-2xl border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border)' }}
          >
            Export CSV
          </button>
          <button
            onClick={() => exportRecords('xlsx')}
            className="rounded-2xl border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border)' }}
          >
            Export Excel
          </button>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
          Select CSV or Excel, then choose the save location in the system dialog. The app appends date and time to the
          exported filename automatically.
        </p>
      </div>

      <CallLogTable rows={records} loading={recordsLoading} />
    </div>
  );
}
