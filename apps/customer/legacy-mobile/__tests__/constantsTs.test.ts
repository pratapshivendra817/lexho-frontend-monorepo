const constants = require("../src/utils/constants.ts") as typeof import("../src/utils/constants");
import { API_BASE_URL } from "../src/constants/env";

describe("utils/constants.ts", () => {
  it("exposes storage and environment constants", () => {
    expect(constants.API_BASE_URL).toBe(API_BASE_URL);
    expect(constants.ENABLE_FIREBASE_PUSH).toBe(true);
    expect(constants.STORAGE_KEYS).toEqual({
      authToken: "@customer/auth-token",
      user: "@customer/user",
      themeMode: "@customer/theme-mode",
      cart: "@customer/cart",
    });
  });

  it("exposes static and parameterized query keys", () => {
    expect(constants.QUERY_KEYS.home).toEqual(["home"]);
    expect(constants.QUERY_KEYS.services("cleaning")).toEqual([
      "services",
      "cleaning",
    ]);
    expect(constants.QUERY_KEYS.order("booking-1")).toEqual([
      "orders",
      "booking-1",
    ]);
    expect(constants.QUERY_KEYS.notifications(2, 25)).toEqual([
      "notifications",
      2,
      25,
    ]);
    expect(constants.QUERY_KEYS.notificationUnreadCount).toEqual([
      "notifications",
      "unread-count",
    ]);
  });
});
