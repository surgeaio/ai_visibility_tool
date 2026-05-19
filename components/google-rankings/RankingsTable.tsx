"use client";

import Link from "next/link";
import { gscTheme } from "@/lib/google-rankings/theme";
import { TablePagination } from "@/components/google-rankings/Pagination";

type Col<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
};

export function RankingsTable<T>({
  title,
  subtitle,
  columns,
  rows,
  rowKey,
  pagination,
  onPageChange,
}: {
  title: string;
  subtitle?: string;
  columns: Col<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pagination: { page: number; totalPages: number; total: number };
  onPageChange: (page: number) => void;
}) {
  return (
    <section className={gscTheme.surface}>
      <header className="border-b border-[#262626] px-5 py-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p> : null}
      </header>
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className={gscTheme.tableHead}>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-neutral-500">
                  No rows for this period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className={gscTheme.tableRow}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`${gscTheme.tableCell} ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={onPageChange}
      />
    </section>
  );
}

export function formatPct(ctr: number) {
  return `${(ctr * 100).toFixed(1)}%`;
}

export function formatPos(position: number) {
  return position.toFixed(1);
}

export function QueryLink({ keyword }: { keyword: string }) {
  return (
    <Link
      href={`/dashboard/google-rankings/${encodeURIComponent(keyword)}`}
      className="font-medium text-[#8ab4f8] hover:underline"
    >
      {keyword}
    </Link>
  );
}

export function PageLink({ url }: { url: string }) {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* keep raw */
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white hover:underline">
      {path}
    </a>
  );
}
