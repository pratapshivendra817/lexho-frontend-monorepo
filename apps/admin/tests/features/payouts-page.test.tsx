import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  fetchPayouts: vi.fn(),
  fetchPaymentReconciliation: vi.fn(),
  updatePaymentStatus: vi.fn(),
  upsertBookingPayout: vi.fn(),
  shareContent: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));

vi.mock("@/api/admin", () => ({
  fetchPaymentReconciliation: mocks.fetchPaymentReconciliation,
  fetchPayouts: mocks.fetchPayouts,
  updatePaymentStatus: mocks.updatePaymentStatus,
  upsertBookingPayout: mocks.upsertBookingPayout,
}));

vi.mock("@/utils/share", () => ({
  shareContent: mocks.shareContent,
}));

vi.mock("@/features/payouts/components", () => ({
  StatCard: ({ title, value }: { title: string; value: string }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
  PayoutTable: ({ data }: { data: Array<{ providerName?: string; partnerName?: string }> }) => (
    <div>{data.map((item, index) => <div key={index}>{item.partnerName ?? item.providerName}</div>)}</div>
  ),
}));

import PayoutsPage from "@/features/payouts/pages/PayoutsPage";

const payouts = [
  {
    id: "p1",
    partnerName: "Partner One",
    providerName: "Provider One",
    earnings: 1000,
    platformFee: 100,
    finalPayout: 900,
    status: "PENDING",
  },
  {
    id: "p2",
    providerName: "Provider Two",
    earnings: 2000,
    platformFee: 200,
    finalPayout: 1800,
    status: "FAILED",
  },
];

type QueryState = {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

type MutationOptions = {
  mutationFn: (payload: any) => Promise<unknown> | unknown;
  onSuccess?: () => Promise<unknown> | unknown;
};

describe("PayoutsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.shareContent.mockResolvedValue(undefined);
    mocks.fetchPayouts.mockResolvedValue(payouts);
    mocks.fetchPaymentReconciliation.mockResolvedValue({
      bookingId: "B-100",
      amount: 2500,
      paymentStatus: "PENDING",
      payout: { status: "PROCESSING" },
    });
    mocks.updatePaymentStatus.mockResolvedValue({});
    mocks.upsertBookingPayout.mockResolvedValue({});

    const payoutsQuery: QueryState = {
      data: payouts,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    const reconciliationQuery: QueryState = {
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === "payouts") return payoutsQuery;
      return reconciliationQuery;
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess }: MutationOptions) => ({
      mutate: async (payload: unknown) => {
        await mutationFn(payload);
        await onSuccess?.();
      },
    }));
  });

  it("renders payout summary, shares, exports csv, fetches reconciliation, updates payment status, and upserts payouts", async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "a") {
        return {
          click,
          set href(value: string) {
            this._href = value;
          },
          get href() {
            return this._href;
          },
          set download(value: string) {
            this._download = value;
          },
          get download() {
            return this._download;
          },
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    render(<PayoutsPage />);

    expect(screen.getByText("Partner Payouts")).toBeInTheDocument();
    expect(screen.getByText("Total Payout")).toBeInTheDocument();
    expect(screen.getByText("INR 2700")).toBeInTheDocument();
    expect(screen.getByText("Pending Payout")).toBeInTheDocument();
    expect(screen.getByText("INR 900")).toBeInTheDocument();
    expect(screen.getByText("Failed Transactions")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Partner One")).toBeInTheDocument();
    expect(screen.getByText("Provider Two")).toBeInTheDocument();
    expect(screen.getByText("Enter booking id to load reconciliation details.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Share Summary" }));
    expect(mocks.shareContent).toHaveBeenCalledWith({
      title: "Partner Payout Summary",
      text: "Total Payout: INR 2700\nPending Payout: INR 900\nFailed Transactions: 1",
      url: "http://localhost:3000/",
      successMessage: "Payout summary copied",
    });

    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(click).toHaveBeenCalled();

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "BOOK-1");
    await user.click(screen.getByRole("button", { name: "Fetch Reconciliation" }));
    expect(mocks.useQuery.mock.calls[1][0].enabled).toBe(false);

    await user.selectOptions(screen.getByRole("combobox"), "FAILED");
    await user.type(screen.getByPlaceholderText("Reason required"), "payment mismatch");
    const paymentMutation = mocks.useMutation.mock.results[0].value;
    await user.click(screen.getByRole("button", { name: "Update Payment Status" }));
    await waitFor(() => {
      expect(mocks.updatePaymentStatus).toHaveBeenCalledWith("BOOK-1", "FAILED", "payment mismatch");
    });
    expect(paymentMutation).toBeTruthy();

    await user.type(screen.getByPlaceholderText("Provider ID"), "55");
    await user.type(screen.getByPlaceholderText("Payout Amount"), "1200");
    await user.clear(screen.getByPlaceholderText("Payout Status (PENDING/PAID...)"));
    await user.type(screen.getByPlaceholderText("Payout Status (PENDING/PAID...)"), "PAID");
    await user.click(screen.getByRole("button", { name: "Upsert Payout" }));
    await waitFor(() => {
      expect(mocks.upsertBookingPayout).toHaveBeenCalledWith("BOOK-1", {
        providerId: 55,
        amount: 1200,
        status: "PAID",
      });
    });

    createElementSpy.mockRestore();
  });

  it("covers loading, error, retry, empty state, guard clauses, and reconciliation display", async () => {
    const user = userEvent.setup();
    const payoutsRefetch = vi.fn();
    const reconciliationRefetch = vi.fn();

    mocks.useQuery.mockImplementationOnce(() => ({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: payoutsRefetch,
    }));
    mocks.useQuery.mockImplementationOnce(() => ({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: reconciliationRefetch,
    }));

    const loadingView = render(<PayoutsPage />);
    expect(screen.getByText("Loading payouts...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockImplementationOnce(() => ({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: payoutsRefetch,
    }));
    mocks.useQuery.mockImplementationOnce(() => ({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: reconciliationRefetch,
    }));
    const errorView = render(<PayoutsPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(payoutsRefetch).toHaveBeenCalled();

    errorView.unmount();
    mocks.useQuery.mockImplementationOnce(() => ({
      data: [],
      isLoading: false,
      isError: false,
      refetch: payoutsRefetch,
    }));
    mocks.useQuery.mockImplementationOnce(() => ({
      data: {
        bookingId: "BOOK-9",
        amount: 999,
        paymentStatus: "SUCCESS",
        payout: null,
      },
      isLoading: false,
      isError: false,
      refetch: reconciliationRefetch,
    }));
    render(<PayoutsPage />);
    expect(screen.getByText("No payouts found")).toBeInTheDocument();
    expect(screen.getByText("Booking BOOK-9 | Amount 999 | Payment SUCCESS | Payout N/A")).toBeInTheDocument();

    await user.type(screen.getAllByRole("textbox")[0], "BOOK-9");
    await user.click(screen.getByRole("button", { name: "Update Payment Status" }));
    expect(mocks.updatePaymentStatus).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText("Reason required"), "ok");
    await user.clear(screen.getByPlaceholderText("Provider ID"));
    await user.type(screen.getByPlaceholderText("Provider ID"), "abc");
    await user.clear(screen.getByPlaceholderText("Payout Amount"));
    await user.type(screen.getByPlaceholderText("Payout Amount"), "xyz");
    await user.click(screen.getByRole("button", { name: "Upsert Payout" }));
    expect(mocks.upsertBookingPayout).not.toHaveBeenCalled();
  });
});
