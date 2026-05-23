import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { fetchSupportTicketById, fetchSupportTicketsWithFilters, replySupportTicket, updateSupportTicketStatus } from "@/api/admin";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";
import { shareContent } from "@/utils/share";
import { StatsCards, TicketDetail, TicketTable } from "../components";

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-tickets", page, limit, search, status, categoryId, priority],
    queryFn: () => fetchSupportTicketsWithFilters({ page, limit, search, status, categoryId, priority }),
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ["support-ticket-detail", selected?.id],
    queryFn: () => fetchSupportTicketById(selected!.id),
    enabled: !!selected?.id,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: string | number; status: TicketStatus }) =>
      updateSupportTicketStatus(payload.id, payload.status),
    onError: () => {
      toast.error("Unable to update ticket status");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (payload: { id: string | number; message: string }) =>
      replySupportTicket(payload.id, payload.message),
    onError: () => {
      toast.error("Unable to send reply");
    },
  });

  useEffect(() => {
    setTickets(data?.tickets ?? []);
  }, [data]);

  const updateStatus = (nextStatus: TicketStatus) => {
    if (!selected) return;

    setTickets((prev) => prev.map((t) => (t.id === selected.id ? { ...t, status: nextStatus } : t)));
    setSelected((prev) => (prev ? { ...prev, status: nextStatus } : prev));

    statusMutation.mutate(
      { id: selected.id, status: nextStatus },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
          await queryClient.invalidateQueries({ queryKey: ["support-ticket-detail", selected.id] });
        },
      },
    );
  };

  const reply = (msg: string) => {
    if (!selected) return;

    const newMsg = {
      sender: "ADMIN" as const,
      message: msg,
      createdAt: new Date().toISOString(),
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
          await queryClient.invalidateQueries({ queryKey: ["support-ticket-detail", selected.id] });
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Support & Complaints</h1>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            void shareContent({
              title: `Ticket #${selected.id}`,
              text: `Status: ${selected.status}\nPriority: ${selected.priority}\nCategory: ${selected.categoryId || "-"}\nSubject: ${selected.subject || "-"}`,
              url: window.location.href,
              successMessage: "Ticket summary copied",
            });
          }}
          className="px-3 py-1.5 rounded border border-[var(--color-border)] text-sm disabled:opacity-50"
        >
          Share Selected Ticket
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="border rounded px-3 py-2" />
        <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | "")} className="border rounded px-3 py-2">
          <option value="">All Status</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Category (payments)" className="border rounded px-3 py-2" />
        <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | "")} className="border rounded px-3 py-2">
          <option value="">All Priority</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
        <button type="button" onClick={() => setPage(1)} className="px-3 py-2 bg-slate-800 text-white rounded">
          Apply
        </button>
      </div>

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

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow">
              <TicketDetail ticket={(detailQuery.data ?? selected) as Ticket | null} onStatusChange={updateStatus} onReply={reply} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">
              Prev
            </button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <button type="button" disabled={tickets.length < limit} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
