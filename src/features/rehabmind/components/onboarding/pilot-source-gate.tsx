"use client";

import { useState } from "react";
import {
  PILOT_SOURCE_DETAIL_MAX_LENGTH,
  PILOT_SOURCE_OPTIONS,
  type PilotSourceChannel,
  type PilotSourceRecord,
} from "@/src/infrastructure/pilot/onboarding/source-channel";

export function PilotSourceGate({ open, onContinue }: { open: boolean; onContinue: (source: PilotSourceRecord) => void }) {
  const [channel, setChannel] = useState<PilotSourceChannel | "">("");
  const [detail, setDetail] = useState("");
  if (!open) return null;

  return (
    <div className="rm-entry-sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="rm-source-title">
      <section className="rm-entry-sheet rm-source-gate">
        <header><span>开始前</span><h1 id="rm-source-title">你从哪里了解到我们？</h1></header>
        <div className="rm-source-options">
          {PILOT_SOURCE_OPTIONS.map((option) => (
            <label key={option.value} className={channel === option.value ? "is-selected" : ""}>
              <input type="radio" name="pilot-source" value={option.value} checked={channel === option.value} onChange={() => setChannel(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {channel === "other" ? (
          <label className="rm-source-detail">
            <span>请补充来源（选填）</span>
            <input value={detail} maxLength={PILOT_SOURCE_DETAIL_MAX_LENGTH} onChange={(event) => setDetail(event.target.value)} />
          </label>
        ) : null}
        <footer>
          <button type="button" className="rm-primary" disabled={!channel} onClick={() => channel && onContinue({ channel, detail: channel === "other" ? detail.trim() || null : null })}>继续</button>
        </footer>
      </section>
    </div>
  );
}
