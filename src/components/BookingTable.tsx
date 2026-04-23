import { useNavigate } from "react-router-dom";
import type { BookingListItem } from "../types/booking";

interface Props {
  data: BookingListItem[];
}

export default function BookingTable({ data }: Props) {
  const navigate = useNavigate();

  const getBadge = (status: string) => {
    const base = "px-2 py-1 rounded-full text-xs border";

    switch (status) {
      case "PENDING":
        return `${base} border-yellow-500 text-yellow-400`;
      case "CONFIRMED":
        return `${base} bg-blue-600 text-white`;
      case "COMPLETED":
        return `${base} bg-green-600 text-white`;
      case "CANCELLED":
        return `${base} bg-red-600 text-white`;
      default:
        return base;
    }
  };

  return (
    <div className="overflow-x-auto bg-slate-900 rounded-2xl border border-gray-700">
      <table className="w-full text-sm">
        <thead className="text-gray-400 border-b border-gray-700">
          <tr>
            {[
              "ID",
              "Customer",
              "Service",
              "Provider",
              "Date",
              "Amount",
              "Status",
              "Actions",
            ].map((h) => (
              <th key={h} className="p-3 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((b) => (
            <tr
              key={b.id}
              className="border-b border-gray-800 hover:bg-slate-800 cursor-pointer"
              onClick={() => navigate(`/bookings/${b.id}`)}
            >
              <td className="p-3">{b.id}</td>
              <td className="p-3">{b.customerName}</td>
              <td className="p-3">{b.service}</td>
              <td className="p-3">{b.provider}</td>
              <td className="p-3">{b.date}</td>
              <td className="p-3">₹{b.amount}</td>

              <td className="p-3">
                <span className={getBadge(b.status)}>
                  {b.status}
                </span>
              </td>

              <td className="p-3 flex gap-2">
                {/* VIEW */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/bookings/${b.id}`);
                  }}
                  className="border border-blue-500 px-2 py-1 rounded hover:bg-blue-600"
                >
                  View
                </button>

                {/* EDIT */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Edit", b.id);
                  }}
                  className="border border-green-500 px-2 py-1 rounded hover:bg-green-600"
                >
                  Edit
                </button>

                {/* CANCEL */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Cancel", b.id);
                  }}
                  className="border border-red-500 px-2 py-1 rounded hover:bg-red-600"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}