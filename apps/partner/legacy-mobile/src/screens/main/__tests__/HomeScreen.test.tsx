import React from "react";
import { Alert, AppState, Linking } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

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

describe("HomeScreen", () => {
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

  it("renders fallback content and navigates through quick actions", async () => {
    const view = await render(<HomeScreen />);

    expect(await view.findByText("Latest Offers From Admin")).toBeTruthy();
    expect(view.getByText("Active banners will appear here automatically")).toBeTruthy();
    expect(view.getByText("OFFLINE")).toBeTruthy();

    fireEvent.press(view.getByText("Orders"));
    fireEvent.press(view.getByText("History"));
    fireEvent.press(view.getByText("Earnings"));
    fireEvent.press(view.getByText("Shift"));

    expect(mockNavigate).toHaveBeenCalledWith("Orders");
    expect(mockNavigate).toHaveBeenCalledWith("History");
    expect(mockNavigate).toHaveBeenCalledWith("Earnings");
    expect(mockNavigate).toHaveBeenCalledWith("Shift");
    expect(setPartnerStats).toHaveBeenCalled();
    expect(setWalletSnapshot).toHaveBeenCalled();
  });

  it("goes online after successful location detection and rechecks when app resumes", async () => {
    const view = await render(<HomeScreen />);
    const onlineToggle = await view.findByText("OFFLINE");

    fireEvent.press(onlineToggle);

    await waitFor(() => {
      expect(setPartnerAvailabilityApi).toHaveBeenCalledWith(true);
    });
    expect(setOnlineStatus).toHaveBeenCalledWith(true);
    expect(setLastKnownLocation).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("Shift");

    mockPartnerState = {
      ...mockPartnerState,
      online: true,
      lastKnownLocation: {
        latitude: 28.61,
        longitude: 77.2,
        boundaryVerifying: false,
        confidence: "HIGH",
        label: "Dwarka",
      },
    };
    await act(async () => {
      appStateListener?.("active");
    });

    await waitFor(() => {
      expect(detectAndSyncCurrentLocation).toHaveBeenCalled();
    });
  });
});
