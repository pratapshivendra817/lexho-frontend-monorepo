import type { Booking } from "../types/booking";

interface Props {
  data: Booking[];
}

export default function BookingStats({ data }: Props) {
  const stats = {
    PENDING: data.filter(b => b.status === "PENDING").length,
    CONFIRMED: data.filter(b => b.status === "CONFIRMED").length,
    COMPLETED: data.filter(b => b.status === "COMPLETED").length,
    CANCELLED: data.filter(b => b.status === "CANCELLED").length,
  };

  const Card = (title: string, value: number, color: string) => (
    <div className={`p-5 rounded-2xl border ${color} bg-slate-900 shadow-lg transition hover:scale-105`}>
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Card("Pending", stats.PENDING, "border-yellow-500")}
      {Card("Confirmed", stats.CONFIRMED, "border-cyan-500")}
      {Card("Completed", stats.COMPLETED, "border-green-500")}
      {Card("Cancelled", stats.CANCELLED, "border-red-500")}
    </div>
  );
}