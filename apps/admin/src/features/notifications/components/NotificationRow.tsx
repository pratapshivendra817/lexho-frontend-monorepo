// src/components/notifications/NotificationRow.tsx
import { useState } from "react";
import type { Notification } from "@/types/notification";
import TypeBadge from "./TypeBadge";
import toast from "react-hot-toast";

export default function NotificationRow({
  data,
}: {
  data: Notification;
}) {
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-1 text-xs rounded-full font-medium";

    switch (status) {
      case "SENT":
        return `${base} bg-green-100 text-green-700`;
      case "FAILED":
        return `${base} bg-red-100 text-red-700`;
      case "PENDING":
        return `${base} bg-yellow-100 text-yellow-700`;
      default:
        return base;
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);

      // 👉 Replace this with API later
      await new Promise((res) => setTimeout(res, 800));

      toast.success(`Resent: ${data.title}`);
    } catch (err) {
      toast.error("Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-900/40 transition">
      
      {/* Title */}
      <td className="p-3 font-medium">{data.title}</td>

      {/* Type */}
      <td className="p-3">
        <TypeBadge type={data.type} />
      </td>

      {/* Audience */}
      <td className="p-3 text-gray-300">{data.audience}</td>

      {/* Status */}
      <td className="p-3">
        <span className={getStatusBadge(data.status)}>
          {data.status}
        </span>
      </td>

      {/* Date */}
      <td className="p-3 text-gray-400">{data.date}</td>

      {/* Action */}
      <td className="p-3">
        <button
          onClick={handleResend}
          disabled={loading}
          className={`text-sm ${
            loading
              ? "text-gray-500 cursor-not-allowed"
              : "text-purple-400 hover:underline"
          }`}
        >
          {loading ? "Sending..." : "Resend"}
        </button>
      </td>
    </tr>
  );
}