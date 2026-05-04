import { z } from "zod";

export const providerNotificationIdSchema = z.string().min(1, "Notification id is required");
