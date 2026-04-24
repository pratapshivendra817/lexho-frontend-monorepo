import { useState } from "react";
import type { Ticket, TicketStatus } from "../types/ticket";
import TicketTable from "../components/TicketTable";
import TicketDetail from "../components/TicketDetail";
import StatsCards from "../components/StatsCards";

const mockData: Ticket[] = [
  {
    id: "T001",
    user: "Rahul Sharma",
    issue: "Payment not received",
    status: "OPEN",
    date: "2026-04-21",
    messages: [
      { sender: "USER", text: "Payment failed", time: "10:00 AM" },
    ],
  },
  {
    id: "T002",
    user: "Amit Verma",
    issue: "Service delayed",
    status: "IN_PROGRESS",
    date: "2026-04-22",
    messages: [
      { sender: "USER", text: "Service late", time: "11:00 AM" },
    ],
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(mockData);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const updateStatus = (status: TicketStatus) => {
    if (!selected) return;

    setTickets(prev =>
      prev.map(t =>
        t.id === selected.id ? { ...t, status } : t
      )
    );

    setSelected(prev => (prev ? { ...prev, status } : prev));
  };

  const reply = (msg: string) => {
    if (!selected) return;

    const newMsg = {
      sender: "ADMIN" as const,
      text: msg,
      time: "Now",
    };

    setTickets(prev =>
      prev.map(t =>
        t.id === selected.id
          ? { ...t, messages: [...t.messages, newMsg] }
          : t
      )
    );

    setSelected(prev =>
      prev
        ? { ...prev, messages: [...prev.messages, newMsg] }
        : prev
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Support & Complaints</h1>

      <StatsCards tickets={tickets} />

      <div className="grid grid-cols-3 gap-4 h-[600px]">
        
        {/* LEFT */}
        <div className="col-span-2">
          {tickets.length === 0 ? (
            <div className="p-4 text-gray-400">No tickets found</div>
          ) : (
            <TicketTable
              tickets={tickets}   // ✅ IMPORTANT
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          )}
        </div>

        {/* RIGHT */}
        <div className="bg-white rounded-xl shadow">
          <TicketDetail
            ticket={selected}
            onStatusChange={updateStatus}
            onReply={reply}
          />
        </div>

      </div>
    </div>
  );
}