import type { ServiceItem } from "../types";
import { PrimaryButton } from "./PrimaryButton";

type ServiceCardProps = {
  item: ServiceItem;
  onMakePopular: (item: ServiceItem) => void;
  disabled?: boolean;
  debug?: boolean;
};

export function ServiceCard({ item, onMakePopular, disabled, debug = false }: ServiceCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-start gap-3">
        <img
          src={item.imageUrl || "https://via.placeholder.com/96x72?text=Service"}
          alt={item.name}
          className="h-20 w-24 rounded-md border border-[var(--color-border)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">{item.name}</p>
          <p className="text-xs text-[var(--color-muted)]">INR {item.price.toFixed(2)}</p>
          <p className="text-xs text-[var(--color-muted)]">Rating: {item.rating.toFixed(1)}</p>
          {debug ? (
            <p className="mt-1 break-all rounded bg-amber-500/10 px-2 py-1 font-mono text-[10px] text-amber-300">
              sid:{item.id} | cid:{item.categoryId || "-"} | c:{item.categoryName || "-"}
            </p>
          ) : null}
          <div className="mt-3">
            <PrimaryButton onClick={() => onMakePopular(item)} disabled={disabled}>
              Make Popular
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
