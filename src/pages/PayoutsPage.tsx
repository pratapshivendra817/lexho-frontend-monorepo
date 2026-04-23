import StatCard from "../components/StatCard";
import PayoutTable from "../components/PayoutTable";
import { payoutData } from "../data/payoutData";

export default function PayoutsPage() {
  const total = payoutData.reduce((sum, p) => sum + p.finalPayout, 0);
  const pending = payoutData
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.finalPayout, 0);
  const failed = payoutData.filter((p) => p.status === "FAILED").length;

  const exportCSV = () => {
    const headers = [
      "Provider",
      "Earnings",
      "Platform Fee",
      "Final Payout",
      "Status",
    ];

    const rows = payoutData.map((p) => [
      p.providerName,
      p.earnings,
      p.platformFee,
      p.finalPayout,
      p.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "payouts.csv";
    link.click();
  };

  return (
    <div className="p-6 text-white bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Provider Payouts</h1>

        <button
          onClick={exportCSV}
          className="bg-green-600 px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Payout" value={`₹${total}`} />
        <StatCard title="Pending Payout" value={`₹${pending}`} />
        <StatCard title="Failed Transactions" value={`${failed}`} />
      </div>

      {/* Table */}
      <PayoutTable data={payoutData} />
    </div>
  );
}