import type { BookingDetails } from "../types/booking";

export default function ProviderDetailsCard({
  booking,
}: {
  booking: BookingDetails;
}) {
  return (
    <div className="bg-gray-900 p-5 rounded-2xl shadow">
      <h3 className="font-semibold mb-3">Provider Details</h3>

      <p>{booking.provider.name}</p>
      <p className="text-gray-400">📞 {booking.provider.phone}</p>
      <p className="text-yellow-400">⭐ {booking.provider.rating}</p>
      <p className="text-gray-400 mt-2">
        Assigned: {booking.provider.assignedDate}
      </p>
    </div>
  );
}