import React from "react";
import { Share } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockGetNotifications = jest.fn();
const mockMarkRead = jest.fn();
const mockDelete = jest.fn();
const mockNavigate = jest.fn();
const mockRefetch = jest.fn();
let mockQuery: any;
let mockUserId = 12;
let queryOptions: any;

jest.mock("react-native-paper", () => {
  const { Pressable, Text, TextInput } = require("react-native");
  return {
    Button: ({ children, onPress, disabled }: any) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={String(children)}
        disabled={disabled}
        onPress={onPress}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
    Searchbar: ({ placeholder, value, onChangeText }: any) => (
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
      />
    ),
    Text,
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    queryOptions = options;
    return mockQuery;
  },
  useMutation: (options: any) => ({
    mutate: async (value: unknown) => {
      await options.mutationFn(value);
      await options.onSuccess?.();
    },
  }),
}));
jest.mock("../src/api/notificationApi", () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkRead(...args),
  deleteNotification: (...args: unknown[]) => mockDelete(...args),
}));
jest.mock("../src/redux/hooks", () => ({
  useAppSelector: () => mockUserId,
}));

import { NotificationsScreen } from "../src/screens/notifications/NotificationsScreen";

const now = new Date();
const yesterday = new Date(now.getTime() - 86400000);
const earlier = new Date(now.getTime() - 3 * 86400000);

const notifications = [
  {
    id: "booking-1",
    title: "Booking confirmed",
    message: "Professional assigned",
    redirectType: "BOOKING",
    bookingId: "B1",
    read: false,
    createdAt: now.toISOString(),
  },
  {
    notificationId: "payment-1",
    subject: "Payment received",
    body: "Refund processed",
    type: "PAYMENT",
    redirectValue: "B2",
    isRead: "yes",
    created_on: yesterday.toISOString(),
  },
  {
    eventId: "support-1",
    title: "Support ticket",
    description: "Ticket updated",
    data: { redirectType: "SUPPORT" },
    seen: false,
    timestamp: earlier.toISOString(),
  },
  {
    _id: "promo-1",
    title: "Special offer",
    notificationType: "PROMOTION",
    is_seen: "false",
    createdAt: "invalid-date",
  },
];

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 12;
    mockRefetch.mockResolvedValue({ data: notifications });
    mockGetNotifications.mockResolvedValue(notifications);
    mockQuery = {
      data: notifications,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    };
    mockMarkRead.mockResolvedValue({ read: true });
    mockDelete.mockResolvedValue({ deleted: true });
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("configures authenticated loading and renders loading skeleton", async () => {
    mockQuery = { ...mockQuery, data: null, isLoading: true };
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.queryByText("No notifications found")).toBeNull();
    expect(view.queryByText("Booking confirmed")).toBeNull();
    expect(queryOptions.enabled).toBe(true);
    await expect(queryOptions.queryFn()).resolves.toEqual(
      notifications,
    );
    expect(mockGetNotifications).toHaveBeenCalledWith({
      userId: 12,
      page: 0,
      size: 100,
    });
  });

  it("renders empty and invalid API states", async () => {
    mockQuery = { ...mockQuery, data: { invalid: true } };
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.getByText("No notifications found")).toBeTruthy();

    mockUserId = 0;
    await view.rerender(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    expect(queryOptions.enabled).toBe(false);
  });

  it("renders grouped notifications and read/category metadata", async () => {
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.getByText("Today")).toBeTruthy();
    expect(view.getByText("Yesterday")).toBeTruthy();
    expect(view.getByText("Earlier")).toBeTruthy();
    expect(view.getByText("Unread (3)")).toBeTruthy();
    expect(view.getAllByText("BOOKING").length).toBeGreaterThan(0);
    expect(view.getAllByText("PAYMENT").length).toBeGreaterThan(0);
    expect(view.getAllByText("SUPPORT").length).toBeGreaterThan(0);
    expect(view.getByText("INFO")).toBeTruthy();
  });

  it("filters unread, category and header search results", async () => {
    const view = await render(
      <NotificationsScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { notificationSearchOpen: true } }}
      />,
    );
    await fireEvent.press(view.getByText("Unread (3)"));
    expect(view.queryByText("Payment received")).toBeNull();

    await fireEvent.press(view.getAllByText("SUPPORT")[0]);
    expect(view.getByText("Support ticket")).toBeTruthy();
    expect(view.queryByText("Booking confirmed")).toBeNull();

    await fireEvent.changeText(
      view.getByLabelText("Search notifications"),
      "missing",
    );
    expect(view.getByText("No notifications found")).toBeTruthy();

    await view.rerender(
      <NotificationsScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { notificationSearchOpen: false } }}
      />,
    );
    expect(view.queryByLabelText("Search notifications")).toBeNull();
  });

  it("marks all unread notifications and refetches", async () => {
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    await fireEvent.press(view.getByText("Mark All Read"));
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledTimes(3));
    expect(mockMarkRead).toHaveBeenCalledWith("booking-1");
    expect(mockMarkRead).toHaveBeenCalledWith("support-1");
    expect(mockMarkRead).toHaveBeenCalledWith("promo-1");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("opens unread and already-read notifications using target routes", async () => {
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    await fireEvent.press(view.getByText("Booking confirmed"));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("BookingDetail", {
        bookingId: "B1",
      }),
    );
    expect(mockMarkRead).toHaveBeenCalledWith("booking-1");

    mockMarkRead.mockClear();
    await fireEvent.press(view.getByText("Payment received"));
    expect(mockNavigate).toHaveBeenCalledWith("PaymentStatus", {
      bookingId: "B2",
    });
    expect(mockMarkRead).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Support ticket"));
    expect(mockNavigate).toHaveBeenCalledWith("Support", undefined);
    await fireEvent.press(view.getByText("Special offer"));
    expect(mockNavigate).toHaveBeenCalledWith("Coupon", undefined);
  });

  it("continues navigation when mark-read API fails", async () => {
    mockMarkRead.mockRejectedValueOnce(new Error("network"));
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    await fireEvent.press(view.getByText("Booking confirmed"));
    expect(mockNavigate).toHaveBeenCalledWith("BookingDetail", {
      bookingId: "B1",
    });
  });

  it("marks one read, deletes and shares notifications", async () => {
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    await fireEvent.press(view.getAllByText("Mark Read")[0]);
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalled());
    expect(mockRefetch).toHaveBeenCalled();

    await fireEvent.press(view.getAllByText("Delete")[0]);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("booking-1"));

    await fireEvent.press(view.getAllByText("Share")[0]);
    expect(Share.share).toHaveBeenCalledWith({
      title: "Booking confirmed",
      message:
        "Important Notification\nTitle: Booking confirmed\nMessage: Professional assigned",
    });
  });

  it("supports pull-to-refresh", async () => {
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    const sectionList = view.container.queryAll(
      (node: any) => typeof node.props?.onRefresh === "function",
    )[0];
    await sectionList.props.onRefresh();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it.each([
    ["Notifications target", "NOTIFICATIONS", undefined, "Notifications", undefined],
    ["Subscription target", "SUBSCRIPTION_REMINDER", undefined, "Main", { screen: "Bookings" }],
    ["Instant target", "SEARCHING_PARTNER", "B3", "InstantBookingStatus", { bookingId: "B3" }],
    ["Scheduled target", "SCHEDULED_BOOKING", "B4", "ScheduledBookingStatus", { bookingId: "B4" }],
    ["Tracking target", "TRACKING", "B5", "BookingDetail", { bookingId: "B5" }],
    ["Tracking fallback", "TRACKING", undefined, "Main", { screen: "Bookings" }],
    ["Booking fallback", "SERVICE_COMPLETED", undefined, "Main", { screen: "Bookings" }],
    ["Unknown booking", "UNKNOWN", "B6", "BookingDetail", { bookingId: "B6" }],
    ["Unknown fallback", "UNKNOWN", undefined, "Notifications", undefined],
  ])(
    "routes %s notification payloads",
    async (title, redirectType, bookingId, routeName, params) => {
      mockQuery = {
        ...mockQuery,
        data: [{ title, redirectType, bookingId, read: true }],
      };
      const view = await render(
        <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
      );
      await fireEvent.press(view.getByText(title));
      expect(mockNavigate).toHaveBeenCalledWith(routeName, params);
    },
  );

  it("handles missing fields, generated ids, no unread actions, and empty share messages", async () => {
    mockQuery = {
      ...mockQuery,
      data: [{ read: true, createdAt: null }],
    };
    const view = await render(
      <NotificationsScreen navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.getByText("Notification")).toBeTruthy();
    expect(view.getByText("Just now")).toBeTruthy();
    expect(view.getByText("Unread (0)")).toBeTruthy();
    await fireEvent.press(view.getByText("Mark All Read"));
    expect(mockMarkRead).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Mark Read"));
    expect(mockMarkRead).toHaveBeenCalledWith("notification-0");
    await fireEvent.press(view.getByText("Share"));
    expect(Share.share).toHaveBeenCalledWith({
      title: "Notification",
      message: "Important Notification\nTitle: Notification",
    });
  });
});
