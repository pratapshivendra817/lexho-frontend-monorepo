import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}));

import {
  createAdminCookFamilySize,
  deleteAdminCookFamilySize,
  getAdminCookFamilySizes,
  updateAdminCookFamilySize,
  updateAdminCookFamilySizeStatus,
} from "@/features/cook-family-sizes/api/cookFamilySizesApi";

describe("cookFamilySizesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and normalizes cook family sizes from nested payloads", async () => {
    mocks.get.mockResolvedValue({
      data: {
        data: [
          {
            id: "9",
            code: " XLARGE ",
            displayName: " 8-10 Members ",
            active: "enabled",
            sortOrder: "3",
          },
          {
            familySizeId: 2,
            familySize: "MEDIUM",
            familySizeLabel: "3-5 Members",
            active: 0,
            displayOrder: "2",
          },
          {
            familySizeId: undefined,
            familySize: null,
            familySizeLabel: null,
            active: null,
            displayOrder: "not-a-number",
          },
        ],
      },
    });

    await expect(getAdminCookFamilySizes()).resolves.toEqual([
      {
        familySizeId: 2,
        familySize: "MEDIUM",
        familySizeLabel: "3-5 Members",
        active: false,
        displayOrder: 2,
      },
      {
        familySizeId: 9,
        familySize: "XLARGE",
        familySizeLabel: "8-10 Members",
        active: true,
        displayOrder: 3,
      },
      {
        familySizeId: 3,
        familySize: "",
        familySizeLabel: "",
        active: true,
        displayOrder: 3,
      },
    ]);

    expect(mocks.get).toHaveBeenCalledWith("/api/admin/cook-family-sizes");
  });

  it("returns an empty list for invalid list payloads", async () => {
    mocks.get.mockResolvedValue({ data: { unexpected: true } });

    await expect(getAdminCookFamilySizes()).resolves.toEqual([]);
  });

  it("creates and normalizes a cook family size from wrapped data", async () => {
    mocks.post.mockResolvedValue({
      data: {
        data: {
          id: "11",
          code: " small ",
          label: " 1-2 Members ",
          active: "yes",
          sortOrder: "5",
        },
      },
    });

    await expect(
      createAdminCookFamilySize({
        familySize: "SMALL",
        familySizeLabel: "1-2 Members",
        active: true,
        displayOrder: 5,
      }),
    ).resolves.toEqual({
      familySizeId: 11,
      familySize: "small",
      familySizeLabel: "1-2 Members",
      active: true,
      displayOrder: 5,
    });

    expect(mocks.post).toHaveBeenCalledWith("/api/admin/cook-family-sizes", {
      familySize: "SMALL",
      familySizeLabel: "1-2 Members",
      active: true,
      displayOrder: 5,
    });
  });

  it("updates and normalizes a cook family size from direct data", async () => {
    mocks.put.mockResolvedValue({
      data: {
        familySizeId: 4,
        familySize: "LARGE",
        familySizeLabel: "6-8 Members",
        active: false,
        displayOrder: "7",
      },
    });

    await expect(
      updateAdminCookFamilySize(4, {
        familySize: "LARGE",
        familySizeLabel: "6-8 Members",
        active: false,
        displayOrder: 7,
      }),
    ).resolves.toEqual({
      familySizeId: 4,
      familySize: "LARGE",
      familySizeLabel: "6-8 Members",
      active: false,
      displayOrder: 7,
    });

    expect(mocks.put).toHaveBeenCalledWith("/api/admin/cook-family-sizes/4", {
      familySize: "LARGE",
      familySizeLabel: "6-8 Members",
      active: false,
      displayOrder: 7,
    });
  });

  it("updates status and maps boolean strings", async () => {
    mocks.patch.mockResolvedValue({
      data: {
        data: {
          familySizeId: 8,
          familySize: "XLARGE",
          familySizeLabel: "8-10 Members",
          active: "false",
          displayOrder: 6,
        },
      },
    });

    await expect(updateAdminCookFamilySizeStatus(8, false)).resolves.toEqual({
      familySizeId: 8,
      familySize: "XLARGE",
      familySizeLabel: "8-10 Members",
      active: false,
      displayOrder: 6,
    });

    expect(mocks.patch).toHaveBeenCalledWith("/api/admin/cook-family-sizes/8/status", { active: false });
  });

  it("deletes a cook family size and returns its id", async () => {
    mocks.delete.mockResolvedValue({ data: undefined });

    await expect(deleteAdminCookFamilySize(12)).resolves.toBe(12);
    expect(mocks.delete).toHaveBeenCalledWith("/api/admin/cook-family-sizes/12");
  });
});
