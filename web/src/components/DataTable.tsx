import type { ReactNode } from "react";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  hideMobile?: boolean;
  primary?: boolean; // becomes the card title on mobile
}

export interface Sort {
  id: string;
  desc: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: Sort;
  onSort?: (s: Sort) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, sort, onSort, onRowClick, loading, empty }: Props<T>) {
  function toggleSort(id: string) {
    if (!onSort) return;
    onSort({ id, desc: sort?.id === id ? !sort.desc : false });
  }

  if (!loading && rows.length === 0) {
    return <div className="card p-2">{empty}</div>;
  }

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideMobile);

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="card hidden overflow-x-auto sm:block" style={{ opacity: loading ? 0.6 : 1 }}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b" style={{ background: "var(--surface-2)" }}>
              {columns.map((c) => (
                <th
                  key={c.id}
                  onClick={() => c.sortable && toggleSort(c.id)}
                  className={`px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide ${
                    c.sortable ? "cursor-pointer select-none" : ""
                  } ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                  style={{ color: "var(--muted)" }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortable && sort?.id === c.id && <span>{sort.desc ? "▾" : "▴"}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                style={{ borderColor: "var(--line-2)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={`px-3.5 py-2.5 ${
                      c.align === "right" ? "text-right tnum" : c.align === "center" ? "text-center" : "text-left"
                    }`}
                    style={{ color: "var(--ink)" }}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 sm:hidden" style={{ opacity: loading ? 0.6 : 1 }}>
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className="card p-3.5"
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? "pointer" : "default" }}
          >
            <div className="mb-2 font-semibold" style={{ color: "var(--ink)" }}>{primary.cell(row)}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {rest.map((c) => (
                <div key={c.id} className="flex flex-col gap-0.5">
                  <span className="label">{c.header}</span>
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>{c.cell(row)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) {
    return <div className="px-1 py-2 text-xs" style={{ color: "var(--muted)" }}>{total} record{total === 1 ? "" : "s"}</div>;
  }
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        Page {page} of {pageCount} · {total} records
      </span>
      <div className="flex gap-1.5">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <button className="btn btn-sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
