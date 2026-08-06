import { useEffect, useMemo, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";

import type { DispatchRouteCoordinate } from "../types";

type BookingRouteMapProps = {
  routeCoordinates: DispatchRouteCoordinate[];
  partnerLocation?: DispatchRouteCoordinate | null;
  customerLocation?: DispatchRouteCoordinate | null;
  height?: number;
};

const ROUTE_SOURCE_ID = "booking-route";

function toLineString(routeCoordinates: DispatchRouteCoordinate[]) {
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: routeCoordinates.map((point) => [point.longitude, point.latitude]),
    },
    properties: {},
  };
}

export function BookingRouteMap({
  routeCoordinates,
  partnerLocation,
  customerLocation,
  height = 320,
}: BookingRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const partnerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const customerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const lineString = useMemo(() => toLineString(routeCoordinates), [routeCoordinates]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    mapboxgl.accessToken = token;
    const initialCenter = partnerLocation ?? customerLocation ?? routeCoordinates[0] ?? { latitude: 28.6139, longitude: 77.209 };
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: 12,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: lineString as any,
      });
      map.addLayer({
        id: "booking-route-line",
        type: "line",
        source: ROUTE_SOURCE_ID,
        paint: {
          "line-color": "#2563eb",
          "line-width": 5,
        },
      });
    });

    return () => {
      partnerMarkerRef.current?.remove();
      customerMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [customerLocation, lineString, partnerLocation, routeCoordinates, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(lineString as any);

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoint = false;
    routeCoordinates.forEach((point) => {
      bounds.extend([point.longitude, point.latitude]);
      hasPoint = true;
    });
    if (partnerLocation) {
      bounds.extend([partnerLocation.longitude, partnerLocation.latitude]);
      hasPoint = true;
    }
    if (customerLocation) {
      bounds.extend([customerLocation.longitude, customerLocation.latitude]);
      hasPoint = true;
    }
    if (hasPoint) map.fitBounds(bounds, { padding: 42, maxZoom: 15, duration: 0 });
  }, [customerLocation, lineString, partnerLocation, routeCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    partnerMarkerRef.current?.remove();
    if (partnerLocation) {
      partnerMarkerRef.current = new mapboxgl.Marker({ color: "#dc2626" })
        .setLngLat([partnerLocation.longitude, partnerLocation.latitude])
        .addTo(map);
    }
  }, [partnerLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    customerMarkerRef.current?.remove();
    if (customerLocation) {
      customerMarkerRef.current = new mapboxgl.Marker({ color: "#16a34a" })
        .setLngLat([customerLocation.longitude, customerLocation.latitude])
        .addTo(map);
    }
  }, [customerLocation]);

  if (!token) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
        Mapbox token missing. Set <code>VITE_MAPBOX_TOKEN</code> in admin env to enable booking navigation map.
      </div>
    );
  }

  if (!routeCoordinates.length && !partnerLocation && !customerLocation) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted)]">
        Route map data is not available for this booking yet.
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-lg border border-[var(--color-border)]" />;
}
