import type { KnowledgeReviewPackage, SourceRef } from "./contracts.ts";

export type RehabKnowledgeIssue = {
  code: string;
  ownerId: string;
  reference?: string;
};

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function validateRehabKnowledge(reviewPackage: KnowledgeReviewPackage): RehabKnowledgeIssue[] {
  const issues: RehabKnowledgeIssue[] = [];
  const actionIds = new Set(reviewPackage.actionDefinitions.map((action) => action.id));
  const assessmentIds = new Set(reviewPackage.assessmentDefinitions.map((assessment) => assessment.id));
  const branchIds = new Set(reviewPackage.complaintBranches.map((branch) => branch.id));
  const caseIds = new Set(reviewPackage.sourceCases.map((sourceCase) => sourceCase.id));
  const actionById = new Map(reviewPackage.actionDefinitions.map((action) => [action.id, action]));
  const assessmentById = new Map(reviewPackage.assessmentDefinitions.map((assessment) => [assessment.id, assessment]));
  const branchById = new Map(reviewPackage.complaintBranches.map((branch) => [branch.id, branch]));

  for (const id of findDuplicates(reviewPackage.actionDefinitions.map((action) => action.id))) issues.push({ code: "KNOW-DUPLICATE-ACTION", ownerId: id });
  for (const id of findDuplicates(reviewPackage.assessmentDefinitions.map((assessment) => assessment.id))) issues.push({ code: "KNOW-DUPLICATE-ASSESSMENT", ownerId: id });
  for (const id of findDuplicates(reviewPackage.complaintBranches.map((branch) => branch.id))) issues.push({ code: "KNOW-DUPLICATE-BRANCH", ownerId: id });
  for (const id of findDuplicates(reviewPackage.sourceCases.map((sourceCase) => sourceCase.id))) issues.push({ code: "KNOW-DUPLICATE-CASE", ownerId: id });

  for (const action of reviewPackage.actionDefinitions) {
    for (const caseId of action.sourceCaseIds) {
      if (!caseIds.has(caseId)) issues.push({ code: "KNOW-ACTION-MISSING-CASE", ownerId: action.id, reference: caseId });
    }
  }

  for (const assessment of reviewPackage.assessmentDefinitions) {
    if (assessment.actionId && !actionIds.has(assessment.actionId)) issues.push({ code: "KNOW-ASSESSMENT-MISSING-ACTION", ownerId: assessment.id, reference: assessment.actionId });
    for (const caseId of assessment.sourceCaseIds) {
      if (!caseIds.has(caseId)) issues.push({ code: "KNOW-ASSESSMENT-MISSING-CASE", ownerId: assessment.id, reference: caseId });
    }
  }

  for (const branch of reviewPackage.complaintBranches) {
    const branchAssessmentIds = [...branch.initialAssessmentIds, ...branch.continuationAssessmentIds];
    for (const assessmentId of branchAssessmentIds) {
      if (!assessmentIds.has(assessmentId)) issues.push({ code: "KNOW-BRANCH-MISSING-ASSESSMENT", ownerId: branch.id, reference: assessmentId });
    }
    for (const assessmentId of findDuplicates(branchAssessmentIds)) issues.push({ code: "KNOW-BRANCH-DUPLICATE-ASSESSMENT", ownerId: branch.id, reference: assessmentId });
    for (const caseId of branch.sourceCaseIds) {
      if (!caseIds.has(caseId)) issues.push({ code: "KNOW-BRANCH-MISSING-CASE", ownerId: branch.id, reference: caseId });
    }
  }

  const allEpisodeIds: string[] = [];
  const allFactIds: string[] = [];
  for (const sourceCase of reviewPackage.sourceCases) {
    const documentIds = new Set(sourceCase.sourceDocuments.map((document) => document.id));
    for (const documentId of findDuplicates(sourceCase.sourceDocuments.map((document) => document.id))) issues.push({ code: "KNOW-DUPLICATE-SOURCE-DOCUMENT", ownerId: sourceCase.id, reference: documentId });
    const checkSourceRef = (ownerId: string, ref: SourceRef) => {
      if (!documentIds.has(ref.documentId)) issues.push({ code: "KNOW-MISSING-SOURCE-DOCUMENT", ownerId, reference: ref.documentId });
    };

    for (const episode of sourceCase.episodes) {
      allEpisodeIds.push(episode.id);
      checkSourceRef(episode.id, episode.complaint.sourceRef);
      if (!branchIds.has(episode.complaint.branchId)) issues.push({ code: "KNOW-EPISODE-MISSING-BRANCH", ownerId: episode.id, reference: episode.complaint.branchId });
      const complaintBranch = branchById.get(episode.complaint.branchId);
      if (complaintBranch && !complaintBranch.sourceCaseIds.includes(sourceCase.id)) issues.push({ code: "KNOW-EPISODE-BRANCH-MISSING-CASE", ownerId: episode.id, reference: sourceCase.id });
      for (const actionId of [...episode.complaint.currentActionIds, ...episode.complaint.injuryActionIds]) {
        if (!actionIds.has(actionId)) issues.push({ code: "KNOW-COMPLAINT-MISSING-ACTION", ownerId: episode.id, reference: actionId });
        const action = actionById.get(actionId);
        if (action && !action.sourceCaseIds.includes(sourceCase.id)) issues.push({ code: "KNOW-ACTION-MISSING-SOURCE-CASE", ownerId: actionId, reference: sourceCase.id });
      }

      const findingIds = new Set(episode.findings.map((finding) => finding.id));
      const treatmentIds = new Set(episode.treatmentExperiments.map((treatment) => treatment.id));
      const retestIds = new Set(episode.retests.map((retest) => retest.id));
      allFactIds.push(...findingIds, ...treatmentIds, ...retestIds, ...episode.interventionsWithoutItemizedRetest.map((item) => item.id));

      for (const finding of episode.findings) {
        checkSourceRef(finding.id, finding.sourceRef);
        if (!assessmentIds.has(finding.assessmentId)) issues.push({ code: "KNOW-FINDING-MISSING-ASSESSMENT", ownerId: finding.id, reference: finding.assessmentId });
        const assessment = assessmentById.get(finding.assessmentId);
        if (assessment && !assessment.sourceCaseIds.includes(sourceCase.id)) issues.push({ code: "KNOW-ASSESSMENT-MISSING-SOURCE-CASE", ownerId: finding.assessmentId, reference: sourceCase.id });
      }
      for (const treatment of episode.treatmentExperiments) {
        checkSourceRef(treatment.id, treatment.sourceRef);
        for (const findingId of treatment.findingIds) {
          if (!findingIds.has(findingId)) issues.push({ code: "KNOW-TREATMENT-MISSING-FINDING", ownerId: treatment.id, reference: findingId });
        }
        for (const retestId of treatment.retestIds) {
          if (!retestIds.has(retestId)) issues.push({ code: "KNOW-TREATMENT-MISSING-RETEST", ownerId: treatment.id, reference: retestId });
        }
      }
      for (const retest of episode.retests) {
        checkSourceRef(retest.id, retest.sourceRef);
        if (!treatmentIds.has(retest.treatmentExperimentId)) issues.push({ code: "KNOW-RETEST-MISSING-TREATMENT", ownerId: retest.id, reference: retest.treatmentExperimentId });
        const treatment = episode.treatmentExperiments.find((candidate) => candidate.id === retest.treatmentExperimentId);
        if (treatment && !treatment.retestIds.includes(retest.id)) issues.push({ code: "KNOW-RETEST-NOT-LINKED-BACK", ownerId: retest.id, reference: treatment.id });
        if (!actionIds.has(retest.actionId)) issues.push({ code: "KNOW-RETEST-MISSING-ACTION", ownerId: retest.id, reference: retest.actionId });
        const action = actionById.get(retest.actionId);
        if (action && !action.sourceCaseIds.includes(sourceCase.id)) issues.push({ code: "KNOW-ACTION-MISSING-SOURCE-CASE", ownerId: retest.actionId, reference: sourceCase.id });
      }
      for (const intervention of episode.interventionsWithoutItemizedRetest) {
        checkSourceRef(intervention.id, intervention.sourceRef);
        if (intervention.actionId && !actionIds.has(intervention.actionId)) issues.push({ code: "KNOW-INTERVENTION-MISSING-ACTION", ownerId: intervention.id, reference: intervention.actionId });
        const action = intervention.actionId ? actionById.get(intervention.actionId) : undefined;
        if (action && !action.sourceCaseIds.includes(sourceCase.id)) issues.push({ code: "KNOW-ACTION-MISSING-SOURCE-CASE", ownerId: intervention.actionId ?? intervention.id, reference: sourceCase.id });
        for (const findingId of intervention.relatedFindingIds) {
          if (!findingIds.has(findingId)) issues.push({ code: "KNOW-INTERVENTION-MISSING-FINDING", ownerId: intervention.id, reference: findingId });
        }
      }
    }
  }

  for (const id of findDuplicates(allEpisodeIds)) issues.push({ code: "KNOW-DUPLICATE-EPISODE", ownerId: id });
  for (const id of findDuplicates(allFactIds)) issues.push({ code: "KNOW-DUPLICATE-FACT", ownerId: id });
  const includedCandidateIds = reviewPackage.extraction.includedCandidateIds;
  for (const id of findDuplicates(includedCandidateIds)) issues.push({ code: "KNOW-DUPLICATE-INCLUDED-CANDIDATE", ownerId: id });
  const episodeIdSet = new Set(allEpisodeIds);
  const includedCandidateIdSet = new Set(includedCandidateIds);
  for (const episodeId of episodeIdSet) {
    if (!includedCandidateIdSet.has(episodeId)) issues.push({ code: "KNOW-EPISODE-NOT-IN-EXTRACTION", ownerId: episodeId });
  }
  for (const candidateId of includedCandidateIdSet) {
    if (!episodeIdSet.has(candidateId)) issues.push({ code: "KNOW-EXTRACTION-CANDIDATE-NOT-REVIEWED", ownerId: candidateId });
  }

  const findingSupport = new Set<string>();
  for (const sourceCase of reviewPackage.sourceCases) {
    for (const episode of sourceCase.episodes) {
      for (const finding of episode.findings) findingSupport.add(`${episode.complaint.branchId}::${finding.assessmentId}`);
    }
  }
  for (const branch of reviewPackage.complaintBranches) {
    for (const assessmentId of [...branch.initialAssessmentIds, ...branch.continuationAssessmentIds]) {
      if (!findingSupport.has(`${branch.id}::${assessmentId}`)) issues.push({ code: "KNOW-BRANCH-ASSESSMENT-NOT-SOURCE-DERIVED", ownerId: branch.id, reference: assessmentId });
    }
  }

  const assessmentSupport = new Set<string>();
  const actionSupport = new Set<string>();
  const branchSupport = new Set<string>();
  for (const sourceCase of reviewPackage.sourceCases) {
    for (const episode of sourceCase.episodes) {
      branchSupport.add(`${episode.complaint.branchId}::${sourceCase.id}`);
      for (const actionId of [...episode.complaint.currentActionIds, ...episode.complaint.injuryActionIds]) actionSupport.add(`${actionId}::${sourceCase.id}`);
      for (const finding of episode.findings) {
        assessmentSupport.add(`${finding.assessmentId}::${sourceCase.id}`);
        const actionId = assessmentById.get(finding.assessmentId)?.actionId;
        if (actionId) actionSupport.add(`${actionId}::${sourceCase.id}`);
      }
      for (const retest of episode.retests) actionSupport.add(`${retest.actionId}::${sourceCase.id}`);
      for (const intervention of episode.interventionsWithoutItemizedRetest) {
        if (intervention.actionId) actionSupport.add(`${intervention.actionId}::${sourceCase.id}`);
      }
    }
  }
  for (const action of reviewPackage.actionDefinitions) {
    for (const caseId of action.sourceCaseIds) {
      if (!actionSupport.has(`${action.id}::${caseId}`)) issues.push({ code: "KNOW-ACTION-SOURCE-NOT-OBSERVED", ownerId: action.id, reference: caseId });
    }
  }
  for (const assessment of reviewPackage.assessmentDefinitions) {
    for (const caseId of assessment.sourceCaseIds) {
      if (!assessmentSupport.has(`${assessment.id}::${caseId}`)) issues.push({ code: "KNOW-ASSESSMENT-SOURCE-NOT-OBSERVED", ownerId: assessment.id, reference: caseId });
    }
  }
  for (const branch of reviewPackage.complaintBranches) {
    for (const caseId of branch.sourceCaseIds) {
      if (!branchSupport.has(`${branch.id}::${caseId}`)) issues.push({ code: "KNOW-BRANCH-SOURCE-NOT-OBSERVED", ownerId: branch.id, reference: caseId });
    }
  }

  return issues.sort((left, right) => left.code.localeCompare(right.code) || left.ownerId.localeCompare(right.ownerId));
}
