// CreateNotificationModal.tsx
import type { NotificationType } from "@/types/notification";
import { useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotificationModal({
  open,
  onClose,
  onCreate,
  isSubmitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    userId: number;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: number;
  }) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("PUSH");

  if (!open) return null;

  const handleSubmit = async () => {
    const normalizedUserId = Number(userId.trim());
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      toast.error("Valid user ID required");
      return;
    }

    if (!title.trim()) {
      toast.error("Title required");
      return;
    }

    if (!message.trim()) {
      toast.error("Message required");
      return;
    }

    try {
      await onCreate({
        userId: normalizedUserId,
        title: title.trim(),
        message: message.trim(),
        type,
      });
      setUserId("");
      setTitle("");
      setMessage("");
      setType("PUSH");
      onClose();
    } catch {
      // Error state is handled by caller-level mutation notifications.
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-[#020617] p-6 rounded-xl w-[400px] space-y-4">
        <h2 className="text-lg font-semibold">Create Notification</h2>

        <input
          placeholder="User ID"
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <input
          placeholder="Title"
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Message"
          className="w-full p-2 rounded bg-gray-900 border border-gray-700 min-h-24"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <select
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          value={type}
          onChange={(e) => setType(e.target.value as NotificationType)}
        >
          <option value="SMS">SMS</option>
          <option value="EMAIL">Email</option>
          <option value="PUSH">Push</option>
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="bg-purple-600 px-3 py-1 rounded"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
