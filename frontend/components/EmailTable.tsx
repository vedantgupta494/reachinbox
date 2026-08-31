import type { EmailRecord } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, LoadingRows } from "./EmptyState";

interface EmailTableProps {
  emails: EmailRecord[];
  loading: boolean;
  mode: "scheduled" | "sent";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailTable({ emails, loading, mode }: EmailTableProps) {
  if (loading) return <LoadingRows />;

  if (emails.length === 0) {
    return mode === "scheduled" ? (
      <EmptyState
        title="Nothing scheduled"
        description="Compose an email to queue your first send."
      />
    ) : (
      <EmptyState
        title="No sends yet"
        description="Sent and failed emails will show up here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-canvas text-xs font-medium uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Recipient</th>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">{mode === "scheduled" ? "Scheduled for" : "Sent at"}</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
              <td className="px-4 py-3 font-mono text-xs text-ink">{email.recipient}</td>
              <td className="px-4 py-3 text-ink">{email.subject}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">
                {formatDate(mode === "scheduled" ? email.scheduledAt : email.sentAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={email.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
