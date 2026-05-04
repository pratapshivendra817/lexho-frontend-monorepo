import { FiMoon, FiSun } from "react-icons/fi";

import { useAdminTheme } from "@/context/AdminThemeProvider";

export function ThemeToggle() {
  const { mode, toggle } = useAdminTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
      aria-label="Toggle theme"
    >
      {mode === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
      <span>{mode === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
