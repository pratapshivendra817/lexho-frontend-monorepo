import React from "react";
import { Alert, AppState, Linking } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

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

function findNodeByTestId(node: any, testID: string): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findNodeByTestId(child, testID);
      if (match) return match;
    }
    return null;
  }
  if (node.props?.testID === testID) return node;
  return findNodeByTestId(node.children, testID);
}

function findNodeByText(node: any, value: string): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findNodeByText(child, value);
      if (match) return match;
    }
    return null;
  }
  if (node.children?.includes?.(value)) return node;
  return findNodeByText(node.children, value);
}

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

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;
    mockPartnerState = { online: false, lastKnownLocation: null };
    mockOrderState = { activeOrder: null };
    (getDashboardStats as jest.Mock).mockResolvedValue({ todayEarnings: 120 });
    (getPartnerHomeBanners as jest.Mock).mockResolvedValue([]);
    (getPartnerScreeningCentre as jest.Mock).mockResolvedValue({
      name: "Lexho Screening Centre",
      address: "Gt-53, Noida Sector-117",
      latitude: 28.5123456,
      longitude: 77.6123456,
    });
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

  it("renders fallback content and navigates through quick actions", async () => {
    const view = await render(<HomeScreen />);

    expect(await view.findByText("Latest Offers From Admin")).toBeTruthy();
    expect(view.getByText("Active banners will appear here automatically")).toBeTruthy();
    expect(view.getByText("OFFLINE")).toBeTruthy();
    expect(view.getByText("Visit Centre")).toBeTruthy();
    expect(view.getByText("Lexho Screening Centre")).toBeTruthy();
    expect(view.getByText("Gt-53, Noida Sector-117")).toBeTruthy();

    fireEvent.press(view.getByText("Order"));
    fireEvent.press(view.getByText("Order History"));
    fireEvent.press(view.getByText("Earnings"));
    fireEvent.press(view.getByText("Shift Management"));

    expect(mockNavigate).toHaveBeenCalledWith("Orders");
    expect(mockNavigate).toHaveBeenCalledWith("History");
    expect(mockNavigate).toHaveBeenCalledWith("Earnings");
    expect(mockNavigate).toHaveBeenCalledWith("Shift");
    expect(setPartnerStats).toHaveBeenCalled();
    expect(setWalletSnapshot).toHaveBeenCalled();
  });

  it("keeps active job visible while offline", async () => {
    mockOrderState = {
      activeOrder: {
        id: 71,
        orderId: 71,
        customerName: "Asha",
        address: "Dwarka",
        status: "ACCEPTED",
      },
    };

    const view = await render(<HomeScreen />);

    expect(await view.findByText("Active Job")).toBeTruthy();
    expect(view.getByText("Asha")).toBeTruthy();
    fireEvent.press(view.getByTestId("home-active-job-card"));
    expect(mockNavigate).toHaveBeenCalledWith("ActiveJob", {
      orderId: 71,
      customerLatitude: undefined,
      customerLongitude: undefined,
    });
  });
});
