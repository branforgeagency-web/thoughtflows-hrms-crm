import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable page-by-page navigation bar for large server-paginated tables.
 */
export default function PaginationBar({
  page = 1,
  totalPages = 1,
  totalCount = 0,
  limit = 50,
  onPageChange,
  loading = false,
  itemLabel = 'records'
}) {
  if (totalCount <= 0 && page <= 1) return null;

  const safeTotalPages = Math.max(1, totalPages || 1);
  const start = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(totalCount, page * limit);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs">
      <div className="text-slate-600 font-medium">
        Showing <span className="font-bold text-slate-900">{start}–{end}</span> of{' '}
        <span className="font-bold text-slate-900">{totalCount.toLocaleString()}</span> {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
          Page {page} / {safeTotalPages}
        </span>
        <button
          type="button"
          disabled={loading || page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
