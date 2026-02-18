import { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState
} from '@tanstack/react-table';
import { SMDRRecord } from '../../../shared/types';

interface Props {
  rows: SMDRRecord[];
  loading?: boolean;
}

export function CallLogTable({ rows, loading = false }: Props) {
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<SMDRRecord>[]>(
    () => [
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'startTime', header: 'Start' },
      { accessorKey: 'duration', header: 'Duration' },
      { accessorKey: 'callingParty', header: 'Calling' },
      { accessorKey: 'calledParty', header: 'Called' },
      { accessorKey: 'digitsDialed', header: 'Digits' },
      { accessorKey: 'accountCode', header: 'Account' },
      { accessorKey: 'callCompletionStatus', header: 'Completion' },
      { accessorKey: 'transferFlag', header: 'Transfer' },
      { accessorKey: 'callIdentifier', header: 'Call ID' },
      { accessorKey: 'associatedCallIdentifier', header: 'Assoc ID' },
      { accessorKey: 'networkOLI', header: 'OLI' }
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: rows,
    state: { columnVisibility: visibility, sorting },
    onColumnVisibilityChange: setVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap gap-3">
        {table.getAllLeafColumns().map((column) => (
          <label key={column.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={column.getIsVisible()}
              onChange={column.getToggleVisibilityHandler()}
              className="rounded"
            />
            {String(column.columnDef.header)}
          </label>
        ))}
      </div>
      <div className="relative">
        <div className="max-h-[520px] overflow-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0" style={{ background: 'var(--surface-alt)' }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text)' }}>
                      {header.isPlaceholder ? null : (
                        <button className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>
                            {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? ''}
                          </span>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2" style={{ color: 'var(--text)' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border text-sm"
            style={{
              background: 'color-mix(in srgb, var(--surface) 72%, transparent)',
              borderColor: 'var(--border)',
              color: 'var(--muted)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="ml-2 font-medium">Applying filters...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
