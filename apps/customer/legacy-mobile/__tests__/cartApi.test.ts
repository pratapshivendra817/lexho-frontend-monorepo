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
    jest.resetAllMocks();
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
            { label: "11:00-13:00", available: true },
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
    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({
      slot: "11:00-13:00",
      available: true,
      instantEligible: false,
      etaMinutes: 999,
    });
  });

  it("rejects instead of inventing available slots when the API fails", async () => {
    api.get.mockRejectedValueOnce(new Error("network error"));
    await expect(getAvailableTimeSlots("2026-05-05")).rejects.toThrow();
  });

  it("keeps configured half-hour intervals and unavailable flags from the backend", async () => {
    api.get.mockResolvedValueOnce({ data: { data: { slots: [
      { slot: "15:30-16:00", available: true },
      { slot: "16:00-16:30", available: false },
    ] } } });
    const slots = await getAvailableTimeSlots("2026-09-15");
    expect(slots).toEqual([
      expect.objectContaining({ slot: "15:30-16:00", available: true }),
      expect.objectContaining({ slot: "16:00-16:30", available: false }),
    ]);
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

  it("uses the legacy add endpoint when the customer route is unavailable", async () => {
    (api as any).post
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { matchedPartners: null } });
    (api as any).get.mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } });
    await expect(addCustomerCartItem({ serviceId: 2, quantity: 0 })).resolves.toMatchObject({ matchedPartners: 0, assignmentMode: undefined });
    expect((api as any).post).toHaveBeenNthCalledWith(2, "/api/cart/add", { serviceId: 2, quantity: 0 });
    (api as any).post.mockRejectedValueOnce({ response: { status: 500 }, message: "server" });
    await expect(addCustomerCartItem({ serviceId: 2, quantity: 1 })).rejects.toThrow("server");
  });

  it("falls back to the legacy add endpoint after a 403 from the customer route", async () => {
    (api as any).post
      .mockRejectedValueOnce({ response: { status: 403 } })
      .mockResolvedValueOnce({ data: { items: [{ itemId: 9, serviceId: 2 }], grandTotal: 0 } });
    (api as any).get.mockResolvedValueOnce({ data: { items: [{ itemId: 9, serviceId: 2 }], grandTotal: 0 } });

    await expect(addCustomerCartItem({ serviceId: 2, quantity: 1 })).resolves.toMatchObject({
      requestStatus: "PENDING",
      items: [{ itemId: 9, serviceId: 2 }],
    });
    expect((api as any).post).toHaveBeenNthCalledWith(2, "/api/cart/add", { serviceId: 2, quantity: 1 });
  });

  it("uses the fallback cart read endpoint when the customer cart route is unavailable", async () => {
    (api as any).post.mockResolvedValueOnce({ data: { matchedPartners: 1 } });
    (api as any).get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { items: [{ itemId: 7, serviceId: 2 }], grandTotal: 0 } });

    await expect(addCustomerCartItem({ serviceId: 2, quantity: 1 })).resolves.toMatchObject({
      requestStatus: "PENDING",
      matchedPartners: 1,
      items: [{ itemId: 7, serviceId: 2 }],
    });
    expect((api as any).get).toHaveBeenNthCalledWith(2, "/api/cart");
  });

  it("falls back to legacy cart mutation endpoints when the customer routes are unavailable", async () => {
    (api as any).put.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce({ data: { items: [{ itemId: 1, serviceId: 5 }], grandTotal: 0 } });
    (api as any).delete
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } });
    (api as any).get
      .mockResolvedValueOnce({ data: { items: [{ itemId: 1, serviceId: 5 }], grandTotal: 0 } })
      .mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } })
      .mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } });

    await expect(updateCustomerCartItem({ itemId: 1, quantity: 2 })).resolves.toMatchObject({ items: [{ serviceId: 5 }] });
    await expect(removeCustomerCartItem(1)).resolves.toMatchObject({ items: [] });
    await expect(clearCustomerCart()).resolves.toMatchObject({ items: [] });
    expect((api as any).put).toHaveBeenNthCalledWith(2, "/api/cart/item", { itemId: 1, quantity: 2 });
    expect((api as any).delete).toHaveBeenNthCalledWith(2, "/api/cart/item/1");
    expect((api as any).delete).toHaveBeenNthCalledWith(4, "/api/cart/clear");
  });

  it("resolves the real cart item id before deleting when the app is holding a stale or service-level id", async () => {
    (api as any).delete
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { items: [], grandTotal: 0 } });
    (api as any).get.mockResolvedValueOnce({
      data: {
        data: {
          items: [{ itemId: 42, serviceId: 11, name: "AC Service", price: 499, quantity: 1, totalPrice: 499 }],
          grandTotal: 499,
        },
      },
    }).mockResolvedValueOnce({
      data: { data: { items: [], grandTotal: 0 } },
    });

    await expect(removeCustomerCartItem(11)).resolves.toMatchObject({ items: [] });
    expect((api as any).delete).toHaveBeenNthCalledWith(1, "/api/customer/cart/item/42");
    expect((api as any).delete).toHaveBeenNthCalledWith(2, "/api/cart/item/42");
  });

  it("keeps the add-to-cart request successful when the refreshed cart read fails after a successful POST", async () => {
    (api as any).post.mockResolvedValueOnce({
      data: {
        data: {
          matchedPartners: 2,
          assignmentMode: "AUTO",
          items: [{ itemId: 42, serviceId: 9, name: "Deep Cleaning", price: 320, quantity: 1, totalPrice: 320 }],
          grandTotal: 320,
        },
      },
    });
    (api as any).get.mockRejectedValueOnce(new Error("cart read failed"));

    await expect(addCustomerCartItem({ serviceId: 9, quantity: 1 })).resolves.toMatchObject({
      requestStatus: "PENDING",
      matchedPartners: 2,
      assignmentMode: "AUTO",
      items: [expect.objectContaining({ serviceId: 9, name: "Deep Cleaning" })],
    });
  });

  it("keeps the added item when the first refreshed cart read is transiently empty", async () => {
    (api as any).post.mockResolvedValueOnce({
      data: {
        data: {
          itemId: 43,
          serviceId: 10,
          name: "Bathroom Cleaning",
          price: 250,
          quantity: 1,
          totalPrice: 250,
        },
      },
    });
    (api as any).get
      .mockResolvedValueOnce({ data: { data: { items: [], grandTotal: 0 } } })
      .mockResolvedValueOnce({ data: { data: { items: [{ itemId: 43, serviceId: 10, name: "Bathroom Cleaning", price: 250, quantity: 1, totalPrice: 250 }], grandTotal: 250 } } });

    await expect(addCustomerCartItem({ serviceId: 10, quantity: 1 })).resolves.toMatchObject({
      items: [expect.objectContaining({ serviceId: 10, name: "Bathroom Cleaning" })],
    });
  });

  it("returns a safe empty cart instead of throwing when cart refresh fails after quantity update", async () => {
    (api as any).put.mockResolvedValueOnce({ data: {} });
    (api as any).get.mockRejectedValueOnce(new Error("cart read failed"));

    await expect(updateCustomerCartItem({ itemId: 1, quantity: 2 })).resolves.toMatchObject({
      items: [],
      grandTotal: 0,
      requestStatus: "IDLE",
    });
  });

  it("normalizes a single-item add response into the cart shape so the newly added service is visible immediately", async () => {
    (api as any).post.mockResolvedValueOnce({
      data: {
        data: {
          itemId: 77,
          serviceId: 15,
          name: "Kitchen Sanitization",
          price: 450,
          quantity: 1,
          totalPrice: 450,
          matchedPartners: 1,
          assignmentMode: "AUTO",
        },
      },
    });
    (api as any).get.mockRejectedValueOnce(new Error("cart read failed"));

    await expect(addCustomerCartItem({ serviceId: 15, quantity: 1 })).resolves.toMatchObject({
      requestStatus: "PENDING",
      matchedPartners: 1,
      assignmentMode: "AUTO",
      items: [expect.objectContaining({ serviceId: 15, name: "Kitchen Sanitization" })],
    });
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
    await expect(getCustomerAddresses()).resolves.toEqual([expect.objectContaining({ id: "2", fullAddress: "Home, Indore, 452001", default: true })]);
    await expect(getCustomerAddresses()).resolves.toEqual([expect.objectContaining({ id: 3, fullAddress: "Work" })]);
    (api as any).get.mockRejectedValueOnce(new Error("address failed"));
    await expect(getCustomerAddresses()).rejects.toThrow("address failed");
  });

  it("loads saved location addresses with UUID and complete flat/building details", async () => {
    (api as any).get.mockResolvedValueOnce({ data: { data: { items: [{
      id: "saved-address-uuid", flatNo: "201", floor: "2", buildingName: "Jangle house",
      addressLine: "Versova", city: "Mumbai", pincode: "400061", isDefault: true,
    }] } } });
    await expect(getCustomerAddresses()).resolves.toEqual([expect.objectContaining({
      id: "saved-address-uuid", fullAddress: "201, Floor 2, Jangle house, Versova, Mumbai, 400061", default: true,
    })]);
    expect((api as any).get).toHaveBeenLastCalledWith("/api/v1/customer/location/all", { params: { page: 0, size: 50 } });
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
