import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, AppState, Linking, Platform } from "react-native";

import HomeScreen from "../HomeScreen";
import { setLastKnownLocation, setOnlineStatus, setPartnerStats } from "../../../redux/slices/partnerSlice";
import { setWalletSnapshot } from "../../../redux/slices/walletSlice";
import { getDashboardStats, getPartnerHomeBanners, getPartnerScreeningCentre } from "../../../services/partnerService";
import { detectAndSyncCurrentLocation } from "../../../services/locationTrackingService";
import { setPartnerAvailabilityApi } from "../../../features/shift/shiftApi";
import { getShiftState } from "../../../features/shift/shiftStorage";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockPartnerState: any;
let mockOrderState: any;
let appStateListener: ((next: string) => void) | null = null;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ partner: mockPartnerState, orders: mockOrderState }),
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
  getPartnerScreeningCentre: jest.fn(),
}));

jest.mock("../../../services/locationTrackingService", () => ({
  detectAndSyncCurrentLocation: jest.fn(),
}));

jest.mock("../../../features/shift/shiftApi", () => ({
  startShiftApi: jest.fn(async () => ({ success: true })),
  setPartnerAvailabilityApi: jest.fn(),
}));

jest.mock("../../../features/shift/shiftStorage", () => ({
  getShiftState: jest.fn(),
}));

describe("HomeScreen toggle flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;
    mockPartnerState = { online: false, lastKnownLocation: null };
    mockOrderState = { activeOrder: null };
    (getDashboardStats as jest.Mock).mockResolvedValue({ todayEarnings: 120 });
    (getPartnerHomeBanners as jest.Mock).mockResolvedValue([]);
    (getPartnerScreeningCentre as jest.Mock).mockResolvedValue(null);
    (detectAndSyncCurrentLocation as jest.Mock).mockResolvedValue({
      latitude: 28.61,
      longitude: 77.2,
      label: "Dwarka",
      boundaryVerifying: false,
      confidence: "HIGH",
    });
    (setPartnerAvailabilityApi as jest.Mock).mockResolvedValue(undefined);
    (getShiftState as jest.Mock).mockResolvedValue({ shiftStarted: true });
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
      expect(Alert.alert).toHaveBeenCalledWith("Unable to go offline", "Retry");
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
    expect(mockNavigate).not.toHaveBeenCalledWith("Shift");
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

  it("activates availability before GPS upload and rolls back a failed upload", async () => {
    const calls: string[] = [];
    (setPartnerAvailabilityApi as jest.Mock).mockImplementation(async (online) => {
      calls.push(online ? "online" : "offline");
    });
    (detectAndSyncCurrentLocation as jest.Mock).mockImplementation(async () => {
      calls.push("gps");
      throw Object.assign(new Error("GPS upload failed"), { code: "LOCATION_SYNC_FAILED" });
    });
    const view = await render(<HomeScreen />);
    fireEvent.press(await view.findByText("OFFLINE"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Unable to go online", "GPS upload failed"));
    expect(calls).toEqual(["online", "gps", "offline"]);
    expect(setOnlineStatus).not.toHaveBeenCalledWith(true);
  });

  it("ignores repeated taps while an availability request is pending", async () => {
    let finish!: () => void;
    (setPartnerAvailabilityApi as jest.Mock).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = await render(<HomeScreen />);
    const toggle = await view.findByTestId("home-online-toggle");
    fireEvent.press(toggle);
    fireEvent.press(toggle);
    await waitFor(() => expect(setPartnerAvailabilityApi).toHaveBeenCalledTimes(1));
    await act(async () => { finish(); });
    await waitFor(() => expect(setOnlineStatus).toHaveBeenCalledWith(true));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
