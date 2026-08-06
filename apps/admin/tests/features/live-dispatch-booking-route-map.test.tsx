import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addSource: vi.fn(),
  addLayer: vi.fn(),
  fitBounds: vi.fn(),
  getSource: vi.fn(),
  removeMap: vi.fn(),
  onLoad: undefined as undefined | (() => void),
  removePartnerMarker: vi.fn(),
  removeCustomerMarker: vi.fn(),
  setData: vi.fn(),
}));

vi.mock("mapbox-gl", () => {
  class MockLngLatBounds {
    points: [number, number][] = [];

    extend(point: [number, number]) {
      this.points.push(point);
      return this;
    }
  }

  class MockMarker {
    color: string;

    constructor({ color }: { color: string }) {
      this.color = color;
    }

    setLngLat() {
      return this;
    }

    addTo() {
      return this;
    }

    remove() {
      if (this.color === "#dc2626") mocks.removePartnerMarker();
      if (this.color === "#16a34a") mocks.removeCustomerMarker();
      return this;
    }
  }

  class MockMap {
    constructor() {}

    on(event: string, callback: () => void) {
      if (event === "load") mocks.onLoad = callback;
    }

    addSource = mocks.addSource;
    addLayer = mocks.addLayer;
    getSource = mocks.getSource;
    fitBounds = mocks.fitBounds;
    remove = mocks.removeMap;
  }

  return {
    default: {
      Map: MockMap,
      Marker: MockMarker,
      LngLatBounds: MockLngLatBounds,
      accessToken: "",
    },
  };
});

import { BookingRouteMap } from "@/features/live-dispatch/components";

describe("BookingRouteMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onLoad = undefined;
    mocks.getSource.mockReturnValue({ setData: mocks.setData });
    vi.stubEnv("VITE_MAPBOX_TOKEN", "");
  });

  it("renders a token warning when mapbox token is missing", () => {
    render(<BookingRouteMap routeCoordinates={[]} />);
    expect(screen.getByText(/Mapbox token missing/i)).toBeInTheDocument();
  });

  it("renders an empty state when no route or marker data is available", () => {
    vi.stubEnv("VITE_MAPBOX_TOKEN", "map-token");
    render(<BookingRouteMap routeCoordinates={[]} />);
    expect(screen.getByText("Route map data is not available for this booking yet.")).toBeInTheDocument();
  });

  it("initializes the map, updates route data, fits bounds and cleans up markers", () => {
    vi.stubEnv("VITE_MAPBOX_TOKEN", "map-token");
    const routeCoordinates = [
      { latitude: 28.61, longitude: 77.2 },
      { latitude: 28.62, longitude: 77.21 },
    ];
    const partnerLocation = { latitude: 28.63, longitude: 77.22 };
    const customerLocation = { latitude: 28.64, longitude: 77.23 };

    const { container, rerender, unmount } = render(
      <BookingRouteMap
        routeCoordinates={routeCoordinates}
        partnerLocation={partnerLocation}
        customerLocation={customerLocation}
        height={420}
      />,
    );

    expect(container.firstChild).toHaveStyle({ height: "420px" });
    mocks.onLoad?.();
    expect(mocks.addSource).toHaveBeenCalledWith(
      "booking-route",
      expect.objectContaining({
        type: "geojson",
        data: expect.objectContaining({
          geometry: expect.objectContaining({
            coordinates: [
              [77.2, 28.61],
              [77.21, 28.62],
            ],
          }),
        }),
      }),
    );
    expect(mocks.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: "booking-route-line" }));
    expect(mocks.setData).toHaveBeenCalled();
    expect(mocks.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: 42, maxZoom: 15, duration: 0 });

    rerender(
      <BookingRouteMap
        routeCoordinates={routeCoordinates}
        partnerLocation={null}
        customerLocation={null}
      />,
    );
    expect(mocks.removePartnerMarker).toHaveBeenCalled();
    expect(mocks.removeCustomerMarker).toHaveBeenCalled();

    unmount();
    expect(mocks.removeMap).toHaveBeenCalled();
  });
});
