import { useRef, useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getCoupons, saveCoupon } from "../api";
import type { Coupon, CouponPayload } from "../types";

const defaults: CouponPayload = {
  code: "", title: "", description: "", discountType: "PERCENTAGE", discountValue: 20,
  maxDiscountAmount: null, minimumPurchaseAmount: 0, totalUsageLimit: null,
  perUserUsageLimit: 1, maxUsesPerDay: null, validFrom: "", validUntil: "",
  active: true, customerVisible: true, firstBookingOnly: false,
  applicableServiceId: null, applicableCategoryId: null, applicableBookingType: null,
};

const numberFields = [
  ["discountValue", "Discount value", false, 0.01, "0.01"],
  ["maxDiscountAmount", "Maximum discount amount", true, 0, "0.01"],
  ["minimumPurchaseAmount", "Minimum purchase amount", false, 0, "0.01"],
  ["totalUsageLimit", "Total usage limit", true, 1, "1"],
  ["perUserUsageLimit", "Per-user usage limit", false, 1, "1"],
  ["maxUsesPerDay", "Daily global usage limit", true, 1, "1"],
  ["applicableServiceId", "Service ID", true, 1, "1"],
  ["applicableCategoryId", "Category ID", true, 1, "1"],
] as const;
const inputClass = "w-full rounded border bg-transparent p-2";

export default function CouponsPage() {
  const dateInputs = useRef<Partial<Record<"validFrom" | "validUntil", HTMLInputElement | null>>>({});
  const openCalendar = (key: "validFrom" | "validUntil") => {
    const input = dateInputs.current[key];
    if (!input) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      // Keep the date input focused when the browser restricts native pickers.
    }
  };
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponPayload>(defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  const coupons = useQuery({ queryKey: ["admin-coupons", page], queryFn: () => getCoupons(page) });
  const update = <K extends keyof CouponPayload>(key: K, value: CouponPayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setEditing(null); setForm(defaults); setError(""); };
  const edit = (coupon: Coupon) => {
    setEditing(coupon);
    // Copy only writable fields, retaining explicit false values from the server.
    setForm(Object.fromEntries(Object.entries(defaults).map(([key, fallback]) =>
      [key, coupon[key as keyof CouponPayload] ?? fallback])) as CouponPayload);
    setError(""); setMessage("");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError(""); setMessage("");
    if (!form.code.trim() || !form.title.trim()) { setError("Code and title are required."); return; }
    if (!form.validFrom || !form.validUntil || form.validUntil <= form.validFrom) {
      setError("Valid until must be after valid from."); return;
    }
    if (form.discountType === "PERCENTAGE" && form.discountValue > 100) {
      setError("Percentage discount cannot exceed 100."); return;
    }
    for (const [key, label, optional, min, step] of numberFields) {
      const value = form[key];
      if (optional && value == null) continue;
      if (value == null || !Number.isFinite(value) || value < min || (step === "1" && !Number.isSafeInteger(value))) {
        setError(`${label} must be a valid ${step === "1" ? "whole " : ""}number of at least ${min}.`); return;
      }
    }
    const withSeconds = (value: string) => value.length === 16 ? `${value}:00` : value.slice(0, 19);
    setSaving(true);
    try {
      await saveCoupon({ ...form, code: form.code.trim().toUpperCase(), title: form.title.trim(),
        description: form.description.trim(), validFrom: withSeconds(form.validFrom), validUntil: withSeconds(form.validUntil),
      }, editing?.id);
      reset(); setMessage("Coupon saved.");
      await client.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (cause) {
      setError(isAxiosError(cause) ? cause.response?.data?.message ?? "Unable to save coupon." : "Unable to save coupon.");
    } finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <h2 className="text-xl font-semibold">Coupons</h2>
    <form onSubmit={save} className="space-y-4 rounded-xl border p-4">
      <h3 className="font-semibold">{editing ? `Edit ${editing.code}` : "Create coupon"}</h3>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {message && <p role="status">{message}</p>}
      <fieldset disabled={saving} className="grid gap-4 md:grid-cols-2">
        {(["code", "title"] as const).map((key) => <label key={key}>{key === "code" ? "Code" : "Title"}
          <input className={inputClass} required value={form[key]} onChange={(e) => update(key, e.target.value)} />
        </label>)}
        <label className="md:col-span-2">Description<textarea className={inputClass} value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
        <label>Discount type<select className={inputClass} value={form.discountType} onChange={(e) => update("discountType", e.target.value as CouponPayload["discountType"])}>
          <option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option>
        </select></label>
        <label>Booking type<select className={inputClass} value={form.applicableBookingType ?? ""} onChange={(e) => update("applicableBookingType", (e.target.value || null) as CouponPayload["applicableBookingType"])}>
          <option value="">All booking types</option><option value="INSTANT">Instant</option><option value="SCHEDULED">Scheduled</option><option value="SUBSCRIPTION">Subscription</option>
        </select></label>
        {numberFields.map(([key, label, optional, min, step]) => <label key={key}>{label}{optional ? " (optional)" : ""}
          <input className={inputClass} type="number" min={min} step={step} required={!optional}
            max={key === "discountValue" && form.discountType === "PERCENTAGE" ? 100 : undefined}
            value={form[key] ?? ""} onChange={(e) => update(key, e.target.value === "" ? (optional ? null : 0) : Number(e.target.value))} />
        </label>)}
        {(["validFrom", "validUntil"] as const).map((key) => <div key={key}>
          <label htmlFor={`coupon-${key}`}>{key === "validFrom" ? "Valid from" : "Valid until"}</label>
          <div className="flex items-center gap-2">
            <input id={`coupon-${key}`} ref={(input) => { dateInputs.current[key] = input; }}
              className={`${inputClass} min-w-0`} type="datetime-local" step="1" required value={form[key]} onChange={(e) => update(key, e.target.value)} />
            <button type="button" onClick={() => openCalendar(key)}
              className="shrink-0 rounded border p-2 text-[var(--color-text)] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label={`Open ${key === "validFrom" ? "valid from" : "valid until"} calendar`}
              title="Choose date and time">
              <CalendarDays size={20} aria-hidden="true" />
            </button>
          </div>
        </div>)}
        <label><input type="checkbox" role="switch" checked={form.active} onChange={(e) => update("active", e.target.checked)} /> Active</label>
        <label><input type="checkbox" role="switch" checked={form.customerVisible} onChange={(e) => update("customerVisible", e.target.checked)} /> Show in customer app
          <span className="block text-sm text-[var(--color-muted)]">Turn off for hidden coupons entered manually by code.</span>
        </label>
        <label className="md:col-span-2"><input type="checkbox" role="switch" checked={form.firstBookingOnly} onChange={(e) => update("firstBookingOnly", e.target.checked)} /> First booking only
          <span className="block text-sm text-[var(--color-muted)]">Enable only for welcome or first-order coupons, eligible on the customer's first successful paid booking. Leave off for normal campaigns.</span>
        </label>
      </fieldset>
      <div className="flex gap-3"><button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving}>{saving ? "Saving..." : "Save coupon"}</button>
        {editing && <button type="button" disabled={saving} onClick={reset}>Cancel edit</button>}</div>
    </form>
    {coupons.isPending ? <p>Loading coupons...</p> : coupons.isError ? <p role="alert">Unable to load coupons. <button onClick={() => void coupons.refetch()}>Retry</button></p> : <>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Code</th><th>Title</th><th>Visibility</th><th>Eligibility</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{coupons.data.map((coupon) => <tr key={coupon.id} className="border-t"><td className="py-3">{coupon.code}</td><td>{coupon.title}</td><td>{coupon.customerVisible ? "Visible" : "Manual code"}</td><td>{coupon.firstBookingOnly ? "First booking" : "Campaign"}</td><td>{coupon.active ? "Active" : "Inactive"}</td><td><button disabled={saving} onClick={() => edit(coupon)} aria-label={`Edit ${coupon.code}`}>Edit</button></td></tr>)}</tbody>
      </table></div>
      {!coupons.data.length && <p>No coupons found.</p>}
      <div className="flex gap-4"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={coupons.data.length < 20} onClick={() => setPage(page + 1)}>Next</button></div>
    </>}
  </div>;
}
