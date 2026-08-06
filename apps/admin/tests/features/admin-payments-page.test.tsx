import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  fetchAdminPaymentDashboard: vi.fn(),
  fetchAdminPaymentTransactions: vi.fn(),
  fetchAdminBookingPaymentDetail: vi.fn(),
  reconcileAdminBookingPayment: vi.fn(),
  createAdminBookingRefund: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
  randomUUID: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("lucide-react", () => ({
  RefreshCw: () => <span>refresh-icon</span>,
  RotateCcw: () => <span>reconcile-icon</span>,
  Search: () => <span>search-icon</span>,
}));

vi.mock("@/components/admin", () => ({
  DataState: ({
    isLoading,
    isError,
    isEmpty,
    loadingText,
    errorText,
    emptyText,
    onRetry,
    children,
  }: {
    isLoading: boolean;
    isError: boolean;
    isEmpty?: boolean;
    loadingText: string;
    errorText: string;
    emptyText?: string;
    onRetry: () => void;
    children: React.ReactNode;
  }) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  StatusBadge: ({ status }: { status: string }) => <span>{status || "NO_STATUS"}</span>,
  TransactionTimeline: ({
    items,
  }: {
    items: Array<{ title: string; description: string; status?: string; at?: string }>;
  }) => (
    <div>
      {items.length === 0 ? <span>No timeline items</span> : null}
      {items.map((item) => (
        <div key={`${item.title}-${item.description}`}>{item.title} | {item.description} | {item.status ?? ""} | {item.at ?? ""}</div>
      ))}
    </div>
  ),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("@/features/admin-payments/api", () => ({
  fetchAdminPaymentDashboard: mocks.fetchAdminPaymentDashboard,
  fetchAdminPaymentTransactions: mocks.fetchAdminPaymentTransactions,
  fetchAdminBookingPaymentDetail: mocks.fetchAdminBookingPaymentDetail,
  reconcileAdminBookingPayment: mocks.reconcileAdminBookingPayment,
  createAdminBookingRefund: mocks.createAdminBookingRefund,
}));

import AdminPaymentsPage from "@/features/admin-payments/pages/AdminPaymentsPage";

type QueryState = {
  data?: unknown;
  isLoading?: boolean;
  isError?: boolean;
  refetch?: ReturnType<typeof vi.fn>;
};

const makeQueryState = (state: QueryState = {}) => ({
  data: state.data,
  isLoading: state.isLoading ?? false,
  isError: state.isError ?? false,
  refetch: state.refetch ?? vi.fn(),
});

const mockQueryStates = (states: {
  dashboard: QueryState;
  transactions: QueryState;
  detail: QueryState;
}) => {
  mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
    const queryName = options.queryKey[0];
    if (queryName === "admin-payments-dashboard") {
      return makeQueryState(states.dashboard);
    }
    if (queryName === "admin-payment-transactions") {
      return makeQueryState(states.transactions);
    }
    return makeQueryState(states.detail);
  });
};

describe("AdminPaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.extractApiError.mockReturnValue("mapped api error");
    mocks.randomUUID.mockReturnValue("uuid-1");
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: mocks.randomUUID },
      configurable: true,
    });
    mockQueryStates({
      dashboard: {
        data: {
          createdAttempts: 1,
          paidAttempts: 2,
          failedAttempts: 3,
          refundedAttempts: 4,
          paidAmount: 1200,
          processedRefundAmount: 100,
        },
      },
      transactions: {
        data: {
          content: [
            {
              id: "t1",
              bookingId: "b1",
              status: "PAID",
              amount: 500,
              currency: "INR",
              razorpayOrderId: "ord-1",
              razorpayPaymentId: "pay-1",
              createdAt: "2026-07-15T12:00:00Z",
            },
          ],
          totalElements: 3,
          totalPages: 2,
          pageNumber: 0,
        },
      },
      detail: {
        data: {
          bookingId: "b1",
          paymentStatus: "PAID",
          amount: 500,
          currency: "INR",
          razorpayOrderId: "ord-1",
          razorpayPaymentId: "pay-1",
          attempts: [{ id: "a1", amount: 500, currency: "INR", status: "PAID", createdAt: "2026-07-15T12:00:00Z", razorpayPaymentId: "pay-1", razorpayOrderId: "ord-1" }],
          refunds: [{ id: "r1", amount: 100, status: "DONE", createdAt: "2026-07-15T13:00:00Z", processedAt: "2026-07-15T13:30:00Z", reason: "duplicate", razorpayRefundId: "ref-1" }],
        },
      },
    });

    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => {
      return {
        isPending: false,
        mutate: async (payload: unknown) => {
          try {
            const result = await mutationFn(payload);
            await onSuccess?.(result, payload);
          } catch (error) {
            onError?.(error);
          }
        },
      };
    });

    mocks.reconcileAdminBookingPayment.mockResolvedValue({});
    mocks.createAdminBookingRefund.mockResolvedValue({});
  });

  it("renders dashboard, transaction table, pagination, load-booking detail, reconcile, and refund flows", async () => {
    const user = userEvent.setup();

    render(<AdminPaymentsPage />);

    expect(screen.getAllByText("Created")).toHaveLength(2);
    expect(screen.getByText("Booking ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh-icon/i })).toBeInTheDocument();
    expect(screen.getByText("b1")).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /refresh-icon/i }));

    const bookingInput = screen.getByPlaceholderText("78");
    await user.type(bookingInput, "b1");
    await user.click(screen.getByRole("button", { name: /search-icon/i }));

    expect(await screen.findByText("Booking Payment Detail")).toBeInTheDocument();
    expect(screen.getAllByText("PAID").length).toBeGreaterThan(1);
    expect(screen.getByText(/payment \| pay-1/i)).toBeInTheDocument();
    expect(screen.getByText(/refund \| duplicate/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reconcile-icon/i }));

    await waitFor(() => {
      expect(mocks.reconcileAdminBookingPayment).toHaveBeenCalledWith("b1");
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Payment reconciled");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-payments-dashboard"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-payment-transactions"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-booking-payment-detail", "b1"] });

    await user.type(screen.getByPlaceholderText("Refund amount"), "100");
    await user.type(screen.getByPlaceholderText("Refund reason"), "duplicate");
    await user.click(screen.getByRole("button", { name: "Create Refund" }));

    await waitFor(() => {
      expect(mocks.createAdminBookingRefund).toHaveBeenCalledWith("b1", {
        amount: 100,
        reason: "duplicate",
        idempotencyKey: "refund-booking-b1-uuid-1",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Refund request created");
  });

  it("covers loading, error, empty, validation, and mutation error states", async () => {
    const user = userEvent.setup();
    const dashboardRefetch = vi.fn();
    const transactionsRefetch = vi.fn();
    const detailRefetch = vi.fn();
    mockQueryStates({
      dashboard: { data: undefined, isLoading: true, refetch: dashboardRefetch },
      transactions: { data: undefined, isError: true, refetch: transactionsRefetch },
      detail: { data: undefined, isError: true, refetch: detailRefetch },
    });

    mocks.useMutation.mockImplementation(({ onError }) => {
      return {
        isPending: false,
        mutate: () => onError?.({ response: { status: 500 } }),
      };
    });

    const { rerender } = render(<AdminPaymentsPage />);
    expect(screen.getByText("Loading payment dashboard...")).toBeInTheDocument();

    mockQueryStates({
      dashboard: {
        data: { createdAttempts: 0, paidAttempts: 0, failedAttempts: 0, refundedAttempts: 0, paidAmount: 0, processedRefundAmount: 0 },
        refetch: dashboardRefetch,
      },
      transactions: { data: undefined, isError: true, refetch: transactionsRefetch },
      detail: { data: undefined, isError: true, refetch: detailRefetch },
    });
    rerender(<AdminPaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Failed to load payment transactions" }));
    expect(transactionsRefetch).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /search-icon/i }));
    expect(mocks.toastError).toHaveBeenCalledWith("Enter booking ID first");

    const bookingInput = screen.getByPlaceholderText("78");
    await user.type(bookingInput, "b9");
    await user.click(screen.getByRole("button", { name: /search-icon/i }));

    mockQueryStates({
      dashboard: {
        data: { createdAttempts: 0, paidAttempts: 0, failedAttempts: 0, refundedAttempts: 0, paidAmount: 0, processedRefundAmount: 0 },
        refetch: dashboardRefetch,
      },
      transactions: {
        data: { content: [], totalElements: 0, totalPages: 1, pageNumber: 0 },
        refetch: transactionsRefetch,
      },
      detail: { data: undefined, isError: true, refetch: detailRefetch },
    });
    rerender(<AdminPaymentsPage />);
    expect(screen.getByText("No payment transactions found")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Failed to load booking payment" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Failed to load booking payment" }));
    expect(detailRefetch).toHaveBeenCalled();

    const reconcileButton = screen.getByRole("button", { name: /reconcile latest razorpay payment/i });
    await user.click(reconcileButton);
    expect(mocks.extractApiError).toHaveBeenCalledWith({ response: { status: 500 } }, "Unable to reconcile payment");

    mockQueryStates({
      dashboard: {
        data: { createdAttempts: 0, paidAttempts: 0, failedAttempts: 0, refundedAttempts: 0, paidAmount: 0, processedRefundAmount: 0 },
      },
      transactions: {
        data: { content: [], totalElements: 0, totalPages: 1, pageNumber: 0 },
      },
      detail: {
        data: {
          bookingId: "b9",
          paymentStatus: "PAID",
          amount: 200,
          currency: "INR",
          razorpayOrderId: "",
          razorpayPaymentId: "",
          attempts: [],
          refunds: [],
        },
      },
    });
    rerender(<AdminPaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Create Refund" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Enter a valid refund amount");

    expect(screen.getAllByText("No timeline items")).toHaveLength(2);

    await user.type(screen.getByPlaceholderText("Refund amount"), "25");
    await user.click(screen.getByRole("button", { name: "Create Refund" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Refund reason is required");

    await user.type(screen.getByPlaceholderText("Refund reason"), "bad state");
    await user.click(screen.getByRole("button", { name: "Create Refund" }));
    expect(mocks.extractApiError).toHaveBeenCalledWith({ response: { status: 500 } }, "Unable to create refund");
  });

  it("validates refund amount and reason, and falls back to Date.now when crypto.randomUUID is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(12345);

    mockQueryStates({
      dashboard: {
        data: { createdAttempts: 0, paidAttempts: 0, failedAttempts: 0, refundedAttempts: 0, paidAmount: 0, processedRefundAmount: 0 },
      },
      transactions: {
        data: {
          content: [{ id: "t2", bookingId: "b2", status: "PAID", amount: 10, currency: "INR", razorpayOrderId: "", razorpayPaymentId: "", createdAt: "" }],
          totalElements: 1,
          totalPages: 1,
          pageNumber: 0,
        },
      },
      detail: {
        data: { bookingId: "b2", paymentStatus: "PAID", amount: 10, currency: "INR", razorpayOrderId: "", razorpayPaymentId: "", attempts: [], refunds: [] },
      },
    });

    render(<AdminPaymentsPage />);
    await user.click(screen.getByText("b2"));

    await user.click(screen.getByRole("button", { name: "Create Refund" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Enter a valid refund amount");

    await user.type(screen.getByPlaceholderText("Refund amount"), "50");
    await user.click(screen.getByRole("button", { name: "Create Refund" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Refund reason is required");

    await user.type(screen.getByPlaceholderText("Refund reason"), "manual");
    await user.click(screen.getByRole("button", { name: "Create Refund" }));

    await waitFor(() => {
      expect(mocks.createAdminBookingRefund).toHaveBeenCalledWith("b2", {
        amount: 50,
        reason: "manual",
        idempotencyKey: "refund-booking-b2-12345",
      });
    });

    dateNowSpy.mockRestore();
  });

  it("retries the dashboard and resets paging when the status filter changes", async () => {
    const user = userEvent.setup();
    const dashboardRefetch = vi.fn();
    const transactionsRefetch = vi.fn();

    mockQueryStates({
      dashboard: {
        data: undefined,
        isError: true,
        refetch: dashboardRefetch,
      },
      transactions: {
        data: {
          content: [
            {
              id: "t9",
              bookingId: "b9",
              status: "FAILED",
              amount: 15,
              currency: "INR",
              razorpayOrderId: "",
              razorpayPaymentId: "",
              createdAt: "",
            },
          ],
          totalElements: 50,
          totalPages: 3,
          pageNumber: 0,
        },
        refetch: transactionsRefetch,
      },
      detail: {
        data: undefined,
      },
    });

    render(<AdminPaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Failed to load payment dashboard" }));
    expect(dashboardRefetch).toHaveBeenCalled();

    const nextButton = screen.getByRole("button", { name: "Next" });
    const previousButton = screen.getByRole("button", { name: "Previous" });
    expect(previousButton).toBeDisabled();

    await user.click(nextButton);
    expect(previousButton).toBeEnabled();

    await user.selectOptions(screen.getByRole("combobox"), "FAILED");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /refresh-icon/i }));
    expect(transactionsRefetch).toHaveBeenCalled();
  });

  it("renders fallback labels for empty transaction and timeline values", async () => {
    const user = userEvent.setup();

    mockQueryStates({
      dashboard: {
        data: {
          createdAttempts: 0,
          paidAttempts: 0,
          failedAttempts: 0,
          refundedAttempts: 0,
          paidAmount: 0,
          processedRefundAmount: 0,
        },
      },
      transactions: {
        data: {
          content: [
            {
              id: "t-empty",
              bookingId: "",
              status: "",
              amount: 0,
              currency: "",
              razorpayOrderId: "",
              razorpayPaymentId: "",
              createdAt: "invalid-date",
            },
          ],
          totalElements: 1,
          totalPages: 1,
          pageNumber: 0,
        },
      },
      detail: {
        data: {
          bookingId: "fallback",
          paymentStatus: "",
          amount: 100,
          currency: "INR",
          razorpayOrderId: "",
          razorpayPaymentId: "",
          attempts: [
            {
              id: "attempt-empty",
              amount: 100,
              currency: "INR",
              status: "",
              createdAt: "",
              razorpayPaymentId: "",
              razorpayOrderId: "",
            },
          ],
          refunds: [
            {
              id: "refund-empty",
              amount: 25,
              status: "",
              createdAt: "created-only",
              processedAt: "",
              reason: "",
              razorpayRefundId: "refund-id-only",
            },
          ],
        },
      },
    });

    render(<AdminPaymentsPage />);

    expect(screen.getByText("invalid-date")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(1);
    expect(screen.getByText("NO_STATUS")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("78"), "fallback");
    await user.click(screen.getByRole("button", { name: /search-icon/i }));

    expect(await screen.findByText(/payment \| no razorpay id/i)).toBeInTheDocument();
    expect(screen.getByText(/refund \| refund-id-only \| refunded \| created-only/i)).toBeInTheDocument();
  });
});
