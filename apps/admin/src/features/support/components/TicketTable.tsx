import type { Ticket } from "@/types/ticket";
import StatusBadge from "./StatusBadge";

interface Props {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  selectedId?: string | number;
}

function RequesterBadge({ requesterType }: { requesterType?: Ticket["requesterType"] }) {
  const value = requesterType ?? "USER";
  const className =
    value === "PARTNER"
      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
      : value === "CUSTOMER"
        ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200"
        : "border-slate-500/40 bg-slate-500/10 text-slate-200";

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}

function PriorityBadge({ priority }: { priority?: Ticket["priority"] }) {
  const value = priority ?? "-";
  const className =
    value === "URGENT"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : value === "HIGH"
        ? "border-orange-500/40 bg-orange-500/10 text-orange-200"
        : value === "MEDIUM"
          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
          : value === "LOW"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-slate-500/40 bg-slate-500/10 text-slate-200";

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}

function CategoryBadge({ categoryId }: { categoryId?: Ticket["categoryId"] }) {
  const value = categoryId ?? "-";
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

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>;
}

export default function TicketTable({ tickets, onSelect, selectedId }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#020617] text-white shadow">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-left text-gray-300">
          <tr>
            <th className="p-3">Ticket ID</th>
            <th>Requester</th>
            <th>Subject</th>
            <th>Category</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              className={`cursor-pointer border-t align-top hover:bg-gray-800 ${selectedId === ticket.id ? "bg-purple-900/30" : ""}`}
            >
              <td className="p-3 font-mono text-xs">{ticket.ticketId ?? ticket.id}</td>
              <td className="px-3 py-3">
                <RequesterBadge requesterType={ticket.requesterType} />
                <div className="text-xs text-gray-400">{ticket.userId ?? "-"}</div>
              </td>
              <td className="px-3 py-3">
                <div className="font-medium">{ticket.subject}</div>
                <div className="mt-1 text-xs text-gray-400">{ticket.bookingId ? `Booking: ${ticket.bookingId}` : "No booking linked"}</div>
              </td>
              <td className="px-3 py-3">
                <CategoryBadge categoryId={ticket.categoryId} />
                {ticket.rawCategoryId ? <div className="mt-1 text-xs text-gray-500">Raw: {ticket.rawCategoryId}</div> : null}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-3 py-3">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-3 py-3 text-xs text-gray-300">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
