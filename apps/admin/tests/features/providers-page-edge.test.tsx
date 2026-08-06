import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePartnersQuery: vi.fn(),
  usePartnerStatsQuery: vi.fn(),
  usePartnerSettlementsQuery: vi.fn(),
  usePartnerMutations: vi.fn(),
  useDebounce: vi.fn(),
  setSearchParams: vi.fn(),
  approveMutate: vi.fn(),
  rejectMutate: vi.fn(),
  blockMutate: vi.fn(),
  unblockMutate: vi.fn(),
  deleteMutate: vi.fn(),
  settlementMutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const searchParams = new URLSearchParams({
  page: "-2",
  status: "",
  serviceType: "",
  city: "",
  search: "",
  sortBy: "",
});

vi.mock("@/features/providers/hooks/usePartners", () => ({
  usePartnersQuery: mocks.usePartnersQuery,
  usePartnerStatsQuery: mocks.usePartnerStatsQuery,
  usePartnerSettlementsQuery: mocks.usePartnerSettlementsQuery,
  usePartnerMutations: mocks.usePartnerMutations,
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
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useSearchParams: () => [searchParams, mocks.setSearchParams],
  };
});

vi.mock("@/components/admin", () => ({
  DataState: ({ isLoading, isError, isEmpty, loadingText, errorText, emptyText, onRetry, children }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  DataTable: ({ rows, columns }: any) => (
    <div>
      {rows.map((row: any) => (
        <div key={row.id}>
          {columns.map((column: any) => (
            <div key={column.key}>{column.render ? column.render(row) : row[column.key]}</div>
          ))}
        </div>
      ))}
    </div>
  ),
  ModalFormLayout: ({ open, title, submitLabel, onClose, children }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
        <button onClick={onClose}>close-reason</button>
        <button form="partner-reason-form" type="submit">{submitLabel}</button>
      </div>
    ) : (
      <button onClick={onClose}>close-reason</button>
    ),
  ConfirmDialog: ({ open, title, description, onClose, onConfirm }: any) => (
    <div>
      <button onClick={onConfirm}>force-confirm</button>
      {open ? (
        <div role="dialog" aria-label={title}>
          <div>{description}</div>
          <button onClick={onClose}>close-confirm</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      ) : null}
    </div>
  ),
  Pagination: ({ onPageChange }: any) => <button onClick={() => onPageChange(0)}>page-change</button>,
}));

vi.mock("@/features/providers/components", () => ({
  PartnerStatusBadge: ({ status }: { status: string }) => <div>{`status:${status}`}</div>,
  PartnersStatsCards: ({ stats }: any) => <div>{`stats:${stats.pending}:${stats.approved}:${stats.rejected}:${stats.blocked}`}</div>,
  PartnersFiltersBar: ({ onStatusChange, onServiceTypeChange, onCityChange, onSortByChange, onReset }: any) => (
    <div>
      <button onClick={() => onStatusChange("APPROVED")}>status-change</button>
      <button onClick={() => onServiceTypeChange("COOK")}>service-change</button>
      <button onClick={() => onCityChange("Delhi")}>city-change</button>
      <button onClick={() => onSortByChange("name")}>sortby-change</button>
      <button onClick={onReset}>reset-filters</button>
    </div>
  ),
}));

import ProvidersPage from "@/features/providers/pages/ProvidersPage";

describe("ProvidersPage edge coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.delete("search");
    searchParams.set("page", "-2");
    searchParams.set("sortBy", "");
    mocks.useDebounce.mockReturnValue("");
    mocks.usePartnersQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "prv-1",
            name: "Rahul",
            phone: "9999999999",
            serviceType: "COOK",
            city: "Delhi",
            appliedDate: "2026-05-01",
            status: "PENDING",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.usePartnerStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.usePartnerSettlementsQuery.mockReturnValue({
      data: {
        items: [{ id: "po-1", providerId: "prv-1", amount: 200, status: "PENDING", referenceBookingId: "bk-1" }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.usePartnerMutations.mockReturnValue({
      approvePartnerMutation: { mutate: mocks.approveMutate, isPending: false },
      rejectPartnerMutation: { mutate: mocks.rejectMutate, isPending: false },
      blockPartnerMutation: { mutate: mocks.blockMutate, isPending: false },
      unblockPartnerMutation: { mutate: mocks.unblockMutate, isPending: false },
      deletePartnerMutation: { mutate: mocks.deleteMutate, isPending: false },
      updateSettlementStatusMutation: { mutate: mocks.settlementMutate },
    });
  });

  it("handles filters, dialogs, partner actions, settlements and pagination", async () => {
    const user = userEvent.setup();
    render(<ProvidersPage />);

    expect(mocks.usePartnersQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, sortBy: "", sortDir: "desc" }),
    );
    expect(screen.getByText("stats:0:0:0:0")).toBeInTheDocument();

    await user.click(screen.getByText("status-change"));
    await user.click(screen.getByText("service-change"));
    await user.click(screen.getByText("city-change"));
    await user.click(screen.getByText("sortby-change"));
    await user.click(screen.getByText("reset-filters"));

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    const approveOptions = mocks.approveMutate.mock.calls[0][1];
    await act(async () => {
      approveOptions.onSuccess();
      approveOptions.onError(new Error("approve failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner approved");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to approve partner: approve failed");

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const rejectDialog = screen.getByRole("dialog", { name: "Reject Partner" });
    await user.type(within(rejectDialog).getByPlaceholderText("Enter reason"), "bad docs");
    await user.click(within(rejectDialog).getByRole("button", { name: "Reject" }));
    const rejectOptions = mocks.rejectMutate.mock.calls[0][1];
    await act(async () => {
      rejectOptions.onSuccess();
      rejectOptions.onError(new Error("reject failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner rejected");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to reject partner: reject failed");

    await user.click(screen.getByRole("button", { name: "Block" }));
    const blockDialog = screen.getByRole("dialog", { name: "Block Partner" });
    await user.type(within(blockDialog).getByPlaceholderText("Enter reason"), "fraud");
    await user.click(within(blockDialog).getByRole("button", { name: "Block" }));
    const blockOptions = mocks.blockMutate.mock.calls[0][1];
    await act(async () => {
      blockOptions.onSuccess();
      blockOptions.onError(new Error("block failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner blocked");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to block partner: block failed");

    await user.click(screen.getByRole("button", { name: "Unblock" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    const unblockOptions = mocks.unblockMutate.mock.calls[0][1];
    await act(async () => {
      unblockOptions.onSuccess();
      unblockOptions.onError(new Error("unblock failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner unblocked");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to unblock partner: unblock failed");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    const deleteOptions = mocks.deleteMutate.mock.calls[0][1];
    await act(async () => {
      deleteOptions.onSuccess();
      deleteOptions.onError(new Error("delete failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner deleted");
    expect(mocks.toastError).toHaveBeenCalledWith("Failed to delete partner: delete failed");

    await user.click(screen.getByRole("button", { name: "Mark Settled" }));
    const settlementOptions = mocks.settlementMutate.mock.calls[0][1];
    await act(async () => {
      settlementOptions.onSuccess();
      settlementOptions.onError(new Error("settlement failed"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Settlement updated");
    expect(mocks.toastError).toHaveBeenCalledWith("Settlement update failed: settlement failed");

    await user.click(screen.getByText("page-change"));
    expect(mocks.setSearchParams).toHaveBeenCalled();
  });

  it("renders loading, error and empty states for partners and settlements and ignores confirm without action", async () => {
    const user = userEvent.setup();
    const partnersRefetch = vi.fn();
    const statsRefetch = vi.fn();
    const settlementsRefetch = vi.fn();
    mocks.usePartnersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: partnersRefetch,
    });
    mocks.usePartnerStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: statsRefetch,
    });
    mocks.usePartnerSettlementsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: settlementsRefetch,
    });

    const { rerender } = render(<ProvidersPage />);
    expect(screen.getByText("Loading partners...")).toBeInTheDocument();
    expect(screen.getByText("Loading settlements...")).toBeInTheDocument();

    mocks.usePartnersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: partnersRefetch,
    });
    mocks.usePartnerSettlementsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: settlementsRefetch,
    });
    rerender(<ProvidersPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load partners" }));
    expect(partnersRefetch).toHaveBeenCalled();
    expect(statsRefetch).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Failed to load settlements" }));
    expect(settlementsRefetch).toHaveBeenCalled();

    mocks.usePartnersQuery.mockReturnValue({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: partnersRefetch,
    });
    mocks.usePartnerSettlementsQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
      refetch: settlementsRefetch,
    });
    rerender(<ProvidersPage />);
    expect(screen.getByText("No partners found")).toBeInTheDocument();
    expect(screen.getByText("No settlements found")).toBeInTheDocument();

    searchParams.set("search", "stale");
    mocks.useDebounce.mockReturnValue("");
    rerender(<ProvidersPage />);
    await user.click(screen.getByText("force-confirm"));
    expect(mocks.approveMutate).toHaveBeenCalledTimes(0);
    expect(mocks.rejectMutate).toHaveBeenCalledTimes(0);
  });

  it("writes debounced search params and closes the reason modal", async () => {
    const user = userEvent.setup();
    searchParams.set("search", "");
    mocks.useDebounce.mockReturnValue("rahul");

    render(<ProvidersPage />);
    const latestCall = mocks.setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams | undefined;
    expect(latestCall?.get("search")).toBe("rahul");

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByRole("dialog", { name: "Reject Partner" })).toBeInTheDocument();
    await user.click(screen.getByText("close-reason"));
    expect(screen.queryByRole("dialog", { name: "Reject Partner" })).not.toBeInTheDocument();
  });
});
