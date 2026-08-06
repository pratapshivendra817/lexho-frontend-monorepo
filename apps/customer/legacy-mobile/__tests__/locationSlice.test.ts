import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";

const mockService = {
  updateCurrentLocation: jest.fn(),
  saveAddress: jest.fn(),
  updateAddress: jest.fn(),
  getCurrentAddress: jest.fn(),
  getAllAddresses: jest.fn(),
  setDefaultAddress: jest.fn(),
  deleteAddress: jest.fn(),
};

jest.mock("../src/services/locationService", () => ({
  updateCurrentLocation: (...args: any[]) =>
    mockService.updateCurrentLocation(...args),
  saveAddress: (...args: any[]) => mockService.saveAddress(...args),
  updateAddress: (...args: any[]) => mockService.updateAddress(...args),
  getCurrentAddress: (...args: any[]) => mockService.getCurrentAddress(...args),
  getAllAddresses: (...args: any[]) => mockService.getAllAddresses(...args),
  setDefaultAddress: (...args: any[]) =>
    mockService.setDefaultAddress(...args),
  deleteAddress: (...args: any[]) => mockService.deleteAddress(...args),
}));
jest.mock("../src/api/addressApi", () => ({
  getAddressList: jest.fn(),
}));

import locationReducer, {
  clearLocationError,
  deleteAddressThunk,
  fetchAllAddressesThunk,
  hydrateLocationCacheThunk,
  resetLocationState,
  saveAddressThunk,
  setCurrentAddressLocal,
  setCurrentLocationLocal,
  setDefaultAddressThunk,
  setSelectedAddressLocal,
  setServiceAvailable,
  syncCurrentAddressThunk,
  updateAddressThunk,
  updateLocationAndSyncThunk,
} from "../src/redux/locationSlice";
import addressReducer, { fetchAddresses } from "../src/redux/addressSlice";
import { getAddressList } from "../src/api/addressApi";

function locationStore(preloadedState?: any) {
  return configureStore({
    reducer: { location: locationReducer },
    preloadedState,
  } as any) as any;
}

describe("locationSlice reducers and thunks", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("covers local state transitions, duplicate guards, and reset", () => {
    let state = locationReducer(undefined, { type: "init" });
    state = locationReducer(
      state,
      setCurrentLocationLocal({ latitude: 22.7, longitude: 75.8 }),
    );
    const sameLocation = locationReducer(
      state,
      setCurrentLocationLocal({ latitude: 22.70001, longitude: 75.80001 }),
    );
    expect(sameLocation).toBe(state);

    state = locationReducer(
      state,
      setCurrentAddressLocal({
        id: "1",
        addressLine: "Vijay Nagar",
        pincode: "452010",
        latitude: 22.7,
        longitude: 75.8,
      }),
    );
    expect(state.selectedAddress?.id).toBe("1");
    const sameAddress = locationReducer(
      state,
      setCurrentAddressLocal({
        id: "other",
        addressLine: " vijay nagar ",
        pincode: "452010",
        latitude: 22.70001,
        longitude: 75.80001,
      }),
    );
    expect(sameAddress).toBe(state);

    state = locationReducer(state, setSelectedAddressLocal(null));
    state = locationReducer(state, setServiceAvailable(false));
    state = locationReducer({ ...state, error: "failed" }, clearLocationError());
    expect(state).toMatchObject({
      selectedAddress: null,
      serviceAvailable: false,
      error: null,
    });
    expect(locationReducer(state, resetLocationState())).toMatchObject({
      currentLocation: null,
      currentAddress: null,
      savedAddresses: [],
      serviceAvailable: null,
    });
  });

  it("handles missing optional coordinate and address fields in duplicate guards", () => {
    let state = locationReducer(undefined, setCurrentLocationLocal({} as any));
    expect(locationReducer(state, setCurrentLocationLocal({} as any))).toBe(state);
    state = locationReducer(state, setCurrentAddressLocal({ id: "empty" } as any));
    expect(locationReducer(state, setCurrentAddressLocal({ id: "other" } as any))).toBe(state);
  });

  it("hydrates valid, fallback, empty, and corrupted cache states", async () => {
    const store = locationStore();
    await AsyncStorage.setItem(
      "@lexho/customer/location-state",
      JSON.stringify({
        currentAddress: { addressUuid: "current", formattedAddress: "Current" },
        savedAddresses: [
          { uuid: "saved", type: "home", fullAddress: "Saved", lat: 1, lng: 2 },
          { city: "invalid" },
        ],
      }),
    );
    await store.dispatch(hydrateLocationCacheThunk());
    expect(store.getState().location).toMatchObject({
      currentAddress: { id: "current", addressLine: "Current" },
      savedAddresses: [expect.objectContaining({ id: "saved", label: "HOME" })],
    });

    await AsyncStorage.setItem(
      "@lexho/customer/location-state",
      JSON.stringify({ savedAddresses: [{ id: "first", addressLine: "First" }] }),
    );
    const fallbackStore = locationStore();
    await fallbackStore.dispatch(hydrateLocationCacheThunk());
    expect(fallbackStore.getState().location.currentAddress?.id).toBe("first");

    await AsyncStorage.setItem("@lexho/customer/location-state", "{broken");
    const corruptStore = locationStore();
    await corruptStore.dispatch(hydrateLocationCacheThunk());
    expect(corruptStore.getState().location.savedAddresses).toEqual([]);

    await AsyncStorage.removeItem("@lexho/customer/location-state");
    const emptyStore = locationStore();
    await emptyStore.dispatch(hydrateLocationCacheThunk());
    expect(emptyStore.getState().location.currentAddress).toBeNull();

    await AsyncStorage.setItem("@lexho/customer/location-state", JSON.stringify({ savedAddresses: "invalid" }));
    const invalidListStore = locationStore();
    await invalidListStore.dispatch(hydrateLocationCacheThunk());
    expect(invalidListStore.getState().location.savedAddresses).toEqual([]);
  });

  it("normalizes alternate address field names and empty address responses", async () => {
    mockService.getCurrentAddress
      .mockResolvedValueOnce({
        id: "alternate",
        customLabel: "work",
        fullAddress: "Full address",
        lat: "12.5",
        lng: "77.5",
        default: true,
      })
      .mockResolvedValueOnce({ uuid: "area", type: "home", area: "Area only" });
    mockService.getAllAddresses.mockResolvedValue({ invalid: true });
    const store = locationStore();
    await store.dispatch(syncCurrentAddressThunk({ userId: 1 }));
    expect(store.getState().location.currentAddress).toMatchObject({
      id: "alternate",
      label: "WORK",
      addressLine: "Full address",
      latitude: 12.5,
      longitude: 77.5,
      isDefault: true,
    });
    await store.dispatch(syncCurrentAddressThunk({ userId: 1 }));
    expect(store.getState().location.currentAddress?.addressLine).toBe("Area only");
    await store.dispatch(fetchAllAddressesThunk({ userId: 1 }));
    expect(store.getState().location.savedAddresses).toEqual([]);
  });

  it("syncs current and all address response shapes", async () => {
    mockService.getCurrentAddress.mockResolvedValue({
      data: { addressId: 9, city: "Indore", default: true },
    });
    mockService.getAllAddresses
      .mockResolvedValueOnce({ data: { items: [{ id: "1" }, { city: "bad" }] } })
      .mockResolvedValueOnce({ data: [{ id: "2" }] })
      .mockResolvedValueOnce({ items: [{ id: "3" }] })
      .mockResolvedValueOnce([{ id: "4" }]);
    const store = locationStore();

    await store.dispatch(syncCurrentAddressThunk({ userId: 1 }));
    expect(store.getState().location.currentAddress).toMatchObject({
      id: "9",
      city: "Indore",
      isDefault: true,
    });
    for (const id of ["1", "2", "3", "4"]) {
      await store.dispatch(fetchAllAddressesThunk({ userId: 1 }));
      expect(store.getState().location.savedAddresses[0].id).toBe(id);
    }
  });

  it("updates GPS and synchronizes current and saved addresses", async () => {
    mockService.updateCurrentLocation.mockResolvedValue({ ok: true });
    mockService.getCurrentAddress.mockResolvedValue({ id: "current" });
    mockService.getAllAddresses.mockResolvedValue([{ id: "all" }]);
    const store = locationStore();
    await store.dispatch(
      updateLocationAndSyncThunk({
        userId: 1,
        latitude: 22.7,
        longitude: 75.8,
      }),
    );
    expect(store.getState().location).toMatchObject({
      saving: false,
      currentAddress: { id: "current" },
      savedAddresses: [{ id: "all", label: "OTHER" }],
    });
  });

  it("falls back to the first saved address when current sync has no valid id", async () => {
    mockService.updateCurrentLocation.mockResolvedValue({ ok: true });
    mockService.getCurrentAddress.mockResolvedValue({ city: "Indore" });
    mockService.getAllAddresses.mockResolvedValue([{ id: "fallback", addressLine: "Saved" }]);
    const store = locationStore();
    await store.dispatch(
      updateLocationAndSyncThunk({ userId: 1, latitude: 22.7, longitude: 75.8 }),
    );
    expect(store.getState().location.currentAddress).toMatchObject({
      id: "fallback",
      addressLine: "Saved",
    });
    expect(store.getState().location.selectedAddress?.id).toBe("fallback");
  });

  it("saves using refreshed list and falls back to local insertion", async () => {
    mockService.saveAddress.mockResolvedValue({ data: { id: "new", label: "HOME" } });
    mockService.getAllAddresses
      .mockResolvedValueOnce([{ id: "server" }])
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockRejectedValueOnce(new Error("refresh failed"));
    const store = locationStore({
      location: {
        ...locationReducer(undefined, { type: "init" }),
        savedAddresses: [{ id: "old" }],
      },
    });
    const payload = {
      userId: 1,
      label: "HOME",
      latitude: 1,
      longitude: 2,
      addressLine: "Area",
      city: "Indore",
    };

    await store.dispatch(saveAddressThunk(payload));
    expect(store.getState().location.savedAddresses[0].id).toBe("server");
    await store.dispatch(saveAddressThunk(payload));
    expect(store.getState().location.savedAddresses.map((row: any) => row.id)).toEqual([
      "new",
      "server",
    ]);

    mockService.saveAddress.mockResolvedValueOnce({ city: "no id" });
    await store.dispatch(saveAddressThunk(payload));
    expect(store.getState().location.savedAddresses.map((row: any) => row.id)).toEqual([
      "new",
      "server",
    ]);
  });

  it("updates, defaults, and deletes addresses", async () => {
    mockService.updateAddress.mockResolvedValue({ ok: true });
    mockService.setDefaultAddress.mockResolvedValue({ ok: true });
    mockService.deleteAddress.mockResolvedValue({ ok: true });
    mockService.getCurrentAddress.mockResolvedValue({ id: "current" });
    mockService.getAllAddresses.mockResolvedValue([{ id: "one" }]);
    const store = locationStore();
    const basePayload = {
      userId: 1,
      addressId: "a b",
      label: "HOME",
      latitude: 1,
      longitude: 2,
      addressLine: "Area",
      city: "Indore",
    };

    await store.dispatch(updateAddressThunk(basePayload));
    await store.dispatch(setDefaultAddressThunk({ userId: 1, addressId: "one" }));
    await store.dispatch(deleteAddressThunk({ userId: 1, addressId: "one" }));
    expect(mockService.updateAddress).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a b", type: "HOME", customLabel: "HOME" }),
    );
    expect(store.getState().location.currentAddress?.id).toBe("current");
  });

  it("keeps current address when mutation refresh returns an invalid current address", () => {
    const initial: any = {
      ...locationReducer(undefined, { type: "init" }),
      currentAddress: { id: "existing", addressLine: "Existing" },
      selectedAddress: { id: "existing", addressLine: "Existing" },
    };
    const payload = { current: { id: "", addressLine: "Invalid" }, all: [{ id: "saved" }] };
    let state = locationReducer(initial, { type: updateAddressThunk.fulfilled.type, payload });
    expect(state.currentAddress!.id).toBe("existing");
    state = locationReducer(state, { type: setDefaultAddressThunk.fulfilled.type, payload });
    expect(state.currentAddress!.id).toBe("existing");
    state = locationReducer(state, { type: deleteAddressThunk.fulfilled.type, payload });
    expect(state.currentAddress!.id).toBe("existing");
  });

  it("uses fallback messages for rejected location actions", () => {
    expect(locationReducer(undefined, { type: syncCurrentAddressThunk.rejected.type, error: {} }).error).toBe("Failed to sync current address");
    expect(locationReducer(undefined, { type: updateLocationAndSyncThunk.rejected.type, error: {} }).error).toBe("Failed to update location");
    expect(locationReducer(undefined, { type: saveAddressThunk.rejected.type, error: {} }).error).toBe("Failed to save address");
    expect(locationReducer(undefined, { type: updateAddressThunk.rejected.type, error: {} }).error).toBe("Failed to update address");
  });

  it.each([
    [syncCurrentAddressThunk, { userId: 1 }, "sync failed"],
    [updateLocationAndSyncThunk, { userId: 1, latitude: 1, longitude: 2 }, "update failed"],
    [saveAddressThunk, { userId: 1, label: "HOME", latitude: 1, longitude: 2, addressLine: "A", city: "I" }, "save failed"],
    [updateAddressThunk, { userId: 1, addressId: "1", label: "HOME", latitude: 1, longitude: 2, addressLine: "A", city: "I" }, "edit failed"],
  ])("stores rejected thunk errors", async (thunk: any, payload, error) => {
    Object.values(mockService).forEach((mock) => mock.mockRejectedValue(new Error(error)));
    const store = locationStore();
    await store.dispatch(thunk(payload));
    expect(store.getState().location.error).toBe(error);
    expect(store.getState().location.saving).toBe(false);
    expect(store.getState().location.loading).toBe(false);
  });
});

describe("addressSlice", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads and rejects address lists", async () => {
    (getAddressList as jest.Mock).mockResolvedValueOnce([{ id: "1" }]);
    const store = configureStore({ reducer: { address: addressReducer } });
    await store.dispatch(fetchAddresses());
    expect(store.getState().address).toEqual({
      list: [{ id: "1" }],
      loading: false,
      error: null,
    });

    (getAddressList as jest.Mock).mockRejectedValueOnce(new Error("load failed"));
    await store.dispatch(fetchAddresses());
    expect(store.getState().address.error).toBe("load failed");
  });
});
