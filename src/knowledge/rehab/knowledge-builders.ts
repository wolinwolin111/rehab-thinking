import type {
  AssessmentFrequencyEntry,
  AssessmentPlanItem,
  KnowledgeCaseId,
  KnowledgeRelease,
  KnowledgeReviewPackage,
  KnowledgeSourceCase,
} from "./contracts.ts";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildAssessmentFrequency(
  sourceCases: KnowledgeSourceCase[],
): AssessmentFrequencyEntry[] {
  const observations = new Map<string, { cases: Set<KnowledgeCaseId>; episodes: Set<string> }>();

  for (const sourceCase of sourceCases) {
    for (const episode of sourceCase.episodes) {
      for (const assessmentId of unique(episode.findings.map((finding) => finding.assessmentId))) {
        const key = `${episode.complaint.branchId}::${assessmentId}`;
        const current = observations.get(key) ?? { cases: new Set<KnowledgeCaseId>(), episodes: new Set<string>() };
        current.cases.add(sourceCase.id);
        current.episodes.add(episode.id);
        observations.set(key, current);
      }
    }
  }

  return [...observations.entries()]
    .map(([key, value]) => {
      const [branchId, assessmentId] = key.split("::");
      return {
        branchId,
        assessmentId,
        distinctCaseCount: value.cases.size,
        distinctEpisodeCount: value.episodes.size,
        sourceCaseIds: [...value.cases].sort(),
      };
    })
    .sort((left, right) =>
      left.branchId.localeCompare(right.branchId)
      || right.distinctCaseCount - left.distinctCaseCount
      || right.distinctEpisodeCount - left.distinctEpisodeCount
      || left.assessmentId.localeCompare(right.assessmentId));
}

export function buildOwnerConfirmedRelease(
  reviewPackage: KnowledgeReviewPackage,
): KnowledgeRelease {
  const sourceCases = reviewPackage.sourceCases.filter((sourceCase) => sourceCase.reviewStatus === "owner-confirmed");
  const includedCaseIds = new Set(sourceCases.map((sourceCase) => sourceCase.id));
  const assessmentFrequency = buildAssessmentFrequency(sourceCases);
  const includedAssessmentIds = new Set(assessmentFrequency.map((entry) => entry.assessmentId));
  const includedBranchIds = new Set(assessmentFrequency.map((entry) => entry.branchId));
  const complaintBranches = reviewPackage.complaintBranches
    .filter((branch) => includedBranchIds.has(branch.id))
    .map((branch) => ({
      ...branch,
      sourceCaseIds: branch.sourceCaseIds.filter((caseId) => includedCaseIds.has(caseId)),
      initialAssessmentIds: branch.initialAssessmentIds.filter((assessmentId) => includedAssessmentIds.has(assessmentId)),
      continuationAssessmentIds: branch.continuationAssessmentIds.filter((assessmentId) => includedAssessmentIds.has(assessmentId)),
    }));
  const assessmentDefinitions = reviewPackage.assessmentDefinitions.filter((assessment) => includedAssessmentIds.has(assessment.id));
  const includedActionIds = new Set(assessmentDefinitions.flatMap((assessment) => assessment.actionId ? [assessment.actionId] : []));
  for (const sourceCase of sourceCases) {
    for (const episode of sourceCase.episodes) {
      for (const actionId of [...episode.complaint.currentActionIds, ...episode.complaint.injuryActionIds]) includedActionIds.add(actionId);
      for (const retest of episode.retests) includedActionIds.add(retest.actionId);
    }
  }

  return {
    id: `${reviewPackage.id}:owner-confirmed`,
    contractVersion: reviewPackage.contractVersion,
    bodyRegion: reviewPackage.bodyRegion,
    status: "owner-confirmed",
    sourcePackageId: reviewPackage.id,
    actionDefinitions: reviewPackage.actionDefinitions.filter((action) => includedActionIds.has(action.id)),
    assessmentDefinitions,
    complaintBranches,
    sourceCases,
    assessmentFrequency,
  };
}

export function getAssessmentPlanForBranch(
  release: KnowledgeRelease,
  branchId: string,
  stage: "initial" | "continue-if-unexplained" = "initial",
): AssessmentPlanItem[] {
  const branch = release.complaintBranches.find((candidate) => candidate.id === branchId);
  if (!branch) return [];
  const definitionById = new Map(release.assessmentDefinitions.map((assessment) => [assessment.id, assessment]));
  const frequencyById = new Map(
    release.assessmentFrequency
      .filter((entry) => entry.branchId === branchId)
      .map((entry) => [entry.assessmentId, entry]),
  );

  const assessmentIds = stage === "initial" ? branch.initialAssessmentIds : branch.continuationAssessmentIds;
  return assessmentIds
    .map((assessmentId, sourceOrder) => ({ assessmentId, sourceOrder, definition: definitionById.get(assessmentId), frequency: frequencyById.get(assessmentId) }))
    .filter((item): item is typeof item & { definition: NonNullable<typeof item.definition> } => Boolean(item.definition))
    .sort((left, right) =>
      (right.frequency?.distinctCaseCount ?? 0) - (left.frequency?.distinctCaseCount ?? 0)
      || (right.frequency?.distinctEpisodeCount ?? 0) - (left.frequency?.distinctEpisodeCount ?? 0)
      || left.sourceOrder - right.sourceOrder)
    .map(({ assessmentId, definition }) => ({
      assessmentId,
      title: definition.title,
      kind: definition.kind,
      professionalOnly: definition.professionalOnly,
      stage,
    }));
}
