/**
 * Owner-reviewed knee P0 knowledge exposed as an executable runtime contract.
 *
 * Complaint text may open the knee assessment, but only the recorded active /
 * passive extension finding may select one of these branches.  This module is
 * deliberately small: later knee rules remain on the legacy path until they
 * receive the same review and release treatment.
 */

export const KNEE_P0_RELATION_IDS = [
  "INF-KNEE-EXT-MOB-CONTROL",
  "INF-KNEE-EXT-MOB",
  "INF-KNEE-PROX-TIBFIB-POSTEROLATERAL",
] as const;

export type KneeP0RelationId = typeof KNEE_P0_RELATION_IDS[number];

export type KneeP0BranchId =
  | "INF-KNEE-EXT-MOB-CONTROL:B1"
  | "INF-KNEE-EXT-MOB-CONTROL:B2"
  | "INF-KNEE-EXT-MOB:B1"
  | "INF-KNEE-PROX-TIBFIB-POSTEROLATERAL:B1"
  | "INF-KNEE-PROX-TIBFIB-POSTEROLATERAL:B2";

export type KnowledgeEvidenceLineage = {
  relationIds: string[];
  branchId: string;
  assessmentFindingIds: string[];
  retestAssessmentIds: string[];
};

export const KNEE_P0_BASE_ASSESSMENT_IDS = [
  "motion:knee-extension",
  "motion:knee-flexion",
] as const;

export function kneeP0BaseAssessmentPlan(availableIds: string[]): string[] {
  return KNEE_P0_BASE_ASSESSMENT_IDS.filter((id) => availableIds.includes(id));
}

type ExtensionEvidence = {
  findingId: string;
  activeRange?: "matches" | "limited" | "unknown";
  passiveRange?: "matches" | "limited" | "not-checked" | "unknown";
};

type RawExtensionAssessment = {
  active?: string;
  passive?: string;
};

type KneeP0UnitId =
  | "knee-extension-anterior-lateral"
  | "knee-posterior-calf-muscle"
  | "knee-extension-joint"
  | "knee-proximal-fibula"
  | "knee-extension-control";

const KNEE_P0_UNIT_IDS = new Set<KneeP0UnitId>([
  "knee-extension-anterior-lateral",
  "knee-posterior-calf-muscle",
  "knee-extension-joint",
  "knee-proximal-fibula",
  "knee-extension-control",
]);

export function isKneeP0TreatmentUnitId(unitId: string): unitId is KneeP0UnitId {
  return KNEE_P0_UNIT_IDS.has(unitId as KneeP0UnitId);
}

export function kneeP0UnitIdForTreatmentCandidate(candidateId: string): KneeP0UnitId | undefined {
  if (isKneeP0TreatmentUnitId(candidateId)) return candidateId;
  if (["tension-muscle:thigh-anterior", "tension-muscle:thigh-lateral"].includes(candidateId)) {
    return "knee-extension-anterior-lateral";
  }
  if (["tension-muscle:thigh-posterior", "tension-muscle:calf-posterior"].includes(candidateId)) {
    return "knee-posterior-calf-muscle";
  }
  return undefined;
}

/**
 * Attach only evidence that has actually been recorded.  Returning undefined
 * means the unit is not part of the released knee P0 route.
 */
export function kneeP0LineageForTreatment(
  unitId: string,
  evidence: ExtensionEvidence | undefined,
): KnowledgeEvidenceLineage | undefined {
  if (!evidence || evidence.activeRange !== "limited") return undefined;
  const findingIds = [evidence.findingId];
  const retestAssessmentIds = ["motion:knee-extension"];
  const p0UnitId = unitId as KneeP0UnitId;

  if (p0UnitId === "knee-extension-control" && evidence.passiveRange === "matches") {
    return {
      relationIds: ["INF-KNEE-EXT-MOB-CONTROL"],
      branchId: "INF-KNEE-EXT-MOB-CONTROL:B2",
      assessmentFindingIds: findingIds,
      retestAssessmentIds,
    };
  }

  if (evidence.passiveRange !== "limited") return undefined;

  if (p0UnitId === "knee-proximal-fibula") {
    return {
      relationIds: ["INF-KNEE-EXT-MOB-CONTROL", "INF-KNEE-PROX-TIBFIB-POSTEROLATERAL"],
      branchId: "INF-KNEE-PROX-TIBFIB-POSTEROLATERAL:B1",
      assessmentFindingIds: findingIds,
      retestAssessmentIds,
    };
  }

  if (p0UnitId === "knee-posterior-calf-muscle") {
    return {
      relationIds: [...KNEE_P0_RELATION_IDS],
      branchId: "INF-KNEE-PROX-TIBFIB-POSTEROLATERAL:B2",
      assessmentFindingIds: findingIds,
      retestAssessmentIds,
    };
  }

  if (p0UnitId === "knee-extension-anterior-lateral" || p0UnitId === "knee-extension-joint") {
    return {
      relationIds: ["INF-KNEE-EXT-MOB-CONTROL", "INF-KNEE-EXT-MOB"],
      branchId: p0UnitId === "knee-extension-joint"
        ? "INF-KNEE-EXT-MOB:B1"
        : "INF-KNEE-EXT-MOB-CONTROL:B1",
      assessmentFindingIds: findingIds,
      retestAssessmentIds,
    };
  }

  return undefined;
}

/** Convert the UI's stored answer vocabulary at the knowledge boundary. */
export function kneeP0LineageFromAssessmentRecord(
  unitId: string,
  record: RawExtensionAssessment | undefined,
): KnowledgeEvidenceLineage | undefined {
  if (!record) return undefined;
  const activeRange = ["limited", "left-limited", "right-limited", "both-limited"].includes(record.active ?? "")
    ? "limited" as const
    : ["same", "normal"].includes(record.active ?? "")
      ? "matches" as const
      : "unknown" as const;
  const passiveRange = record.passive === "limited"
    ? "limited" as const
    : record.passive === "same"
      ? "matches" as const
      : ["unsure", "unable"].includes(record.passive ?? "")
        ? "unknown" as const
        : "not-checked" as const;
  return kneeP0LineageForTreatment(unitId, {
    findingId: "motion:knee-extension",
    activeRange,
    passiveRange,
  });
}
