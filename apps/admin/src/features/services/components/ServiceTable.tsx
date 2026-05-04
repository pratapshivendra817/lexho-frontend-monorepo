import React from "react";
import type { Service } from "@/types/service";

interface Props {
  data: Service[];
}

const ServiceTable: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-[#020617] rounded-2xl p-5 shadow-lg">
      
      <h2 className="text-lg font-semibold mb-4">
        ⭐ Top Services by Bookings
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="bg-cyan-700 text-left">
              <th className="p-3">Service Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Rating</th>
              <th>Total Bookings</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 hover:bg-[#0f172a] transition"
              >
                <td className="p-3">{item.name}</td>
                <td>{item.category}</td>
                <td>₹{item.price}</td>
                <td>⭐ {item.rating}</td>
                <td>{item.bookings}</td>

                <td>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === "Active"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                <td>
                  <button className="px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90">
                    Edit / Toggle
                  </button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
};

export default ServiceTable;