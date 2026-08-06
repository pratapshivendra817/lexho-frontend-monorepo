describe("partnerActionQueueService", () => {
  const enqueueOfflineAction = jest.fn();
  const registerOfflineHandler = jest.fn();
  const acceptDispatchRequest = jest.fn();
  const rejectDispatchRequest = jest.fn();
  const sendDispatchLocation = jest.fn();
  const updatePartnerProfile = jest.fn();
  const getCurrentNetworkStatus = jest.fn();

  const loadService = async () => {
    jest.resetModules();
    jest.doMock("./offlineQueue", () => ({
      enqueueOfflineAction,
      registerOfflineHandler,
    }));
    jest.doMock("./partnerService", () => ({
      acceptDispatchRequest,
      rejectDispatchRequest,
      sendDispatchLocation,
      updatePartnerProfile,
    }));
    jest.doMock("./networkService", () => ({
      getCurrentNetworkStatus,
    }));
    return require("./partnerActionQueueService");
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers all offline handlers on import and routes payloads correctly", async () => {
    await loadService();

    expect(registerOfflineHandler).toHaveBeenCalledTimes(4);
    const handlerMap = new Map(registerOfflineHandler.mock.calls.map(([type, handler]) => [type, handler]));

    await handlerMap.get("accept_order")?.({ requestId: "41" });
    expect(acceptDispatchRequest).toHaveBeenCalledWith(41);

    await handlerMap.get("reject_order")?.({ requestId: "55", reason: undefined });
    expect(rejectDispatchRequest).toHaveBeenCalledWith(55, "Not available");

    const locationPayload = { latitude: 1, longitude: 2 };
    await handlerMap.get("update_location")?.(locationPayload);
    expect(sendDispatchLocation).toHaveBeenCalledWith(locationPayload);

    const profilePayload = { name: "Partner" };
    await handlerMap.get("update_profile")?.(profilePayload);
    expect(updatePartnerProfile).toHaveBeenCalledWith(profilePayload);
  });

  it("enqueues accept, reject, profile, and location actions", async () => {
    enqueueOfflineAction.mockResolvedValue(3);
    const service = await loadService();

    await expect(service.enqueueAcceptOrder(10)).resolves.toBe(3);
    await expect(service.enqueueRejectOrder(11, "Busy")).resolves.toBe(3);
    await expect(service.enqueueProfileUpdate({ city: "Noida" })).resolves.toBe(3);
    await expect(service.enqueueLocationUpdate({ latitude: 10 })).resolves.toBe(3);

    expect(enqueueOfflineAction).toHaveBeenNthCalledWith(1, "accept_order", { requestId: 10 });
    expect(enqueueOfflineAction).toHaveBeenNthCalledWith(2, "reject_order", {
      requestId: 11,
      reason: "Busy",
    });
    expect(enqueueOfflineAction).toHaveBeenNthCalledWith(3, "update_profile", { city: "Noida" });
    expect(enqueueOfflineAction).toHaveBeenNthCalledWith(4, "update_location", { latitude: 10 });
  });

  it("reports whether an online action can be attempted", async () => {
    getCurrentNetworkStatus.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const service = await loadService();

    expect(service.canAttemptOnlineAction()).toBe(true);
    expect(service.canAttemptOnlineAction()).toBe(false);
  });
});
