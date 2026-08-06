import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const del = vi.fn();
  const patch = vi.fn();
  const requestUse = vi.fn();

  return {
    get,
    post,
    put,
    delete: del,
    patch,
    requestUse,
    requestInterceptor: undefined as
      | ((config: { headers: Record<string, string> }) => Promise<unknown> | unknown)
      | undefined,
    replace: vi.fn(),
    getAccessToken: vi.fn(),
    consoleError: vi.fn(),
  };
});

vi.mock("@/config", () => ({
  appConfig: {
    apiBaseUrl: "https://api.example.test",
  },
}));

vi.mock("@/utils/authSession", () => ({
  getAccessToken: mocks.getAccessToken,
}));

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");

  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
        put: mocks.put,
        delete: mocks.delete,
        patch: mocks.patch,
        interceptors: {
          request: {
            use: vi.fn((handler: typeof mocks.requestInterceptor) => {
              mocks.requestInterceptor = handler;
              mocks.requestUse(handler);
            }),
          },
        },
      })),
    },
    isAxiosError: actual.isAxiosError,
  };
});

import {
  createServiceableArea,
  deleteServiceableArea,
  getServiceableAreas,
  updateServiceableArea,
  updateServiceableAreaStatus,
} from "@/features/serviceable-areas/api/serviceableAreasApi";

describe("serviceableAreasApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccessToken.mockReturnValue("token-123");
    Object.defineProperty(window, "location", {
      value: { pathname: "/", replace: mocks.replace },
      writable: true,
    });
    vi.spyOn(console, "error").mockImplementation(mocks.consoleError);
  });

  it("adds authorization header when a token exists", async () => {
    const config = { headers: {} as Record<string, string> };

    expect(await mocks.requestInterceptor?.(config)).toEqual({
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("redirects to login and rejects when no token is available", async () => {
    mocks.getAccessToken.mockReturnValueOnce("");

    await expect(mocks.requestInterceptor?.({ headers: {} as Record<string, string> })).rejects.toThrow(
      "Authorization token is required",
    );
    expect(mocks.replace).toHaveBeenCalledWith("/login");
  });

  it("does not redirect from the login page when no token is available", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/login", replace: mocks.replace },
      writable: true,
    });
    mocks.getAccessToken.mockReturnValueOnce("");

    await expect(mocks.requestInterceptor?.({ headers: {} as Record<string, string> })).rejects.toThrow(
      "Authorization token is required",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("normalizes primary list responses and query parameters", async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {
              areaId: 12,
              name: "Central",
              pinCode: "110001",
              city: "Delhi",
              state: "Delhi",
              cityId: "22",
              zoneId: 0,
              polygonJson: " {json} ",
              isActive: false,
              createdAt: "2024-01-01",
            },
          ],
          totalElements: 7,
          number: 2,
          pageSize: 25,
        },
      },
    });

    await expect(
      getServiceableAreas({
        page: -2,
        size: 0,
        sortBy: "bad-field",
        sortDir: "weird" as never,
        query: "  north  ",
        status: "ACTIVE",
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "12",
          name: "Central",
          pincode: "110001",
          city: "Delhi",
          state: "Delhi",
          country: "India",
          cityId: 22,
          zoneId: null,
          polygonJson: " {json} ",
          active: false,
          createdAt: "2024-01-01",
          updatedAt: undefined,
        },
      ],
      total: 7,
      page: 2,
      size: 25,
    });

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/admin/serviceable-areas", {
      params: {
        page: 0,
        size: 1,
        sortBy: "id",
        sortDir: "desc",
        search: "north",
        status: "ACTIVE",
      },
    });
  });

  it("falls back to search and then legacy list endpoints", async () => {
    mocks.get
      .mockRejectedValueOnce(new Error("base failed"))
      .mockResolvedValueOnce({
        data: {
          rows: [{ id: "2", name: "Search Hit", pincode: "222222", city: "Noida", state: "UP", active: true }],
          count: 1,
        },
      })
      .mockRejectedValueOnce(new Error("base failed again"))
      .mockRejectedValueOnce(new Error("search failed"))
      .mockResolvedValueOnce({
        data: {
          content: [{ id: "3", name: "Legacy Hit", postalCode: "333333", city: "Gurgaon", state: "HR", active: true }],
          total: 1,
          page: 1,
          size: 10,
        },
      })
      .mockRejectedValueOnce(new Error("base without query failed"))
      .mockResolvedValueOnce({
        data: {
          items: [{ id: "4", name: "Legacy Plain", pincode: "444444", city: "Pune", state: "MH", active: true }],
          total: 1,
        },
      });

    await expect(
      getServiceableAreas({ page: 1, size: 10, sortBy: "city", sortDir: "asc", query: " sector ", status: "ALL" }),
    ).resolves.toMatchObject({ items: [expect.objectContaining({ id: "2", city: "Noida" })] });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/api/v1/admin/serviceable-areas/search", {
      params: { q: "sector", page: 1, size: 10 },
    });

    await expect(
      getServiceableAreas({ page: 1, size: 10, sortBy: "city", sortDir: "asc", query: " legacy ", status: "INACTIVE" }),
    ).resolves.toMatchObject({ items: [expect.objectContaining({ id: "3", pincode: "333333" })] });
    expect(mocks.get).toHaveBeenNthCalledWith(5, "/api/admin/serviceable-areas", {
      params: {
        page: 1,
        size: 10,
        sortBy: "city",
        sortDir: "asc",
        query: "legacy",
        status: "INACTIVE",
      },
    });

    await expect(
      getServiceableAreas({ page: 0, size: 10, sortBy: "id", sortDir: "desc", status: "ALL" }),
    ).resolves.toMatchObject({ items: [expect.objectContaining({ id: "4", city: "Pune" })] });
    expect(mocks.get).toHaveBeenNthCalledWith(7, "/api/admin/serviceable-areas", {
      params: {
        page: 0,
        size: 10,
        sortBy: "id",
        sortDir: "desc",
      },
    });
  });

  it("creates with primary endpoint and falls back to legacy on failure", async () => {
    mocks.post
      .mockResolvedValueOnce({
        data: { data: { id: "5", name: "Primary", pincode: "555555", city: "Jaipur", state: "RJ", active: true } },
      })
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce({
        data: { id: "6", name: "Legacy", pincode: "666666", city: "Agra", state: "UP", active: true },
      });

    await expect(
      createServiceableArea({ name: "Primary", pincode: "555555", city: "Jaipur", state: "RJ", active: true }),
    ).resolves.toMatchObject({ id: "5", country: "India" });

    await expect(
      createServiceableArea({ name: "Legacy", pincode: "666666", city: "Agra", state: "UP", active: true }),
    ).resolves.toMatchObject({ id: "6", city: "Agra" });
  });

  it("logs and rethrows create/update fallback errors", async () => {
    const createError = {
      isAxiosError: true,
      response: { status: 422, data: { message: "bad create" } },
      config: { url: "/legacy-create", method: "post", data: "{x}" },
    };
    const updateError = {
      isAxiosError: true,
      response: { status: 500, data: { message: "bad update" } },
      config: { url: "/base-update", method: "put", data: "{y}" },
    };

    mocks.post.mockRejectedValueOnce(new Error("base create failed")).mockRejectedValueOnce(createError);
    mocks.put.mockRejectedValueOnce(new Error("legacy update failed")).mockRejectedValueOnce(updateError);

    await expect(
      createServiceableArea({ name: "Bad", pincode: "777777", city: "Kota", state: "RJ", active: true }),
    ).rejects.toBe(createError);
    await expect(
      updateServiceableArea("9", { name: "Bad", pincode: "888888", city: "Bhopal", state: "MP", active: false }),
    ).rejects.toBe(updateError);

    expect(mocks.consoleError).toHaveBeenCalled();
  });

  it("updates using legacy first and falls back to the v1 endpoint", async () => {
    mocks.put
      .mockResolvedValueOnce({
        data: { data: { id: "11", name: "Legacy First", pincode: "111111", city: "Delhi", state: "Delhi", active: true } },
      })
      .mockRejectedValueOnce(new Error("legacy failed"))
      .mockResolvedValueOnce({
        data: { id: "12", name: "Base Fallback", pincode: "121212", city: "Mumbai", state: "MH", active: false },
      });

    await expect(
      updateServiceableArea("11", { name: "Legacy First", pincode: "111111", city: "Delhi", state: "Delhi", active: true }),
    ).resolves.toMatchObject({ id: "11" });

    await expect(
      updateServiceableArea("12", { name: "Base Fallback", pincode: "121212", city: "Mumbai", state: "MH", active: false }),
    ).resolves.toMatchObject({ id: "12", active: false });
  });

  it("falls back for delete and status updates", async () => {
    mocks.delete.mockRejectedValueOnce(new Error("base delete failed")).mockResolvedValueOnce({});
    mocks.patch.mockRejectedValueOnce(new Error("base patch failed")).mockResolvedValueOnce({});

    await expect(deleteServiceableArea("13")).resolves.toBeUndefined();
    await expect(updateServiceableAreaStatus("14", false)).resolves.toBeUndefined();

    expect(mocks.delete).toHaveBeenNthCalledWith(2, "/api/admin/serviceable-areas/13");
    expect(mocks.patch).toHaveBeenNthCalledWith(2, "/api/admin/serviceable-areas/14/status", { active: false });
  });
});
