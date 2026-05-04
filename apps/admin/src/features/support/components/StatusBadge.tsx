import type { TicketStatus } from "@/types/ticket";

export default function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    OPEN: "bg-red-100 text-red-600",
    IN_PROGRESS: "bg-yellow-100 text-yellow-600",
    RESOLVED: "bg-green-100 text-green-600",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${styles[status]}`}>
      {status}
    </span>
  );
}