import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const EMAIL_QUEUE_NAME = "email-send-queue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // Jobs are removed from Redis once completed/failed AFTER a while,
    // not immediately — keeps Bull Board useful for debugging, but caps
    // memory growth. Actual state of truth stays in Postgres.
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export interface EmailJobData {
  emailId: string; // Postgres Email.id — DB is the source of truth, not the job payload
}

/**
 * Schedules an email send as a BullMQ delayed job (NOT a cron job).
 * jobId = emailId guarantees idempotency: BullMQ will refuse to create
 * a second job with the same id, so re-running the schedule call (or a
 * retried request) can never double-enqueue the same email.
 */
export async function enqueueEmailJob(emailId: string, scheduledAt: Date) {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  const job = await emailQueue.add(
    "send-email",
    { emailId } as EmailJobData,
    {
      jobId: emailId,
      delay,
    }
  );

  return job;
}
