class MockFormData {
  entries: Array<[string, any]> = [];

  append(key: string, value: any) {
    this.entries.push([key, value]);
  }
}

function getLegacyAccountStatusKey() {
  return String.fromCharCode(112, 101, 110, 97, 108, 116, 121, 83, 116, 97, 116, 117, 115);
}

function loadPartnerService() {
  jest.resetModules();

  const mockAPI = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  };
  const mockGetReadableApiError = jest.fn((_error: unknown, fallback: string) => fallback);
  const mockWithRetry = jest.fn(async (task: () => Promise<any>) => task());
  const mockSavePartnerProviderId = jest.fn(async () => undefined);
  const mockCacheOrderDetails = jest.fn(async () => undefined);
  const mockCacheOrderList = jest.fn(async () => undefined);
  const mockGetCachedOrderDetails = jest.fn(async () => null);
  const mockGetCachedOrderList = jest.fn(async () => null);

  jest.doMock("axios", () => ({
    __esModule: true,
    isAxiosError: (error: any) => Boolean(error?.isAxiosError),
  }));
  jest.doMock("../src/services/api", () => ({
    __esModule: true,
    default: mockAPI,
    getReadableApiError: mockGetReadableApiError,
  }));
  jest.doMock("../src/utils/retry", () => ({
    __esModule: true,
    withRetry: mockWithRetry,
  }));
  jest.doMock("../src/utils/storage", () => ({
    __esModule: true,
    savePartnerProviderId: mockSavePartnerProviderId,
  }));
  jest.doMock("../src/services/orderCacheService", () => ({
    __esModule: true,
    cacheOrderDetails: mockCacheOrderDetails,
    cacheOrderList: mockCacheOrderList,
    getCachedOrderDetails: mockGetCachedOrderDetails,
    getCachedOrderList: mockGetCachedOrderList,
  }));

  const mod = require("../src/services/partnerService");
  return {
    mod,
    mockAPI,
    mockGetReadableApiError,
    mockWithRetry,
    mockSavePartnerProviderId,
    mockCacheOrderDetails,
    mockCacheOrderList,
    mockGetCachedOrderDetails,
    mockGetCachedOrderList,
  };
}

describe("partnerService core flows", () => {
  const originalFormData = global.FormData;

  beforeAll(() => {
    (global as any).FormData = MockFormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  it("covers health, profile, onboarding, and dashboard flows", async () => {
    const { mod, mockAPI, mockSavePartnerProviderId } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.getHealth()).resolves.toEqual({ ok: true });

    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 42,
          fullName: "Priya",
          phone: "9999999999",
          imageUrl: "https://cdn.example.com/profile.jpg",
          bankStatus: "PENDING",
        },
      },
    });
    await expect(mod.getPartnerProfile()).resolves.toEqual(
      expect.objectContaining({
        id: "42",
        fullName: "Priya",
        mobile: "9999999999",
        profileImageUrl: "https://cdn.example.com/profile.jpg",
        bankVerificationStatus: "PENDING",
      }),
    );
    expect(mockSavePartnerProviderId).toHaveBeenCalledWith("42");

    mockAPI.post.mockResolvedValueOnce({ data: { data: { providerId: 77 } } });
    await expect(
      mod.submitPartnerOnboarding({
        fullName: "A",
        email: "a@test.com",
        phoneNumber: "999",
        gender: "OTHER",
        dateOfBirth: "2000-01-01",
        currentCity: "Delhi",
        currentState: "Delhi",
        currentFullAddress: "Address",
        serviceAreas: ["110001"],
        accountNumber: "1234",
        ifscCode: "IFSC0001",
      }),
    ).resolves.toEqual({ data: { providerId: 77 } });
    expect(mockSavePartnerProviderId).toHaveBeenCalledWith("77");

    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          todayEarning: "120",
          completedOrders: "3",
          newOrders: 2,
          canceledOrders: 1,
          onlineHoursToday: 4,
          ongoingDeliveries: 1,
          thisWeekEarnings: 700,
        },
      },
    });
    await expect(mod.getDashboardStats()).resolves.toEqual({
      todayEarnings: 120,
      totalCompletedOrders: 3,
      pendingOrders: 2,
      cancelledOrders: 1,
      totalOnlineHours: 4,
      activeDeliveries: 1,
      weeklyEarnings: 700,
    });
  });

  it("covers multipart uploads and availability/profile fallbacks", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.put
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { ok: true } });
    await expect(
      mod.updatePartnerProfile({
        fullName: "Partner",
        phone: "1",
        email: "e",
        city: "c",
        pincode: "p",
        address: "a",
      }),
    ).resolves.toEqual({ ok: true });

    mockAPI.put
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { online: true } });
    await expect(mod.updateAvailability({ online: true })).resolves.toEqual({ online: true });

    mockAPI.post.mockResolvedValueOnce({ data: { imageUrl: "profile.jpg" } });
    await expect(mod.uploadPartnerProfileImage({ uri: "file://profile.jpg" })).resolves.toEqual({
      imageUrl: "profile.jpg",
      profileImageUrl: "profile.jpg",
    });
    expect(mockAPI.post.mock.calls[0][1].entries).toEqual([
      ["file", { uri: "file://profile.jpg", type: "image/jpeg", name: "profile.jpg" }],
    ]);

    const progress = jest.fn();
    mockAPI.post.mockImplementationOnce(async (_url: string, _data: any, config: any) => {
      config.onUploadProgress({ loaded: 5, total: 10 });
      return { data: { uploaded: true } };
    });
    await expect(
      mod.uploadPartnerDocuments(
        {
          aadhaar: { uri: "a" },
          pan: { uri: "p" },
          selfie: { uri: "s" },
          certificate: { uri: "c" },
        },
        progress,
      ),
    ).resolves.toEqual({ uploaded: true });
    expect(progress).toHaveBeenNthCalledWith(1, 50);
    expect(progress).toHaveBeenNthCalledWith(2, 100);
  });

  it("covers profile, upload, onboarding, availability, and dashboard error paths", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 profile failed"))
      .mockRejectedValueOnce(new Error("legacy profile failed"));
    await expect(mod.getPartnerProfile()).rejects.toThrow("Unable to fetch profile");

    mockAPI.put
      .mockRejectedValueOnce(new Error("v1 update failed"))
      .mockRejectedValueOnce(new Error("legacy update failed"));
    await expect(
      mod.updatePartnerProfile({
        fullName: "Partner",
        phone: "1",
        email: "e",
        city: "c",
        pincode: "p",
        address: "a",
      }),
    ).rejects.toThrow("Unable to update profile");

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 image failed"))
      .mockRejectedValueOnce(new Error("legacy image failed"));
    await expect(mod.uploadPartnerProfileImage({ uri: "file://broken.jpg" })).rejects.toThrow(
      "Unable to upload profile image",
    );

    mockAPI.post.mockRejectedValueOnce(new Error("documents failed"));
    await expect(
      mod.uploadPartnerDocuments({
        aadhaar: { uri: "a" },
        pan: { uri: "p" },
        selfie: { uri: "s" },
      }),
    ).rejects.toThrow("Unable to upload documents");

    mockAPI.post.mockRejectedValueOnce(new Error("onboarding failed"));
    await expect(
      mod.submitPartnerOnboarding({
        fullName: "A",
        email: "a@test.com",
        phoneNumber: "999",
        gender: "OTHER",
        dateOfBirth: "2000-01-01",
        currentCity: "Delhi",
        currentState: "Delhi",
        currentFullAddress: "Address",
        serviceAreas: ["110001"],
        accountNumber: "1234",
        ifscCode: "IFSC0001",
      }),
    ).rejects.toThrow("Unable to submit onboarding details");

    mockAPI.put
      .mockRejectedValueOnce(new Error("v1 availability failed"))
      .mockRejectedValueOnce(new Error("legacy availability failed"));
    await expect(mod.updateAvailability({ online: true })).rejects.toThrow("Unable to update availability");

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 stats failed"))
      .mockRejectedValueOnce(new Error("legacy stats failed"));
    await expect(mod.getDashboardStats()).rejects.toThrow("Unable to fetch dashboard stats");
  });

  it("covers direct v1 success paths for profile update, availability, shifts, and dispatch location", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.put.mockResolvedValueOnce({ data: { saved: true } });
    await expect(
      mod.updatePartnerProfile({
        fullName: "Partner",
        phone: "1",
        email: "e",
        city: "c",
        pincode: "p",
        address: "a",
      }),
    ).resolves.toEqual({ saved: true });

    mockAPI.put.mockResolvedValueOnce({ data: { online: false } });
    await expect(mod.updateAvailability({ online: false })).resolves.toEqual({ online: false });

    mockAPI.post.mockResolvedValueOnce({ data: { started: true } });
    await expect(mod.startDispatchShift()).resolves.toEqual({ started: true });

    mockAPI.post.mockResolvedValueOnce({ data: { ended: true } });
    await expect(mod.endDispatchShift()).resolves.toEqual({ ended: true });

    mockAPI.patch.mockResolvedValueOnce({ data: { patched: true } });
    await expect(mod.patchDispatchAvailability({ available: true })).resolves.toEqual({ patched: true });

    mockAPI.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(
      mod.sendDispatchLocation({
        latitude: 28.61,
        longitude: 77.2,
        source: "network",
        accuracyMeters: 9,
        gpsEnabled: false,
      }),
    ).resolves.toEqual({ ok: true });
    expect(mockAPI.post).toHaveBeenLastCalledWith(
      "/api/v1/partner/dispatch/location",
      expect.objectContaining({
        source: "network",
        accuracyMeters: 9,
        gpsEnabled: false,
      }),
    );
  });

  it("covers legacy success paths for profile, dashboard stats, and profile-image upload", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { data: { id: 9, name: "Legacy", mobile: "111", avatarUrl: "legacy-avatar.jpg", bankReason: "bad" } } });
    await expect(mod.getPartnerProfile()).resolves.toEqual(
      expect.objectContaining({
        id: "9",
        name: "Legacy",
        phone: "111",
        profileImageUrl: "legacy-avatar.jpg",
        bankRejectionReason: "bad",
      }),
    );

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { data: { earningsToday: "11", completedOrders: "2", cancelled: 1, onlineHoursToday: 3 } } });
    await expect(mod.getDashboardStats()).resolves.toEqual({
      todayEarnings: 11,
      totalCompletedOrders: 2,
      pendingOrders: 0,
      cancelledOrders: 1,
      totalOnlineHours: 3,
      activeDeliveries: 0,
      weeklyEarnings: 0,
    });

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { imageUrl: "legacy.jpg" } });
    await expect(
      mod.uploadPartnerProfileImage({ uri: "file://legacy.jpg", type: "image/png", name: "legacy.png" }),
    ).resolves.toEqual({ imageUrl: "legacy.jpg", profileImageUrl: "legacy.jpg" });
    expect(mockAPI.post).toHaveBeenLastCalledWith(
      "/api/partner/profile-image",
      expect.objectContaining({
        entries: [["file", { uri: "file://legacy.jpg", type: "image/png", name: "legacy.png" }]],
      }),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  });

  it("covers new-order endpoint fallback, fetch meta, and cache fallback", async () => {
    const { mod, mockAPI, mockCacheOrderList, mockGetCachedOrderList } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            orders: [
              {
                id: "15",
                customerName: "Ira",
                amount: "500",
                status: "pending",
              },
            ],
          },
        },
      });

    const rows = await mod.getNewDispatchRequests({ page: 1, size: 10 });
    expect(rows[0]).toEqual(expect.objectContaining({ id: 15, customerName: "Ira", payout: 500, status: "PENDING" }));
    expect(mod.getLastNewOrdersFetchMeta()).toEqual(expect.objectContaining({
      endpoint: "/api/v1/orders/new",
      status: 200,
    }));
    expect(mockCacheOrderList).toHaveBeenCalledWith("newOrders", expect.any(Array));

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
    mockGetCachedOrderList.mockResolvedValueOnce({ data: [{ id: 99 }] });
    await expect(mod.getNewDispatchRequests()).resolves.toEqual([{ id: 99 }]);
  });

  it("covers all-404 new-order fallback with empty cache and wrapper error translation", async () => {
    const { mod, mockAPI, mockGetCachedOrderList } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    mockGetCachedOrderList.mockResolvedValueOnce(null);
    await expect(mod.getNewDispatchRequests()).resolves.toEqual([]);

    mockAPI.get.mockReset();
    mockAPI.get.mockRejectedValue(new Error("new orders failed"));
    mockGetCachedOrderList.mockResolvedValueOnce(null);
    await expect(mod.getNewOrders()).rejects.toThrow("Unable to fetch new orders");
  });

  it("covers dispatch request accept and reject fallbacks", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { accepted: true } });
    await expect(mod.acceptDispatchRequest(12)).resolves.toEqual({ accepted: true });

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 post failed"))
      .mockResolvedValueOnce({ data: { rejected: true } });
    await expect(mod.rejectDispatchRequest(12, "  busy  ")).resolves.toEqual({ rejected: true });
    expect(mockAPI.post).toHaveBeenNthCalledWith(2, "/api/partner/dispatch/12/reject", { reason: "busy" });
  });

  it("covers deepest dispatch accept and reject fallbacks plus wrapper defaults", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 orders failed"))
      .mockRejectedValueOnce(new Error("dispatch failed"))
      .mockResolvedValueOnce({ data: { accepted: "last endpoint" } });
    await expect(mod.acceptDispatchRequest(77)).resolves.toEqual({ accepted: "last endpoint" });
    expect(mockAPI.post).toHaveBeenNthCalledWith(3, "/api/orders/77/accept");

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 orders failed"))
      .mockRejectedValueOnce(new Error("dispatch failed"))
      .mockResolvedValueOnce({ data: { rejected: "last endpoint" } });
    await expect(mod.rejectDispatchRequest(88, "   ")).resolves.toEqual({ rejected: "last endpoint" });
    expect(mockAPI.post).toHaveBeenLastCalledWith("/api/orders/88/reject", { reason: "Not available" });

    mockAPI.patch.mockResolvedValueOnce({ data: { accepted: true } });
    await expect(mod.acceptPartnerRequest(10)).resolves.toBeUndefined();

    mockAPI.patch.mockResolvedValueOnce({ data: { rejected: true } });
    await expect(mod.rejectPartnerRequest(11)).resolves.toBeUndefined();
    expect(mockAPI.patch).toHaveBeenLastCalledWith("/api/v1/partner/requests/11/reject", { reason: "Not available" });
  });

  it("covers middle dispatch fallback endpoints and rejectOrder wrapper", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post
      .mockResolvedValueOnce({ data: { accepted: "v1 orders" } });
    await expect(mod.acceptDispatchRequest(33)).resolves.toEqual({ accepted: "v1 orders" });

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { rejected: "legacy patch" } });
    await expect(mod.rejectDispatchRequest(34, "busy")).resolves.toEqual({ rejected: "legacy patch" });

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 orders failed"))
      .mockResolvedValueOnce({ data: { accepted: "dispatch endpoint" } });
    await expect(mod.acceptDispatchRequest(36)).resolves.toEqual({ accepted: "dispatch endpoint" });

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post
      .mockResolvedValueOnce({ data: { rejected: "v1 orders" } });
    await expect(mod.rejectDispatchRequest(37, "busy")).resolves.toEqual({ rejected: "v1 orders" });

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockAPI.post.mockResolvedValueOnce({ data: { rejected: "wrapped" } });
    await expect(mod.rejectOrder(35)).resolves.toEqual({ rejected: "wrapped" });
  });

  it("covers shift, dispatch availability, and live location fallbacks", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { started: true } });
    await expect(mod.startDispatchShift()).resolves.toEqual({ started: true });

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { ended: true } });
    await expect(mod.endDispatchShift()).resolves.toEqual({ ended: true });

    mockAPI.patch
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { updated: true } });
    await expect(mod.patchDispatchAvailability({ online: true })).resolves.toEqual({ updated: true });

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { city: "Delhi" } });
    await expect(
      mod.sendDispatchLocation({
        latitude: 28.61,
        longitude: 77.2,
        accuracy: 18,
        trackingState: "AVAILABLE",
      }),
    ).resolves.toEqual({ city: "Delhi" });
    expect(mockAPI.post).toHaveBeenLastCalledWith(
      "/api/partner/dispatch/location",
      expect.objectContaining({ latitude: 28.61, longitude: 77.2, accuracy: 18 }),
    );
  });

  it("covers order detail, history, timeline, notifications, banners, and skills", async () => {
    const {
      mod,
      mockAPI,
      mockCacheOrderDetails,
      mockGetCachedOrderDetails,
    } = loadPartnerService();

    mockAPI.get
      .mockResolvedValueOnce({ data: { data: { id: 14, customerName: "Rani", latitude: 28.62, longitude: 77.21 } } })
      .mockResolvedValueOnce({ data: { data: [] } });
    await expect(mod.getPartnerOrderById(14)).resolves.toEqual(
      expect.objectContaining({
        id: 14,
        customerName: "Rani",
        timeline: [],
      }),
    );
    expect(mockCacheOrderDetails).toHaveBeenCalled();

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockRejectedValueOnce(new Error("legacy failed"));
    mockGetCachedOrderDetails.mockResolvedValueOnce({ data: { id: 14, cached: true } });
    await expect(mod.getPartnerOrderById(14)).resolves.toEqual({ id: 14, cached: true });

    mockAPI.get.mockReset();
    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ id: 1, status: "COMPLETED", amount: "299" }] } },
    });
    await expect(mod.getOrderHistory()).resolves.toEqual([
      expect.objectContaining({ id: 1, amount: 299, status: "COMPLETED" }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { rows: [{ id: "t1", status: "STARTED", remarks: "Reached", createdAt: "now" }] } },
    });
    await expect(mod.getOrderTimeline(99)).resolves.toEqual([
      expect.objectContaining({ id: "t1", toStatus: "STARTED", remarks: "Reached" }),
    ]);

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { items: [{ id: 1, title: "Hero", imageUrl: "banner.jpg" }] } });
    await expect(mod.getPartnerHomeBanners(1)).resolves.toEqual([
      { id: "1", title: "Hero", subtitle: undefined, imageUrl: "banner.jpg" },
    ]);

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { data: { items: [{ id: 1, title: "Ping", body: "Hello", read: 0 }] } } });
    await expect(mod.getPartnerNotifications()).resolves.toEqual([
      { id: "1", title: "Ping", message: "Hello", read: false, createdAt: undefined },
    ]);

    mockAPI.get.mockResolvedValueOnce({ data: { data: { categoryIds: [1, "2"], subServiceIds: [3, "x"] } } });
    await expect(mod.getPartnerSkills()).resolves.toEqual({ categoryIds: [1, 2], subServiceIds: [3] });
  });

  it("covers order, banner, notification, and skills fallback failures", async () => {
    const {
      mod,
      mockAPI,
      mockGetCachedOrderDetails,
      mockGetCachedOrderList,
    } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 order failed"))
      .mockRejectedValueOnce(new Error("legacy order failed"));
    mockGetCachedOrderDetails.mockResolvedValueOnce(null);
    await expect(mod.getPartnerOrderById(22)).rejects.toThrow("Unable to fetch order details");

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 history failed"))
      .mockRejectedValueOnce(new Error("legacy history failed"));
    mockGetCachedOrderList.mockResolvedValueOnce(null);
    await expect(mod.getOrderHistory()).rejects.toThrow("Unable to fetch order history");

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValueOnce(new Error("banner1"))
      .mockRejectedValueOnce(new Error("banner2"))
      .mockRejectedValueOnce(new Error("banner3"))
      .mockRejectedValueOnce(new Error("banner4"))
      .mockRejectedValueOnce(new Error("banner5"));
    await expect(mod.getPartnerHomeBanners(2)).resolves.toEqual([]);

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 notifications failed"))
      .mockRejectedValueOnce(new Error("provider notifications failed"));
    await expect(mod.getPartnerNotifications()).rejects.toThrow("Unable to fetch notifications");

    mockAPI.get.mockRejectedValueOnce(new Error("skills failed"));
    await expect(mod.getPartnerSkills()).rejects.toThrow("Unable to fetch partner skills");

    mockAPI.put.mockRejectedValueOnce(new Error("update skills failed"));
    await expect(mod.updatePartnerSkills({ categoryIds: [1], subServiceIds: [2] })).rejects.toThrow(
      "Unable to update partner skills",
    );
  });

  it("covers banner payload shape variants and empty-image filtering", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get
      .mockResolvedValueOnce({ data: { banners: [{ bannerId: "b1", name: "Banner", description: "Sub", image: "banner.jpg" }] } });
    await expect(mod.getPartnerHomeBanners(2)).resolves.toEqual([
      { id: "b1", title: "Banner", subtitle: "Sub", imageUrl: "banner.jpg" },
    ]);

    mockAPI.get.mockReset();
    mockAPI.get
      .mockResolvedValueOnce({ data: [{ id: 2, title: "Loose", imageUrl: "loose.jpg" }, { id: 3, title: "Skip" }] });
    await expect(mod.getPartnerHomeBanners(5)).resolves.toEqual([
      { id: "2", title: "Loose", subtitle: undefined, imageUrl: "loose.jpg" },
    ]);

    mockAPI.get.mockReset();
    mockAPI.get
      .mockResolvedValueOnce({ data: { unexpected: true } })
      .mockResolvedValueOnce({ data: { unexpected: true } })
      .mockResolvedValueOnce({ data: { unexpected: true } })
      .mockResolvedValueOnce({ data: { unexpected: true } })
      .mockResolvedValueOnce({ data: { unexpected: true } });
    await expect(mod.getPartnerHomeBanners(1)).resolves.toEqual([]);
  });

  it("covers legacy order-detail success and history cache-less failure", async () => {
    const { mod, mockAPI, mockGetCachedOrderList } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { data: { id: 91, amount: "120" } } })
      .mockResolvedValueOnce({ data: { data: { rows: [] } } });
    await expect(mod.getPartnerOrderById(91)).resolves.toEqual(
      expect.objectContaining({ id: 91, amount: 120, timeline: [] }),
    );

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValueOnce(new Error("v1 history failed"))
      .mockRejectedValueOnce(new Error("legacy history failed"));
    mockGetCachedOrderList.mockRejectedValueOnce(new Error("cache failed"));
    await expect(mod.getOrderHistory()).rejects.toThrow("Unable to fetch order history");
  });

  it("covers alternate collection payload shapes and order field fallbacks", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            request: {
              requestId: "44",
              customer: { name: "Customer Name", phone: "888" },
              customerAddress: "Addr",
              service: { name: "Deep Clean", category: "HOME" },
              dispatchStatus: "assigned",
              scheduledTime: "2026-01-01T10:00:00Z",
              requestExpiresAt: "2026-01-01T10:30:00Z",
              priority: "high",
              latitude: "28.55",
              longitude: "77.11",
              available: 0,
            },
          },
        },
      });

    await expect(mod.getNewDispatchRequests()).resolves.toEqual([
      expect.objectContaining({
        id: 44,
        requestId: 44,
        customerName: "Customer Name",
        customerPhone: "888",
        address: "Addr",
        serviceType: "Deep Clean",
        serviceCategory: "HOME",
        assignmentStatus: "ASSIGNED",
        promisedStartTime: "2026-01-01T10:00:00Z",
        expiresAt: "2026-01-01T10:30:00Z",
        priority: "HIGH",
        latitude: 28.55,
        longitude: 77.11,
        available: false,
      }),
    ]);

    mockAPI.get.mockReset();
    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          content: [
            {
              orderId: "71",
              user: { name: "User Name", phone: "777" },
              serviceAddress: "History Addr",
              category: "COOK",
              subServiceName: "Meal",
              etaMinutes: "17",
              payout: "250",
              bookingType: "instant",
              status: "completed",
              expiresInSeconds: "90",
            },
          ],
        },
      },
    });
    await expect(mod.getOrderHistory()).resolves.toEqual([
      expect.objectContaining({
        id: 71,
        customerName: "User Name",
        customerPhone: "777",
        address: "History Addr",
        serviceType: "COOK",
        subService: "Meal",
        etaMinutes: 17,
        payout: 250,
        bookingType: "INSTANT",
        status: "COMPLETED",
        expiresInSeconds: 90,
      }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: {
        rows: [
          {
            notificationId: "n-1",
            title: "Fallback",
            body: "Body",
            read: 1,
          },
        ],
      },
    });
    await expect(mod.getPartnerNotifications()).resolves.toEqual([
      { id: "n-1", title: "Fallback", message: "Body", read: true, createdAt: undefined },
    ]);
  });

  it("covers earnings, payouts, bank details, withdrawals, and dispatch config", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          todaySettlement: "10",
          weekSettlement: 20,
          monthSettlement: 30,
          lifetimeSettlement: 40,
          availableBalance: 50,
          pendingSettlement: 60,
        },
      },
    });
    await expect(mod.getPartnerEarningsSummary()).resolves.toEqual({
      todaySettlement: 10,
      weekSettlement: 20,
      monthSettlement: 30,
      lifetimeSettlement: 40,
      availableBalance: 50,
      pendingSettlement: 60,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ id: 1, bookingId: 22, narration: "Trip", netAmount: "99" }] } },
    });
    await expect(mod.getPartnerEarningsTransactions()).resolves.toEqual([
      expect.objectContaining({ id: "1", bookingId: "22", amount: 99 }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ payoutId: "p1", settlementAmount: "150" }] } },
    });
    await expect(mod.getPartnerPayouts()).resolves.toEqual([
      expect.objectContaining({ id: "p1", netAmount: 150 }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { payoutId: "p2", amount: "250" } },
    });
    await expect(mod.getPartnerPayoutById("p2")).resolves.toEqual(
      expect.objectContaining({ id: "p2", grossAmount: 250 }),
    );

    mockAPI.get.mockResolvedValueOnce({ data: { data: {} } });
    await expect(mod.getPartnerBankDetails()).resolves.toBeNull();

    mockAPI.put.mockResolvedValueOnce({
      data: { data: { accountNumberMasked: "XXXX11", status: "VERIFIED" } },
    });
    await expect(
      mod.updatePartnerBankDetails({ accountNumber: "1234", ifscCode: "IFSC" }),
    ).resolves.toEqual({
      maskedAccountNumber: "XXXX11",
      ifscCode: "IFSC",
      verificationStatus: "VERIFIED",
      rejectionReason: undefined,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { availableBalance: 11, settledBalance: 22, reservedBalance: 33 } },
    });
    await expect(mod.getPartnerWithdrawalBalance()).resolves.toEqual({
      availableBalance: 11,
      settledBalance: 22,
      reservedBalance: 33,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ withdrawalId: "w1", amount: "88" }] } },
    });
    await expect(mod.getPartnerWithdrawals()).resolves.toEqual([
      expect.objectContaining({ id: "w1", amount: 88 }),
    ]);

    mockAPI.post.mockResolvedValueOnce({
      data: { data: { withdrawalId: "w2", amount: 99 } },
    });
    await expect(mod.createPartnerWithdrawal(99)).resolves.toEqual(
      expect.objectContaining({ id: "w2", amount: 99 }),
    );

    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          locationUpdateIntervalSeconds: 18,
          backgroundIntervalSeconds: 45,
          distanceFilterMeters: 30,
          expiryWarningSeconds: 20,
        },
      },
    });
    await expect(mod.getPartnerDispatchConfig()).resolves.toEqual({
      foregroundTrackingIntervalSeconds: 18,
      backgroundTrackingIntervalSeconds: 45,
      minDistanceMeters: 30,
      requestExpiryWarningSeconds: 20,
    });
  });

  it("covers finance-related error branches and bank detail normalization", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { accountNumber: "1234567890", bankVerificationStatus: "REVIEW", rejectionReason: "Mismatch" } },
    });
    await expect(mod.getPartnerBankDetails()).resolves.toEqual({
      maskedAccountNumber: "1234567890",
      ifscCode: undefined,
      verificationStatus: "REVIEW",
      rejectionReason: "Mismatch",
    });

    mockAPI.put.mockRejectedValueOnce(new Error("bank update failed"));
    await expect(mod.updatePartnerBankDetails({ accountNumber: "1234", ifscCode: "IFSC" })).rejects.toThrow(
      "Unable to update bank details",
    );

    mockAPI.get.mockRejectedValueOnce(new Error("earnings summary failed"));
    await expect(mod.getPartnerEarningsSummary()).rejects.toThrow("Unable to fetch earnings summary");

    mockAPI.get.mockRejectedValueOnce(new Error("transactions failed"));
    await expect(mod.getPartnerEarningsTransactions()).rejects.toThrow("Unable to fetch earnings transactions");

    mockAPI.get.mockRejectedValueOnce(new Error("payouts failed"));
    await expect(mod.getPartnerPayouts()).rejects.toThrow("Unable to fetch payouts");

    mockAPI.get.mockRejectedValueOnce(new Error("payout detail failed"));
    await expect(mod.getPartnerPayoutById("p1")).rejects.toThrow("Unable to fetch payout detail");

    mockAPI.get.mockRejectedValueOnce({ response: { status: 500 } });
    await expect(mod.getPartnerBankDetails()).rejects.toThrow("Unable to fetch bank details");

    mockAPI.get.mockRejectedValueOnce(new Error("balance failed"));
    await expect(mod.getPartnerWithdrawalBalance()).rejects.toThrow("Unable to fetch withdrawal balance");

    mockAPI.get.mockRejectedValueOnce(new Error("withdrawals failed"));
    await expect(mod.getPartnerWithdrawals()).rejects.toThrow("Unable to fetch withdrawals");

    mockAPI.post.mockRejectedValueOnce(new Error("withdraw request failed"));
    await expect(mod.createPartnerWithdrawal(20)).rejects.toThrow("Unable to request withdrawal");
  });

  it("covers alternate finance, config, and parse-array fallback mappings", async () => {
    const { mod, mockAPI, mockGetCachedOrderList } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({ data: { data: { weekEarnings: "21", month: "31", lifetime: "41", withdrawableBalance: "51", reservedBalance: "61" } } });
    await expect(mod.getPartnerEarningsSummary()).resolves.toEqual({
      todaySettlement: 0,
      weekSettlement: 21,
      monthSettlement: 31,
      lifetimeSettlement: 41,
      availableBalance: 51,
      pendingSettlement: 61,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          rows: [
            {
              ledgerId: "l-1",
              type: "BONUS",
              settlementAmount: "45",
              transactionDate: "2026-01-01",
            },
          ],
        },
      },
    });
    await expect(mod.getPartnerEarningsTransactions()).resolves.toEqual([
      {
        id: "l-1",
        bookingId: undefined,
        description: "BONUS",
        amount: 45,
        type: "BONUS",
        status: undefined,
        createdAt: "2026-01-01",
      },
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { rows: [{ id: "p-1", grossSettlement: "100", commission: "10", refundReversal: "5", payableAmount: "85", processedAt: "done" }] } },
    });
    await expect(mod.getPartnerPayouts()).resolves.toEqual([
      expect.objectContaining({
        id: "p-1",
        grossAmount: 100,
        commissionAmount: 10,
        reversalAmount: 5,
        netAmount: 85,
        status: "PENDING",
        settledAt: "done",
      }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { payoutId: "p-2", settlementAmount: "250", status: "SETTLED", processedAt: "ts" } },
    });
    await expect(mod.getPartnerPayoutById("p-2")).resolves.toEqual(
      expect.objectContaining({ id: "p-2", netAmount: 250, status: "SETTLED", settledAt: "ts" }),
    );

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { withdrawableBalance: 15, totalSettledBalance: 25, withdrawalReservations: 35 } },
    });
    await expect(mod.getPartnerWithdrawalBalance()).resolves.toEqual({
      availableBalance: 15,
      settledBalance: 25,
      reservedBalance: 35,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { rows: [{ id: "w-3", amount: "19", createdAt: "created" }] } },
    });
    await expect(mod.getPartnerWithdrawals()).resolves.toEqual([
      expect.objectContaining({ id: "w-3", amount: 19, status: "PENDING", requestedAt: "created" }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { foregroundTrackingIntervalSeconds: 0, backgroundTrackingIntervalSeconds: 0, minDistanceMeters: 0, requestExpiryWarningSeconds: 0 } },
    });
    await expect(mod.getPartnerDispatchConfig()).resolves.toEqual({
      foregroundTrackingIntervalSeconds: 25,
      backgroundTrackingIntervalSeconds: 60,
      minDistanceMeters: 50,
      requestExpiryWarningSeconds: 30,
    });

    mockAPI.get
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } });
    mockGetCachedOrderList.mockResolvedValueOnce(null);
    await expect(mod.getNewDispatchRequests()).resolves.toEqual([]);
  });

  it("covers performance, ratings, leave, service areas, warnings, and wrappers", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({
      data: {
        data: {
          acceptanceRate: 90,
          completionRate: 91,
          cancellationRate: 2,
          averageRating: 4.7,
          onTimeArrivalPercentage: 88,
        },
      },
    });
    await expect(mod.getPartnerPerformanceSummary()).resolves.toEqual({
      acceptanceRate: 90,
      completionRate: 91,
      cancellationRate: 2,
      rating: 4.7,
      onTimeArrivalRate: 88,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { averageRating: 4.8, reviews: [{ id: 1, rating: 5, message: "Great" }] } },
    });
    await expect(mod.getPartnerRatings()).resolves.toEqual({
      averageRating: 4.8,
      totalReviews: 1,
      feedback: [{ id: "1", rating: 5, comment: "Great", customerName: undefined, createdAt: undefined }],
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ leaveId: "l1", startDate: "2026-01-01", endDate: "2026-01-02" }] } },
    });
    await expect(mod.getPartnerLeaves()).resolves.toEqual([
      expect.objectContaining({ id: "l1", fromDate: "2026-01-01", toDate: "2026-01-02" }),
    ]);

    mockAPI.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.applyPartnerLeave({ fromDate: "a", toDate: "b" })).resolves.toEqual({ ok: true });

    mockAPI.patch.mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.cancelPartnerLeave("l1")).resolves.toEqual({ ok: true });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { areas: [{ areaId: "a1", pincode: "110001", city: "Delhi", active: true }] } },
    });
    await expect(mod.getPartnerServiceAreas()).resolves.toEqual([
      {
        id: "a1",
        name: "110001, Delhi",
        pincode: "110001",
        city: "Delhi",
        selected: true,
      },
    ]);

    mockAPI.put.mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.updatePartnerServiceAreas([{ pincode: "110001", city: "Delhi" }])).resolves.toEqual({ ok: true });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ warningId: "wr1", category: "warning", title: "Late", active: false }] } },
    });
    await expect(mod.getPartnerWarnings()).resolves.toEqual([
      {
        id: "wr1",
        type: "WARNING",
        reason: "Late",
        guidance: undefined,
        createdAt: undefined,
        active: false,
      },
    ]);

    mockAPI.get.mockReset();
    mockAPI.get
      .mockRejectedValueOnce(new Error("warnings down"))
      .mockResolvedValueOnce({ data: { data: { [getLegacyAccountStatusKey()]: "SUSPENDED" } } });
    await expect(mod.getPartnerWarnings()).resolves.toEqual([
      {
        id: "profile-account-status",
        type: "SUSPENDED",
        reason: "Partner account status is SUSPENDED.",
        status: "SUSPENDED",
        active: true,
      },
    ]);
  });

  it("covers alternate summary shapes and ACTIVE warnings fallback", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { rating: "4.2", feedback: [{ feedback: "Helpful", customerName: "Neha" }] } },
    });
    await expect(mod.getPartnerRatings()).resolves.toEqual({
      averageRating: 4.2,
      totalReviews: 1,
      feedback: [{ id: "0", rating: 0, comment: "Helpful", customerName: "Neha", createdAt: undefined }],
    });

    mockAPI.get.mockRejectedValueOnce(new Error("warnings down"));
    mockAPI.get.mockResolvedValueOnce({ data: { data: { [getLegacyAccountStatusKey()]: "ACTIVE" } } });
    await expect(mod.getPartnerWarnings()).resolves.toEqual([]);
  });

  it("covers alternate profile/performance/service-area/leave/warning mappings", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { acceptanceRate: "80", completionRate: "81", cancellationRate: "2", rating: "4.1", onTimeArrivalRate: "77" } },
    });
    await expect(mod.getPartnerPerformanceSummary()).resolves.toEqual({
      acceptanceRate: 80,
      completionRate: 81,
      cancellationRate: 2,
      rating: 4.1,
      onTimeArrivalRate: 77,
    });

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { items: [{ leaveId: "l2", startDate: "2026-02-01", endDate: "2026-02-02", reason: "Trip", status: "APPROVED" }] } },
    });
    await expect(mod.getPartnerLeaves()).resolves.toEqual([
      { id: "l2", fromDate: "2026-02-01", toDate: "2026-02-02", reason: "Trip", status: "APPROVED" },
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { rows: [{ pincode: "110002", city: "Delhi", preferred: 1 }] } },
    });
    await expect(mod.getPartnerServiceAreas()).resolves.toEqual([
      { id: "110002", name: "110002, Delhi", pincode: "110002", city: "Delhi", selected: true },
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { rows: [{ warningId: "w2", type: "policy", message: "Check docs", resolutionGuidance: "Upload again" }] } },
    });
    await expect(mod.getPartnerWarnings()).resolves.toEqual([
      {
        id: "w2",
        type: "POLICY",
        reason: "Check docs",
        guidance: "Upload again",
        createdAt: undefined,
        status: undefined,
        active: true,
      },
    ]);
  });

  it("covers request wrappers, skills update, and order media wrappers", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { orders: [{ id: 1, status: "PENDING" }] } },
    });
    await expect(mod.fetchPartnerRequests({ status: "PENDING" })).resolves.toEqual([
      expect.objectContaining({ status: "PENDING" }),
    ]);

    mockAPI.get
      .mockResolvedValueOnce({ data: { data: { items: [{ id: 101, status: "PENDING" }] } } })
      .mockResolvedValueOnce({
        data: { data: { items: [{ id: 2, status: "COMPLETED" }] } },
      });
    await expect(mod.fetchPartnerRequests({ status: "COMPLETED" })).resolves.toEqual([
      expect.objectContaining({ id: 2, status: "COMPLETED" }),
    ]);

    mockAPI.get.mockResolvedValueOnce({
      data: { data: { request: { id: 9, requestId: 9 } } },
    });
    await expect(mod.fetchPartnerRequestById(9)).resolves.toEqual(
      expect.objectContaining({ id: 9, requestId: 9 }),
    );

    mockAPI.put.mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.updatePartnerSkills({ categoryIds: [1], subServiceIds: [2] })).resolves.toEqual({ ok: true });

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.startOrder(55, { uri: "before" })).resolves.toEqual({ data: { ok: true } });

    mockAPI.post
      .mockRejectedValueOnce(new Error("v1 failed"))
      .mockResolvedValueOnce({ data: { ok: true } });
    await expect(mod.completeOrder(55, { uri: "after" })).resolves.toEqual({ data: { ok: true } });
  });

  it("covers request-by-id unwrap fallback and direct wrapper return values", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockResolvedValueOnce({ data: { data: { request: { requestId: "78", status: "ACCEPTED" } } } });
    await expect(mod.fetchPartnerRequestById(78)).resolves.toEqual(
      expect.objectContaining({ id: 78, requestId: 78, status: "ACCEPTED" }),
    );

    mockAPI.patch.mockResolvedValueOnce({ data: { accepted: true } });
    await expect(mod.acceptOrder(50)).resolves.toEqual({ accepted: true });
  });

  it("covers null-bank 404 and dispatch config fallback defaults", async () => {
    const { mod, mockAPI } = loadPartnerService();

    mockAPI.get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(mod.getPartnerBankDetails()).resolves.toBeNull();

    mockAPI.get.mockRejectedValueOnce(new Error("config unavailable"));
    await expect(mod.getPartnerDispatchConfig()).resolves.toEqual({
      foregroundTrackingIntervalSeconds: 25,
      backgroundTrackingIntervalSeconds: 60,
      minDistanceMeters: 50,
      requestExpiryWarningSeconds: 30,
    });
  });
});
