import {
  addCustomerCartItem, addToCart, clearCustomerCart, getAvailableTimeSlots, getCart,
  getCartPolicy, getCustomerAddresses, getCustomerCart, patchCustomerCartMeta,
  removeCartItem, removeCustomerCartItem, removeFromCart, updateCart, updateCustomerCartItem,
} from "../src/api/cartApi";

jest.mock("../src/api/client", () => {
  return {
    api: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
    parseApiError: (e: any, fallback: string) => e?.message || fallback,
  };
});

const { api } = jest.requireMock("../src/api/client") as { api: { get: jest.Mock } };

describe("cartApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps cart item name and imageUrl from nested service payload", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          cartId: 1,
          items: [
            {
              itemId: 10,
              serviceId: 99,
              service: {
                name: "Fridge Cleaning",
                imageUrl: "https://cdn.example.com/fridge.png",
              },
              price: 149,
              quantity: 1,
              totalPrice: 149,
            },
          ],
          grandTotal: 149,
        },
      },
    });

    const cart = await getCustomerCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].name).toBe("Fridge Cleaning");
    expect(cart.items[0].imageUrl).toBe("https://cdn.example.com/fridge.png");
  });

  it("parses slots array from backend slot objects", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          slots: [
            { label: "11:00-13:00" },
            { startTime: "13:00" },
            { time: "15:00" },
          ],
        },
      },
    });

    const slots = await getAvailableTimeSlots("2026-05-05");
    expect(api.get).toHaveBeenCalledWith("/api/customer/cart/slots", {
      params: { date: "2026-05-05" },
    });
    expect(slots).toHaveLength(68);
    expect(slots[0]).toEqual({
      slot: "06:00-06:15",
      available: true,
      instantEligible: false,
      etaMinutes: 999,
    });
  });

  it("returns fallback full-day slot list when slots API fails", async () => {
    api.get.mockRejectedValueOnce(new Error("network error"));
    const slots = await getAvailableTimeSlots("2026-05-05");
    expect(slots).toHaveLength(68);
    expect(slots[slots.length - 1]).toEqual({
      slot: "22:45-23:00",
      available: true,
      instantEligible: false,
      etaMinutes: 999,
    });
  });

  it("loads cart policy from fallback endpoints or defaults", async () => {
    (api as any).get
      .mockRejectedValueOnce(new Error("first"))
      .mockResolvedValueOnce({ data: { maxCartItems: 4, minServiceQuantity: 2 } });
    await expect(getCartPolicy()).resolves.toMatchObject({ maxCartItems: 4, minServiceQuantity: 2 });
    (api as any).get.mockRejectedValue(new Error("all"));
    await expect(getCartPolicy()).resolves.toMatchObject({ maxCartItems: 10 });
  });

  it("adds a cart item with normalized addons and assignment metadata", async () => {
    (api as any).post.mockResolvedValueOnce({ data: { data: { matchedPartners: "2", assignmentMode: "AUTO" } } });
    (api as any).get.mockResolvedValueOnce({ data: { data: { cartId: 1, items: [], grandTotal: 0 } } });
    await expect(addCustomerCartItem({
      serviceId: 2, quantity: 1, familySizeId: 3, familySize: "SMALL", familySizeLabel: "1-2",
      addons: [{ addonId: 8, quantity: undefined }] as any,
    })).resolves.toMatchObject({ requestStatus: "PENDING", matchedPartners: 2, assignmentMode: "AUTO" });
    expect((api as any).post).toHaveBeenCalledWith("/api/customer/cart", {
      serviceId: 2, quantity: 1, familySizeId: 3, familySize: "SMALL", familySizeLabel: "1-2",
      addons: [{ addonId: 8, quantity: 1 }],
    });
  });

  it("uses the legacy add endpoint only for 404/405", async () => {
    (api as any).post
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { matchedPartners: null } });
    (api as any).get.mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } });
    await expect(addCustomerCartItem({ serviceId: 2, quantity: 0 })).resolves.toMatchObject({ matchedPartners: 0, assignmentMode: undefined });
    expect((api as any).post).toHaveBeenNthCalledWith(2, "/api/customer/cart/add", { serviceId: 2, quantity: 0 });
    (api as any).post.mockRejectedValueOnce({ response: { status: 500 }, message: "server" });
    await expect(addCustomerCartItem({ serviceId: 2, quantity: 1 })).rejects.toThrow("server");
  });

  it("updates, removes, clears, and patches customer cart", async () => {
    (api as any).put.mockResolvedValue({ data: {} });
    (api as any).delete
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { data: { cartId: 1, items: [], grandTotal: 0 } } });
    (api as any).patch.mockResolvedValue({ data: { cartId: 1, items: [], grandTotal: 0 } });
    (api as any).get.mockResolvedValue({ data: { cartId: 1, items: [], grandTotal: 0 } });
    await expect(updateCustomerCartItem({ itemId: 1, quantity: 2 })).resolves.toMatchObject({ cartId: 1 });
    await expect(removeCustomerCartItem(1)).resolves.toMatchObject({ cartId: 1 });
    await expect(clearCustomerCart()).resolves.toMatchObject({ items: [] });
    await expect(patchCustomerCartMeta({ addressId: 2, scheduledTime: "slot" })).resolves.toMatchObject({ cartId: 1 });
  });

  it("maps customer address response shapes and errors", async () => {
    (api as any).get
      .mockResolvedValueOnce({ data: { data: { items: [{ id: "2", line1: "Home", city: "Indore", pincode: 452001, latitude: "1", longitude: "2", isDefault: true }] } } })
      .mockResolvedValueOnce({ data: { content: [{ id: 3, fullAddress: "Work" }] } });
    await expect(getCustomerAddresses()).resolves.toEqual([expect.objectContaining({ id: 2, fullAddress: "Home", default: true })]);
    await expect(getCustomerAddresses()).resolves.toEqual([expect.objectContaining({ id: 3, fullAddress: "Work" })]);
    (api as any).get.mockRejectedValueOnce(new Error("address failed"));
    await expect(getCustomerAddresses()).rejects.toThrow("address failed");
  });

  it("retains all legacy cart aliases", async () => {
    (api as any).get.mockResolvedValue({ data: { items: [{ itemId: 1, serviceId: 2 }], grandTotal: 0 } });
    (api as any).post.mockResolvedValue({ data: {} });
    (api as any).put.mockResolvedValue({ data: {} });
    (api as any).delete.mockResolvedValue({ data: {} });
    await expect(getCart()).resolves.toHaveLength(1);
    await addToCart({ serviceId: "2", quantity: 2 } as any);
    await updateCart({ id: "1", quantity: undefined } as any);
    await removeFromCart("1");
    await removeCartItem("2");
    expect((api as any).put).toHaveBeenCalledWith("/api/customer/cart/item", { itemId: 1, quantity: 1 });
  });

  it("normalizes CRUD errors", async () => {
    (api as any).get.mockRejectedValue(new Error("get failed"));
    (api as any).put.mockRejectedValue(new Error("put failed"));
    (api as any).delete.mockRejectedValue(new Error("delete failed"));
    (api as any).patch.mockRejectedValue(new Error("patch failed"));
    await expect(getCustomerCart()).rejects.toThrow("get failed");
    await expect(updateCustomerCartItem({ itemId: 1 })).rejects.toThrow("put failed");
    await expect(removeCustomerCartItem(1)).rejects.toThrow("delete failed");
    await expect(clearCustomerCart()).rejects.toThrow("delete failed");
    await expect(patchCustomerCartMeta({ addressId: 1, scheduledTime: "x" })).rejects.toThrow("patch failed");
  });
});
