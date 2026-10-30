import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import {
  getAdminScreeningCentre,
  updateAdminScreeningCentre,
  updateAdminScreeningCentreStatus,
} from "../api/screeningCentreApi";
import {
  defaultAdminScreeningCentre,
  type AdminScreeningCentre,
} from "../types";

const inputClass = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]";
const sectionClass = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4";
const labelClass = "text-sm font-medium text-[var(--color-text)]";

function validateScreeningCentre(form: AdminScreeningCentre) {
  if (!form.name.trim()) return "Screening centre name is required";
  if (!form.address.trim()) return "Screening centre address is required";
  if (!Number.isFinite(form.latitude) || form.latitude < -90 || form.latitude > 90) {
    return "Latitude must be between -90 and 90";
  }
  if (!Number.isFinite(form.longitude) || form.longitude < -180 || form.longitude > 180) {
    return "Longitude must be between -180 and 180";
  }
  if (form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.replace(/\s+/g, ""))) {
    return "Enter a valid phone number";
  }
  return "";
}

export default function ScreeningCentrePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminScreeningCentre>(defaultAdminScreeningCentre);

  const screeningCentreQuery = useQuery({
    queryKey: ["admin-screening-centre"],
    queryFn: getAdminScreeningCentre,
    retry: false,
  });

  useEffect(() => {
    if (!screeningCentreQuery.data) return;
    const timeoutId = window.setTimeout(() => setForm(screeningCentreQuery.data), 0);
    return () => window.clearTimeout(timeoutId);
  }, [screeningCentreQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateAdminScreeningCentre,
    onSuccess: async (next) => {
      toast.success("Screening centre updated");
      setForm(next);
      await queryClient.invalidateQueries({ queryKey: ["admin-screening-centre"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update screening centre")),
  });

  const statusMutation = useMutation({
    mutationFn: updateAdminScreeningCentreStatus,
    onSuccess: async (next) => {
      toast.success(next.active ? "Screening centre activated" : "Screening centre deactivated");
      setForm(next);
      await queryClient.invalidateQueries({ queryKey: ["admin-screening-centre"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update screening centre status")),
  });

  const loaded = screeningCentreQuery.data ?? defaultAdminScreeningCentre;
  const validationError = useMemo(() => validateScreeningCentre(form), [form]);
  const mapsPreviewUrl = `https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`;

  const updateNumber = (key: "latitude" | "longitude", value: string) =>
    setForm((previous) => ({ ...previous, [key]: Number(value) || 0 }));

  const updateText = (key: keyof AdminScreeningCentre, value: string | boolean) =>
    setForm((previous) => ({ ...previous, [key]: value as never }));

  const save = () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Partner Screening Centre</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Configure the active Lexho screening centre shown in the partner app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => statusMutation.mutate(!form.active)}
            disabled={statusMutation.isPending}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            {statusMutation.isPending
              ? "Updating..."
              : form.active
                ? "Deactivate Centre"
                : "Activate Centre"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving..." : "Save Centre"}
          </button>
        </div>
      </div>

      <DataState
        isLoading={screeningCentreQuery.isLoading}
        isError={screeningCentreQuery.isError}
        isEmpty={false}
        loadingText="Loading screening centre..."
        errorText="Failed to load screening centre"
        emptyText=""
        onRetry={() => void screeningCentreQuery.refetch()}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <section className={sectionClass}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Centre Details</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Admin-controlled office location used for partner visit guidance.
              </p>
            </div>
            <div className="grid gap-3">
              <label className={labelClass}>
                Centre Name
                <input
                  value={form.name}
                  onChange={(event) => updateText("name", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Address
                <textarea
                  value={form.address}
                  onChange={(event) => updateText("address", event.target.value)}
                  rows={4}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Phone
                <input
                  value={form.phone}
                  onChange={(event) => updateText("phone", event.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className={labelClass}>
                  Latitude
                  <input
                    type="number"
                    value={form.latitude}
                    onChange={(event) => updateNumber("latitude", event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Longitude
                  <input
                    type="number"
                    value={form.longitude}
                    onChange={(event) => updateNumber("longitude", event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Map Metadata</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Optional metadata for entrance, landmark, and provider-specific references.
              </p>
            </div>
            <div className="grid gap-3">
              <label className={labelClass}>
                Map Provider
                <select
                  value={form.mapProvider}
                  onChange={(event) => updateText("mapProvider", event.target.value)}
                  className={inputClass}
                >
                  <option value="google">google</option>
                  <option value="mapbox">mapbox</option>
                  <option value="osm">osm</option>
                </select>
              </label>
              <label className={labelClass}>
                Place ID
                <input
                  value={form.placeId}
                  onChange={(event) => updateText("placeId", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Landmark
                <input
                  value={form.landmark}
                  onChange={(event) => updateText("landmark", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Entrance Info
                <input
                  value={form.entranceInfo}
                  onChange={(event) => updateText("entranceInfo", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
                <span>Currently Active</span>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateText("active", event.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
              </label>
            </div>
          </section>

          <section className={`${sectionClass} xl:col-span-2`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Map Preview</h3>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Partners will navigate using these exact coordinates.
                </p>
              </div>
              <a
                href={mapsPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                Open Preview in Google Maps
              </a>
            </div>
            {validationError ? (
              <p className="mt-3 text-sm text-red-400">{validationError}</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <InfoCard label="Address" value={form.address || "No address configured"} />
                <InfoCard label="Coordinates" value={`${form.latitude}, ${form.longitude}`} />
                <InfoCard label="Landmark" value={form.landmark || "No landmark"} />
                <InfoCard label="Last Updated" value={form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "Not saved yet"} />
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setForm(loaded)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setForm(defaultAdminScreeningCentre)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Clear Form
          </button>
        </div>
      </DataState>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 text-sm text-[var(--color-text)]">{value}</div>
    </div>
  );
}
