// components/user/UserStats.tsx
//import { User } from "../../types/user";
import type { User } from "../../types/user";

export default function UserStats({ user }: { user: User }) {
  const stats = [
    { label: "Total Bookings", value: user.stats.totalBookings },
    { label: "Total Spend", value: `₹${user.stats.totalSpend}` },
    { label: "Last Activity", value: user.stats.lastActivity },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <div key={i} className="bg-[#020617] p-4 rounded-xl">
          <p className="text-sm text-gray-400">{s.label}</p>
          <p className="text-lg font-semibold">{s.value}</p>
        </div>
      ))}
    
    </div>
  );
}