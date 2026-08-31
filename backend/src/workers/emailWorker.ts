import { Worker, Job, DelayedError } from "bullmq";
import { redisConnection } from "../config/redis";
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from "../queues/emailQueue";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { checkAndIncrementRateLimit, nextHourBoundary } from "../services/rateLimiter";
import { sendEmail } from "../services/mailer";
import { notifyRateLimitHit } from "../services/slackNotifier";
import { indexEmail } from "../services/searchIndex";

async function processEmailJob(job: Job<EmailJobData>) {
  const { emailId } = job.data;

  // --- Idempotency guard ---
  // If this email was already sent (e.g. the worker crashed AFTER sending
  // but BEFORE BullMQ marked the job complete, and it got retried), skip.
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { sender: true },
  });

  if (!email) {
    console.warn(`[worker] email ${emailId} not found, skipping`);
    return;
  }

  if (email.status === "SENT") {
    console.log(`[worker] email ${emailId} already sent, skipping (idempotent)`);
    return;
  }

  // --- Rate limiting (per-sender, Redis-backed, safe across workers) ---
  const maxPerHour = email.sender.maxEmailsPerHour ?? env.rateLimiting.maxEmailsPerHourDefault;
  const rateResult = await checkAndIncrementRateLimit(email.senderId, maxPerHour);

  if (!rateResult.allowed) {
    // Do NOT drop or fail the job — push it into the next hour window,
    // preserving relative order via the delay.
    const nextWindow = nextHourBoundary();
    const delay = Math.max(0, nextWindow.getTime() - Date.now()) + 1000;

    await prisma.email.update({
      where: { id: emailId },
      data: { status: "RATE_LIMITED" },
    });

    await prisma.rateLimitEvent.create({
      data: {
        senderId: email.senderId,
        hourKey: rateResult.hourKey,
        count: rateResult.currentCount,
      },
    });

    await notifyRateLimitHit({
      userId: email.userId,
      senderName: email.sender.name,
      hourKey: rateResult.hourKey,
      limit: maxPerHour,
    });

    // Re-add as a fresh delayed job for the next hour. We reuse the same
    // jobId is not possible (BullMQ won't let us re-add a completed slot
    // under the current job's own lifecycle), so we throw a special
    // "delay" signal instead: BullMQ's moveToDelayed keeps it as the SAME
    // job (no duplicate), which is what we want for idempotency.
    await job.moveToDelayed(Date.now() + delay, job.token);
    throw new DelayedError(); // tells BullMQ this job was intentionally re-delayed, not failed
  }

  // --- Minimum delay between sends (throttling), per sender config ---
  const minDelay = email.sender.minDelayBetweenSendMs ?? env.rateLimiting.minDelayBetweenSendsMs;
  if (minDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, minDelay));
  }

  // --- Actually send via Ethereal ---
  try {
    const result = await sendEmail({
      from: email.sender.emailAddress,
      to: email.recipient,
      subject: email.subject,
      html: email.body,
    });

    const updated = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    await indexEmail(updated);
    console.log(`[worker] sent email ${emailId} -> ${result.previewUrl ?? "(no preview)"}`);
  } catch (err) {
    const attempts = email.attempts + 1;
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        attempts,
        failReason: err instanceof Error ? err.message : "unknown error",
      },
    });
    throw err; // let BullMQ's retry/backoff handle it
  }
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConnection,
    concurrency: env.rateLimiting.workerConcurrency,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  if (err.name === "DelayedError") {
    console.log(`[worker] job ${job?.id} deferred to next hour window`);
    return;
  }
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

console.log(
  `[worker] listening on queue "${EMAIL_QUEUE_NAME}" with concurrency ${env.rateLimiting.workerConcurrency}`
);
