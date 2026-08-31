import type { EmailRecord, Sender } from "@/types";

// All calls go through the Next.js rewrite (/backend/*) which proxies to
// the Express server, so there's no CORS to manage in dev.
const BASE = "/backend";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchScheduledEmails(): Promise<EmailRecord[]> {
  const res = await fetch(`${BASE}/api/emails/scheduled`, { cache: "no-store" });
  return handle<EmailRecord[]>(res);
}

export async function fetchSenders(): Promise<Sender[]> {
  const res = await fetch(`${BASE}/api/emails/senders`, { cache: "no-store" });
  return handle<Sender[]>(res);
}

export async function fetchSentEmails(): Promise<EmailRecord[]> {
  const res = await fetch(`${BASE}/api/emails/sent`, { cache: "no-store" });
  return handle<EmailRecord[]>(res);
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  senderId: string;
  startTime: string;
  delayBetweenEmailsMs: number;
}

export async function scheduleEmail(payload: ScheduleEmailPayload) {
  const res = await fetch(`${BASE}/api/emails/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ scheduled: number; emails: EmailRecord[] }>(res);
}
