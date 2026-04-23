// data/activityData.ts
import type { ActivityLog } from "../types/activity";

export const activityData: ActivityLog[] = [
  {
    id: "1",
    adminName: "Shivendra",
    role: "Super Admin",
    action: "Deleted user account",
    module: "User",
    timestamp: "2026-04-21 10:30 AM",
  },
  {
    id: "2",
    adminName: "Amit",
    role: "Support",
    action: "Updated booking status",
    module: "Booking",
    timestamp: "2026-04-21 11:00 AM",
  },
  {
    id: "3",
    adminName: "Neha",
    role: "Finance",
    action: "Processed refund",
    module: "Payment",
    timestamp: "2026-04-20 06:45 PM",
  },
];