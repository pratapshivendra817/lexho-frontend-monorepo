import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useParams: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  fetchEmergencyIncident: vi.fn(),
  acknowledgeEmergencyIncident: vi.fn(),
  resolveEmergencyIncident: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  acknowledgeMutate: vi.fn(),
  resolveMutate: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/features/emergency-sos/api/emergencySosApi", () => ({
  fetchEmergencyIncident: mocks.fetchEmergencyIncident,
  acknowledgeEmergencyIncident: mocks.acknowledgeEmergencyIncident,
  resolveEmergencyIncident: mocks.resolveEmergencyIncident,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: vi.fn((error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
    useParams: mocks.useParams,
  };
});

import EmergencyIncidentDetailsPage from "@/features/emergency-sos/pages/EmergencyIncidentDetailsPage";

describe("EmergencyIncidentDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useParams.mockReturnValue({ eventId: "evt-1" });
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.useQuery.mockReturnValue({
      data: {
        eventId: "evt-1",
        partnerId: 77,
        partnerName: "Meena",
        partnerPhone: "9999999999",
        status: "TRIGGERED",
        latitude: 28.61,
        longitude: 77.2,
        accuracyMeters: 35,
        address: "Delhi",
        message: "Need help",
        createdAt: "2026-05-01T08:00:00.000Z",
        requestId: "req-1",
        correlationId: "corr-1",
      },
      isLoading: false,
      queryKey: ["emergency-incident", "evt-1"],
    });
    mocks.useMutation.mockImplementation((config: { mutationFn: () => unknown }) =>
      String(config.mutationFn).includes("acknowledgeEmergencyIncident")
        ? { mutate: mocks.acknowledgeMutate, isPending: false }
        : { mutate: mocks.resolveMutate, isPending: false },
    );
  });

  it("renders loading, error and missing incident states", () => {
    mocks.useQuery.mockReturnValueOnce({ data: undefined, isLoading: true });
    const { rerender } = render(<EmergencyIncidentDetailsPage />);
    expect(screen.getByText("Loading incident...")).toBeInTheDocument();

    mocks.useMutation.mockReset();
    mocks.useMutation.mockImplementation((config: { mutationFn: () => unknown }) =>
      String(config.mutationFn).includes("acknowledgeEmergencyIncident")
        ? { mutate: mocks.acknowledgeMutate, isPending: false }
        : { mutate: mocks.resolveMutate, isPending: false },
    );
    mocks.useQuery.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, error: new Error("endpoint not found") });
    rerender(<EmergencyIncidentDetailsPage />);
    expect(screen.getByText("endpoint not found")).toBeInTheDocument();

    mocks.useMutation.mockReset();
    mocks.useMutation.mockImplementation((config: { mutationFn: () => unknown }) =>
      String(config.mutationFn).includes("acknowledgeEmergencyIncident")
        ? { mutate: mocks.acknowledgeMutate, isPending: false }
        : { mutate: mocks.resolveMutate, isPending: false },
    );
    mocks.useQuery.mockReturnValueOnce({ data: undefined, isLoading: false, isError: false });
    rerender(<EmergencyIncidentDetailsPage />);
    expect(screen.getByText("Emergency incident not found.")).toBeInTheDocument();
  });

  it("renders incident details, fallback values and disables actions when note is blank", () => {
    mocks.useQuery.mockReturnValueOnce({
      data: {
        eventId: "evt-2",
        partnerId: undefined,
        partnerName: "",
        partnerPhone: undefined,
        status: "ACKNOWLEDGED",
        latitude: 12.34,
        longitude: 56.78,
        accuracyMeters: null,
        address: "",
        message: "",
        createdAt: undefined,
        acknowledgementNote: "Ops saw this",
        resolutionNote: "Closed manually",
      },
      isLoading: false,
    });
    mocks.useMutation.mockReset();
    mocks.useMutation.mockImplementation((config: { mutationFn: () => unknown }) =>
      String(config.mutationFn).includes("acknowledgeEmergencyIncident")
        ? { mutate: mocks.acknowledgeMutate, isPending: true }
        : { mutate: mocks.resolveMutate, isPending: false },
    );

    render(<EmergencyIncidentDetailsPage />);
    expect(screen.getByRole("link", { name: "Back to incidents" })).toHaveAttribute("href", "/emergency-sos");
    expect(screen.getByText("Partner #-")).toBeInTheDocument();
    expect(screen.getByText("No message provided")).toBeInTheDocument();
    expect(screen.getByText("Not provided")).toBeInTheDocument();
    expect(screen.getByText("12.34, 56.78")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getByText("Ops saw this")).toBeInTheDocument();
    expect(screen.getByText("Closed manually")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps?q=12.34,56.78",
    );
    expect(screen.getByRole("button", { name: "Acknowledge Incident" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resolve Incident" })).toBeDisabled();
  });

  it("submits acknowledge and resolve actions, clears note and refreshes queries", async () => {
    const user = userEvent.setup();
    render(<EmergencyIncidentDetailsPage />);
    mocks.useQuery.mock.calls[0][0].queryFn();
    expect(mocks.fetchEmergencyIncident).toHaveBeenCalledWith("evt-1");

    const noteField = screen.getByPlaceholderText("Add ops note");
    await user.type(noteField, "Ops team engaged");
    const latestAcknowledgeConfig = [...mocks.useMutation.mock.calls]
      .map(call => call[0])
      .reverse()
      .find((config: { mutationFn: () => unknown }) =>
        String(config.mutationFn).includes("acknowledgeEmergencyIncident"),
      );
    latestAcknowledgeConfig?.mutationFn();
    expect(mocks.acknowledgeEmergencyIncident).toHaveBeenCalledWith("evt-1", "Ops team engaged");

    await user.click(screen.getByRole("button", { name: "Acknowledge Incident" }));
    expect(mocks.acknowledgeMutate).toHaveBeenCalledTimes(1);
    const acknowledgeOptions = mocks.useMutation.mock.calls[0][0];
    await act(async () => {
      await acknowledgeOptions.onSuccess?.();
      acknowledgeOptions.onError?.();
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Incident acknowledged");
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to acknowledge incident");
    await waitFor(() => expect(noteField).toHaveValue(""));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["emergency-incident", "evt-1"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["emergency-incidents"] });

    await user.type(noteField, "Partner confirmed safe");
    const latestResolveConfig = [...mocks.useMutation.mock.calls]
      .map(call => call[0])
      .reverse()
      .find((config: { mutationFn: () => unknown }) =>
        String(config.mutationFn).includes("resolveEmergencyIncident"),
      );
    latestResolveConfig?.mutationFn();
    expect(mocks.resolveEmergencyIncident).toHaveBeenCalledWith("evt-1", "Partner confirmed safe");
    await user.click(screen.getByRole("button", { name: "Resolve Incident" }));
    expect(mocks.resolveMutate).toHaveBeenCalledTimes(1);
    const resolveOptions = mocks.useMutation.mock.calls[1][0];
    await act(async () => {
      await resolveOptions.onSuccess?.();
      resolveOptions.onError?.();
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Incident resolved");
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to resolve incident");
    await waitFor(() => expect(noteField).toHaveValue(""));
  });

  it("passes the event id into the query config and disables fetch when route param is missing", () => {
    mocks.useParams.mockReturnValue({ eventId: undefined });
    mocks.useMutation.mockReset();
    mocks.useMutation.mockImplementation((config: { mutationFn: () => unknown }) =>
      String(config.mutationFn).includes("acknowledgeEmergencyIncident")
        ? { mutate: mocks.acknowledgeMutate, isPending: false }
        : { mutate: mocks.resolveMutate, isPending: false },
    );

    render(<EmergencyIncidentDetailsPage />);
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["emergency-incident", ""],
        enabled: false,
      }),
    );
  });
});
