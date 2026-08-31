import { z } from "zod";

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, "subject is required"),
  body: z.string().min(1, "body is required"),
  recipients: z
    .array(z.string().email())
    .min(1, "at least one recipient is required"),
  senderId: z.string().uuid(),
  startTime: z.string().datetime({ offset: true }), // ISO string — when the FIRST email should go out (accepts any timezone offset, e.g. +05:30 for IST)
  delayBetweenEmailsMs: z.number().int().min(0).default(2000),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
