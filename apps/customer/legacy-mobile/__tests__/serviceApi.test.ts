const mockGet = jest.fn();
const mockParseApiError = jest.fn(
  (_error: unknown, fallback: string) => fallback,
);
const mockGetToken = jest.fn();
const mockGetState = jest.fn();

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  parseApiError: (error: unknown, fallback: string) =>
    mockParseApiError(error, fallback),
}));

jest.mock("../src/utils/storage", () => ({
  getToken: () => mockGetToken(),
}));

jest.mock("../src/redux/store", () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock("../src/constants/env", () => ({
  API_BASE_URL: "http://localhost:8082/",
  DEV_BYPASS_API_TOKEN: "",
  DEV_IMAGE_HOST: "device.test",
  DEV_LOGIN_BYPASS: false,
}));

import {
  fetchCustomerServicesByCategory,
  fetchCustomerServicesCatalog,
  fetchServiceDetails,
} from "../src/api/serviceApi";

type ApiError = {
  message?: unknown;
  response?: {
    status?: number;
    data?: {
      message?: unknown;
    };
  };
};

const apiError = (
  status: number | undefined,
  message?: unknown,
): ApiError => ({
  message,
  response: {
    status,
    data: { message },
  },
});

describe("serviceApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue(null);
    mockGetState.mockReturnValue({
      auth: { token: null },
      location: {
        selectedAddress: null,
        currentAddress: null,
      },
    });
    mockParseApiError.mockImplementation(
      (_error: unknown, fallback: string) => fallback,
    );
  });

  describe("fetchCustomerServicesByCategory", () => {
    it("uses the stored token, selected location and normalizes every image source", async () => {
      mockGetToken.mockResolvedValue("stored-token");
      mockGetState.mockReturnValue({
        auth: { token: "redux-token" },
        location: {
          selectedAddress: {
            latitude: "22.7",
            longitude: "75.8",
            pincode: " 452001 ",
          },
        },
      });
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: 1,
              imageUrl: "http://localhost:8082/images/one.png",
              thumbnailUrl: "/thumbs/one.png",
            },
            {
              id: 2,
              thumbnailUrl: "http://127.0.0.1:8082/two.png",
            },
            { id: 3, serviceImageUrl: "services/three.png" },
            { id: 4, iconUrl: "https://cdn.test/four.png" },
            { id: 5 },
          ],
        },
      });

      await expect(
        fetchCustomerServicesByCategory({
          categoryId: "cook",
          page: 2,
          size: 50,
        }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: 1,
          imageUrl: "http://device.test:8082/images/one.png",
          thumbnailUrl: "http://device.test:8082/thumbs/one.png",
        }),
        expect.objectContaining({
          id: 2,
          imageUrl: "http://device.test:8082/two.png",
          thumbnailUrl: "http://device.test:8082/two.png",
        }),
        expect.objectContaining({
          id: 3,
          imageUrl: "http://device.test:8082/services/three.png",
        }),
        expect.objectContaining({
          id: 4,
          imageUrl: "https://cdn.test/four.png",
        }),
        { id: 5, imageUrl: undefined, thumbnailUrl: undefined },
      ]);
      expect(mockGet).toHaveBeenCalledWith("/api/customer/services", {
        headers: { Authorization: "Bearer stored-token" },
        params: {
          categoryId: "cook",
          latitude: 22.7,
          longitude: 75.8,
          page: 2,
          pincode: "452001",
          size: 50,
        },
      });
    });

    it("uses the Redux token and alternate current-location fields", async () => {
      mockGetState.mockReturnValue({
        auth: { token: "redux-token" },
        location: {
          selectedAddress: {},
          currentAddress: {
            lat: 12.3,
            lng: 45.6,
            pincode: 560001,
          },
        },
      });
      mockGet.mockResolvedValue({
        data: { content: [{ id: 6, imageUrl: " image.png " }] },
      });

      await expect(
        fetchCustomerServicesByCategory({ categoryId: 9 }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: 6,
          imageUrl: "http://device.test:8082/image.png",
        }),
      ]);
      expect(mockGet).toHaveBeenCalledWith("/api/customer/services", {
        headers: { Authorization: "Bearer redux-token" },
        params: {
          categoryId: 9,
          latitude: 12.3,
          longitude: 45.6,
          page: 0,
          pincode: "560001",
          size: 20,
        },
      });
    });

    it.each([
      ["items", { items: [{ id: 7 }] }],
      ["direct array", [{ id: 8 }]],
    ])("supports the %s response container", async (_label, data) => {
      mockGet.mockResolvedValue({ data });

      await expect(
        fetchCustomerServicesByCategory({ categoryId: 1 }),
      ).resolves.toHaveLength(1);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("falls back from an empty authenticated response to public services", async () => {
      mockGet
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: { items: [{ id: 10 }] } });

      await expect(
        fetchCustomerServicesByCategory({ categoryId: 2 }),
      ).resolves.toEqual([
        { id: 10, imageUrl: undefined, thumbnailUrl: undefined },
      ]);
      expect(mockGet).toHaveBeenNthCalledWith(2, "/api/services", {
        headers: undefined,
        params: { categoryId: 2, page: 0, size: 20 },
      });
    });

    it.each([
      apiError(401, "Unauthorized"),
      apiError(403, "Forbidden"),
      apiError(undefined, "Authorization token is required"),
    ])(
      "uses the category endpoint after an authorization failure",
      async error => {
        mockGet
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce({ data: {} })
          .mockResolvedValueOnce({ data: [{ id: 11 }] });

        await expect(
          fetchCustomerServicesByCategory({
            categoryId: "cleaning",
            page: 1,
            size: 5,
          }),
        ).resolves.toEqual([
          { id: 11, imageUrl: undefined, thumbnailUrl: undefined },
        ]);
        expect(mockGet).toHaveBeenNthCalledWith(
          3,
          "/api/services/category/cleaning",
          { params: { page: 1, size: 5 } },
        );
      },
    );

    it("returns an empty list when both fallback endpoints fail", async () => {
      mockGet
        .mockResolvedValueOnce({ data: undefined })
        .mockRejectedValueOnce(new Error("public unavailable"))
        .mockRejectedValueOnce(new Error("category unavailable"));

      await expect(
        fetchCustomerServicesByCategory({ categoryId: 3 }),
      ).resolves.toEqual([]);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it("returns empty when all endpoints provide invalid payloads", async () => {
      mockGet
        .mockResolvedValueOnce({ data: { data: "invalid" } })
        .mockResolvedValueOnce({ data: { content: null } })
        .mockResolvedValueOnce({ data: { items: {} } });

      await expect(
        fetchCustomerServicesByCategory({ categoryId: 4 }),
      ).resolves.toEqual([]);
    });

    it.each([
      [apiError(500, "Backend unavailable"), "Backend unavailable"],
      [{ message: "Network Error" }, "Network Error"],
      [{}, "parsed service error"],
    ])("propagates non-authenticated API failures", async (error, message) => {
      mockParseApiError.mockReturnValue("parsed service error");
      mockGet.mockRejectedValue(error);

      await expect(
        fetchCustomerServicesByCategory({ categoryId: 5 }),
      ).rejects.toThrow(message);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("omits invalid and zero geo coordinates and empty auth headers", async () => {
      mockGetState.mockReturnValue({
        location: {
          selectedAddress: {
            latitude: Number.NaN,
            longitude: 0,
            pincode: " ",
          },
        },
      });
      mockGet.mockResolvedValue({ data: [{ id: 12 }] });

      await fetchCustomerServicesByCategory({ categoryId: 6 });

      expect(mockGet).toHaveBeenCalledWith("/api/customer/services", {
        headers: {},
        params: { categoryId: 6, page: 0, size: 20 },
      });
    });
  });

  describe("fetchServiceDetails", () => {
    it("maps wrapped details, mixed list values and valid add-ons", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: {
            serviceID: "42",
            name: " Deep Cleaning ",
            amount: "499.50",
            bannerImageUrl: "/details/42.png",
            includedItems: [
              " Dusting ",
              { itemName: "Mopping" },
              { name: "Vacuuming" },
              { value: 123 },
              null,
            ],
            excludedItems: [{ value: "Materials" }],
            faq: ["FAQ one"],
            instructionItems: [{ name: "Keep water ready" }],
            recommendedAddons: [
              {
                addonId: "5",
                addonName: "Fridge",
                description: "Inside cleaning",
                amount: "-10",
                isRequired: "required",
                allowQuantity: "yes",
                minQty: "0",
                maxQty: "0",
              },
              {
                extra: {
                  id: 6,
                  name: "Balcony",
                  shortDescription: "Wash",
                  price: "75",
                  activeStatus: 1,
                  quantityAllowed: 1,
                  minQuantity: 2,
                  maxQuantity: 4,
                },
              },
              { id: 7, name: "Disabled", enabled: "disabled" },
              { id: 8, name: "Unavailable", unavailable: "true" },
              { id: 9, name: "Not available", available: false },
              { id: 0, name: "No id" },
              { id: 10 },
            ],
          },
        },
      });

      await expect(fetchServiceDetails("42")).resolves.toEqual({
        serviceId: 42,
        serviceName: "Deep Cleaning",
        price: 499.5,
        imageUrl: "http://device.test:8082/details/42.png",
        included: ["Dusting", "Mopping", "Vacuuming", "123"],
        excluded: ["Materials"],
        faqs: ["FAQ one"],
        instructions: ["Keep water ready"],
        addons: [
          {
            addonId: 5,
            maxQuantity: 1,
            minQuantity: 1,
            name: "Fridge",
            price: 0,
            quantityAllowed: true,
            required: true,
            shortDescription: "Inside cleaning",
          },
          {
            addonId: 6,
            maxQuantity: 4,
            minQuantity: 2,
            name: "Balcony",
            price: 75,
            quantityAllowed: true,
            required: false,
            shortDescription: "Wash",
          },
        ],
      });
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("derives lists from typed detail rows and uses nested service fallbacks", async () => {
      mockGet.mockResolvedValue({
        data: {
          service: {
            id: 13,
            price: 250,
            thumbnailUrl: "http://127.0.0.1:8082/service.png",
          },
          details: [
            { type: "included", itemName: "Kitchen" },
            { type: "EXCLUDED", name: "Chemicals" },
            { type: "FAQ", value: "How long?" },
            { type: "instruction", itemName: "Be home" },
            { type: "INSTRUCTIONS", name: "Clear the area" },
            { type: "OTHER", value: "ignored" },
            { type: "INCLUDED", value: "" },
          ],
          extras: {
            invalid: true,
          },
        },
      });

      await expect(fetchServiceDetails(13)).resolves.toEqual({
        serviceId: 13,
        serviceName: "Service Details",
        price: 250,
        imageUrl: "http://device.test:8082/service.png",
        included: ["Kitchen"],
        excluded: ["Chemicals"],
        faqs: ["How long?"],
        instructions: ["Be home", "Clear the area"],
        addons: [],
      });
    });

    it("tries the next endpoint after failures and invalid detail identifiers", async () => {
      mockGet
        .mockRejectedValueOnce(new Error("customer endpoint failed"))
        .mockResolvedValueOnce({ data: { id: 0 } })
        .mockResolvedValueOnce({
          data: {
            results: [{ serviceId: "21", serviceName: "Catalog service" }],
          },
        });

      await expect(fetchServiceDetails(21)).resolves.toEqual(
        expect.objectContaining({
          serviceId: 21,
          serviceName: "Catalog service",
        }),
      );
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it.each([
      ["data", { data: [{ id: 31, name: "Data row" }] }],
      ["content", { content: [{ serviceId: 31, name: "Content row" }] }],
      ["items", { items: [{ serviceID: 31, name: "Items row" }] }],
      [
        "results",
        { results: [{ service: { id: 31 }, name: "Results row" }] },
      ],
    ])("finds service details in catalog %s rows", async (_label, catalog) => {
      mockGet
        .mockRejectedValueOnce(new Error("first"))
        .mockRejectedValueOnce(new Error("second"))
        .mockResolvedValueOnce({ data: catalog });

      await expect(fetchServiceDetails("31")).resolves.toEqual(
        expect.objectContaining({ serviceId: 31 }),
      );
    });

    it("continues after a catalog miss and resolves a details fallback", async () => {
      mockGet
        .mockRejectedValueOnce(new Error("first"))
        .mockRejectedValueOnce(new Error("second"))
        .mockResolvedValueOnce({ data: { items: [{ id: 99 }] } })
        .mockResolvedValueOnce({
          data: {
            id: 55,
            serviceName: "Customer details endpoint",
          },
        });

      await expect(fetchServiceDetails(55)).resolves.toEqual(
        expect.objectContaining({
          serviceId: 55,
          serviceName: "Customer details endpoint",
        }),
      );
      expect(mockGet).toHaveBeenCalledTimes(4);
    });

    it("uses the final public details endpoint", async () => {
      mockGet
        .mockRejectedValueOnce(new Error("first"))
        .mockRejectedValueOnce(new Error("second"))
        .mockResolvedValueOnce({ data: null })
        .mockRejectedValueOnce(new Error("fourth"))
        .mockResolvedValueOnce({
          data: { id: 77, serviceName: "Final endpoint" },
        });

      await expect(fetchServiceDetails(77)).resolves.toEqual(
        expect.objectContaining({ serviceId: 77 }),
      );
      expect(mockGet).toHaveBeenNthCalledWith(
        5,
        "/api/services/77/details",
      );
    });

    it.each([
      [null],
      [undefined],
      [{}],
      [{ data: null }],
      [{ data: "invalid" }],
    ])("rejects when all endpoints return no valid details: %p", async data => {
      mockGet.mockResolvedValue({ data });
      mockParseApiError.mockReturnValue("parsed detail fallback");

      await expect(fetchServiceDetails("bad-id")).rejects.toThrow(
        "Service details not found",
      );
      expect(mockGet).toHaveBeenCalledTimes(5);
    });
  });

  describe("fetchCustomerServicesCatalog", () => {
    it.each([
      ["data", { data: [{ id: 1 }] }],
      ["content", { content: [{ id: 2 }] }],
      ["items", { items: [{ id: 3 }] }],
      ["array", [{ id: 4 }]],
    ])("maps the %s response container", async (_label, data) => {
      mockGet.mockResolvedValue({ data });

      await expect(
        fetchCustomerServicesCatalog({
          page: 1,
          size: 10,
          search: " cleaning ",
        }),
      ).resolves.toHaveLength(1);
      expect(mockGet).toHaveBeenCalledWith(
        "/api/customer/services/catalog",
        {
          params: {
            page: 1,
            search: "cleaning",
            size: 10,
          },
        },
      );
    });

    it.each([[null], [undefined], [{}], [{ data: "invalid" }]])(
      "returns empty for an invalid catalog payload: %p",
      async data => {
        mockGet.mockResolvedValue({ data });

        await expect(fetchCustomerServicesCatalog()).resolves.toEqual([]);
        expect(mockGet).toHaveBeenCalledWith(
          "/api/customer/services/catalog",
          {
            params: { page: 0, search: undefined, size: 20 },
          },
        );
      },
    );

    it("normalizes invalid query values and includes current geo data", async () => {
      mockGetState.mockReturnValue({
        location: {
          currentAddress: {
            latitude: 1.25,
            longitude: 2.5,
            pincode: " 10001 ",
          },
        },
      });
      mockGet.mockResolvedValue({ data: [] });

      await fetchCustomerServicesCatalog({
        page: Number.NaN,
        size: Number.POSITIVE_INFINITY,
        search: undefined,
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/api/customer/services/catalog",
        {
          params: {
            latitude: 1.25,
            longitude: 2.5,
            page: 0,
            pincode: "10001",
            search: undefined,
            size: 20,
          },
        },
      );
    });

    it.each([
      [apiError(400, "Invalid search"), "Invalid search"],
      [apiError(500, "Catalog unavailable"), "Catalog unavailable"],
      [{ message: "Network Error" }, "Network Error"],
      [{ message: "timeout of 1000ms exceeded" }, "timeout of 1000ms exceeded"],
      [{}, "parsed catalog error"],
    ])("normalizes catalog API failures", async (error, message) => {
      mockParseApiError.mockReturnValue("parsed catalog error");
      mockGet.mockRejectedValue(error);

      await expect(fetchCustomerServicesCatalog()).rejects.toThrow(message);
    });
  });
});
