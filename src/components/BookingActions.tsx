export default function BookingActions() {
  return (
    <div className="flex gap-3 mt-4">
      <button className="bg-red-600 px-4 py-2 rounded">
        Cancel Booking
      </button>

      <button className="bg-yellow-500 px-4 py-2 rounded">
        Reassign Provider
      </button>

      <button className="bg-green-600 px-4 py-2 rounded">
        Mark Completed
      </button>
    </div>
  );
}