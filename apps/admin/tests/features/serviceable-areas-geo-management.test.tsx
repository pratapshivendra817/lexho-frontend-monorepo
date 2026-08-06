import { act, screen, waitFor, within } from "@testing-library/react";
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

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
  onMapboxSave: undefined as ((value: string) => void) | undefined,
  onMapboxChange: undefined as ((value: string) => void) | undefined,
}));

vi.mock("@/features/serviceable-areas/api/geoApi", () => geoMocks);
vi.mock("@/features/serviceable-areas/api/geoScaleOpsApi", () => opsMocks);
vi.mock("react-hot-toast", () => ({
  default: toastMocks,
}));
vi.mock("@/utils/apiError", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback,
}));
vi.mock("@/components/admin", () => ({
  MapboxPolygonEditor: ({ value, onChange, onSave, saveLabel }: any) => {
    adminMocks.onMapboxChange = onChange;
    adminMocks.onMapboxSave = onSave;
    return (
      <div>
        <div data-testid="mapbox-value">{value}</div>
        <button type="button" onClick={() => onChange("{\"type\":\"Polygon\",\"coordinates\":[[1]]}")}>
          mapbox-change
        </button>
        <button type="button" onClick={() => onSave("{\"type\":\"Polygon\",\"coordinates\":[[2]]}")}>
          {saveLabel}
        </button>
      </div>
    );
  },
  PolygonPreview: ({ polygonJson }: { polygonJson: string }) => <div data-testid="polygon-preview">{polygonJson}</div>,
}));

describe("GeoManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMocks.onMapboxChange = undefined;
    adminMocks.onMapboxSave = undefined;
    geoMocks.getGeoCities.mockResolvedValue({
      data: [
        { id: 1, name: "Delhi", state: "Delhi", country: "India", active: true },
        { cityId: 2, name: "Noida", state: "UP", country: "India", isActive: false },
      ],
    });
    geoMocks.getGeoZones.mockResolvedValue({
      items: [{ id: 10, cityId: 1, name: "Central Zone", polygonJson: "{\"type\":\"Polygon\"}", active: true }],
    });
    geoMocks.createGeoCity.mockResolvedValue({});
    geoMocks.updateGeoCity.mockResolvedValue({});
    geoMocks.deleteGeoCity.mockResolvedValue({});
    geoMocks.createGeoZone.mockResolvedValue({});
    geoMocks.updateGeoZone.mockResolvedValue({});
    geoMocks.deleteGeoZone.mockResolvedValue({});
    opsMocks.getScaleProfile.mockResolvedValue({ data: { profile: "10k" } });
    opsMocks.setScaleProfile.mockResolvedValue({});
    opsMocks.addRestrictedArea.mockResolvedValue({});
    opsMocks.deleteRestrictedArea.mockResolvedValue({});
    opsMocks.replayGeoEventDlq.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders loading and empty states from normalized payloads", async () => {
    geoMocks.getGeoCities.mockResolvedValueOnce({ data: [] });
    opsMocks.getScaleProfile.mockImplementationOnce(() => new Promise(() => undefined));

    renderWithProviders(<GeoManagementPage />);

    expect(await screen.findByText("Geo Cities & Zones")).toBeInTheDocument();
    expect(screen.getByText(/Current profile: Loading\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText("Loading cities...")).toBeInTheDocument();
    expect(screen.getByText("No zones found")).toBeInTheDocument();
  });

  it("creates, edits and deletes cities", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeoManagementPage />);

    expect(await screen.findByRole("option", { name: "Delhi" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Noida" })).toBeInTheDocument();
    expect(screen.queryByText("No cities found")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("City Name"));
    await user.type(screen.getByPlaceholderText("City Name"), " Gurgaon ");
    await user.clear(screen.getByPlaceholderText("State"));
    await user.type(screen.getByPlaceholderText("State"), " Haryana ");
    await user.clear(screen.getByPlaceholderText("Country"));
    await user.click(screen.getByRole("button", { name: "Create City" }));

    await waitFor(() => {
      expect(geoMocks.createGeoCity).toHaveBeenCalledWith({
        name: "Gurgaon",
        state: "Haryana",
        country: "India",
        active: true,
      });
    });
    expect(toastMocks.success).toHaveBeenCalledWith("City created");

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByPlaceholderText("City Name")).toHaveValue("Delhi");

    await user.clear(screen.getByPlaceholderText("City Name"));
    await user.type(screen.getByPlaceholderText("City Name"), " New Delhi ");
    await user.click(screen.getByRole("button", { name: "Update City" }));

    await waitFor(() => {
      expect(geoMocks.updateGeoCity).toHaveBeenCalledWith("1", {
        name: "New Delhi",
        state: "Delhi",
        country: "India",
        active: true,
      });
    });
    expect(toastMocks.success).toHaveBeenCalledWith("City updated");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await waitFor(() => {
      expect(geoMocks.deleteGeoCity).toHaveBeenCalledWith(1);
    });
    expect(window.confirm).toHaveBeenCalledWith('Delete city "Delhi"?');
  });

  it("creates, edits and deletes zones including polygon save flow", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeoManagementPage />);

    await screen.findByRole("option", { name: "Delhi" });
    await user.selectOptions(screen.getByDisplayValue("Select City"), "1");
    expect(await screen.findByText("Central Zone")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Zone Name"), " North Zone ");
    await user.click(screen.getByRole("button", { name: "Create Zone Polygon" }));

    await waitFor(() => {
      expect(geoMocks.createGeoZone).toHaveBeenCalledWith({
        cityId: 1,
        name: "North Zone",
        polygonJson: "{\"type\":\"Polygon\",\"coordinates\":[[2]]}",
        active: true,
      });
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Zone created");

    const zoneRow = screen.getByText("Central Zone").closest("tr");
    expect(zoneRow).not.toBeNull();
    await user.click(within(zoneRow as HTMLElement).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByPlaceholderText("Zone Name"));
    await user.type(screen.getByPlaceholderText("Zone Name"), " Central Updated ");
    await user.click(screen.getByRole("button", { name: "Update Zone Polygon" }));

    await waitFor(() => {
      expect(geoMocks.updateGeoZone).toHaveBeenCalledWith("10", {
        cityId: 1,
        name: "Central Updated",
        polygonJson: "{\"type\":\"Polygon\",\"coordinates\":[[2]]}",
        active: true,
      });
    });

    await act(async () => {
      adminMocks.onMapboxChange?.("{preview-polygon}");
    });
    expect(screen.getByTestId("polygon-preview")).toHaveTextContent("{preview-polygon}");

  });

  it("shows validation and extracted error messages for city, zone and scale ops failures", async () => {
    const user = userEvent.setup();
    geoMocks.createGeoCity.mockRejectedValueOnce(new Error("city failed"));
    geoMocks.createGeoZone.mockRejectedValueOnce(new Error("zone failed"));
    opsMocks.setScaleProfile.mockRejectedValueOnce(new Error("profile failed"));

    renderWithProviders(<GeoManagementPage />);
    await screen.findByRole("option", { name: "Delhi" });

    await user.click(screen.getByRole("button", { name: "Create City" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to save city: City name and state are required");
    });

    toastMocks.error.mockClear();
    await user.type(screen.getByPlaceholderText("City Name"), "City");
    await user.type(screen.getByPlaceholderText("State"), "State");
    await user.click(screen.getByRole("button", { name: "Create City" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to save city: city failed");
    });

    toastMocks.error.mockClear();
    await user.click(screen.getByRole("button", { name: "Create Zone" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to save zone: City, zone name and Polygon JSON are required");
    });

    toastMocks.error.mockClear();
    await user.selectOptions(screen.getByDisplayValue("Select City"), "1");
    await user.type(screen.getByPlaceholderText("Zone Name"), "Zone");
    await user.click(screen.getByRole("button", { name: "Create Zone Polygon" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to save zone: zone failed");
    });

    toastMocks.error.mockClear();
    await user.click(screen.getByRole("button", { name: "Apply Scale Profile" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Unable to set scale profile: profile failed");
    });
  });

  it("handles scale ops successes and mutation side effects", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeoManagementPage />);
    await screen.findByRole("option", { name: "Delhi" });

    await user.click(screen.getByRole("button", { name: "Apply Scale Profile" }));
    await waitFor(() => {
      expect(opsMocks.setScaleProfile).toHaveBeenCalledWith("10k", true);
    });

    await user.type(screen.getByPlaceholderText("Latitude"), "28.6139");
    await user.type(screen.getByPlaceholderText("Longitude"), "77.209");
    await user.clear(screen.getByPlaceholderText("Precision (e.g. 6)"));
    await user.type(screen.getByPlaceholderText("Precision (e.g. 6)"), "6");
    await user.click(screen.getByRole("button", { name: "Add Restricted Area" }));
    await waitFor(() => {
      expect(opsMocks.addRestrictedArea).toHaveBeenCalledWith(28.6139, 77.209, 6);
    });

    await user.type(screen.getByPlaceholderText("Geohash"), "ttnfbg");
    await user.click(screen.getByRole("button", { name: "Delete Restricted Area" }));
    await waitFor(() => {
      expect(opsMocks.deleteRestrictedArea).toHaveBeenCalledWith("ttnfbg");
    });
    expect(screen.getByPlaceholderText("Geohash")).toHaveValue("");

    await user.clear(screen.getByPlaceholderText("maxMessages"));
    await user.type(screen.getByPlaceholderText("maxMessages"), "123");
    await user.click(screen.getByRole("button", { name: "Replay Geo DLQ" }));
    await waitFor(() => {
      expect(opsMocks.replayGeoEventDlq).toHaveBeenCalledWith(123);
    });
  });
});
