import type { BookingDetails, BookingStatus } from "../types/booking";

export default function BookingSummaryCard({
  booking,
}: {
  booking: BookingDetails;
}) {
  const statusColor: Record<BookingStatus, string> = {
    PENDING: "bg-yellow-500",
    CONFIRMED: "bg-blue-500",
    COMPLETED: "bg-green-600",
    CANCELLED: "bg-red-600",
  };

  return (
    <div className="bg-gray-900 p-5 rounded-2xl shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">
          Booking #{booking.id}
        </h2>

        <span
          className={`px-3 py-1 text-sm rounded ${
            statusColor[booking.status]
          }`}
        >
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Date</p>
          <p>{booking.date}</p>
        </div>
        <div>
          <p className="text-gray-400">Time</p>
          <p>{booking.time}</p>
        </div>
        <div>
          <p className="text-gray-400">Service</p>
          <p>{booking.service}</p>
        </div>
        <div>
          <p className="text-gray-400">Amount</p>
          <p>₹{booking.amount}</p>
        </div>
      </div>
    </div>
  );
}