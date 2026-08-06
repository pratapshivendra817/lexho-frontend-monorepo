import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  getServiceSummary: vi.fn(),
  getTopServices: vi.fn(),
  getServiceAnalytics: vi.fn(),
  fetchMonitoringDashboard: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div>grid</div>,
  Tooltip: () => <div>tooltip</div>,
  XAxis: ({ dataKey }: { dataKey: string }) => <div>{dataKey}</div>,
  YAxis: () => <div>y-axis</div>,
  Legend: () => <div>legend</div>,
  Area: ({ name }: { name: string }) => <div>{name}</div>,
  Bar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("@/components/admin", () => ({
  SegmentedTabs: ({
    items,
    value,
    onChange,
  }: {
    items: Array<{ label: string; value: string }>;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
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
    children: ReactNode;
  }) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  Skeleton: ({ className }: { className: string }) => <div>{className}</div>,
  StatCard: ({ title, value }: { title: string; value: string }) => <div>{`${title}:${value}`}</div>,
  StatusBadge: ({ status }: { status: string }) => <div>{status}</div>,
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  getServiceSummary: mocks.getServiceSummary,
  getTopServices: mocks.getTopServices,
  getServiceAnalytics: mocks.getServiceAnalytics,
}));

vi.mock("@/features/operations/api", () => ({
  fetchMonitoringDashboard: mocks.fetchMonitoringDashboard,
}));

vi.mock("@/features/notifications/pages/NotificationsPage", () => ({
  default: () => <div>notifications-page</div>,
}));

vi.mock("@/features/reviews/pages/ReviewsPage", () => ({
  default: () => <div>reviews-page</div>,
}));

import DashboardPage from "@/features/dashboard/pages/DashboardPage";

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

const mockDashboardQueries = (states: {
  summary: QueryState;
  topServices: QueryState;
  analytics: QueryState;
  monitoring: QueryState;
}) => {
  mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
    const key = options.queryKey.join(":");
    if (key === "dashboard:service-summary") return makeQueryState(states.summary);
    if (key === "dashboard:top-services") return makeQueryState(states.topServices);
    if (key === "dashboard:service-analytics") return makeQueryState(states.analytics);
    return makeQueryState(states.monitoring);
  });
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardQueries({
      summary: {
        data: {
          totalServices: 12,
          activeServices: 8,
          inactiveServices: 4,
          totalBookings: 50,
          totalRevenue: 1000,
        },
      },
      topServices: {
        data: [{ serviceName: "Cleaning", bookings: 20, revenue: 600 }],
      },
      analytics: {
        data: [{ label: "Jan", bookings: 10, revenue: 200 }],
      },
      monitoring: {
        data: {
          health: { system: "UP", api: "UP", redis: "DOWN", database: "UP" },
          metrics: {
            ordersCreated: 10,
            ordersCompleted: 8,
            paymentsSuccess: 7,
            paymentsFailed: 1,
            partnerOnlineCount: 3,
          },
        },
      },
    });
  });

  it("renders dashboard metrics, monitoring, and charts", () => {
    render(<DashboardPage />);

    expect(screen.getByText("System Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Critical system warning")).toBeInTheDocument();
    expect(screen.getByText("One or more monitoring services are down. Please review the health cards below.")).toBeInTheDocument();
    expect(screen.getAllByText("UP")).toHaveLength(3);
    expect(screen.getByText("DOWN")).toBeInTheDocument();
    expect(screen.getByText("Total Services:12")).toBeInTheDocument();
    expect(screen.getByText("Revenue:\u20b91,000")).toBeInTheDocument();
    expect(screen.getByText("Top Services")).toBeInTheDocument();
    expect(screen.getByText("Booking Analytics")).toBeInTheDocument();
    expect(screen.getAllByText("Bookings").length).toBeGreaterThan(0);
  });

  it("renders loading skeletons, retries error states, and shows empty states", async () => {
    const user = userEvent.setup();
    const monitoringRefetch = vi.fn();
    const summaryRefetch = vi.fn();
    const topServicesRefetch = vi.fn();
    const analyticsRefetch = vi.fn();

    mockDashboardQueries({
      summary: { data: undefined, isLoading: true, refetch: summaryRefetch },
      topServices: { data: undefined, isLoading: true, refetch: topServicesRefetch },
      analytics: { data: undefined, isLoading: true, refetch: analyticsRefetch },
      monitoring: { data: undefined, isLoading: true, refetch: monitoringRefetch },
    });

    const { rerender } = render(<DashboardPage />);
    expect(screen.getByText("Loading system health...")).toBeInTheDocument();
    expect(screen.getAllByText("h-3 w-24")).toHaveLength(5);

    mockDashboardQueries({
      summary: { data: undefined, isError: true, refetch: summaryRefetch },
      topServices: { data: undefined, isError: true, refetch: topServicesRefetch },
      analytics: { data: undefined, isError: true, refetch: analyticsRefetch },
      monitoring: { data: undefined, isError: true, refetch: monitoringRefetch },
    });
    rerender(<DashboardPage />);

    await user.click(screen.getByRole("button", { name: "Failed to load system monitoring" }));
    expect(monitoringRefetch).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Failed to load dashboard" }));
    expect(summaryRefetch).toHaveBeenCalled();
    expect(topServicesRefetch).toHaveBeenCalled();
    expect(analyticsRefetch).toHaveBeenCalled();

    mockDashboardQueries({
      summary: { data: { totalServices: 0, activeServices: 0, inactiveServices: 0, totalBookings: 0, totalRevenue: 0 } },
      topServices: { data: [] },
      analytics: { data: [] },
      monitoring: {
        data: {
          health: { system: "UP", api: "UP", redis: "UP", database: "UP" },
          metrics: {
            ordersCreated: 0,
            ordersCompleted: 0,
            paymentsSuccess: 0,
            paymentsFailed: 0,
            partnerOnlineCount: 0,
          },
        },
      },
    });
    rerender(<DashboardPage />);
    expect(screen.getByText("No dashboard data available")).toBeInTheDocument();
    expect(screen.queryByText("Critical system warning")).not.toBeInTheDocument();
  });

  it("shows a warning banner for degraded monitoring states", () => {
    mockDashboardQueries({
      summary: {
        data: {
          totalServices: 12,
          activeServices: 8,
          inactiveServices: 4,
          totalBookings: 50,
          totalRevenue: 1000,
        },
      },
      topServices: {
        data: [{ serviceName: "Cleaning", bookings: 20, revenue: 600 }],
      },
      analytics: {
        data: [{ label: "Jan", bookings: 10, revenue: 200 }],
      },
      monitoring: {
        data: {
          health: { system: "UP", api: "DEGRADED", redis: "UP", database: "UP" },
          metrics: {
            ordersCreated: 10,
            ordersCompleted: 8,
            paymentsSuccess: 7,
            paymentsFailed: 1,
            partnerOnlineCount: 3,
          },
        },
      },
    });

    render(<DashboardPage />);

    expect(screen.getByText("System warning detected")).toBeInTheDocument();
    expect(
      screen.getByText("One or more monitoring services are degraded or unknown. Please review the health cards below."),
    ).toBeInTheDocument();
  });

  it("switches to notifications and reviews modes", async () => {
    const user = userEvent.setup();

    render(<DashboardPage />);

    await user.click(screen.getByRole("button", { name: "Notification Center" }));
    expect(screen.getByText("notifications-page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ratings & Reviews" }));
    expect(screen.getByText("reviews-page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.getByText("System Monitoring")).toBeInTheDocument();
  });
});
