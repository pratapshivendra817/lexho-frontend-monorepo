describe("backgroundLocationCompliance", () => {
  const loadModule = (platform: "ios" | "android", version: number | string, requestResult: string, authResult: string) => {
    jest.resetModules();

    const request = jest.fn().mockResolvedValue(requestResult);
    const requestAuthorization = jest.fn().mockResolvedValue(authResult);

    jest.doMock("react-native", () => ({
      Platform: { OS: platform, Version: version },
      PermissionsAndroid: {
        PERMISSIONS: {
          ACCESS_FINE_LOCATION: "fine",
          ACCESS_BACKGROUND_LOCATION: "background",
        },
        RESULTS: {
          GRANTED: "granted",
          NEVER_ASK_AGAIN: "never_ask_again",
          DENIED: "denied",
        },
        request,
      },
    }));

    jest.doMock("react-native-geolocation-service", () => ({
      requestAuthorization,
    }));

    const mod = require("./backgroundLocationCompliance");
    return { mod, request, requestAuthorization };
  };

  describe("requestForegroundLocationStep", () => {
    it("returns granted on ios when geolocation grants access", async () => {
      const { mod, requestAuthorization } = loadModule("ios", "17", "granted", "granted");

      await expect(mod.requestForegroundLocationStep()).resolves.toBe("granted");
      expect(requestAuthorization).toHaveBeenCalledWith("whenInUse");
    });

    it("returns denied on ios when geolocation does not grant access", async () => {
      const { mod } = loadModule("ios", "17", "granted", "denied");

      await expect(mod.requestForegroundLocationStep()).resolves.toBe("denied");
    });

    it("returns blocked on android for never ask again", async () => {
      const { mod, request } = loadModule("android", 34, "never_ask_again", "granted");

      await expect(mod.requestForegroundLocationStep()).resolves.toBe("blocked");
      expect(request).toHaveBeenCalledWith("fine");
    });

    it("returns denied on android when permission is denied", async () => {
      const { mod } = loadModule("android", 34, "denied", "granted");

      await expect(mod.requestForegroundLocationStep()).resolves.toBe("denied");
    });

    it("returns granted on android when fine location permission is granted", async () => {
      const { mod } = loadModule("android", 34, "granted", "granted");

      await expect(mod.requestForegroundLocationStep()).resolves.toBe("granted");
    });
  });

  describe("requestBackgroundLocationStep", () => {
    it("returns granted on ios when always permission is granted", async () => {
      const { mod, requestAuthorization } = loadModule("ios", "17", "granted", "granted");

      await expect(mod.requestBackgroundLocationStep()).resolves.toBe("granted");
      expect(requestAuthorization).toHaveBeenCalledWith("always");
    });

    it("returns denied on ios when always permission is not granted", async () => {
      const { mod } = loadModule("ios", "17", "granted", "denied");

      await expect(mod.requestBackgroundLocationStep()).resolves.toBe("denied");
    });

    it("returns granted automatically on android versions below 29", async () => {
      const { mod, request } = loadModule("android", 28, "denied", "granted");

      await expect(mod.requestBackgroundLocationStep()).resolves.toBe("granted");
      expect(request).not.toHaveBeenCalled();
    });

    it("returns blocked on android background never ask again", async () => {
      const { mod, request } = loadModule("android", 33, "never_ask_again", "granted");

      await expect(mod.requestBackgroundLocationStep()).resolves.toBe("blocked");
      expect(request).toHaveBeenCalledWith("background");
    });

    it("returns granted on android when background permission is granted", async () => {
      const { mod } = loadModule("android", 33, "granted", "granted");

      await expect(mod.requestBackgroundLocationStep()).resolves.toBe("granted");
    });

    it("returns denied on android when background permission is denied", async () => {
      const { mod } = loadModule("android", 33, "denied", "granted");

      await expect(mod.requestBackgroundLocationStep()).resolves.toBe("denied");
    });
  });
});
