import type { BookingDetails } from "../types/booking";

export const bookingData: BookingDetails = {
  id: "BK12345",
  status: "PENDING",
  date: "20 Apr 2026",
  time: "10:00 AM",
  service: "AC Repair",
  amount: 1200,

  customer: {
    name: "Rahul Sharma",
    phone: "9876543210",
    address: "Delhi, India",
  },

  provider: {
    name: "Amit Technician",
    phone: "9999999999",
    rating: 4.5,
    assignedDate: "20 Apr 2026",
  },

  payment: {
    method: "UPI",
    status: "PAID",
    transactionId: "TXN123456",
  },
};