// CreateNotificationModal.tsx
import { useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotificationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("PUSH");

  if (!open) return null;

  const handleSubmit = () => {
    if (!title) {
      toast.error("Title required");
      return;
    }

    toast.success("Notification created!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-[#020617] p-6 rounded-xl w-[400px] space-y-4">
        <h2 className="text-lg font-semibold">Create Notification</h2>

        <input
          placeholder="Title"
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="SMS">SMS</option>
          <option value="EMAIL">Email</option>
          <option value="PUSH">Push</option>
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={handleSubmit}
            className="bg-purple-600 px-3 py-1 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}