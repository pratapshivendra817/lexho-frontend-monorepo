// src/types/user.ts

export type Role = "CUSTOMER" | "PROVIDER";
export type Status = "ACTIVE" | "BLOCKED";

export interface Booking {
  id: string;
  service: string;
  date: string;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  amount: number;
}

export interface Activity {
  id: string;
  action: string;
  date: string;
}

export interface User {
  id: string; // ✅ FIXED (no 'any')

  name: string;
  phone: string;
  email: string;

  role: Role;
  status: Status;

  stats: {
    totalBookings: number;
    totalSpend: number;
    lastActivity: string;
  };

  bookings: Booking[];
  activities: Activity[];
}

  export interface UsersResponse {
  data: User[];
  total: number;
}
