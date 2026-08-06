import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: apiMocks.get,
    post: apiMocks.post,
    put: apiMocks.put,
    delete: apiMocks.delete,
  },
}));

import {
  createAdminCleaningCoverage,
  deleteAdminCleaningCoverage,
  deleteAdminCookCoverage,
  getAdminCleaningCoverage,
  getAdminCookCoverage,
  updateAdminCleaningCoverage,
} from "@/features/cleaning-coverage/api/cleaningCoverageApi";

describe("cleaning coverage api supplement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes cleaning coverage lists and item payloads from mixed backend shapes", async () => {
    apiMocks.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "10",
              durationHours: "3",
              reference: " 3BHK ",
              sortOrder: "30",
              active: "active",
              tasks: [{ id: "1", name: " Mopping ", estimatedMinutes: "25", icon: " mopping ", sortOrder: "2" }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "11",
            serviceId: "7",
            familySize: "unknown",
            members: "4",
            reference: " Cook ",
            active: "0",
            items: [{ id: "3", name: " Dal ", icon: " dal ", sortOrder: "1", quantity: "2" }],
          },
        ],
      });

    await expect(getAdminCleaningCoverage()).resolves.toEqual([
      {
        id: 10,
        durationHours: 3,
        reference: "3BHK",
        sortOrder: 30,
        active: true,
        tasks: [{ id: 1, name: "Mopping", estimatedMinutes: 25, icon: "mopping", sortOrder: 2 }],
      },
    ]);

    await expect(getAdminCookCoverage()).resolves.toEqual([
      {
        id: 11,
        serviceId: 7,
        familySize: "MEDIUM",
        members: "4",
        familySizeLabel: "3-4 Members",
        reference: "Cook",
        sortOrder: 0,
        active: false,
        items: [{ id: 3, name: "Dal", icon: "dal", sortOrder: 1, quantity: 2 }],
      },
    ]);
  });

  it("forwards cleaning create and update payloads and returns delete fallbacks", async () => {
    const payload = {
      durationHours: 2,
      reference: "2BHK",
      sortOrder: 20,
      active: true,
      tasks: [{ name: "Dusting", estimatedMinutes: 15, icon: "dusting", sortOrder: 1 }],
    };

    apiMocks.post.mockResolvedValueOnce({ data: { data: { id: 21, ...payload } } });
    apiMocks.put.mockResolvedValueOnce({ data: { data: { id: 22, ...payload } } });
    apiMocks.delete
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { message: "Cook removed" } });

    await expect(createAdminCleaningCoverage(payload)).resolves.toEqual({
      id: 21,
      durationHours: 2,
      reference: "2BHK",
      sortOrder: 20,
      active: true,
      tasks: [{ id: undefined, name: "Dusting", estimatedMinutes: 15, icon: "dusting", sortOrder: 1 }],
    });
    await expect(updateAdminCleaningCoverage(22, payload)).resolves.toEqual({
      id: 22,
      durationHours: 2,
      reference: "2BHK",
      sortOrder: 20,
      active: true,
      tasks: [{ id: undefined, name: "Dusting", estimatedMinutes: 15, icon: "dusting", sortOrder: 1 }],
    });
    await expect(deleteAdminCleaningCoverage(22)).resolves.toEqual({
      message: "Cleaning coverage deleted successfully",
    });
    await expect(deleteAdminCookCoverage(7)).resolves.toEqual({
      message: "Cook removed",
    });

    expect(apiMocks.post).toHaveBeenCalledWith("/api/admin/cleaning-coverage", payload);
    expect(apiMocks.put).toHaveBeenCalledWith("/api/admin/cleaning-coverage/22", payload);
    expect(apiMocks.delete).toHaveBeenNthCalledWith(1, "/api/admin/cleaning-coverage/22");
    expect(apiMocks.delete).toHaveBeenNthCalledWith(2, "/api/admin/cook-coverage/7");
  });
});
