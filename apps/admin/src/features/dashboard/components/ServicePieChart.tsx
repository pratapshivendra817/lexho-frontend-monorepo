import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import { pieData } from "../data";

const COLORS = ["#06b6d4", "#f97316", "#6366f1", "#eab308"];

type PiePoint = {
  name: string;
  value: number;
};

export default function ServicePieChart({
  data = pieData,
}: {
  data?: PiePoint[];
}) {
  return (
    <div className="bg-[#1e1b4b] p-5 rounded-2xl shadow-lg">
      <h3 className="text-white mb-4">Services Distribution</h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
