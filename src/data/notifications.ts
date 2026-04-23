// src/data/notifications.ts
import type { Notification } from "../types/notification";

export const notificationsData: Notification[] = [
  {
    id: "NTF001",
    title: "Welcome Offer",
    type: "PUSH",
    audience: "All Users",
    status: "SENT",
    date: "21 Apr 2026",
  },
  {
    id: "NTF002",
    title: "Payment Reminder",
    type: "SMS",
    audience: "Pending Users",
    status: "FAILED",
    date: "20 Apr 2026",
  },
  {
    id: "NTF003",
    title: "New Feature Launch",
    type: "EMAIL",
    audience: "Active Users",
    status: "SENT",
    date: "19 Apr 2026",
  },
];