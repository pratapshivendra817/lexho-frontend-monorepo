import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { MapboxPolygonEditor, ModalFormLayout, PolygonPreview } from "@/components/admin";

import type { CreateServiceableAreaPayload, ServiceableAreaItem } from "../types";
import { getGeoCities, getGeoZones } from "../api/geoApi";

function geoRows(payload: unknown): Record<string, unknown>[] {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rows = Array.isArray(payload) ? payload : Array.isArray(root.data) ? root.data : Array.isArray(root.items) ? root.items : [];
  return rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  cityId: z.string(),
  zoneId: z.string(),
  polygonJson: z.string(),
  active: z.boolean(),
});

export type ServiceableAreaFormValues = z.infer<typeof schema>;

const defaultValues: ServiceableAreaFormValues = {
  name: "",
  pincode: "",
  city: "",
  state: "",
  cityId: "",
  zoneId: "",
  polygonJson: "",
  active: true,
};

type AddEditServiceableAreaModalProps = {
  open: boolean;
  editingItem: ServiceableAreaItem | null;
  isSubmitting: boolean;
  duplicateCheck: (values: ServiceableAreaFormValues, id?: string) => boolean;
  onClose: () => void;
  onSubmit: (payload: CreateServiceableAreaPayload, id?: string) => void;
};

export function AddEditServiceableAreaModal({
  open,
  editingItem,
  isSubmitting,
  duplicateCheck,
  onClose,
  onSubmit,
}: AddEditServiceableAreaModalProps) {
  const form = useForm<ServiceableAreaFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!editingItem) {
      form.reset(defaultValues);
      return;
    }

    form.reset({
      name: editingItem.name,
      pincode: editingItem.pincode,
      city: editingItem.city,
      state: editingItem.state,
      cityId: editingItem.cityId ? String(editingItem.cityId) : "",
      zoneId: editingItem.zoneId ? String(editingItem.zoneId) : "",
      polygonJson: editingItem.polygonJson ?? "",
      active: editingItem.active,
    });
  }, [editingItem, form, open]);

  const polygonJsonValue = useWatch({ control: form.control, name: "polygonJson" });
  const cityIdValue = useWatch({ control: form.control, name: "cityId" });
  const zoneIdValue = useWatch({ control: form.control, name: "zoneId" });
  const citiesQuery = useQuery({ queryKey: ["geo-cities"], queryFn: getGeoCities, enabled: open, retry: false });
  const zonesQuery = useQuery({
    queryKey: ["geo-zones", Number(cityIdValue)],
    queryFn: () => getGeoZones(Number(cityIdValue)),
    enabled: open && Number(cityIdValue) > 0,
    retry: false,
  });
  const cities = geoRows(citiesQuery.data).map((row) => ({
    id: String(row.id ?? row.cityId ?? ""), name: String(row.name ?? ""),
    state: String(row.state ?? ""), country: String(row.country ?? "India"),
  })).filter((city) => Number(city.id) > 0);
  const zones = geoRows(zonesQuery.data).map((row) => ({
    id: String(row.id ?? row.zoneId ?? ""), name: String(row.name ?? ""),
    polygonJson: typeof row.polygonJson === "string" ? row.polygonJson : "",
  })).filter((zone) => Number(zone.id) > 0);
  const selectedCity = cities.find((city) => city.id === cityIdValue);
  const fieldOptions = { shouldDirty: true, shouldValidate: true };

  const submit = (values: ServiceableAreaFormValues) => {
    if (duplicateCheck(values, editingItem?.id)) {
      form.setError("pincode", { message: "This pincode already exists for the same city" });
      return;
    }

    const cityId = Number(values.cityId);
    const zoneId = Number(values.zoneId);
    const normalizedCityId = Number.isFinite(cityId) && cityId > 0 ? cityId : null;
    const normalizedZoneId = Number.isFinite(zoneId) && zoneId > 0 ? zoneId : null;
    const polygonJson = values.polygonJson.trim();

    onSubmit(
      {
        name: values.name.trim(),
        pincode: values.pincode.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        cityId: normalizedCityId,
        zoneId: normalizedZoneId,
        polygonJson: polygonJson || null,
        active: values.active,
      },
      editingItem?.id,
    );
  };

  return (
    <ModalFormLayout
      open={open}
      onClose={onClose}
      title={editingItem ? "Edit Serviceable Area" : "Add Serviceable Area"}
      formId="serviceable-area-form"
      submitLabel={editingItem ? "Update" : "Create"}
      isSubmitting={isSubmitting}
      maxWidthClassName="max-w-4xl"
    >
      <form
        id="serviceable-area-form"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit(submit)(event);
        }}
        className="grid gap-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <input {...form.register("name")} className={inputClass} />
          </Field>
          <Field label="Pincode" error={form.formState.errors.pincode?.message}>
            <input {...form.register("pincode")} maxLength={6} className={inputClass} />
          </Field>
          <Field label="City" error={form.formState.errors.city?.message}>
            <input {...form.register("city")} readOnly={Boolean(cityIdValue)} className={inputClass} />
          </Field>
          <Field label="State" error={form.formState.errors.state?.message}>
            <input {...form.register("state")} readOnly={Boolean(cityIdValue)} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Saved City" error={form.formState.errors.cityId?.message}>
            <select aria-label="Saved City" value={cityIdValue} disabled={citiesQuery.isLoading} className={inputClass}
              onChange={(event) => {
                const city = cities.find((item) => item.id === event.target.value);
                form.setValue("cityId", event.target.value, fieldOptions);
                form.setValue("zoneId", "", fieldOptions);
                form.setValue("polygonJson", "", fieldOptions);
                form.setValue("city", city?.name ?? "", fieldOptions);
                form.setValue("state", city?.state ?? "", fieldOptions);
              }}>
              <option value="">{citiesQuery.isLoading ? "Loading cities..." : "Select city (or enter manually)"}</option>
              {cityIdValue && !selectedCity ? <option value={cityIdValue}>{form.getValues("city")} (saved city)</option> : null}
              {cities.map((city) => <option key={city.id} value={city.id}>{city.name} — {city.state}</option>)}
            </select>
          </Field>
          <Field label="Saved Zone" error={form.formState.errors.zoneId?.message}>
            <select aria-label="Saved Zone" value={zoneIdValue} disabled={!cityIdValue || zonesQuery.isFetching} className={inputClass}
              onChange={(event) => {
                const zone = zones.find((item) => item.id === event.target.value);
                form.setValue("zoneId", event.target.value, fieldOptions);
                form.setValue("polygonJson", zone?.polygonJson ?? "", fieldOptions);
                if (zone && !form.getValues("name").trim()) form.setValue("name", zone.name, fieldOptions);
              }}>
              <option value="">{zonesQuery.isFetching ? "Loading zones..." : "Select zone (or draw a custom area)"}</option>
              {zoneIdValue && !zones.some((zone) => zone.id === zoneIdValue) ? <option value={zoneIdValue}>Saved zone #{zoneIdValue}</option> : null}
              {zones.map((zone) => <option key={zone.id} value={zone.id} disabled={!zone.polygonJson}>{zone.name}{!zone.polygonJson ? " (boundary missing)" : ""}</option>)}
            </select>
          </Field>
        </div>
        {citiesQuery.isError || zonesQuery.isError ? <p role="alert" className="text-sm text-red-400">Could not load cities or zones. <button type="button" onClick={() => { void citiesQuery.refetch(); if (cityIdValue) void zonesQuery.refetch(); }}>Retry</button></p> : null}
        {cityIdValue && zonesQuery.isSuccess && zones.length === 0 ? <p className="text-sm">No zones found. Create a zone in Geo Cities & Zones, or draw a custom area below.</p> : null}
        <p className="text-sm text-[var(--color-muted)]">Selecting a saved zone copies its boundary here. No need to draw it again. Fill the pincode and save the serviceable area. Later zone changes do not automatically update this copy.</p>

        <Field label="Serviceable Area Polygon" error={form.formState.errors.polygonJson?.message}>
          <Controller
            control={form.control}
            name="polygonJson"
            render={({ field }) => (
              <MapboxPolygonEditor
                key={`${cityIdValue}:${zoneIdValue}`}
                cityQuery={selectedCity ? [selectedCity.name, selectedCity.state, selectedCity.country].join(", ") : undefined}
                value={field.value}
                onChange={field.onChange}
                onSave={(nextPolygonJson) => {
                  form.setValue("polygonJson", nextPolygonJson, { shouldDirty: true, shouldValidate: true });
                  void form.handleSubmit(submit)();
                }}
                autoSaveOnChange={Boolean(editingItem?.id)}
                isSaving={isSubmitting}
                saveLabel={editingItem ? "Update Area Polygon" : "Create Area Polygon"}
                height={450}
              />
            )}
          />
          <textarea
            value={polygonJsonValue}
            onChange={(event) => form.setValue("polygonJson", event.target.value, { shouldDirty: true, shouldValidate: true })}
            rows={4}
            placeholder='Polygon JSON: {"type":"Polygon","coordinates":[...]}'
            className={inputClass}
          />
          <PolygonPreview polygonJson={polygonJsonValue} height={160} />
        </Field>

        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input type="checkbox" {...form.register("active")} />
          Active
        </label>
      </form>
    </ModalFormLayout>
  );
}

const inputClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-[var(--color-text)]">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
