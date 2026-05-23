export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

// âœ… LIST PAGE
export interface BookingListItem {
  id: string;
  customerName: string;
  service: string;
  partner: string;
  date: string;
  amount: number;
  status: BookingStatus;
}

// âœ… DETAILS PAGE (THIS WAS MISSING âŒ)
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

  partner: {
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

