import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { MapboxPolygonEditor, PolygonPreview } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  createGeoCity,
  createGeoZone,
  deleteGeoCity,
  deleteGeoZone,
  getGeoCities,
  getGeoZones,
  updateGeoCity,
  updateGeoZone,
} from "../api/geoApi";
import {
  addRestrictedArea,
  deleteRestrictedArea,
  getScaleProfile,
  replayGeoEventDlq,
  setScaleProfile,
  type ScaleProfile,
} from "../api/geoScaleOpsApi";

type GeoCity = {
  id: number;
  name: string;
  state: string;
  country: string;
  active: boolean;
};

type GeoZone = {
  id: number;
  cityId: number;
  name: string;
  polygonJson?: string;
  active: boolean;
};

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" ? (value as ApiRecord) : {};
}

const toCities = (payload: unknown): GeoCity[] => {
  const root = asRecord(payload);
  const rows = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.items)
      ? root.items
      : Array.isArray(payload)
        ? payload
        : [];
  return rows.map((rawRow: unknown) => {
    const row = asRecord(rawRow);
    return {
      id: Number(row.id ?? row.cityId ?? 0),
      name: String(row.name ?? ""),
      state: String(row.state ?? ""),
      country: String(row.country ?? "India"),
      active: typeof row.active === "boolean" ? row.active : Boolean(row.isActive ?? true),
    };
  }).filter((row: GeoCity) => row.id > 0);
};

const toZones = (payload: unknown): GeoZone[] => {
  const root = asRecord(payload);
  const rows = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.items)
      ? root.items
      : Array.isArray(payload)
        ? payload
        : [];
  return rows.map((rawRow: unknown) => {
    const row = asRecord(rawRow);
    return {
      id: Number(row.id ?? row.zoneId ?? 0),
      cityId: Number(row.cityId ?? 0),
      name: String(row.name ?? ""),
      polygonJson: typeof row.polygonJson === "string" ? row.polygonJson : undefined,
      active: typeof row.active === "boolean" ? row.active : Boolean(row.isActive ?? true),
    };
  }).filter((row: GeoZone) => row.id > 0);
};

export default function GeoManagementPage() {
  const queryClient = useQueryClient();
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(undefined);
  const [cityForm, setCityForm] = useState({ id: "", name: "", state: "", country: "India", active: true });
  const [zoneForm, setZoneForm] = useState({ id: "", cityId: "", name: "", polygonJson: "", active: true });
  const [scaleForm, setScaleForm] = useState<{ profile: ScaleProfile; dryRun: boolean }>({ profile: "10k", dryRun: true });
  const [restrictedForm, setRestrictedForm] = useState({ lat: "", lng: "", precision: "6", geohash: "" });
  const [dlqMaxMessages, setDlqMaxMessages] = useState("100");

  const scaleProfileQuery = useQuery({
    queryKey: ["scale-profile"],
    queryFn: getScaleProfile,
    retry: false,
  });

  const citiesQuery = useQuery({
    queryKey: ["geo-cities"],
    queryFn: getGeoCities,
    retry: false,
  });

  const zonesQuery = useQuery({
    queryKey: ["geo-zones", selectedCityId],
    queryFn: () => getGeoZones(selectedCityId),
    enabled: Number.isFinite(selectedCityId) && Number(selectedCityId) > 0,
    retry: false,
  });

  const cities = useMemo(() => toCities(citiesQuery.data), [citiesQuery.data]);
  const zones = useMemo(() => toZones(zonesQuery.data), [zonesQuery.data]);

  const refreshCities = async () => {
    await queryClient.invalidateQueries({ queryKey: ["geo-cities"] });
  };
  const refreshZones = async () => {
    await queryClient.invalidateQueries({ queryKey: ["geo-zones"] });
  };

  const cityMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: cityForm.name.trim(),
        state: cityForm.state.trim(),
        country: cityForm.country.trim() || "India",
        active: cityForm.active,
      };
      if (!payload.name || !payload.state) {
        throw new Error("City name and state are required");
      }
      if (cityForm.id) {
        return updateGeoCity(cityForm.id, payload);
      }
      return createGeoCity(payload);
    },
    onSuccess: async () => {
      toast.success(cityForm.id ? "City updated" : "City created");
      setCityForm({ id: "", name: "", state: "", country: "India", active: true });
      await refreshCities();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to save city")),
  });

  const zoneMutation = useMutation({
    mutationFn: async (override?: Partial<typeof zoneForm>) => {
      const source = { ...zoneForm, ...(override ?? {}) };
      const cityIdNum = Number(source.cityId || selectedCityId || 0);
      const payload = {
        cityId: cityIdNum,
        name: source.name.trim(),
        polygonJson: source.polygonJson.trim(),
        active: source.active,
      };
      if (!payload.cityId || !payload.name || !payload.polygonJson) {
        throw new Error("City, zone name and Polygon JSON are required");
      }
      if (source.id) {
        return updateGeoZone(source.id, payload);
      }
      return createGeoZone(payload);
    },
    onSuccess: async () => {
      toast.success(zoneForm.id ? "Zone updated" : "Zone created");
      setZoneForm({ id: "", cityId: String(selectedCityId ?? ""), name: "", polygonJson: "", active: true });
      await refreshZones();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to save zone")),
  });

  const deleteCityMutation = useMutation({
    mutationFn: (id: number) => deleteGeoCity(id),
    onSuccess: async () => {
      toast.success("City deleted");
      await refreshCities();
      setSelectedCityId(undefined);
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete city")),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => deleteGeoZone(id),
    onSuccess: async () => {
      toast.success("Zone deleted");
      await refreshZones();
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete zone")),
  });

  const setScaleProfileMutation = useMutation({
    mutationFn: () => setScaleProfile(scaleForm.profile, scaleForm.dryRun),
    onSuccess: async () => {
      toast.success(`Scale profile request sent (${scaleForm.profile})`);
      await queryClient.invalidateQueries({ queryKey: ["scale-profile"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to set scale profile")),
  });

  const addRestrictedAreaMutation = useMutation({
    mutationFn: () => {
      const lat = Number(restrictedForm.lat);
      const lng = Number(restrictedForm.lng);
      const precision = Number(restrictedForm.precision);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Valid latitude and longitude are required");
      }
      if (!Number.isFinite(precision) || precision < 1) {
        throw new Error("Valid precision is required");
      }
      return addRestrictedArea(lat, lng, precision);
    },
    onSuccess: () => toast.success("Restricted geohash added"),
    onError: (error) => toast.error(extractApiError(error, "Unable to add restricted geohash")),
  });

  const deleteRestrictedAreaMutation = useMutation({
    mutationFn: () => {
      const geohash = restrictedForm.geohash.trim();
      if (!geohash) {
        throw new Error("Geohash is required");
      }
      return deleteRestrictedArea(geohash);
    },
    onSuccess: () => {
      toast.success("Restricted geohash removed");
      setRestrictedForm((previous) => ({ ...previous, geohash: "" }));
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to remove restricted geohash")),
  });

  const replayDlqMutation = useMutation({
    mutationFn: () => {
      const maxMessages = Number(dlqMaxMessages);
      if (!Number.isFinite(maxMessages) || maxMessages < 1) {
        throw new Error("maxMessages must be a positive number");
      }
      return replayGeoEventDlq(maxMessages);
    },
    onSuccess: () => toast.success("Geo event DLQ replay started"),
    onError: (error) => toast.error(extractApiError(error, "Unable to replay DLQ events")),
  });

  const scaleProfileRoot = asRecord(scaleProfileQuery.data);
  const scaleProfileData = asRecord(scaleProfileRoot.data);
  const currentScaleProfile = String(scaleProfileData.profile ?? scaleProfileRoot.profile ?? "N/A");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Geo Cities & Zones</h2>
        <p className="text-sm text-[var(--color-muted)]">Manage city master and polygon zones for serviceability mapping.</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Tip: Create cities and zones here first, then use them for serviceability mapping.</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Scale Ops</h3>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Current profile: {scaleProfileQuery.isLoading ? "Loading..." : currentScaleProfile}
        </p>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="grid gap-2">
            <label className="text-xs text-[var(--color-muted)]">Scale Profile</label>
            <select
              value={scaleForm.profile}
              onChange={(e) => setScaleForm((previous) => ({ ...previous, profile: e.target.value as ScaleProfile }))}
              className={inputClass}
            >
              <option value="1k">1k</option>
              <option value="10k">10k</option>
              <option value="100k">100k</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={scaleForm.dryRun}
                onChange={(e) => setScaleForm((previous) => ({ ...previous, dryRun: e.target.checked }))}
              />
              Dry Run
            </label>
            <button type="button" onClick={() => setScaleProfileMutation.mutate()} className={primaryBtn} disabled={setScaleProfileMutation.isPending}>
              Apply Scale Profile
            </button>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-[var(--color-muted)]">Restricted Geohash (lat/lng)</label>
            <input
              placeholder="Latitude"
              value={restrictedForm.lat}
              onChange={(e) => setRestrictedForm((previous) => ({ ...previous, lat: e.target.value }))}
              className={inputClass}
            />
            <input
              placeholder="Longitude"
              value={restrictedForm.lng}
              onChange={(e) => setRestrictedForm((previous) => ({ ...previous, lng: e.target.value }))}
              className={inputClass}
            />
            <input
              placeholder="Precision (e.g. 6)"
              value={restrictedForm.precision}
              onChange={(e) => setRestrictedForm((previous) => ({ ...previous, precision: e.target.value }))}
              className={inputClass}
            />
            <button type="button" onClick={() => addRestrictedAreaMutation.mutate()} className={primaryBtn} disabled={addRestrictedAreaMutation.isPending}>
              Add Restricted Area
            </button>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-[var(--color-muted)]">Remove Restricted Geohash / Replay DLQ</label>
            <input
              placeholder="Geohash"
              value={restrictedForm.geohash}
              onChange={(e) => setRestrictedForm((previous) => ({ ...previous, geohash: e.target.value }))}
              className={inputClass}
            />
            <button type="button" onClick={() => deleteRestrictedAreaMutation.mutate()} className={dangerBtn} disabled={deleteRestrictedAreaMutation.isPending}>
              Delete Restricted Area
            </button>
            <input
              placeholder="maxMessages"
              value={dlqMaxMessages}
              onChange={(e) => setDlqMaxMessages(e.target.value)}
              className={inputClass}
            />
            <button type="button" onClick={() => replayDlqMutation.mutate()} className={secondaryBtn} disabled={replayDlqMutation.isPending}>
              Replay Geo DLQ
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">City Form</h3>
          <div className="grid gap-2">
            <input placeholder="City Name" value={cityForm.name} onChange={(e) => setCityForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
            <input placeholder="State" value={cityForm.state} onChange={(e) => setCityForm((p) => ({ ...p, state: e.target.value }))} className={inputClass} />
            <input placeholder="Country" value={cityForm.country} onChange={(e) => setCityForm((p) => ({ ...p, country: e.target.value }))} className={inputClass} />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input type="checkbox" checked={cityForm.active} onChange={(e) => setCityForm((p) => ({ ...p, active: e.target.checked }))} />
              Active
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => cityMutation.mutate()} className={primaryBtn} disabled={cityMutation.isPending}>
                {cityForm.id ? "Update City" : "Create City"}
              </button>
              <button type="button" onClick={() => setCityForm({ id: "", name: "", state: "", country: "India", active: true })} className={secondaryBtn}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Zone Form</h3>
          <div className="grid gap-2">
            <select
              value={zoneForm.cityId || String(selectedCityId ?? "")}
              onChange={(e) => {
                const value = e.target.value;
                const num = Number(value);
                setZoneForm((p) => ({ ...p, cityId: value }));
                setSelectedCityId(Number.isFinite(num) && num > 0 ? num : undefined);
              }}
              className={inputClass}
            >
              <option value="">Select City</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
            <input placeholder="Zone Name" value={zoneForm.name} onChange={(e) => setZoneForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
            <textarea placeholder='Polygon JSON (GeoJSON): {"type":"Polygon","coordinates":[...]}' value={zoneForm.polygonJson} onChange={(e) => setZoneForm((p) => ({ ...p, polygonJson: e.target.value }))} rows={4} className={inputClass} />
            <MapboxPolygonEditor
              value={zoneForm.polygonJson}
              onChange={(nextPolygonJson) => setZoneForm((previous) => ({ ...previous, polygonJson: nextPolygonJson }))}
              onSave={(nextPolygonJson) => {
                setZoneForm((previous) => ({ ...previous, polygonJson: nextPolygonJson }));
                zoneMutation.mutate({ polygonJson: nextPolygonJson });
              }}
              autoSaveOnChange={Boolean(zoneForm.id)}
              isSaving={zoneMutation.isPending}
              saveLabel={zoneForm.id ? "Update Zone Polygon" : "Create Zone Polygon"}
              height={220}
            />
            <PolygonPreview polygonJson={zoneForm.polygonJson} height={180} />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input type="checkbox" checked={zoneForm.active} onChange={(e) => setZoneForm((p) => ({ ...p, active: e.target.checked }))} />
              Active
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => zoneMutation.mutate({})} className={primaryBtn} disabled={zoneMutation.isPending}>
                {zoneForm.id ? "Update Zone" : "Create Zone"}
              </button>
              <button type="button" onClick={() => setZoneForm({ id: "", cityId: String(selectedCityId ?? ""), name: "", polygonJson: "", active: true })} className={secondaryBtn}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Cities</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--color-muted)]">
                <tr>
                  <th className="py-2">Name</th><th className="py-2">State</th><th className="py-2">Active</th><th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.id} className="border-t border-[var(--color-border)] text-[var(--color-text)]">
                    <td className="py-2">{city.name}</td>
                    <td className="py-2">{city.state}</td>
                    <td className="py-2">{city.active ? "Yes" : "No"}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCityForm({ id: String(city.id), name: city.name, state: city.state, country: city.country, active: city.active });
                            setSelectedCityId(city.id);
                          }}
                          className={secondaryBtn}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete city "${city.name}"?`)) deleteCityMutation.mutate(city.id);
                          }}
                          className={dangerBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cities.length === 0 ? (
                  <tr><td className="py-3 text-[var(--color-muted)]" colSpan={4}>{citiesQuery.isLoading ? "Loading cities..." : "No cities found"}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Zones {selectedCityId ? `(City #${selectedCityId})` : ""}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--color-muted)]">
                <tr>
                  <th className="py-2">Name</th><th className="py-2">Active</th><th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-t border-[var(--color-border)] text-[var(--color-text)]">
                    <td className="py-2">{zone.name}</td>
                    <td className="py-2">{zone.active ? "Yes" : "No"}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setZoneForm({
                              id: String(zone.id),
                              cityId: String(zone.cityId),
                              name: zone.name,
                              polygonJson: zone.polygonJson ?? "",
                              active: zone.active,
                            });
                          }}
                          className={secondaryBtn}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete zone "${zone.name}"?`)) deleteZoneMutation.mutate(zone.id);
                          }}
                          className={dangerBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {zones.length === 0 ? (
                  <tr><td className="py-3 text-[var(--color-muted)]" colSpan={3}>{zonesQuery.isLoading ? "Loading zones..." : "No zones found"}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]";
const primaryBtn = "rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60";
const secondaryBtn = "rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)]";
const dangerBtn = "rounded border border-red-500/40 px-3 py-2 text-xs font-medium text-red-300";
