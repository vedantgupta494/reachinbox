import type { EmailStatus } from "@/types";

const statusConfig: Record<EmailStatus, { label: string; text: string; bg: string }> = {
  SENT: { label: "Sent", text: "text-status-sent", bg: "bg-status-sentSoft" },
  SCHEDULED: { label: "Scheduled", text: "text-status-scheduled", bg: "bg-status-scheduledSoft" },
  PENDING: { label: "Pending", text: "text-status-scheduled", bg: "bg-status-scheduledSoft" },
  RATE_LIMITED: { label: "Delayed — rate limit", text: "text-status-limited", bg: "bg-status-limitedSoft" },
  FAILED: { label: "Failed", text: "text-status-failed", bg: "bg-status-failedSoft" },
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium ${config.text} ${config.bg}`}>
      {config.label}
    </span>
  );
}
