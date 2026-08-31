import type { KnowledgeEvidenceLineage } from "@/src/knowledge/rehab/knee-p0-runtime";

/** Owner-reviewed ankle-foot relations released in the P0 vertical slice. */
export const ANKLE_P0_RELATION_IDS = [
  "INF-ANKLE-DF-MOBILITY",
  "INF-ANKLE-EVERSION-MOBILITY-CONTROL",
  "INF-ANKLE-EVERSION-CONTROL",
  "INF-ANKLE-LATERAL-COLUMN-CONTROL",
] as const;

type RawMotionRecord = {
  active?: string;
  passive?: string;
  pairedStrength?: string;
  tensionLocations?: string[];
};

export type AnkleP0AssessmentRecords = Record<string, RawMotionRecord | undefined>;

export function ankleP0RecordsAfterRangeOutcomes(
  records: AnkleP0AssessmentRecords,
  rangeOutcomes: Array<Record<string, string> | undefined>,
): AnkleP0AssessmentRecords {
  const current = Object.fromEntries(Object.entries(records).map(([id, record]) => [id, record ? { ...record } : record]));
  rangeOutcomes.forEach((outcomes) => Object.entries(outcomes ?? {}).forEach(([directionId, outcome]) => {
    const assessmentId = directionId.startsWith("motion:") ? directionId : `motion:${directionId}`;
    const record = current[assessmentId] ?? {};
    if (outcome === "both-match") current[assessmentId] = { ...record, active: "same", passive: "same" };
    if (outcome === "passive-match-active-limited") current[assessmentId] = { ...record, active: "limited", passive: "same" };
    if (["better-passive-limited", "passive-limited"].includes(outcome)) current[assessmentId] = { ...record, active: "limited", passive: "limited" };
  }));
  return current;
}

const ANKLE_P0_CANDIDATE_IDS = new Set([
  "ankle-rom-calf-release",
  "ankle-rom-anterior-release",
  "ankle-rom-lateral-release",
  "ankle-rom-sagittal-joint",
  "ankle-rom-frontal-joint",
  "ankle-rom-dorsiflexion-control",
  "ankle-rom-eversion-control",
  "ankle-p0-cuboid-mobility",
  "ankle-calf-anterior-local",
  "ankle-calf-lateral-local",
  "ankle-lateral-anterior-muscles",
  "ankle-lateral-peroneal-muscles",
  "ankle-lateral-joints",
  "ankle-lateral-control",
  "ankle-df-muscles",
  "ankle-df-joint",
  "ankle-df-control",
]);

const ACTIVE_LIMITED = new Set(["limited", "left-limited", "right-limited", "both-limited"]);
const PASSIVE_LIMITED = new Set(["limited", "left-limited", "right-limited", "both-limited"]);
const PASSIVE_AVAILABLE = new Set(["same"]);

function activeLimited(record: RawMotionRecord | undefined) {
  return ACTIVE_LIMITED.has(record?.active ?? "");
}

function passiveLimited(record: RawMotionRecord | undefined) {
  return PASSIVE_LIMITED.has(record?.passive ?? "");
}

function passiveAvailable(record: RawMotionRecord | undefined) {
  return PASSIVE_AVAILABLE.has(record?.passive ?? "");
}

function controlDeficit(record: RawMotionRecord | undefined) {
  return activeLimited(record) || record?.pairedStrength === "weak";
}

function selectedTension(records: AnkleP0AssessmentRecords, pattern: RegExp) {
  return Object.values(records).some((record) => (record?.tensionLocations ?? []).some((location) => pattern.test(location)));
}

function lineage(
  relationIds: string[],
  branchId: string,
  findingIds: string[],
  retestAssessmentIds: string[],
): KnowledgeEvidenceLineage {
  return {
    relationIds,
    branchId,
    assessmentFindingIds: findingIds,
    retestAssessmentIds,
  };
}

export function isAnkleP0CandidateId(candidateId: string) {
  return ANKLE_P0_CANDIDATE_IDS.has(candidateId) || candidateId.startsWith("tension-muscle:calf-");
}

/**
 * Bind an ankle treatment to recorded findings. Location text is deliberately
 * absent from this boundary: it may open an assessment, but cannot authorize a
 * treatment or broaden its retest contract.
 */
export function ankleP0LineageForTreatment(
  candidateId: string,
  records: AnkleP0AssessmentRecords,
): KnowledgeEvidenceLineage | undefined {
  const dfExtendedId = "motion:ankle-dorsiflexion";
  const dfFlexedId = "motion:ankle-dorsiflexion-knee-flexed";
  const eversionId = "motion:ankle-eversion";
  const cuboidId = "motion:ankle-cuboid-mobility";
  const toeId = "motion:ankle-toe-flexion";
  const dfExtended = records[dfExtendedId];
  const dfFlexed = records[dfFlexedId];
  const eversion = records[eversionId];
  const cuboid = records[cuboidId];
  const toe = records[toeId];

  if (["ankle-rom-calf-release", "ankle-df-muscles"].includes(candidateId)) {
    if (!passiveLimited(dfExtended) || !passiveAvailable(dfFlexed)
      || !selectedTension(records, /小腿后侧|小腿三头肌|腓肠肌|比目鱼肌/)) return undefined;
    return lineage(["INF-ANKLE-DF-MOBILITY"], "INF-ANKLE-DF-MOBILITY:B1", [dfExtendedId, dfFlexedId], [dfExtendedId]);
  }

  if (["ankle-rom-sagittal-joint", "ankle-df-joint"].includes(candidateId)) {
    if (!passiveLimited(dfExtended) || !passiveLimited(dfFlexed)) return undefined;
    return lineage(["INF-ANKLE-DF-MOBILITY"], "INF-ANKLE-DF-MOBILITY:B2", [dfExtendedId, dfFlexedId], [dfExtendedId, dfFlexedId]);
  }

  if (["ankle-rom-dorsiflexion-control", "ankle-df-control"].includes(candidateId)) {
    const affected = [
      controlDeficit(dfExtended) && passiveAvailable(dfExtended) ? dfExtendedId : "",
      controlDeficit(dfFlexed) && passiveAvailable(dfFlexed) ? dfFlexedId : "",
    ].filter(Boolean);
    if (!affected.length) return undefined;
    return lineage(["INF-ANKLE-DF-MOBILITY", "INF-ANKLE-LATERAL-COLUMN-CONTROL"], "INF-ANKLE-DF-MOBILITY:B3", affected, affected);
  }

  if (["ankle-rom-frontal-joint", "ankle-lateral-joints"].includes(candidateId)) {
    if (!activeLimited(eversion) || !passiveLimited(eversion)) return undefined;
    return lineage(["INF-ANKLE-EVERSION-MOBILITY-CONTROL"], "INF-ANKLE-EVERSION-MOBILITY-CONTROL:B1", [eversionId], [eversionId]);
  }

  if (["ankle-rom-eversion-control", "ankle-lateral-control"].includes(candidateId)) {
    if (!controlDeficit(eversion) || !passiveAvailable(eversion)) return undefined;
    return lineage(
      ["INF-ANKLE-EVERSION-MOBILITY-CONTROL", "INF-ANKLE-EVERSION-CONTROL"],
      "INF-ANKLE-EVERSION-CONTROL:B1",
      [eversionId],
      [eversionId],
    );
  }

  if (candidateId === "ankle-p0-cuboid-mobility") {
    if (!passiveLimited(cuboid)) return undefined;
    return lineage(["INF-ANKLE-LATERAL-COLUMN-CONTROL"], "INF-ANKLE-LATERAL-COLUMN-CONTROL:B1", [cuboidId], [cuboidId]);
  }

  if (["ankle-rom-anterior-release", "ankle-calf-anterior-local", "ankle-lateral-anterior-muscles", "tension-muscle:calf-anterior"].includes(candidateId)) {
    if (!selectedTension(records, /小腿前侧|胫骨前肌|趾伸肌/)) return undefined;
    const affected = [
      activeLimited(dfExtended) ? dfExtendedId : "",
      activeLimited(dfFlexed) ? dfFlexedId : "",
      activeLimited(eversion) ? eversionId : "",
      activeLimited(toe) ? toeId : "",
    ].filter(Boolean);
    if (!affected.length) return undefined;
    return lineage(["INF-ANKLE-LATERAL-COLUMN-CONTROL"], "INF-ANKLE-LATERAL-COLUMN-CONTROL:B4", affected, affected);
  }

  if (["ankle-rom-lateral-release", "ankle-calf-lateral-local", "ankle-lateral-peroneal-muscles", "tension-muscle:calf-lateral"].includes(candidateId)) {
    if (!activeLimited(eversion) || !selectedTension(records, /小腿外侧|腓骨长肌|腓骨短肌|腓骨肌/)) return undefined;
    return lineage(
      ["INF-ANKLE-EVERSION-MOBILITY-CONTROL", "INF-ANKLE-EVERSION-CONTROL", "INF-ANKLE-LATERAL-COLUMN-CONTROL"],
      "INF-ANKLE-LATERAL-COLUMN-CONTROL:B4",
      [eversionId],
      [eversionId],
    );
  }

  if (candidateId === "tension-muscle:calf-posterior") {
    if (!passiveLimited(dfExtended)) return undefined;
    return lineage(["INF-ANKLE-DF-MOBILITY"], "INF-ANKLE-DF-MOBILITY:B1", [dfExtendedId, dfFlexedId], [dfExtendedId]);
  }

  return undefined;
}

export function ankleP0EligibleControlExerciseIds(records: AnkleP0AssessmentRecords) {
  const eligible = new Set<string>();
  const dfExtended = records["motion:ankle-dorsiflexion"];
  const dfFlexed = records["motion:ankle-dorsiflexion-knee-flexed"];
  const eversion = records["motion:ankle-eversion"];
  if ((controlDeficit(dfExtended) && passiveAvailable(dfExtended))
    || (controlDeficit(dfFlexed) && passiveAvailable(dfFlexed))) eligible.add("ankle-dorsiflexion-control");
  if (controlDeficit(eversion) && passiveAvailable(eversion)) eligible.add("ankle-eversion-control");
  return eligible;
}

export const ANKLE_P0_CONTROL_EXERCISE_IDS = new Set([
  "ankle-dorsiflexion-control",
  "ankle-eversion-control",
]);
