import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";
import type { Email } from "@prisma/client";

export const esClient = new Client({ node: env.elasticsearch.node });

const INDEX = env.elasticsearch.emailsIndex;

export async function ensureEmailIndex() {
  const exists = await esClient.indices.exists({ index: INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          subject: { type: "text" },
          recipient: { type: "keyword" },
          status: { type: "keyword" },
          senderId: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
        },
      },
    });
    console.log(`[elasticsearch] created index "${INDEX}"`);
  }
}

export async function indexEmail(email: Email) {
  try {
    await esClient.index({
      index: INDEX,
      id: email.id,
      document: {
        subject: email.subject,
        recipient: email.recipient,
        status: email.status,
        senderId: email.senderId,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
      },
    });
  } catch (err) {
    // Search indexing is best-effort — never let it break the send pipeline.
    console.error("[elasticsearch] failed to index email:", err);
  }
}

export async function searchEmails(query: string) {
  const result = await esClient.search({
    index: INDEX,
    query: {
      multi_match: {
        query,
        fields: ["subject", "recipient"],
        fuzziness: "AUTO",
      },
    },
  });
  return result.hits.hits.map((hit) => hit._source);
}
