// components/user/BookingHistoryTable.tsx
//import { Booking } from "../types/user";
import type { Booking } from "../../types/user";

export default function BookingHistoryTable({ data }: { data: Booking[] }) {
  return (
    <div className="bg-[#020617] p-5 rounded-xl">
      <h2 className="mb-4 font-semibold">Booking History</h2>

      <table className="w-full text-sm">
        <thead className="text-gray-400">
          <tr>
            <th>ID</th>
            <th>Service</th>
            <th>Date</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {data.map((b) => (
            <tr key={b.id} className="border-t border-gray-700">
              <td>{b.id}</td>
              <td>{b.service}</td>
              <td>{b.date}</td>
              <td>{b.status}</td>
              <td>₹{b.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}