import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAppStore } from '../state/appStore';
import { MetricCard } from '../components/MetricCard';
import { formatDuration } from '../lib/format';

export function DashboardPage() {
  const dashboard = useAppStore((state) => state.dashboard);

  const pieData = [
    { name: 'Incoming', value: dashboard.incomingCalls },
    { name: 'Outgoing', value: dashboard.outgoingCalls }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Calls Today" value={dashboard.totalCallsToday} />
        <MetricCard label="Total Duration" value={formatDuration(dashboard.totalDurationSeconds)} />
        <MetricCard label="Incoming" value={dashboard.incomingCalls} />
        <MetricCard label="Outgoing" value={dashboard.outgoingCalls} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Incoming vs Outgoing
          </p>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  <Cell fill="#2484eb" />
                  <Cell fill="#26b67f" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Top 10 Extensions
          </p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dashboard.topExtensions} layout="vertical" margin={{ top: 4, right: 42, left: 8, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="extension"
                  width={80}
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
                  fill="#2484eb"
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

      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Long Calls (&gt;30 min)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {dashboard.longCalls.slice(0, 12).map((record, idx) => (
            <div key={`${record.callIdentifier ?? idx}-${record.startTime}`} className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {record.callingParty} → {record.calledParty}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                {record.date} {record.startTime} ({record.duration})
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
