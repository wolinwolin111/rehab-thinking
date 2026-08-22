import {
  parsePilotPayload,
  type PilotCaseEventRecord,
  type PilotCaseFeedbackRecord,
  type PilotCaseRecord,
  type PilotCaseSnapshotRecord,
} from "./pilot-case-contracts";
import { reconstructPilotCaseTimeline } from "./pilot-timeline";

export type PublicPilotCaseRecord = Omit<PilotCaseRecord, "accessTokenHash">;
export type PublicPilotCaseSnapshot = Omit<PilotCaseSnapshotRecord, "payload"> & {
  payload: Record<string, unknown>;
};
export type PublicPilotCaseEvent = Omit<PilotCaseEventRecord, "payload"> & {
  payload: Record<string, unknown>;
};
export type PublicPilotCaseFeedback = Omit<PilotCaseFeedbackRecord, "payload"> & {
  payload: Record<string, unknown> | null;
};

export type PilotCaseView = {
  caseRecord: PublicPilotCaseRecord;
  snapshot: PublicPilotCaseSnapshot;
  events: PublicPilotCaseEvent[];
  feedback: PublicPilotCaseFeedback[];
  timeline: {
    valid: boolean;
    issues: ReturnType<typeof reconstructPilotCaseTimeline>["issues"];
  };
};

export function publicPilotCaseRecord(record: PilotCaseRecord): PublicPilotCaseRecord {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "accessTokenHash"),
  ) as PublicPilotCaseRecord;
}

export function buildPilotCaseView(
  caseRecord: PilotCaseRecord,
  snapshot: PilotCaseSnapshotRecord,
  events: PilotCaseEventRecord[],
  feedback: PilotCaseFeedbackRecord[],
): PilotCaseView {
  return {
    caseRecord: publicPilotCaseRecord(caseRecord),
    snapshot: { ...snapshot, payload: parsePilotPayload(snapshot.payload, "case snapshot") },
    events: events.map((event) => ({ ...event, payload: parsePilotPayload(event.payload, "case event") })),
    feedback: feedback.map((item) => ({
      ...item,
      payload: item.payload ? parsePilotPayload(item.payload, "case feedback") : null,
    })),
    timeline: reconstructPilotCaseTimeline(events),
  };
}
