import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { pieData } from "../data/dashboardData";

const COLORS = ["#06b6d4", "#f97316", "#6366f1", "#eab308"];

export default function ServicePieChart() {
  return (
    <div className="bg-[#1e1b4b] p-5 rounded-2xl shadow-lg">
      <h3 className="text-white mb-4">Services Distribution</h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
          >
            {pieData.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}