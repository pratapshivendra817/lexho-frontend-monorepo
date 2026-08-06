import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LiveDispatchMonitorPage from "@/features/live-dispatch/pages/LiveDispatchMonitorPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  useBookingsQuery: vi.fn(),
  useBookingMutations: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useEtaSocket: vi.fn(),
  fetchBookingLiveTracking: vi.fn(),
  fetchBookingNavigation: vi.fn(),
  updateBookingPartnerLocation: vi.fn(),
  manualDispatchMutate: vi.fn(),
  updateLifecycleMutate: vi.fn(),
  overrideMutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
  refetchList: vi.fn(),
  refetchTracking: vi.fn(),
  refetchNavigation: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: mocks.useQuery,
    useMutation: mocks.useMutation,
  };
});

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
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/api/admin", () => ({
  fetchBookingLiveTracking: mocks.fetchBookingLiveTracking,
  fetchBookingNavigation: mocks.fetchBookingNavigation,
  updateBookingPartnerLocation: mocks.updateBookingPartnerLocation,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback,
}));

vi.mock("@/features/bookings/hooks/useBookings", () => ({
  useBookingsQuery: mocks.useBookingsQuery,
  useBookingMutations: mocks.useBookingMutations,
}));

vi.mock("@/features/live-dispatch/hooks/useAdminBookingEtaSocket", () => ({
  useAdminBookingEtaSocket: mocks.useEtaSocket,
}));

vi.mock("@/features/live-dispatch/components", () => ({
  BookingRouteMap: ({ routeCoordinates, partnerLocation, customerLocation }: any) => (
    <div data-testid="booking-route-map">
      {JSON.stringify({ routeCoordinates, partnerLocation, customerLocation })}
    </div>
  ),
}));

vi.mock("@/components/admin", () => ({
  DataState: ({ isLoading, isError, isEmpty, loadingText, errorText, emptyText, onRetry, children }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  Pagination: ({ page, total, limit, onPageChange }: any) => (
    <div>
      <span>{`pagination:${page}:${total}:${limit}`}</span>
      <button onClick={() => onPageChange(3)}>go-page-3</button>
    </div>
  ),
}));

function setLiveDispatchQueries(options?: {
  trackingData?: any;
  navigationData?: any;
  trackingError?: boolean;
  navigationError?: boolean;
}) {
  mocks.useQuery.mockImplementation(({ queryKey, queryFn, enabled }: any) => {
    const key = String(queryKey?.[0] ?? "");
    if (key === "admin-booking-live-tracking") {
      return {
        data: options?.trackingData,
        refetch: mocks.refetchTracking,
        isLoading: false,
        isError: options?.trackingError ?? false,
        queryFn,
        enabled,
      };
    }

    return {
      data: options?.navigationData,
      refetch: mocks.refetchNavigation,
      isLoading: false,
      isError: options?.navigationError ?? false,
      queryFn,
      enabled,
    };
  });
}

describe("LiveDispatchMonitorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refetchList.mockResolvedValue(undefined);
    mocks.refetchTracking.mockResolvedValue({ error: null });
    mocks.refetchNavigation.mockResolvedValue({ error: null });
    mocks.useBookingsQuery.mockReturnValue({
      data: {
        content: [
          { id: "bk-completed", customerName: "Skip", service: "Cook", status: "COMPLETED", partnerName: "Done" },
          { id: "bk-1", customerName: "Rahul", service: "Cook", status: "PENDING", partnerName: "Sanjay" },
          { id: "bk-2", customerName: "", service: "", status: "PARTNER_ASSIGNED", partnerName: "" },
        ],
        totalElements: 2,
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetchList,
    });
    mocks.useBookingMutations.mockReturnValue({
      manualDispatchMutation: { mutate: mocks.manualDispatchMutate, isPending: false },
      updateLifecycleMutation: { mutate: mocks.updateLifecycleMutate, isPending: false },
    });
    mocks.useMutation.mockImplementation((config: any) => ({
      mutate: mocks.overrideMutate,
      mutationFn: config.mutationFn,
      onSuccess: config.onSuccess,
      onError: config.onError,
    }));
    setLiveDispatchQueries({
      trackingData: {
        bookingId: "bk-1",
        status: "PARTNER_ASSIGNED",
        paymentStatus: "PAID",
        partnerId: "11",
        partnerLocation: { latitude: 28.6139, longitude: 77.209, updatedAt: "now" },
        events: [
          { id: "1", eventType: "ETA_UPDATED", eventPayload: "{}", createdAt: "now" },
          { id: "2", eventType: "NO_PAYLOAD", eventPayload: "", createdAt: undefined },
        ],
      },
      navigationData: {
        bookingId: "bk-1",
        status: "PARTNER_ACCEPTED",
        etaMinutes: 12,
        distanceMeters: 2200,
        distanceText: "",
        routeCoordinates: [{ latitude: 28.6139, longitude: 77.209 }],
        partnerLocation: { latitude: 28.6, longitude: 77.1 },
        customerLocation: { latitude: 28.6145, longitude: 77.21 },
      },
    });
  });

  it("renders route map and navigation panel for tracking bookings", () => {
    renderWithProviders(<LiveDispatchMonitorPage />);

    expect(screen.getByText(/Live Dispatch Monitor/i)).toBeInTheDocument();
    expect(screen.getByText(/Route & Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigation Panel/i)).toBeInTheDocument();
    expect(screen.getByText("12 min")).toBeInTheDocument();
    expect(screen.getByText("2.2 km")).toBeInTheDocument();
    expect(screen.getByText("28.61390, 77.20900")).toBeInTheDocument();
    expect(screen.getByText("ETA_UPDATED")).toBeInTheDocument();
    expect(screen.getByText("Time unavailable")).toBeInTheDocument();
    expect(screen.queryByText("bk-completed")).not.toBeInTheDocument();
    expect(screen.getByTestId("booking-route-map")).toBeInTheDocument();
    expect(mocks.useBookingsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, search: undefined, size: 10, sortBy: "createdAt", sortDir: "desc" }),
    );
    expect(mocks.useEtaSocket).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk-1", enabled: true, onEtaUpdate: expect.any(Function) }),
    );
  });

  it("handles search, pagination, refreshes, override validation and row actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LiveDispatchMonitorPage />);

    await user.type(screen.getByPlaceholderText("Search booking id / customer / service"), "  Rahul  ");
    expect(screen.getByPlaceholderText("Search booking id / customer / service")).toHaveValue("  Rahul  ");

    await user.click(screen.getByText("go-page-3"));
    expect(screen.getByText("pagination:3:2:10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh Tracking" }));
    expect(mocks.refetchTracking).toHaveBeenCalled();
    expect(mocks.refetchNavigation).toHaveBeenCalled();
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Tracking refreshed"));

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.refetchTracking).toHaveBeenCalledTimes(2);
    expect(mocks.refetchNavigation).toHaveBeenCalledTimes(2);

    await user.type(screen.getByPlaceholderText("Override latitude"), "bad");
    await user.click(screen.getByRole("button", { name: "Override Partner Location" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Booking ID, latitude and longitude are required");
    expect(mocks.overrideMutate).not.toHaveBeenCalled();

    await user.clear(screen.getByPlaceholderText("Booking ID for live tracking"));
    await user.type(screen.getByPlaceholderText("Booking ID for live tracking"), "bk-override");
    await user.clear(screen.getByPlaceholderText("Override latitude"));
    await user.type(screen.getByPlaceholderText("Override latitude"), "28.7");
    await user.type(screen.getByPlaceholderText("Override longitude"), "77.3");
    await user.type(screen.getByPlaceholderText("Pincode (optional)"), "110001");
    await user.click(screen.getByRole("button", { name: "Override Partner Location" }));

    const overrideConfig = mocks.useMutation.mock.calls.at(-1)?.[0];
    overrideConfig.mutationFn({ bookingId: "bk-override", latitude: 28.1, longitude: 77.1, pincode: undefined });
    expect(mocks.updateBookingPartnerLocation).toHaveBeenCalledWith("bk-override", {
      latitude: 28.1,
      longitude: 77.1,
      pincode: undefined,
    });
    await act(async () => {
      await overrideConfig.onSuccess();
      overrideConfig.onError(new Error("oops"));
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Partner location overridden");
    expect(mocks.toastError).toHaveBeenCalledWith("Location override failed: oops");

    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(mocks.navigate).toHaveBeenCalledWith("/bookings/bk-1");

    await user.click(screen.getAllByRole("button", { name: "Track" })[0]);
    expect(screen.getByDisplayValue("bk-1")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Manual Dispatch" })[0]);
    expect(mocks.manualDispatchMutate).toHaveBeenCalledWith(
      "bk-1",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const manualOptions = mocks.manualDispatchMutate.mock.calls[0][1];
    manualOptions.onSuccess();
    manualOptions.onError(new Error("dispatch"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Manual dispatch triggered");
    expect(mocks.toastError).toHaveBeenCalledWith("Manual dispatch failed: dispatch");

    await user.selectOptions(screen.getAllByRole("combobox")[0], "SERVICE_COMPLETED");
    await user.click(screen.getAllByRole("button", { name: "Update" })[0]);
    expect(mocks.updateLifecycleMutate).toHaveBeenCalledWith(
      { orderId: "bk-1", lifecycle: "SERVICE_COMPLETED" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const updateOptions = mocks.updateLifecycleMutate.mock.calls[0][1];
    updateOptions.onSuccess();
    updateOptions.onError(new Error("lifecycle"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Lifecycle updated");
    expect(mocks.toastError).toHaveBeenCalledWith("Lifecycle update failed: lifecycle");

    await act(async () => {
      await mocks.useEtaSocket.mock.calls[0][0].onEtaUpdate();
    });
    expect(mocks.refetchTracking).toHaveBeenCalled();
    expect(mocks.refetchNavigation).toHaveBeenCalled();
  });

  it("renders fallback values when tracking and navigation snapshots are sparse", () => {
    setLiveDispatchQueries({
      trackingData: {
        bookingId: "bk-1",
        status: "PENDING",
        paymentStatus: undefined,
        partnerId: undefined,
        partnerLocation: undefined,
        events: [],
      },
      navigationData: {
        bookingId: "bk-1",
        status: undefined,
        etaMinutes: undefined,
        distanceMeters: undefined,
        distanceText: "Road blocked",
        routeCoordinates: [],
        partnerLocation: { latitude: 20, longitude: 30 },
        customerLocation: undefined,
      },
    });

    renderWithProviders(<LiveDispatchMonitorPage />);
    expect(screen.getByText("Status: PENDING | Payment: N/A | Partner: N/A")).toBeInTheDocument();
    expect(screen.getByText("Road blocked")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    expect(screen.getByText("No tracking events available yet.")).toBeInTheDocument();
    expect(screen.getByTestId("booking-route-map")).toHaveTextContent('"partnerLocation":{"latitude":20,"longitude":30}');
  });

  it("renders queue loading, error and empty states", async () => {
    const user = userEvent.setup();
    mocks.useBookingsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetchList,
    });

    const { rerender } = renderWithProviders(<LiveDispatchMonitorPage />);
    expect(screen.getByText("Loading live dispatch queue...")).toBeInTheDocument();

    mocks.useBookingsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetchList,
    });
    rerender(<LiveDispatchMonitorPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load dispatch queue" }));
    expect(mocks.refetchList).toHaveBeenCalled();

    mocks.useBookingsQuery.mockReturnValue({
      data: { content: [{ id: "done", status: "COMPLETED" }, { id: "cancelled", status: "CANCELLED" }], totalElements: 0 },
      isLoading: false,
      isError: false,
      refetch: mocks.refetchList,
    });
    rerender(<LiveDispatchMonitorPage />);
    expect(screen.getByText("No active dispatch bookings found")).toBeInTheDocument();
  });

  it("does not toast refreshed when one refresh call fails and shows prompt when no tracking snapshot exists", async () => {
    const user = userEvent.setup();
    mocks.refetchTracking.mockResolvedValueOnce({ error: new Error("tracking") });
    setLiveDispatchQueries({
      trackingData: undefined,
      navigationData: undefined,
    });

    renderWithProviders(<LiveDispatchMonitorPage />);
    expect(screen.getByText("Enter booking id and refresh tracking.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh Tracking" }));
    await waitFor(() => expect(mocks.refetchTracking).toHaveBeenCalled());
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith("Tracking refreshed");
  });
});
