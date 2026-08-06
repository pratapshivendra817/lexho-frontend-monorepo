import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  deleteAddress,
  getAllAddresses,
  getCurrentAddress,
  saveAddress,
  setDefaultAddress,
  updateAddress,
  updateCurrentLocation,
} from "../services/locationService";

const LOCATION_CACHE_KEY = "@lexho/customer/location-state";

type Address = {
  id: string;
  label?: string;
  addressLine?: string;
  flatNo?: string;
  floor?: string;
  buildingName?: string;
  landmark?: string;
  area?: string;
  sector?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  mobile?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  mocked?: boolean;
};

type LocationState = {
  currentLocation: Coordinates | null;
  currentAddress: Address | null;
  selectedAddress: Address | null;
  savedAddresses: Address[];
  serviceAvailable: boolean | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: LocationState = {
  currentLocation: null,
  currentAddress: null,
  selectedAddress: null,
  savedAddresses: [],
  serviceAvailable: null,
  loading: false,
  saving: false,
  error: null,
};

function areLocationsNearlySame(a: Coordinates | null, b: Coordinates | null): boolean {
  if (!a || !b) return false;
  const latDiff = Math.abs(Number(a.latitude ?? 0) - Number(b.latitude ?? 0));
  const lngDiff = Math.abs(Number(a.longitude ?? 0) - Number(b.longitude ?? 0));
  return latDiff < 0.0001 && lngDiff < 0.0001;
}

function areAddressesNearlySame(a: Address | null, b: Address | null): boolean {
  if (!a || !b) return false;
  const lineA = String(a.addressLine ?? "").trim().toLowerCase();
  const lineB = String(b.addressLine ?? "").trim().toLowerCase();
  const pinA = String(a.pincode ?? "").trim();
  const pinB = String(b.pincode ?? "").trim();
  const latDiff = Math.abs(Number(a.latitude ?? 0) - Number(b.latitude ?? 0));
  const lngDiff = Math.abs(Number(a.longitude ?? 0) - Number(b.longitude ?? 0));
  return lineA === lineB && pinA === pinB && latDiff < 0.0001 && lngDiff < 0.0001;
}

function hasValidAddressId(address: Address | null | undefined): boolean {
  return String(address?.id ?? "").trim().length > 0;
}

function normalizeAddress(input: any): Address {
  const rawId = input?.addressUuid ?? input?.uuid ?? input?.id ?? input?.addressId ?? "";
  const asText = (value: unknown) => String(value ?? "").trim();
  return {
    id: String(rawId ?? "").trim(),
    label: asText(input?.label ?? input?.type ?? input?.customLabel ?? "OTHER").toUpperCase(),
    addressLine: asText(input?.formattedAddress ?? input?.addressLine ?? input?.fullAddress ?? input?.area ?? input?.city ?? ""),
    flatNo: asText(input?.flatNo),
    floor: asText(input?.floor),
    buildingName: asText(input?.buildingName),
    landmark: asText(input?.landmark),
    area: asText(input?.area),
    sector: asText(input?.sector),
    city: asText(input?.city),
    state: asText(input?.state),
    country: asText(input?.country),
    pincode: asText(input?.pincode),
    mobile: asText(input?.mobile),
    latitude: Number(input?.latitude ?? input?.lat ?? 0),
    longitude: Number(input?.longitude ?? input?.lng ?? 0),
    isDefault: Boolean(input?.isDefault ?? input?.default),
  };
}

async function persistState(state: Pick<LocationState, "currentAddress" | "savedAddresses">) {
  await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(state));
}

export const hydrateLocationCacheThunk = createAsyncThunk("location/hydrate", async () => {
  const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
  if (!raw) return { currentAddress: null, savedAddresses: [] as Address[] };
  try {
    const parsed = JSON.parse(raw);
    return {
      currentAddress: parsed?.currentAddress ? normalizeAddress(parsed.currentAddress) : null,
      savedAddresses: Array.isArray(parsed?.savedAddresses)
        ? parsed.savedAddresses.map((row: any) => normalizeAddress(row)).filter((row: Address) => row.id.length > 0)
        : [],
    };
  } catch {
    return { currentAddress: null, savedAddresses: [] as Address[] };
  }
});

export const syncCurrentAddressThunk = createAsyncThunk(
  "location/syncCurrent",
  async ({ userId }: { userId: number }) => {
    const response = await getCurrentAddress(userId);
    return normalizeAddress(response?.data ?? response);
  },
);

export const fetchAllAddressesThunk = createAsyncThunk(
  "location/fetchAll",
  async ({ userId }: { userId: number }) => {
    const response = await getAllAddresses(userId, { page: 0, size: 50 });
    const rows = Array.isArray(response?.data?.items)
      ? response.data.items
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response)
            ? response
            : [];
    return rows.map((row: any) => normalizeAddress(row)).filter((row: Address) => row.id.length > 0);
  },
);

export const updateLocationAndSyncThunk = createAsyncThunk(
  "location/updateAndSync",
  async ({ userId, latitude, longitude }: { userId: number; latitude: number; longitude: number }, { dispatch }) => {
    await updateCurrentLocation({ userId, latitude, longitude });
    const current = await dispatch(syncCurrentAddressThunk({ userId })).unwrap();
    const all = await dispatch(fetchAllAddressesThunk({ userId })).unwrap();
    return { current, all };
  },
);

export const saveAddressThunk = createAsyncThunk(
  "location/saveAddress",
  async (
      payload: {
        userId: number;
        label: string;
        type?: string;
        customLabel?: string;
        flatNo?: string;
        floor?: string;
        buildingName?: string;
        landmark?: string;
        area?: string;
        sector?: string;
        state?: string;
        country?: string;
        pincode?: string;
        latitude: number;
        longitude: number;
        addressLine: string;
        city: string;
        mobile?: string;
    },
    { dispatch, getState },
  ) => {
    const created = await saveAddress(payload);
    try {
      const all = await dispatch(fetchAllAddressesThunk({ userId: payload.userId })).unwrap();
      return all;
    } catch {
      const root = getState() as any;
      const previous = Array.isArray(root?.location?.savedAddresses) ? (root.location.savedAddresses as Address[]) : [];
      const candidate = normalizeAddress(created?.data ?? created);
      if (!candidate.id || candidate.id.trim().length === 0) {
        return previous;
      }
      const next = [candidate, ...previous.filter((row) => row.id !== candidate.id)];
      return next;
    }
  },
);

export const updateAddressThunk = createAsyncThunk(
  "location/updateAddress",
  async (
      payload: {
        userId: number;
        addressId: string | number;
        label: string;
      type?: string;
      customLabel?: string;
      flatNo?: string;
      floor?: string;
      buildingName?: string;
      landmark?: string;
      area?: string;
      sector?: string;
      latitude: number;
      longitude: number;
      addressLine: string;
      city: string;
      state?: string;
      country?: string;
      pincode?: string;
      mobile?: string;
    },
    { dispatch },
  ) => {
      await updateAddress({
      id: String(payload.addressId),
      type: payload.type ?? payload.label,
      customLabel: payload.customLabel ?? payload.label,
      label: payload.label,
      flatNo: payload.flatNo,
      floor: payload.floor,
      buildingName: payload.buildingName,
      landmark: payload.landmark,
      area: payload.area,
      sector: payload.sector,
      addressLine: payload.addressLine,
      latitude: payload.latitude,
      longitude: payload.longitude,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      pincode: payload.pincode,
      mobile: payload.mobile,
    });
    const all = await dispatch(fetchAllAddressesThunk({ userId: payload.userId })).unwrap();
    const current = await dispatch(syncCurrentAddressThunk({ userId: payload.userId })).unwrap();
    return { all, current };
  },
);

export const setDefaultAddressThunk = createAsyncThunk(
  "location/setDefault",
  async ({ userId, addressId }: { userId: number; addressId: string | number }, { dispatch }) => {
    await setDefaultAddress(addressId);
    const current = await dispatch(syncCurrentAddressThunk({ userId })).unwrap();
    const all = await dispatch(fetchAllAddressesThunk({ userId })).unwrap();
    return { current, all };
  },
);

export const deleteAddressThunk = createAsyncThunk(
  "location/delete",
  async ({ userId, addressId }: { userId: number; addressId: string | number }, { dispatch }) => {
    await deleteAddress(addressId);
    const current = await dispatch(syncCurrentAddressThunk({ userId })).unwrap();
    const all = await dispatch(fetchAllAddressesThunk({ userId })).unwrap();
    return { current, all };
  },
);

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    resetLocationState: (state) => {
      state.currentLocation = null;
      state.currentAddress = null;
      state.selectedAddress = null;
      state.savedAddresses = [];
      state.serviceAvailable = null;
      state.loading = false;
      state.saving = false;
      state.error = null;
      void AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    },
    setCurrentAddressLocal: (state, action: PayloadAction<Address>) => {
      if (areAddressesNearlySame(state.currentAddress, action.payload)) return;
      state.currentAddress = action.payload;
      state.selectedAddress = action.payload;
      void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
    },
    setCurrentLocationLocal: (state, action: PayloadAction<Coordinates>) => {
      if (areLocationsNearlySame(state.currentLocation, action.payload)) return;
      state.currentLocation = action.payload;
    },
    setSelectedAddressLocal: (state, action: PayloadAction<Address | null>) => {
      state.selectedAddress = action.payload;
    },
    setServiceAvailable: (state, action: PayloadAction<boolean | null>) => {
      state.serviceAvailable = action.payload;
    },
    clearLocationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateLocationCacheThunk.fulfilled, (state, action) => {
        if (hasValidAddressId(action.payload.currentAddress)) {
          state.currentAddress = action.payload.currentAddress;
          state.selectedAddress = action.payload.currentAddress;
        } else if (action.payload.savedAddresses.length > 0 && !hasValidAddressId(state.currentAddress)) {
          state.currentAddress = action.payload.savedAddresses[0];
          state.selectedAddress = action.payload.savedAddresses[0];
        }
        state.savedAddresses = action.payload.savedAddresses;
      })
      .addCase(syncCurrentAddressThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncCurrentAddressThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (hasValidAddressId(action.payload)) {
          state.currentAddress = action.payload;
          state.selectedAddress = action.payload;
        }
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      })
      .addCase(syncCurrentAddressThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to sync current address";
      })
      .addCase(fetchAllAddressesThunk.fulfilled, (state, action) => {
        state.savedAddresses = action.payload;
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      })
      .addCase(updateLocationAndSyncThunk.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateLocationAndSyncThunk.fulfilled, (state, action) => {
        state.saving = false;
        if (hasValidAddressId(action.payload.current)) {
          state.currentAddress = action.payload.current;
          state.selectedAddress = action.payload.current;
        }
        state.savedAddresses = action.payload.all;
        if (!hasValidAddressId(state.currentAddress) && action.payload.all.length > 0) {
          state.currentAddress = action.payload.all[0];
          state.selectedAddress = action.payload.all[0];
        }
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      })
      .addCase(updateLocationAndSyncThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? "Failed to update location";
      })
      .addCase(saveAddressThunk.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveAddressThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.savedAddresses = action.payload;
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      })
      .addCase(saveAddressThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? "Failed to save address";
      })
      .addCase(updateAddressThunk.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateAddressThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.savedAddresses = action.payload.all;
        if (hasValidAddressId(action.payload.current)) {
          state.currentAddress = action.payload.current;
          state.selectedAddress = action.payload.current;
        }
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      })
      .addCase(updateAddressThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? "Failed to update address";
      })
      .addCase(setDefaultAddressThunk.fulfilled, (state, action) => {
        if (hasValidAddressId(action.payload.current)) {
          state.currentAddress = action.payload.current;
          state.selectedAddress = action.payload.current;
        }
        state.savedAddresses = action.payload.all;
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      })
      .addCase(deleteAddressThunk.fulfilled, (state, action) => {
        if (hasValidAddressId(action.payload.current)) {
          state.currentAddress = action.payload.current;
          state.selectedAddress = action.payload.current;
        }
        state.savedAddresses = action.payload.all;
        void persistState({ currentAddress: state.currentAddress, savedAddresses: state.savedAddresses });
      });
  },
});

export const {
  clearLocationError,
  resetLocationState,
  setCurrentAddressLocal,
  setCurrentLocationLocal,
  setSelectedAddressLocal,
  setServiceAvailable,
} = locationSlice.actions;
export default locationSlice.reducer;


