import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    put: mocks.put,
  },
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
    if (isLoading) {
      return <div>{loadingText}</div>;
    }
    if (isError) {
      return (
        <div>
          <span>{errorText}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    }
    return <div>{children}</div>;
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

import SettingsPage from "@/features/settings/pages/SettingsPage";
import * as settingsPages from "@/features/settings/pages";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractApiError.mockReturnValue("Unable to update settings");
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => ({
      isPending: false,
      mutate: async (payload: unknown) => {
        try {
          const result = await mutationFn(payload);
          onSuccess?.(result);
        } catch (error) {
          onError?.(error);
        }
      },
    }));
    mocks.get.mockResolvedValue({ data: {} });
    mocks.put.mockResolvedValue({ data: { ok: true } });
  });

  it("renders loading and error states with retry support", async () => {
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

    const { rerender } = render(<SettingsPage />);
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();

    rerender(<SettingsPage />);
    expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("re-exports SettingsPage and merges fetched settings with defaults inside the query function", async () => {
    let capturedQueryFn: (() => Promise<unknown>) | undefined;

    mocks.useQuery.mockImplementation((options) => {
      capturedQueryFn = options.queryFn;
      return {
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };
    });
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          serviceRadiusKm: 22,
          mapDefaultCity: "Jaipur",
        },
      },
    });

    render(<settingsPages.SettingsPage />);

    expect(settingsPages.SettingsPage).toBe(SettingsPage);
    await expect(capturedQueryFn?.()).resolves.toEqual({
      serviceRadiusKm: 22,
      dispatchRetryCount: 3,
      dispatchTimeoutSec: 120,
      mapProvider: "MAPBOX",
      mapDefaultCity: "Jaipur",
      mapDefaultLat: 28.6139,
      mapDefaultLng: 77.209,
    });
  });

  it("renders defaults, loads merged server values, updates inputs, resets, and saves successfully", async () => {
    const user = userEvent.setup();

    mocks.useQuery.mockReturnValue({
      data: {
        serviceRadiusKm: 25,
        dispatchRetryCount: 5,
        dispatchTimeoutSec: 180,
        mapProvider: "GOOGLE",
        mapDefaultCity: "Mumbai",
        mapDefaultLat: 19.076,
        mapDefaultLng: 72.8777,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SettingsPage />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MAPBOX")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Delhi")).toBeInTheDocument();

    const radiusInput = screen.getByLabelText("Service Radius (KM)") as HTMLInputElement;
    const retryInput = screen.getByLabelText("Dispatch Retry Count") as HTMLInputElement;
    const timeoutInput = screen.getByLabelText("Dispatch Timeout (Sec)") as HTMLInputElement;
    const providerSelect = screen.getByLabelText("Provider") as HTMLSelectElement;
    const cityInput = screen.getByLabelText("Default City") as HTMLInputElement;
    const latInput = screen.getByLabelText("Default Latitude") as HTMLInputElement;
    const lngInput = screen.getByLabelText("Default Longitude") as HTMLInputElement;

    await user.clear(radiusInput);
    await user.type(radiusInput, "12");
    await user.clear(retryInput);
    await user.type(retryInput, "7");
    await user.clear(timeoutInput);
    await user.type(timeoutInput, "45");
    await user.selectOptions(providerSelect, "OSM");
    await user.clear(cityInput);
    await user.type(cityInput, "Pune");
    await user.clear(latInput);
    await user.type(latInput, "18.52");
    await user.clear(lngInput);
    await user.type(lngInput, "73.85");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(radiusInput.value).toBe("25");
    expect(retryInput.value).toBe("5");
    expect(timeoutInput.value).toBe("180");
    expect(providerSelect.value).toBe("GOOGLE");
    expect(cityInput.value).toBe("Mumbai");
    expect(latInput.value).toBe("19.076");
    expect(lngInput.value).toBe("72.8777");

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(mocks.put).toHaveBeenCalledWith("/api/admin/settings", {
        serviceRadiusKm: 25,
        dispatchRetryCount: 5,
        dispatchTimeoutSec: 180,
        mapProvider: "GOOGLE",
        mapDefaultCity: "Mumbai",
        mapDefaultLat: 19.076,
        mapDefaultLng: 72.8777,
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Settings updated");
  });

  it("converts invalid numeric edits to zero and surfaces save errors", async () => {
    const user = userEvent.setup();
    mocks.useMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutate: () => onError?.({ response: { status: 500 } }),
    }));

    render(<SettingsPage />);

    const radiusInput = screen.getByLabelText("Service Radius (KM)") as HTMLInputElement;
    const retryInput = screen.getByLabelText("Dispatch Retry Count") as HTMLInputElement;
    const timeoutInput = screen.getByLabelText("Dispatch Timeout (Sec)") as HTMLInputElement;
    const latInput = screen.getByLabelText("Default Latitude") as HTMLInputElement;
    const lngInput = screen.getByLabelText("Default Longitude") as HTMLInputElement;

    await user.clear(radiusInput);
    await user.type(radiusInput, "abc");
    await user.clear(retryInput);
    await user.type(retryInput, "abc");
    await user.clear(timeoutInput);
    await user.type(timeoutInput, "abc");
    await user.clear(latInput);
    await user.type(latInput, "abc");
    await user.clear(lngInput);
    await user.type(lngInput, "abc");

    expect(radiusInput.value).toBe("0");
    expect(retryInput.value).toBe("0");
    expect(timeoutInput.value).toBe("0");
    expect(latInput.value).toBe("0");
    expect(lngInput.value).toBe("0");

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(mocks.extractApiError).toHaveBeenCalledWith({ response: { status: 500 } }, "Unable to update settings");
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to update settings");
  });

  it("shows the pending save label and disabled state", () => {
    mocks.useMutation.mockReturnValue({
      isPending: true,
      mutate: vi.fn(),
    });

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
