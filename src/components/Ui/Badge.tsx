import type { VerificationStatus } from "../../types/provider";

export default function Badge({ status }: { status: VerificationStatus }) {
  const base = "px-3 py-1 rounded-full text-xs font-medium";

  const styles = {
    PENDING: "bg-yellow-500/20 text-yellow-400",
    APPROVED: "bg-green-500/20 text-green-400",
    REJECTED: "bg-red-500/20 text-red-400",
  };

  return <span className={`${base} ${styles[status]}`}>{status}</span>;
}