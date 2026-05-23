import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MapboxPolygonEditor, ModalFormLayout, PolygonPreview } from "@/components/admin";

import type { CreateServiceableAreaPayload, ServiceableAreaItem } from "../types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  cityId: z.string().optional(),
  zoneId: z.string().optional(),
  polygonJson: z.string().optional(),
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
  cities?: any;
  zones?: any;
  onClose: () => void;
  onCityChange?: (cityId?: number) => void;
  onSubmit: (payload: CreateServiceableAreaPayload, id?: string) => void;
};

export function AddEditServiceableAreaModal({
  open,
  editingItem,
  isSubmitting,
  duplicateCheck,
  cities,
  zones,
  onClose,
  onCityChange,
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
  }, [editingItem, form]);

  useEffect(() => {
    const subscription = form.watch((values, info) => {
      if (info.name === "cityId") {
        const value = Number(values.cityId ?? "");
        onCityChange?.(Number.isFinite(value) && value > 0 ? value : undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onCityChange]);

  const cityOptions = Array.isArray(cities?.data)
    ? cities.data
    : Array.isArray(cities?.items)
      ? cities.items
      : Array.isArray(cities)
        ? cities
        : [];
  const zoneOptions = Array.isArray(zones?.data)
    ? zones.data
    : Array.isArray(zones?.items)
      ? zones.items
      : Array.isArray(zones)
        ? zones
        : [];

  const submit = (values: ServiceableAreaFormValues) => {
    if (duplicateCheck(values, editingItem?.id)) {
      form.setError("pincode", { message: "This pincode already exists for the same city" });
      return;
    }

    onSubmit(
      {
        name: values.name.trim(),
        pincode: values.pincode.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        cityId: Number.isFinite(Number(values.cityId ?? "")) && Number(values.cityId ?? "") > 0 ? Number(values.cityId) : undefined,
        zoneId: Number.isFinite(Number(values.zoneId ?? "")) && Number(values.zoneId ?? "") > 0 ? Number(values.zoneId) : undefined,
        polygonJson: values.polygonJson?.trim() ? values.polygonJson.trim() : undefined,
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
      maxWidthClassName="max-w-2xl"
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
            <input {...form.register("city")} className={inputClass} />
          </Field>
          <Field label="State" error={form.formState.errors.state?.message}>
            <input {...form.register("state")} className={inputClass} />
          </Field>
          <Field label="City (Geo)" error={form.formState.errors.cityId?.message}>
            <select {...form.register("cityId")} className={inputClass}>
              <option value="">Select city</option>
              {cityOptions.map((item: any) => (
                <option key={String(item?.id ?? item?.cityId ?? item?.name)} value={String(item?.id ?? item?.cityId ?? "")}>
                  {String(item?.name ?? item?.cityName ?? "City")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zone (Geo)" error={form.formState.errors.zoneId?.message}>
            <select {...form.register("zoneId")} className={inputClass}>
              <option value="">Select zone</option>
              {zoneOptions.map((item: any) => (
                <option key={String(item?.id ?? item?.zoneId ?? item?.name)} value={String(item?.id ?? item?.zoneId ?? "")}>
                  {String(item?.name ?? item?.zoneName ?? "Zone")}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Polygon JSON (optional)" error={form.formState.errors.polygonJson?.message}>
          <textarea {...form.register("polygonJson")} rows={3} className={inputClass} />
        </Field>
        <MapboxPolygonEditor
          value={form.watch("polygonJson")}
          onChange={(nextPolygonJson) => form.setValue("polygonJson", nextPolygonJson, { shouldDirty: true })}
          height={220}
        />
        <PolygonPreview polygonJson={form.watch("polygonJson")} height={180} />

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
