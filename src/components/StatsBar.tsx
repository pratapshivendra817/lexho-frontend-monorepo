export default function StatsBar() {
  const stats = [
    { label: "Active Banners", value: "3", color: "text-green-400" },
    { label: "Avg. CTR", value: "12.4%", color: "text-blue-400" },
    { label: "Promo Redemptions", value: "2,140", color: "text-orange-400" },
    { label: "Revenue via Promos", value: "₹3,14,200", color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 bg-[#1e1b4b] p-5 rounded-2xl mt-8">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="text-sm text-gray-400">{s.label}</p>
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}