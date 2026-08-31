import { Router } from "express";
import { prisma } from "../db/prisma";
import { enqueueEmailJob } from "../queues/emailQueue";
import { scheduleEmailSchema } from "../utils/validation";
import { searchEmails } from "../services/searchIndex";

export const emailRoutes = Router();

/** GET /api/emails/senders — list configured senders for the compose form */
emailRoutes.get("/senders", async (_req, res) => {
  const senders = await prisma.sender.findMany({ orderBy: { name: "asc" } });
  res.json(senders);
});

/**
 * POST /api/emails/schedule
 * Accepts one email (single recipient) OR a batch (multiple recipients,
 * e.g. from an uploaded CSV of leads). Each recipient becomes its own
 * Email row + its own BullMQ delayed job, spaced out by
 * delayBetweenEmailsMs so we honor per-email throttling even for a
 * single large batch of 1000+ leads.
 */
emailRoutes.post("/schedule", async (req, res) => {
  const parsed = scheduleEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { subject, body, recipients, senderId, startTime, delayBetweenEmailsMs } =
    parsed.data;

  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) {
    return res.status(404).json({ error: "sender not found" });
  }

  const start = new Date(startTime);
  const created = [];

  // Stagger each recipient's scheduledAt by delayBetweenEmailsMs. BullMQ's
  // delayed-job mechanism (not cron) fires each one independently, and
  // idempotency is enforced later at the worker level via jobId = emailId.
  for (let i = 0; i < recipients.length; i++) {
    const scheduledAt = new Date(start.getTime() + i * delayBetweenEmailsMs);

    const email = await prisma.email.create({
      data: {
        subject,
        body,
        recipient: recipients[i],
        senderId,
        scheduledAt,
        status: "SCHEDULED",
      },
    });

    const job = await enqueueEmailJob(email.id, scheduledAt);

    await prisma.email.update({
      where: { id: email.id },
      data: { jobId: job.id },
    });

    created.push(email);
  }

  res.status(201).json({ scheduled: created.length, emails: created });
});

/** GET /api/emails/scheduled */
emailRoutes.get("/scheduled", async (req, res) => {
  const emails = await prisma.email.findMany({
    where: { status: { in: ["PENDING", "SCHEDULED", "RATE_LIMITED"] } },
    orderBy: { scheduledAt: "asc" },
    include: { sender: true },
  });
  res.json(emails);
});

/** GET /api/emails/sent */
emailRoutes.get("/sent", async (req, res) => {
  const emails = await prisma.email.findMany({
    where: { status: { in: ["SENT", "FAILED"] } },
    orderBy: { sentAt: "desc" },
    include: { sender: true },
  });
  res.json(emails);
});

/** GET /api/emails/search?q=... */
emailRoutes.get("/search", async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (!q.trim()) return res.json([]);
  const results = await searchEmails(q);
  res.json(results);
});
