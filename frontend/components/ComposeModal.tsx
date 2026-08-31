"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "./Button";
import { scheduleEmail } from "@/lib/api";
import type { Sender } from "@/types";

interface ComposeModalProps {
  senders: Sender[];
  onClose: () => void;
  onScheduled: () => void;
}

function extractEmailsFromCsv(text: string): string[] {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const found = new Set<string>();

  for (const row of parsed.data) {
    for (const cell of row) {
      const value = String(cell).trim();
      if (emailPattern.test(value)) found.add(value);
    }
  }
  return Array.from(found);
}

export function ComposeModal({ senders, onClose, onScheduled }: ComposeModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [startTime, setStartTime] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [manualRecipient, setManualRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const emails = extractEmailsFromCsv(String(reader.result));
      setRecipients(emails);
    };
    reader.readAsText(file);
  }

  function addManualRecipient() {
    const value = manualRecipient.trim();
    if (value && !recipients.includes(value)) {
      setRecipients([...recipients, value]);
    }
    setManualRecipient("");
  }

  async function handleSubmit() {
    setError(null);

    if (!subject || !body || recipients.length === 0 || !senderId || !startTime) {
      setError("Fill in subject, body, at least one recipient, sender, and start time.");
      return;
    }

    setSubmitting(true);
    try {
      // Convert the datetime-local value (no timezone) into an ISO string
      // with the browser's local offset, so "2pm" means the user's 2pm.
      const localDate = new Date(startTime);
      await scheduleEmail({
        subject,
        body,
        recipients,
        senderId,
        startTime: localDate.toISOString(),
        delayBetweenEmailsMs: delayMs,
      });
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule emails.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">Compose new email</h2>
          <button onClick={onClose} className="focus-ring rounded-sm p-1 text-muted hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="focus-ring w-full rounded-sm border border-border px-3 py-2 text-sm"
              placeholder="Your Q3 update is ready"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Body (HTML supported)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="focus-ring w-full rounded-sm border border-border px-3 py-2 text-sm"
              placeholder="<p>Hi there...</p>"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Leads (CSV or text upload)</label>
            <div
              className="cursor-pointer rounded-sm border border-dashed border-border bg-canvas px-3 py-4 text-center text-sm text-muted hover:border-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <span className="text-ink">{fileName} — {recipients.length} email{recipients.length !== 1 ? "s" : ""} detected</span>
              ) : (
                <span>Click to upload a .csv or .txt file of email addresses</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div className="mt-2 flex gap-2">
              <input
                value={manualRecipient}
                onChange={(e) => setManualRecipient(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addManualRecipient())}
                placeholder="Or add one email address manually"
                className="focus-ring flex-1 rounded-sm border border-border px-3 py-2 text-sm"
              />
              <Button type="button" variant="secondary" onClick={addManualRecipient}>Add</Button>
            </div>

            {recipients.length > 0 && (
              <p className="mt-2 text-xs text-muted">{recipients.length} recipient{recipients.length !== 1 ? "s" : ""} ready</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Sender</label>
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="focus-ring w-full rounded-sm border border-border px-3 py-2 text-sm"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.emailAddress})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Delay between sends (ms)</label>
              <input
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="focus-ring w-full rounded-sm border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Start time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="focus-ring w-full rounded-sm border border-border px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-status-failed">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
