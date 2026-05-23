type StatusToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export function StatusToggle({ checked, disabled = false, onChange }: StatusToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
        checked ? "bg-emerald-500/30" : "bg-slate-500/30"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-7" : "translate-x-0"}`}
      />
    </button>
  );
}

