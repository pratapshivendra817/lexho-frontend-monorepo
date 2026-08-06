import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: apiMocks,
}));

import {
  createGeoCity,
  createGeoZone,
  deleteGeoCity,
  deleteGeoZone,
  getGeoCities,
  getGeoZones,
  updateGeoCity,
  updateGeoZone,
} from "@/features/serviceable-areas/api/geoApi";

describe("geoApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls city endpoints and returns response payloads", async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { cities: [] } });
    apiMocks.post.mockResolvedValueOnce({ data: { id: 1 } });
    apiMocks.put.mockResolvedValueOnce({ data: { id: 2 } });
    apiMocks.delete.mockResolvedValueOnce({ data: { deleted: true } });

    await expect(getGeoCities()).resolves.toEqual({ cities: [] });
    await expect(createGeoCity({ name: "Delhi", state: "Delhi", country: "India", active: true })).resolves.toEqual({ id: 1 });
    await expect(updateGeoCity(2, { name: "Noida", state: "UP", country: "India", active: false })).resolves.toEqual({ id: 2 });
    await expect(deleteGeoCity("9")).resolves.toEqual({ deleted: true });

    expect(apiMocks.get).toHaveBeenCalledWith("/api/v1/admin/geo/cities");
    expect(apiMocks.post).toHaveBeenCalledWith("/api/v1/admin/geo/cities", {
      name: "Delhi",
      state: "Delhi",
      country: "India",
      active: true,
    });
    expect(apiMocks.put).toHaveBeenCalledWith("/api/v1/admin/geo/cities/2", {
      name: "Noida",
      state: "UP",
      country: "India",
      active: false,
    });
    expect(apiMocks.delete).toHaveBeenCalledWith("/api/v1/admin/geo/cities/9");
  });

  it("calls zone endpoints with and without city filters", async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { data: [] } });
    apiMocks.post.mockResolvedValueOnce({ data: { id: 11 } });
    apiMocks.put.mockResolvedValueOnce({ data: { id: 12 } });
    apiMocks.delete.mockResolvedValueOnce({ data: { deleted: true } });

    await expect(getGeoZones()).resolves.toEqual({ data: [] });
    await expect(getGeoZones(7)).resolves.toEqual({ data: [] });
    await expect(createGeoZone({ cityId: 7, name: "Zone A", polygonJson: "{\"type\":\"Polygon\"}", active: true })).resolves.toEqual({ id: 11 });
    await expect(updateGeoZone(12, { cityId: 7, name: "Zone B", polygonJson: "{\"type\":\"Polygon\"}", active: false })).resolves.toEqual({ id: 12 });
    await expect(deleteGeoZone(13)).resolves.toEqual({ deleted: true });

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, "/api/v1/admin/geo/zones", { params: undefined });
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, "/api/v1/admin/geo/zones", { params: { cityId: 7 } });
    expect(apiMocks.post).toHaveBeenCalledWith("/api/v1/admin/geo/zones", {
      cityId: 7,
      name: "Zone A",
      polygonJson: "{\"type\":\"Polygon\"}",
      active: true,
    });
    expect(apiMocks.put).toHaveBeenCalledWith("/api/admin/geo/zones/12", {
      cityId: 7,
      name: "Zone B",
      polygonJson: "{\"type\":\"Polygon\"}",
      active: false,
    });
    expect(apiMocks.delete).toHaveBeenCalledWith("/api/v1/admin/geo/zones/13");
  });

  it("falls back to the v1 zone update endpoint when the legacy path fails", async () => {
    apiMocks.put
      .mockRejectedValueOnce(new Error("legacy failed"))
      .mockResolvedValueOnce({ data: { id: 15, updated: true } });

    await expect(
      updateGeoZone("15", { cityId: 3, name: "Fallback Zone", polygonJson: "{\"type\":\"Polygon\"}", active: true }),
    ).resolves.toEqual({ id: 15, updated: true });

    expect(apiMocks.put).toHaveBeenNthCalledWith(1, "/api/admin/geo/zones/15", {
      cityId: 3,
      name: "Fallback Zone",
      polygonJson: "{\"type\":\"Polygon\"}",
      active: true,
    });
    expect(apiMocks.put).toHaveBeenNthCalledWith(2, "/api/v1/admin/geo/zones/15", {
      cityId: 3,
      name: "Fallback Zone",
      polygonJson: "{\"type\":\"Polygon\"}",
      active: true,
    });
  });
});
