import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useBookingDetailsQuery: vi.fn(),
  useBookingMutations: vi.fn(),
  manualMutate: vi.fn(),
  lifecycleMutate: vi.fn(),
  navigate: vi.fn(),
  refetch: vi.fn(),
  shareContent: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  params: { id: "bk-55" },
}));

vi.mock("@/features/bookings/hooks/useBookings", () => ({
  useBookingDetailsQuery: mocks.useBookingDetailsQuery,
  useBookingMutations: mocks.useBookingMutations,
}));

vi.mock("@/utils/share", () => ({
  shareContent: mocks.shareContent,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/features/bookings/components", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <div>{`status:${status}`}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useNavigate: () => mocks.navigate,
    useParams: () => mocks.params,
  };
});

import BookingDetailsPage from "@/features/bookings/pages/BookingDetailsPage";
import { renderWithProviders } from "../utils/renderWithProviders";

describe("BookingDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { href: "https://admin.lexho.test/bookings/bk-55" },
      writable: true,
    });
    mocks.useBookingMutations.mockReturnValue({
      manualDispatchMutation: { mutate: mocks.manualMutate, isPending: false },
      updateLifecycleMutation: { mutate: mocks.lifecycleMutate, isPending: false },
    });
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: {
        id: "bk-55",
        status: "CONFIRMED",
        service: "Cleaning",
        serviceType: "CLEANING",
        bookingDate: "2026-05-01",
        bookingTime: "",
        notes: "",
        customer: { name: "", phone: "", email: "", address: "" },
        partner: { name: "", phone: "", email: "", rating: undefined },
        payment: { amount: 999, method: "", status: "", transactionId: "" },
        timeline: [],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
  });

  it("renders loading, error and empty states", async () => {
    const { rerender } = renderWithProviders(<BookingDetailsPage />);

    mocks.useBookingDetailsQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });
    rerender(<BookingDetailsPage />);
    expect(screen.getByText("Loading booking details...")).toBeInTheDocument();

    mocks.useBookingDetailsQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    rerender(<BookingDetailsPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalled();

    mocks.useBookingDetailsQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    rerender(<BookingDetailsPage />);
    expect(screen.getByText("Booking not found")).toBeInTheDocument();
  });

  it("renders booking details and handles booking actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookingDetailsPage />);

    expect(screen.getByText("Booking Details")).toBeInTheDocument();
    expect(screen.getByText("Address not available")).toBeInTheDocument();
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
    expect(screen.getByText("Timeline not available")).toBeInTheDocument();
    expect(screen.getByText("No notes available.")).toBeInTheDocument();
    expect(screen.getByText("status:CONFIRMED")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Manual dispatch" }));
    expect(mocks.manualMutate).toHaveBeenCalledWith(
      "bk-55",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const dispatchOptions = mocks.manualMutate.mock.calls[0][1];
    dispatchOptions.onSuccess();
    dispatchOptions.onError(new Error("dispatch failed"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Manual dispatch triggered");
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to dispatch order: dispatch failed");

    await user.selectOptions(screen.getByDisplayValue("PARTNER_SEARCH"), "SERVICE_COMPLETED");
    await user.click(screen.getByRole("button", { name: "Update lifecycle" }));
    expect(mocks.lifecycleMutate).toHaveBeenCalledWith(
      { orderId: "bk-55", lifecycle: "SERVICE_COMPLETED" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    const lifecycleOptions = mocks.lifecycleMutate.mock.calls[0][1];
    lifecycleOptions.onSuccess();
    lifecycleOptions.onError(new Error("lifecycle failed"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Lifecycle updated");
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to update lifecycle: lifecycle failed");

    await user.click(screen.getByRole("button", { name: /Edit booking/i }));
    expect(mocks.navigate).toHaveBeenCalledWith("/bookings/edit/bk-55");

    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(mocks.shareContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Booking #bk-55",
        url: "https://admin.lexho.test/bookings/bk-55",
        successMessage: "Booking summary copied",
      }),
    );
  });

  it("does not render action controls when route id is missing", async () => {
    mocks.params = { id: undefined as unknown as string };
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: {
        id: "fallback-id",
        status: "PENDING",
        service: "Cook",
        serviceType: "COOK",
        bookingDate: "2026-05-01",
        bookingTime: "10:00",
        notes: "hello",
        customer: { name: "Aman" },
        partner: { name: "Ravi" },
        payment: { amount: 100 },
        timeline: [{ label: "Created", at: "", actor: "", notes: "" }],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    renderWithProviders(<BookingDetailsPage />);
    expect(screen.queryByRole("button", { name: "Manual dispatch" })).not.toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("skips share when booking is missing and renders rating plus timeline actor details", async () => {
    const user = userEvent.setup();
    mocks.params = { id: "bk-77" };
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    const { rerender } = renderWithProviders(<BookingDetailsPage />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(mocks.shareContent).not.toHaveBeenCalled();

    mocks.useBookingDetailsQuery.mockReturnValue({
      data: {
        id: "bk-77",
        status: "COMPLETED",
        service: "Cook",
        serviceType: "COOK",
        bookingDate: "2026-05-03",
        bookingTime: "12:00",
        notes: "packed up",
        customer: { name: "Anu", phone: "999", email: "a@test.com", address: "Street 1" },
        partner: { name: "Rohit", phone: "888", email: "r@test.com", rating: 4.5 },
        payment: { amount: 250, method: "Cash", status: "PAID", transactionId: "txn-1" },
        timeline: [{ label: "Completed", at: "", actor: "Admin", notes: "done" }],
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    rerender(<BookingDetailsPage />);
    expect(screen.getByText("Rating: 4.5")).toBeInTheDocument();
    expect(screen.getByText("Time N/A • Admin")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
  });
});
