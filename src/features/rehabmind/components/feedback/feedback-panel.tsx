"use client";

import { useMemo, useState } from "react";
import {
  buildPilotFeedbackLocations,
  feedbackSubmissionErrorMessage,
  feedbackLocationKey,
  isCurrentPilotFeedbackLocation,
  PILOT_FEEDBACK_KINDS,
  type PilotFeedbackDraft,
  type PilotFeedbackLocation,
  type PilotFeedbackStageOption,
} from "@/src/infrastructure/pilot/feedback/feedback-context";

function feedbackLocationLabel(location: PilotFeedbackLocation, stages: PilotFeedbackStageOption[]) {
  if (location.sessionNumber === null) return "暂不确定具体环节";
  return `第${location.sessionNumber}次 · ${stages.find((stage) => stage.key === location.stage)?.label ?? location.stage}`;
}

type PilotFeedbackPanelProps = {
  open: boolean;
  currentLocation: {
    sessionNumber: number;
    stage: string;
  };
  sessions: number[];
  stages: PilotFeedbackStageOption[];
  currentEventId?: string | null;
  onClose: () => void;
  onSubmit: (draft: PilotFeedbackDraft) => Promise<void>;
};

export function PilotFeedbackPanel({
  open,
  currentLocation,
  sessions,
  stages,
  currentEventId,
  onClose,
  onSubmit,
}: PilotFeedbackPanelProps) {
  const locations = useMemo(() => buildPilotFeedbackLocations({
    currentSessionNumber: currentLocation.sessionNumber,
    currentStage: currentLocation.stage,
    sessions,
    stages,
  }), [currentLocation.sessionNumber, currentLocation.stage, sessions, stages]);
  const [locationKey, setLocationKey] = useState(() => feedbackLocationKey(currentLocation));
  const [kind, setKind] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const selectedLocation = locations.find((item) => feedbackLocationKey(item) === locationKey) ?? currentLocation;
  const locationIsCurrent = isCurrentPilotFeedbackLocation(selectedLocation, currentLocation);

  async function submit() {
    if (!kind || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...selectedLocation,
        kind,
        message: message.trim(),
        eventId: locationIsCurrent ? currentEventId ?? null : null,
      });
      setKind("");
      setMessage("");
      onClose();
    } catch (submissionError) {
      setError(feedbackSubmissionErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="rm-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="rm-feedback-modal" role="dialog" aria-modal="true" aria-label="问题反馈" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div><span>帮助我们定位流程问题</span><h2>问题反馈</h2></div>
        <button type="button" onClick={onClose}>关闭</button>
      </header>
      <div className="rm-feedback-context">
        <label>反馈哪个环节？
          <select value={locationKey} onChange={(event) => setLocationKey(event.target.value)}>
            {locations.map((location) => <option key={feedbackLocationKey(location)} value={feedbackLocationKey(location)}>
              {feedbackLocationLabel(location, stages)}
            </option>)}
          </select>
        </label>
      </div>
      <div className="rm-feedback-kinds" aria-label="问题类型">
        {PILOT_FEEDBACK_KINDS.map((item) => <button type="button" key={item} className={kind === item ? "is-selected" : ""} onClick={() => setKind(item)}>{item}</button>)}
      </div>
      <label className="rm-feedback-message">补充说明（可选）
        <textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="请描述你遇到的情况" />
      </label>
      {error ? <p className="rm-feedback-error" role="alert">{error}</p> : null}
      <footer>
        <button type="button" onClick={onClose}>取消</button>
        <button type="button" className="rm-primary" disabled={!kind || submitting} onClick={() => void submit()}>{submitting ? "提交中" : "提交反馈"}</button>
      </footer>
    </section>
  </div>;
}
