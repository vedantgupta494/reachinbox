export type EmailStatus = "PENDING" | "SCHEDULED" | "SENT" | "FAILED" | "RATE_LIMITED";

export interface Sender {
  id: string;
  name: string;
  emailAddress: string;
  maxEmailsPerHour: number;
  minDelayBetweenSendMs: number;
}

export interface EmailRecord {
  id: string;
  subject: string;
  body: string;
  recipient: string;
  senderId: string;
  sender: Sender;
  scheduledAt: string;
  status: EmailStatus;
  sentAt: string | null;
  failReason: string | null;
  attempts: number;
}

export interface CurrentUser {
  name: string;
  email: string;
  avatarUrl?: string;
}
