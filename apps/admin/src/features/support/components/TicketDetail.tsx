import type { Ticket, TicketStatus } from "@/types/ticket";
import { useState } from "react";

export default function TicketDetail({
  ticket,
  onStatusChange,
  onReply,
}: {
  ticket: Ticket | null; // ✅ allow null
  onStatusChange: (status: TicketStatus) => void; // ✅ strict type
  onReply: (msg: string) => void;
}) {
  const [reply, setReply] = useState("");

  // ✅ safe null handling
  if (!ticket) {
    return <div className="p-6 text-gray-400">Select a ticket</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="font-semibold text-lg">{ticket.subject}</h2>
        <p className="text-sm text-gray-500">Ticket: {ticket.ticketId ?? ticket.id}</p>
        <p className="text-sm text-gray-500">User: {ticket.userId ?? "-"}</p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-xs p-3 rounded-lg text-sm ${
              m.sender === "ADMIN" || m.sender === "SUPPORT"
                ? "bg-purple-100 ml-auto"
                : "bg-gray-100"
            }`}
          >
            <p>{m.message}</p>
            <span className="text-xs text-gray-500">{m.createdAt ? new Date(m.createdAt).toLocaleString() : "-"}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="border-t p-4 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange("OPEN")}
            className="px-3 py-1 bg-slate-500 text-white rounded"
          >
            Open
          </button>
          <button
            onClick={() => onStatusChange("IN_PROGRESS")}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
          >
            In Progress
          </button>
          <button
            onClick={() => onStatusChange("RESOLVED")}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Resolve
          </button>
          <button
            onClick={() => onStatusChange("CLOSED")}
            className="px-3 py-1 bg-gray-700 text-white rounded"
          >
            Close
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type reply..."
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (!reply.trim()) return; // ✅ avoid empty message
              onReply(reply);
              setReply("");
            }}
            className="bg-purple-600 text-white px-4 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
