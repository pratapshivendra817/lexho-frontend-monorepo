import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  fetchActivityLogs: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("@/api/admin", () => ({
  fetchActivityLogs: mocks.fetchActivityLogs,
}));

vi.mock("@/features/activity-logs/components", () => ({
  ActivityFilters: ({
    role,
    setRole,
  }: {
    role: string;
    setRole: (value: string) => void;
  }) => (
    <div>
      <span>role:{role || "all"}</span>
      <button onClick={() => setRole("Finance")}>set-finance</button>
      <button onClick={() => setRole("")}>clear-role</button>
    </div>
  ),
  ActivityTable: ({ data }: { data: Array<{ adminName: string }> }) => (
    <div>table:{data.map((item) => item.adminName).join(",")}</div>
  ),
  ActivityTimeline: ({ data }: { data: Array<{ adminName: string }> }) => (
    <div>timeline:{data.map((item) => item.adminName).join(",")}</div>
  ),
}));

import ActivityLogsPage from "@/features/activity-logs/pages/ActivityLogsPage";

const logs = [
  {
    id: "1",
    adminName: "Shivendra",
    role: "Super Admin",
    action: "Deleted user account",
    module: "User",
    timestamp: "2026-04-21 10:30 AM",
  },
  {
    id: "2",
    adminName: "Neha",
    role: "Finance",
    action: "Processed refund",
    module: "Payment",
    timestamp: "2026-04-20 06:45 PM",
  },
];

describe("ActivityLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchActivityLogs.mockResolvedValue(logs);
    mocks.useQuery.mockReturnValue({
      data: logs,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("renders table view, toggles timeline, and filters by role", async () => {
    const user = userEvent.setup();

    render(<ActivityLogsPage />);

    expect(screen.getByText("Activity Logs")).toBeInTheDocument();
    expect(screen.getByText("table:Shivendra,Neha")).toBeInTheDocument();
    expect(screen.getByText("role:all")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByText("timeline:Shivendra,Neha")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "set-finance" }));
    expect(screen.getByText("timeline:Neha")).toBeInTheDocument();
    expect(screen.getByText("role:Finance")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByText("table:Neha")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "clear-role" }));
    expect(screen.getByText("table:Shivendra,Neha")).toBeInTheDocument();
  });

  it("covers loading, error, retry, and empty states", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingView = render(<ActivityLogsPage />);
    expect(screen.getByText("Loading activity logs...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    const errorView = render(<ActivityLogsPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();

    errorView.unmount();
    mocks.useQuery.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<ActivityLogsPage />);
    expect(screen.getByText("No activity logs found")).toBeInTheDocument();
  });
});
