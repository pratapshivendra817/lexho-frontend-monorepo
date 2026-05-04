// StatusBadge.tsx
import type { NotificationStatus } from "@/types/notification";

export default function StatusBadge({
  status,
}: {
  status: NotificationStatus;
}) {
  const styles: Record<NotificationStatus, string> = {
    SENT: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}