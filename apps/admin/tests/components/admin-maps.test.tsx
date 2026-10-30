import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mapboxMocks = vi.hoisted(() => {
  type Handler = () => void;
  type MockMapInstance = {
    options: Record<string, unknown>;
    handlers: Record<string, Handler>;
    on: ReturnType<typeof vi.fn>;
    addControl: ReturnType<typeof vi.fn>;
    fitBounds: ReturnType<typeof vi.fn>;
    jumpTo: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    trigger: (event: string) => void;
  };
  type MockDrawInstance = {
    options: Record<string, unknown>;
    data: { type: "FeatureCollection"; features: any[] };
    set: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    deleteAll: ReturnType<typeof vi.fn>;
  };

  return {
    maps: [] as MockMapInstance[],
    draws: [] as MockDrawInstance[],
    accessToken: "",
    createMap(options: Record<string, unknown>) {
      const instance: MockMapInstance = {
        options,
        handlers: {},
        on: vi.fn((event: string, handler: Handler) => {
          instance.handlers[event] = handler;
        }),
        addControl: vi.fn(),
        fitBounds: vi.fn(),
        jumpTo: vi.fn(),
        remove: vi.fn(),
        trigger: (event: string) => {
          instance.handlers[event]?.();
        },
      };
      this.maps.push(instance);
      return instance;
    },
    createDraw(options: Record<string, unknown>) {
      const instance: MockDrawInstance = {
        options,
        data: { type: "FeatureCollection", features: [] },
        set: vi.fn((next) => {
          instance.data = next;
        }),
        getAll: vi.fn(() => instance.data),
        deleteAll: vi.fn(() => {
          instance.data = { type: "FeatureCollection", features: [] };
        }),
      };
      this.draws.push(instance);
      return instance;
    },
    reset() {
      this.maps.length = 0;
      this.draws.length = 0;
      this.accessToken = "";
    },
  };
});

vi.mock("mapbox-gl", () => {
  class MockLngLatBounds {
    points: number[][];

    constructor(sw: number[], ne: number[]) {
      this.points = [sw, ne];
    }

    extend(point: number[]) {
      this.points.push(point);
      return this;
    }
  }

  return {
    default: {
      Map: function MockMap(options: Record<string, unknown>) {
        return mapboxMocks.createMap(options);
      },
      LngLatBounds: MockLngLatBounds,
      NavigationControl: class {},
      FullscreenControl: class {},
      get accessToken() {
        return mapboxMocks.accessToken;
      },
      set accessToken(value: string) {
        mapboxMocks.accessToken = value;
      },
    },
  };
});

vi.mock("@mapbox/mapbox-gl-draw", () => ({
  default: function MockDraw(options: Record<string, unknown>) {
    return mapboxMocks.createDraw(options);
  },
}));

import mapboxgl from "mapbox-gl";
import { MapboxPolygonEditor, PolygonPreview } from "@/components/admin";

const polygonJson = JSON.stringify({
  type: "Polygon",
  coordinates: [
    [
      [77.1, 28.6],
      [77.2, 28.7],
      [77.3, 28.6],
      [77.1, 28.6],
    ],
  ],
});

const updatedPolygonJson = JSON.stringify({
  type: "Polygon",
  coordinates: [
    [
      [78.1, 29.1],
      [78.3, 29.2],
      [78.4, 29.1],
      [78.1, 29.1],
    ],
  ],
});

const multiPolygonJson = JSON.stringify({
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [80.1, 30.1],
        [80.4, 30.5],
        [80.7, 30.1],
        [80.1, 30.1],
      ],
    ],
  ],
});

function polygonFeatureCollection(rawPolygonJson: string) {
  const parsed = JSON.parse(rawPolygonJson) as { coordinates: number[][][] };
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Polygon" as const,
          coordinates: parsed.coordinates,
        },
      },
    ],
  };
}

describe("admin map components", () => {
  beforeEach(() => {
    mapboxMocks.reset();
    vi.stubEnv("VITE_MAPBOX_TOKEN", "mapbox-test-token");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("centers a new zone on the selected city without replacing existing geometry", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: [72.8777, 19.076] } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<MapboxPolygonEditor cityQuery="Mumbai, Maharashtra, India" />);
    await waitFor(() => expect(mapboxMocks.maps[0].jumpTo).toHaveBeenCalledWith({ center: [72.8777, 19.076], zoom: 11 }));
    rerender(<MapboxPolygonEditor value={polygonJson} cityQuery="Delhi, India" />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders PolygonPreview fallback states for empty, invalid, and unsupported polygon data", () => {
    const { rerender } = render(<PolygonPreview />);

    expect(screen.getByRole("img", { name: "Polygon preview" })).toBeInTheDocument();
    expect(screen.getByText("Enter valid Polygon JSON to preview map")).toBeInTheDocument();
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();

    rerender(<PolygonPreview polygonJson="{bad json" />);
    expect(screen.getByText("Enter valid Polygon JSON to preview map")).toBeInTheDocument();

    rerender(<PolygonPreview polygonJson={JSON.stringify({ type: "LineString", coordinates: [] })} />);
    expect(screen.getByText("Enter valid Polygon JSON to preview map")).toBeInTheDocument();
  });

  it("renders PolygonPreview polygons, markers, multipolygon data, and custom height", () => {
    const { rerender, container } = render(<PolygonPreview polygonJson={polygonJson} height={260} />);

    const svg = screen.getByRole("img", { name: "Polygon preview" });
    expect(svg).toHaveAttribute("viewBox", "0 0 560 260");
    expect(container.querySelector("polygon")).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(4);
    expect(screen.queryByText("Enter valid Polygon JSON to preview map")).not.toBeInTheDocument();

    rerender(<PolygonPreview polygonJson={multiPolygonJson} />);
    expect(container.querySelector("polygon")).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(4);
  });

  it("renders the token-missing fallback instead of initializing mapbox", () => {
    vi.stubEnv("VITE_MAPBOX_TOKEN", "");

    render(<MapboxPolygonEditor value={polygonJson} />);

    expect(screen.getByText(/Mapbox token missing/)).toBeInTheDocument();
    expect(screen.getByText("VITE_MAPBOX_TOKEN")).toBeInTheDocument();
    expect(mapboxMocks.maps).toHaveLength(0);
    expect(mapboxMocks.draws).toHaveLength(0);
  });

  it("initializes mapbox, loads the initial polygon, auto-saves draw changes, and cleans up timers on unmount", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSave = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = render(
      <MapboxPolygonEditor
        value={polygonJson}
        onChange={onChange}
        onSave={onSave}
        autoSaveOnChange
        autoSaveDelayMs={20}
      />,
    );

    expect(screen.getByText(/Use polygon tool to draw/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Polygon" })).toBeEnabled();
    expect(mapboxgl.accessToken).toBe("mapbox-test-token");
    expect(mapboxMocks.maps).toHaveLength(1);
    expect(mapboxMocks.draws).toHaveLength(1);

    const map = mapboxMocks.maps[0];
    const draw = mapboxMocks.draws[0];
    map.trigger("load");

    expect(map.addControl).toHaveBeenCalledWith(draw, "top-left");
    expect(draw.set).toHaveBeenCalledWith(polygonFeatureCollection(polygonJson));
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(draw.options).toEqual(
      expect.objectContaining({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
        defaultMode: "simple_select",
      }),
    );

    draw.data = polygonFeatureCollection(updatedPolygonJson);
    map.trigger("draw.create");
    expect(onChange).toHaveBeenLastCalledWith(updatedPolygonJson);
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(updatedPolygonJson));

    draw.data = { type: "FeatureCollection", features: [] };
    map.trigger("draw.delete");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(onSave).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Save Polygon" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(onSave).toHaveBeenLastCalledWith("");

    draw.data = polygonFeatureCollection(updatedPolygonJson);
    map.trigger("draw.update");
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(map.remove).toHaveBeenCalledTimes(1);
  });

  it("supports manual save before map load, syncs external value changes, and keeps save disabled for empty values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSave = vi.fn();
    const { rerender } = render(
      <MapboxPolygonEditor value={polygonJson} onChange={onChange} onSave={onSave} saveLabel="Persist Polygon" />,
    );

    const saveButton = screen.getByRole("button", { name: "Persist Polygon" });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);
    expect(onChange).toHaveBeenCalledWith("");
    expect(onSave).toHaveBeenCalledWith("");

    const map = mapboxMocks.maps[0];
    const draw = mapboxMocks.draws[0];
    map.trigger("load");

    rerender(<MapboxPolygonEditor value={polygonJson} onChange={onChange} onSave={onSave} saveLabel="Persist Polygon" />);
    expect(draw.deleteAll).not.toHaveBeenCalled();

    rerender(<MapboxPolygonEditor value={updatedPolygonJson} onChange={onChange} onSave={onSave} saveLabel="Persist Polygon" />);
    expect(draw.deleteAll).toHaveBeenCalledTimes(1);
    expect(draw.set).toHaveBeenLastCalledWith(polygonFeatureCollection(updatedPolygonJson));

    rerender(<MapboxPolygonEditor value="" onChange={onChange} onSave={onSave} saveLabel="Persist Polygon" />);
    expect(screen.getByRole("button", { name: "Persist Polygon" })).toBeDisabled();
  });

  it("uses read-only mapbox controls, ignores draw events, and skips invalid initial polygon data", () => {
    const onChange = vi.fn();
    const onSave = vi.fn();

    render(
      <MapboxPolygonEditor
        value={JSON.stringify({ type: "Polygon", coordinates: [[[77.1, 28.6], [77.2, 28.7]]] })}
        onChange={onChange}
        onSave={onSave}
        readOnly
        isSaving
      />,
    );

    expect(screen.queryByText(/Use polygon tool to draw/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Saving..." })).not.toBeInTheDocument();

    const map = mapboxMocks.maps[0];
    const draw = mapboxMocks.draws[0];
    map.trigger("load");

    expect(draw.options).toEqual(
      expect.objectContaining({
        controls: {},
        defaultMode: "simple_select",
      }),
    );
    expect(draw.set).not.toHaveBeenCalled();
    expect(map.fitBounds).not.toHaveBeenCalled();

    draw.data = polygonFeatureCollection(updatedPolygonJson);
    map.trigger("draw.update");
    expect(onChange).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
