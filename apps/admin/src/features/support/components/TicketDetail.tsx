import { useState } from "react";
import type { Ticket, TicketStatus } from "@/types/ticket";
import StatusBadge from "./StatusBadge";

function MetaBadge({
  value,
  tone,
}: {
  value: string;
  tone: "priority" | "requester";
}) {
  const className =
    tone === "requester"
      ? value === "PARTNER"
        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
        : value === "CUSTOMER"
          ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200"
          : "border-slate-600 text-slate-300"
      : value === "URGENT"
        ? "border-red-500/40 bg-red-500/10 text-red-200"
        : value === "HIGH"
          ? "border-orange-500/40 bg-orange-500/10 text-orange-200"
          : value === "MEDIUM"
            ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";

  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}

function CategoryBadge({ value }: { value: string }) {
  const className =
    value === "PAYMENT"
      ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
      : value === "PAYOUT"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
        : value === "SAFETY"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : value === "GENERAL"
            ? "border-slate-500/40 bg-slate-500/10 text-slate-200"
            : "border-violet-500/40 bg-violet-500/10 text-violet-200";

  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}

export default function TicketDetail({
  ticket,
  onStatusChange,
  onReply,
}: {
  ticket: Ticket | null;
  onStatusChange: (status: TicketStatus) => void;
  onReply: (msg: string) => void;
}) {
  const [reply, setReply] = useState("");
  const statusActions: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

  if (!ticket) {
    return <div className="p-6 text-gray-400">Select a ticket</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <h2 className="text-lg font-semibold">{ticket.subject}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          {ticket.priority ? <MetaBadge value={ticket.priority} tone="priority" /> : null}
          {ticket.requesterType ? <MetaBadge value={ticket.requesterType} tone="requester" /> : null}
          {ticket.categoryId ? <CategoryBadge value={ticket.categoryId} /> : null}
        </div>
        <div className="grid gap-1 text-sm text-gray-500">
          <p>Ticket: {ticket.ticketId ?? ticket.id}</p>
          <p>User: {ticket.userId || "-"}</p>
          <p>Category: {ticket.categoryId || "-"}</p>
          <p>Booking: {ticket.bookingId || "-"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {ticket.messages.length === 0 ? <div className="text-sm text-gray-400">No conversation yet.</div> : null}
        {ticket.messages.map((message, index) => (
          <div
            key={message.id ?? `${message.sender}-${index}`}
            className={`max-w-xs rounded-lg p-3 text-sm ${
              message.sender === "ADMIN" || message.sender === "SUPPORT" ? "ml-auto bg-purple-100" : "bg-gray-100"
            }`}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{message.sender}</p>
            <p>{message.message}</p>
            <span className="text-xs text-gray-500">{message.createdAt ? new Date(message.createdAt).toLocaleString() : "-"}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t p-4">
        <div className="flex flex-wrap gap-2">
          {statusActions.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`rounded px-3 py-1 text-white ${
                ticket.status === status
                  ? "bg-purple-700"
                  : status === "OPEN"
                    ? "bg-slate-500"
                    : status === "IN_PROGRESS"
                      ? "bg-yellow-500"
                      : status === "RESOLVED"
                        ? "bg-green-600"
                        : "bg-gray-700"
              }`}
            >
              {status === "IN_PROGRESS" ? "In Progress" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Type reply..."
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (!reply.trim()) return;
              onReply(reply);
              setReply("");
            }}
            className="rounded bg-purple-600 px-4 text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
