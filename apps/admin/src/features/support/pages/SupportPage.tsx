import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { fetchSupportTickets, replySupportTicket, updateSupportTicketStatus } from "@/api/admin";
import type { Ticket, TicketStatus } from "@/types/ticket";
import { StatsCards, TicketDetail, TicketTable } from "../components";

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: fetchSupportTickets,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: TicketStatus }) =>
      updateSupportTicketStatus(payload.id, payload.status),
    onError: () => {
      toast.error("Unable to update ticket status");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (payload: { id: string; message: string }) =>
      replySupportTicket(payload.id, payload.message),
    onError: () => {
      toast.error("Unable to send reply");
    },
  });

  useEffect(() => {
    setTickets(data ?? []);
  }, [data]);

  const updateStatus = (status: TicketStatus) => {
    if (!selected) return;

    setTickets((prev) => prev.map((t) => (t.id === selected.id ? { ...t, status } : t)));
    setSelected((prev) => (prev ? { ...prev, status } : prev));

    statusMutation.mutate(
      { id: selected.id, status },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        },
      },
    );
  };

  const reply = (msg: string) => {
    if (!selected) return;

    const newMsg = {
      sender: "ADMIN" as const,
      text: msg,
      time: "Now",
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, messages: [...t.messages, newMsg] } : t)),
    );

    setSelected((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev));

    replyMutation.mutate(
      { id: selected.id, message: msg },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Support & Complaints</h1>

      {isLoading ? (
        <div className="text-gray-300">Loading tickets...</div>
      ) : isError ? (
        <div className="space-y-3">
          <div className="text-red-300">Failed to load support tickets.</div>
          <button type="button" onClick={() => void refetch()} className="px-3 py-1 bg-red-600 rounded">
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-gray-400">No tickets found</div>
      ) : (
        <>
          <StatsCards tickets={tickets} />

          <div className="grid grid-cols-3 gap-4 h-[600px]">
            <div className="col-span-2">
              <TicketTable tickets={tickets} onSelect={setSelected} selectedId={selected?.id} />
            </div>

            <div className="bg-white rounded-xl shadow">
              <TicketDetail ticket={selected} onStatusChange={updateStatus} onReply={reply} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

