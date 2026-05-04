import type { ReactNode } from "react";

type DataStateProps = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
};

export function DataState({
  isLoading,
  isError,
  isEmpty,
  loadingText = "Loading...",
  errorText = "Something went wrong",
  emptyText = "No data found",
  onRetry,
  children,
}: DataStateProps) {
  if (isLoading) {
    return <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">{loadingText}</div>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        <p>{errorText}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">{emptyText}</div>;
  }

  return <>{children}</>;
}
