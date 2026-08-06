import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    post: mocks.postMock,
    put: mocks.putMock,
  },
}));

import {
  createAdminCookCoverage,
  getAdminCookCoverage,
  updateAdminCookCoverage,
} from "@/features/cleaning-coverage/api/cleaningCoverageApi";

describe("cleaningCoverageApi cook coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes quantity-aware cook coverage items", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: [
          {
            id: 11,
            serviceId: 5,
            familySize: "MEDIUM",
            members: "3-4",
            familySizeLabel: "3-4 Members",
            reference: "Standard home cooking",
            sortOrder: 20,
            active: true,
            items: [
              { id: 1, name: "Dal", icon: "dal", sortOrder: 1, quantity: 1 },
              { id: 2, name: "Roti", icon: "roti", sortOrder: 4, quantity: 10 },
            ],
          },
        ],
      },
    });

    const result = await getAdminCookCoverage();

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/cook-coverage");
    expect(result).toEqual([
      expect.objectContaining({
        id: 11,
        serviceId: 5,
        familySize: "MEDIUM",
        items: [
          expect.objectContaining({ name: "Dal", quantity: 1 }),
          expect.objectContaining({ name: "Roti", quantity: 10 }),
        ],
      }),
    ]);
  });

  it("forwards quantity in create and update payloads", async () => {
    const payload = {
      serviceId: 5,
      familySize: "MEDIUM" as const,
      members: "3-4",
      familySizeLabel: "3-4 Members",
      reference: "Standard home cooking",
      sortOrder: 20,
      active: true,
      items: [
        { name: "Dal", icon: "dal", sortOrder: 1, quantity: 1 },
        { name: "Roti", icon: "roti", sortOrder: 4, quantity: 10 },
      ],
    };

    mocks.postMock.mockResolvedValue({ data: { data: { id: 21, ...payload } } });
    mocks.putMock.mockResolvedValue({ data: { data: { id: 22, ...payload } } });

    await createAdminCookCoverage(payload);
    await updateAdminCookCoverage(22, payload);

    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/cook-coverage", payload);
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/cook-coverage/22", payload);
  });
});
