import { configureStore } from "@reduxjs/toolkit";

const mockApi = {
  getBanners: jest.fn(),
  getCategories: jest.fn(),
  getPopularServicesByCategory: jest.fn(),
  fetchCustomerServicesByCategory: jest.fn(),
  fetchCustomerBannersByCategory: jest.fn(),
  getBookingsHistory: jest.fn(),
  getFavorites: jest.fn(),
  getCustomerProfile: jest.fn(),
  getCustomerAddresses: jest.fn(),
  getCustomerProfileContent: jest.fn(),
  updateCustomerProfile: jest.fn(),
  updateCustomerEmail: jest.fn(),
  uploadCustomerProfileImage: jest.fn(),
  deleteCustomerProfileImage: jest.fn(),
  requestAccountDelete: jest.fn(),
};

jest.mock("../src/api/homeApi", () => ({
  getBanners: (...args: any[]) => mockApi.getBanners(...args),
  getCategories: (...args: any[]) => mockApi.getCategories(...args),
}));
jest.mock("../src/api/popularServicesApi", () => ({
  getPopularServicesByCategory: (...args: any[]) => mockApi.getPopularServicesByCategory(...args),
}));
jest.mock("../src/api/serviceApi", () => ({
  fetchCustomerServicesByCategory: (...args: any[]) => mockApi.fetchCustomerServicesByCategory(...args),
}));
jest.mock("../src/api/bannerApi", () => ({
  fetchCustomerBannersByCategory: (...args: any[]) => mockApi.fetchCustomerBannersByCategory(...args),
}));
jest.mock("../src/api/bookingApi", () => ({
  getBookingsHistory: (...args: any[]) => mockApi.getBookingsHistory(...args),
}));
jest.mock("../src/api/favoritesApi", () => ({
  getFavorites: (...args: any[]) => mockApi.getFavorites(...args),
}));
jest.mock("../src/api/customerProfileApi", () => ({
  getCustomerProfile: (...args: any[]) => mockApi.getCustomerProfile(...args),
  getCustomerAddresses: (...args: any[]) => mockApi.getCustomerAddresses(...args),
  getCustomerProfileContent: (...args: any[]) => mockApi.getCustomerProfileContent(...args),
  updateCustomerProfile: (...args: any[]) => mockApi.updateCustomerProfile(...args),
  updateCustomerEmail: (...args: any[]) => mockApi.updateCustomerEmail(...args),
  uploadCustomerProfileImage: (...args: any[]) => mockApi.uploadCustomerProfileImage(...args),
  deleteCustomerProfileImage: (...args: any[]) => mockApi.deleteCustomerProfileImage(...args),
  requestAccountDelete: (...args: any[]) => mockApi.requestAccountDelete(...args),
}));

import homeReducer, { fetchHomeData } from "../src/redux/homeSlice";
import serviceReducer, { clearServices, fetchBannersByCategory, fetchServicesByCategory } from "../src/redux/serviceSlice";
import bookingReducer, { fetchBookingHistory } from "../src/redux/bookingSlice";
import favoritesReducer, { fetchFavorites } from "../src/redux/favoritesSlice";
import profileReducer, {
  deleteCustomerProfileImageThunk,
  fetchCustomerAddressesThunk,
  fetchCustomerProfileContentThunk,
  fetchCustomerProfileThunk,
  refreshProfileBundleThunk,
  requestAccountDeleteThunk,
  resetProfileError,
  setProfileOptimistic,
  updateCustomerEmailThunk,
  updateCustomerProfileThunk,
  uploadCustomerProfileImageThunk,
} from "../src/redux/customerProfileSlice";

function storeFor(key: string, reducer: any, preloadedState?: any) {
  return configureStore({
    reducer: { [key]: reducer },
    preloadedState: preloadedState ? { [key]: preloadedState } : undefined,
  } as any) as any;
}

describe("homeSlice", () => {
  beforeEach(() => jest.clearAllMocks());

  it("filters, sorts, enriches, and deduplicates home data", async () => {
    mockApi.getBanners.mockResolvedValue([
      { id: 1, status: "ACTIVE", platformType: "MOBILE", audience: "CUSTOMER", startDate: "bad-date", endDate: "bad-date" },
      { id: 5, status: "", platformType: "ALL", audience: "ALL", city: "ALL" },
      { id: 6, platformType: "ANDROID_IOS", audience: "BOTH" },
      { id: 7, platformType: "CUSTOMER" },
      { id: 2, status: "INACTIVE" },
      { id: 3, status: "TRUE", platformType: "WEB" },
      { id: 4, status: "1", audience: "PARTNER" },
    ]);
    mockApi.getCategories.mockResolvedValue([
      { categoryId: 2, activeStatus: true, displayOrder: 2 },
      { id: 1, status: "active", displayOrder: 1 },
      { id: 3, status: "disabled" },
      { id: 4, activeStatus: false },
      { status: undefined, displayOrder: undefined },
    ]);
    mockApi.getPopularServicesByCategory
      .mockResolvedValueOnce([{ id: 10 }, { serviceId: 11 }])
      .mockResolvedValueOnce([{ id: 10, name: "duplicate" }, { name: "anonymous" }]);
    const store = storeFor("home", homeReducer);
    await store.dispatch(fetchHomeData());

    expect(store.getState().home).toMatchObject({ loading: false, error: null });
    expect(store.getState().home.banners.map((row: any) => row.id)).toEqual([1, 5, 6, 7]);
    expect(store.getState().home.categories.map((row: any) => row.id ?? row.categoryId)).toEqual([1, 2, undefined]);
    expect(store.getState().home.popular).toHaveLength(3);
    expect(mockApi.getPopularServicesByCategory).toHaveBeenNthCalledWith(1, "1");
  });

  it("keeps original banners when every banner is filtered and tolerates partial API failure", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockApi.getBanners.mockResolvedValue([{ id: 9, status: "INACTIVE", startsAt: "2999-01-01", endsAt: "2000-01-01" }]);
    mockApi.getCategories.mockRejectedValue(Object.assign(new Error("categories failed"), { response: { status: 500 }, config: { url: "/categories" } }));
    const store = storeFor("home", homeReducer);
    await store.dispatch(fetchHomeData());
    expect(store.getState().home.banners).toEqual([expect.objectContaining({ id: 9 })]);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("rejects empty or invalid home responses", async () => {
    mockApi.getBanners.mockResolvedValue({ invalid: true });
    mockApi.getCategories.mockResolvedValue(null);
    const store = storeFor("home", homeReducer);
    await store.dispatch(fetchHomeData());
    expect(store.getState().home).toMatchObject({ loading: false, error: expect.stringContaining("Home data is empty") });
  });

  it("keeps usable categories when banners fail and skips popular lookup without category ids", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockApi.getBanners.mockRejectedValue(new Error("banners failed"));
    mockApi.getCategories.mockResolvedValue([{ name: "Unidentified", activeStatus: true }]);
    const store = storeFor("home", homeReducer);
    await store.dispatch(fetchHomeData());
    expect(store.getState().home.categories).toEqual([{ name: "Unidentified", activeStatus: true }]);
    expect(mockApi.getPopularServicesByCategory).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("uses the home reducer fallback rejection message", () => {
    const state = homeReducer(undefined, { type: fetchHomeData.rejected.type, error: {} });
    expect(state.error).toBe("Failed to load home");
  });
});

describe("serviceSlice", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads, refreshes, appends, and clears service state", async () => {
    mockApi.fetchCustomerServicesByCategory
      .mockResolvedValueOnce(Array.from({ length: 20 }, (_, id) => ({ id })))
      .mockResolvedValueOnce([{ id: 21 }])
      .mockResolvedValueOnce([{ id: 22 }]);
    const store = storeFor("service", serviceReducer);
    const first = store.dispatch(fetchServicesByCategory({ categoryId: "cleaning" }));
    expect(store.getState().service.loading).toBe(true);
    await first;
    expect(store.getState().service).toMatchObject({ hasMore: true, page: 0 });

    const refresh = store.dispatch(fetchServicesByCategory({ categoryId: "cleaning", page: 0 }));
    expect(store.getState().service.refreshing).toBe(true);
    await refresh;
    const append = store.dispatch(fetchServicesByCategory({ categoryId: "cleaning", page: 1, size: 10, append: true }));
    expect(store.getState().service.loadingMore).toBe(true);
    await append;
    expect(store.getState().service).toMatchObject({ page: 1, hasMore: false });
    expect(store.getState().service.services.map((row: any) => row.id)).toEqual([21, 22]);
    store.dispatch(clearServices());
    expect(store.getState().service).toMatchObject({ services: [], banners: [], page: 0, hasMore: true, activeCategoryId: null });
  });

  it("loads banners and records service and banner failures", async () => {
    mockApi.fetchCustomerBannersByCategory.mockResolvedValueOnce([{ id: 1 }]).mockRejectedValueOnce(new Error("banner failed"));
    mockApi.fetchCustomerServicesByCategory.mockRejectedValueOnce(new Error("service failed"));
    const store = storeFor("service", serviceReducer);
    await store.dispatch(fetchBannersByCategory({ categoryId: 4 }));
    expect(store.getState().service.banners).toEqual([{ id: 1 }]);
    await store.dispatch(fetchBannersByCategory({ categoryId: 4 }));
    await store.dispatch(fetchServicesByCategory({ categoryId: 4, page: 2 }));
    expect(store.getState().service).toMatchObject({ bannersError: "banner failed", error: "service failed", loadingMore: false });
  });
});

describe("booking and favorites slices", () => {
  beforeEach(() => jest.clearAllMocks());

  it("handles booking and favorites success and failure state transitions", async () => {
    mockApi.getBookingsHistory.mockResolvedValueOnce([{ id: "B1" }]).mockRejectedValueOnce(new Error("booking failed"));
    mockApi.getFavorites.mockResolvedValueOnce([{ id: 1 }]).mockRejectedValueOnce(new Error("favorites failed"));
    const bookingStore = storeFor("booking", bookingReducer);
    const favoritesStore = storeFor("favorites", favoritesReducer);
    await bookingStore.dispatch(fetchBookingHistory());
    await favoritesStore.dispatch(fetchFavorites());
    expect(bookingStore.getState().booking.history).toEqual([{ id: "B1" }]);
    expect(favoritesStore.getState().favorites.list).toEqual([{ id: 1 }]);
    await bookingStore.dispatch(fetchBookingHistory());
    await favoritesStore.dispatch(fetchFavorites());
    expect(bookingStore.getState().booking.error).toBe("booking failed");
    expect(favoritesStore.getState().favorites.error).toBe("favorites failed");
  });

  it("uses reducer fallback messages for rejected actions without messages", () => {
    expect(bookingReducer(undefined, { type: fetchBookingHistory.rejected.type, error: {} }).error).toBe("Failed to load bookings");
    expect(favoritesReducer(undefined, { type: fetchFavorites.rejected.type, error: {} }).error).toBe("Favorites load failed");
  });
});

describe("customerProfileSlice", () => {
  const profile = { id: "1", firstName: "Shiv" };

  beforeEach(() => jest.clearAllMocks());

  it("does not optimistically update a missing profile and resets errors", () => {
    const initial = profileReducer(undefined, { type: "init" });
    expect(profileReducer(initial, setProfileOptimistic({ firstName: "New" }))).toBe(initial);
    expect(profileReducer({ ...initial, error: "old" }, resetProfileError()).error).toBeNull();
  });

  it("loads profile bundle and applies optimistic updates", async () => {
    mockApi.getCustomerProfile.mockResolvedValue(profile);
    mockApi.getCustomerAddresses.mockResolvedValue([{ id: "A1" }]);
    mockApi.getCustomerProfileContent.mockResolvedValue({ title: "Profile" });
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1234);
    const store = storeFor("customerProfile", profileReducer);
    await store.dispatch(refreshProfileBundleThunk());
    expect(store.getState().customerProfile).toMatchObject({
      profile,
      addresses: [{ id: "A1" }],
      content: { title: "Profile" },
      status: "success",
      lastUpdatedAt: 1234,
    });
    store.dispatch(setProfileOptimistic({ firstName: "Updated" }));
    expect(store.getState().customerProfile.profile.firstName).toBe("Updated");
    nowSpy.mockRestore();
  });

  it("updates profile and email through success and error paths", async () => {
    mockApi.updateCustomerProfile.mockResolvedValueOnce({ ...profile, name: "Updated" }).mockRejectedValueOnce(new Error("profile failed"));
    mockApi.updateCustomerEmail.mockResolvedValueOnce({ ...profile, email: "a@b.com" }).mockRejectedValueOnce(new Error("email failed"));
    const store = storeFor("customerProfile", profileReducer);
    await store.dispatch(updateCustomerProfileThunk({ name: "Updated" } as any));
    expect(store.getState().customerProfile.profile.name).toBe("Updated");
    await store.dispatch(updateCustomerProfileThunk({ name: "Bad" } as any));
    expect(store.getState().customerProfile.error).toBe("profile failed");
    await store.dispatch(updateCustomerEmailThunk("a@b.com"));
    expect(mockApi.updateCustomerEmail).toHaveBeenCalledWith({ email: "a@b.com" });
    await store.dispatch(updateCustomerEmailThunk("bad"));
    expect(store.getState().customerProfile).toMatchObject({ saveStatus: "error", error: "email failed" });
  });

  it("uploads, deletes, and requests account deletion", async () => {
    mockApi.uploadCustomerProfileImage.mockResolvedValueOnce({ ...profile, avatar: "image" }).mockRejectedValueOnce(new Error("upload failed"));
    mockApi.deleteCustomerProfileImage.mockResolvedValue({ ...profile, avatar: null });
    mockApi.requestAccountDelete.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error("delete failed"));
    const store = storeFor("customerProfile", profileReducer);
    await store.dispatch(uploadCustomerProfileImageThunk({ uri: "file://image" } as any));
    expect(store.getState().customerProfile.imageUploadStatus).toBe("success");
    await store.dispatch(uploadCustomerProfileImageThunk({ uri: "bad" } as any));
    expect(store.getState().customerProfile.error).toBe("upload failed");
    await store.dispatch(deleteCustomerProfileImageThunk());
    expect(store.getState().customerProfile.profile.avatar).toBeNull();
    await store.dispatch(requestAccountDeleteThunk());
    expect(store.getState().customerProfile.accountDeleteStatus).toBe("success");
    await store.dispatch(requestAccountDeleteThunk());
    expect(store.getState().customerProfile).toMatchObject({ accountDeleteStatus: "error", error: "delete failed" });
  });

  it("covers load failures and reducer fallback errors", async () => {
    mockApi.getCustomerProfile.mockRejectedValue(new Error("load failed"));
    const store = storeFor("customerProfile", profileReducer);
    await store.dispatch(fetchCustomerProfileThunk());
    expect(store.getState().customerProfile).toMatchObject({ status: "error", error: "load failed" });
    expect(profileReducer(undefined, { type: updateCustomerProfileThunk.rejected.type, error: {} }).error).toBe("Failed to update profile");
    expect(profileReducer(undefined, { type: updateCustomerEmailThunk.rejected.type, error: {} }).error).toBe("Failed to update email");
    expect(profileReducer(undefined, { type: uploadCustomerProfileImageThunk.rejected.type, error: {} }).error).toBe("Failed to upload image");
    expect(profileReducer(undefined, { type: requestAccountDeleteThunk.rejected.type, error: {} }).error).toBe("Failed to request account deletion");
  });

  it("dispatches the individual profile content and address thunks", async () => {
    mockApi.getCustomerAddresses.mockResolvedValue([]);
    mockApi.getCustomerProfileContent.mockResolvedValue(null);
    const store = storeFor("customerProfile", profileReducer);
    await store.dispatch(fetchCustomerAddressesThunk());
    await store.dispatch(fetchCustomerProfileContentThunk());
    expect(store.getState().customerProfile).toMatchObject({ addresses: [], content: null });
  });
});
