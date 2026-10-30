import React from "react";
import { Share } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import NotificationsScreen from "../NotificationsScreen";
import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { useFocusEffect } from "@react-navigation/native";
import { fetchNotifications, fetchUnreadNotificationCount, markNotificationRead, markWarningNotificationRead } from "../../../services/notificationsService";
import { markNotificationReadLocal, setNotifications } from "../../../redux/slices/notificationSlice";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({ t: (key: string) => ({ "common.something_went_wrong": "Sync failed", "common.loading": "Syncing...", "common.done": "Synced", "notifications.unread": "Unread", "common.retry": "Retry API", "notifications.empty": "No notifications", "notifications.last_sync": "Last", "common.id": "ID", "common.title": "Title", "common.time": "Time", "notifications.share_title": "Partner Notification", "notifications.title_fallback": "Notification", "support.message": "Message", "notifications.share_accessibility": "Share notification" }[key] ?? key) }),
}));

jest.mock("../../../services/notificationsService", () => ({
  fetchNotifications: jest.fn(),
  fetchUnreadNotificationCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markWarningNotificationRead: jest.fn(),
}));

jest.mock("../../../redux/slices/notificationSlice", () => ({
  markNotificationReadLocal: jest.fn((id) => ({ type: "notifications/markNotificationReadLocal", payload: id })),
  setNotifications: jest.fn((rows) => ({ type: "notifications/setNotifications", payload: rows })),
}));

jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);

const mockDispatch = jest.fn();
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>;
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;
const mockUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;
const mockFetchNotifications = fetchNotifications as jest.MockedFunction<typeof fetchNotifications>;
const mockFetchUnreadNotificationCount = fetchUnreadNotificationCount as jest.MockedFunction<typeof fetchUnreadNotificationCount>;
const mockMarkNotificationRead = markNotificationRead as jest.MockedFunction<typeof markNotificationRead>;
const mockMarkWarningNotificationRead = markWarningNotificationRead as jest.MockedFunction<typeof markWarningNotificationRead>;
const mockSetNotifications = setNotifications as jest.MockedFunction<typeof setNotifications>;
const mockMarkNotificationReadLocal = markNotificationReadLocal as jest.MockedFunction<typeof markNotificationReadLocal>;

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppDispatch.mockReturnValue(mockDispatch as any);
    mockUseFocusEffect.mockImplementation((callback: any) => {
      React.useEffect(() => {
        void callback();
      }, []);
    });
  });

  it("renders empty state after successful sync", async () => {
    mockUseAppSelector.mockImplementation((selector: any) => selector({ notifications: { items: [], unreadCount: 0 } }));
    mockFetchNotifications.mockResolvedValueOnce([]);
    mockFetchUnreadNotificationCount.mockResolvedValueOnce(0);

    const view = await render(<NotificationsScreen />);

    expect(await view.findByText("No notifications")).toBeTruthy();
    expect(view.getByText("Synced")).toBeTruthy();
    expect(mockSetNotifications).toHaveBeenCalledWith([]);
  });

  it("renders rows, opens warning notifications, and shares notification", async () => {
    const rows = [{ id: "warning:w1", title: "New Warning Issued", message: "Please review", read: false, createdAt: "2026-06-24", source: "warning", warningId: "w1", redirectType: "WARNING" }];
    mockUseAppSelector.mockImplementation((selector: any) => selector({ notifications: { items: rows, unreadCount: 1 } }));
    mockFetchNotifications.mockResolvedValueOnce(rows as any);
    mockFetchUnreadNotificationCount.mockResolvedValueOnce(2);
    mockMarkNotificationRead.mockResolvedValue(undefined as any);
    mockMarkWarningNotificationRead.mockResolvedValue(undefined as any);

    const view = await render(<NotificationsScreen />);

    expect(await view.findByText("New Warning Issued")).toBeTruthy();
    expect(view.getByText("Unread: 2")).toBeTruthy();
    expect(view.getByText(/^Last:/)).toBeTruthy();

    fireEvent.press(view.getByText("New Warning Issued"));
    await waitFor(() => {
      expect(mockMarkWarningNotificationRead).toHaveBeenCalledWith("w1");
    });
    expect(mockMarkNotificationReadLocal).toHaveBeenCalledWith("warning:w1");

    fireEvent.press(view.getByLabelText("Share notification"));
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({
      title: "New Warning Issued",
      message: expect.stringContaining("ID: warning:w1"),
    }));
  });

  it("shows error state and retries", async () => {
    mockUseAppSelector.mockImplementation((selector: any) => selector({ notifications: { items: [], unreadCount: 0 } }));
    mockFetchNotifications
      .mockRejectedValueOnce(new Error("sync broke"))
      .mockResolvedValueOnce([]);
    mockFetchUnreadNotificationCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const view = await render(<NotificationsScreen />);

    expect(await view.findByText("sync broke")).toBeTruthy();
    expect(view.getByText("Sync failed")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Retry API"));
    });

    await waitFor(() => {
      expect(mockFetchNotifications).toHaveBeenCalledTimes(2);
    });
  });
});
