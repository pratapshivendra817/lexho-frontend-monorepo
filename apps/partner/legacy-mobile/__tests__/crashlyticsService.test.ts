import {
  applyCrashContext,
  initializeCrashlytics,
  logApiFailure,
  recordCrash,
} from "../src/services/crashlyticsService";

jest.mock("../src/utils/storage", () => ({
  getPartnerProviderId: jest.fn(async () => "partner-42"),
}));

describe("crashlyticsService", () => {
  it("initializes crashlytics without throwing", async () => {
    await expect(initializeCrashlytics()).resolves.toBe(true);
  });

  it("accepts crash recording helpers", async () => {
    await expect(applyCrashContext()).resolves.toBeUndefined();
    await expect(recordCrash(new Error("boom"))).resolves.toBeUndefined();
    await expect(logApiFailure(new Error("api down"), { method: "GET", url: "/orders", status: 500 })).resolves.toBeUndefined();
  });
});
