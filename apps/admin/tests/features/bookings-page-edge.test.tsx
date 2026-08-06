import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useBookingsQuery: vi.fn(),
  useBookingStatsQuery: vi.fn(),
  useBookingMutations: vi.fn(),
  useDebounce: vi.fn(),
  setSearchParams: vi.fn(),
  navigate: vi.fn(),
  cancelMutate: vi.fn(),
  deleteMutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  exportBookingsToCsv: vi.fn(),
}));

const searchParams = new URLSearchParams({
  page: "-3",
  status: "",
  serviceType: "",
  sortDir: "weird",
});

vi.mock("@/features/bookings/hooks/useBookings", () => ({
  useBookingsQuery: mocks.useBookingsQuery,
  useBookingStatsQuery: mocks.useBookingStatsQuery,
  useBookingMutations: mocks.useBookingMutations,
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: mocks.useDebounce,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [searchParams, mocks.setSearchParams],
  };
});

vi.mock("@/components/admin", () => ({
  Skeleton: ({ className }: { className: string }) => <div>{`skeleton:${className}`}</div>,
  Pagination: ({ onPageChange }: any) => <button onClick={() => onPageChange(0)}>page-change</button>,
  DataState: ({ isLoading, isError, isEmpty, loadingText, errorText, emptyText, onRetry, children }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}<button onClick={onRetry}>retry-all</button></div>;
  },
  ConfirmDialog: ({ open, title, description, confirmLabel, onClose, onConfirm }: any) =>
    (
      <div>
        <button onClick={onConfirm}>force-confirm</button>
        {open ? (
          <>
            <div>{title}</div>
            <div>{description}</div>
            <button onClick={onClose}>close-confirm</button>
            <button onClick={onConfirm}>{confirmLabel}</button>
          </>
        ) : null}
      </div>
    ),
}));

vi.mock("@/features/bookings/components", () => ({
  BookingStatsCards: ({ stats }: any) => <div>{`stats:${stats.pending}:${stats.confirmed}:${stats.completed}:${stats.cancelled}`}</div>,
  BookingsFiltersBar: ({ onStatusChange, onServiceTypeChange, onStartDateChange, onEndDateChange, onSortByChange, onSortDirChange, onExport, onReset }: any) => (
    <div>
      <button onClick={() => onStatusChange("PENDING")}>status-change</button>
      <button onClick={() => onServiceTypeChange("COOK")}>service-change</button>
      <button onClick={() => onStartDateChange("2026-05-01")}>start-change</button>
      <button onClick={() => onEndDateChange("")}>end-clear</button>
      <button onClick={() => onSortByChange("amount")}>sortby-change</button>
      <button onClick={() => onSortDirChange("asc")}>sortdir-change</button>
      <button onClick={onExport}>export-rows</button>
      <button onClick={onReset}>reset-filters</button>
    </div>
  ),
  BookingsTable: ({ rows, onView, onEdit, onCancel, onDelete }: any) => (
    <div>
      <button onClick={() => onView(rows[0])}>view-row</button>
      <button onClick={() => onEdit(rows[0])}>edit-row</button>
      <button onClick={() => onCancel(rows[0])}>cancel-row</button>
      <button onClick={() => onDelete(rows[0])}>delete-row</button>
    </div>
  ),
}));

vi.mock("@/features/bookings/utils/exportBookingsToCsv", () => ({
  exportBookingsToCsv: mocks.exportBookingsToCsv,
}));

import BookingsPage from "@/features/bookings/pages/BookingsPage";

describe("BookingsPage edge coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.delete("search");
    searchParams.set("page", "-3");
    searchParams.set("sortDir", "weird");
    mocks.useDebounce.mockReturnValue("");
    mocks.useBookingsQuery.mockReturnValue({
      data: {
        content: [
          { id: "bk-1", customerName: "", service: "", serviceType: "OTHER", partnerName: "", bookingDate: "", amount: 0, status: "PENDING" },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useBookingStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useBookingMutations.mockReturnValue({
      cancelBookingMutation: { mutate: mocks.cancelMutate },
      deleteBookingMutation: { mutate: mocks.deleteMutate },
    });
  });

  it("handles search syncing, param updates, retry, navigation and cancel/delete actions", async () => {
    const user = userEvent.setup();
    const listRefetch = vi.fn();
    const statsRefetch = vi.fn();
    mocks.useDebounce.mockReturnValue("fresh");
    mocks.useBookingsQuery.mockReturnValue({
      data: {
        content: [
          { id: "bk-1", customerName: "", service: "", serviceType: "OTHER", partnerName: "", bookingDate: "", amount: 0, status: "PENDING" },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      refetch: listRefetch,
    });
    mocks.useBookingStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: statsRefetch,
    });

    render(<BookingsPage />);

    expect(mocks.useBookingsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, sortDir: "desc", search: undefined }),
    );
    expect(screen.getByText("stats:0:0:0:0")).toBeInTheDocument();
    expect(mocks.setSearchParams).toHaveBeenCalled();

    await user.click(screen.getByText("status-change"));
    await user.click(screen.getByText("service-change"));
    await user.click(screen.getByText("start-change"));
    await user.click(screen.getByText("end-clear"));
    await user.click(screen.getByText("sortby-change"));
    await user.click(screen.getByText("sortdir-change"));
    await user.click(screen.getByText("export-rows"));
    await user.click(screen.getByText("reset-filters"));
    await user.click(screen.getByText("retry-all"));
    expect(listRefetch).toHaveBeenCalled();
    expect(statsRefetch).toHaveBeenCalled();
    expect(mocks.exportBookingsToCsv).toHaveBeenCalledWith([
      expect.objectContaining({ id: "bk-1" }),
    ]);

    await user.click(screen.getByText("view-row"));
    await user.click(screen.getByText("edit-row"));
    expect(mocks.navigate).toHaveBeenCalledWith("/bookings/bk-1");
    expect(mocks.navigate).toHaveBeenCalledWith("/bookings/edit/bk-1");

    await user.click(screen.getByText("cancel-row"));
    expect(screen.getByText("Cancel booking bk-1?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel Booking" }));
    expect(mocks.cancelMutate).toHaveBeenCalledWith("bk-1", expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
    const cancelOptions = mocks.cancelMutate.mock.calls[0][1];
    cancelOptions.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Booking cancelled");

    await user.click(screen.getByText("delete-row"));
    expect(screen.getByText("Delete booking bk-1?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete Booking" }));
    expect(mocks.deleteMutate).toHaveBeenCalledWith("bk-1", expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
    const deleteOptions = mocks.deleteMutate.mock.calls[0][1];
    deleteOptions.onError(new Error("delete failed"));
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to delete booking: delete failed");

    await user.click(screen.getByText("page-change"));
    expect(mocks.setSearchParams).toHaveBeenCalled();
  });

  it("removes search param when debounced value is cleared and ignores confirm without pending action", async () => {
    const user = userEvent.setup();
    searchParams.set("search", "stale");
    mocks.useDebounce.mockReturnValue("");

    render(<BookingsPage />);

    const effectCall = mocks.setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams | undefined;
    expect(effectCall?.get("search")).toBeNull();

    await user.click(screen.getByText("force-confirm"));
    expect(mocks.cancelMutate).not.toHaveBeenCalled();
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
  });

  it("renders stats skeleton, list loading, list error and empty states", async () => {
    const user = userEvent.setup();
    const listRefetch = vi.fn();
    const statsRefetch = vi.fn();
    mocks.useDebounce.mockReturnValue("");
    mocks.useBookingsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: listRefetch,
    });
    mocks.useBookingStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: statsRefetch,
    });

    const { rerender } = render(<BookingsPage />);
    expect(screen.getAllByText("skeleton:h-24")).toHaveLength(4);
    expect(screen.getByText("Loading bookings...")).toBeInTheDocument();

    mocks.useBookingsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: listRefetch,
    });
    mocks.useBookingStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: statsRefetch,
    });
    rerender(<BookingsPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load bookings" }));
    expect(listRefetch).toHaveBeenCalled();
    expect(statsRefetch).toHaveBeenCalled();

    mocks.useBookingsQuery.mockReturnValue({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: listRefetch,
    });
    rerender(<BookingsPage />);
    expect(screen.getByText("No bookings found for selected filters")).toBeInTheDocument();
  });
});
