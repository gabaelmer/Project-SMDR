import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Heatmap } from '../components/Heatmap';
import { useAppStore } from '../state/appStore';

export function AnalyticsPage() {
  const analytics = useAppStore((state) => state.analytics);
  const transferChartData = analytics.transferConference.map((item) => ({
    ...item,
    label:
      item.flag === 'T'
        ? 'T - Transfer'
        : item.flag === 'X'
          ? 'X - Conference'
          : item.flag === 'C'
            ? 'C - Conference'
            : item.flag === 'none'
              ? 'None'
              : item.flag
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Call Volume Per Hour
          </p>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={analytics.volumeByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#2484eb" fill="#2484eb55" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Transfer/Conference Distribution
          </p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={transferChartData} layout="vertical" margin={{ top: 4, right: 42, left: 8, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={130}
                  tick={{ fill: 'var(--text)', fontSize: 13, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={false}
                  formatter={(value) => [`${value}`, 'Calls']}
                  contentStyle={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px'
                  }}
                  labelStyle={{ color: 'var(--text)', fontWeight: 700 }}
                  itemStyle={{ color: 'var(--text)', fontWeight: 700 }}
                />
                <Bar
                  dataKey="count"
                  fill="#26b67f"
                  radius={[0, 8, 8, 0]}
                  barSize={18}
                  background={false}
                  label={{ position: 'right', fill: 'var(--text)', fontSize: 12, fontWeight: 700 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Heatmap data={analytics.heatmap} />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Extension Usage
          </p>
          <div className="space-y-2">
            {analytics.extensionUsage.slice(0, 12).map((item) => (
              <div key={item.extension} className="rounded-2xl border p-2" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {item.extension}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Calls: {item.calls} | Duration: {item.totalDurationSeconds}s
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Call Correlation (Call ID / Associated / OLI)
          </p>
          <div className="space-y-2">
            {analytics.correlations.slice(0, 20).map((item, idx) => (
              <div key={`${item.callIdentifier ?? 'n'}-${idx}`} className="rounded-2xl border p-2" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text)' }}>
                  CID: {item.callIdentifier ?? '-'} | Assoc: {item.associatedCallIdentifier ?? '-'} | OLI:{' '}
                  {item.networkOLI ?? '-'}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Matches: {item.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
