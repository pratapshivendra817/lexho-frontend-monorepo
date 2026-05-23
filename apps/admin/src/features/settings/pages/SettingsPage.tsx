import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/api/axios";
import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

type AdminSettingsPayload = {
  serviceRadiusKm: number;
  dispatchRetryCount: number;
  dispatchTimeoutSec: number;
  mapProvider: "MAPBOX" | "GOOGLE" | "OSM";
  mapDefaultCity: string;
  mapDefaultLat: number;
  mapDefaultLng: number;
};

const defaultSettings: AdminSettingsPayload = {
  serviceRadiusKm: 10,
  dispatchRetryCount: 3,
  dispatchTimeoutSec: 120,
  mapProvider: "MAPBOX",
  mapDefaultCity: "Delhi",
  mapDefaultLat: 28.6139,
  mapDefaultLng: 77.209,
};

export default function SettingsPage() {
  const [form, setForm] = useState<AdminSettingsPayload>(defaultSettings);

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/settings");
      const payload = (data?.data ?? data ?? {}) as Partial<AdminSettingsPayload>;
      return {
        ...defaultSettings,
        ...payload,
      } as AdminSettingsPayload;
    },
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: AdminSettingsPayload) => api.put("/api/admin/settings", payload),
    onSuccess: () => toast.success("Settings updated"),
    onError: (error) => toast.error(extractApiError(error, "Unable to update settings")),
  });

  const loaded = settingsQuery.data ?? defaultSettings;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Settings</h2>
        <p className="text-sm text-[var(--color-muted)]">Configure service radius, dispatch rules and map defaults.</p>
      </div>

      <DataState
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        isEmpty={false}
        loadingText="Loading settings..."
        errorText="Failed to load settings"
        emptyText=""
        onRetry={() => void settingsQuery.refetch()}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Dispatch Config</h3>
            <div className="grid gap-3">
              <label className="text-sm text-[var(--color-text)]">
                Service Radius (KM)
                <input
                  type="number"
                  min={1}
                  value={form.serviceRadiusKm}
                  onChange={(event) => setForm((previous) => ({ ...previous, serviceRadiusKm: Number(event.target.value) || 0 }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm text-[var(--color-text)]">
                Dispatch Retry Count
                <input
                  type="number"
                  min={0}
                  value={form.dispatchRetryCount}
                  onChange={(event) => setForm((previous) => ({ ...previous, dispatchRetryCount: Number(event.target.value) || 0 }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm text-[var(--color-text)]">
                Dispatch Timeout (Sec)
                <input
                  type="number"
                  min={30}
                  value={form.dispatchTimeoutSec}
                  onChange={(event) => setForm((previous) => ({ ...previous, dispatchTimeoutSec: Number(event.target.value) || 0 }))}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Map Config</h3>
            <div className="grid gap-3">
              <label className="text-sm text-[var(--color-text)]">
                Provider
                <select
                  value={form.mapProvider}
                  onChange={(event) => setForm((previous) => ({ ...previous, mapProvider: event.target.value as AdminSettingsPayload["mapProvider"] }))}
                  className={inputClass}
                >
                  <option value="MAPBOX">MAPBOX</option>
                  <option value="GOOGLE">GOOGLE</option>
                  <option value="OSM">OSM</option>
                </select>
              </label>
              <label className="text-sm text-[var(--color-text)]">
                Default City
                <input
                  value={form.mapDefaultCity}
                  onChange={(event) => setForm((previous) => ({ ...previous, mapDefaultCity: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-[var(--color-text)]">
                  Default Latitude
                  <input
                    type="number"
                    value={form.mapDefaultLat}
                    onChange={(event) => setForm((previous) => ({ ...previous, mapDefaultLat: Number(event.target.value) || 0 }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-sm text-[var(--color-text)]">
                  Default Longitude
                  <input
                    type="number"
                    value={form.mapDefaultLng}
                    onChange={(event) => setForm((previous) => ({ ...previous, mapDefaultLng: Number(event.target.value) || 0 }))}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            onClick={() => setForm(loaded)}
            className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Reset
          </button>
        </div>
      </DataState>
    </div>
  );
}

const inputClass = "mt-1 w-full rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm";
