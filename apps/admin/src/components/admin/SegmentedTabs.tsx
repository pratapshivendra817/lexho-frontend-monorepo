type SegmentedTabItem<T extends string> = {
  label: string;
  value: T;
};

type SegmentedTabsProps<T extends string> = {
  items: Array<SegmentedTabItem<T>>;
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {items.map((item) => {
        const isActive = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-[var(--color-accent)] text-white shadow"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
