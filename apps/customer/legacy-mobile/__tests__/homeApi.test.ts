import AsyncStorage from "@react-native-async-storage/async-storage";

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
  extractList: <T,>(data: any): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (Array.isArray(data?.data)) return data.data as T[];
    if (Array.isArray(data?.content)) return data.content as T[];
    return [];
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
  getBanners,
  getCategories,
  getDashboard,
  getHomeData,
  getQuickServices,
  getRecommendedServices,
  searchServices,
} from "../src/api/homeApi";

type ApiFailure = {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};

const failure = (
  status: number | undefined,
  message: string,
  code?: string,
): ApiFailure => ({
  code,
  message,
  response: {
    status,
    data: { message },
  },
});

const emptyLocationState = {
  auth: { token: null },
  location: {
    selectedAddress: null,
    currentAddress: null,
  },
};

describe("homeApi", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetToken.mockResolvedValue(null);
    mockGetState.mockReturnValue(emptyLocationState);
    mockParseApiError.mockImplementation(
      (_error: unknown, fallback: string) => fallback,
    );
  });

  describe("getDashboard", () => {
    it.each([
      [{ greeting: "Hello", location: "Indore", recentBookings: [] }],
      [{}],
      [null],
      [undefined],
    ])("returns the dashboard payload unchanged: %p", async data => {
      mockGet.mockResolvedValue({ data });

      await expect(getDashboard()).resolves.toBe(data);
      expect(mockGet).toHaveBeenCalledWith("/api/home/dashboard");
    });

    it.each([
      [failure(400, "Bad request"), "Bad request"],
      [failure(500, "Server failed"), "Server failed"],
      [failure(undefined, "Network Error", "ERR_NETWORK"), "Network Error"],
      [
        failure(undefined, "timeout of 6000ms exceeded", "ECONNABORTED"),
        "timeout of 6000ms exceeded",
      ],
      [failure(undefined, "cancelled", "ERR_CANCELED"), "cancelled"],
      [{}, "Dashboard failed"],
    ])("normalizes dashboard failures", async (error, message) => {
      mockParseApiError.mockImplementation(
        (value: unknown, fallback: string) =>
          (value as ApiFailure)?.message || fallback,
      );
      mockGet.mockRejectedValue(error);

      await expect(getDashboard()).rejects.toThrow(message);
    });
  });

  describe("getBanners", () => {
    it("loads all five home campaigns before the single category banner feed", async () => {
      const campaigns = [5, 4, 3, 2, 1].map(priority => ({ id: priority, priority, title: `Campaign ${priority}`, imageUrl: `/banner-${priority}.png` }));
      mockGet.mockImplementation(async (path: string) => ({ data: { data: path === "/api/customer/home/banners" ? campaigns : [{ id: 14 }] } }));
      const banners = await getBanners();
      expect(banners.map(item => item.id)).toEqual([1, 2, 3, 4, 5]);
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith("/api/customer/home/banners", expect.any(Object));
    });
    it("uses stored authentication, maps image aliases and sorts banners", async () => {
      mockGetToken.mockResolvedValue("stored-token");
      mockGetState.mockReturnValue({
        auth: { token: "redux-token" },
        location: {},
      });
      mockGet.mockResolvedValue({
        data: {
          payload: {
            banners: [
              {
                bannerId: "3",
                name: "Zulu",
                priority: 2,
                thumbnailUrl: "/banners/three.png",
              },
              {
                id: "2",
                categoryName: "Beta",
                displayOrder: 1,
                image: "http://localhost:8082/two.png",
              },
              {
                id: "1",
                categoryName: "Alpha",
                displayOrder: 1,
                url: "http://127.0.0.1:8082/one.png",
              },
              {
                id: "4",
                name: "No image",
              },
            ],
          },
        },
      });

      await expect(getBanners()).resolves.toEqual([
        expect.objectContaining({
          id: "1",
          bannerImageUrl: "http://device.test:8082/one.png",
          imageUrl: "http://device.test:8082/one.png",
        }),
        expect.objectContaining({
          id: "2",
          bannerImageUrl: "http://device.test:8082/two.png",
        }),
        expect.objectContaining({
          bannerId: "3",
          bannerImageUrl: "http://device.test:8082/banners/three.png",
        }),
        expect.objectContaining({
          id: "4",
          bannerImageUrl: undefined,
          imageUrl: undefined,
        }),
      ]);
      expect(mockGet).toHaveBeenCalledWith("/api/customer/home/banners", {
        headers: { Authorization: "Bearer stored-token" },
        params: {
          audience: "CUSTOMER",
          page: 0,
          platformType: "IOS",
          size: 20,
        },
      });
    });

    it("uses the Redux token when storage is empty", async () => {
      mockGetState.mockReturnValue({
        auth: { token: "redux-token" },
        location: {},
      });
      mockGet.mockResolvedValue({
        data: [{ id: "1", path: "banner.png" }],
      });

      await getBanners();

      expect(mockGet).toHaveBeenCalledWith(
        "/api/customer/home/banners",
        expect.objectContaining({
          headers: { Authorization: "Bearer redux-token" },
        }),
      );
    });

    it.each([
      ["direct array", [{ id: "1" }]],
      ["data array", { data: [{ id: "1" }] }],
      ["content array", { content: [{ id: "1" }] }],
      ["nested result", { result: [{ id: "1" }] }],
      ["nested payload", { payload: [{ id: "1" }] }],
      ["double data", { data: { data: [{ id: "1" }] } }],
      ["data result", { data: { result: [{ id: "1" }] } }],
      ["top-level key", { records: [{ id: "1" }] }],
      ["data key", { data: { rows: [{ id: "1" }] } }],
      ["result key", { result: { items: [{ id: "1" }] } }],
      ["payload key", { payload: { content: [{ id: "1" }] } }],
      ["double-data key", { data: { data: { banners: [{ id: "1" }] } } }],
    ])("extracts banners from %s", async (_label, data) => {
      mockGet.mockResolvedValue({ data });

      await expect(getBanners()).resolves.toHaveLength(1);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it.each([401, 403])(
      "retries the same banner endpoint without auth after HTTP %i",
      async status => {
        mockGet
          .mockRejectedValueOnce(failure(status, "Unauthorized"))
          .mockResolvedValueOnce({
            data: { items: [{ id: "public-banner" }] },
          });

        await expect(getBanners()).resolves.toHaveLength(1);
        expect(mockGet).toHaveBeenNthCalledWith(2, "/api/customer/home/banners", {
          params: {
            audience: "CUSTOMER",
            page: 0,
            platformType: "IOS",
            size: 20,
          },
        });
      },
    );

    it("continues to later paths when authenticated and public attempts fail", async () => {
      mockGet
        .mockRejectedValueOnce(failure(401, "Unauthorized"))
        .mockRejectedValueOnce(new Error("public failed"))
        .mockRejectedValueOnce(failure(404, "Missing"))
        .mockResolvedValueOnce({
          data: { banners: [{ id: "fallback" }] },
        });

      await expect(getBanners()).resolves.toEqual([
        expect.objectContaining({ id: "fallback" }),
      ]);
      expect(mockGet).toHaveBeenNthCalledWith(
        4,
        "/api/customer/banners",
        expect.any(Object),
      );
    });

    it.each([[null], [undefined], [{}], [{ banners: null }], ["corrupt"]])(
      "returns empty for unusable banner data: %p",
      async data => {
        mockGet.mockResolvedValue({ data });

        await expect(getBanners()).resolves.toEqual([]);
        expect(mockGet).toHaveBeenCalledTimes(4);
      },
    );

    it("preserves duplicates because the API owns banner identity", async () => {
      mockGet.mockResolvedValue({
        data: [
          { id: "same", title: "First" },
          { id: "same", title: "Second" },
        ],
      });

      await expect(getBanners()).resolves.toHaveLength(2);
    });

    it("throws when token retrieval fails", async () => {
      mockGetToken.mockRejectedValue(new Error("Storage unavailable"));
      mockParseApiError.mockReturnValue("Banners failed");

      await expect(getBanners()).rejects.toThrow("Banners failed");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("getCategories", () => {
    it("sends auth and selected geo data and maps category image aliases", async () => {
      mockGetToken.mockResolvedValue("customer-token");
      mockGetState.mockReturnValue({
        auth: { token: null },
        location: {
          selectedAddress: {
            lat: "22.7",
            lng: "75.8",
            pincode: " 452001 ",
          },
          currentAddress: {
            latitude: 1,
            longitude: 2,
          },
        },
      });
      mockGet.mockResolvedValue({
        data: {
          categories: [
            {
              categoryId: "1",
              categoryName: "Cook",
              categoryIcon: "/icons/cook.png",
              categoryImage: "http://localhost:8082/cook.png",
            },
            {
              id: "2",
              iconUrl: "http://127.0.0.1:8082/clean.png",
            },
            { id: "3", icon: "icons/driver.png", imageUrl: "/driver.png" },
            { id: "4" },
          ],
        },
      });

      await expect(getCategories()).resolves.toEqual([
        expect.objectContaining({
          categoryId: "1",
          categoryIcon: "http://device.test:8082/icons/cook.png",
          categoryImage: "http://device.test:8082/cook.png",
          imageUrl: "http://device.test:8082/cook.png",
        }),
        expect.objectContaining({
          id: "2",
          categoryIcon: "http://device.test:8082/clean.png",
          categoryImage: "http://device.test:8082/clean.png",
          imageUrl: "http://device.test:8082/clean.png",
        }),
        expect.objectContaining({
          id: "3",
          categoryIcon: "http://device.test:8082/icons/driver.png",
          categoryImage: "http://device.test:8082/driver.png",
          imageUrl: "http://device.test:8082/driver.png",
        }),
        expect.objectContaining({
          id: "4",
          categoryIcon: undefined,
          categoryImage: undefined,
          imageUrl: undefined,
        }),
      ]);
      expect(mockGet).toHaveBeenCalledWith("/api/categories", {
        headers: { Authorization: "Bearer customer-token" },
        params: {
          latitude: 22.7,
          longitude: 75.8,
          pincode: "452001",
        },
        timeout: 6000,
      });
    });

    it.each([404, 401, 403])(
      "continues through retry variants after HTTP %i",
      async status => {
        mockGet
          .mockRejectedValueOnce(failure(status, "retryable"))
          .mockResolvedValueOnce({ data: { items: [{ id: "category" }] } });

        await expect(getCategories()).resolves.toHaveLength(1);
        expect(mockGet).toHaveBeenNthCalledWith(2, "/api/categories", {
          headers: {},
          params: undefined,
          timeout: 6000,
        });
      },
    );

    it("tries geo/auth combinations and later category paths until rows exist", async () => {
      mockGetState.mockReturnValue({
        auth: { token: null },
        location: {
          currentAddress: {
            latitude: 10,
            longitude: 20,
            pincode: "10001",
          },
        },
      });
      mockGet
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({
          data: { rows: [{ id: "later-category" }] },
        });

      await expect(getCategories()).resolves.toHaveLength(1);
      expect(mockGet).toHaveBeenNthCalledWith(
        3,
        "/api/categories",
        expect.objectContaining({
          headers: undefined,
          params: {
            latitude: 10,
            longitude: 20,
            pincode: "10001",
          },
        }),
      );
      expect(mockGet).toHaveBeenNthCalledWith(
        5,
        "/api/customer/categories",
        expect.any(Object),
      );
    });

    it("finds a deeply nested object array when known response keys are absent", async () => {
      const response = {
        strange: {
          envelope: {
            collection: [{ id: "recursive", name: "Nested category" }],
          },
        },
      };
      mockGet.mockResolvedValue({ data: response });

      await expect(getCategories()).resolves.toEqual([
        expect.objectContaining({ id: "recursive" }),
      ]);
      expect(mockGet).toHaveBeenCalledTimes(16);
    });

    it("maps object-valued category dictionaries", async () => {
      const response = {
        data: {
          cook: { id: "1", name: "Cook" },
          clean: { id: "2", name: "Clean" },
        },
      };
      mockGet.mockResolvedValue({ data: response });

      await expect(getCategories()).resolves.toHaveLength(2);
      expect(mockGet).toHaveBeenCalledTimes(16);
    });

    it.each([
      [null],
      [undefined],
      [{}],
      [{ data: {} }],
      [{ data: { first: 1, second: "invalid" } }],
      [{ data: [] }],
    ])("returns empty for unusable category data: %p", async data => {
      mockGet.mockResolvedValue({ data });

      await expect(getCategories()).resolves.toEqual([]);
      expect(mockGet).toHaveBeenCalledTimes(16);
    });

    it("omits invalid geo coordinates and uses no auth header", async () => {
      mockGetState.mockReturnValue({
        location: {
          selectedAddress: {
            latitude: Number.NaN,
            longitude: 0,
            pincode: " ",
          },
        },
      });
      mockGet.mockResolvedValue({
        data: [{ id: "no-geo" }],
      });

      await getCategories();

      expect(mockGet).toHaveBeenCalledWith("/api/categories", {
        headers: {},
        params: undefined,
        timeout: 6000,
      });
    });

    it.each([
      [failure(400, "Bad category request"), "Bad category request"],
      [failure(500, "Category server failed"), "Category server failed"],
      [failure(undefined, "Network Error"), "Network Error"],
      [failure(undefined, "timeout"), "timeout"],
      [failure(undefined, "cancelled"), "cancelled"],
    ])("propagates non-retryable category errors", async (error, message) => {
      mockParseApiError.mockImplementation(
        (value: unknown, fallback: string) =>
          (value as ApiFailure)?.message || fallback,
      );
      mockGet.mockRejectedValue(error);

      await expect(getCategories()).rejects.toThrow(message);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([
    {
      name: "getRecommendedServices",
      endpoint: "/api/services/recommended",
      fallback: "Recommended services failed",
      invoke: getRecommendedServices,
    },
    {
      name: "getQuickServices",
      endpoint: "/api/services/quick",
      fallback: "Quick services failed",
      invoke: getQuickServices,
    },
  ])("$name", ({ endpoint, fallback, invoke }) => {
    it("maps service images and sends Redux location data", async () => {
      mockGetState.mockReturnValue({
        location: {
          selectedAddress: {
            latitude: 22,
            longitude: 75,
            pincode: "452001",
          },
        },
      });
      mockGet.mockResolvedValue({
        data: {
          content: [
            {
              id: "1",
              name: "Service",
              thumbnailUrl: "/thumb.png",
            },
            {
              id: "2",
              name: "Icon service",
              iconUrl: "http://localhost:8082/icon.png",
            },
            { id: "3", name: "No image" },
          ],
        },
      });

      await expect(invoke()).resolves.toEqual([
        expect.objectContaining({
          id: "1",
          imageUrl: "http://device.test:8082/thumb.png",
        }),
        expect.objectContaining({
          id: "2",
          imageUrl: "http://device.test:8082/icon.png",
        }),
        expect.objectContaining({ id: "3", imageUrl: undefined }),
      ]);
      expect(mockGet).toHaveBeenCalledWith(endpoint, {
        params: {
          latitude: 22,
          longitude: 75,
          pincode: "452001",
        },
      });
    });

    it.each([[null], [undefined], [{}], [{ data: null }], [[]]])(
      "returns empty for invalid or empty responses: %p",
      async data => {
        mockGet.mockResolvedValue({ data });

        await expect(invoke()).resolves.toEqual([]);
      },
    );

    it.each([
      failure(400, "Bad request"),
      failure(401, "Unauthorized"),
      failure(403, "Forbidden"),
      failure(404, "Not found"),
      failure(500, "Server failed"),
      failure(undefined, "Network Error", "ERR_NETWORK"),
      failure(undefined, "timeout", "ECONNABORTED"),
      failure(undefined, "cancelled", "ERR_CANCELED"),
    ])("normalizes API failure %p", async error => {
      mockParseApiError.mockReturnValue(error.message || fallback);
      mockGet.mockRejectedValue(error);

      await expect(invoke()).rejects.toThrow(error.message || fallback);
    });
  });

  describe("searchServices", () => {
    it.each([
      ["cleaning"],
      [""],
      ["  cook  "],
      [undefined as unknown as string],
    ])("passes the keyword through without hidden validation: %p", async keyword => {
      mockGetState.mockReturnValue({
        location: {
          currentAddress: {
            lat: 1.5,
            lng: 2.5,
            pincode: "10001",
          },
        },
      });
      mockGet.mockResolvedValue({
        data: [
          {
            id: "1",
            name: "Result",
            imageUrl: "https://cdn.test/result.png",
          },
        ],
      });

      await expect(searchServices(keyword)).resolves.toEqual([
        expect.objectContaining({
          imageUrl: "https://cdn.test/result.png",
        }),
      ]);
      expect(mockGet).toHaveBeenCalledWith("/api/search/services", {
        params: {
          keyword,
          latitude: 1.5,
          longitude: 2.5,
          pincode: "10001",
        },
      });
    });

    it.each([[null], [undefined], [{}], [{ content: [] }], [[]]])(
      "returns empty for unusable search responses: %p",
      async data => {
        mockGet.mockResolvedValue({ data });

        await expect(searchServices("query")).resolves.toEqual([]);
      },
    );

    it("preserves a large result set without truncation or deduplication", async () => {
      const rows = Array.from({ length: 1000 }, (_, index) => ({
        id: String(index % 500),
        name: `Service ${index}`,
      }));
      mockGet.mockResolvedValue({ data: rows });

      await expect(searchServices("service")).resolves.toHaveLength(1000);
    });

    it.each([
      failure(400, "Invalid search"),
      failure(500, "Search server failed"),
      failure(undefined, "Network Error"),
      failure(undefined, "timeout"),
      failure(undefined, "cancelled"),
    ])("propagates search failures", async error => {
      mockParseApiError.mockReturnValue(error.message || "Search failed");
      mockGet.mockRejectedValue(error);

      await expect(searchServices("query")).rejects.toThrow(error.message);
    });
  });

  describe("getHomeData", () => {
    it("combines all home endpoints into the public home model", async () => {
      mockGet.mockImplementation((path: string) => {
        switch (path) {
          case "/api/home/dashboard":
            return Promise.resolve({
              data: {
                greeting: "Good morning",
                location: "Indore",
                recentBookings: [{ id: "booking-1" }],
              },
            });
          case "/api/banners":
            return Promise.resolve({ data: [{ id: "banner-1" }] });
          case "/api/categories":
            return Promise.resolve({ data: [{ id: "category-1" }] });
          case "/api/services/recommended":
            return Promise.resolve({
              data: [{ id: "recommended-1", name: "Recommended" }],
            });
          case "/api/services/quick":
            return Promise.resolve({
              data: [{ id: "quick-1", name: "Quick" }],
            });
          default:
            return Promise.reject(new Error(`Unexpected path: ${path}`));
        }
      });

      await expect(getHomeData()).resolves.toEqual({
        greeting: "Good morning",
        location: "Indore",
        banners: [expect.objectContaining({ id: "banner-1" })],
        categories: [expect.objectContaining({ id: "category-1" })],
        featuredServices: [],
        recommendedServices: [
          expect.objectContaining({ id: "recommended-1" }),
        ],
        quickServices: [expect.objectContaining({ id: "quick-1" })],
        recentBookings: [{ id: "booking-1" }],
      });
    });

    it.each([[{}], [null], [undefined]])(
      "uses dashboard fallback values for partial payload %p",
      async dashboard => {
        mockGet.mockImplementation((path: string) => {
          if (path === "/api/home/dashboard") {
            return Promise.resolve({ data: dashboard });
          }
          return Promise.resolve({ data: [] });
        });

        await expect(getHomeData()).resolves.toEqual({
          greeting: "Welcome to Lexho",
          location: "Your city",
          banners: [],
          categories: [],
          featuredServices: [],
          recommendedServices: [],
          quickServices: [],
          recentBookings: [],
        });
      },
    );

    it("rejects when any required home request fails", async () => {
      mockParseApiError.mockReturnValue("Dashboard failed");
      mockGet.mockImplementation((path: string) => {
        if (path === "/api/home/dashboard") {
          return Promise.reject(new Error("dashboard down"));
        }
        return Promise.resolve({ data: [] });
      });

      await expect(getHomeData()).rejects.toThrow("Dashboard failed");
    });
  });
});
