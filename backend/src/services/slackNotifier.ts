import { prisma } from "../db/prisma";

/**
 * Sends a Slack message the moment a sender's hourly limit is hit.
 * If the owning user hasn't connected Slack, this is a silent no-op
 * (no crash, no throw) — and once they connect later, notifications
 * start working immediately with no redeploy since we look the token
 * up fresh from the DB on every call.
 */
export async function notifyRateLimitHit(params: {
  userId: string | null;
  senderName: string;
  hourKey: string;
  limit: number;
}) {
  if (!params.userId) return;

  const connection = await prisma.slackConnection.findUnique({
    where: { userId: params.userId },
  });

  if (!connection) {
    // Not connected — nothing to do, and this must never crash the worker.
    return;
  }

  const text = `:rotating_light: Rate limit hit for sender *${params.senderName}* — ${params.limit} emails/hour reached during window ${params.hourKey}. Remaining emails have been rescheduled to the next hour.`;

  try {
    if (connection.webhookUrl) {
      await fetch(connection.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } else if (connection.channelId) {
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: JSON.stringify({ channel: connection.channelId, text }),
      });
    }
  } catch (err) {
    // Notification failures should never break the email pipeline.
    console.error("[slack] failed to send rate-limit notification:", err);
  }
}
