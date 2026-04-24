import type { User } from "../types/user";

export const userData: User = {
    id: "USR001", 
  name: "Rahul Sharma",
  phone: "9876543210",
  email: "rahul@gmail.com",

  role: "CUSTOMER",
  status: "ACTIVE",

  stats: {
    totalBookings: 12,
    totalSpend: 8500,
    lastActivity: "21 Apr 2026",
  },

  bookings: [
    {
      id: "BK101",
      service: "AC Repair",
      date: "20 Apr",
      status: "COMPLETED",
      amount: 1200,
    },
  ],

  activities: [
    { id: "1", action: "Logged in", date: "21 Apr" },
  ],
};

