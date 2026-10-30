import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
    patch: mocks.patchMock,
    delete: mocks.deleteMock,
  },
}));

import {
  createCityArea,
  createWebsiteCity,
  deleteCityArea,
  deleteWebsiteCity,
  getCityAreas,
  getWebsiteCities,
  reorderCityAreas,
  updateCityArea,
  updateCityAreaStatus,
  updateWebsiteCity,
  updateWebsiteCityStatus,
} from "@/features/website-cities/api/websiteCitiesApi";

describe("websiteCitiesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes cities from nested payloads", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              id: 7,
              name: "Mumbai",
              slug: "mumbai",
              display_order: "3",
              status: "ACTIVE",
            },
          ],
        },
      },
    });

    const result = await getWebsiteCities();

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/website/header/cities");
    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        name: "Mumbai",
        slug: "mumbai",
        displayOrder: 3,
        active: true,
      }),
    ]);
  });

  it("normalizes areas and forwards CRUD payloads", async () => {
    const payload = {
      name: "Andheri",
      slug: "andheri",
      displayOrder: 1,
      active: true,
    };

    mocks.getMock.mockResolvedValue({
      data: {
        items: [
          {
            id: 15,
            city_id: 7,
            name: "Andheri",
            slug: "andheri",
            displayOrder: 2,
            active: true,
          },
        ],
      },
    });
    mocks.postMock.mockResolvedValue({ data: { ok: true } });
    mocks.putMock.mockResolvedValue({ data: { ok: true } });
    mocks.patchMock.mockResolvedValue({ data: { ok: true } });
    mocks.deleteMock.mockResolvedValue({ data: { ok: true } });

    const areas = await getCityAreas(7);
    await createWebsiteCity(payload);
    await updateWebsiteCity(7, payload);
    await updateWebsiteCityStatus(7, false);
    await deleteWebsiteCity(7);
    await createCityArea(7, payload);
    await updateCityArea(15, payload);
    await updateCityAreaStatus(15, false);
    await deleteCityArea(15);
    await reorderCityAreas(7, [{ id: 15, displayOrder: 4 }]);

    expect(areas).toEqual([
      expect.objectContaining({
        id: 15,
        cityId: 7,
        displayOrder: 2,
      }),
    ]);
    expect(mocks.postMock).toHaveBeenNthCalledWith(1, "/api/admin/website/header/cities", payload);
    expect(mocks.putMock).toHaveBeenNthCalledWith(1, "/api/admin/website/header/cities/7", payload);
    expect(mocks.patchMock).toHaveBeenNthCalledWith(1, "/api/admin/website/header/cities/7/status", { active: false });
    expect(mocks.deleteMock).toHaveBeenNthCalledWith(1, "/api/admin/website/header/cities/7");
    expect(mocks.postMock).toHaveBeenNthCalledWith(2, "/api/admin/website/cities/7/areas", payload);
    expect(mocks.putMock).toHaveBeenNthCalledWith(2, "/api/admin/website/areas/15", payload);
    expect(mocks.patchMock).toHaveBeenNthCalledWith(2, "/api/admin/website/areas/15/status", { active: false });
    expect(mocks.deleteMock).toHaveBeenNthCalledWith(2, "/api/admin/website/areas/15");
    expect(mocks.patchMock).toHaveBeenNthCalledWith(3, "/api/admin/website/cities/7/areas/reorder", [
      { areaId: 15, displayOrder: 4 },
    ]);
  });
});
