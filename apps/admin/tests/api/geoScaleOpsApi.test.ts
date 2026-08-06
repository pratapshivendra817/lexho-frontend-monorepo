import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    post: mocks.postMock,
    delete: mocks.deleteMock,
  },
}));

import {
  addRestrictedArea,
  deleteRestrictedArea,
  getScaleProfile,
  replayGeoEventDlq,
  setScaleProfile,
} from "@/features/serviceable-areas/api/geoScaleOpsApi";

describe("geoScaleOpsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMock.mockResolvedValue({ data: {} });
    mocks.postMock.mockResolvedValue({ data: {} });
    mocks.deleteMock.mockResolvedValue({ data: {} });
  });

  it("fetches scale profile", async () => {
    await getScaleProfile();
    expect(mocks.getMock).toHaveBeenCalledWith("/api/v1/admin/scale/profile");
  });

  it("sets scale profile with query params", async () => {
    await setScaleProfile("100k", true);
    expect(mocks.postMock).toHaveBeenCalledWith("/api/v1/admin/scale/profile", null, {
      params: { profile: "100k", dryRun: true },
    });
  });

  it("adds and deletes restricted area", async () => {
    await addRestrictedArea(28.6139, 77.209, 6);
    expect(mocks.postMock).toHaveBeenCalledWith("/api/v1/admin/serviceability/restricted-area", null, {
      params: { lat: 28.6139, lng: 77.209, precision: 6 },
    });

    await deleteRestrictedArea("ttnfbg");
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/v1/admin/serviceability/restricted-area", {
      params: { geohash: "ttnfbg" },
    });
  });

  it("replays geo DLQ with max messages", async () => {
    await replayGeoEventDlq(100);
    expect(mocks.postMock).toHaveBeenCalledWith("/api/v1/admin/geo/events/dlq/replay", null, {
      params: { maxMessages: 100 },
    });
  });
});
