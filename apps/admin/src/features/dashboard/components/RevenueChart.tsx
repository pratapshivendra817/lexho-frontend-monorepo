import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { monthlyData } from "../data";

type RevenuePoint = {
  name: string;
  bookings: number;
  revenue: number;
};

export default function RevenueChart({
  data = monthlyData,
}: {
  data?: RevenuePoint[];
}) {
  return (
    <div className="bg-[#1e1b4b] p-5 rounded-2xl shadow-lg">
      <h3 className="text-white mb-4">Monthly Bookings & Revenue</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#ccc" />
          <YAxis stroke="#ccc" />
          <Tooltip />
          <Bar dataKey="bookings" fill="#6366f1" />
          <Bar dataKey="revenue" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
