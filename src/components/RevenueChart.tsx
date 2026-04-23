import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { monthlyData } from "../data/dashboardData";

export default function RevenueChart() {
  return (
    <div className="bg-[#1e1b4b] p-5 rounded-2xl shadow-lg">
      <h3 className="text-white mb-4">Monthly Bookings & Revenue</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={monthlyData}>
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