import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    patch: mocks.patch,
    put: mocks.put,
  },
}));

describe("customer profile control api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: mocks.getItem,
        setItem: mocks.setItem,
      },
      configurable: true,
    });
  });

  it("maps customer profiles and delete requests from different payload shapes", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: {
            data: {
              items: [
                {
                  id: 1,
                  fullName: "Alex",
                  mobile: 999,
                  phoneNumber: "",
                  email: "alex@example.com",
                  gender: "male",
                  profileImageUrl: "",
                  addressCount: "4",
                  active: undefined,
                  profileEditLocked: true,
                  emailVerified: true,
                  phoneVerified: false,
                  profileImageApproved: true,
                  adminNotes: "keep",
                  updatedAt: "",
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "r1",
              customerId: "c1",
              fullName: "Delete Me",
              reason: "",
              createdAt: "2026-01-01",
              resolved: false,
            },
          ],
        },
      });

    const { getCustomerProfilesAdmin, getCustomerDeleteRequestsAdmin } = await import(
      "@/features/customer-profile-control/api/customerProfileControlApi"
    );

    await expect(getCustomerProfilesAdmin("alex")).resolves.toEqual([
      {
        id: "1",
        fullName: "Alex",
        mobile: "999",
        phoneNumber: undefined,
        email: "alex@example.com",
        gender: "MALE",
        profileImageUrl: undefined,
        addressCount: 4,
        active: true,
        profileEditLocked: true,
        emailVerified: true,
        phoneVerified: false,
        profileImageApproved: true,
        adminNotes: "keep",
        updatedAt: undefined,
      },
    ]);
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/v1/admin/customers", {
      params: { search: "alex", page: 0, size: 50, sortBy: "updatedAt", sortDir: "desc" },
    });

    await expect(getCustomerDeleteRequestsAdmin()).resolves.toEqual([
      {
        id: "r1",
        customerId: "c1",
        customerName: "Delete Me",
        reason: "",
        createdAt: "2026-01-01",
        resolved: false,
      },
    ]);
  });

  it("sends governance, status, and delete resolution mutations", async () => {
    const api = await import("@/features/customer-profile-control/api/customerProfileControlApi");

    await api.updateCustomerProfileAdmin("c1", {
      profileEditLocked: true,
      emailVerified: true,
      phoneVerified: false,
      profileImageApproved: true,
      adminNotes: "note",
    });
    await api.updateCustomerStatusAdmin("c1", false);
    await api.resolveCustomerDeleteRequestAdmin("r1", true, "ok");

    expect(mocks.patch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/admin/customers/c1/profile-governance",
      expect.objectContaining({ adminNotes: "note" }),
    );
    expect(mocks.patch).toHaveBeenNthCalledWith(2, "/api/v1/admin/customers/c1/status", { active: false });
    expect(mocks.patch).toHaveBeenNthCalledWith(
      3,
      "/api/v1/admin/customers/account-delete-requests/r1/resolve",
      { approve: true, reason: "ok" },
    );
  });

  it("reads and writes profile content with API and localStorage fallbacks", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: {
            aboutUs: "",
            termsOfService: "Terms from api",
            privacyPolicy: "Privacy from api",
          },
        },
      })
      .mockRejectedValueOnce(new Error("api down"))
      .mockRejectedValueOnce(new Error("api still down"))
      .mockRejectedValueOnce(new Error("api always down"));
    mocks.getItem.mockReturnValueOnce(JSON.stringify({ aboutUs: "Saved about", privacyPolicy: "Saved privacy" })).mockReturnValueOnce("{bad json}");
    mocks.put.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("write down"));

    const { getProfileContentAdmin, updateProfileContentAdmin } = await import(
      "@/features/customer-profile-control/api/customerProfileControlApi"
    );

    await expect(getProfileContentAdmin()).resolves.toEqual({
      aboutUs: "Lexho helps customers book trusted home services quickly.",
      termsOfService: "Terms from api",
      privacyPolicy: "Privacy from api",
    });
    await expect(getProfileContentAdmin()).resolves.toEqual({
      aboutUs: "Saved about",
      termsOfService: "By using Lexho services, users agree to the platform rules and booking terms.",
      privacyPolicy: "Saved privacy",
    });
    await expect(getProfileContentAdmin()).resolves.toEqual({
      aboutUs: "Lexho helps customers book trusted home services quickly.",
      termsOfService: "By using Lexho services, users agree to the platform rules and booking terms.",
      privacyPolicy: "Lexho stores only required personal data and uses it securely for service delivery.",
    });

    await updateProfileContentAdmin({ aboutUs: "a", termsOfService: "b", privacyPolicy: "c" });
    await updateProfileContentAdmin({ aboutUs: "x", termsOfService: "y", privacyPolicy: "z" });
    expect(mocks.put).toHaveBeenNthCalledWith(1, "/api/admin/profile-content", { aboutUs: "a", termsOfService: "b", privacyPolicy: "c" });
    expect(mocks.setItem).toHaveBeenCalledWith("admin.profile.content.cms", JSON.stringify({ aboutUs: "x", termsOfService: "y", privacyPolicy: "z" }));
  });
});
