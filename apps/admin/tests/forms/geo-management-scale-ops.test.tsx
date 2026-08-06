import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GeoManagementPage from "@/features/serviceable-areas/pages/GeoManagementPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const geoMocks = vi.hoisted(() => ({
  getGeoCities: vi.fn(),
  getGeoZones: vi.fn(),
  createGeoCity: vi.fn(),
  updateGeoCity: vi.fn(),
  deleteGeoCity: vi.fn(),
  createGeoZone: vi.fn(),
  updateGeoZone: vi.fn(),
  deleteGeoZone: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  getScaleProfile: vi.fn(),
  setScaleProfile: vi.fn(),
  addRestrictedArea: vi.fn(),
  deleteRestrictedArea: vi.fn(),
  replayGeoEventDlq: vi.fn(),
}));

vi.mock("@/features/serviceable-areas/api/geoApi", () => geoMocks);
vi.mock("@/features/serviceable-areas/api/geoScaleOpsApi", () => opsMocks);
vi.mock("@/components/admin", () => ({
  MapboxPolygonEditor: () => null,
  PolygonPreview: () => null,
}));

describe("GeoManagementPage Scale Ops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    geoMocks.getGeoCities.mockResolvedValue({ data: [] });
    geoMocks.getGeoZones.mockResolvedValue({ data: [] });
    opsMocks.getScaleProfile.mockResolvedValue({ data: { profile: "10k" } });
    opsMocks.setScaleProfile.mockResolvedValue({});
    opsMocks.addRestrictedArea.mockResolvedValue({});
    opsMocks.deleteRestrictedArea.mockResolvedValue({});
    opsMocks.replayGeoEventDlq.mockResolvedValue({});
  });

  it("executes scale ops actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeoManagementPage />);

    expect(await screen.findByText("Geo Cities & Zones")).toBeInTheDocument();
    expect(await screen.findByText(/Current profile:/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Apply Scale Profile/i }));
    await waitFor(() => {
      expect(opsMocks.setScaleProfile).toHaveBeenCalledWith("10k", true);
    });

    await user.type(screen.getByPlaceholderText("Latitude"), "28.6139");
    await user.type(screen.getByPlaceholderText("Longitude"), "77.2090");
    await user.clear(screen.getByPlaceholderText("Precision (e.g. 6)"));
    await user.type(screen.getByPlaceholderText("Precision (e.g. 6)"), "6");
    await user.click(screen.getByRole("button", { name: /Add Restricted Area/i }));
    await waitFor(() => {
      expect(opsMocks.addRestrictedArea).toHaveBeenCalledWith(28.6139, 77.209, 6);
    });

    await user.type(screen.getByPlaceholderText("Geohash"), "ttnfbg");
    await user.click(screen.getByRole("button", { name: /Delete Restricted Area/i }));
    await waitFor(() => {
      expect(opsMocks.deleteRestrictedArea).toHaveBeenCalledWith("ttnfbg");
    });

    await user.clear(screen.getByPlaceholderText("maxMessages"));
    await user.type(screen.getByPlaceholderText("maxMessages"), "150");
    await user.click(screen.getByRole("button", { name: /Replay Geo DLQ/i }));
    await waitFor(() => {
      expect(opsMocks.replayGeoEventDlq).toHaveBeenCalledWith(150);
    });
  });
});
