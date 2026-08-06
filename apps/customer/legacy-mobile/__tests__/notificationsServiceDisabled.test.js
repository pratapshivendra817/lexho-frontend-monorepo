jest.mock("../src/utils/constants", () => ({
  ENABLE_FIREBASE_PUSH: false,
}));

describe("notificationsService with push disabled", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("skips initialization and listener registration", async () => {
    const service = require("../src/services/notificationsService");
    await expect(service.initializePushNotifications()).resolves.toBe(false);
    const cleanup = await service.setupPushNotificationListeners({
      onForegroundMessage: jest.fn(),
      onNotificationOpened: jest.fn(),
    });
    expect(cleanup()).toBeUndefined();
  });
});
