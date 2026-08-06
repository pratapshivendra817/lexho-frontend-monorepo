import authReducer, { clearAuth, setAuthTokens } from "../src/redux/slices/authSlice";
import locationReducer, { locationActions } from "../src/redux/slices/locationSlice";
import notificationReducer, {
  markAllRead,
  markNotificationReadLocal,
  setNotifications,
  upsertNotification,
} from "../src/redux/slices/notificationSlice";
import orderReducer, {
  appendOrderHistory,
  setActiveOrder,
  setHistoryPagination,
  setNewOrders,
  setOrderHistory,
  setOrderLoading,
} from "../src/redux/slices/orderSlice";
import partnerReducer, {
  setLastKnownLocation,
  setOnlineStatus,
  setPartnerLoading,
  setPartnerProfile,
  setPartnerStats,
} from "../src/redux/slices/partnerSlice";

describe("partner redux slices", () => {
  it("handles auth token lifecycle", () => {
    const authed = authReducer(undefined, setAuthTokens({ token: "access", refreshToken: "refresh" }));
    expect(authed).toEqual({
      token: "access",
      refreshToken: "refresh",
      isAuthenticated: true,
    });

    const withoutRefresh = authReducer(undefined, setAuthTokens({ token: "access" }));
    expect(withoutRefresh.refreshToken).toBeNull();

    expect(authReducer(authed, clearAuth())).toEqual({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("updates location permission and failure flags", () => {
    let state = locationReducer(undefined, locationActions.setForegroundPermissionGranted(true));
    state = locationReducer(state, locationActions.setBackgroundPermissionGranted(true));
    state = locationReducer(state, locationActions.setEducationalPromptSeen(true));
    state = locationReducer(state, locationActions.setLocationFailure("gps weak"));

    expect(state).toEqual({
      foregroundPermissionGranted: true,
      backgroundPermissionGranted: true,
      educationalPromptSeen: true,
      lastFailure: "gps weak",
    });
  });

  it("updates order lists, loading, active order, and pagination", () => {
    const baseOrder = { id: 1, status: "PENDING" } as any;
    const historyOrder = { id: 2, status: "COMPLETED" } as any;

    let state = orderReducer(undefined, setNewOrders([baseOrder]));
    state = orderReducer(state, setOrderHistory([historyOrder]));
    state = orderReducer(state, appendOrderHistory([{ id: 3, status: "REJECTED" } as any]));
    state = orderReducer(state, setActiveOrder(baseOrder));
    state = orderReducer(state, setOrderLoading(true));
    state = orderReducer(state, setHistoryPagination({ page: 3, hasMore: false }));

    expect(state.newOrders).toEqual([baseOrder]);
    expect(state.history).toEqual([historyOrder, { id: 3, status: "REJECTED" }]);
    expect(state.activeOrder).toEqual(baseOrder);
    expect(state.loading).toBe(true);
    expect(state.page).toBe(3);
    expect(state.hasMore).toBe(false);
  });

  it("updates partner profile, stats, online state, loading, and last location", () => {
    const profile = { id: "partner-1", fullName: "Asha" } as any;
    const stats = { todayEarnings: 400, pendingOrders: 2 } as any;
    const location = {
      latitude: 28.6,
      longitude: 77.2,
      accuracy: 14,
      timestamp: 123456,
      label: "Sector 42, Gurugram",
      pincode: "122002",
      provider: "backend",
      confidence: "HIGH" as const,
      boundaryVerifying: false,
      trustedAt: 123500,
    };

    let state = partnerReducer(undefined, setPartnerProfile(profile));
    state = partnerReducer(state, setPartnerStats(stats));
    state = partnerReducer(state, setOnlineStatus(true));
    state = partnerReducer(state, setPartnerLoading(true));
    state = partnerReducer(state, setLastKnownLocation(location));

    expect(state.profile).toEqual(profile);
    expect(state.stats).toEqual(stats);
    expect(state.online).toBe(true);
    expect(state.loading).toBe(true);
    expect(state.lastKnownLocation).toEqual(location);
  });

  it("tracks unread notification counts across set, upsert, and mark-all-read flows", () => {
    const first = { id: "1", read: false, title: "A", message: "alpha" } as any;
    const second = { id: "2", read: true, title: "B", message: "beta" } as any;

    let state = notificationReducer(undefined, setNotifications([first, second]));
    expect(state.unreadCount).toBe(1);

    state = notificationReducer(
      state,
      upsertNotification({ id: "1", read: true, title: "A+", message: "updated" } as any),
    );
    expect(state.items[0]).toEqual({ id: "1", read: true, title: "A+", message: "updated" });
    expect(state.unreadCount).toBe(0);

    state = notificationReducer(
      state,
      upsertNotification({ id: "3", read: false, title: "Newest", message: "gamma" } as any),
    );
    expect(state.items[0].id).toBe("3");
    expect(state.unreadCount).toBe(1);

    state = notificationReducer(state, markNotificationReadLocal("3"));
    expect(state.items[0].read).toBe(true);
    expect(state.unreadCount).toBe(0);

    state = notificationReducer(state, markAllRead());
    expect(state.items.every((item) => item.read)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });
});
