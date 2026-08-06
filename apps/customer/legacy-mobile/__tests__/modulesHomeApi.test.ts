const mockGet = jest.fn();
const mockParseApiError = jest.fn(
  (_error: unknown, fallback: string) => fallback,
);

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  parseApiError: (error: unknown, fallback: string) =>
    mockParseApiError(error, fallback),
}));

import { getHomeSections } from "../src/modules/home/api";

const apiError = (status?: number, message?: string) => ({
  message,
  response: {
    status,
    data: { message },
  },
});

describe("modules/home/api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseApiError.mockImplementation(
      (_error: unknown, fallback: string) => fallback,
    );
  });

  it("maps complete sections and embedded items from alternate fields", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              sectionId: "10",
              type: "stats",
              title: 123,
              description: "Performance",
              icon: "star",
              text_color: "#111111",
              border_color: "#222222",
              bg_color: "#333333",
              icon_color: "#444444",
              priority: "2",
              status: "ACTIVE",
              createdAt: "2026-06-12",
              items: {
                data: [
                  {
                    itemId: "7",
                    sectionId: "10",
                    title: "Bookings",
                    subtitle: "",
                    value: 500,
                    icon: "calendar",
                    textColor: "#aaaaaa",
                    borderColor: "#bbbbbb",
                    background_color: "#cccccc",
                    iconColor: "#dddddd",
                    priority: "3",
                    isActive: "yes",
                  },
                ],
              },
            },
          ],
        },
      },
    });

    await expect(getHomeSections()).resolves.toEqual([
      {
        id: 10,
        type: "STATS",
        title: "123",
        subtitle: "Performance",
        icon: "star",
        color: "#111111",
        borderColor: "#222222",
        backgroundColor: "#333333",
        iconColor: "#444444",
        priority: 2,
        active: true,
        createdAt: "2026-06-12",
        items: [
          {
            id: 7,
            sectionId: 10,
            title: "Bookings",
            subtitle: null,
            value: "500",
            icon: "calendar",
            color: "#aaaaaa",
            borderColor: "#bbbbbb",
            backgroundColor: "#cccccc",
            iconColor: "#dddddd",
            priority: 3,
            active: true,
          },
        ],
      },
    ]);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/api/customer/home/sections");
  });

  it.each([
    ["TRUST"],
    ["TAGLINE"],
    ["HIGHLIGHTS"],
    ["BANNERS"],
    ["unknown"],
    [null],
  ])("normalizes section type %p", async type => {
    mockGet.mockResolvedValue({
      data: [{ id: 1, type, title: "Section", items: [] }],
    });
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: 1, type, title: "Section", items: [] }],
      })
      .mockResolvedValueOnce({ data: [] });

    const result = await getHomeSections();

    expect(result[0].type).toBe(
      ["TRUST", "TAGLINE", "HIGHLIGHTS", "BANNERS"].includes(String(type))
        ? type
        : "CUSTOM",
    );
  });

  it("hydrates missing items from the first customer item endpoint", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 20,
              type: "TRUST",
              title: "Trust",
              active: 1,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 2,
              title: "Verified",
              active: "enabled",
            },
          ],
        },
      });

    await expect(getHomeSections()).resolves.toEqual([
      expect.objectContaining({
        id: 20,
        active: true,
        items: [
          expect.objectContaining({
            id: 2,
            title: "Verified",
            active: true,
          }),
        ],
      }),
    ]);
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      "/api/customer/home/sections/20/items",
    );
  });

  it("falls back across all item endpoints after authorization failures", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: 30, type: "TAGLINE" }],
      })
      .mockRejectedValueOnce(apiError(401, "Unauthorized"))
      .mockRejectedValueOnce(apiError(403, "Forbidden"))
      .mockResolvedValueOnce({
        data: {
          data: [{ id: 4, title: "Fallback item", status: "inactive" }],
        },
      });

    await expect(getHomeSections()).resolves.toEqual([
      expect.objectContaining({
        id: 30,
        items: [
          expect.objectContaining({
            id: 4,
            active: false,
          }),
        ],
      }),
    ]);
    expect(mockGet).toHaveBeenNthCalledWith(
      4,
      "/api/admin/sections/30/items",
    );
  });

  it("returns an empty item list when all item endpoints fail", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [{ id: 40, type: "CUSTOM" }],
      })
      .mockRejectedValueOnce(apiError(500, "first"))
      .mockRejectedValueOnce(apiError(500, "second"))
      .mockRejectedValueOnce(apiError(500, "third"));

    await expect(getHomeSections()).resolves.toEqual([
      expect.objectContaining({ id: 40, items: [] }),
    ]);
  });

  it.each([
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [undefined, "Authorization token is required"],
    [undefined, "Invalid or expired token"],
  ])(
    "falls back to the next section endpoint for authorization error %p",
    async (status, message) => {
      mockGet
        .mockRejectedValueOnce(apiError(status, message))
        .mockResolvedValueOnce({
          data: [{ id: 50, type: "HIGHLIGHTS", items: [{ id: 1 }] }],
        });

      await expect(getHomeSections()).resolves.toEqual([
        expect.objectContaining({ id: 50 }),
      ]);
      expect(mockGet).toHaveBeenNthCalledWith(2, "/api/sections");
    },
  );

  it("tries later section endpoints even after non-authorization failures", async () => {
    mockGet
      .mockRejectedValueOnce(apiError(500, "Customer failed"))
      .mockRejectedValueOnce(apiError(404, "Public failed"))
      .mockResolvedValueOnce({
        data: [{ id: 60, type: "BANNERS", items: [{ id: 1 }] }],
      });

    await expect(getHomeSections()).resolves.toEqual([
      expect.objectContaining({ id: 60 }),
    ]);
    expect(mockGet).toHaveBeenNthCalledWith(3, "/api/admin/sections");
  });

  it("returns empty when the final failure remains authorization-related", async () => {
    mockGet
      .mockRejectedValueOnce(apiError(500, "first"))
      .mockRejectedValueOnce(apiError(500, "second"))
      .mockRejectedValueOnce(apiError(403, "Forbidden"));

    await expect(getHomeSections()).resolves.toEqual([]);
  });

  it.each([
    [apiError(500, "Backend down"), "Backend down"],
    [{ message: "Network Error" }, "Network Error"],
    [{ message: "timeout" }, "timeout"],
    [{}, "Failed to load homepage sections"],
  ])("propagates the final non-auth error", async (error, expected) => {
    mockParseApiError.mockImplementation(
      (value: any, fallback: string) => value?.message || fallback,
    );
    mockGet.mockRejectedValue(error);

    await expect(getHomeSections()).rejects.toThrow(expected);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it.each([
    [null],
    [undefined],
    [{}],
    [{ data: null }],
    [{ data: { data: { results: [] } } }],
    ["corrupt"],
  ])("returns empty for unusable section payload %p", async data => {
    mockGet.mockResolvedValue({ data });

    await expect(getHomeSections()).resolves.toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("applies deterministic fallbacks to malformed section and item fields", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: Number.NaN,
          type: 123,
          title: {},
          subtitle: false,
          priority: "invalid",
          active: "unexpected",
          items: [
            {
              id: Number.POSITIVE_INFINITY,
              sectionId: "invalid",
              title: null,
              priority: null,
              active: 0,
            },
          ],
        },
      ],
    });

    await expect(getHomeSections()).resolves.toEqual([
      expect.objectContaining({
        id: 0,
        type: "CUSTOM",
        title: null,
        subtitle: null,
        priority: 1,
        active: true,
        items: [
          expect.objectContaining({
            id: 0,
            sectionId: 0,
            title: "",
            priority: 1,
            active: false,
          }),
        ],
      }),
    ]);
  });
});
