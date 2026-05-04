import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "primary" | "danger" | "neutral";
};

const toneClasses: Record<NonNullable<PrimaryButtonProps["tone"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-500",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  neutral: "border border-[var(--color-border)] text-[var(--color-text)] hover:bg-white/5",
};

export function PrimaryButton({
  children,
  className = "",
  tone = "primary",
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
