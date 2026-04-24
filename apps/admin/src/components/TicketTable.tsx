import type { Ticket } from "../types/ticket";
import StatusBadge from "./StatusBadge";

interface Props {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  selectedId?: string;
}

export default function TicketTable({ tickets, onSelect, selectedId }: Props) {
  return (
  
    <div className="bg-[#020617] text-white rounded-xl shadow overflow-hidden border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-left text-gray-300">
          <tr>
            <th className="p-3">Ticket ID</th>
            <th>User</th>
            <th>Issue</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr
              key={t.id}
              onClick={() => onSelect(t)}
              className={`cursor-pointer border-t hover:bg-gray-800 ${
                selectedId === t.id ? "bg-purple-900/30" : ""
              }`}
            >
              <td className="p-3">{t.id}</td>
              <td>{t.user}</td>
              <td>{t.issue}</td>
              <td><StatusBadge status={t.status} /></td>
              <td>{t.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}