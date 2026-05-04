import { z } from "zod";

export const sendNotificationSchema = z.object({
  title: z.string().min(2, "Title is required"),
  message: z.string().min(5, "Message is required"),
  notificationType: z.string().min(1, "Notification type is required"),
  channelType: z.string().min(1, "Channel is required"),
  userType: z.string().min(1, "User type is required"),
  city: z.string().optional(),
  service: z.string().optional(),
  scheduleTime: z.string().optional(),
});

export type SendNotificationFormValues = z.infer<typeof sendNotificationSchema>;
