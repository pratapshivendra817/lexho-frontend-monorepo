import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useParams: vi.fn(),
  fetchAuditLogs: vi.fn(),
  fetchAuditLogDetail: vi.fn(),
  fetchWebhookEvents: vi.fn(),
  fetchWebhookEventDetail: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
  useParams: mocks.useParams,
}));

vi.mock("lucide-react", () => ({
  Eye: () => <span>eye-icon</span>,
  RefreshCw: () => <span>refresh-icon</span>,
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
    isEmpty: boolean;
    loadingText?: string;
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
  Skeleton: ({ className }: { className: string }) => <div data-testid="skeleton" className={className}>skeleton</div>,
  StatusBadge: ({ status }: { status: string }) => <span>status:{status}</span>,
  TransactionTimeline: ({
    items,
  }: {
    items: Array<{ id: string; title: string; status: string; at?: string; description?: string }>;
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.title}</span>
          <span>{item.status}</span>
          <span>{item.at ?? "-"}</span>
          <span>{item.description ?? "-"}</span>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/features/operations/api", () => ({
  fetchAuditLogs: mocks.fetchAuditLogs,
  fetchAuditLogDetail: mocks.fetchAuditLogDetail,
  fetchWebhookEvents: mocks.fetchWebhookEvents,
  fetchWebhookEventDetail: mocks.fetchWebhookEventDetail,
}));

import AuditDetailPage from "@/features/operations/pages/AuditDetailPage";
import AuditLogsPage from "@/features/operations/pages/AuditLogsPage";
import WebhookDetailPage from "@/features/operations/pages/WebhookDetailPage";
import WebhookEventsPage from "@/features/operations/pages/WebhookEventsPage";

describe("operations pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useParams.mockReturnValue({ id: "row-1" });
  });

  it("renders audit log filters, rows, refresh, and formatted fallbacks", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    const rows = [
      {
        id: "a1",
        date: "not-a-date",
        user: "Admin",
        role: "ADMIN",
        action: "UPDATE",
        entityType: "BOOKING",
        entityId: "123",
        requestId: "",
      },
      {
        id: "a2",
        date: "2026-07-15T12:00:00Z",
        user: "",
        role: "",
        action: "",
        entityType: "",
        entityId: "",
        requestId: undefined,
      },
    ];

    mocks.useQuery.mockReturnValue({
      data: rows,
      isLoading: false,
      isError: false,
      refetch,
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("not-a-date")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /detail/i })[0]).toHaveAttribute("href", "/audit-logs/a1");

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "  update  ");
    await user.type(inputs[1], "  shiv  ");
    await user.selectOptions(screen.getByRole("combobox"), "SUPPORT");
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    expect(refetch).toHaveBeenCalled();
    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["audit-logs", { startDate: "", endDate: "", action: "update", user: "shiv", role: "SUPPORT" }],
      }),
    );
  });

  it("covers audit log loading, error, and empty states", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingView = render(<AuditLogsPage />);
    expect(screen.getByText("Loading audit logs...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    const errorView = render(<AuditLogsPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load audit logs" }));
    expect(refetch).toHaveBeenCalled();

    errorView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<AuditLogsPage />);
    expect(screen.getByText("No audit logs found")).toBeInTheDocument();
  });

  it("renders audit detail fields, json blocks, change history, and enabled query", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useParams.mockReturnValue({ id: "audit-9" });
    mocks.useQuery.mockReturnValue({
      data: {
        user: "Ops",
        role: "OPERATIONS",
        action: "UPDATE",
        entityType: "PAYMENT",
        entityId: "pay_1",
        requestId: "",
        correlationId: "corr-1",
        oldValue: { before: true },
        newValue: { after: true },
        changeHistory: [
          { id: "c1", field: "status", oldValue: "PENDING", newValue: "SUCCESS", changedAt: "2026-07-15T10:00:00Z" },
          { id: "c2", field: "", oldValue: null, newValue: null, changedAt: undefined },
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });

    render(<AuditDetailPage />);

    expect(screen.getByText("Ops")).toBeInTheDocument();
    expect(screen.getByText("corr-1")).toBeInTheDocument();
    expect(screen.getAllByText("status").length).toBeGreaterThan(0);
    expect(screen.getByText("Record changed")).toBeInTheDocument();
    const oldValueBlock = screen.getByText("Old Value").parentElement?.querySelector("pre");
    const newValueBlock = screen.getByText("New Value").parentElement?.querySelector("pre");
    expect(oldValueBlock).toHaveTextContent('"before": true');
    expect(newValueBlock).toHaveTextContent('"after": true');
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["audit-log-detail", "audit-9"],
        enabled: true,
      }),
    );

    await user.click(screen.getByText("Ops"));
    expect(refetch).not.toHaveBeenCalled();
  });

  it("covers audit detail loading, error, and disabled query without route id", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useParams.mockReturnValue({ id: "" });
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingView = render(<AuditDetailPage />);
    expect(screen.getByText("Loading audit detail...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    render(<AuditDetailPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load audit detail" }));
    expect(refetch).toHaveBeenCalled();
    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["audit-log-detail", ""],
        enabled: false,
      }),
    );
  });

  it("renders webhook filters, skeletons, rows, and retry states", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingView = render(<WebhookEventsPage />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(6);

    loadingView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    const errorView = render(<WebhookEventsPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load webhook events" }));
    expect(refetch).toHaveBeenCalled();

    errorView.unmount();
    mocks.useQuery.mockReturnValue({
      data: [
        { id: "w1", eventType: "payment.captured", paymentId: "pay_1", status: "SUCCESS", processedAt: "invalid-date", retryCount: 2 },
        { id: "w2", eventType: "", paymentId: "", status: "FAILED", processedAt: undefined, retryCount: 0 },
      ],
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<WebhookEventsPage />);

    expect(screen.getByText("payment.captured")).toBeInTheDocument();
    expect(screen.getByText("status:SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("invalid-date")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /details/i })[0]).toHaveAttribute("href", "/webhooks/w1");

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], " pay_1 ");
    await user.type(inputs[1], " payment.captured ");
    await user.selectOptions(screen.getByRole("combobox"), "FAILED");
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["razorpay-webhooks", { search: "pay_1", eventType: " payment.captured ", status: "FAILED" }],
      }),
    );
  });

  it("covers webhook events empty state", () => {
    mocks.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<WebhookEventsPage />);
    expect(screen.getByText("No webhook events found")).toBeInTheDocument();
  });

  it("renders webhook detail fields, error message, payload, history, and retry fallback", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useParams.mockReturnValue({ id: "wh-1" });
    mocks.useQuery.mockReturnValue({
      data: {
        eventType: "payment.failed",
        paymentId: "",
        retryStatus: "",
        status: "FAILED",
        retryCount: 3,
        errorMessage: "gateway timeout",
        history: [
          { id: "h1", message: "first try", status: "FAILED", processedAt: "2026-07-15T11:00:00Z" },
          { id: "h2", message: "", status: "RETRYING", processedAt: undefined },
        ],
        payload: { id: 1, nested: true },
      },
      isLoading: false,
      isError: false,
      refetch,
    });

    render(<WebhookDetailPage />);

    expect(screen.getByText("payment.failed")).toBeInTheDocument();
    expect(screen.getByText("status:FAILED")).toBeInTheDocument();
    expect(screen.getByText("gateway timeout")).toBeInTheDocument();
    expect(screen.getByText("first try")).toBeInTheDocument();
    expect(screen.getByText("Webhook processing")).toBeInTheDocument();
    const payloadBlock = screen.getByText("Event Payload").parentElement?.querySelector("pre");
    expect(payloadBlock).toHaveTextContent('"nested": true');
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["razorpay-webhook-detail", "wh-1"],
        enabled: true,
      }),
    );

    await user.click(screen.getByText("gateway timeout"));
    expect(refetch).not.toHaveBeenCalled();
  });

  it("covers webhook detail loading, error, and disabled query without route id", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useParams.mockReturnValue({ id: "" });
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingView = render(<WebhookDetailPage />);
    expect(screen.getByText("Loading webhook detail...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    render(<WebhookDetailPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load webhook detail" }));
    expect(refetch).toHaveBeenCalled();
    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["razorpay-webhook-detail", ""],
        enabled: false,
      }),
    );
  });
});
