import { useEffect, useRef } from "react";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

type MapboxPolygonEditorProps = {
  value?: string;
  onChange?: (nextPolygonJson: string) => void;
  onSave?: (nextPolygonJson: string) => void;
  autoSaveOnChange?: boolean;
  autoSaveDelayMs?: number;
  isSaving?: boolean;
  saveLabel?: string;
  height?: number;
  readOnly?: boolean;
};

type PolygonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: PolygonFeature[];
};

function toFeatureCollection(polygonJson?: string): FeatureCollection | null {
  if (!polygonJson) return null;
  try {
    const parsed = JSON.parse(polygonJson) as { type?: string; coordinates?: unknown };
    if (parsed.type !== "Polygon" || !Array.isArray(parsed.coordinates)) return null;
    const coordinates = parsed.coordinates as number[][][];
    if (!Array.isArray(coordinates[0]) || coordinates[0].length < 3) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates,
          },
        },
      ],
    };
  } catch {
    return null;
  }
}

function extractPolygonJson(draw: MapboxDraw) {
  const data = draw.getAll() as FeatureCollection;
  const polygon = data.features.find((feature) => feature.geometry?.type === "Polygon");
  if (!polygon) return "";
  return JSON.stringify({
    type: "Polygon",
    coordinates: polygon.geometry.coordinates,
  });
}

export function MapboxPolygonEditor({
  value,
  onChange,
  onSave,
  autoSaveOnChange = false,
  autoSaveDelayMs = 800,
  isSaving = false,
  saveLabel = "Save Polygon",
  height = 280,
  readOnly = false,
}: MapboxPolygonEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const latestPolygonJsonRef = useRef(value ?? "");
  const saveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const initialValueRef = useRef(value);
  const hasAppliedInitialRef = useRef(false);

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    latestPolygonJsonRef.current = value ?? "";
  }, [value]);

  useEffect(() => () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [77.209, 28.6139],
      zoom: 10,
    });
    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: readOnly
        ? {}
        : {
            polygon: true,
            trash: true,
          },
      defaultMode: readOnly ? "simple_select" : "draw_polygon",
    });
    drawRef.current = draw;

    map.on("load", () => {
      map.addControl(draw, "top-left");

      const initial = toFeatureCollection(initialValueRef.current);
      if (initial && initial.features.length > 0) {
        draw.set(initial);
        const firstRing = initial.features[0].geometry.coordinates[0];
        if (firstRing?.length) {
          const bounds = firstRing.reduce(
            (acc, point) => acc.extend([point[0], point[1]]),
            new mapboxgl.LngLatBounds([firstRing[0][0], firstRing[0][1]], [firstRing[0][0], firstRing[0][1]]),
          );
          map.fitBounds(bounds, { padding: 32, maxZoom: 14, duration: 0 });
        }
      }
      hasAppliedInitialRef.current = true;
    });

    const handleDrawChange = () => {
      if (readOnly) return;
      const nextPolygonJson = extractPolygonJson(draw);
      latestPolygonJsonRef.current = nextPolygonJson;
      onChangeRef.current?.(nextPolygonJson);
      if (autoSaveOnChange && nextPolygonJson) {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = window.setTimeout(() => {
          onSaveRef.current?.(latestPolygonJsonRef.current);
        }, autoSaveDelayMs);
      }
    };

    map.on("draw.create", handleDrawChange);
    map.on("draw.update", handleDrawChange);
    map.on("draw.delete", handleDrawChange);

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      hasAppliedInitialRef.current = false;
    };
  }, [autoSaveDelayMs, autoSaveOnChange, readOnly, token]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !hasAppliedInitialRef.current) return;

    const currentJson = extractPolygonJson(draw);
    if ((value ?? "") === currentJson) return;

    draw.deleteAll();
    const next = toFeatureCollection(value);
    if (next && next.features.length > 0) {
      draw.set(next);
    }
  }, [value]);

  if (!token) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
        Mapbox token missing. Set <code>VITE_MAPBOX_TOKEN</code> in admin env to enable interactive map.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!readOnly ? (
        <p className="text-xs text-[var(--color-muted)]">
          Use polygon tool to draw. Drag points to edit. Use trash to delete selected polygon.
        </p>
      ) : null}
      <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-lg border border-[var(--color-border)]" />
      {!readOnly && onSave ? (
        <button
          type="button"
          onClick={() => {
            const nextPolygonJson = drawRef.current ? extractPolygonJson(drawRef.current) : latestPolygonJsonRef.current;
            latestPolygonJsonRef.current = nextPolygonJson;
            onChangeRef.current?.(nextPolygonJson);
            onSaveRef.current?.(nextPolygonJson);
          }}
          disabled={isSaving || !(value ?? "")}
          className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
      ) : null}
    </div>
  );
}
