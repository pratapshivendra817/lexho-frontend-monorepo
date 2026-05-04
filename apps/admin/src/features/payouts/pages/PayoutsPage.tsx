import { useQuery } from "@tanstack/react-query";

import { fetchPayouts } from "@/api/admin";
import { PayoutTable, StatCard } from "../components";

export default function PayoutsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payouts"],
    queryFn: fetchPayouts,
    retry: false,
  });

  const payouts = data ?? [];

  const total = payouts.reduce((sum, p) => sum + p.finalPayout, 0);
  const pending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.finalPayout, 0);
  const failed = payouts.filter((p) => p.status === "FAILED").length;

  const exportCSV = () => {
    const headers = ["Provider", "Earnings", "Platform Fee", "Final Payout", "Status"];

    const rows = payouts.map((p) => [p.providerName, p.earnings, p.platformFee, p.finalPayout, p.status]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "payouts.csv";
    link.click();
  };

  return (
    <div className="p-6 text-white bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Provider Payouts</h1>

        <button onClick={exportCSV} className="bg-green-600 px-4 py-2 rounded-lg text-sm hover:bg-green-700">
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-300">Loading payouts...</div>
      ) : isError ? (
        <div className="space-y-3">
          <div className="text-red-300">Failed to load payouts.</div>
          <button type="button" onClick={() => void refetch()} className="px-3 py-1 bg-red-600 rounded">
            Retry
          </button>
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-gray-400">No payouts found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Payout" value={`INR ${total}`} />
            <StatCard title="Pending Payout" value={`INR ${pending}`} />
            <StatCard title="Failed Transactions" value={`${failed}`} />
          </div>

          <PayoutTable data={payouts} />
        </>
      )}
    </div>
  );
}

