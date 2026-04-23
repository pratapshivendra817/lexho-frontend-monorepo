import type { BookingDetails } from "../types/booking";

export default function CustomerDetailsCard({
  booking,
}: {
  booking: BookingDetails;
}) {
  return (
    <div className="bg-gray-900 p-5 rounded-2xl shadow">
      <h3 className="font-semibold mb-3">Customer Details</h3>

      <p>{booking.customer.name}</p>
      <p className="text-gray-400">{booking.customer.phone}</p>
      <p className="text-gray-400 mb-4">
        {booking.customer.address}
      </p>

      <div className="h-32 bg-gray-800 rounded flex items-center justify-center text-gray-500">
        Map Placeholder
      </div>
    </div>
  );
}