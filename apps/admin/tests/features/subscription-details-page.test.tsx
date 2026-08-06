import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClientMock } from "./featureTestUtils";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  useParams: vi.fn(),
  getAdminSubscriptionDetail: vi.fn(),
  getAdminSubscriptionCalendar: vi.fn(),
  getAdminSubscriptionAssignment: vi.fn(),
  updateAdminSubscriptionStatus: vi.fn(),
  updateAdminSubscriptionVisitStatus: vi.fn(),
  assignAdminSubscriptionPartner: vi.fn(),
  replaceAdminSubscriptionPartner: vi.fn(),
  assignAdminSubscriptionVisitPartner: vi.fn(),
  extractApiError: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("react-hot-toast", () => ({
  default: { success: mocks.success, error: mocks.error },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useParams: mocks.useParams,
}));

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
        <div key={row.id} data-testid={`visit-row-${row.id}`}>
          {columns.map((column: any) => (
            <div key={column.key}>{column.render ? column.render(row) : row[column.key]}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/features/subscriptions/api/subscriptionsApi", () => ({
  getAdminSubscriptionDetail: mocks.getAdminSubscriptionDetail,
  getAdminSubscriptionCalendar: mocks.getAdminSubscriptionCalendar,
  getAdminSubscriptionAssignment: mocks.getAdminSubscriptionAssignment,
  updateAdminSubscriptionStatus: mocks.updateAdminSubscriptionStatus,
  updateAdminSubscriptionVisitStatus: mocks.updateAdminSubscriptionVisitStatus,
  assignAdminSubscriptionPartner: mocks.assignAdminSubscriptionPartner,
  replaceAdminSubscriptionPartner: mocks.replaceAdminSubscriptionPartner,
  assignAdminSubscriptionVisitPartner: mocks.assignAdminSubscriptionVisitPartner,
}));

import SubscriptionDetailsPage from "@/features/subscriptions/pages/SubscriptionDetailsPage";

type QueryState = {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

const createQueryState = (overrides: Partial<QueryState> = {}): QueryState => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const createDetail = () => ({
  id: 15,
  customerId: 5,
  customerName: "Neha",
  serviceId: 9,
  serviceName: "Cook",
  status: "ACTIVE",
  frequency: "DAILY",
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  visits: 8,
  durationHours: 2,
  timeSlot: "10:00 - 12:00",
  finalAmount: 3200,
  visitsList: [
    { id: 2, visitDate: "2026-07-21", timeSlot: "12:00 - 14:00", status: "SCHEDULED", partnerId: 51, partnerName: "Karan" },
    { id: 1, visitDate: "2026-07-20", timeSlot: "10:00 - 12:00", status: "COMPLETED", partnerId: 45, partnerName: "Ravi" },
  ],
});

describe("SubscriptionDetailsPage", () => {
  let queryClient: ReturnType<typeof createQueryClientMock>;
  let detailQuery: QueryState;
  let calendarQuery: QueryState;
  let assignmentQuery: QueryState;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClientMock();
    detailQuery = createQueryState();
    calendarQuery = createQueryState();
    assignmentQuery = createQueryState();

    mocks.useParams.mockReturnValue({ id: "15" });
    mocks.useQueryClient.mockReturnValue(queryClient);
    mocks.extractApiError.mockImplementation((error: Error | undefined, fallback: string) => error?.message ?? fallback);
    mocks.useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      switch (queryKey[0]) {
        case "admin-subscription-detail":
          return detailQuery;
        case "admin-subscription-calendar":
          return calendarQuery;
        case "admin-subscription-assignment":
          return assignmentQuery;
        default:
          throw new Error(`Unexpected query key: ${queryKey[0]}`);
      }
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }: any) => ({
      isPending: false,
      mutate: (variables: unknown) => {
        void Promise.resolve()
          .then(() => mutationFn(variables))
          .then((data) => onSuccess?.(data, variables))
          .catch((error) => onError?.(error, variables));
      },
    }));

    mocks.updateAdminSubscriptionStatus.mockResolvedValue({});
    mocks.updateAdminSubscriptionVisitStatus.mockResolvedValue({});
    mocks.assignAdminSubscriptionPartner.mockResolvedValue({});
    mocks.replaceAdminSubscriptionPartner.mockResolvedValue({});
    mocks.assignAdminSubscriptionVisitPartner.mockResolvedValue({});
  });

  const renderPage = () => render(<SubscriptionDetailsPage />);

  it("renders loading, error, empty, and retry states for the detail query", () => {
    detailQuery = createQueryState({ isLoading: true });
    renderPage();
    expect(screen.getByText("Loading subscription...")).toBeInTheDocument();

    detailQuery = createQueryState({ isError: true });
    calendarQuery = createQueryState();
    assignmentQuery = createQueryState();
    const errorView = renderPage();
    fireEvent.click(screen.getByText("Failed to load subscription"));
    expect(detailQuery.refetch).toHaveBeenCalledTimes(1);
    expect(calendarQuery.refetch).toHaveBeenCalledTimes(1);
    expect(assignmentQuery.refetch).toHaveBeenCalledTimes(1);
    errorView.unmount();

    detailQuery = createQueryState({ data: undefined });
    renderPage();
    expect(screen.getByText("Subscription not found")).toBeInTheDocument();
  });

  it("renders the detail, assignment, loading, and fallback visit states", () => {
    detailQuery = createQueryState({ data: createDetail() });
    calendarQuery = createQueryState({ data: [] });
    assignmentQuery = createQueryState({
      data: {
        subscriptionId: 15,
        partnerId: 45,
        partnerName: "Ravi",
        status: "ASSIGNED",
        replacementPartnerId: 52,
        replacementPartnerName: "Karan",
        replacementReason: "Shift coverage",
      },
    });

    renderPage();

    expect(screen.getByText("Subscription #15")).toBeInTheDocument();
    expect(screen.getByText("Neha")).toBeInTheDocument();
    expect(screen.getByText("Cook")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01 to 2026-07-31")).toBeInTheDocument();
    expect(screen.getByText("2 hrs")).toBeInTheDocument();
    expect(screen.getByText("Partner: Ravi")).toBeInTheDocument();
    expect(screen.getByText("Replacement: Karan")).toBeInTheDocument();
    expect(screen.getByText("Reason: Shift coverage")).toBeInTheDocument();

    const firstVisitRow = screen.getByTestId("visit-row-1");
    expect(within(firstVisitRow).getByDisplayValue("COMPLETED")).toBeInTheDocument();
    expect(within(firstVisitRow).getByText("Ravi")).toBeInTheDocument();

    assignmentQuery = createQueryState({ isLoading: true });
    const loadingView = renderPage();
    expect(screen.getByText("Loading assignment...")).toBeInTheDocument();
    loadingView.unmount();

    assignmentQuery = createQueryState({ data: null });
    calendarQuery = createQueryState({ isLoading: true });
    const calendarLoadingView = renderPage();
    expect(screen.getByText("No assignment found")).toBeInTheDocument();
    expect(screen.getByText("Loading visits...")).toBeInTheDocument();
    calendarLoadingView.unmount();

    calendarQuery = createQueryState({ isError: true });
    const calendarErrorView = renderPage();
    expect(screen.getByText("Failed to load visits")).toBeInTheDocument();
    calendarErrorView.unmount();

    calendarQuery = createQueryState({ data: [] });
    detailQuery = createQueryState({ data: { ...createDetail(), visitsList: [] } });
    renderPage();
    expect(screen.getByText("No visits found")).toBeInTheDocument();
  });

  it("submits successful status and partner mutations with sanitized payloads", async () => {
    detailQuery = createQueryState({ data: createDetail() });
    calendarQuery = createQueryState({
      data: [{ id: 9, date: "2026-07-19", timeSlot: "08:00 - 10:00", status: "SCHEDULED", partnerId: 0, partnerName: "" }],
    });
    assignmentQuery = createQueryState({ data: null });

    renderPage();

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "COMPLETED" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Status" }));

    const assignForm = screen.getByText("Assign Subscription Partner").closest("form");
    const assignInputs = within(assignForm as HTMLFormElement).getAllByRole("textbox");
    fireEvent.change(assignInputs[0], { target: { value: "abc12" } });
    fireEvent.change(assignInputs[1], { target: { value: "  Primary coverage  " } });
    fireEvent.submit(assignForm as HTMLFormElement);

    const replaceForm = screen.getByText("Replace Subscription Partner").closest("form");
    const replaceInputs = within(replaceForm as HTMLFormElement).getAllByRole("textbox");
    fireEvent.change(replaceInputs[0], { target: { value: "x25" } });
    fireEvent.change(replaceInputs[1], { target: { value: "  Backup shift  " } });
    fireEvent.submit(replaceForm as HTMLFormElement);

    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "SKIPPED" } });

    const visitRow = screen.getByTestId("visit-row-9");
    fireEvent.change(within(visitRow).getByPlaceholderText("Partner ID"), { target: { value: "partner77" } });
    fireEvent.change(within(visitRow).getByPlaceholderText("Reason"), { target: { value: "  One-off visit  " } });
    fireEvent.submit(within(visitRow).getByRole("button", { name: "Assign" }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mocks.updateAdminSubscriptionStatus).toHaveBeenCalledWith("15", "COMPLETED");
      expect(mocks.assignAdminSubscriptionPartner).toHaveBeenCalledWith("15", { partnerId: 12, reason: "Primary coverage" });
      expect(mocks.replaceAdminSubscriptionPartner).toHaveBeenCalledWith("15", { partnerId: 25, reason: "Backup shift" });
      expect(mocks.updateAdminSubscriptionVisitStatus).toHaveBeenCalledWith("15", 9, "SKIPPED");
      expect(mocks.assignAdminSubscriptionVisitPartner).toHaveBeenCalledWith("15", 9, { partnerId: 77, reason: "One-off visit" });
    });

    await waitFor(() => {
      expect(mocks.success).toHaveBeenCalledWith("Subscription status updated");
      expect(mocks.success).toHaveBeenCalledWith("Partner assigned");
      expect(mocks.success).toHaveBeenCalledWith("Replacement partner assigned");
      expect(mocks.success).toHaveBeenCalledWith("Visit status updated");
      expect(mocks.success).toHaveBeenCalledWith("Visit partner assigned");
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-subscription-detail", "15"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-subscription-calendar", "15"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-subscription-assignment", "15"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-subscriptions"] });
  });

  it("shows validation errors and forwards mutation failures to the shared api error helper", async () => {
    detailQuery = createQueryState({ data: createDetail() });
    calendarQuery = createQueryState({
      data: [{ id: 9, date: "2026-07-19", timeSlot: "08:00 - 10:00", status: "SCHEDULED", partnerId: 0, partnerName: "" }],
    });
    assignmentQuery = createQueryState({ data: null });

    mocks.updateAdminSubscriptionStatus.mockRejectedValueOnce(new Error("status failed"));
    mocks.updateAdminSubscriptionVisitStatus.mockRejectedValueOnce(new Error("visit status failed"));
    mocks.assignAdminSubscriptionPartner.mockRejectedValueOnce(new Error("assign failed"));
    mocks.replaceAdminSubscriptionPartner.mockRejectedValueOnce(new Error("replace failed"));
    mocks.assignAdminSubscriptionVisitPartner.mockRejectedValueOnce(new Error("visit assign failed"));

    renderPage();

    const assignForm = screen.getByText("Assign Subscription Partner").closest("form");
    fireEvent.submit(assignForm as HTMLFormElement);

    const replaceForm = screen.getByText("Replace Subscription Partner").closest("form");
    fireEvent.submit(replaceForm as HTMLFormElement);

    const visitRow = screen.getByTestId("visit-row-9");
    fireEvent.submit(within(visitRow).getByRole("button", { name: "Assign" }).closest("form") as HTMLFormElement);

    expect(mocks.error).toHaveBeenCalledWith("Partner ID is required");
    expect(mocks.error).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: "Update Status" }));
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "CANCELLED" } });

    const assignInputs = within(assignForm as HTMLFormElement).getAllByRole("textbox");
    fireEvent.change(assignInputs[0], { target: { value: "16" } });
    fireEvent.change(assignInputs[1], { target: { value: "Regular assignment" } });
    fireEvent.submit(assignForm as HTMLFormElement);

    const replaceInputs = within(replaceForm as HTMLFormElement).getAllByRole("textbox");
    fireEvent.change(replaceInputs[0], { target: { value: "21" } });
    fireEvent.change(replaceInputs[1], { target: { value: "Replacement assignment" } });
    fireEvent.submit(replaceForm as HTMLFormElement);

    fireEvent.change(within(visitRow).getByPlaceholderText("Partner ID"), { target: { value: "31" } });
    fireEvent.change(within(visitRow).getByPlaceholderText("Reason"), { target: { value: "Visit replacement" } });
    fireEvent.submit(within(visitRow).getByRole("button", { name: "Assign" }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalledWith("status failed");
      expect(mocks.error).toHaveBeenCalledWith("visit status failed");
      expect(mocks.error).toHaveBeenCalledWith("assign failed");
      expect(mocks.error).toHaveBeenCalledWith("replace failed");
      expect(mocks.error).toHaveBeenCalledWith("visit assign failed");
    });
  });
});
