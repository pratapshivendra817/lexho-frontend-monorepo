import React from "react";
import { AppState } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import HomeScreen from "../HomeScreen";
import { getDashboardStats, getPartnerHomeBanners, getPartnerScreeningCentre } from "../../../services/partnerService";
import { detectAndSyncCurrentLocation } from "../../../services/locationTrackingService";
import { getShiftState } from "../../../features/shift/shiftStorage";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockPartnerState: any;
let mockOrderState: any;

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
  setPartnerAvailabilityApi: jest.fn(),
}));

jest.mock("../../../features/shift/shiftStorage", () => ({
  getShiftState: jest.fn(),
}));

describe("HomeScreen map and banner branches", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPartnerState = {
      online: true,
      lastKnownLocation: {
        latitude: 28.61,
        longitude: 77.2,
        label: "Dwarka Sector 21",
        boundaryVerifying: false,
        confidence: "LOW",
        provider: "gps",
        accuracy: 12,
        pincode: "110075",
      },
    };
    mockOrderState = { activeOrder: null };
    (getDashboardStats as jest.Mock).mockResolvedValue({ todayEarnings: 200 });
    (getPartnerHomeBanners as jest.Mock).mockResolvedValue([
      { id: "banner-1", title: "Monsoon Offer", subtitle: "Extra jobs", imageUrl: "https://cdn/banner-1.jpg" },
      { id: "banner-2", title: "Weekend Boost", subtitle: "High demand", imageUrl: "https://cdn/banner-2.jpg" },
    ]);
    (getPartnerScreeningCentre as jest.Mock).mockResolvedValue(null);
    (detectAndSyncCurrentLocation as jest.Mock).mockResolvedValue(mockPartnerState.lastKnownLocation);
    (getShiftState as jest.Mock).mockResolvedValue({ shiftStarted: true });
    jest.spyOn(AppState, "addEventListener").mockImplementation((() => ({ remove: jest.fn() })) as any);
    mockDispatch.mockImplementation((action) => action);
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps banner and quick actions working without the live-location card", async () => {
    const view = await render(<HomeScreen />);

    expect(await view.findByTestId("home-banner-scroll")).toBeTruthy();
    expect(view.getByText("Dwarka Sector 21")).toBeTruthy();
    expect(view.queryByText("Monsoon Offer")).toBeNull();
    expect(view.queryByText("Live Location")).toBeNull();
    expect(view.queryByText("Open Maps")).toBeNull();
    await waitFor(() => {
      expect(getPartnerHomeBanners).toHaveBeenCalledWith(5);
    });

    fireEvent(view.getByTestId("home-banner-scroll"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 1000 } },
    });
  });
});
