import { PILOT_CASE_EVENT_TYPES, parsePilotPayload, type PilotCaseEventRecord } from "./pilot-case-contracts";

export type PilotTimelineIssue = {
  code: "sequence_gap" | "duplicate_sequence" | "invalid_type" | "invalid_source" | "invalid_payload" | "time_regression";
  eventId?: string;
  sequence?: number;
  detail: string;
};

export type PilotTimelineReconstruction = {
  valid: boolean;
  events: PilotCaseEventRecord[];
  issues: PilotTimelineIssue[];
};

const SYSTEM_EVENTS = new Set(["case_created"]);
const ADMIN_EVENTS = new Set<string>();

/** Validates the append-only timeline without inferring clinical meaning from opaque payloads. */
export function reconstructPilotCaseTimeline(events: readonly PilotCaseEventRecord[]): PilotTimelineReconstruction {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence || left.occurredAt.localeCompare(right.occurredAt));
  const issues: PilotTimelineIssue[] = [];
  const seenSequences = new Set<number>();
  let previousOccurredAt = "";

  ordered.forEach((event, index) => {
    if (seenSequences.has(event.sequence)) {
      issues.push({ code: "duplicate_sequence", eventId: event.id, sequence: event.sequence, detail: "timeline sequence is duplicated" });
    }
    seenSequences.add(event.sequence);
    const expectedSequence = index + 1;
    if (event.sequence !== expectedSequence) {
      issues.push({ code: "sequence_gap", eventId: event.id, sequence: event.sequence, detail: `expected sequence ${expectedSequence}` });
    }
    if (!(PILOT_CASE_EVENT_TYPES as readonly string[]).includes(event.type)) {
      issues.push({ code: "invalid_type", eventId: event.id, sequence: event.sequence, detail: `unsupported event type ${event.type}` });
    }
    const expectedSource = SYSTEM_EVENTS.has(event.type) ? "system" : ADMIN_EVENTS.has(event.type) ? "admin" : "user";
    if (event.source !== expectedSource) {
      issues.push({ code: "invalid_source", eventId: event.id, sequence: event.sequence, detail: `${event.type} must use ${expectedSource} source` });
    }
    try {
      parsePilotPayload(event.payload, "case event");
    } catch {
      issues.push({ code: "invalid_payload", eventId: event.id, sequence: event.sequence, detail: "event payload is not a JSON object" });
    }
    if (previousOccurredAt && event.occurredAt < previousOccurredAt) {
      issues.push({ code: "time_regression", eventId: event.id, sequence: event.sequence, detail: "occurredAt moved backwards" });
    }
    previousOccurredAt = event.occurredAt;
  });

  return { valid: issues.length === 0, events: ordered, issues };
}

