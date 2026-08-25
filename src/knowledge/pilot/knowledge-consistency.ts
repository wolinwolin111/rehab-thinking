export const PILOT_KNOWLEDGE_CHECK_SCOPE = "software-reference-consistency-only" as const;

export type PilotKnowledgeConsistencyIssue = {
  code: string;
  relationId?: string;
  reference?: string;
};

type KnowledgeRelation = {
  id: string;
  regionId: string;
  assessmentIds: string[];
  treatmentCandidates: Array<{ id: string; kind: string; retestIds: string[]; requiresProfessional?: boolean }>;
  trainingIds: string[];
  evidence: string;
  status: string;
  sourceCases: string[];
};

type KnowledgeRegion = {
  id: string;
  directions: Array<{ id: string }>;
  strengths: Array<{ id: string }>;
  functions: Array<{ id: string }>;
  specialTests: Array<{ id: string }>;
  exercises: Array<{ id: string }>;
};

type MotionKnowledge = Record<string, { id: string; relations: Array<{ regionId: string }> }>;
type MuscleRegion = { id: string };

const ISSUE_ORDER = [
  "KNOW-DUPLICATE-RELATION",
  "KNOW-DUPLICATE-REGION",
  "KNOW-MISSING-REGION",
  "KNOW-MISSING-ASSESSMENT",
  "KNOW-MISSING-RETEST",
  "KNOW-MISSING-TRAINING",
  "KNOW-JOINT-PERMISSION",
  "KNOW-INVALID-EVIDENCE",
  "KNOW-INVALID-STATUS",
  "KNOW-MISSING-SOURCE",
  "KNOW-MOTION-ID-MISMATCH",
  "KNOW-MISSING-MUSCLE-REGION",
] as const;

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates;
}

export function validatePilotKnowledgeConsistency(input: {
  relations: KnowledgeRelation[];
  regions: KnowledgeRegion[];
  motionKnowledge: MotionKnowledge;
  muscleRegions: MuscleRegion[];
}): PilotKnowledgeConsistencyIssue[] {
  const issues: PilotKnowledgeConsistencyIssue[] = [];
  const relationDuplicates = duplicateValues(input.relations.map((relation) => relation.id));
  for (const relationId of relationDuplicates) issues.push({ code: "KNOW-DUPLICATE-RELATION", relationId });

  const regionDuplicates = duplicateValues(input.regions.map((region) => region.id));
  for (const reference of regionDuplicates) issues.push({ code: "KNOW-DUPLICATE-REGION", reference });
  const regionIds = new Set(input.regions.map((region) => region.id));
  const assessmentIds = new Set(input.regions.flatMap((region) => [
    ...region.directions.map((item) => `motion:${item.id}`),
    ...region.strengths.map((item) => `strength:${item.id}`),
    ...region.functions.map((item) => `function:${item.id}`),
    ...region.specialTests.map((item) => `special:${item.id}`),
  ]));
  const trainingIds = new Set(input.regions.flatMap((region) => region.exercises.map((item) => item.id)));

  for (const relation of input.relations) {
    if (!regionIds.has(relation.regionId)) issues.push({ code: "KNOW-MISSING-REGION", relationId: relation.id, reference: relation.regionId });
    for (const reference of relation.assessmentIds) {
      if (!assessmentIds.has(reference)) issues.push({ code: "KNOW-MISSING-ASSESSMENT", relationId: relation.id, reference });
    }
    for (const candidate of relation.treatmentCandidates) {
      for (const reference of candidate.retestIds) {
        if (!assessmentIds.has(reference)) issues.push({ code: "KNOW-MISSING-RETEST", relationId: relation.id, reference });
      }
      if (candidate.kind === "joint" && !candidate.requiresProfessional) {
        issues.push({ code: "KNOW-JOINT-PERMISSION", relationId: relation.id, reference: candidate.id });
      }
    }
    for (const reference of relation.trainingIds) {
      if (!trainingIds.has(reference)) issues.push({ code: "KNOW-MISSING-TRAINING", relationId: relation.id, reference });
    }
    if (!['P0', 'P1', 'P2', 'P3'].includes(relation.evidence)) issues.push({ code: "KNOW-INVALID-EVIDENCE", relationId: relation.id });
    if (!["reviewed-source", "clinical-review-required"].includes(relation.status)) issues.push({ code: "KNOW-INVALID-STATUS", relationId: relation.id });
    if (!relation.sourceCases.length) issues.push({ code: "KNOW-MISSING-SOURCE", relationId: relation.id });
  }

  const muscleRegionIds = new Set(input.muscleRegions.map((region) => region.id));
  for (const [key, motion] of Object.entries(input.motionKnowledge)) {
    if (key !== motion.id) issues.push({ code: "KNOW-MOTION-ID-MISMATCH", reference: key });
    for (const relation of motion.relations) {
      if (!muscleRegionIds.has(relation.regionId)) issues.push({ code: "KNOW-MISSING-MUSCLE-REGION", reference: relation.regionId });
    }
  }

  const order = new Map(ISSUE_ORDER.map((code, index) => [code, index]));
  return issues.sort((left, right) => (order.get(left.code as typeof ISSUE_ORDER[number]) ?? 999) - (order.get(right.code as typeof ISSUE_ORDER[number]) ?? 999));
}
