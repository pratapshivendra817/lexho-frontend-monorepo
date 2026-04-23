interface Props {
  label: string;
  onClick?: () => void;
  variant?: "green" | "red" | "default";
}

export default function Button({ label, onClick, variant }: Props) {
  const base = "px-4 py-2 rounded-lg text-sm font-medium";

  const styles = {
    green: "bg-green-600 hover:bg-green-700",
    red: "bg-red-600 hover:bg-red-700",
    default: "bg-gray-700 hover:bg-gray-600",
  };

  return (
    <button onClick={onClick} className={`${base} ${styles[variant || "default"]}`}>
      {label}
    </button>
  );
}