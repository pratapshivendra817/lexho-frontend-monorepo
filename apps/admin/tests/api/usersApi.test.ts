import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
    delete: mocks.deleteMock,
  },
}));

import {
  blockUser,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  unblockUser,
  updateUser,
} from "@/features/users/api/usersApi";

describe("usersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps paginated users list payload", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        content: [
          {
            id: "usr-1",
            name: "Alice",
            email: "alice@example.com",
            phone: "9999999999",
            role: "CUSTOMER",
            status: "ACTIVE",
            city: "Indore",
          },
        ],
        totalElements: 42,
        totalPages: 5,
        pageNumber: 1,
      },
    });

    const result = await getUsers({ page: 1, limit: 10, search: "ali", role: "CUSTOMER" });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/users", {
      params: {
        page: 1,
        limit: 10,
        size: 10,
        search: "ali",
        role: "CUSTOMER",
        status: undefined,
        city: undefined,
      },
    });

    expect(result).toEqual({
      content: [
        {
          id: "usr-1",
          name: "Alice",
          email: "alice@example.com",
          phone: "9999999999",
          role: "CUSTOMER",
          status: "ACTIVE",
          city: "Indore",
          blocked: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
      totalElements: 42,
      totalPages: 5,
      pageNumber: 1,
    });
  });

  it("maps user details payload", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          id: "usr-2",
          fullName: "Bob",
          email: "bob@example.com",
          phone: "8888888888",
          role: "PARTNER",
          blocked: true,
          city: "Bhopal",
        },
      },
    });

    const result = await getUserById("usr-2");

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/users/usr-2");
    expect(result).toEqual({
      id: "usr-2",
      name: "Bob",
      email: "bob@example.com",
      phone: "8888888888",
      role: "PARTNER",
      status: "BLOCKED",
      city: "Bhopal",
      blocked: true,
      createdAt: "",
      updatedAt: "",
    });
  });

  it("normalizes alternative list payload shapes and pagination fallbacks", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              userId: 77,
              fullName: "Dana",
              mobile: 9898989898,
              profile: {
                email: "dana@example.com",
                role: "partner",
                status: "inactive",
                city: "Ujjain",
              },
              address: { city: "Bhopal" },
              created_on: 123,
              updated_on: 456,
            },
          ],
          total: "1",
          totalPages: "0",
          page: "3",
        },
      },
    });

    const result = await getUsers({ page: 3, limit: 10, search: "", role: "", status: "", city: "" });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/users", {
      params: {
        page: 3,
        limit: 10,
        size: 10,
        search: undefined,
        role: undefined,
        status: undefined,
        city: undefined,
      },
    });

    expect(result).toEqual({
      content: [
        {
          id: "77",
          name: "Dana",
          email: "dana@example.com",
          phone: "9898989898",
          role: "PARTNER",
          status: "INACTIVE",
          city: "Bhopal",
          blocked: false,
          createdAt: "123",
          updatedAt: "456",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 3,
    });
  });

  it("returns null for empty details and derives blocked/deleted users from root payloads", async () => {
    mocks.getMock
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          id: "usr-9",
          profile: {
            name: "Esha",
            email: "esha@example.com",
            phone: "7878787878",
            role: "unknown",
            status: "deleted",
            city: "Jaipur",
          },
          block: true,
        },
      });

    await expect(getUserById("missing")).resolves.toBeNull();
    await expect(getUserById("usr-9")).resolves.toEqual({
      id: "usr-9",
      name: "Esha",
      email: "esha@example.com",
      phone: "7878787878",
      role: "CUSTOMER",
      status: "DELETED",
      city: "Jaipur",
      blocked: false,
      createdAt: "",
      updatedAt: "",
    });
  });

  it("hits create/update/block/unblock/delete endpoints", async () => {
    mocks.postMock.mockResolvedValue({});
    mocks.putMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});

    const payload = {
      name: "Charlie",
      email: "charlie@example.com",
      phone: "7777777777",
      role: "ADMIN" as const,
      city: "Pune",
      status: "ACTIVE" as const,
    };

    await createUser(payload);
    await updateUser("usr-3", payload);
    await blockUser("usr-3");
    await unblockUser("usr-3");
    await deleteUser("usr-3");

    expect(mocks.postMock).toHaveBeenCalledWith(
      "/api/admin/users",
      expect.objectContaining({
        name: "Charlie",
        fullName: "Charlie",
        email: "charlie@example.com",
        phone: "7777777777",
        mobile: "7777777777",
        role: "ADMIN",
        city: "Pune",
        status: "ACTIVE",
        isBlocked: false,
        blocked: false,
        active: true,
      }),
    );
    expect(mocks.putMock).toHaveBeenCalledWith(
      "/api/admin/users/usr-3",
      expect.objectContaining({
        name: "Charlie",
        fullName: "Charlie",
        email: "charlie@example.com",
      }),
    );
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/users/usr-3/block");
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/users/usr-3/unblock");
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/users/usr-3");
  });

  it.each([
    [
      "blocked users",
      {
        name: "Blocked",
        email: "blocked@example.com",
        phone: "7000000000",
        role: "CUSTOMER" as const,
        city: "Delhi",
        status: "BLOCKED" as const,
      },
      { isBlocked: true, blocked: true, active: false },
    ],
    [
      "inactive users",
      {
        name: "Inactive",
        email: "inactive@example.com",
        phone: "7111111111",
        role: "PARTNER" as const,
        city: "Mumbai",
        status: "INACTIVE" as const,
      },
      { isBlocked: false, blocked: false, active: false },
    ],
  ])("maps backend payload flags for %s", async (_label, payload, flags) => {
    mocks.postMock.mockResolvedValue({});
    mocks.putMock.mockResolvedValue({});

    await createUser(payload);
    await updateUser("usr-flags", payload);

    expect(mocks.postMock).toHaveBeenLastCalledWith(
      "/api/admin/users",
      expect.objectContaining({
        status: payload.status,
        ...flags,
      }),
    );
    expect(mocks.putMock).toHaveBeenLastCalledWith(
      "/api/admin/users/usr-flags",
      expect.objectContaining({
        status: payload.status,
        ...flags,
      }),
    );
  });
});


