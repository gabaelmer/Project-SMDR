import { useMemo } from 'react';

interface Cell {
  day: string;
  hour: number;
  count: number;
}

interface Props {
  data: Cell[];
}

export function Heatmap({ data }: Props) {
  const max = useMemo(() => Math.max(...data.map((item) => item.count), 1), [data]);

  return (
    <div className="card p-4">
      <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>
        Day/Hour Heatmap
      </p>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {Array.from({ length: 24 }).map((_, hour) => (
          <span key={`h-${hour}`} className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
            {hour}
          </span>
        ))}
      </div>
      <div className="mt-2 space-y-2">
        {Array.from(new Set(data.map((item) => item.day))).map((day) => (
          <div key={day} className="grid grid-cols-[70px_1fr] items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {day.slice(5)}
            </span>
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
              {Array.from({ length: 24 }).map((_, hour) => {
                const cell = data.find((item) => item.day === day && item.hour === hour);
                const intensity = Math.min((cell?.count ?? 0) / max, 1);
                return (
                  <div
                    key={`${day}-${hour}`}
                    title={`${day} ${hour}:00 (${cell?.count ?? 0})`}
                    className="h-4 rounded"
                    style={{
                      background: `rgba(36, 132, 235, ${0.12 + intensity * 0.88})`
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
