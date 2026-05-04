import { getAvailableTimeSlots, getCustomerCart } from "../src/api/cartApi";

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
    expect(slots).toEqual(["11:00-13:00", "13:00", "15:00"]);
  });

  it("returns empty slot list when slots API fails", async () => {
    api.get.mockRejectedValueOnce(new Error("network error"));
    const slots = await getAvailableTimeSlots("2026-05-05");
    expect(slots).toEqual([]);
  });
});
