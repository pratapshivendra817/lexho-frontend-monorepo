import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { DataState } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { getAdminCartBookingSettings, updateAdminCartBookingSettings } from "../api/cartBookingSettingsApi";
import { defaultCartBookingSettings, type AdminCartBookingSettings } from "../types";

const inputClass = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]";
const sectionClass = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4";
const labelClass = "text-sm font-medium text-[var(--color-text)]";

function validateSettings(form: AdminCartBookingSettings) {
  if (form.maxCartItems < 1) return "Maximum cart items must be at least 1";
  if (form.minServiceQuantity < 1) return "Minimum service quantity must be at least 1";
  if (form.maxServiceQuantity < form.minServiceQuantity) return "Maximum service quantity must be greater than minimum";
  if (form.maxCookQuantity < form.minServiceQuantity) return "Maximum cook quantity must be greater than minimum";
  if (form.maxOtherServiceQuantity < form.minServiceQuantity) return "Maximum other service quantity must be greater than minimum";
  if (form.minCleaningDurationHours < 0.5) return "Minimum cleaning duration cannot be less than 0.5 hour";
  if (form.maxCleaningDurationHours < form.minCleaningDurationHours) return "Maximum cleaning duration must be greater than minimum";
  if (form.instantBookingWindowMinutes < 1) return "Instant booking window must be at least 1 minute";
  if (form.scheduledBookingWindowDays < 1) return "Scheduled booking window must be at least 1 day";
  if (form.slotIntervalMinutes < 1) return "Slot interval must be at least 1 minute";
  if (form.maxBookingsPerSlot < 1) return "Max bookings per slot must be at least 1";
  if (!form.instantBookingEnabled && !form.scheduledBookingEnabled && !form.subscriptionBookingEnabled) {
    return "At least one booking mode must be enabled";
  }
  return "";
}

export default function CartBookingSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminCartBookingSettings>(defaultCartBookingSettings);

  const settingsQuery = useQuery({
    queryKey: ["admin-cart-booking-settings"],
    queryFn: getAdminCartBookingSettings,
    retry: false,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const timeoutId = window.setTimeout(() => setForm(settingsQuery.data as AdminCartBookingSettings), 0);
    return () => window.clearTimeout(timeoutId);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateAdminCartBookingSettings,
    onSuccess: async (next) => {
      toast.success("Cart & booking settings updated");
      setForm(next);
      await queryClient.invalidateQueries({ queryKey: ["admin-cart-booking-settings"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update cart & booking settings")),
  });

  const updateNumber = (key: keyof AdminCartBookingSettings, value: string) => {
    setForm((previous) => ({ ...previous, [key]: Number(value) }));
  };

  const updateToggle = (key: keyof AdminCartBookingSettings) => {
    setForm((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const save = () => {
    const error = validateSettings(form);
    if (error) {
      toast.error(error);
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Cart & Booking Settings</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Manage production cart limits, booking modes, slot protection and subscription checkout controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setForm(defaultCartBookingSettings)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            Production Defaults
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <DataState
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        isEmpty={false}
        loadingText="Loading cart & booking settings..."
        errorText="Failed to load cart & booking settings"
        emptyText=""
        onRetry={() => void settingsQuery.refetch()}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <section className={sectionClass}>
            <SectionTitle title="Cart Limits" description="Rules applied before add-to-cart and quantity updates." />
            <div className="grid gap-3 md:grid-cols-5">
              <NumberField label="Max cart items" value={form.maxCartItems} min={1} onChange={(value) => updateNumber("maxCartItems", value)} />
              <NumberField label="Min quantity" value={form.minServiceQuantity} min={1} onChange={(value) => updateNumber("minServiceQuantity", value)} />
              <NumberField label="Legacy max/service" value={form.maxServiceQuantity} min={1} onChange={(value) => updateNumber("maxServiceQuantity", value)} />
              <NumberField label="Max cook quantity" value={form.maxCookQuantity} min={1} onChange={(value) => updateNumber("maxCookQuantity", value)} />
              <NumberField label="Max other quantity" value={form.maxOtherServiceQuantity} min={1} onChange={(value) => updateNumber("maxOtherServiceQuantity", value)} />
            </div>
          </section>

          <section className={sectionClass}>
            <SectionTitle title="Cleaning Duration" description="Bounds for admin-configured duration pricing." />
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField label="Min duration hours" value={form.minCleaningDurationHours} min={0.5} step={0.5} onChange={(value) => updateNumber("minCleaningDurationHours", value)} />
              <NumberField label="Max duration hours" value={form.maxCleaningDurationHours} min={0.5} step={0.5} onChange={(value) => updateNumber("maxCleaningDurationHours", value)} />
            </div>
          </section>

          <section className={sectionClass}>
            <SectionTitle title="Booking Modes" description="Control which customer booking flows are available." />
            <div className="grid gap-2">
              <ToggleRow label="Instant booking" checked={form.instantBookingEnabled} onChange={() => updateToggle("instantBookingEnabled")} />
              <ToggleRow label="Scheduled booking" checked={form.scheduledBookingEnabled} onChange={() => updateToggle("scheduledBookingEnabled")} />
              <ToggleRow label="Subscription booking" checked={form.subscriptionBookingEnabled} onChange={() => updateToggle("subscriptionBookingEnabled")} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <NumberField label="Instant window minutes" value={form.instantBookingWindowMinutes} min={1} onChange={(value) => updateNumber("instantBookingWindowMinutes", value)} />
              <NumberField label="Scheduled window days" value={form.scheduledBookingWindowDays} min={1} onChange={(value) => updateNumber("scheduledBookingWindowDays", value)} />
            </div>
          </section>

          <section className={sectionClass}>
            <SectionTitle title="Slot Protection" description="Capacity and recheck rules used during booking creation." />
            <div className="grid gap-2">
              <ToggleRow label="Recheck slot before booking" checked={form.requireSlotRecheck} onChange={() => updateToggle("requireSlotRecheck")} />
              <ToggleRow label="Reject booking when slot is full" checked={form.rejectFullSlots} onChange={() => updateToggle("rejectFullSlots")} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <NumberField label="Max bookings per slot" value={form.maxBookingsPerSlot} min={1} onChange={(value) => updateNumber("maxBookingsPerSlot", value)} />
              <NumberField label="Slot interval minutes" value={form.slotIntervalMinutes} min={1} onChange={(value) => updateNumber("slotIntervalMinutes", value)} />
            </div>
          </section>

          <section className={`${sectionClass} xl:col-span-2`}>
            <SectionTitle title="Subscription Checkout" description="Production controls for subscription create and payment flow." />
            <div className="grid gap-2 md:grid-cols-3">
              <ToggleRow label="Enable subscription checkout" checked={form.subscriptionCheckoutEnabled} onChange={() => updateToggle("subscriptionCheckoutEnabled")} />
              <ToggleRow label="Payment required" checked={form.subscriptionPaymentRequired} onChange={() => updateToggle("subscriptionPaymentRequired")} />
              <ToggleRow label="Auto renew enabled" checked={form.subscriptionAutoRenewEnabled} onChange={() => updateToggle("subscriptionAutoRenewEnabled")} />
            </div>
          </section>
        </div>
      </DataState>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{description}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input type="number" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-blue-600" />
    </label>
  );
}
