export type KnowledgeCaseId = `RAW-${"KNEE" | "ANKLE" | "MULTI" | "LOWERLEG" | "BOUNDARY"}-${string}`;

export type KnowledgeReviewStatus = "owner-confirmed" | "awaiting-owner-review";

export type KnowledgeSide = "left" | "right" | "bilateral" | "unknown";

export type SourceDocument = {
  id: string;
  collectionId: "COL-AI-RAW";
  kind: "raw-record";
  sourceLocator: string;
};

export type SourceRef = {
  documentId: string;
  locator: string;
};

export type RecordedTime =
  | { status: "explicit"; value: string }
  | { status: "not-recorded" };

export type ComplaintTiming = {
  earliestOnset: RecordedTime;
  latestOccurrence: RecordedTime;
  injuryEvent: RecordedTime;
};

export type ActionRole = "complaint" | "assessment" | "retest" | "training" | "goal";

export type ActionUse =
  | "branch-assessment"
  | "conditional-assessment"
  | "source-record-only"
  | "retest-only"
  | "training-only"
  | "goal-only";

export type ActionDefinition = {
  id: string;
  label: string;
  roles: ActionRole[];
  use: ActionUse;
  sourceCaseIds: KnowledgeCaseId[];
};

export type AssessmentKind =
  | "local-motion"
  | "muscle-capacity"
  | "muscle-response"
  | "basic-movement"
  | "symptom-reproduction";

export type AssessmentDefinition = {
  id: string;
  title: string;
  kind: AssessmentKind;
  actionId?: string;
  professionalOnly: boolean;
  sourceCaseIds: KnowledgeCaseId[];
};

export type ComplaintBranch = {
  id: string;
  title: string;
  bodyRegion: "knee";
  sourceCaseIds: KnowledgeCaseId[];
  initialAssessmentIds: string[];
  continuationAssessmentIds: string[];
  safetyNotes: string[];
};

export type ComplaintRecord = {
  branchId: string;
  side: KnowledgeSide;
  rawSummary: string;
  symptomQualities: string[];
  currentActionIds: string[];
  injuryActionIds: string[];
  mechanism?: string;
  timing: ComplaintTiming;
  sourceRef: SourceRef;
};

export type RecordedFinding = {
  id: string;
  assessmentId: string;
  side: KnowledgeSide;
  finding: string;
  sourceRef: SourceRef;
};

export type TreatmentTargetType = "muscle" | "muscle-region" | "joint" | "movement-control" | "symptom-management";

export type RetestResult = "better" | "same" | "worse" | "partial";

export type RetestObservation = {
  id: string;
  treatmentExperimentId: string;
  actionId: string;
  before: string;
  after: string;
  result: RetestResult;
  sourceRef: SourceRef;
};

export type TreatmentExperiment = {
  id: string;
  findingIds: string[];
  primaryTarget: string;
  targetType: TreatmentTargetType;
  intervention: string;
  attribution: "single-target" | "combined-targets";
  supportingInterventions: string[];
  retestIds: string[];
  sourceRef: SourceRef;
};

export type InterventionWithoutItemizedRetest = {
  id: string;
  relatedFindingIds: string[];
  actionId?: string;
  intervention: string;
  note: "performed-without-itemized-retest";
  sourceRef: SourceRef;
};

export type KnowledgeCaseEpisode = {
  id: string;
  sessionDate: RecordedTime;
  complaint: ComplaintRecord;
  findings: RecordedFinding[];
  treatmentExperiments: TreatmentExperiment[];
  retests: RetestObservation[];
  interventionsWithoutItemizedRetest: InterventionWithoutItemizedRetest[];
};

export type KnowledgeSourceCase = {
  id: KnowledgeCaseId;
  reviewStatus: KnowledgeReviewStatus;
  sourceDocuments: SourceDocument[];
  episodes: KnowledgeCaseEpisode[];
};

export type KnowledgeReviewPackage = {
  id: string;
  contractVersion: 1;
  bodyRegion: "knee";
  status: "review-candidate";
  extraction: {
    inputCollectionId: "COL-AI-RAW";
    method: "raw-segment-review";
    sourceFileCount: number;
    sourceSegmentCount: number;
    kneeCandidateCount: number;
    includedCandidateIds: string[];
  };
  actionDefinitions: ActionDefinition[];
  assessmentDefinitions: AssessmentDefinition[];
  complaintBranches: ComplaintBranch[];
  sourceCases: KnowledgeSourceCase[];
};

export type AssessmentFrequencyEntry = {
  branchId: string;
  assessmentId: string;
  distinctCaseCount: number;
  distinctEpisodeCount: number;
  sourceCaseIds: KnowledgeCaseId[];
};

export type KnowledgeRelease = {
  id: string;
  contractVersion: 1;
  bodyRegion: "knee";
  status: "owner-confirmed";
  sourcePackageId: string;
  actionDefinitions: ActionDefinition[];
  assessmentDefinitions: AssessmentDefinition[];
  complaintBranches: ComplaintBranch[];
  sourceCases: KnowledgeSourceCase[];
  assessmentFrequency: AssessmentFrequencyEntry[];
};

export type AssessmentPlanItem = {
  assessmentId: string;
  title: string;
  kind: AssessmentKind;
  professionalOnly: boolean;
  stage: "initial" | "continue-if-unexplained";
};
