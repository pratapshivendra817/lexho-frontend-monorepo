import { z } from "zod";

export const sendNotificationSchema = z.object({
  title: z.string().min(2, "Title is required"),
  message: z.string().min(5, "Message is required"),
  notificationType: z.string().min(1, "Notification type is required"),
  priority: z.string().min(1, "Priority is required"),
  channels: z.array(z.string().min(1)).min(1, "At least one channel is required"),
  targetUserType: z.string().min(1, "Target user type is required"),
  userIds: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  redirectType: z.string().optional(),
  redirectValue: z.string().optional(),
  city: z.string().optional(),
  scheduledTime: z.string().optional(),
});

export type SendNotificationFormValues = z.infer<typeof sendNotificationSchema>;
