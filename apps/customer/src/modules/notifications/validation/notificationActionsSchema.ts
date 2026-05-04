import { z } from "zod";

export const notificationIdSchema = z.string().min(1, "Notification id is required");
