import { useEffect, useState } from "react";
import type { BookingListItem, BookingStatus } from "../types/booking";
import BookingStats from "../components/BookingStats";
import BookingFilters from "../components/BookingFilters";
import BookingTable from "../components/BookingTable";

const statuses: BookingStatus[] = ["PENDING","CONFIRMED","COMPLETED","CANCELLED"];

const mockData: BookingListItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `BK-${1000 + i}`,
  customerName: ["Rahul","Amit","Neha","Priya"][i % 4],
  service: ["Cleaning","Salon","Repair","Plumbing"][i % 4],
  provider: ["Vendor A","Vendor B"][i % 2],
  date: "2026-04-20",
  amount: 500 + i * 20,
  status: statuses[i % 4],
}));

export default function BookingsPage() {
  const [data, setData] = useState<BookingListItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 8;

  useEffect(() => {
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const filtered = data
    .filter(b =>
      `${b.customerName} ${b.service}`.toLowerCase().includes(search.toLowerCase())
    )
    .filter(b => (activeTab === "ALL" ? true : b.status === activeTab));

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Bookings Management</h1>

      <BookingStats data={data} />

      <BookingFilters
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {loading ? (
        <p>Loading...</p>
      ) : paginated.length === 0 ? (
        <p>No bookings found</p>
      ) : (
        <>
          <BookingTable data={paginated} />

          <div className="flex justify-between mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-slate-700 rounded"
            >
              Prev
            </button>

            <span>Page {page} / {totalPages}</span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-slate-700 rounded"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}