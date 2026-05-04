type PaginationProps = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-[var(--color-border)] px-3 py-1 disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-[var(--color-border)] px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
