import type { Ticket } from "@/types/ticket";

export default function StatsCards({ tickets }: { tickets: Ticket[] }) {
  const open = tickets.filter(t => t.status === "OPEN").length;
  const progress = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const resolved = tickets.filter(t => t.status === "RESOLVED").length;

  const Card = ({ label, value }: any) => (
    <div className="bg-white p-4 rounded-xl shadow flex-1">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );

  return (
    <div className="flex gap-4">
      <Card label="Open Tickets" value={open} />
      <Card label="In Progress" value={progress} />
      <Card label="Resolved" value={resolved} />
    </div>
  );
}