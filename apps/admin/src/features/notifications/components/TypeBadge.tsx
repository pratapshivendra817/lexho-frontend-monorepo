// src/components/notifications/TypeBadge.tsx
import type { NotificationType } from "@/types/notification";

export default function TypeBadge({ type }: { type: NotificationType }) {
  const styles = {
    SMS: "bg-blue-100 text-blue-700",
    EMAIL: "bg-green-100 text-green-700",
    PUSH: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles[type]}`}>
      {type}
    </span>
  );
}