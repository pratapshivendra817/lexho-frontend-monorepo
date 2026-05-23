type PaginationControlsProps = {
  page: number;
  size: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  onSizeChange: (nextSize: number) => void;
};

export function PaginationControls({
  page,
  size,
  total,
  onPageChange,
  onSizeChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-sm text-[var(--color-muted)]">
        Page {page + 1} of {totalPages} • {total} total
      </p>
      <div className="flex items-center gap-2">
        <select
          value={size}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-sm text-[var(--color-text)]"
        >
          {[10, 20, 50].map((option) => (
            <option key={option} value={option}>
              {option}/page
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

