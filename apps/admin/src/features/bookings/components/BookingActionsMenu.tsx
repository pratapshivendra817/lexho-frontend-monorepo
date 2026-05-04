import { MoreHorizontal } from "lucide-react";

import type { BookingListItem } from "../types";

type BookingActionsMenuProps = {
  booking: BookingListItem;
  onView: (booking: BookingListItem) => void;
  onEdit: (booking: BookingListItem) => void;
  onCancel: (booking: BookingListItem) => void;
  onDelete: (booking: BookingListItem) => void;
  isBusy?: boolean;
};

export function BookingActionsMenu({
  booking,
  onView,
  onEdit,
  onCancel,
  onDelete,
  isBusy = false,
}: BookingActionsMenuProps) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded border border-[var(--color-border)] p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]">
        {isBusy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MoreHorizontal size={16} />}
      </summary>

      <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg">
        <button
          type="button"
          onClick={() => onView(booking)}
          className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-[var(--color-surface-hover)]"
        >
          View details
        </button>
        <button
          type="button"
          onClick={() => onEdit(booking)}
          className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-[var(--color-surface-hover)]"
        >
          Edit booking
        </button>
        <button
          type="button"
          onClick={() => onCancel(booking)}
          className="block w-full rounded px-3 py-1.5 text-left text-sm text-amber-300 hover:bg-amber-500/10"
        >
          Cancel booking
        </button>
        <button
          type="button"
          onClick={() => onDelete(booking)}
          className="block w-full rounded px-3 py-1.5 text-left text-sm text-red-300 hover:bg-red-500/10"
        >
          Delete booking
        </button>
      </div>
    </details>
  );
}
