import { buildCapabilitySnapshotId } from "@/src/domain/rehab/intake/workflow-profile-core";

export type SpecialTestResult = "negative" | "positive" | "painful-indeterminate" | "not-tested" | "stopped";
export type FamiliarSymptom = "yes" | "no" | "unsure" | "not-applicable";
export type SpecialStopReason = "pain" | "fear" | "cannot-perform" | "safety-signal" | "equipment" | "other";

export type SpecialTestRecord = {
  specialTestRecordId: string;
  assessmentId: string;
  triggerSnapshot: { ruleId: string; matchedEvidenceIds: string[] };
  operationTarget: "self" | "other" | "study";
  capabilitySnapshotId: string;
  result: SpecialTestResult;
  familiarSymptom: FamiliarSymptom;
  stopReason?: SpecialStopReason;
  note?: string;
  recordedAt: string;
};

export type SpecialAssessmentDescriptor = { id: string; trigger?: string };

export type SpecialSnapshotInput = {
  sessionId?: string;
  assessmentRevision?: number;
  operationTarget?: "self" | "other" | "study";
  capabilities?: Record<string, boolean>;
  description?: string;
  location?: string;
  sensoryLocation?: string;
  sensoryLocations?: Array<{ side?: string; areaId?: string; location?: string; regionId?: string }>;
  symptomType?: string;
  mechanism?: string;
  provocationTypes?: string[];
  forceDirection?: string;
  assessmentResults?: Record<string, { simple?: string; familiarSymptom?: FamiliarSymptom; unableReason?: string; note?: string }>;
};

function matchedEvidenceIds(trigger: string | undefined, input: SpecialSnapshotInput) {
  const source: Array<[string, string]> = [
    ["description", input.description ?? ""],
    ["location", input.location ?? ""],
    ["sensoryLocation", [input.sensoryLocation, ...(input.sensoryLocations ?? []).map((item) => item.location)].filter(Boolean).join(" ")],
    ["symptomType", input.symptomType ?? ""],
    ["mechanism", input.mechanism ?? ""],
    ["provocationTypes", (input.provocationTypes ?? []).join(" ")],
    ["forceDirection", input.forceDirection ?? ""],
  ];
  const parts = trigger?.split(/[、，；。或与时后伴]/).map((part) => part.trim()).filter((part) => part.length >= 2) ?? [];
  return source.filter(([, value]) => parts.length === 0 ? value.trim() : parts.some((part) => value.includes(part))).map(([id]) => id);
}

function resultFromAnswer(answer: string | undefined, unableReason: string | undefined): { result: SpecialTestResult; stopReason?: SpecialStopReason } {
  if (answer === "positive") return { result: "positive" };
  if (answer === "normal") return { result: "negative" };
  if (answer === "painful") return { result: "painful-indeterminate", stopReason: "pain" };
  if (answer === "unable") {
    const stopReason: SpecialStopReason = unableReason === "pain" ? "pain" : unableReason === "fear" ? "fear" : unableReason === "safety-signal" ? "safety-signal" : "cannot-perform";
    return { result: stopReason === "pain" ? "painful-indeterminate" : "stopped", stopReason };
  }
  return { result: "not-tested" };
}

/** Preserve why a special test existed and how it ended; skip is never negative. */
export function buildSpecialTestRecords(input: SpecialSnapshotInput, descriptors: SpecialAssessmentDescriptor[], recordedAt = new Date().toISOString()): SpecialTestRecord[] {
  const sessionId = input.sessionId ?? "legacy-session";
  const revision = input.assessmentRevision ?? 0;
  const operationTarget = input.operationTarget ?? "self";
  const capabilitySnapshotId = buildCapabilitySnapshotId(sessionId, revision, operationTarget, input.capabilities);
  return descriptors.flatMap((descriptor) => {
    const assessmentId = descriptor.id.startsWith("special:") ? descriptor.id : `special:${descriptor.id}`;
    const record = input.assessmentResults?.[assessmentId];
    if (!record) return [];
    const result = resultFromAnswer(record.simple, record.unableReason);
    return [{
      specialTestRecordId: `special:${sessionId}:${assessmentId}:${revision}:${result.result}`,
      assessmentId,
      triggerSnapshot: { ruleId: descriptor.trigger ? `trigger:${descriptor.trigger}` : `trigger:${assessmentId}`, matchedEvidenceIds: matchedEvidenceIds(descriptor.trigger, input) },
      operationTarget,
      capabilitySnapshotId,
      result: result.result,
      familiarSymptom: result.result === "positive" || result.result === "painful-indeterminate" ? (record.familiarSymptom ?? "unsure") : "not-applicable",
      stopReason: result.stopReason,
      note: record.note,
      recordedAt,
    } satisfies SpecialTestRecord];
  });
}
