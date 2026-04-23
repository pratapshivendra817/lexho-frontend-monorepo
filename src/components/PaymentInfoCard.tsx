import type { BookingDetails } from "../types/booking";

export default function PaymentInfoCard({
  booking,
}: {
  booking: BookingDetails;
}) {
  return (
    <div className="bg-gray-900 p-5 rounded-2xl shadow">
      <h3 className="font-semibold mb-3">Payment Info</h3>

      <p>Method: {booking.payment.method}</p>
      <p>Status: {booking.payment.status}</p>
      <p className="text-gray-400">
        TXN: {booking.payment.transactionId}
      </p>
    </div>
  );
}