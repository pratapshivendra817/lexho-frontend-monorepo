import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClientMock } from "./featureTestUtils";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  fetchSupportTicketsWithFilters: vi.fn(),
  fetchSupportTicketById: vi.fn(),
  updateSupportTicketStatus: vi.fn(),
  replySupportTicket: vi.fn(),
  fetchSupportFaqCategories: vi.fn(),
  fetchSupportFaqItems: vi.fn(),
  createSupportFaqCategory: vi.fn(),
  updateSupportFaqCategory: vi.fn(),
  deleteSupportFaqCategory: vi.fn(),
  createSupportFaqItem: vi.fn(),
  updateSupportFaqItem: vi.fn(),
  deleteSupportFaqItem: vi.fn(),
  shareContent: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/api/admin", () => ({
  fetchSupportTicketsWithFilters: mocks.fetchSupportTicketsWithFilters,
  fetchSupportTicketById: mocks.fetchSupportTicketById,
  updateSupportTicketStatus: mocks.updateSupportTicketStatus,
  replySupportTicket: mocks.replySupportTicket,
  fetchSupportFaqCategories: mocks.fetchSupportFaqCategories,
  fetchSupportFaqItems: mocks.fetchSupportFaqItems,
  createSupportFaqCategory: mocks.createSupportFaqCategory,
  updateSupportFaqCategory: mocks.updateSupportFaqCategory,
  deleteSupportFaqCategory: mocks.deleteSupportFaqCategory,
  createSupportFaqItem: mocks.createSupportFaqItem,
  updateSupportFaqItem: mocks.updateSupportFaqItem,
  deleteSupportFaqItem: mocks.deleteSupportFaqItem,
}));

vi.mock("@/utils/share", () => ({
  shareContent: mocks.shareContent,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/features/support/components", () => ({
  StatsCards: ({ tickets }: { tickets: Array<{ id: string | number }> }) => <div>stats-{tickets.length}</div>,
  TicketTable: ({
    tickets,
    onSelect,
    selectedId,
  }: {
    tickets: Array<{ id: string | number; subject?: string }>;
    onSelect: (ticket: any) => void;
    selectedId?: string | number;
  }) => (
    <div>
      <div>selected-{selectedId ?? "none"}</div>
      {tickets.map((ticket) => (
        <button key={ticket.id} type="button" onClick={() => onSelect(ticket)}>
          ticket-{ticket.id}-{ticket.subject}
        </button>
      ))}
    </div>
  ),
  TicketDetail: ({
    ticket,
    onStatusChange,
    onReply,
  }: {
    ticket: any;
    onStatusChange: (status: string) => void;
    onReply: (msg: string) => void;
  }) => (
    <div>
      <div>detail-{ticket?.id ?? "empty"}</div>
      <button type="button" onClick={() => onStatusChange("RESOLVED")}>
        resolve-ticket
      </button>
      <button type="button" onClick={() => onReply("Handled")}>
        reply-ticket
      </button>
    </div>
  ),
}));

type QueryOptions = { queryKey: unknown[]; enabled?: boolean };
type MutationOptions = { mutationFn: (...args: any[]) => any; onSuccess?: (...args: any[]) => any; onError?: (...args: any[]) => any };

function createMutationMock(impl: (options: MutationOptions) => { mutate: (...args: any[]) => void }) {
  mocks.useMutation.mockImplementation(impl);
}

describe("support pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.shareContent.mockResolvedValue(undefined);
    mocks.toastSuccess.mockReturnValue(undefined);
    mocks.toastError.mockReturnValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders support page loading, error, empty, and faq mode states", async () => {
    const SupportPage = (await import("@/features/support/pages/SupportPage")).default;
    createMutationMock(() => ({ mutate: vi.fn() }));
    mocks.useQueryClient.mockReturnValue(createQueryClientMock());
    const emptyTicketsResult = { data: { tickets: [] }, isLoading: false, isError: false, refetch: vi.fn() };

    mocks.useQuery.mockImplementation(() => ({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() }));
    const loadingView = render(<SupportPage />);
    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useQuery.mockImplementation(() => ({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() }));
    const errorView = render(<SupportPage />);
    expect(screen.getByText("Failed to load support tickets.")).toBeInTheDocument();
    errorView.unmount();

    mocks.useQuery.mockImplementation((options: QueryOptions) => {
      if (options.queryKey[0] === "support-faq-categories-admin") {
        return { data: [], isLoading: false };
      }
      return emptyTicketsResult;
    });
    render(<SupportPage />);
    expect(screen.getByText("No tickets found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Support FAQs" }));
    expect(screen.getAllByText("Support FAQs")).toHaveLength(2);
    expect(screen.getByText("Select a category first.")).toBeInTheDocument();
  });

  it("handles support ticket selection, sharing, status updates, replies, filters, and pagination", async () => {
    const queryClient = createQueryClientMock();
    const ticket = {
      id: "11",
      subject: "Payment failed",
      status: "OPEN",
      priority: "HIGH",
      categoryId: "payments",
      requestId: "req-11",
      correlationId: "corr-11",
      messages: [],
    };
    const ticketsResult = {
      data: { tickets: [ticket] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    const detailResult = { data: { ...ticket, status: "IN_PROGRESS" } };

    mocks.useQuery.mockImplementation((options: QueryOptions) => {
      if (options.queryKey[0] === "support-ticket-detail") {
        return detailResult;
      }
      return ticketsResult;
    });
    createMutationMock((options) => ({
      mutate: (variables: any, callbacks?: { onSuccess?: () => void }) => {
        void options.mutationFn(variables);
        void options.onSuccess?.();
        void callbacks?.onSuccess?.();
      },
    }));
    mocks.useQueryClient.mockReturnValue(queryClient);

    const SupportPage = (await import("@/features/support/pages/SupportPage")).default;
    render(<SupportPage />);

    fireEvent.click(screen.getByText("ticket-11-Payment failed"));
    expect(screen.getByText("detail-11")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Share Selected Ticket" }));
    await waitFor(() => {
      expect(mocks.shareContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Ticket #11",
          successMessage: "Ticket summary copied",
        }),
      );
    });

    fireEvent.click(screen.getByText("resolve-ticket"));
    await waitFor(() => {
      expect(mocks.updateSupportTicketStatus).toHaveBeenCalledWith("11", "RESOLVED");
    });

    fireEvent.click(screen.getByText("reply-ticket"));
    await waitFor(() => {
      expect(mocks.replySupportTicket).toHaveBeenCalledWith("11", "Handled");
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["support-tickets"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["support-ticket-detail", "11"] });

    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "refund" } });
    fireEvent.change(screen.getByPlaceholderText("Category (payments)"), { target: { value: "billing" } });
    fireEvent.change(screen.getByDisplayValue("All Status"), { target: { value: "CLOSED" } });
    fireEvent.change(screen.getByDisplayValue("All Priority"), { target: { value: "URGENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("handles faq category and item CRUD flows with success toasts and cache refresh", async () => {
    const queryClient = createQueryClientMock();
    mocks.useQueryClient.mockReturnValue(queryClient);
    mocks.useQuery.mockImplementation((options: QueryOptions) => {
      if (options.queryKey[0] === "support-faq-items-admin") {
        return {
          data:
            options.enabled
              ? [{ id: "faq-1", question: "How?", answer: "Like this", displayOrder: 2, active: true }]
              : [],
          isLoading: false,
        };
      }
      return {
        data: [{ id: "payments", label: "Payments", displayOrder: 4, active: true }],
        isLoading: false,
      };
    });

    let mutationIndex = 0;
    mocks.useMutation.mockImplementation((options: MutationOptions) => {
      const index = mutationIndex++;
      return {
        mutate: async (variables?: any) => {
          await options.mutationFn(variables);
          await options.onSuccess?.(undefined, variables, undefined);
          if (index === 0 || index === 1 || index === 2 || index === 3 || index === 4 || index === 5 || index === 6) {
            return;
          }
        },
      };
    });

    const SupportFaqsPage = (await import("@/features/support/pages/SupportFaqsPage")).default;
    render(<SupportFaqsPage />);

    expect(screen.getByText(/Missing defaults:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Missing Defaults" }));
    await waitFor(() => {
      expect(mocks.createSupportFaqCategory).toHaveBeenCalled();
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Default categories added");
    });

    fireEvent.change(screen.getByPlaceholderText("Category ID (payments)"), { target: { value: "refunds" } });
    fireEvent.change(screen.getByPlaceholderText("Label"), { target: { value: "Refunds" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(mocks.createSupportFaqCategory).toHaveBeenCalledWith(expect.objectContaining({ id: "refunds" })));

    fireEvent.change(screen.getByPlaceholderText("Category ID (payments)"), { target: { value: "refunds" } });
    fireEvent.change(screen.getByPlaceholderText("Label"), { target: { value: "Refunds" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(mocks.updateSupportFaqCategory).toHaveBeenCalledWith("refunds", expect.objectContaining({ label: "Refunds" })));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mocks.deleteSupportFaqCategory).toHaveBeenCalledWith("refunds"));

    fireEvent.click(screen.getByText("Payments"));
    fireEvent.change(screen.getByPlaceholderText("FAQ ID (refund-pending)"), { target: { value: "faq-2" } });
    fireEvent.change(screen.getByPlaceholderText("Question"), { target: { value: "When?" } });
    fireEvent.change(screen.getByPlaceholderText("Answer"), { target: { value: "Tomorrow" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create" })[1]!);
    await waitFor(() => expect(mocks.createSupportFaqItem).toHaveBeenCalledWith("payments", expect.objectContaining({ id: "faq-2" })));

    fireEvent.click(screen.getByText("How?"));
    fireEvent.click(screen.getAllByRole("button", { name: "Update" })[1]!);
    await waitFor(() => expect(mocks.updateSupportFaqItem).toHaveBeenCalledWith("payments", "faq-1", expect.objectContaining({ question: "How?" })));

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]!);
    await waitFor(() => expect(mocks.deleteSupportFaqItem).toHaveBeenCalledWith("payments", "faq-1"));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["support-faq-categories-admin"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["support-faq-items-admin", "payments"] });
    cleanup();
  });
});
