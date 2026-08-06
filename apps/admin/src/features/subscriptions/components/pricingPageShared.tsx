import { ConfirmDialog } from "@/components/admin";

export function buildOptionalServiceId(value: string): number | null {
  const serviceId = Number(value);
  return value.trim() ? (Number.isFinite(serviceId) && serviceId > 0 ? serviceId : null) : null;
}

export function PricingPageHeader({
  title,
  description,
  addLabel,
  onAdd,
}: {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        <p className="text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      <button type="button" onClick={onAdd} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
        {addLabel}
      </button>
    </div>
  );
}

export function PricingStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-600/30 text-gray-200"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function PricingRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onEdit} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
        Edit
      </button>
      <button type="button" onClick={onDelete} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">
        Deactivate
      </button>
    </div>
  );
}

export function PricingActiveField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Active
    </label>
  );
}

export function PricingDeactivateDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel="Deactivate"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
