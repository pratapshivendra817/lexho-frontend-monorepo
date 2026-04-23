export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

// ✅ LIST PAGE
export interface BookingListItem {
  id: string;
  customerName: string;
  service: string;
  provider: string;
  date: string;
  amount: number;
  status: BookingStatus;
}

// ✅ DETAILS PAGE (THIS WAS MISSING ❌)
export interface BookingDetails {
  id: string;
  status: BookingStatus;
  date: string;
  time: string;
  service: string;
  amount: number;

  customer: {
    name: string;
    phone: string;
    address: string;
  };

  provider: {
    name: string;
    phone: string;
    rating: number;
    assignedDate: string;
  };

  payment: {
    method: string;
    status: "PAID" | "PENDING";
    transactionId: string;
  };
}