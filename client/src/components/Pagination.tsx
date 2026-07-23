import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
      <span className="text-gray-400">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <span className="text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}