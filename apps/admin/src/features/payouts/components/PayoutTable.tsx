import type { Payout } from "@/types/payout";

interface Props {
  data: Payout[];
}

export default function PayoutTable({ data }: Props) {
  const getStatusBadge = (status: string) => {
    const base = "px-2 py-1 text-xs rounded-full";

    switch (status) {
      case "PENDING":
        return `${base} bg-yellow-500/20 text-yellow-400`;
      case "SUCCESS":
        return `${base} bg-green-500/20 text-green-400`;
      case "FAILED":
        return `${base} bg-red-500/20 text-red-400`;
      default:
        return base;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-gray-400">
          <tr>
            <th className="p-3 text-left">Partner</th>
            <th className="p-3 text-left">Earnings</th>
            <th className="p-3 text-left">Platform Fee</th>
            <th className="p-3 text-left">Final Payout</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-t border-gray-800">
              <td className="p-3">{item.partnerName ?? item.providerName}</td>
              <td className="p-3">â‚¹{item.earnings}</td>
              <td className="p-3">â‚¹{item.platformFee}</td>
              <td className="p-3 font-medium text-green-400">
                â‚¹{item.finalPayout}
              </td>

              <td className="p-3">
                <span className={getStatusBadge(item.status)}>
                  {item.status}
                </span>
              </td>

              <td className="p-3 flex gap-2">
                <button className="text-xs px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">
                  Release
                </button>
                <button className="text-xs px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

