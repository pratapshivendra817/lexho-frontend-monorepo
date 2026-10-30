import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { SegmentedTabs } from "@/components/admin";
import { fetchSupportTicketById, fetchSupportTicketsWithFilters, replySupportTicket, updateSupportTicketStatus } from "@/api/admin";
import type { Ticket, TicketPriority, TicketRequesterType, TicketStatus } from "@/types/ticket";
import { shareContent } from "@/utils/share";
import { StatsCards, TicketDetail, TicketTable } from "../components";
import SupportFaqsPage from "./SupportFaqsPage";

type SupportMode = "customer" | "partner" | "faqs";
type SupportSortKey = "createdAt" | "priority" | "status" | "subject";
type SupportSortDirection = "asc" | "desc";

const priorityRank: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export default function SupportPage() {
  const [mode, setMode] = useState<SupportMode>("customer");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [sortKey, setSortKey] = useState<SupportSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SupportSortDirection>("desc");
  const queryClient = useQueryClient();
  const requesterType: TicketRequesterType = mode === "partner" ? "PARTNER" : "CUSTOMER";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["support-tickets", requesterType, page, limit, search, status, categoryId, priority],
    queryFn: () => fetchSupportTicketsWithFilters({ requesterType, page, limit, search, status, categoryId, priority }),
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
    setSelected(null);
  }, [data]);

  const displayedTickets = [...tickets].sort((left, right) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "priority") {
      const leftRank = priorityRank[String(left.priority ?? "").toUpperCase()] ?? 0;
      const rightRank = priorityRank[String(right.priority ?? "").toUpperCase()] ?? 0;
      return (leftRank - rightRank) * direction;
    }

    if (sortKey === "status") {
      return String(left.status ?? "").localeCompare(String(right.status ?? "")) * direction;
    }

    if (sortKey === "subject") {
      return String(left.subject ?? "").localeCompare(String(right.subject ?? "")) * direction;
    }

    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return (leftTime - rightTime) * direction;
  });

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

  if (mode === "faqs") {
    return (
      <div className="space-y-4 p-6">
        <SegmentedTabs items={supportModeTabs} value={mode} onChange={setMode} />
        <SupportFaqsPage />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <SegmentedTabs items={supportModeTabs} value={mode} onChange={setMode} />

      <h1 className="text-2xl font-bold">{requesterType === "PARTNER" ? "Partner Support Tickets" : "Customer Support Tickets"}</h1>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            void shareContent({
              title: `Ticket #${selected.id}`,
              text: `Status: ${selected.status}\nPriority: ${selected.priority}\nCategory: ${selected.categoryId || "-"}\nRequestId: ${selected.requestId || "-"}\nCorrelationId: ${selected.correlationId || "-"}\nSubject: ${selected.subject || "-"}`,
              url: window.location.href,
              successMessage: "Ticket summary copied",
            });
          }}
          className="px-3 py-1.5 rounded border border-[var(--color-border)] text-sm disabled:opacity-50"
        >
          Share Selected Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStatus("")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === "" ? "border-slate-400 bg-slate-500/20 text-white" : "border-[var(--color-border)] text-[var(--color-muted)]"}`}>
            All
          </button>
          <button type="button" onClick={() => setStatus("OPEN")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === "OPEN" ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-[var(--color-border)] text-[var(--color-muted)]"}`}>
            Open
          </button>
          <button type="button" onClick={() => setStatus("IN_PROGRESS")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === "IN_PROGRESS" ? "border-yellow-400/40 bg-yellow-500/10 text-yellow-200" : "border-[var(--color-border)] text-[var(--color-muted)]"}`}>
            In Progress
          </button>
          <button type="button" onClick={() => setStatus("RESOLVED")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === "RESOLVED" ? "border-green-400/40 bg-green-500/10 text-green-200" : "border-[var(--color-border)] text-[var(--color-muted)]"}`}>
            Resolved
          </button>
          <button type="button" onClick={() => setPriority("URGENT")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${priority === "URGENT" ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-[var(--color-border)] text-[var(--color-muted)]"}`}>
            Urgent
          </button>
          <button type="button" onClick={() => { setStatus(""); setPriority(""); setCategoryId(""); setSearch(""); }} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
            Reset Filters
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SupportSortKey)} className="rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm">
            <option value="createdAt">Sort: Newest</option>
            <option value="priority">Sort: Priority</option>
            <option value="status">Sort: Status</option>
            <option value="subject">Sort: Subject</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
            className="rounded border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            {sortDirection === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>
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

          <div className="grid min-h-0 grid-cols-1 gap-4 xl:h-[640px] xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
            <section className="min-w-0 overflow-auto rounded-xl xl:h-full" aria-label="Support ticket list">
              <TicketTable tickets={displayedTickets} onSelect={setSelected} selectedId={selected?.id} />
            </section>

            <aside className="min-h-[560px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow xl:min-h-0 xl:h-full" aria-label="Selected ticket details">
              {selected ? (
                <div className="border-b border-[var(--color-border)] p-3 text-xs">
                  <div className="grid gap-1">
                    <span className="text-[var(--color-muted)]">RequestId</span>
                    <span className="break-all font-mono">{selected.requestId || "-"}</span>
                  </div>
                  <div className="mt-2 grid gap-1">
                    <span className="text-[var(--color-muted)]">CorrelationId</span>
                    <span className="break-all font-mono">{selected.correlationId || "-"}</span>
                  </div>
                </div>
              ) : null}
              <TicketDetail ticket={(detailQuery.data ?? selected) as Ticket | null} onStatusChange={updateStatus} onReply={reply} />
            </aside>
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

const supportModeTabs: Array<{ label: string; value: SupportMode }> = [
  { label: "Customer Support", value: "customer" },
  { label: "Partner Support", value: "partner" },
  { label: "Support FAQs", value: "faqs" },
];
