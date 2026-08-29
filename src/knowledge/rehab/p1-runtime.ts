import type { KnowledgeEvidenceLineage } from "@/src/knowledge/rehab/knee-p0-runtime";

type P1ReviewStatus = "active" | "deferred";

export type P1ReviewedRule = {
  relationId: string;
  status: P1ReviewStatus;
  ownerDecision: string;
};

/** Owner-reviewed P1 boundary. Deferred entries must not create runtime candidates. */
export const P1_REVIEWED_RULES: readonly P1ReviewedRule[] = [
  { relationId: "INF-KNEE-PATELLA-MOTION", status: "active", ownerDecision: "保留专业髌骨活动检查；术后更常用，不扩大普通主诉的出现频率。" },
  { relationId: "INF-KNEE-SCAR-MOTION", status: "active", ownerDecision: "仅专业模式、明确术后或瘢痕语境使用；普通用户不自行判断。" },
  { relationId: "INF-KNEE-TERMINAL-EXT-CONTROL", status: "active", ownerDecision: "普通用户只做膝后下压；不重复记录抬腿末端保持。" },
  { relationId: "INF-ANKLE-PLANTARFLEXION-CAPACITY", status: "active", ownerDecision: "双脚提踵稳定后才考虑单脚；没有独立单脚结果时不自动进阶。" },
  { relationId: "INF-KNEE-HAMSTRING-ECCENTRIC", status: "deferred", ownerDecision: "离心与向心能力不适合由普通用户自行区分，暂不接入。" },
  { relationId: "INF-ANKLE-SURAL-NEURAL", status: "deferred", ownerDecision: "检查与解释复杂，暂不接入。" },
  { relationId: "INF-ANKLE-TIBIAL-NEURAL", status: "deferred", ownerDecision: "检查与解释复杂，暂不接入。" },
] as const;

export const P1_ACTIVE_RELATION_IDS = new Set(P1_REVIEWED_RULES.filter((rule) => rule.status === "active").map((rule) => rule.relationId));
export const P1_DEFERRED_RELATION_IDS = new Set(P1_REVIEWED_RULES.filter((rule) => rule.status === "deferred").map((rule) => rule.relationId));

export function validateP1ReviewedRules(): string[] {
  const ids = P1_REVIEWED_RULES.map((rule) => rule.relationId);
  const issues = ids.length === new Set(ids).size ? [] : ["P1 relation IDs must be unique"];
  for (const relationId of P1_ACTIVE_RELATION_IDS) {
    if (P1_DEFERRED_RELATION_IDS.has(relationId)) issues.push(`${relationId} cannot be active and deferred`);
  }
  return issues;
}

type RawAssessmentRecord = { active?: string; passive?: string; simple?: string; pairedStrength?: string };
export type P1AssessmentRecords = Record<string, RawAssessmentRecord | undefined>;

const LIMITED = new Set(["limited", "left-limited", "right-limited", "both-limited"]);

function rangeLimited(record: RawAssessmentRecord | undefined) {
  return LIMITED.has(record?.active ?? "") || LIMITED.has(record?.passive ?? "");
}

export function kneeP1PatellaLineage(limitedDirectionIds: readonly string[]): KnowledgeEvidenceLineage | undefined {
  if (!limitedDirectionIds.length) return undefined;
  const findingIds = limitedDirectionIds.map((id) => id.startsWith("motion:") ? id : `motion:${id}`);
  return {
    relationIds: ["INF-KNEE-PATELLA-MOTION"],
    branchId: "INF-KNEE-PATELLA-MOTION:B1",
    assessmentFindingIds: findingIds,
    retestAssessmentIds: findingIds,
  };
}

export const KNEE_P1_SCAR_ASSESSMENT_ID = "motion:knee-scar-mobility";
export const KNEE_P1_SCAR_TREATMENT_ID = "knee-scar-mobility-treatment";

export function isKneeP1StandaloneTreatmentCandidateId(candidateId: string) {
  return candidateId === KNEE_P1_SCAR_TREATMENT_ID;
}

export function kneeP1LineageForTreatment(
  candidateId: string,
  records: P1AssessmentRecords,
  existingEvidence?: KnowledgeEvidenceLineage,
): KnowledgeEvidenceLineage | undefined {
  if (candidateId === "knee-extension-control") {
    if (existingEvidence?.branchId !== "INF-KNEE-EXT-MOB-CONTROL:B2") return existingEvidence;
    return {
      ...existingEvidence,
      relationIds: [...new Set([...existingEvidence.relationIds, "INF-KNEE-TERMINAL-EXT-CONTROL"])],
      branchId: "INF-KNEE-TERMINAL-EXT-CONTROL:B2",
    };
  }
  if (candidateId !== KNEE_P1_SCAR_TREATMENT_ID) return existingEvidence;
  if (records[KNEE_P1_SCAR_ASSESSMENT_ID]?.passive !== "limited") return undefined;

  const relatedFindingIds = [
    "motion:knee-extension",
    "motion:knee-flexion",
    "motion:knee-patella-superior",
    "motion:knee-patella-inferior",
    "motion:knee-patella-medial",
    "motion:knee-patella-lateral",
  ].filter((id) => rangeLimited(records[id]));
  if (!relatedFindingIds.length) return undefined;

  const assessmentFindingIds = [KNEE_P1_SCAR_ASSESSMENT_ID, ...relatedFindingIds];
  return {
    relationIds: ["INF-KNEE-SCAR-MOTION"],
    branchId: "INF-KNEE-SCAR-MOTION:B1",
    assessmentFindingIds,
    retestAssessmentIds: assessmentFindingIds,
  };
}

export const ANKLE_P1_PLANTARFLEXION_EXERCISE_IDS = new Set(["ankle-plantarflexion-control", "ankle-band-heelraise"]);

export function ankleP1EligiblePlantarflexionExerciseIds(records: P1AssessmentRecords) {
  const eligible = new Set<string>();
  const plantarflexion = records["motion:ankle-plantarflexion"];
  const heelRaise = records["function:ankle-heel-raise"];
  if (rangeLimited(plantarflexion)) return eligible;
  if (plantarflexion?.pairedStrength !== "weak" && heelRaise?.simple !== "limited") return eligible;
  ANKLE_P1_PLANTARFLEXION_EXERCISE_IDS.forEach((id) => eligible.add(id));
  return eligible;
}
