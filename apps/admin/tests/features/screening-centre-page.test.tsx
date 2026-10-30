import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
  getAdminScreeningCentre: vi.fn(),
  updateAdminScreeningCentre: vi.fn(),
  updateAdminScreeningCentreStatus: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/components/admin", () => ({
  DataState: ({
    isLoading,
    isError,
    loadingText,
    errorText,
    onRetry,
    children,
  }: {
    isLoading: boolean;
    isError: boolean;
    loadingText: string;
    errorText: string;
    onRetry: () => void;
    children: React.ReactNode;
  }) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) {
      return (
        <div>
          <span>{errorText}</span>
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      );
    }
    return <div>{children}</div>;
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/features/screening-centre/api/screeningCentreApi", () => ({
  getAdminScreeningCentre: mocks.getAdminScreeningCentre,
  updateAdminScreeningCentre: mocks.updateAdminScreeningCentre,
  updateAdminScreeningCentreStatus: mocks.updateAdminScreeningCentreStatus,
}));

import ScreeningCentrePage from "@/features/screening-centre/pages/ScreeningCentrePage";

const stableCentre = {
  name: "Lexho Screening Centre",
  address: "Gt-53, Noida Sector-117",
  latitude: 28.5123456,
  longitude: 77.6123456,
  phone: "+919876543210",
  mapProvider: "google" as const,
  placeId: "place-1",
  landmark: "Gate Number 03",
  entranceInfo: "Near Automotive Ace Garage",
  active: true,
  updatedAt: "2026-08-16T10:00:00.000Z",
};

describe("ScreeningCentrePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractApiError.mockReturnValue("Unable to update screening centre");
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useQuery.mockReturnValue({
      data: stableCentre,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => ({
      isPending: false,
      mutate: async (payload: unknown) => {
        try {
          const result = await mutationFn(payload);
          await onSuccess?.(result, payload);
        } catch (error) {
          onError?.(error);
        }
      },
    }));
    mocks.updateAdminScreeningCentre.mockResolvedValue(stableCentre);
    mocks.updateAdminScreeningCentreStatus.mockImplementation(async (active: boolean) => ({
      ...stableCentre,
      active,
    }));
  });

  it("renders screening centre data, saves updates, and toggles active status", async () => {
    const user = userEvent.setup();
    render(<ScreeningCentrePage />);

    expect(screen.getByText("Partner Screening Centre")).toBeInTheDocument();
    const nameInput = screen.getByLabelText("Centre Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Lexho Screening Centre");

    await user.clear(nameInput);
    await user.type(nameInput, "Lexho Visit Centre");
    await user.click(screen.getByRole("button", { name: "Save Centre" }));

    await waitFor(() => {
      expect(mocks.updateAdminScreeningCentre).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Lexho Visit Centre" }),
      );
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Screening centre updated");

    await user.click(screen.getByRole("button", { name: "Deactivate Centre" }));
    await waitFor(() => {
      expect(mocks.updateAdminScreeningCentreStatus).toHaveBeenCalledWith(false);
    });
  });

  it("shows validation and error/retry states", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useQuery
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch,
      })
      .mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch,
      });

    const { rerender } = render(<ScreeningCentrePage />);
    expect(screen.getByText("Loading screening centre...")).toBeInTheDocument();

    rerender(<ScreeningCentrePage />);
    expect(screen.getByText("Failed to load screening centre")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();

    mocks.useQuery.mockReturnValue({
      data: stableCentre,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    rerender(<ScreeningCentrePage />);

    const latitudeInput = screen.getByLabelText("Latitude") as HTMLInputElement;
    await user.clear(latitudeInput);
    await user.type(latitudeInput, "99");
    await user.click(screen.getByRole("button", { name: "Save Centre" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Latitude must be between -90 and 90");
  });
});
