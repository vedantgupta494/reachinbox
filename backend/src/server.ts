import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { env } from "./config/env";
import { emailQueue } from "./queues/emailQueue";
import { emailRoutes } from "./routes/emailRoutes";
import { ensureEmailIndex } from "./services/searchIndex";

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());

// --- Live BullMQ dashboard (real-time queue visibility) ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());

// --- API routes ---
app.use("/api/emails", emailRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

async function start() {
  await ensureEmailIndex().catch((err) =>
    console.error("[startup] could not ensure ES index (is it running?):", err.message)
  );

  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] Bull Board dashboard: http://localhost:${env.port}/admin/queues`);
  });
}

start();
