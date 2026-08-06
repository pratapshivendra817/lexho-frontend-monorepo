describe("locationPermissionManager", () => {
  const loadModule = (
    platform: "ios" | "android",
    foregroundResult: string,
    backgroundResult: string,
    authResult: string,
  ) => {
    jest.resetModules();

    const requestAuthorization = jest.fn().mockResolvedValue(authResult);
    const requestForegroundLocationStep = jest.fn().mockResolvedValue(foregroundResult);
    const requestBackgroundLocationStep = jest.fn().mockResolvedValue(backgroundResult);

    jest.doMock("react-native", () => ({
      Platform: { OS: platform },
      PermissionsAndroid: {},
    }));
    jest.doMock("react-native-geolocation-service", () => ({
      requestAuthorization,
    }));
    jest.doMock("./backgroundLocationCompliance", () => ({
      requestForegroundLocationStep,
      requestBackgroundLocationStep,
    }));

    const mod = require("./locationPermissionManager");
    return { mod, requestAuthorization, requestForegroundLocationStep, requestBackgroundLocationStep };
  };

  describe("requestForegroundLocationPermission", () => {
    it("returns true on ios when whenInUse is granted", async () => {
      const { mod, requestAuthorization } = loadModule("ios", "denied", "denied", "granted");

      await expect(mod.requestForegroundLocationPermission()).resolves.toBe(true);
      expect(requestAuthorization).toHaveBeenCalledWith("whenInUse");
    });

    it("returns false on android when the foreground step is denied", async () => {
      const { mod, requestForegroundLocationStep } = loadModule("android", "denied", "granted", "granted");

      await expect(mod.requestForegroundLocationPermission()).resolves.toBe(false);
      expect(requestForegroundLocationStep).toHaveBeenCalled();
    });
  });

  describe("requestBackgroundLocationPermission", () => {
    it("returns true on ios when always authorization is granted", async () => {
      const { mod, requestAuthorization } = loadModule("ios", "granted", "granted", "granted");

      await expect(mod.requestBackgroundLocationPermission()).resolves.toBe(true);
      expect(requestAuthorization).toHaveBeenCalledWith("always");
    });

    it("returns false on android when the background step is blocked", async () => {
      const { mod } = loadModule("android", "granted", "blocked", "granted");

      await expect(mod.requestBackgroundLocationPermission()).resolves.toBe(false);
    });
  });

  describe("ensureLocationPermissions", () => {
    it("returns false when foreground permission is denied", async () => {
      const { mod, requestBackgroundLocationStep } = loadModule("android", "denied", "granted", "granted");

      await expect(mod.ensureLocationPermissions()).resolves.toBe(false);
      expect(requestBackgroundLocationStep).not.toHaveBeenCalled();
    });

    it("returns true when foreground is granted even if background is denied", async () => {
      const { mod, requestBackgroundLocationStep } = loadModule("android", "granted", "denied", "granted");

      await expect(mod.ensureLocationPermissions()).resolves.toBe(true);
      expect(requestBackgroundLocationStep).toHaveBeenCalled();
    });
  });
});
