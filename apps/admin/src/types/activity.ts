// types/activity.ts
export interface ActivityLog {
  id: string;
  adminName: string;
  role: string;
  action: string;
  module: "User" | "Booking" | "Payment";
  timestamp: string;
}