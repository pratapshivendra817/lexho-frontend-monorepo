export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 p-5 rounded-2xl shadow border border-gray-800">
      {children}
    </div>
  );
}