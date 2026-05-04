import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  addCustomerCartItem,
  clearCustomerCart,
  getCustomerAddresses,
  getCustomerCart,
  patchCustomerCartMeta,
  removeCustomerCartItem,
  updateCustomerCartItem,
  type CustomerCartItem,
  type CustomerCartResponse,
} from "../api/cartApi";

type AddressRow = {
  id: number;
  fullAddress: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  default?: boolean;
};

type CartState = {
  cartId: number | null;
  items: CustomerCartItem[];
  grandTotal: number;
  itemTotal: number;
  gstAmount: number;
  serviceFee: number;
  taxAmount: number;
  toPay: number;
  totalSaved: number;
  currency: string;
  contactName: string | null;
  contactPhone: string | null;
  selectedAddressId: number | null;
  scheduledTime: string | null;
  addresses: AddressRow[];
  loading: boolean;
  refreshing: boolean;
  updating: boolean;
  error: string | null;
  recentlyAddedServiceId: number | null;
  matchedPartners: number;
  assignmentMode: string | null;
  requestStatus: "IDLE" | "PENDING" | "ACCEPTED" | "REJECTED";
};

const initialState: CartState = {
  cartId: null,
  items: [],
  grandTotal: 0,
  itemTotal: 0,
  gstAmount: 0,
  serviceFee: 0,
  taxAmount: 0,
  toPay: 0,
  totalSaved: 0,
  currency: "INR",
  contactName: null,
  contactPhone: null,
  selectedAddressId: null,
  scheduledTime: null,
  addresses: [],
  loading: false,
  refreshing: false,
  updating: false,
  error: null,
  recentlyAddedServiceId: null,
  matchedPartners: 0,
  assignmentMode: null,
  requestStatus: "IDLE",
};

function applyCart(state: CartState, payload: CustomerCartResponse) {
  state.cartId = payload.cartId;
  state.items = payload.items ?? [];
  state.grandTotal = Number(payload.grandTotal ?? 0);
  state.itemTotal = Number(payload.itemTotal ?? state.grandTotal ?? 0);
  state.gstAmount = Number(payload.gstAmount ?? 0);
  state.serviceFee = Number(payload.serviceFee ?? 0);
  state.taxAmount = Number(payload.taxAmount ?? 0);
  state.toPay = Number(payload.toPay ?? payload.grandTotal ?? 0);
  state.totalSaved = Number(payload.totalSaved ?? 0);
  state.currency = payload.currency ?? state.currency ?? "INR";
  state.contactName = payload.contactName ?? state.contactName;
  state.contactPhone = payload.contactPhone ?? state.contactPhone;
  state.scheduledTime = payload.scheduledTime ?? null;
  state.selectedAddressId = payload.address?.id ?? state.selectedAddressId;
  state.requestStatus = payload.requestStatus ?? state.requestStatus;
  state.matchedPartners = Number(payload.matchedPartners ?? state.matchedPartners ?? 0);
  state.assignmentMode = payload.assignmentMode ?? state.assignmentMode;
}

export const fetchCustomerCartThunk = createAsyncThunk("cart/fetchCustomerCart", async () => {
  return await getCustomerCart();
});

export const fetchCustomerAddressesThunk = createAsyncThunk("cart/fetchCustomerAddresses", async () => {
  return await getCustomerAddresses();
});

export const addToCartThunk = createAsyncThunk(
  "cart/addToCart",
  async (payload: { serviceId: number; quantity?: number }) => {
    return await addCustomerCartItem({
      serviceId: payload.serviceId,
      quantity: payload.quantity ?? 1,
    });
  },
);

export const updateCartItemThunk = createAsyncThunk(
  "cart/updateCartItem",
  async (payload: { itemId: number; quantity: number }) => {
    return await updateCustomerCartItem(payload);
  },
);

export const removeCartItemThunk = createAsyncThunk("cart/removeCartItem", async (itemId: number) => {
  return await removeCustomerCartItem(itemId);
});

export const clearCartThunk = createAsyncThunk("cart/clearCart", async () => {
  return await clearCustomerCart();
});

export const updateCartMetaThunk = createAsyncThunk(
  "cart/updateMeta",
  async (payload: { addressId: number; scheduledTime: string }) => {
    return await patchCustomerCartMeta(payload);
  },
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    clearRecentlyAdded(state) {
      state.recentlyAddedServiceId = null;
    },
    setSelectedAddressId(state, action: { payload: number | null }) {
      state.selectedAddressId = action.payload;
    },
    setScheduledTime(state, action: { payload: string | null }) {
      state.scheduledTime = action.payload;
    },
    setRequestStatus(state, action: { payload: "IDLE" | "PENDING" | "ACCEPTED" | "REJECTED" }) {
      state.requestStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerCartThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerCartThunk.fulfilled, (state, action) => {
        state.loading = false;
        applyCart(state, action.payload);
      })
      .addCase(fetchCustomerCartThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Cart load failed";
      })
      .addCase(fetchCustomerAddressesThunk.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(fetchCustomerAddressesThunk.fulfilled, (state, action) => {
        state.refreshing = false;
        state.addresses = action.payload;
        if (!state.selectedAddressId && action.payload.length > 0) {
          state.selectedAddressId = action.payload.find((row) => row.default)?.id ?? action.payload[0].id;
        }
      })
      .addCase(fetchCustomerAddressesThunk.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.error.message ?? "Address load failed";
      })
      .addCase(addToCartThunk.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(addToCartThunk.fulfilled, (state, action) => {
        state.updating = false;
        applyCart(state, action.payload);
        const firstItem = action.payload.items[action.payload.items.length - 1];
        state.recentlyAddedServiceId = firstItem?.serviceId ?? null;
      })
      .addCase(addToCartThunk.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message ?? "Add to cart failed";
      })
      .addCase(updateCartItemThunk.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateCartItemThunk.fulfilled, (state, action) => {
        state.updating = false;
        applyCart(state, action.payload);
      })
      .addCase(updateCartItemThunk.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message ?? "Update quantity failed";
      })
      .addCase(removeCartItemThunk.fulfilled, (state, action) => {
        applyCart(state, action.payload);
      })
      .addCase(clearCartThunk.fulfilled, (state, action) => {
        applyCart(state, action.payload);
      })
      .addCase(updateCartMetaThunk.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateCartMetaThunk.fulfilled, (state, action) => {
        state.updating = false;
        applyCart(state, action.payload);
      })
      .addCase(updateCartMetaThunk.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message ?? "Update cart meta failed";
      });
  },
});

export const { clearRecentlyAdded, setSelectedAddressId, setScheduledTime, setRequestStatus } = cartSlice.actions;
export default cartSlice.reducer;
