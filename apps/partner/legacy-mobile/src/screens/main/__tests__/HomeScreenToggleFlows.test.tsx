import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, AppState, Linking, Platform } from "react-native";

import HomeScreen from "../HomeScreen";
import { setLastKnownLocation, setOnlineStatus, setPartnerStats } from "../../../redux/slices/partnerSlice";
import { setWalletSnapshot } from "../../../redux/slices/walletSlice";
import { getDashboardStats, getPartnerHomeBanners } from "../../../services/partnerService";
import { detectAndSyncCurrentLocation } from "../../../services/locationTrackingService";
import { setPartnerAvailabilityApi } from "../../../features/shift/shiftApi";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockPartnerState: any;
let appStateListener: ((next: string) => void) | null = null;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ partner: mockPartnerState }),
}));

jest.mock("../../../redux/slices/partnerSlice", () => ({
  setLastKnownLocation: jest.fn((payload) => ({ type: "partner/setLastKnownLocation", payload })),
  setOnlineStatus: jest.fn((payload) => ({ type: "partner/setOnlineStatus", payload })),
  setPartnerStats: jest.fn((payload) => ({ type: "partner/setPartnerStats", payload })),
}));

jest.mock("../../../redux/slices/walletSlice", () => ({
  setWalletSnapshot: jest.fn((payload) => ({ type: "wallet/setWalletSnapshot", payload })),
}));

jest.mock("../../../services/partnerService", () => ({
  getDashboardStats: jest.fn(),
  getPartnerHomeBanners: jest.fn(),
}));

jest.mock("../../../services/locationTrackingService", () => ({
  detectAndSyncCurrentLocation: jest.fn(),
}));

jest.mock("../../../features/shift/shiftApi", () => ({
  setPartnerAvailabilityApi: jest.fn(),
}));

describe("HomeScreen toggle flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;
    mockPartnerState = { online: false, lastKnownLocation: null };
    (getDashboardStats as jest.Mock).mockResolvedValue({ todayEarnings: 120 });
    (getPartnerHomeBanners as jest.Mock).mockResolvedValue([]);
    (detectAndSyncCurrentLocation as jest.Mock).mockResolvedValue({
      latitude: 28.61,
      longitude: 77.2,
      label: "Dwarka",
      boundaryVerifying: false,
      confidence: "HIGH",
    });
    (setPartnerAvailabilityApi as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    (Linking as any).sendIntent = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Linking, "openSettings").mockResolvedValue();
    jest.spyOn(Linking, "openURL").mockResolvedValue();
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_type: any, listener: any) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    }) as any);
    mockDispatch.mockImplementation((action) => action);
  });

  afterEach(() => {
    cleanup();
  });

  it("refreshes the online location state and handles offline toggle failures", async () => {
    mockPartnerState = { online: true, lastKnownLocation: null };
    (detectAndSyncCurrentLocation as jest.Mock)
      .mockRejectedValueOnce(new Error("gps weak"))
      .mockRejectedValueOnce(new Error("gps weak again"));
    (setPartnerAvailabilityApi as jest.Mock)
      .mockRejectedValueOnce(new Error("offline failed"))
      .mockResolvedValueOnce(undefined);

    const view = await render(<HomeScreen />);
    const tree = view.toJSON() as any;

    await act(async () => {
      await tree.children[0].props.refreshControl.props.onRefresh();
    });

    expect(view.queryByText("Location unavailable. Enable GPS and retry.")).toBeNull();
    expect(getDashboardStats).toHaveBeenCalledTimes(2);
    expect(setPartnerStats).toHaveBeenCalled();
    expect(setWalletSnapshot).toHaveBeenCalled();

    fireEvent.press(view.getByText("ONLINE"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Unable to go offline", "Please try again.");
    });

    fireEvent.press(view.getByText("ONLINE"));
    await waitFor(() => {
      expect(setPartnerAvailabilityApi).toHaveBeenLastCalledWith(false);
    });
    expect(setOnlineStatus).toHaveBeenCalledWith(false);
  });

  it("opens GPS settings, falls back to device settings, and auto-retries online activation", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    (detectAndSyncCurrentLocation as jest.Mock)
      .mockRejectedValueOnce(new Error("gps off"))
      .mockResolvedValueOnce({
        latitude: 28.61,
        longitude: 77.2,
        label: "Dwarka",
        boundaryVerifying: false,
        confidence: "HIGH",
      });
    ((Linking as any).sendIntent as jest.Mock).mockRejectedValueOnce(new Error("intent failed"));

    const view = await render(<HomeScreen />);
    fireEvent.press(await view.findByText("OFFLINE"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Enable GPS",
        "Please enable device location to go online.",
        expect.any(Array),
      );
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => {
      buttons[1].onPress();
    });

    await waitFor(() => {
      expect((Linking as any).sendIntent).toHaveBeenCalledWith("android.settings.LOCATION_SOURCE_SETTINGS");
    });
    await waitFor(() => {
      expect(Linking.openSettings).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(AppState.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });

    await act(async () => {
      appStateListener?.("active");
    });

    await waitFor(() => {
      expect(setPartnerAvailabilityApi).toHaveBeenCalledWith(true);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("Shift");
    });
    expect(setLastKnownLocation).toHaveBeenCalled();
    expect((setOnlineStatus as jest.Mock).mock.calls.some(([value]) => value === true)).toBe(true);
  });

  it("keeps the partner offline when availability activation fails", async () => {
    (setPartnerAvailabilityApi as jest.Mock).mockRejectedValueOnce(new Error("server down"));

    const view = await render(<HomeScreen />);
    await act(async () => {
      fireEvent.press(await view.findByText("OFFLINE"));
    });

    await waitFor(() => {
      expect(setPartnerAvailabilityApi).toHaveBeenCalledWith(true);
    });
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Unable to go online", "server down");
    });
    expect(setOnlineStatus).toHaveBeenCalledWith(false);
  });
});
