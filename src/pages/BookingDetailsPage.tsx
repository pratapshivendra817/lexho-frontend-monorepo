import { bookingData } from "../data/mockBooking";
import BookingSummaryCard from "../components/BookingSummaryCard";
import CustomerDetailsCard from "../components/CustomerDetailsCard";
import ProviderDetailsCard from "../components/ProviderDetailsCard";
import TimelineStepper from "../components/TimelineStepper";
import PaymentInfoCard from "../components/PaymentInfoCard";
import BookingActions from "../components/BookingActions";

export default function BookingDetailsPage() {
  return (
    <div className="p-6 text-white bg-[#0f172a] min-h-screen">
      <h1>Booking Details</h1>

      <BookingSummaryCard booking={bookingData} />

      <CustomerDetailsCard booking={bookingData} />
      <ProviderDetailsCard booking={bookingData} />

      <TimelineStepper />
      <PaymentInfoCard booking={bookingData} />

      <BookingActions />
    </div>
  );
}