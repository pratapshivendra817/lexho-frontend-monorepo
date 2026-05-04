type ButtonLoaderProps = {
  label: string;
  loading: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function ButtonLoader({
  label,
  loading,
  type = "button",
  onClick,
  disabled,
  className = "",
}: ButtonLoaderProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`small-action ${className}`.trim()}
    >
      {loading ? "Please wait..." : label}
    </button>
  );
}
