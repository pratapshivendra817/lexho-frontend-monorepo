type Props = {
  title: string;
  value: string;
  growth: string;
};

export default function DashboardCard({ title, value, growth }: Props) {
  return (
    <div className="bg-[#1e1b4b] p-5 rounded-2xl shadow-lg border border-gray-700">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold mt-2 text-white">{value}</h2>
      <p className="text-green-400 text-sm mt-1">{growth}</p>
    </div>
  );
}