import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  fetchEmergencyIncidents: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("@/features/emergency-sos/api/emergencySosApi", () => ({
  fetchEmergencyIncidents: mocks.fetchEmergencyIncidents,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: vi.fn(() => "SOS incidents endpoint missing"),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  };
});

import EmergencyIncidentsPage from "@/features/emergency-sos/pages/EmergencyIncidentsPage";

describe("EmergencyIncidentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refetch.mockResolvedValue(undefined);
    mocks.useQuery.mockImplementation(({ queryKey, queryFn }: any) => {
      void queryFn;
      return {
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: mocks.refetch,
        queryKey,
      };
    });
  });

  it("renders loading, error and empty states with retry", async () => {
    const user = userEvent.setup();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });

    const { rerender } = render(<EmergencyIncidentsPage />);
    expect(screen.getByText("Loading emergency incidents...")).toBeInTheDocument();

    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: mocks.refetch,
    });
    rerender(<EmergencyIncidentsPage />);
    expect(screen.getByText("SOS incidents endpoint missing")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);

    mocks.useQuery.mockReturnValueOnce({
      data: { content: [] },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    rerender(<EmergencyIncidentsPage />);
    expect(screen.getByText("No emergency incidents found.")).toBeInTheDocument();
  });

  it("renders incident rows, handles filters, sanitizes partner id and paginates", async () => {
    const user = userEvent.setup();
    const rows = [
      {
        eventId: "evt-1",
        partnerId: 11,
        partnerName: "Ravi",
        status: "TRIGGERED",
        latitude: 28.6123,
        longitude: 77.2294,
        address: "Connaught Place",
        createdAt: "2026-05-01T10:30:00.000Z",
      },
      {
        eventId: "evt-2",
        partnerId: 12,
        status: "ACKNOWLEDGED",
        latitude: 19.076,
        longitude: 72.8777,
        createdAt: "",
      },
      {
        eventId: "evt-3",
        partnerId: undefined,
        partnerName: "",
        status: "RESOLVED",
        latitude: 12.9716,
        longitude: 77.5946,
        createdAt: undefined,
      },
      ...Array.from({ length: 17 }, (_, index) => ({
        eventId: `evt-extra-${index}`,
        partnerId: index + 20,
        partnerName: `Partner ${index}`,
        status: "TRIGGERED",
        latitude: 10 + index,
        longitude: 20 + index,
        createdAt: undefined,
      })),
    ];

    mocks.useQuery.mockImplementation(({ queryKey }: any) => ({
      data: { content: rows },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
      queryKey,
    }));

    render(<EmergencyIncidentsPage />);
    mocks.useQuery.mock.calls[0][0].queryFn();
    expect(mocks.fetchEmergencyIncidents).toHaveBeenCalledWith({ page: 1, limit: 20, status: "", partnerId: "" });

    expect(screen.getByText("Emergency SOS received")).toBeInTheDocument();
    expect(screen.getByText("Admin action required")).toBeInTheDocument();
    expect(screen.getByText("Ravi")).toBeInTheDocument();
    expect(screen.getByText("Partner #12")).toBeInTheDocument();
    expect(screen.getByText("Partner #-")).toBeInTheDocument();
    expect(screen.getByText("Connaught Place")).toBeInTheDocument();
    expect(screen.getByText("19.07600, 72.87770")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Review" })[0]).toHaveAttribute("href", "/emergency-sos/evt-1");
    expect(screen.getAllByText("TRIGGERED").length).toBeGreaterThan(1);
    expect(screen.getAllByText("ACKNOWLEDGED").length).toBeGreaterThan(1);
    expect(screen.getAllByText("RESOLVED").length).toBeGreaterThan(1);
    expect(screen.getByText("Page 1")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Partner ID"), "ab12-3");
    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["emergency-incidents", 1, 20, "", "123"],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["emergency-incidents", 2, 20, "", "123"],
      }),
    );
    mocks.useQuery.mock.calls.at(-1)?.[0].queryFn();
    expect(mocks.fetchEmergencyIncidents).toHaveBeenLastCalledWith({ page: 2, limit: 20, status: "", partnerId: "123" });

    await user.selectOptions(screen.getByRole("combobox"), "RESOLVED");
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(mocks.useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["emergency-incidents", 1, 20, "RESOLVED", "123"],
      }),
    );
    mocks.useQuery.mock.calls.at(-1)?.[0].queryFn();
    expect(mocks.fetchEmergencyIncidents).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: "RESOLVED", partnerId: "123" });

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("disables pagination buttons at boundaries", () => {
    mocks.useQuery.mockReturnValue({
      data: { content: [{ eventId: "evt-1", partnerId: 1, status: "TRIGGERED", latitude: 1, longitude: 2 }] },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    render(<EmergencyIncidentsPage />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
