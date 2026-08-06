import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { MapboxPolygonEditor, ModalFormLayout, PolygonPreview } from "@/components/admin";

import type { CreateServiceableAreaPayload, ServiceableAreaItem } from "../types";

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
  }, [editingItem, form]);

  const polygonJsonValue = useWatch({ control: form.control, name: "polygonJson" });

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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="City ID" error={form.formState.errors.cityId?.message}>
            <input {...form.register("cityId")} inputMode="numeric" placeholder="Optional" className={inputClass} />
          </Field>
          <Field label="Zone ID" error={form.formState.errors.zoneId?.message}>
            <input {...form.register("zoneId")} inputMode="numeric" placeholder="Optional" className={inputClass} />
          </Field>
        </div>

        <Field label="Serviceable Area Polygon" error={form.formState.errors.polygonJson?.message}>
          <Controller
            control={form.control}
            name="polygonJson"
            render={({ field }) => (
              <MapboxPolygonEditor
                value={field.value}
                onChange={field.onChange}
                onSave={(nextPolygonJson) => {
                  form.setValue("polygonJson", nextPolygonJson, { shouldDirty: true, shouldValidate: true });
                  submit({ ...form.getValues(), polygonJson: nextPolygonJson });
                }}
                autoSaveOnChange={Boolean(editingItem?.id)}
                isSaving={isSubmitting}
                saveLabel={editingItem ? "Update Area Polygon" : "Create Area Polygon"}
                height={260}
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
