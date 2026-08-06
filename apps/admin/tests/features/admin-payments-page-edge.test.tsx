import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
  useStateCallIndex: 0,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useState<T>(initial: T) {
      mocks.useStateCallIndex += 1;
      switch (mocks.useStateCallIndex) {
        case 1:
          return ["", vi.fn()] as [T, (value: T | ((previous: T) => T)) => void];
        case 2:
          return ["", vi.fn()] as [T, (value: T | ((previous: T) => T)) => void];
        case 3:
          return [0, vi.fn()] as [T, (value: T | ((previous: T) => T)) => void];
        case 4:
          return ["   ", vi.fn()] as [T, (value: T | ((previous: T) => T)) => void];
        case 5:
          return ["15", vi.fn()] as [T, (value: T | ((previous: T) => T)) => void];
        case 6:
          return ["manual", vi.fn()] as [T, (value: T | ((previous: T) => T)) => void];
        default:
          return actual.useState(initial);
      }
    },
  };
});

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
    children,
  }: {
    isLoading: boolean;
    isError: boolean;
    isEmpty?: boolean;
    loadingText: string;
    errorText: string;
    emptyText?: string;
    children: React.ReactNode;
  }) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <div>{errorText}</div>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  StatusBadge: ({ status }: { status: string }) => <span>{status || "NO_STATUS"}</span>,
  TransactionTimeline: () => <div>timeline</div>,
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
  fetchAdminPaymentDashboard: vi.fn(),
  fetchAdminPaymentTransactions: vi.fn(),
  fetchAdminBookingPaymentDetail: vi.fn(),
  reconcileAdminBookingPayment: vi.fn(),
  createAdminBookingRefund: vi.fn(),
}));

import AdminPaymentsPage from "@/features/admin-payments/pages/AdminPaymentsPage";

describe("AdminPaymentsPage edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useStateCallIndex = 0;
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useMutation.mockImplementation(() => ({
      isPending: false,
      mutate: vi.fn(),
    }));
    mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      const queryName = options.queryKey[0];
      if (queryName === "admin-payments-dashboard") {
        return {
          data: {
            createdAttempts: 0,
            paidAttempts: 0,
            failedAttempts: 0,
            refundedAttempts: 0,
            paidAmount: 0,
            processedRefundAmount: 0,
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      if (queryName === "admin-payment-transactions") {
        return {
          data: {
            content: [],
            totalElements: 0,
            totalPages: 1,
            pageNumber: 0,
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return {
        data: {
          bookingId: "detail-booking",
          paymentStatus: "PAID",
          amount: 15,
          currency: "INR",
          razorpayOrderId: "",
          razorpayPaymentId: "",
          attempts: [],
          refunds: [],
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    });
  });

  it("shows the missing booking error when the selected booking id trims to empty", async () => {
    const user = userEvent.setup();

    render(<AdminPaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Create Refund" }));

    expect(mocks.toastError).toHaveBeenCalledWith("Load a booking first");
  });
});
