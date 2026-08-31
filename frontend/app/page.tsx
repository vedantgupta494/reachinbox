"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { EmailTable } from "@/components/EmailTable";
import { ComposeModal } from "@/components/ComposeModal";
import { fetchScheduledEmails, fetchSentEmails, fetchSenders } from "@/lib/api";
import type { EmailRecord, Sender } from "@/types";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<EmailRecord[]>([]);
  const [sent, setSent] = useState<EmailRecord[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduledData, sentData, sendersData] = await Promise.all([
        fetchScheduledEmails(),
        fetchSentEmails(),
        fetchSenders(),
      ]);
      setScheduled(scheduledData);
      setSent(sentData);
      setSenders(sendersData);
    } catch (err) {
      console.error("Failed to load emails", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-canvas">
      <Header user={null} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">Email scheduler</h1>
            <p className="text-sm text-muted">Schedule sends and track delivery in real time.</p>
          </div>
          <Button onClick={() => setComposeOpen(true)}>Compose new email</Button>
        </div>

        <div className="mb-4 flex gap-1 border-b border-border">
          {(["scheduled", "sent"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`focus-ring border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t === "scheduled" ? `Scheduled (${scheduled.length})` : `Sent (${sent.length})`}
            </button>
          ))}
        </div>

        <EmailTable
          emails={tab === "scheduled" ? scheduled : sent}
          loading={loading}
          mode={tab}
        />
      </main>

      {composeOpen && (
        <ComposeModal
          senders={senders}
          onClose={() => setComposeOpen(false)}
          onScheduled={load}
        />
      )}
    </div>
  );
}
