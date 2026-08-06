const mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() };
const mockParse = jest.fn((_error: unknown, fallback: string) => fallback);
const mockToken = jest.fn();
const mockGetState = jest.fn();

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: any[]) => (mockApi.get as any)(...args), post: (...args: any[]) => (mockApi.post as any)(...args),
    put: (...args: any[]) => (mockApi.put as any)(...args), patch: (...args: any[]) => (mockApi.patch as any)(...args),
    delete: (...args: any[]) => (mockApi.delete as any)(...args),
  },
  parseApiError: (...args: any[]) => (mockParse as any)(...args),
  unwrapPayload: (data: any, fallback: any) => data?.data ?? data ?? fallback,
}));
jest.mock("../src/constants/env", () => ({
  API_BASE_URL: "http://api.test:8082/",
  DEV_IMAGE_HOST: "device.test:8082",
  DEV_LOGIN_BYPASS: false,
  DEV_BYPASS_API_TOKEN: "",
}));
jest.mock("../src/utils/storage", () => ({ getToken: () => mockToken() }));
jest.mock("../src/redux/store", () => ({ store: { getState: () => mockGetState() } }));

import {
  deleteCustomerProfileImage, getCustomerAddresses, getCustomerProfile, getCustomerProfileContent,
  requestAccountDelete, updateCustomerEmail, updateCustomerProfile, uploadCustomerProfileImage,
} from "../src/api/customerProfileApi";
import { fetchCustomerBannersByCategory } from "../src/api/bannerApi";
import { getPopularCleaningServices, getPopularCookServices, getPopularServices, getPopularServicesByCategory } from "../src/api/popularServicesApi";

describe("profile API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken.mockResolvedValue("token");
    mockGetState.mockReturnValue({ auth: { token: "redux-token" }, location: {} });
    mockParse.mockImplementation((_error, fallback) => fallback);
  });

  it("maps profile CRUD, addresses, delete request, and content shapes", async () => {
    const raw = { customerId: 7, firstName: " A ", lastName: " B ", phone: " 999 ", email: " e@x.com ", gender: "male", dateOfBirth: " 2000 ", imageUrl: " img " };
    mockApi.get
      .mockResolvedValueOnce({ data: { data: raw } })
      .mockResolvedValueOnce({ data: { data: [{ id: 1 }] } })
      .mockResolvedValueOnce({ data: { data: { data: { about_us: " About ", terms_of_service: " Terms ", privacy_policy: " Privacy " } } } });
    mockApi.put.mockResolvedValue({ data: raw });
    mockApi.patch.mockResolvedValue({ data: raw });
    mockApi.delete.mockResolvedValue({ data: raw });
    mockApi.post.mockResolvedValue({ data: { data: { accepted: true } } });
    await expect(getCustomerProfile()).resolves.toMatchObject({ id: "7", firstName: "A", mobile: "999", gender: "MALE", profileImageUrl: "img" });
    await expect(updateCustomerProfile({ firstName: "A" } as any)).resolves.toMatchObject({ id: "7" });
    await expect(updateCustomerEmail({ email: "e@x.com" })).resolves.toMatchObject({ email: "e@x.com" });
    await expect(deleteCustomerProfileImage()).resolves.toMatchObject({ id: "7" });
    await expect(getCustomerAddresses()).resolves.toEqual([{ id: 1 }]);
    await expect(requestAccountDelete()).resolves.toEqual({ accepted: true });
    await expect(getCustomerProfileContent()).resolves.toEqual({ aboutUs: "About", termsOfService: "Terms", privacyPolicy: "Privacy" });
    expect(mockApi.get).toHaveBeenNthCalledWith(
      3,
      "/api/admin/profile-content",
      { headers: { "X-Skip-Authorization": "true" } },
    );
  });

  it("returns empty addresses and root content fallbacks", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: "invalid" } })
      .mockResolvedValueOnce({ data: { data: { aboutUs: "Root" } } });
    await expect(getCustomerAddresses()).resolves.toEqual([]);
    await expect(getCustomerProfileContent()).resolves.toMatchObject({ aboutUs: "Root" });
  });

  it("validates image input before upload", async () => {
    await expect(uploadCustomerProfileImage({ uri: "x", type: "text/plain" } as any)).rejects.toThrow("Invalid image type");
    await expect(uploadCustomerProfileImage({ uri: "x", type: "image/png", size: 6 * 1024 * 1024 } as any)).rejects.toThrow("Invalid image size");
    await expect(uploadCustomerProfileImage({ uri: "image:file://bad", type: "image/png" } as any)).rejects.toThrow("Invalid image uri");
    mockToken.mockResolvedValue(null);
    mockGetState.mockReturnValue({ auth: { token: null } });
    await expect(uploadCustomerProfileImage({ uri: "file://ok", type: "image/png" } as any)).rejects.toThrow("Session expired");
  });

  it("uploads valid images and handles response/error variants", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch" as any);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ data: { id: 2, firstName: "Uploaded" } }) } as any);
    await expect(uploadCustomerProfileImage({ uri: "file://photo", type: "image/jpeg", name: "" } as any)).resolves.toMatchObject({ id: "2", firstName: "Uploaded" });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => "not-json" } as any);
    await expect(uploadCustomerProfileImage({ uri: "file://photo", type: "image/png" } as any)).resolves.toMatchObject({ id: "" });
    for (const status of [401, 400, 500]) {
      fetchMock.mockResolvedValueOnce({ ok: false, status, text: async () => "failed" } as any);
      await expect(uploadCustomerProfileImage({ uri: "file://photo", type: "image/webp" } as any)).rejects.toThrow();
    }
    fetchMock.mockRejectedValueOnce(new Error("Network request failed"));
    await expect(uploadCustomerProfileImage({ uri: "file://photo", type: "image/jpg" } as any)).rejects.toThrow("Network request failed");
    fetchMock.mockRestore();
  });

  it("normalizes every profile API catch block", async () => {
    mockApi.get.mockRejectedValue(new Error("bad")); mockApi.put.mockRejectedValue(new Error("bad"));
    mockApi.patch.mockRejectedValue(new Error("bad")); mockApi.delete.mockRejectedValue(new Error("bad")); mockApi.post.mockRejectedValue(new Error("bad"));
    const calls = [getCustomerProfile(), updateCustomerProfile({} as any), updateCustomerEmail({} as any), deleteCustomerProfileImage(), getCustomerAddresses(), requestAccountDelete(), getCustomerProfileContent()];
    for (const call of calls) await expect(call).rejects.toThrow();
  });
});

describe("banner and popular service APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken.mockResolvedValue("stored");
    mockGetState.mockReturnValue({ auth: { token: "redux" }, location: { selectedAddress: { latitude: 22.7, longitude: 75.8, pincode: "452001" } } });
  });

  it("returns empty for blank category and maps banner URLs from response variants", async () => {
    await expect(fetchCustomerBannersByCategory(" ")).resolves.toEqual([]);
    mockApi.get.mockResolvedValueOnce({ data: { result: { content: [{ id: 1, bannerImageUrl: "/banner.png" }] } } });
    await expect(fetchCustomerBannersByCategory(4)).resolves.toEqual([expect.objectContaining({ imageUrl: "http://api.test:8082/banner.png" })]);
    expect(mockApi.get).toHaveBeenCalledWith("/api/customer/banners", expect.objectContaining({ headers: { Authorization: "Bearer stored" } }));
  });

  it("probes all banner endpoints and returns empty when no rows exist", async () => {
    mockApi.get.mockRejectedValue(new Error("none"));
    await expect(fetchCustomerBannersByCategory("x")).resolves.toEqual([]);
    expect(mockApi.get).toHaveBeenCalledTimes(12);
  });

  it("uses the Redux token when storage is empty and omits auth when both are empty", async () => {
    mockToken.mockResolvedValueOnce(null);
    mockApi.get.mockResolvedValueOnce({ data: [{ id: 1, imageUrl: "banner.png" }] });
    await fetchCustomerBannersByCategory(4);
    expect(mockApi.get).toHaveBeenLastCalledWith(
      "/api/customer/banners",
      expect.objectContaining({
        headers: { Authorization: "Bearer redux" },
      }),
    );

    mockToken.mockResolvedValueOnce(null);
    mockGetState.mockReturnValueOnce({ auth: { token: null } });
    mockApi.get.mockResolvedValueOnce({ data: [{ id: 2, imageUrl: "/banner-2.png" }] });
    await fetchCustomerBannersByCategory(5);
    expect(mockApi.get).toHaveBeenLastCalledWith(
      "/api/customer/banners",
      expect.objectContaining({ headers: {} }),
    );
  });

  it.each([
    ["data.data", { data: { data: [{ id: 1 }] } }],
    ["data.content", { data: { content: [{ id: 2 }] } }],
    ["data.items", { data: { items: [{ id: 3 }] } }],
    ["data.banners", { data: { banners: [{ id: 4 }] } }],
    ["records", { records: [{ id: 5 }] }],
    ["rows", { rows: [{ id: 6 }] }],
    ["result.data", { result: { data: [{ id: 7 }] } }],
    ["result.items", { result: { items: [{ id: 8 }] } }],
    ["result.banners", { result: { banners: [{ id: 9 }] } }],
    ["payload.data", { payload: { data: [{ id: 10 }] } }],
    ["payload.content", { payload: { content: [{ id: 11 }] } }],
    ["payload.items", { payload: { items: [{ id: 12 }] } }],
    ["payload.banners", { payload: { banners: [{ id: 13 }] } }],
  ])("extracts banner rows from the %s response envelope", async (_name, data) => {
    mockApi.get.mockResolvedValueOnce({ data });
    await expect(fetchCustomerBannersByCategory(4)).resolves.toHaveLength(1);
  });

  it("normalizes relative, local, external, blank, and missing banner URLs", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        { id: 1, imageUrl: "relative.png" },
        { id: 2, imageUrl: "http://localhost:8082/local.png" },
        { id: 3, bannerImageUrl: "http://127.0.0.1:8082/loopback.png" },
        { id: 4, imageUrl: "https://cdn.test/banner.png" },
        { id: 5, imageUrl: "   " },
        { id: 6 },
      ],
    });

    await expect(fetchCustomerBannersByCategory(4)).resolves.toEqual([
      expect.objectContaining({
        imageUrl: "http://api.test:8082/relative.png",
        bannerImageUrl: "http://api.test:8082/relative.png",
      }),
      expect.objectContaining({
        imageUrl: "http://device.test:8082:8082/local.png",
      }),
      expect.objectContaining({
        bannerImageUrl: "http://device.test:8082:8082/loopback.png",
      }),
      expect.objectContaining({
        imageUrl: "https://cdn.test/banner.png",
      }),
      expect.objectContaining({
        imageUrl: undefined,
        bannerImageUrl: undefined,
      }),
      expect.objectContaining({
        imageUrl: undefined,
        bannerImageUrl: undefined,
      }),
    ]);
  });

  it("continues after successful empty responses and returns the first populated variant", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { content: [{ id: 9 }] } });

    await expect(fetchCustomerBannersByCategory(4)).resolves.toEqual([
      expect.objectContaining({ id: 9 }),
    ]);
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  it("normalizes authentication lookup failures", async () => {
    const authError = new Error("storage unavailable");
    mockToken.mockRejectedValueOnce(authError);
    mockParse.mockReturnValueOnce("Failed to fetch banners");

    await expect(fetchCustomerBannersByCategory(4)).rejects.toThrow(
      "Failed to fetch banners",
    );
    expect(mockParse).toHaveBeenCalledWith(authError, "Failed to fetch banners");
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it("maps popular nested services, geo params, URLs, and auth retry", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { content: [{ service: { id: 8, name: "Cook", imageUrl: "http://localhost:8082/c.png", basePrice: 200 }, category: { id: 3, name: "Food" } }] } } });
    await expect(getPopularServicesByCategory("cook")).resolves.toEqual([expect.objectContaining({ serviceId: 8, name: "Cook", categoryId: 3, imageUrl: "http://device.test:8082:8082/c.png" })]);
    expect(mockApi.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: expect.objectContaining({ latitude: 22.7, longitude: 75.8, pincode: "452001" }) }));
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce({ data: [{ id: 9, thumbnailUrl: "relative.png" }] });
    await expect(getPopularServicesByCategory("cleaning")).resolves.toEqual([expect.objectContaining({ id: 9, thumbnailUrl: "http://api.test:8082/relative.png" })]);
  });

  it("handles blank, 404, invalid, and compatibility popular helpers", async () => {
    await expect(getPopularServicesByCategory(" ")).resolves.toEqual([]);
    mockApi.get.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: { invalid: true } });
    await expect(getPopularServicesByCategory("other")).resolves.toEqual([]);
    await expect(getPopularServices()).resolves.toEqual([]);
    mockApi.get.mockResolvedValue({ data: [] });
    await expect(getPopularCookServices()).resolves.toEqual([]);
    await expect(getPopularCleaningServices()).resolves.toEqual([]);
  });
});
