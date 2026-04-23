import { useNavigate } from "react-router-dom";

export default function ProvidersPage() {
  const navigate = useNavigate();

  const providers = [
    { id: "PR123", name: "Ravi Kumar", status: "PENDING" },
    { id: "PR124", name: "Amit Singh", status: "APPROVED" },
  ];

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Providers</h1>

      <div className="space-y-3">
        {providers.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/providers/${p.id}`)}
            className="p-4 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800"
          >
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-gray-400">{p.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}