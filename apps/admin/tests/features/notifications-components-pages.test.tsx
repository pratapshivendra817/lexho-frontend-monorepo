import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQueryClient: vi.fn(),
  useAdminNotificationStatsQuery: vi.fn(),
  useAdminNotificationsQuery: vi.fn(),
  useAdminNotificationDetailsQuery: vi.fn(),
  useAdminNotificationMutations: vi.fn(),
  useAdminNotificationSocket: vi.fn(),
  useDebounce: vi.fn(),
  initializeAdminPushNotifications: vi.fn(),
  extractApiError: vi.fn(),
  shareContent: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  invalidateQueries: vi.fn(),
  setPage: vi.fn(),
  retryMutate: vi.fn(),
  sendMutate: vi.fn(),
  refetch: vi.fn(),
  detailsRefetch: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: mocks.useDebounce,
}));

vi.mock("@/services/adminPushNotifications", () => ({
  initializeAdminPushNotifications: mocks.initializeAdminPushNotifications,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("@/utils/share", () => ({
  shareContent: mocks.shareContent,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.success,
    error: mocks.error,
  },
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useParams: () => ({ id: "note-1" }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div>grid</div>,
  XAxis: () => <div>x-axis</div>,
  YAxis: () => <div>y-axis</div>,
  Tooltip: () => <div>tooltip</div>,
  Bar: () => <div>bar</div>,
  Line: () => <div>line</div>,
}));

vi.mock("@/components/admin", () => ({
  Skeleton: ({ className }: { className?: string }) => <div>{className}</div>,
  DataState: ({
    isLoading,
    isError,
    isEmpty,
    loadingText,
    errorText,
    emptyText,
    onRetry,
    children,
  }: any) => {
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
  Pagination: ({ page, onPageChange }: any) => (
    <div>
      <span>page-{page}</span>
      <button onClick={() => onPageChange(page + 1)}>next-page</button>
    </div>
  ),
  Modal: ({ open, title, children, footer }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        {children}
        {footer}
      </div>
    ) : null,
  ConfirmDialog: ({ open, title, description, onConfirm }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <button onClick={onConfirm}>confirm-dialog</button>
      </div>
    ) : null,
}));

vi.mock("@/features/notifications/hooks/useAdminNotifications", () => ({
  useAdminNotificationStatsQuery: mocks.useAdminNotificationStatsQuery,
  useAdminNotificationsQuery: mocks.useAdminNotificationsQuery,
  useAdminNotificationDetailsQuery: mocks.useAdminNotificationDetailsQuery,
  useAdminNotificationMutations: mocks.useAdminNotificationMutations,
}));

vi.mock("@/features/notifications/hooks/useAdminNotificationSocket", () => ({
  useAdminNotificationSocket: mocks.useAdminNotificationSocket,
}));

import NotificationDetailsPage from "@/features/notifications/pages/NotificationDetailsPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";
import { NotificationStatsCards } from "@/features/notifications/components/NotificationStatsCards";
import { NotificationsFiltersBar } from "@/features/notifications/components/NotificationsFiltersBar";
import { NotificationStatusBadge } from "@/features/notifications/components/NotificationStatusBadge";

describe("notifications components and pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "default" },
    });
    mocks.useDebounce.mockImplementation((value) => value);
    mocks.extractApiError.mockImplementation((_error, fallback) => fallback);
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useAdminNotificationStatsQuery.mockReturnValue({
      data: {
        totalSent: 5,
        totalFailed: 1,
        totalRead: 3,
        totalPending: 2,
        totalClicked: 4,
        channelWiseStats: [{ name: "Push", value: 2 }],
        trend: [{ label: "Mon", sent: 1, failed: 0, read: 1 }],
      },
    });
    mocks.useAdminNotificationsQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "note-1",
            title: "Promo",
            userType: "CUSTOMERS",
            notificationType: "BOOKING",
            channelType: "PUSH",
            status: "FAILED",
            createdAt: "2026-07-16T10:00:00Z",
            message: "Hello",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminNotificationDetailsQuery.mockReturnValue({
      data: {
        id: "note-1",
        title: "Promo",
        userType: "CUSTOMERS",
        notificationType: "BOOKING",
        channelType: "PUSH",
        status: "FAILED",
        failureReason: "gateway",
        city: "Delhi",
        service: "Cleaning",
        createdAt: "2026-07-16T10:00:00Z",
        scheduledAt: "2026-07-16T11:00:00Z",
        readCount: 2,
        clickCount: 1,
        message: "Hello",
      },
      isLoading: false,
      isError: false,
      refetch: mocks.detailsRefetch,
    });
    mocks.useAdminNotificationMutations.mockReturnValue({
      retryMutation: {
        isPending: false,
        mutate: mocks.retryMutate.mockImplementation((_id, options) => options?.onSuccess?.()),
      },
      sendMutation: {
        isPending: false,
        mutate: mocks.sendMutate.mockImplementation((_payload, options) => options?.onSuccess?.()),
      },
    });
  });

  it("renders notification helper components and emits filter callbacks", () => {
    const onSearchChange = vi.fn();
    const onReset = vi.fn();
    render(
      <>
        <NotificationStatsCards
          stats={{
            totalSent: 1,
            totalFailed: 2,
            totalRead: 3,
            totalPending: 4,
            totalClicked: 5,
            channelWiseStats: [],
            trend: [],
          }}
        />
        <NotificationStatusBadge status="sent" />
        <NotificationsFiltersBar
          search="abc"
          userType=""
          notificationType=""
          channelType=""
          status=""
          onSearchChange={onSearchChange}
          onUserTypeChange={vi.fn()}
          onNotificationTypeChange={vi.fn()}
          onChannelTypeChange={vi.fn()}
          onStatusChange={vi.fn()}
          onReset={onReset}
        />
      </>,
    );

    expect(screen.getByText("Total Sent")).toBeInTheDocument();
    expect(screen.getByText("SENT")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search notifications"), { target: { value: "next" } });
    expect(onSearchChange).toHaveBeenCalledWith("next");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("renders notifications page and handles send, share, retry, socket invalidation, and browser push states", async () => {
    mocks.initializeAdminPushNotifications.mockResolvedValueOnce(true);
    render(<NotificationsPage />);

    expect(mocks.useAdminNotificationSocket).toHaveBeenCalled();
    const socketHandler = mocks.useAdminNotificationSocket.mock.calls[0]?.[0]?.onMessage;
    socketHandler?.();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-notifications"] });
    expect(screen.getByText("Notification Management")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enable Browser Push" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Browser push enabled"));

    fireEvent.click(screen.getByRole("button", { name: "Send Notification" }));
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[1]!, { target: { value: "Flash Sale" } });
    fireEvent.change(textboxes[2]!, { target: { value: "Now live" } });
    fireEvent.change(screen.getByPlaceholderText("101, 102"), { target: { value: "12, 0, 14" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(mocks.sendMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Flash Sale",
          message: "Now live",
          userIds: [12, 14],
        }),
        expect.any(Object),
      );
    });

    fireEvent.click(screen.getByText("Quick View"));
    expect(screen.getByText("Notification Details")).toBeInTheDocument();
    expect(screen.getByText(/Failure Reason:/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Share")[0]!);
    await waitFor(() => expect(mocks.shareContent).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Retry"));
    expect(screen.getByText("Retry Notification")).toBeInTheDocument();
    fireEvent.click(screen.getByText("confirm-dialog"));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Retry triggered"));
    fireEvent.click(screen.getByText("next-page"));
    expect(screen.getByText("page-2")).toBeInTheDocument();
  });

  it("handles browser push denied and error fallback paths", async () => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "denied" },
    });

    mocks.initializeAdminPushNotifications.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("boom"));
    render(<NotificationsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Enable Browser Push" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "Browser notification permission is blocked. Enable it from Chrome site settings.",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Enable Browser Push" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Failed to enable browser push"));
  });

  it("covers notification page fallback branches and mutation errors", async () => {
    mocks.useAdminNotificationStatsQuery.mockReturnValue({ data: undefined });
    mocks.useAdminNotificationsQuery.mockReturnValue({
      data: {
        content: [
          {
            id: "note-2",
            title: "",
            userType: "",
            notificationType: "",
            channelType: "",
            status: "SENT",
            createdAt: "",
            message: "",
          },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: true,
      refetch: mocks.refetch,
    });
    mocks.useAdminNotificationDetailsQuery.mockReturnValue({
      data: {
        id: "note-2",
        title: "",
        userType: "",
        notificationType: "",
        channelType: "",
        status: "SENT",
        failureReason: "",
        createdAt: "",
        message: "",
      },
      isLoading: false,
      isError: false,
      refetch: mocks.detailsRefetch,
    });
    mocks.useAdminNotificationMutations.mockReturnValue({
      retryMutation: {
        isPending: true,
        mutate: mocks.retryMutate.mockImplementation((_id, options) => options?.onError?.(new Error("retry boom"))),
      },
      sendMutation: {
        isPending: false,
        mutate: mocks.sendMutate.mockImplementation((_payload, options) => options?.onError?.(new Error("send boom"))),
      },
    });
    mocks.initializeAdminPushNotifications.mockResolvedValueOnce(false);

    render(<NotificationsPage />);

    expect(screen.getAllByText("h-12 w-full")).toHaveLength(2);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enable Browser Push" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "Browser push could not be enabled. Check Firebase config and browser support.",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Send Notification" }));
    fireEvent.change(screen.getAllByRole("textbox")[1]!, { target: { value: "Fallback title" } });
    fireEvent.change(screen.getAllByRole("textbox")[2]!, { target: { value: "Fallback body" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Failed to send notification"));

    fireEvent.click(screen.getByText("Quick View"));
    expect(screen.getByText("Title:")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("Share")[0]!);
    await waitFor(() =>
      expect(mocks.shareContent).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Notification" }),
      ),
    );
  });

  it("renders notifications page detail and list state fallbacks", () => {
    mocks.useAdminNotificationsQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const loadingView = render(<NotificationsPage />);
    expect(screen.getByText("Loading notifications...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.useAdminNotificationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const errorView = render(<NotificationsPage />);
    fireEvent.click(screen.getByText("Failed to fetch notifications"));
    expect(mocks.refetch).toHaveBeenCalled();
    errorView.unmount();

    mocks.useAdminNotificationsQuery.mockReturnValue({
      data: { content: [], totalElements: 0 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    const emptyView = render(<NotificationsPage />);
    expect(screen.getByText("No notifications found")).toBeInTheDocument();
    emptyView.unmount();

    mocks.useAdminNotificationsQuery.mockReturnValue({
      data: {
        content: [
          { id: "note-3", title: "Edge", userType: "ALL", notificationType: "SYSTEM", channelType: "EMAIL", status: "FAILED", createdAt: "2026-07-16T10:00:00Z", message: "Body" },
        ],
        totalElements: 1,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: mocks.refetch,
    });
    mocks.useAdminNotificationDetailsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      refetch: mocks.detailsRefetch,
    });

    render(<NotificationsPage />);
    fireEvent.click(screen.getByText("Quick View"));
    fireEvent.click(screen.getByText("Failed to load details"));
    expect(mocks.detailsRefetch).toHaveBeenCalled();
  });

  it("renders notification details page states", () => {
    const { rerender } = render(<NotificationDetailsPage />);
    expect(screen.getByText("Notification Details")).toBeInTheDocument();
    expect(screen.getByText(/City Target:/)).toBeInTheDocument();

    mocks.useAdminNotificationDetailsQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
      isError: false,
      refetch: mocks.detailsRefetch,
    });
    rerender(<NotificationDetailsPage />);
    expect(screen.getByText("Loading notification...")).toBeInTheDocument();
  });
});
