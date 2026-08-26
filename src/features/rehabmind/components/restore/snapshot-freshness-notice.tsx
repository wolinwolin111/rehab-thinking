"use client";

import { useState } from "react";
import { formatSnapshotAge, type SnapshotFreshness } from "@/src/domain/rehab/followup/snapshot-freshness-core";
import { useDialogAccessibility } from "@/src/features/rehabmind/components/shared/use-dialog-accessibility";

export function SnapshotFreshnessBanner({
  freshness,
  reconfirmed,
  onReconfirm,
  onReviewIntake,
}: {
  freshness: SnapshotFreshness;
  reconfirmed: boolean;
  onReconfirm: () => void;
  onReviewIntake: () => void;
}) {
  if (!freshness.showReminder) return null;
  const ageText = formatSnapshotAge(freshness);
  const required = freshness.requiresReconfirmation && !reconfirmed;
  const strongReminder = freshness.band === "very-stale" || freshness.band === "unknown";
  return <section className={`rm-snapshot-freshness ${required ? "is-blocking" : strongReminder ? "is-strong" : "is-reminder"}`} role={required ? "alert" : "status"} aria-live="polite">
    <div>
      <span>{required ? "继续前先更新情况" : "恢复记录提醒"}</span>
      <strong>{freshness.band === "unknown" ? "暂时无法确定距上次保存多久" : `距上次记录已过去${ageText}`}</strong>
      <p>{required
        ? "原来的答案不会被改写，但急性或时间敏感情况可能已经变化。请重新确认当前症状、安全信号和发生时间。"
        : freshness.band === "very-stale"
          ? "这份记录已超过7天，建议先回看当前症状和安全信号；确认后再决定是否继续。"
          : "当前状态可能已经变化。原来的答案会保留不动，建议先回看再继续。"}</p>
      {reconfirmed ? <small>本次已重新确认当前情况；如有变化，请先修改症状信息。</small> : null}
    </div>
    {required
      ? <button type="button" className="rm-primary" onClick={onReconfirm}>重新确认后继续</button>
      : <button type="button" onClick={onReviewIntake}>回看当前情况</button>}
  </section>;
}

export function SnapshotFreshnessReconfirmationDialog({
  open,
  ageText,
  onClose,
  onReviewIntake,
  onReviewSafety,
  onConfirm,
}: {
  open: boolean;
  ageText: string;
  onClose: () => void;
  onReviewIntake: () => void;
  onReviewSafety: () => void;
  onConfirm: () => void;
}) {
  const [symptomsConfirmed, setSymptomsConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [onsetConfirmed, setOnsetConfirmed] = useState(false);
  const dialogRef = useDialogAccessibility({ open, onClose });

  if (!open) return null;
  const ready = symptomsConfirmed && safetyConfirmed && onsetConfirmed;
  return <div className="rm-snapshot-freshness-backdrop" role="presentation" onMouseDown={onClose}>
    <section ref={dialogRef} className="rm-snapshot-freshness-dialog" role="dialog" aria-modal="true" aria-labelledby="rm-snapshot-freshness-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <span>恢复前确认</span>
        <h2 id="rm-snapshot-freshness-title">这份记录距上次保存已过去{ageText}</h2>
      </header>
      <p>原来的答案和历史记录会保留。因为时间敏感情况可能已经变化，请先核对下面三件事，再进入普通评估、处理或训练。</p>
      <div className="rm-snapshot-freshness-links">
        <button type="button" onClick={onReviewIntake}>先回到症状信息修改</button>
        <button type="button" onClick={onReviewSafety}>先重新确认安全信号</button>
      </div>
      <div className="rm-snapshot-freshness-checks">
        <label><input type="checkbox" checked={symptomsConfirmed} onChange={(event) => setSymptomsConfirmed(event.target.checked)} />我已重新确认当前症状和活动受影响情况</label>
        <label><input type="checkbox" checked={safetyConfirmed} onChange={(event) => setSafetyConfirmed(event.target.checked)} />我已重新确认当前安全信号，包括有没有新的明显加重</label>
        <label><input type="checkbox" checked={onsetConfirmed} onChange={(event) => setOnsetConfirmed(event.target.checked)} />我已重新确认发生时间；有变化时已先修改症状信息</label>
      </div>
      <footer>
        <button type="button" onClick={onClose}>稍后再确认</button>
        <button type="button" className="rm-primary" disabled={!ready} onClick={onConfirm}>确认当前情况并继续</button>
      </footer>
    </section>
  </div>;
}
