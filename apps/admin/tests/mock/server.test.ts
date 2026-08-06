import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestUse: vi.fn(),
  interceptor: undefined as ((config: any) => Promise<any>) | undefined,
}));

vi.mock("axios", () => ({
  default: {
    interceptors: {
      request: {
        use: mocks.requestUse,
      },
    },
  },
}));

async function loadModule() {
  await import("@/mock/server");
}

describe("mock/server", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requestUse.mockImplementation((fn) => {
      mocks.interceptor = fn;
      return 0;
    });
    mocks.interceptor = undefined;
  });

  it("registers a request interceptor when the module is imported", async () => {
    await loadModule();

    expect(mocks.requestUse).toHaveBeenCalledTimes(1);
    expect(mocks.interceptor).toBeTypeOf("function");
  });

  it("passes through non-user requests unchanged", async () => {
    await loadModule();

    const config = {
      url: "/api/admin/bookings",
      params: { page: 3, limit: 5 },
      headers: { Authorization: "Bearer token" },
    };

    await expect(mocks.interceptor?.(config)).resolves.toBe(config);
  });

  it("injects an adapter for admin users requests and returns paginated mock data", async () => {
    await loadModule();

    const config = {
      url: "/api/admin/users",
      method: "get",
      params: { page: 2, limit: 3 },
      headers: { Authorization: "Bearer token" },
    };

    const intercepted = await mocks.interceptor?.(config);

    expect(intercepted).toEqual(
      expect.objectContaining({
        url: "/api/admin/users",
        method: "get",
        params: { page: 2, limit: 3 },
        headers: { Authorization: "Bearer token" },
        adapter: expect.any(Function),
      }),
    );

    const response = await intercepted.adapter();
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("OK");
    expect(response.headers).toEqual({});
    expect(response.config).toBe(config);
    expect(response.data.total).toBe(100);
    expect(response.data.page).toBe(2);
    expect(response.data.limit).toBe(3);
    expect(response.data.data).toHaveLength(3);
    expect(response.data.data[0]).toEqual({
      id: 4,
      name: "User 4",
      phone: "98XXXXXXX",
      location: "Noida",
      role: "CUSTOMER",
      bookings: 21,
      status: "BLOCKED",
    });
    expect(response.data.data[2]).toEqual({
      id: 6,
      name: "User 6",
      phone: "98XXXXXXX",
      location: "Noida",
      role: "CUSTOMER",
      bookings: 35,
      status: "ACTIVE",
    });
  });

  it("uses default pagination when page or limit are falsy", async () => {
    await loadModule();

    const intercepted = await mocks.interceptor?.({
      url: "https://admin.lexho.test/api/admin/users",
      params: { page: 0, limit: 0 },
    });

    const response = await intercepted.adapter();
    expect(response.data.page).toBe(1);
    expect(response.data.limit).toBe(10);
    expect(response.data.data).toHaveLength(10);
    expect(response.data.data[0]?.id).toBe(1);
    expect(response.data.data[9]?.id).toBe(10);
  });

  it("accepts numeric strings for pagination values", async () => {
    await loadModule();

    const intercepted = await mocks.interceptor?.({
      url: "/api/admin/users",
      params: { page: "3", limit: "2" },
    });

    const response = await intercepted.adapter();
    expect(response.data.page).toBe(3);
    expect(response.data.limit).toBe(2);
    expect(response.data.data.map((row: { id: number }) => row.id)).toEqual([5, 6]);
  });

  it("preserves current behavior when params are missing for a matched url", async () => {
    await loadModule();

    await expect(
      mocks.interceptor?.({
        url: "/api/admin/users",
      }),
    ).rejects.toThrow();
  });
});
