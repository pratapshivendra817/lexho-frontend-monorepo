interface Props {
  title: string;
  value: string;
}

export default function StatCard({ title, value }: Props) {
  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-xl font-semibold mt-1">{value}</h2>
    </div>
  );
}