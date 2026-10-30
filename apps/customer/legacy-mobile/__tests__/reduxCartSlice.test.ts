import { configureStore } from "@reduxjs/toolkit";

const mockCartApi = {
  addCustomerCartItem: jest.fn(),
  clearCustomerCart: jest.fn(),
  getCustomerAddresses: jest.fn(),
  getCustomerCart: jest.fn(),
  getCartPolicy: jest.fn(),
  patchCustomerCartMeta: jest.fn(),
  removeCustomerCartItem: jest.fn(),
  updateCustomerCartItem: jest.fn(),
};
const mockStorage = {
  getCartSnapshot: jest.fn(),
  saveCartSnapshot: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../src/api/cartApi", () => ({
  addCustomerCartItem: (...args: any[]) => mockCartApi.addCustomerCartItem(...args),
  clearCustomerCart: (...args: any[]) => mockCartApi.clearCustomerCart(...args),
  getCustomerAddresses: (...args: any[]) => mockCartApi.getCustomerAddresses(...args),
  getCustomerCart: (...args: any[]) => mockCartApi.getCustomerCart(...args),
  getCartPolicy: (...args: any[]) => mockCartApi.getCartPolicy(...args),
  patchCustomerCartMeta: (...args: any[]) => mockCartApi.patchCustomerCartMeta(...args),
  removeCustomerCartItem: (...args: any[]) => mockCartApi.removeCustomerCartItem(...args),
  updateCustomerCartItem: (...args: any[]) => mockCartApi.updateCustomerCartItem(...args),
}));
jest.mock("../src/services/storage", () => ({
  getCartSnapshot: (...args: any[]) => mockStorage.getCartSnapshot(...args),
  saveCartSnapshot: (...args: any[]) => mockStorage.saveCartSnapshot(...args),
}));

import cartReducer, {
  addToCartThunk,
  clearCartThunk,
  clearRecentlyAdded,
  clearSelectedAddressId,
  fetchCartPolicyThunk,
  fetchCustomerAddressesThunk,
  fetchCustomerCartThunk,
  lockCartUntilPayment,
  removeCartItemThunk,
  restoreCartSnapshotThunk,
  setRequestStatus,
  setScheduledTime,
  setSelectedAddressId,
  unlockCartAfterPayment,
  updateCartItemThunk,
  updateCartMetaThunk,
} from "../src/redux/cartSlice";

const basePolicy = {
  maxCartItems: 2,
  minServiceQuantity: 1,
  maxServiceQuantity: 5,
  maxCookQuantity: 3,
  maxOtherServiceQuantity: 4,
  minCleaningDurationHours: 0.5,
  maxCleaningDurationHours: 8,
  instantBookingWindowMinutes: 30,
  scheduledBookingWindowDays: 4,
  slotIntervalMinutes: 15,
};

const item = (overrides: Record<string, unknown> = {}) => ({
  itemId: 10,
  serviceId: 1,
  name: "Cleaning",
  quantity: 1,
  price: 100,
  totalPrice: 100,
  ...overrides,
});

const response = (overrides: Record<string, unknown> = {}) => ({
  cartId: 7,
  items: [item()],
  grandTotal: 118,
  itemTotal: 100,
  gstAmount: 18,
  serviceFee: 0,
  taxAmount: 18,
  toPay: 118,
  totalSaved: 4,
  currency: "INR",
  contactName: "Customer",
  contactPhone: "9999999999",
  address: { id: 3 },
  scheduledTime: "2026-06-13T10:00:00Z",
  requestStatus: "accepted",
  matchedPartners: 2,
  assignmentMode: "AUTO",
  ...overrides,
});

function makeStore(preloadedCart?: any) {
  return configureStore({
    reducer: { cart: cartReducer },
    preloadedState: preloadedCart ? { cart: preloadedCart } : undefined,
  } as any) as any;
}

describe("cartSlice", () => {
  it("preserves service category metadata after adding and refreshing the cart", async () => {
    const store = makeStore();
    mockCartApi.addCustomerCartItem.mockResolvedValue(response());
    await store.dispatch(addToCartThunk({ serviceId: 1, categoryId: "8", categoryName: "Cleaning Service" }));
    expect(store.getState().cart.items[0]).toMatchObject({ categoryId: "8", categoryName: "Cleaning Service" });
    mockCartApi.getCustomerCart.mockResolvedValue(response());
    await store.dispatch(fetchCustomerCartThunk());
    expect(store.getState().cart.items[0]).toMatchObject({ categoryId: "8", categoryName: "Cleaning Service" });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.saveCartSnapshot.mockResolvedValue(undefined);
  });

  it("provides initial state and handles every local cart action", () => {
    let state = cartReducer(undefined, { type: "init" });
    state = cartReducer(state, setSelectedAddressId(9));
    state = cartReducer(state, setScheduledTime("slot"));
    state = cartReducer(state, setRequestStatus("PENDING"));
    state = cartReducer({ ...state, items: [item()], recentlyAddedServiceId: 1 }, lockCartUntilPayment({ bookingId: "  B-1  " }));
    expect(state.paymentLock).toEqual({ active: true, bookingId: "B-1", itemsSnapshot: [item()] });
    state = cartReducer(state, clearRecentlyAdded());
    expect(state.recentlyAddedServiceId).toBeNull();
    expect(cartReducer(state, unlockCartAfterPayment()).paymentLock).toEqual({ active: false, bookingId: null, itemsSnapshot: [] });
    expect(cartReducer(state, lockCartUntilPayment({})).paymentLock.bookingId).toBeNull();
  });

  it("loads a cart, normalizes optional values, and stores errors", async () => {
    mockCartApi.getCustomerCart
      .mockResolvedValueOnce(response({ itemTotal: undefined, toPay: undefined, currency: undefined, requestStatus: "unknown" } as any))
      .mockRejectedValueOnce(new Error("offline"));
    const store = makeStore();

    await store.dispatch(fetchCustomerCartThunk());
    expect(store.getState().cart).toMatchObject({
      loading: false,
      itemTotal: 118,
      toPay: 118,
      currency: "INR",
      requestStatus: "IDLE",
      selectedAddressId: 3,
    });
    expect(mockStorage.saveCartSnapshot).toHaveBeenCalledWith([item()]);

    await store.dispatch(fetchCustomerCartThunk());
    expect(store.getState().cart.error).toBe("offline");
  });

  it("clears a stale cart selection after a fresh location is detected", () => {
    const initial = cartReducer(undefined, { type: "init" });
    const state = cartReducer({ ...initial, selectedAddressId: 999 }, clearSelectedAddressId());
    expect(state.selectedAddressId).toBeNull();
  });

  it("applies defensive defaults for sparse cart responses and all request statuses", () => {
    const initial: any = {
      ...cartReducer(undefined, { type: "init" }),
      currency: null,
      contactName: "Existing",
      contactPhone: "111",
      matchedPartners: null,
    };
    const sparse = {
      cartId: null,
      items: null,
      grandTotal: null,
      itemTotal: null,
      gstAmount: null,
      serviceFee: null,
      taxAmount: null,
      toPay: null,
      totalSaved: null,
      currency: null,
      contactName: null,
      contactPhone: null,
      address: null,
      requestStatus: null,
      matchedPartners: null,
      assignmentMode: null,
    };
    let state = cartReducer(initial, { type: fetchCustomerCartThunk.fulfilled.type, payload: sparse });
    expect(state).toMatchObject({ items: [], grandTotal: 0, itemTotal: 0, currency: "INR", contactName: "Existing", selectedAddressId: null });
    state = cartReducer(state, { type: fetchCustomerCartThunk.fulfilled.type, payload: { ...sparse, requestStatus: "pending" } });
    expect(state.requestStatus).toBe("PENDING");
    state = cartReducer(state, { type: fetchCustomerCartThunk.fulfilled.type, payload: { ...sparse, requestStatus: "rejected" } });
    expect(state.requestStatus).toBe("REJECTED");
  });

  it("preserves visible items while payment is locked", async () => {
    const initial = cartReducer(undefined, { type: "init" });
    const store = makeStore({
      ...initial,
      items: [item({ serviceId: 44 })],
      paymentLock: { active: true, bookingId: "B", itemsSnapshot: [item({ serviceId: 55 })] },
    });
    mockCartApi.getCustomerCart.mockResolvedValue(response({ items: [] }));
    await store.dispatch(fetchCustomerCartThunk());
    expect(store.getState().cart.items[0].serviceId).toBe(55);

    const fallbackStore = makeStore({
      ...initial,
      items: [item({ serviceId: 66 })],
      paymentLock: { active: true, bookingId: "B", itemsSnapshot: [] },
    });
    await fallbackStore.dispatch(fetchCustomerCartThunk());
    expect(fallbackStore.getState().cart.items[0].serviceId).toBe(66);
  });

  it("restores cached totals only into an empty cart and loads policy", async () => {
    mockStorage.getCartSnapshot.mockResolvedValueOnce([item(), item({ itemId: 11, totalPrice: undefined, price: 40 })]).mockResolvedValueOnce(null);
    mockCartApi.getCartPolicy.mockResolvedValueOnce(basePolicy).mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(restoreCartSnapshotThunk());
    expect(store.getState().cart).toMatchObject({ itemTotal: 140, grandTotal: 140, toPay: 140 });
    await store.dispatch(restoreCartSnapshotThunk());
    expect(store.getState().cart.items).toHaveLength(2);
    await store.dispatch(fetchCartPolicyThunk());
    expect(store.getState().cart.policy).toEqual(basePolicy);
    await store.dispatch(fetchCartPolicyThunk());
    expect(store.getState().cart.policy.maxCartItems).toBe(10);
  });

  it.each([0, "0", "", 101])("preserves the saved UUID when a cart refresh returns address %s", incomingId => {
    const initial = cartReducer(undefined, { type: "init" });
    const id = "b5f02d8a-b64b-4329-89f7-a7daa1f67ef5";
    const state = cartReducer({ ...initial, selectedAddressId: id, addresses: [{ id, fullAddress: "201, Jangle house" }] }, {
      type: fetchCustomerCartThunk.fulfilled.type,
      payload: { items: [], address: { id: incomingId } },
    });
    expect(state.selectedAddressId).toBe(id);
  });

  it("selects current, default, first, or no address during refresh", async () => {
    const initial = cartReducer(undefined, { type: "init" });
    mockCartApi.getCustomerAddresses
      .mockResolvedValueOnce([{ id: 2 }, { id: 3, default: true }])
      .mockResolvedValueOnce([{ id: 4, default: true }])
      .mockResolvedValueOnce([{ id: 5 }])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("address offline"));
    const selectedStore = makeStore({ ...initial, selectedAddressId: 2 });
    await selectedStore.dispatch(fetchCustomerAddressesThunk());
    expect(selectedStore.getState().cart.selectedAddressId).toBe(2);

    const store = makeStore();
    await store.dispatch(fetchCustomerAddressesThunk());
    expect(store.getState().cart.selectedAddressId).toBe(4);
    store.dispatch(setSelectedAddressId(null));
    await store.dispatch(fetchCustomerAddressesThunk());
    expect(store.getState().cart.selectedAddressId).toBe(5);
    await store.dispatch(fetchCustomerAddressesThunk());
    await store.dispatch(fetchCustomerAddressesThunk());
    expect(store.getState().cart).toMatchObject({ refreshing: false, error: "address offline" });
  });

  it("adds new items and updates matching existing items", async () => {
    mockCartApi.addCustomerCartItem.mockResolvedValue(response({ items: [item({ serviceId: 8 })] }));
    mockCartApi.updateCustomerCartItem.mockResolvedValue(response({ items: [item({ serviceId: 1, quantity: 2 })] }));
    const store = makeStore();
    await store.dispatch(addToCartThunk({ serviceId: 8, quantity: 0, addons: [{ id: 1 }] as any }));
    expect(mockCartApi.addCustomerCartItem).toHaveBeenCalledWith(expect.objectContaining({ serviceId: 8, quantity: 1 }));
    expect(store.getState().cart.recentlyAddedServiceId).toBe(8);

    const initial = cartReducer(undefined, { type: "init" });
    const existingStore = makeStore({ ...initial, items: [item()], policy: basePolicy });
    await existingStore.dispatch(addToCartThunk({ serviceId: 1 }));
    expect(mockCartApi.updateCustomerCartItem).toHaveBeenCalledWith({ itemId: 10, quantity: 2 });

    const familyStore = makeStore({
      ...initial,
      items: [item({ familySize: "small" })],
      policy: basePolicy,
    });
    await familyStore.dispatch(addToCartThunk({ serviceId: 1, familySize: "SMALL" }));
    expect(mockCartApi.updateCustomerCartItem).toHaveBeenLastCalledWith({ itemId: 10, quantity: 2 });
  });

  it("uses default policy when cart state is unavailable", async () => {
    mockCartApi.addCustomerCartItem.mockResolvedValue(response());
    const store = configureStore({ reducer: { dummy: (state = {}) => state } }) as any;
    const result = await store.dispatch(addToCartThunk({ serviceId: 99 }));
    expect(result.type).toBe(addToCartThunk.fulfilled.type);
    expect(mockCartApi.addCustomerCartItem).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1 }));
  });

  it("enforces cart and service quantity limits, including cook variants", async () => {
    const initial = cartReducer(undefined, { type: "init" });
    const fullStore = makeStore({ ...initial, items: [item(), item({ itemId: 11, serviceId: 2 })], policy: basePolicy });
    const fullResult = await fullStore.dispatch(addToCartThunk({ serviceId: 3 }));
    expect(fullResult.payload).toBe("Cart limit exceeded. Maximum 2 services allowed.");

    const quantityStore = makeStore({ ...initial, items: [item({ quantity: 4 })], policy: basePolicy });
    expect((await quantityStore.dispatch(addToCartThunk({ serviceId: 1 }))).payload).toBe("Quantity exceeded. Maximum 4 allowed per service.");

    const cookStore = makeStore({ ...initial, items: [item({ familySizeId: 2, quantity: 3 })], policy: basePolicy });
    expect((await cookStore.dispatch(addToCartThunk({ serviceId: 1, familySizeId: 2 }))).payload).toBe("Quantity exceeded. Maximum 3 allowed per service.");
    expect(cookStore.getState().cart.error).toContain("Quantity exceeded");
  });

  it("updates regular and cook quantities and handles rejected updates", async () => {
    const initial = cartReducer(undefined, { type: "init" });
    const store = makeStore({ ...initial, items: [item(), item({ itemId: 20, familySize: "SMALL" })], policy: basePolicy });
    mockCartApi.updateCustomerCartItem.mockResolvedValue(response());
    await store.dispatch(updateCartItemThunk({ itemId: 10, quantity: 0 }));
    expect(mockCartApi.updateCustomerCartItem).toHaveBeenLastCalledWith(expect.objectContaining({ quantity: 1 }));
    await store.dispatch(updateCartItemThunk({ itemId: 10 }));
    expect(mockCartApi.updateCustomerCartItem).toHaveBeenLastCalledWith(expect.objectContaining({ quantity: undefined }));
    expect((await store.dispatch(updateCartItemThunk({ itemId: 20, quantity: 4, familySize: "SMALL" }))).payload).toContain("Maximum 3");
    mockCartApi.updateCustomerCartItem.mockRejectedValueOnce(new Error("update failed"));
    await store.dispatch(updateCartItemThunk({ itemId: 10, quantity: 2 }));
    expect(store.getState().cart.error).toBe("update failed");
  });

  it("removes and clears items through their APIs", async () => {
    mockCartApi.removeCustomerCartItem.mockResolvedValue(response({ items: [] }));
    mockCartApi.clearCustomerCart.mockResolvedValue(response({ items: [], grandTotal: 0 }));
    const store = makeStore();
    await store.dispatch(removeCartItemThunk(10));
    expect(mockCartApi.removeCustomerCartItem).toHaveBeenCalledWith(10);
    await store.dispatch(clearCartThunk());
    expect(mockCartApi.clearCustomerCart).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveCartSnapshot).toHaveBeenLastCalledWith([]);
  });

  it("updates cart metadata while preserving local selections and handles failure", async () => {
    mockCartApi.patchCustomerCartMeta
      .mockResolvedValueOnce(response({ scheduledTime: null, address: null }))
      .mockResolvedValueOnce(response({ scheduledTime: "server", address: { id: 8 } }))
      .mockRejectedValueOnce(new Error("meta failed"));
    const initial = cartReducer(undefined, { type: "init" });
    const store = makeStore({ ...initial, scheduledTime: "local", selectedAddressId: 6 });
    await store.dispatch(updateCartMetaThunk({ addressId: 6, scheduledTime: "local" }));
    expect(store.getState().cart).toMatchObject({ scheduledTime: "local", selectedAddressId: 6 });
    store.dispatch(setScheduledTime(null));
    await store.dispatch(updateCartMetaThunk({ addressId: 8, scheduledTime: "server" }));
    expect(store.getState().cart).toMatchObject({ scheduledTime: "server", selectedAddressId: 8 });
    await store.dispatch(updateCartMetaThunk({ addressId: 8, scheduledTime: "server" }));
    expect(store.getState().cart.error).toBe("meta failed");
  });

  it("uses fallback reducer errors and handles empty add responses", () => {
    expect(cartReducer(undefined, { type: fetchCustomerCartThunk.rejected.type, error: {} }).error).toBe("Cart load failed");
    expect(cartReducer(undefined, { type: fetchCustomerAddressesThunk.rejected.type, error: {} }).error).toBe("Address load failed");
    expect(cartReducer(undefined, { type: addToCartThunk.rejected.type, error: {} }).error).toBe("Add to cart failed");
    expect(cartReducer(undefined, { type: updateCartItemThunk.rejected.type, error: {} }).error).toBe("Update quantity failed");
    expect(cartReducer(undefined, { type: updateCartMetaThunk.rejected.type, error: {} }).error).toBe("Update cart meta failed");
    const state = cartReducer(undefined, {
      type: addToCartThunk.fulfilled.type,
      payload: response({ items: [] }),
    });
    expect(state.recentlyAddedServiceId).toBeNull();
  });
});
