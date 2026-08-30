"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { StageTransition } from "@/src/features/rehabmind/components/shared/ui-primitives";
import { OnceHint } from "@/src/features/rehabmind/components/shared/once-hint";
import { localSaveFailureCopy } from "@/src/features/rehabmind/components/shared/user-facing-copy";
import { RehabMindOnboarding } from "@/src/features/rehabmind/components/onboarding/rehabmind-onboarding";
import { SymptomStage } from "@/src/features/rehabmind/components/stages/symptom-stage";
import { ConfirmationStage } from "@/src/features/rehabmind/components/stages/confirmation-stage";
import { AssessmentStage } from "@/src/features/rehabmind/components/stages/assessment-stage";
import { TreatmentRetestStage } from "@/src/features/rehabmind/components/stages/treatment-retest-stage";
import { TrainingStage } from "@/src/features/rehabmind/components/stages/training-stage";
import { SummaryStage } from "@/src/features/rehabmind/components/stages/summary-stage";
import { MobileMoreMenu, MobileStageNavigation, MobileTopActions } from "@/src/features/rehabmind/components/navigation/mobile-app-navigation";
import { RehabRecordsPage } from "@/src/features/rehabmind/components/records/rehab-records-page";
import { useFunctionRetestState } from "@/src/features/rehabmind/controllers/use-function-retest";
import { useTrainingFlow } from "@/src/features/rehabmind/controllers/use-training-flow";
import { useRehabSession } from "@/src/features/rehabmind/controllers/use-rehab-session";
import { useAssessmentFlow } from "@/src/features/rehabmind/controllers/use-assessment-flow";
import { useTreatmentFlow } from "@/src/features/rehabmind/controllers/use-treatment-flow";
import { useDecisionEngine } from "@/src/features/rehabmind/controllers/use-decision-engine";
import { resultFromScore } from "@/src/domain/rehab/treatment/trial-record-builder";
import { computeBatchResult } from "@/src/domain/rehab/retest/batch-retest-compute";
import { type CompletedRangeRetestAnswer, type FunctionRetestCompletion, type FunctionRetestMode, type FunctionRetestObligation, type RangeRetestAnswer, type TrialRecord, type TrialResult, type YesNo } from "@/src/domain/rehab/treatment/trial-record-types";
import { makeLowerLimbLocationSelection } from "@/src/features/rehabmind/components/assessment/lower-limb-location-picker";
import { FULL_REGIONS, type FullCandidate, type FullExercise, type FullRegion, type FullRegionId } from "@/src/knowledge/pilot/full-demo-content";
import { classifyPilotAssessmentEvidence, matchPilotRelations, rankPilotAssessmentIds, type PilotFindingInput } from "@/src/domain/rehab/shared/pilot-decision-engine";
import { buildKneeDecision } from "@/src/domain/rehab/shared/knee-decision-core";
import { buildLocalLimbDecision, localLimbArea, type LocalLimbFinding } from "@/src/domain/rehab/shared/local-limb-decision-core";
import { classifyTreatmentResponse, resolvedTreatmentCombination, treatmentResponsePriority, type TreatmentResponseRole } from "@/src/domain/rehab/treatment/treatment-response-core";
import { findNextCandidateIndex, type PendingQueueAdvance } from "@/src/domain/rehab/shared/workflow-state-core";
import { keepOtherSessionRecords, resolveDownstreamInvalidation, shouldInvalidateFollowupWork } from "@/src/domain/rehab/shared/downstream-invalidation-core";
import { resolveRestoredAssessmentProgress, restoredAssessmentNotice } from "@/src/domain/rehab/assessment/restored-position-core";
import { PilotConsentGate } from "@/src/features/rehabmind/components/onboarding/pilot-consent-gate";
import { PilotSourceGate } from "@/src/features/rehabmind/components/onboarding/pilot-source-gate";
import { DevToolbar } from "@/src/features/rehabmind/components/onboarding/dev-toolbar";
import { buildPilotConsentRecord, isPilotConsentDeclined, markPilotConsentDeclined, readPilotConsent, writePilotConsent, type PilotConsentRecord } from "@/src/infrastructure/pilot/consent/consent-core";
import { readPilotSource, writePilotSource, type PilotSourceRecord } from "@/src/infrastructure/pilot/onboarding/source-channel";
import { useWorkflowController } from "@/src/features/rehabmind/controllers/use-workflow-controller";
import type { WorkflowProjectionInput } from "@/src/features/rehabmind/workflow/workflow-state";
import { createPilotCase, createPilotAccessToken, createPilotClientCreationId, deletePilotCase, PilotCaseClientError, readPilotCase, savePilotCaseProgress, submitPilotCaseFeedback, type PilotCaseAccess, type PilotTestContext } from "@/src/infrastructure/pilot/api/case-client";
import { resolvePilotFirstUseOverlay } from "@/src/infrastructure/pilot/telemetry/first-use-core";
import { recordPilotCaseOperation, recordPilotFirstUseEvent } from "@/src/infrastructure/pilot/api/trial-operations-client";
import { createLocalCaseId, findLocalCaseRecord, savedRecordIdentity } from "@/src/infrastructure/pilot/persistence/local-case-identity";
import { archiveProblemThreadRecord, createProblemThreadId, createProblemThreadRecord, createSessionId, legacySessionIdentity, sessionIndexFromSummary, upsertProblemThreadRecord, upsertSessionIndex, type ProblemThreadRecord, type SessionIndexRecord } from "@/src/domain/rehab/history/session-identity-core";
import { clearLocalCaseRecords, clearLocalDraft, createLocalTabId, loadLocalCaseRecords, loadLocalDraftWithDiagnostics, LOCAL_DRAFT_SIGNAL_KEY, localDraftContentFingerprint, saveLocalCaseRecords, saveLocalDraft, type LocalDraftStorageSignal } from "@/src/infrastructure/pilot/persistence/local-case-store";
import { createPilotDraftPersistenceController, createPilotKeyedPersistenceQueue, createPilotSerialPersistenceQueue, type PilotSerialPersistenceQueue } from "@/src/infrastructure/pilot/persistence/persistence-controller";
import { markStageEventSeen, pickStageAdvanceEvent, pilotProgressEventId } from "@/src/features/rehabmind/workflow/stage-events";
import { contentFingerprint, buildPilotConflictCaseCopy, createPilotSyncMachineState, decidePilotRestoreSource, reducePilotSyncState, summarizePilotSnapshotConflict, type PilotSyncEvent, type PilotSyncMachineState, type PilotSyncOperation } from "@/src/infrastructure/pilot/persistence/sync-core";

import { PILOT_SNAPSHOT_SCHEMA_VERSION } from "@/src/infrastructure/pilot/api/case-contracts";
import { PilotFeedbackPanel } from "@/src/features/rehabmind/components/feedback/feedback-panel";
import { PilotConflictPanel } from "@/src/features/rehabmind/components/feedback/conflict-panel";
import { SnapshotFreshnessBanner, SnapshotFreshnessReconfirmationDialog } from "@/src/features/rehabmind/components/restore/snapshot-freshness-notice";
import { capturePilotFeedbackSourceContext, PilotFeedbackSubmissionError, type PilotFeedbackDraft, type PilotFeedbackSourceContext } from "@/src/infrastructure/pilot/feedback/feedback-context";import { buildNextFocus, upsertSessionSummary, type RehabSessionSummary } from "@/src/features/rehabmind/workflow/session-history";
import { INITIAL_TRAINING_PRIORITY, nextSessionTrainingIds } from "@/src/domain/rehab/training/training-progression-core";
import { KNEE_CORE_CANDIDATE_IDS, kneeDecisionInputFromWorkflow, kneeExerciseIdsForDecision, kneeLegacyCandidateIdsForUnit, kneeRetestInstruction, kneeTreatmentInstruction } from "@/src/domain/rehab/shared/knee-workflow-adapter";
import { normalizePilotMuscleRegion, pilotMotionKnowledge, primaryRetestMotionIdsForRegion, professionalAssessmentTitle } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import { strengthAnswerForWorkflow, strengthAnswerResult } from "@/src/domain/rehab/assessment/assessment-answer-core";
import { pairedStrengthFindingProjection } from "@/src/domain/rehab/assessment/paired-strength-finding-core";
import { formatRangeAngle, parseRangeAngle } from "@/src/domain/rehab/assessment/range-measurement-core";
import { bodyMarksFromSelections, mergeBodyMarks } from "@/src/domain/rehab/records/body-mark-core";
import { buildScoreRecordsFromSnapshot, mergeScoreRecords } from "@/src/domain/rehab/records/score-record-core";
import { buildSpecialTestRecords } from "@/src/domain/rehab/records/special-test-record-core";
import { REHABMIND_V3_CONTRACT_REVISION } from "@/src/domain/rehab/snapshot/snapshot-contract";
import { buildProfessionalNoteRecords, mergeProfessionalNoteRecords } from "@/src/domain/rehab/records/professional-note-record-core";
import { buildDecisionTraces } from "@/src/domain/rehab/records/decision-trace-core";
import { firstAssessmentGap } from "@/src/domain/rehab/assessment/assessment-gap-core";import { actionIdFromFinding, anyMotionIdFromFinding, canonicalActionIdFromAssessmentId, dedupeAssessmentIdsByAction, dedupeRetestFindingsByAction, motionIdFromFinding, samePhysicalAction, treatmentRelatesToChief, valueForPhysicalAction } from "@/src/domain/rehab/intake/action-identity-core";import { mergeSessionReviewResults, previousSessionEndingScore, trendFromAssessmentResult, type AssessmentReviewResult, type ReviewResult } from "@/src/domain/rehab/followup/followup-review-core";
import { buildProblemLedger, emptyTreatmentMessage, hasUnroutedImmediateProblem, unresolvedImmediateProblems } from "@/src/domain/rehab/shared/problem-ledger-core";import { needsTreatmentFinalChiefRetest, treatmentMustStop } from "@/src/domain/rehab/treatment/treatment-session-core";
import { capturesChiefRetestScore, nextRangeCandidateType, shouldRequestChiefRetest } from "@/src/domain/rehab/retest/retest-routing-core";
import { canExecutePlan, createAdverseResponse, focusedReassessmentIds, focusedReassessmentComplete, nextAssessmentRevision, resolveAdverseResponse, type AdverseResponseEvent, type AdverseSource, type AdverseTiming } from "@/src/domain/rehab/followup/adverse-response-core";
import { buildMuscleTensionFindings, needsMuscleTensionCheck } from "@/src/domain/rehab/assessment/muscle-tension-assessment-core";
import { buildCapabilitySnapshotId, normalizeWorkflowProfile, toggleCapability, workflowProfileFromLegacy, type CapabilityKey } from "@/src/domain/rehab/intake/workflow-profile-core";
import { buildHomeRelaxationTargets, exerciseMuscleLabels } from "@/src/domain/rehab/training/home-relaxation-core";
import { candidateDedupKey, candidateMuscleFocus, candidateMuscleUnits, candidateTreatmentKey, candidateTreatmentName } from "@/src/domain/rehab/treatment/candidate-treatment-core";
import { candidateAction, candidatePilotMotionIds } from "@/src/domain/rehab/treatment/candidate-action-core";
import { chiefActionLabel, chiefActionSource, chiefMotionDirectionId, chiefMotionDirectionIds, hasClearChiefAction, isAcuteTrauma, reportedActionSummary } from "@/src/domain/rehab/intake/chief-action-core";
import { candidateRelevance } from "@/src/domain/rehab/treatment/candidate-scoring-core";
import { consolidateTrialTargetsByTreatment, treatmentCanCarryAcrossProblems } from "@/src/domain/rehab/treatment/trial-target-core";
import { bilateralAssessmentGate, inferBilateralAssessmentWorseSide, orderBilateralSides, resolveBilateralPriority, type BilateralSide } from "@/src/domain/rehab/shared/bilateral-flow-core";
import { buildTrialTargets } from "@/src/domain/rehab/treatment/build-trial-targets-core";
import { type DecisionContext } from "@/src/domain/rehab/treatment/trial-target-types";
import { candidateIsAvailable } from "@/src/domain/rehab/treatment/candidate-safety-core";
import { includesAny } from "@/src/domain/rehab/treatment/candidate-order-core";
import { buildFindingGroups } from "@/src/domain/rehab/shared/finding-groups-core";
import { ANKLE_P0_CONTROL_EXERCISE_IDS, ankleP0EligibleControlExerciseIds, ankleP0LineageForTreatment, ankleP0RecordsAfterRangeOutcomes, isAnkleP0CandidateId } from "@/src/knowledge/rehab/ankle-p0-runtime";
import { kneeP0LineageFromAssessmentRecord, kneeP0UnitIdForTreatmentCandidate } from "@/src/knowledge/rehab/knee-p0-runtime";
import { p0AssessmentAccess } from "@/src/knowledge/rehab/p0-assessment-access";
import { ANKLE_P1_PLANTARFLEXION_EXERCISE_IDS, ankleP1EligiblePlantarflexionExerciseIds, KNEE_P1_SCAR_TREATMENT_ID, kneeP1LineageForTreatment } from "@/src/knowledge/rehab/p1-runtime";
import { specialIsRelevant } from "@/src/domain/rehab/safety/special-test-trigger-core";
import { classifySnapshotFreshness, formatSnapshotAge, isTimeSensitiveOnset, type SnapshotFreshness } from "@/src/domain/rehab/followup/snapshot-freshness-core";
import { functionControlValue, functionDiscomfortValue } from "@/src/domain/rehab/assessment/function-assessment-core";
import { chiefFunctionAssessmentIds, selectFunctionAssessmentPlan } from "@/src/domain/rehab/assessment/function-assessment-plan-core";
import { planContinuationAssessments } from "@/src/domain/rehab/assessment/continuation-planner-core";
import { functionEvidenceDecisionTags, functionEvidenceFromRecord } from "@/src/domain/rehab/retest/function-evidence-core";
import { pendingFunctionRetests, summarizeFunctionRetestObligations } from "@/src/domain/rehab/retest/retest-obligation-core";
import { buildRetestLedgerFromTrials, retestObligationId, type RetestObligation, type RetestRecord } from "@/src/domain/rehab/retest/retest-ledger-core";
import { resolveFunctionRetestTransition } from "@/src/domain/rehab/retest/function-retest-transition-core";
import { completedProblemIdsFromTreatmentRecords } from "@/src/domain/rehab/treatment/treatment-ledger-core";
import { buildRangeTreatmentRecords, resolveChiefRetestCapture, resolveRangeChiefRetestCapture, resolveTreatmentRecordFlow } from "@/src/domain/rehab/treatment/treatment-record-flow-core";
import { retestBaselineModeFromEvidence, retestEligibility } from "@/src/domain/rehab/retest/retest-eligibility-core";
import { activeMotionRecordComplete } from "@/src/domain/rehab/assessment/motion-assessment-core";
import { assessmentRecordComplete } from "@/src/domain/rehab/assessment/assessment-record-complete-core";
import { hasRecordedChiefRetest, latestRecordedChiefScore } from "@/src/domain/rehab/retest/chief-retest-history-core";
import { isTreatmentQueueCandidateEligible } from "@/src/domain/rehab/treatment/treatment-queue-eligibility-core";
import { isTreatmentQueueDirectionCandidateNeeded } from "@/src/domain/rehab/treatment/treatment-queue-direction-core";import { AssessmentItem, AssessmentRecord, DEFAULT_INTAKE, Finding, FollowupExerciseChoice, FollowupNewSymptomAnswer, FollowupReviewAnswer, FollowupStage, FollowupTreatmentRecord, IMAGING_OPTIONS, IntakeMultiConfirmation, IntakeState, PATELLA_DIRECTION_IDS, PATELLA_GROUP_PRIMARY_ID, PilotDraftEnvelope, PilotSyncDisplayState, RESIDUAL_REVIEW_ID, RetestPlan, SAFETY_ITEMS, SHARED_TENSION_ASSESSMENT_ID, STAGE_TRANSITIONS, STEPS, SavedDemoRecord, SavedDemoSnapshot, Step, TransitionTarget, TreatmentProblem, TrialTarget, adaptExerciseForCurrentStage, analyzeChiefAction, assessmentAllowsEndFeel, assessmentAllowsMuscleComparison, assessmentAllowsPassive, assessmentCopy, assessmentTitle, bilateralAssessmentCopy, bilateralComparisonToSide, bilateralSideForMotionAnswer, canonicalIntakeField, canonicalRetestAction, chiefComplaintLabel, chiefFunctionAssessmentId, directionIsRelevant, discomfortDecisionTags, dynamicMuscleCandidateFromRecord, effectiveAssessmentRecord, effectiveBilateralComparison, effectiveProvocationTypes, forceDirectionTags, functionSimpleAnswer, getGoalLabel, inferImagingFromDescription, inferRegion, isCompletedRangeRetestAnswer, isPatellaDirectionId, isPatellaGroupSecondaryId, isPilotRegion, isSpinalRegion, locationSelectionsLabel, migrateIntakeState, motionAnswerIsLimited, motionComparisonMode, motionComparisonTarget, normalizeSavedDemoSnapshot, operationTargetLabel, optionalTreatmentSelectionKey, passiveAnswerIsLimited, passiveEndFeelLabel, passiveMotionInstruction, persistSavedDemoSnapshot, pilotInputFromIntake, professionalAssessmentCopy, professionalFindingLabel, profileLabelForIntake, sharedTensionLocationsForMotion, restoredBaselineScoreConfirmed, shouldCollectBaselineScore, sideFromLocationSelections, spineModeLabel, strengthIsRelevant, type PersistedDemoSnapshotV3 } from "./workbench-support";
import { deriveMedicalGuidance, medicalGuidanceNeedsClarification } from "@/src/domain/rehab/intake/medical-guidance-core";
import type { AssessmentSessionRecord } from "./workbench-support";

type PersistedSavedDemoRecordV3 = Omit<SavedDemoRecord, "snapshot" | "pilotConflictSnapshot"> & {
  snapshot?: PersistedDemoSnapshotV3;
  pilotConflictSnapshot?: PersistedDemoSnapshotV3;
};

type PersistedPilotDraftEnvelopeV3 = Omit<PilotDraftEnvelope, "snapshot"> & {
  snapshot: PersistedDemoSnapshotV3;
};

function persistSavedRecord(record: SavedDemoRecord): PersistedSavedDemoRecordV3 {
  return {
    ...record,
    snapshot: record.snapshot ? persistSavedDemoSnapshot(record.snapshot) : undefined,
    pilotConflictSnapshot: record.pilotConflictSnapshot ? persistSavedDemoSnapshot(record.pilotConflictSnapshot) : undefined,
  };
}

function normalizePersistedRecord(record: PersistedSavedDemoRecordV3): SavedDemoRecord | null {
  const snapshot = record.snapshot ? normalizeSavedDemoSnapshot(record.snapshot) : null;
  if (record.snapshot && !snapshot) return null;
  const conflict = record.pilotConflictSnapshot ? normalizeSavedDemoSnapshot(record.pilotConflictSnapshot) : null;
  return {
    ...record,
    snapshot: snapshot ?? undefined,
    pilotConflictSnapshot: conflict ?? undefined,
  };
}

function sessionTreatmentAsTrialRecord(record: FollowupTreatmentRecord): TrialRecord {
  return {
    ...record,
    targetId: record.targetId ?? `target:${record.candidateId}`,
    movement: record.result === "worse" ? "worse" : record.result === "same" ? "same" : "smoother",
  };
}

function persistedSnapshotFingerprint(snapshot: SavedDemoSnapshot) {
  const persisted = persistSavedDemoSnapshot(snapshot);
  const domain = { ...persisted.domain };
  delete domain.consent;
  return contentFingerprint({ ...persisted, domain });
}


export default function RehabMindCompleteDemo({ testContext }: { testContext?: PilotTestContext } = {}) {
  const storageScope = testContext ? "test" : "user";
  const testStorageWriteBlocked = testContext?.faultMode === "storage";
  const workflowController = useWorkflowController();
  const onboardingStorageKey = "rehabmind-onboarding-v1";
  const [step, setStep] = useState<Step>(0);
  const [reviewStep, setReviewStep] = useState<Step | null>(null);
  const [reviewStepEditable, setReviewStepEditable] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);
  const [intake, setIntake] = useState<IntakeState>(DEFAULT_INTAKE);
  const intakeRef = useRef<IntakeState>(DEFAULT_INTAKE);
  useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);
  const activeProvocationTypes = useMemo(() => effectiveProvocationTypes(intake), [intake]);
  const [showAllIntakeFields, setShowAllIntakeFields] = useState(false);
  const [highlightedIntakeFields, setHighlightedIntakeFields] = useState<string[]>([]);
  const [professionalLocationTab, setProfessionalLocationTab] = useState<"swelling" | "tenderness" | "sensory">("swelling");
  const [guidedIntakeField, setGuidedIntakeField] = useState("");
  /** 逐项问答的真实路径。返回后保留路径，下一步按路径前进，不再查找第一个未填写字段。 */
  const [guidedIntakePath, setGuidedIntakePath] = useState<string[]>([]);
  const [guidedIntakeCursor, setGuidedIntakeCursor] = useState(0);
  const guidedAdvanceRef = useRef<{ field: string; cursor: number } | null>(null);
  const [confirmedIntakeMulti, setConfirmedIntakeMulti] = useState<IntakeMultiConfirmation>({ symptoms: false, provocationTypes: false });
  const [safety, setSafety] = useState<Record<string, YesNo>>({});
  const [safetyStage, setSafetyStage] = useState<0 | 1 | 2>(0);
  const [boneRisk, setBoneRisk] = useState<Record<string, "yes" | "no" | "unsure">>({});
  const [imaging, setImaging] = useState<string[]>([]);
  // 继续排查：用户显式接受的建议评估项。这是流程意图，不是临床事实，
  // 不进快照；补查的答案会走既有评估修订链。
  const [continuationRoundIds, setContinuationRoundIds] = useState<string[]>([]);
  const { state: assessmentFlow, actions: assessmentActions } = useAssessmentFlow<AssessmentRecord>();
  const assessmentIndex = assessmentFlow.cursor;
  const setAssessmentIndex = assessmentActions.setCursor;
  // 评估题目会根据已记录答案重新排序或逐级追加；记住当前题目 id，
  // 避免返回修改后数字索引落到另一题。
  const assessmentFocusIdRef = useRef("");
  const assessmentResults = assessmentFlow.results;
  const setAssessmentResults = assessmentActions.setResults;
  const assessmentResultsRef = useRef<Record<string, AssessmentRecord>>({});
  const assessmentSummaryOpen = assessmentFlow.summaryOpen;
  const setAssessmentSummaryOpen = assessmentActions.setSummaryOpen;
  const sharedTensionOpen = assessmentFlow.sharedTensionOpen;
  const setSharedTensionOpen = assessmentActions.setSharedTensionOpen;
  const [thinkingWorkbenchOpen, setThinkingWorkbenchOpen] = useState(false);
  const { state: treatmentFlow, actions: treatmentActions } = useTreatmentFlow<RetestPlan>();
  const trialTargetIndex = treatmentFlow.targetCursor;
  const setTrialTargetIndex = treatmentActions.setTargetCursor;
  // 处理队列会在每条记录写入后重新计算。先记住期望进入的下一目标，
  // 避免前一项（尤其肿胀管理）退出队列后，旧的数字下标越过后续处理。
  const pendingTrialAdvance = treatmentFlow.pendingQueueAdvance;
  const setPendingTrialAdvance = treatmentActions.setPendingQueueAdvance;
  const candidateIndex = treatmentFlow.candidateCursor;
  const setCandidateIndex = treatmentActions.setCandidateCursor;
  // 处理撤销：保存每次 finishTrial 前的快照，撤销时恢复。
  const [finishSnapshots, setFinishSnapshots] = useState<Array<{ trialRecords: TrialRecord[]; trialTargetIndex: number; candidateIndex: number; pendingTrialAdvance: PendingQueueAdvance | null }>>([]);
  const selectedOptionalCandidateIds = treatmentFlow.selectedOptionalCandidateIds;
  const setSelectedOptionalCandidateIds = treatmentActions.setSelectedOptionalCandidateIds;
  const bilateralNeedsReferral = treatmentFlow.bilateralNeedsReferral;
  const setBilateralNeedsReferral = treatmentActions.setBilateralNeedsReferral;
  const midpointDecisionDone = treatmentFlow.midpointDecisionDone;
  const setMidpointDecisionDone = treatmentActions.setMidpointDecisionDone;
  const bilateralTreatmentSides = treatmentFlow.bilateralTreatmentSides;
  const setBilateralTreatmentSides = treatmentActions.setBilateralTreatmentSides;
  const bilateralRetestResponses = treatmentFlow.bilateralRetestResponses;
  const setBilateralRetestResponses = treatmentActions.setBilateralRetestResponses;
  const trialRecords = treatmentFlow.records;
  const setTrialRecords = treatmentActions.setRecords;
  const postScore = treatmentFlow.postScore;
  const setPostScore = treatmentActions.setPostScore;
  const postScoreConfirmed = treatmentFlow.postScoreConfirmed;
  const setPostScoreConfirmed = treatmentActions.setPostScoreConfirmed;
  const postDiscomfort = treatmentFlow.postDiscomfort;
  const setPostDiscomfort = treatmentActions.setPostDiscomfort;
  const readyToRetest = treatmentFlow.readyToRetest;
  const setReadyToRetest = treatmentActions.setReadyToRetest;
  const retestPlan = treatmentFlow.retestPlan;
  const setRetestPlan = treatmentActions.setRetestPlan;
  const movementResponse = treatmentFlow.movementResponse;
  const setMovementResponse = treatmentActions.setMovementResponse;
  const movementResponses = treatmentFlow.movementResponses;
  const setMovementResponses = treatmentActions.setMovementResponses;
  const movementDiscomforts = treatmentFlow.movementDiscomforts;
  const setMovementDiscomforts = treatmentActions.setMovementDiscomforts;
  const movementScores = treatmentFlow.movementScores;
  const setMovementScores = treatmentActions.setMovementScores;
  const movementScoreConfirmed = treatmentFlow.movementScoreConfirmed;
  const setMovementScoreConfirmed = treatmentActions.setMovementScoreConfirmed;
  const {
    exerciseFeedback, setExerciseFeedback,
    openExercise, setOpenExercise,
    trainingComplete, setTrainingComplete,
    trainingPlanSaved, setTrainingPlanSaved,
    trainingReadyForFinalRetest, setTrainingReadyForFinalRetest,
    finalRetestScore, setFinalRetestScore,
    finalRetestConfirmed, setFinalRetestConfirmed: setFinalRetestConfirmedState,
  } = useTrainingFlow();
  const [treatmentFinalRetestScore, setTreatmentFinalRetestScore] = useState(0);
  const [treatmentFinalRetestConfirmed, setTreatmentFinalRetestConfirmedState] = useState(false);
  const [treatmentFinalRetestRecordedAt, setTreatmentFinalRetestRecordedAt] = useState<string | undefined>();
  const [finalRetestRecordedAt, setFinalRetestRecordedAt] = useState<string | undefined>();
  const setTreatmentFinalRetestConfirmed: Dispatch<SetStateAction<boolean>> = (value) => {
    const next = typeof value === "function" ? value(treatmentFinalRetestConfirmed) : value;
    setTreatmentFinalRetestConfirmedState(next);
    if (next !== treatmentFinalRetestConfirmed) setTreatmentFinalRetestRecordedAt(next ? new Date().toISOString() : undefined);
  };
  const setFinalRetestConfirmed: Dispatch<SetStateAction<boolean>> = (value) => {
    const next = typeof value === "function" ? value(finalRetestConfirmed) : value;
    setFinalRetestConfirmedState(next);
    if (next !== finalRetestConfirmed) setFinalRetestRecordedAt(next ? new Date().toISOString() : undefined);
  };
  // 方向型主诉动作的统一复测分数（与功能型主诉动作的 postScore 分开记录）。
  const [directionChiefRetestScore, setDirectionChiefRetestScore] = useState(0);
  const [directionChiefRetestConfirmed, setDirectionChiefRetestConfirmed] = useState(false);
  const {
    functionRetestCompletion, setFunctionRetestCompletion,
    functionRetestUnableReason, setFunctionRetestUnableReason,
    treatmentFunctionRetests, setTreatmentFunctionRetests,
    finalFunctionRetests, setFinalFunctionRetests,
  } = useFunctionRetestState();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [snapshotFreshness, setSnapshotFreshness] = useState<SnapshotFreshness | null>(null);
  const [snapshotReconfirmed, setSnapshotReconfirmed] = useState(false);
  const [snapshotReconfirmationOpen, setSnapshotReconfirmationOpen] = useState(false);
  const [snapshotResumeStep, setSnapshotResumeStep] = useState<Step>(0);
  const [toast, setToast] = useState("");
  const [savedRecords, setSavedRecords] = useState<SavedDemoRecord[]>([]);
  const savedRecordsRef = useRef<SavedDemoRecord[]>([]);
  const archivedProblemThreadIdsRef = useRef(new Set<string>());
  const [localCaseId, setLocalCaseId] = useState(() => createLocalCaseId());
  const [problemThreadId, setProblemThreadId] = useState(() => createProblemThreadId());
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [sessionStartedAt, setSessionStartedAt] = useState(() => new Date().toISOString());
  const [assessmentOwnerSessionId, setAssessmentOwnerSessionId] = useState(sessionId);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentSessionRecord[]>([]);
  const [supersededTrialRecords, setSupersededTrialRecords] = useState<TrialRecord[]>([]);
  const [supersededFollowupTrialRecords, setSupersededFollowupTrialRecords] = useState<FollowupTreatmentRecord[]>([]);
  const [historicalTreatments, setHistoricalTreatments] = useState<PersistedDemoSnapshotV3["domain"]["treatments"]>([]);
  const [trainingFeedbackRecords, setTrainingFeedbackRecords] = useState<PersistedDemoSnapshotV3["domain"]["training"]["records"]>([]);
  const [followupExerciseChoiceRecordedAt, setFollowupExerciseChoiceRecordedAt] = useState<Record<string, string>>({});
  const activeCaseIdentityRef = useRef(localCaseId);
  const localTabIdRef = useRef(createLocalTabId());
  const currentDraftFingerprintRef = useRef<string | null>(null);
  const [multiTabConflict, setMultiTabConflict] = useState<LocalDraftStorageSignal | null>(null);
  const draftHydratedRef = useRef(false);
  const draftPersistenceRef = useRef<ReturnType<typeof createPilotDraftPersistenceController<PersistedPilotDraftEnvelopeV3>> | null>(null);
  const recordsPersistenceRef = useRef<PilotSerialPersistenceQueue<SavedDemoRecord[]> | null>(null);
  if (!recordsPersistenceRef.current) recordsPersistenceRef.current = createPilotSerialPersistenceQueue((records) => testStorageWriteBlocked
    ? Promise.reject(new Error("TEST_FAULT_STORAGE_UNAVAILABLE"))
    : saveLocalCaseRecords(records.map(persistSavedRecord), storageScope));
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileStageOpen, setMobileStageOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const firstUseIntentRef = useRef<"new" | "continue">("new");
  const pendingNewCaseCreationRef = useRef<string | null>(null);
  const pilotSaveQueueRef = useRef(createPilotKeyedPersistenceQueue());
  const pilotSyncMachinesRef = useRef<Record<string, PilotSyncMachineState>>({
    [localCaseId]: createPilotSyncMachineState(localCaseId, 0, false),
  });
  const deletedCaseIdentitiesRef = useRef<Set<string>>(new Set());
  // AUDIT-02：阶段推进事件的已发清单（按案例）与上一阶段游标。
  const stageEventSeenRef = useRef<Record<string, string[]>>({});
  const lastStageForEventsRef = useRef<Record<string, number>>({});

  const pilotConsentRef = useRef<PilotConsentRecord | null>(testContext ? buildPilotConsentRecord(new Date().toISOString()) : null);
  const pilotSourceRef = useRef<PilotSourceRecord | null>(testContext ? { channel: "internal_test", detail: null } : null);
  const [pilotSourceGateOpen, setPilotSourceGateOpen] = useState(false);
  const [pilotConsentGateOpen, setPilotConsentGateOpenState] = useState(false);
  const setPilotConsentGateOpen = (open: boolean) => {
    setPilotConsentGateOpenState(open);
  };
  const focusTutorialStorageKey = "rehabmind-focus-tutorial-seen";
  const [focusTutorialOpen, setFocusTutorialOpen] = useState(false);
  const [pilotConsentDeclined, setPilotConsentDeclined] = useState(false);
  // SAVE-02：恢复到评估阶段后，等待派生队列就绪再推导落点
  const [restoredAssessmentCheck, setRestoredAssessmentCheck] = useState<{ token: number } | null>(null);
  const lastPilotEventIdsRef = useRef<Record<string, string | null>>({});
  const [feedbackSourceContext, setFeedbackSourceContext] = useState<Readonly<PilotFeedbackSourceContext> | null>(null);
  const [pilotSyncState, setPilotSyncState] = useState<PilotSyncDisplayState>("idle");
  const { state: currentSession, set: setCurrentSession } = useRehabSession<RetestPlan>();
  const followupMode = currentSession.isLaterSession;
  const setFollowupMode: Dispatch<SetStateAction<boolean>> = (value) => setCurrentSession("isLaterSession", value);
  const sessionNumber = currentSession.sessionNumber;
  const setSessionNumber: Dispatch<SetStateAction<number>> = (value) => setCurrentSession("sessionNumber", value);
  const [retestContractVersion, setRetestContractVersion] = useState<0 | 1>(1);
  const followupScore = currentSession.reviewScore;
  const setFollowupScore: Dispatch<SetStateAction<number>> = (value) => setCurrentSession("reviewScore", value);
  const followupScoreConfirmed = currentSession.reviewScoreConfirmed;
  const setFollowupScoreConfirmed: Dispatch<SetStateAction<boolean>> = (value) => setCurrentSession("reviewScoreConfirmed", value);
  const followupScoreHistory = currentSession.scoreHistory;
  const setFollowupScoreHistory: Dispatch<SetStateAction<number[]>> = (value) => setCurrentSession("scoreHistory", value);
  const followupStage = currentSession.phase;
  const setFollowupStage: Dispatch<SetStateAction<FollowupStage>> = (value) => setCurrentSession("phase", value);
  const followupPostScore = currentSession.postScore;
  const setFollowupPostScore: Dispatch<SetStateAction<number>> = (value) => setCurrentSession("postScore", value);
  const followupPostScoreConfirmed = currentSession.postScoreConfirmed;
  const setFollowupPostScoreConfirmed: Dispatch<SetStateAction<boolean>> = (value) => setCurrentSession("postScoreConfirmed", value);
  const followupPostDiscomfort = currentSession.postDiscomfort;
  const setFollowupPostDiscomfort: Dispatch<SetStateAction<YesNo | "">> = (value) => setCurrentSession("postDiscomfort", value);
  const followupCandidateId = currentSession.candidateId;
  const setFollowupCandidateId: Dispatch<SetStateAction<string>> = (value) => setCurrentSession("candidateId", value);
  const followupTrialRecords = currentSession.treatmentRecords;
  const setFollowupTrialRecords: Dispatch<SetStateAction<FollowupTreatmentRecord[]>> = (value) => setCurrentSession("treatmentRecords", value);
  const followupReadyToRetest = currentSession.readyToRetest;
  const setFollowupReadyToRetest: Dispatch<SetStateAction<boolean>> = (value) => setCurrentSession("readyToRetest", value);
  const followupRetestPlan = currentSession.retestPlan;
  const setFollowupRetestPlan: Dispatch<SetStateAction<RetestPlan | null>> = (value) => setCurrentSession("retestPlan", value);
  const followupMovementResponses = currentSession.movementResponses;
  const setFollowupMovementResponses: Dispatch<SetStateAction<Record<string, CompletedRangeRetestAnswer>>> = (value) => setCurrentSession("movementResponses", value);
  const followupMovementDiscomforts = currentSession.movementDiscomforts;
  const setFollowupMovementDiscomforts: Dispatch<SetStateAction<Record<string, YesNo>>> = (value) => setCurrentSession("movementDiscomforts", value);
  const followupMovementScores = currentSession.movementScores;
  const setFollowupMovementScores: Dispatch<SetStateAction<Record<string, number>>> = (value) => setCurrentSession("movementScores", value);
  const followupMovementScoreConfirmed = currentSession.movementScoreConfirmed;
  const setFollowupMovementScoreConfirmed: Dispatch<SetStateAction<Record<string, boolean>>> = (value) => setCurrentSession("movementScoreConfirmed", value);
  const followupTensionLocations = currentSession.tensionLocations;
  const setFollowupTensionLocations: Dispatch<SetStateAction<string[]>> = (value) => setCurrentSession("tensionLocations", value);
  const followupExerciseChoices = currentSession.exerciseChoices;
  const setFollowupExerciseChoicesRaw: Dispatch<SetStateAction<Record<string, FollowupExerciseChoice>>> = (value) => setCurrentSession("exerciseChoices", value);
  const followupTrainingReadyForRetest = currentSession.trainingReadyForRetest;
  const setFollowupTrainingReadyForRetest: Dispatch<SetStateAction<boolean>> = (value) => setCurrentSession("trainingReadyForRetest", value);
  const followupFinalScore = currentSession.finalScore;
  const setFollowupFinalScore: Dispatch<SetStateAction<number>> = (value) => setCurrentSession("finalScore", value);
  const followupFinalScoreConfirmed = currentSession.finalScoreConfirmed;
  const setFollowupFinalScoreConfirmedState: Dispatch<SetStateAction<boolean>> = (value) => setCurrentSession("finalScoreConfirmed", value);
  const followupFinalRetestRecordedAt = currentSession.finalRetestRecordedAt;
  const setFollowupFinalRetestRecordedAt: Dispatch<SetStateAction<string | undefined>> = (value) => setCurrentSession("finalRetestRecordedAt", value);
  const setFollowupFinalScoreConfirmed: Dispatch<SetStateAction<boolean>> = (value) => {
    const next = typeof value === "function" ? value(followupFinalScoreConfirmed) : value;
    setFollowupFinalScoreConfirmedState(next);
    if (next !== followupFinalScoreConfirmed) setFollowupFinalRetestRecordedAt(next ? new Date().toISOString() : undefined);
  };
  const hasNewSymptom = currentSession.hasNewSymptom;
  const setHasNewSymptom: Dispatch<SetStateAction<FollowupNewSymptomAnswer>> = (value) => setCurrentSession("hasNewSymptom", value);
  const followupTrends = currentSession.reviewResults;
  const setFollowupTrends: Dispatch<SetStateAction<Record<string, FollowupReviewAnswer>>> = (value) => setCurrentSession("reviewResults", value);
  const sessionHistory = currentSession.history;
  const setSessionHistory: Dispatch<SetStateAction<RehabSessionSummary[]>> = (value) => setCurrentSession("history", value);
  const sessionHistoryRef = useRef<RehabSessionSummary[]>([]);
  useEffect(() => { sessionHistoryRef.current = sessionHistory; }, [sessionHistory]);
  const [assessmentRevision, setAssessmentRevision] = useState(0);
  const [treatmentPlanRevision, setTreatmentPlanRevision] = useState(0);
  const [persistedRetestObligations, setPersistedRetestObligations] = useState<RetestObligation[]>([]);
  const [persistedRetestRecords, setPersistedRetestRecords] = useState<RetestRecord[]>([]);
  const [adverseResponse, setAdverseResponse] = useState<AdverseResponseEvent | null>(null);
  const [adverseConfirmedAssessmentIds, setAdverseConfirmedAssessmentIds] = useState<string[]>([]);

  function supersedeCurrentTreatmentFacts(
    nextRevision: number,
    reason: "assessment-updated" | "adverse-reassessment",
  ) {
    const supersededAt = new Date().toISOString();
    const appendUnique = <T extends { treatmentRecordId?: string }>(current: T[], additions: T[]) => {
      const known = new Set(current.map((item) => item.treatmentRecordId).filter(Boolean));
      return [...current, ...additions.filter((item) => !item.treatmentRecordId || !known.has(item.treatmentRecordId))];
    };
    if (followupMode) {
      const currentFacts = followupTrialRecords
        .filter((record) => record.sessionNumber === sessionNumber)
        .map((record) => ({
          ...record,
          supersededAt,
          supersededByAssessmentRevision: nextRevision,
          invalidationReason: reason,
        }));
      if (currentFacts.length) setSupersededFollowupTrialRecords((current) => appendUnique(current, currentFacts));
      return;
    }
    const currentFacts = trialRecords.map((record) => ({
      ...record,
      supersededAt,
      supersededByAssessmentRevision: nextRevision,
      invalidationReason: reason,
    }));
    if (currentFacts.length) setSupersededTrialRecords((current) => appendUnique(current, currentFacts));
  }

  function supersedeCurrentRetestFacts(
    nextRevision: number,
    reason: "assessment-updated" | "adverse-reassessment",
  ) {
    const supersededAt = new Date().toISOString();
    const affectedIds = new Set(
      persistedRetestObligations
        .filter((item) => item.sessionId === sessionId && (item.sourceAssessmentRevision ?? 0) < nextRevision)
        .map((item) => item.obligationId),
    );
    if (!affectedIds.size) return;
    setPersistedRetestObligations((current) => current.map((item) => affectedIds.has(item.obligationId)
      ? { ...item, status: "superseded", supersededAt }
      : item));
    setPersistedRetestRecords((current) => current.map((item) => affectedIds.has(item.obligationId) && (item.status ?? "active") === "active"
      ? { ...item, status: "superseded", supersededAt, invalidationReason: reason }
      : item));
  }

  function syncFollowupTrainingSafety(previous: Record<string, FollowupExerciseChoice>, next: Record<string, FollowupExerciseChoice>) {
    const recordedAt = new Date().toISOString();
    const ids = new Set([...Object.keys(previous), ...Object.keys(next)]);
    ids.forEach((exerciseId) => {
      const wasWorse = previous[exerciseId] === "worse";
      const isWorse = next[exerciseId] === "worse";
      if (wasWorse === isWorse) return;
      const label = region?.exercises.find((exercise) => exercise.id === exerciseId)?.title ?? "训练动作";
      if (isWorse) {
        setPersistedRetestObligations((current) => {
          const episodeNumber = current.filter((item) => item.sessionId === sessionId
            && item.kind === "training-safety" && item.targetId === exerciseId).length + 1;
          const episodeId = `training-worse-${episodeNumber}`;
          const obligationId = retestObligationId({ sessionId, kind: "training-safety", targetId: exerciseId, episodeId, assessmentRevision });
          if (current.some((item) => item.obligationId === obligationId)) return current;
          const obligation: RetestObligation = {
            obligationId,
            caseId: localCaseId,
            problemThreadId,
            sessionId,
            kind: "training-safety",
            targetId: exerciseId,
            label,
            episodeId,
            sourceAssessmentRevision: assessmentRevision,
            treatmentRecordIds: [],
            required: true,
            status: "pending",
            createdAt: recordedAt,
          };
          return [...current, obligation];
        });
        return;
      }
      setPersistedRetestObligations((current) => {
        const existing = [...current].reverse().find((item) => item.sessionId === sessionId
          && item.kind === "training-safety" && item.targetId === exerciseId && item.status === "pending");
        if (!existing) return current;
        const sourceEventId = `training-feedback:${sessionId}:${exerciseId}:${existing.episodeId ?? "episode"}:${recordedAt}:handled`;
        setPersistedRetestRecords((records) => {
          const retestRecordId = `retest-result:${existing.obligationId}:${recordedAt}`;
          if (records.some((item) => item.retestRecordId === retestRecordId)) return records;
          return [...records, {
            retestRecordId,
            obligationId: existing.obligationId,
            caseId: localCaseId,
            problemThreadId,
            sessionId,
            sourceAssessmentRevision: assessmentRevision,
            sourceEventId,
            status: "active",
            recordedAt,
            result: "same",
          }];
        });
        const obligation: RetestObligation = {
          ...existing,
          treatmentRecordIds: [...existing.treatmentRecordIds, sourceEventId],
          status: "completed",
          completedAt: recordedAt,
        };
        return current.map((item) => item.obligationId === obligation.obligationId ? obligation : item);
      });
    });
  }
  const setFollowupExerciseChoices: Dispatch<SetStateAction<Record<string, FollowupExerciseChoice>>> = (value) => {
    const next = typeof value === "function" ? value(followupExerciseChoices) : value;
    syncFollowupTrainingSafety(followupExerciseChoices, next);
    const recordedAt = new Date().toISOString();
    setFollowupExerciseChoiceRecordedAt((current) => {
      const updated = { ...current };
      for (const exerciseId of new Set([...Object.keys(followupExerciseChoices), ...Object.keys(next)])) {
        if (followupExerciseChoices[exerciseId] !== next[exerciseId] && next[exerciseId]) updated[exerciseId] = recordedAt;
      }
      return updated;
    });
    setFollowupExerciseChoicesRaw(next);
  };

  useEffect(() => {
    assessmentResultsRef.current = assessmentResults;
  }, [assessmentResults]);

  function syncDisplayState(state: PilotSyncMachineState): PilotSyncDisplayState {
    if (state.status === "syncing" || state.status === "deleting") return "syncing";
    if (state.status === "synced") return "synced";
    if (state.status === "conflict") return "conflict";
    if (state.status === "failed" || state.status === "local_only") return "offline";
    if (state.status === "dirty") return "local-saved";
    return "idle";
  }

  function dispatchPilotSync(identity: string, event: PilotSyncEvent) {
    const current = pilotSyncMachinesRef.current[identity]
      ?? createPilotSyncMachineState(identity, 0, Boolean(pilotConsentRef.current));
    const next = reducePilotSyncState(current, event);
    pilotSyncMachinesRef.current[identity] = next;
    if (activeCaseIdentityRef.current === identity) setPilotSyncState(syncDisplayState(next));
    return { state: next, accepted: next !== current };
  }

  useEffect(() => {
    const controller = createPilotDraftPersistenceController<PersistedPilotDraftEnvelopeV3>({
      delayMs: 800,
      save: (draft) => testStorageWriteBlocked
        ? Promise.reject(new Error("TEST_FAULT_STORAGE_UNAVAILABLE"))
        : saveLocalDraft(draft, storageScope),
      onState: (state) => setPilotSyncState(state),
    });
    draftPersistenceRef.current = controller;
    return () => {
      controller.dispose();
      draftPersistenceRef.current = null;
    };
  }, [storageScope, testStorageWriteBlocked]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_DRAFT_SIGNAL_KEY || !event.newValue) return;
      let signal: LocalDraftStorageSignal;
      try {
        signal = JSON.parse(event.newValue) as LocalDraftStorageSignal;
      } catch {
        return;
      }
      if (signal.version !== 1 || signal.scope !== storageScope || signal.tabId === localTabIdRef.current) return;
      if (signal.action === "cleared") {
        draftPersistenceRef.current?.cancel();
        setMultiTabConflict(signal);
        dispatchPilotSync(activeCaseIdentityRef.current, { type: "restore-conflict", caseId: activeCaseIdentityRef.current });
        return;
      }
      const localFingerprint = currentDraftFingerprintRef.current;
      if (!signal.fingerprint || !localFingerprint || signal.fingerprint === localFingerprint) return;
      // 另一个标签页已经写入不同草稿：停止本页的防抖写入，保留当前内存内容，
      // 让用户明确选择重新读取或保留本页，禁止静默覆盖对方版本。
      draftPersistenceRef.current?.cancel();
      setMultiTabConflict(signal);
      dispatchPilotSync(activeCaseIdentityRef.current, { type: "restore-conflict", caseId: activeCaseIdentityRef.current });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // dispatchPilotSync reads the latest machine from a ref; recreating this listener on every render would lose no state but add churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageScope]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await loadLocalCaseRecords<PersistedSavedDemoRecordV3>(storageScope);
          const records = result.records.map(normalizePersistedRecord).filter((record): record is SavedDemoRecord => Boolean(record));
          savedRecordsRef.current = records;
          setSavedRecords(records);
          const draftResult = await loadLocalDraftWithDiagnostics<PersistedPilotDraftEnvelopeV3>(storageScope);
          const draft = draftResult.draft;
          const draftSnapshot = draft ? normalizeSavedDemoSnapshot(draft.snapshot) : null;
          if (draft && draftSnapshot) {
            const storedRecord = records.find((record) => savedRecordIdentity(record) === draft.localCaseId);
            await restoreRecord({
              ...storedRecord,
              id: "active-draft",
              localCaseId: draft.localCaseId,
              savedAt: draft.savedAt,
              region: draftSnapshot.intake.regionId,
              complaint: draftSnapshot.intake.description,
              goal: getGoalLabel(draftSnapshot.intake.goal),
              initialScore: draftSnapshot.intake.baselineScore,
              latestScore: draftSnapshot.intake.baselineScore,
              scoreComparable: false,
              sessionCount: draftSnapshot.sessionNumber,
              status: "康复中",
              snapshot: draftSnapshot,
              pilotSnapshotUpdatedAt: storedRecord?.pilotSnapshotUpdatedAt ?? draft.savedAt,
              pilotDirty: Boolean(storedRecord?.pilotCaseId) || storedRecord?.pilotDirty,
              localContentFingerprint: contentFingerprint(draftSnapshot),
            }, { preferLocalSnapshot: true });
            setToast("已恢复本机草稿");
            window.setTimeout(() => setToast(""), 2400);
          } else if (result.diagnostic || draftResult.diagnostic) {
            setPilotSyncState("error");
            setToast("发现无法读取的本机记录，原始副本已保留；请勿清理浏览器数据");
          }
          draftHydratedRef.current = true;
          if (testContext) {
            setOnboardingOpen(false);
            setPilotSourceGateOpen(false);
            setPilotConsentGateOpen(false);
            return;
          }
          const storedConsent = readPilotConsent(window.localStorage);
          const consentState = storedConsent ? "confirmed" : isPilotConsentDeclined(window.localStorage) ? "declined" : "missing";
          if (storedConsent) {
            pilotConsentRef.current = storedConsent;
          }
          const storedSource = readPilotSource(window.localStorage);
          if (storedSource) pilotSourceRef.current = storedSource;
          const tutorialSeen = localStorage.getItem(onboardingStorageKey) === "seen";
          const firstOverlay = resolvePilotFirstUseOverlay({ tutorialSeen, sourceSelected: Boolean(storedSource), consent: consentState });
          setOnboardingOpen(firstOverlay === "tutorial");
          setPilotSourceGateOpen(firstOverlay === "source");
          setPilotConsentGateOpen(firstOverlay === "consent" || firstOverlay === "blocked");
          setPilotConsentDeclined(firstOverlay === "blocked");
        } catch {
          savedRecordsRef.current = [];
          setSavedRecords([]);
          setPilotSyncState("offline");
          setToast("本机案例读取失败，请不要清理浏览器数据");
          setOnboardingOpen(true);
          draftHydratedRef.current = true;
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
    // Restore runs again only when a test shell deliberately changes its isolated context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageScope, testContext]);

  async function persistLocalRecords(records: SavedDemoRecord[]) {
    await recordsPersistenceRef.current?.enqueue(records);
  }

  function closeOnboarding(outcome: "completed" | "skipped") {
    try {
      localStorage.setItem(onboardingStorageKey, "seen");
    } catch {
      // The guide still closes for this session when storage is unavailable.
    }
    setOnboardingOpen(false);
    void recordPilotFirstUseEvent(outcome === "completed" ? "tutorial_completed" : "tutorial_skipped");
    if (!pilotSourceRef.current) {
      setPilotSourceGateOpen(true);
    } else if (!pilotConsentRef.current) {
      const declined = isPilotConsentDeclined(window.localStorage);
      setPilotConsentDeclined(declined);
      setPilotConsentGateOpen(true);
    } else if (firstUseIntentRef.current === "continue") {
      setRecordsOpen(true);
    }
  }

  function startFromWelcome() {
    firstUseIntentRef.current = "new";
    closeOnboarding("completed");
  }

  function devResetFlow() {
    try {
      localStorage.removeItem(onboardingStorageKey);
    } catch {}
    window.location.reload();
  }

  function devClearAllData() {
    try {
      localStorage.clear();
    } catch {}
    indexedDB.deleteDatabase("rehabmind-local-cases");
    window.location.reload();
  }

  function devJumpToStep(target: Step) {
    setStep(target);
    setToast(`已跳转到「${STEPS[target]}」（开发模式）`);
    window.setTimeout(() => setToast(""), 2000);
  }

  function continueFromWelcome() {
    firstUseIntentRef.current = "continue";
    closeOnboarding("skipped");
  }

  function handlePilotSourceContinue(source: PilotSourceRecord) {
    pilotSourceRef.current = source;
    setPilotSourceGateOpen(false);
    try {
      writePilotSource(window.localStorage, source);
    } catch {
      // 会话内仍然生效；存储被禁用时下次访问会再次询问。
    }
    if (!pilotConsentRef.current) {
      setPilotConsentDeclined(isPilotConsentDeclined(window.localStorage));
      setPilotConsentGateOpen(true);
    }
  }

  async function createInitialPilotCaseRecord(consent: PilotConsentRecord) {
    const source = pilotSourceRef.current;
    if (!source) throw new Error("source is required before case creation");
    const existing = findLocalCaseRecord(savedRecordsRef.current, localCaseId);
    if (existing?.pilotCaseId) return existing;
    const snapshot = buildCurrentSnapshot();
    const clientCreationId = existing?.pilotClientCreationId ?? createPilotClientCreationId();
    const accessToken = existing?.pilotAccessToken ?? createPilotAccessToken();
    const access = await createPilotCase({
      clientCreationId,
      accessToken,
      initialSnapshot: persistSavedDemoSnapshot(snapshot),
      currentStage: STEPS[snapshot.step] ?? STEPS[0],
      isBilateral: snapshot.intake.side === "双侧/中间",
      hasSafetyStop: Object.values(snapshot.safety).some((value) => value === "yes"),
      source,
      consent,
    });
    // DEF-CONSENT-01：服务端 201 即建案成功——此刻立刻关门，不等本地记录
    // 构建与缓存写入，消除自动化探测下的瞬态残留窗口（真实用户同样更顺滑）。
    setPilotConsentGateOpen(false);
    setPilotConsentDeclined(false);
    const initialRecord: SavedDemoRecord = {
      id: `case-${sessionNumber}-${Math.max(0, ...savedRecordsRef.current.map((item) => Number(item.id.match(/-(\d+)$/)?.[1] ?? 0))) + 1}`,
      localCaseId,
      savedAt: "案例已创建",
      region: "待确认",
      complaint: intake.description.trim() || "待描述",
      goal: intake.goal ? getGoalLabel(intake.goal) : "待确认",
      initialScore: intake.baselineScore,
      latestScore: intake.baselineScore,
      scoreComparable: false,
      sessionCount: sessionNumber,
      status: "评估未完成",
      snapshot,
      pilotSnapshotUpdatedAt: new Date().toISOString(),
      pilotCaseId: access.caseId,
      pilotClientCreationId: clientCreationId,
      pilotPublicCode: access.publicCode,
      pilotAccessToken: access.accessToken,
      pilotRevision: access.revision,
      pilotLastSyncedRevision: access.revision,
      pilotDirty: false,
      localContentFingerprint: persistedSnapshotFingerprint(snapshot),
      lastSyncedContentFingerprint: persistedSnapshotFingerprint(snapshot),
      pilotVersions: access.versions,
    };
    const next = [initialRecord, ...savedRecordsRef.current.filter((item) => savedRecordIdentity(item) !== localCaseId)];
    savedRecordsRef.current = next;
    setSavedRecords(next);
    // DEF-CONSENT-01：建案成功即视为可关门；本地缓存写入转为后台执行，
    // 失败不阻断流程——同意事实已先行落盘（加固二），同步队列稍后自愈。
    void persistLocalRecords(next).catch(() => {
      // 本地缓存写失败时保留内存记录，等待下次保存或恢复路径补齐。
    });
    dispatchPilotSync(localCaseId, { type: "restore-succeeded", caseId: localCaseId, revision: access.revision });
    return initialRecord;
  }

  async function handlePilotConsentAgree() {
    const record = buildPilotConsentRecord(new Date().toISOString());
    pilotConsentRef.current = record;

    // DEF-CONSENT-01 加固二（保守版）：同意事实先落盘——建案挂起或失败时，
    // 刷新不再重复弹同意门；关门时机保持不变（建案成功才关）。
    try {
      writePilotConsent(window.localStorage, record);
      window.localStorage.removeItem("rehabmind-pilot-consent-declined");
    } catch {
      // 会话内仍然生效；存储被禁用时下次访问会再次询问。
    }

  let timeoutId: number | undefined;
  try {
    if (firstUseIntentRef.current === "new" || !savedRecordsRef.current.length) {
      // DEF-CONSENT-01 加固一：建案链路 15s 超时兜底，消灭“永远正在创建”。
      await Promise.race([
        createInitialPilotCaseRecord(record),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new PilotCaseClientError(0, "timeout", "案例创建超时，请检查网络后重试")), 15000);
        }),
      ]);
    }
  } catch (error) {
    throw error;
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }

    setPilotConsentGateOpen(false);
    setPilotConsentDeclined(false);
    void recordPilotFirstUseEvent("consent_confirmed");
    if (firstUseIntentRef.current === "continue") setRecordsOpen(true);
    if (firstUseIntentRef.current !== "continue" && !hasSeenFocusTutorial()) {
      setFocusTutorialOpen(true);
    }
    setToast(firstUseIntentRef.current === "continue" ? "请选择以前的康复记录" : "匿名案例已创建，可以开始描述问题");
    window.setTimeout(() => setToast(""), 2400);
  }

  function hasSeenFocusTutorial() {
    try {
      return window.localStorage.getItem(focusTutorialStorageKey) === "seen";
    } catch {
      return true;
    }
  }

  function markFocusTutorialSeen() {
    setFocusTutorialOpen(false);
    try {
      window.localStorage.setItem(focusTutorialStorageKey, "seen");
    } catch {
      // 存储被禁用时仅本次会话生效。
    }
  }

  function handlePilotConsentDecline() {
    setPilotConsentDeclined(true);
    void recordPilotFirstUseEvent("consent_declined");
    try {
      markPilotConsentDeclined(window.localStorage);
    } catch {
      // 存储被禁用时仅本次会话不再询问。
    }
  }

  function handlePilotConsentReconsider() {
    setPilotConsentDeclined(false);
    try {
      window.localStorage.removeItem("rehabmind-pilot-consent-declined");
    } catch {
      // 会话内仍可重新确认。
    }
  }

  function updateStoredPilotRecord(identity: string, patch: Partial<SavedDemoRecord>) {
    if (deletedCaseIdentitiesRef.current.has(identity)) return;
    const next = savedRecordsRef.current.map((item) => savedRecordIdentity(item) === identity ? { ...item, ...patch } : item);
    savedRecordsRef.current = next;
    setSavedRecords(next);
    void persistLocalRecords(next).catch(() => setPilotSyncState("error"));
  }

  async function copyPilotPublicCode(record: SavedDemoRecord) {
    if (!record.pilotPublicCode) {
      setToast("案例编号正在生成，请稍后再试");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    try {
      await navigator.clipboard.writeText(record.pilotPublicCode);
      setToast("案例编号已复制");
    } catch {
      setToast(`案例编号：${record.pilotPublicCode}`);
    }
    window.setTimeout(() => setToast(""), 2400);
  }

  function exportPilotLocalConflict(record: SavedDemoRecord) {
    if (!record.snapshot) return;
    const blob = new Blob([JSON.stringify({ schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION, localCaseId: record.localCaseId, savedAt: record.savedAt, snapshot: persistSavedDemoSnapshot(record.snapshot) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${record.pilotPublicCode ?? record.localCaseId ?? record.id}-local-conflict.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("这台设备的记录已导出");
    window.setTimeout(() => setToast(""), 2400);
  }

  async function deleteSavedRecord(record: SavedDemoRecord) {
    const identity = savedRecordIdentity(record);
    const deleteRequestId = `delete:${identity}:${Date.now()}`;
    dispatchPilotSync(identity, { type: "delete-started", caseId: identity, requestId: deleteRequestId });
    deletedCaseIdentitiesRef.current.add(identity);
    pilotSaveQueueRef.current.block(identity);
    await pilotSaveQueueRef.current.drain(identity).catch(() => undefined);
    const latestRecord = savedRecordsRef.current.find((item) => savedRecordIdentity(item) === identity) ?? record;
    const access = pilotAccessFromRecord(latestRecord);
    if (access) {
      try {
        await deletePilotCase(access);
      } catch {
        deletedCaseIdentitiesRef.current.delete(identity);
        pilotSaveQueueRef.current.unblock(identity);
        dispatchPilotSync(identity, { type: "delete-failed", caseId: identity, requestId: deleteRequestId, code: "remote-delete-failed" });
        setToast("服务器暂时无法删除，请恢复连接后再试");
        window.setTimeout(() => setToast(""), 2800);
        return;
      }
    }
    const next = savedRecordsRef.current.filter((item) => savedRecordIdentity(item) !== identity && item.id !== record.id);
    delete lastPilotEventIdsRef.current[identity];
    delete stageEventSeenRef.current[identity];
    delete lastStageForEventsRef.current[identity];
    pilotSaveQueueRef.current.clear(identity);
    if (identity === activeCaseIdentityRef.current) {
      draftPersistenceRef.current?.cancel();
      void clearLocalDraft(storageScope);
    }
    savedRecordsRef.current = next;
    setSavedRecords(next);
    dispatchPilotSync(identity, { type: "delete-succeeded", caseId: identity, requestId: deleteRequestId });
    try {
      await persistLocalRecords(next);
    } catch {
      setToast("服务器案例已删除，但本机记录清理失败");
      window.setTimeout(() => setToast(""), 2800);
      return;
    }
    setToast("案例已删除");
    window.setTimeout(() => setToast(""), 2400);
  }

  async function clearAllLocalRecords() {
    try {
      await recordsPersistenceRef.current?.drain();
      await clearLocalCaseRecords(storageScope);
      draftPersistenceRef.current?.cancel();
      await clearLocalDraft(storageScope);
      savedRecordsRef.current = [];
      setSavedRecords([]);
      lastPilotEventIdsRef.current = {};
      stageEventSeenRef.current = {};
      lastStageForEventsRef.current = {};
      deletedCaseIdentitiesRef.current.clear();
      pilotSaveQueueRef.current.clearAll();
      pilotSyncMachinesRef.current = {};
      setPilotSyncState("idle");
      setToast("本机案例已清空");
    } catch {
      setPilotSyncState("offline");
      setToast("本机案例清理失败，请稍后重试");
    }
    window.setTimeout(() => setToast(""), 2400);
  }

  function pilotAccessFromRecord(record: SavedDemoRecord): PilotCaseAccess | null {
    if (!record.pilotCaseId || !record.pilotPublicCode || !record.pilotAccessToken || !Number.isInteger(record.pilotRevision)) return null;
    return {
      caseId: record.pilotCaseId,
      publicCode: record.pilotPublicCode,
      accessToken: record.pilotAccessToken,
      revision: record.pilotRevision ?? 0,
      versions: record.pilotVersions ?? {
        appVersion: "unknown",
        knowledgeVersion: "unknown",
        decisionVersion: "unknown",
      },
    };
  }

  function enqueuePilotRecordSync(record: SavedDemoRecord, options?: {
    eventType?: string;
    snapshot?: SavedDemoSnapshot;
    workflowProjectionInput?: WorkflowProjectionInput;
  }) {
    if (!record.snapshot) return Promise.resolve(false);
    // PRIV-01：未同意试用条款前，任何记录都只保存在本机，不创建远端案例。
    const consentRecord = pilotConsentRef.current;
    const sourceRecord = pilotSourceRef.current;
    if (!consentRecord || !sourceRecord) return Promise.resolve(false);
    const snapshot = record.snapshot;
    const identity = savedRecordIdentity(record);
    if (deletedCaseIdentitiesRef.current.has(identity)) return Promise.resolve(false);
    let operation: PilotSyncOperation | null = null;
    let telemetryAccess = pilotAccessFromRecord(record);
    const task = pilotSaveQueueRef.current.enqueue(identity, async () => {
        const latestRecord = savedRecordsRef.current.find((item) => savedRecordIdentity(item) === identity) ?? record;
        // 阶段事件发生在页面状态推进之后，但案例列表中的持久化镜像可能
        // 仍是上一个手动保存点。调用方显式提供事件时刻快照，保证事件、
        // 工作流投影和服务器 snapshot 属于同一个状态版本。
        const currentSnapshot = options?.snapshot ?? latestRecord.snapshot ?? snapshot;
        let access = pilotAccessFromRecord(latestRecord);
        if (!access) {
          dispatchPilotSync(identity, { type: "remote-create-started", caseId: identity });
          const clientCreationId = latestRecord.pilotClientCreationId ?? createPilotClientCreationId();
          const accessToken = latestRecord.pilotAccessToken ?? createPilotAccessToken();
          updateStoredPilotRecord(identity, {
            pilotClientCreationId: clientCreationId,
            pilotAccessToken: accessToken,
          });
          access = await createPilotCase({
            clientCreationId,
            accessToken,
            initialSnapshot: persistSavedDemoSnapshot(currentSnapshot),
            currentStage: STEPS[currentSnapshot.step] ?? STEPS[0],
            isBilateral: currentSnapshot.intake.side === "双侧/中间",
            hasSafetyStop: Object.values(currentSnapshot.safety).some((value) => value === "yes"),
            source: sourceRecord,
            consent: consentRecord,
            testContext,
          });
          telemetryAccess = access;
          updateStoredPilotRecord(identity, {
            pilotCaseId: access.caseId,
            pilotPublicCode: access.publicCode,
            pilotAccessToken: access.accessToken,
            pilotRevision: access.revision,
            pilotLastSyncedRevision: access.revision,
            pilotSnapshotUpdatedAt: latestRecord.pilotSnapshotUpdatedAt ?? new Date().toISOString(),
            lastSyncedContentFingerprint: persistedSnapshotFingerprint(currentSnapshot),
            pilotVersions: access.versions,
          });
        }

        const eventType = options?.eventType ?? "session_saved";
        const eventId = pilotProgressEventId(access.caseId, eventType, persistedSnapshotFingerprint(currentSnapshot));
        const currentSessionId = currentSnapshot.sessionId ?? latestRecord.sessionId ?? `${identity}:session-${latestRecord.sessionCount}`;
        const currentProblemThreadId = currentSnapshot.problemThreadId ?? latestRecord.problemThreadId ?? `thread-${identity}`;
        // 草稿可以同步用于跨设备恢复，但不能在服务端被统计成已完成会话。
        const persistedSessionCount = currentSnapshot.sessionStatus === "draft" || latestRecord.sessionStatus === "draft"
          ? Math.max(0, latestRecord.sessionCount - 1)
          : latestRecord.sessionCount;
        operation = {
          caseId: identity,
          sessionId: currentSessionId,
          requestId: `request:${eventId}`,
          baseRevision: access.revision,
        };
        dispatchPilotSync(identity, { type: "remote-save-started", operation });
        if (testContext?.faultMode === "network") {
          throw new PilotCaseClientError(0, "network", "TEST_FAULT_NETWORK_UNAVAILABLE");
        }
        if (testContext?.faultMode === "timeout") {
          throw new PilotCaseClientError(0, "timeout", "TEST_FAULT_REQUEST_TIMEOUT");
        }
        const progress = await savePilotCaseProgress({
          access,
          snapshot: persistSavedDemoSnapshot({ ...currentSnapshot, consent: consentRecord }),
          requestId: operation.requestId,
          sessionId: operation.sessionId,
          problemThreadId: currentProblemThreadId,
          eventId,
          eventType,
          eventPayload: {
            raw: { complaint: latestRecord.complaint },
            parsed: { localCaseId: identity, legacyCaseKey: latestRecord.caseKey, status: latestRecord.status, step: currentSnapshot.step, problemThreadId: currentProblemThreadId, sessionId: currentSessionId },
            inferred: { sessionNumber: latestRecord.sessionCount, sessionStatus: currentSnapshot.sessionStatus ?? latestRecord.sessionStatus ?? "draft" },
            workflow: { projectionInput: options?.workflowProjectionInput ?? workflowProjection.input },
            clinical: {
              // 事件保留当时的临床记录快照，配合 eventSchemaVersion、sessionId
              // 和 problemThreadId 可在没有依赖页面数组的情况下重建事件发生时的状态；
              // 下方的 *Ids 仍保留给后台列表做轻量索引。
              intake: {
                regionId: currentSnapshot.intake.regionId,
                side: currentSnapshot.intake.side,
                location: currentSnapshot.intake.location,
                onset: currentSnapshot.intake.onset,
                mechanism: currentSnapshot.intake.mechanism,
                symptomType: currentSnapshot.intake.symptomType,
                symptoms: currentSnapshot.intake.symptoms,
                provocationTypes: effectiveProvocationTypes(currentSnapshot.intake),
                medicalGuidance: currentSnapshot.intake.medicalGuidance,
              },
              assessmentResults: currentSnapshot.assessmentResults,
              trialRecords: currentSnapshot.trialRecords,
              bodyMarks: currentSnapshot.bodyMarks ?? [],
              scoreRecords: currentSnapshot.scoreRecords ?? [],
              specialTestRecords: currentSnapshot.specialTestRecords ?? [],
              professionalNoteRecords: currentSnapshot.professionalNoteRecords ?? [],
              decisionTraces: currentSnapshot.decisionTraces ?? [],
              problemThreads: currentSnapshot.problemThreads ?? [],
              sessionIndex: currentSnapshot.sessionIndex ?? [],
              capabilitySnapshotId: currentSnapshot.capabilitySnapshotId,
              bodyMarkIds: (currentSnapshot.bodyMarks ?? []).map((mark) => ({ id: mark.markId, status: mark.status, symptomKind: mark.symptomKind, side: mark.side, regionId: mark.regionId, areaId: mark.areaId })),
              scoreRecordIds: (currentSnapshot.scoreRecords ?? []).map((score) => ({ id: score.scoreRecordId, state: score.scoreState, value: score.value, stage: score.stage, context: score.context })),
              specialTestRecordIds: (currentSnapshot.specialTestRecords ?? []).map((record) => ({ id: record.specialTestRecordId, result: record.result, assessmentId: record.assessmentId, capabilitySnapshotId: record.capabilitySnapshotId })),
              professionalNoteIds: (currentSnapshot.professionalNoteRecords ?? []).map((note) => ({ id: note.noteId, supersedesNoteId: note.supersedesNoteId })),
              decisionTraceIds: (currentSnapshot.decisionTraces ?? []).map((trace) => ({ id: trace.traceId, sourceCaseIds: trace.sourceCaseIds, findingIds: trace.findingIds, ruleIds: trace.ruleIds, knowledgeVersion: trace.knowledgeVersion, decisionVersion: trace.decisionVersion })),
            },
          },
          currentStage: STEPS[currentSnapshot.step] ?? STEPS[0],
          isBilateral: currentSnapshot.intake.side === "双侧/中间",
          hasSafetyStop: Object.values(currentSnapshot.safety).some((value) => value === "yes"),
          sessionCount: persistedSessionCount,
        });
        const syncResult = dispatchPilotSync(identity, {
          type: "remote-save-succeeded",
          operation,
          revision: progress.snapshot.revision,
        });
        if (!syncResult.accepted) return false;
        updateStoredPilotRecord(identity, {
          pilotCaseId: access.caseId,
          pilotPublicCode: access.publicCode,
          pilotAccessToken: access.accessToken,
          pilotRevision: progress.snapshot.revision,
          pilotLastSyncedRevision: progress.snapshot.revision,
          pilotDirty: false,
          snapshot: currentSnapshot,
          pilotSnapshotUpdatedAt: progress.snapshot.updatedAt,
          localContentFingerprint: persistedSnapshotFingerprint(currentSnapshot),
          lastSyncedContentFingerprint: persistedSnapshotFingerprint(currentSnapshot),
          pilotVersions: access.versions,
        });
        lastPilotEventIdsRef.current[identity] = typeof progress.event.id === "string" ? progress.event.id : null;
        return true;
      })
      .catch((error: unknown) => {
        if (operation) {
          dispatchPilotSync(identity, error instanceof PilotCaseClientError && error.status === 409
            ? { type: "conflict-detected", operation }
            : { type: "remote-save-failed", operation, code: "remote-save-failed" });
        } else {
          dispatchPilotSync(identity, { type: "remote-create-failed", caseId: identity, code: "remote-create-failed" });
        }
        if (activeCaseIdentityRef.current === identity) {
          if (testStorageWriteBlocked) setPilotSyncState("error");
          setToast(testStorageWriteBlocked
              ? localSaveFailureCopy(true)
              : error instanceof PilotCaseClientError && error.status === 409
                ? "本机已保存，但服务器记录已变化，请刷新后继续"
                : "本机已保存，服务器暂时未同步");
          window.setTimeout(() => setToast(""), 2800);
        }
        if (telemetryAccess) {
          void recordPilotCaseOperation(
            error instanceof PilotCaseClientError && error.status === 409 ? "save_conflict" : "save_failed",
            telemetryAccess,
          );
        }
        return false;
      });
    return task.then((succeeded) => succeeded ?? false);
  }

  function savePilotConflictAsNew(record: SavedDemoRecord) {
    const nextIdentity = createLocalCaseId();
    const copied = buildPilotConflictCaseCopy(record as unknown as Record<string, unknown>, {
      id: nextIdentity,
      localCaseId: nextIdentity,
    }) as unknown as SavedDemoRecord;
    const next = [copied, ...savedRecordsRef.current];
    savedRecordsRef.current = next;
    setSavedRecords(next);
    void persistLocalRecords(next);
    void restoreRecord(copied);
    void enqueuePilotRecordSync(copied);
    setToast("已另存为新案例，原来的两份记录仍然保留");
    window.setTimeout(() => setToast(""), 2800);
  }

  // AUDIT-02：阶段首次推进时向服务器时间线写入对应字典事件，
  // 让一个案例能按序复原「输入→确认→评估→处理→训练」的推进轨迹。
  useEffect(() => {
    if (reviewStep !== null) return;
    if (!pilotConsentRef.current) return;
    const identity = localCaseId;
    const active = findLocalCaseRecord(savedRecordsRef.current, identity);
    if (!active) {
      lastStageForEventsRef.current[identity] = step;
      return;
    }
    if (!active.pilotCaseId) {
      lastStageForEventsRef.current[identity] = step;
      return;
    }
    const seen = (stageEventSeenRef.current[identity] ??= []);
    let cursor = lastStageForEventsRef.current[identity] ?? -1;
    if (cursor < 0) cursor = step; // 首次挂载不回放历史阶段
    lastStageForEventsRef.current[identity] = step;
    const eventType = pickStageAdvanceEvent({ prev: cursor, next: step, seen });
    if (!eventType) return;
    const eventSnapshot = buildCurrentSnapshot();
    void enqueuePilotRecordSync(active, {
      eventType,
      snapshot: eventSnapshot,
      workflowProjectionInput: workflowProjection.input,
    }).then((saved) => {
      if (saved) markStageEventSeen(seen, eventType);
    });
    // The sync action intentionally reads current refs; adding its render-local identity would replay stage events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reviewStep, localCaseId]);

  const region = useMemo<FullRegion | undefined>(() => FULL_REGIONS.find((item) => item.id === intake.regionId), [intake.regionId]);
  const workflowProfile = useMemo(() => intake.productMode
    ? normalizeWorkflowProfile({
      productMode: intake.productMode,
      operationTarget: intake.operationTarget,
      capabilities: intake.capabilities,
      learningExplanation: intake.learningExplanation,
    })
    : workflowProfileFromLegacy(intake.userRole, intake.examSetup), [intake.productMode, intake.operationTarget, intake.capabilities, intake.learningExplanation, intake.userRole, intake.examSetup]);
  const canAssessPassive = workflowProfile.canAssessPassive;
  const canAssessResistance = workflowProfile.canAssessResistance;
  const canAssessEndFeel = workflowProfile.canAssessEndFeel;
  const canRunSpecialTest = workflowProfile.canRunSpecialTest;
  const canMobilizeJoint = workflowProfile.canMobilizeJoint;
  const isThinkingMode = workflowProfile.productMode === "thinking";
  const medicalGuidance = useMemo(() => deriveMedicalGuidance(intake.priorCare, imaging), [intake.priorCare, imaging]);
  const currentBodyMarks = useMemo(() => [
    ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: sessionStartedAt, symptomKind: "complaint", selections: [...intake.bodyLocationHistory, ...intake.bodyLocations], confirmed: intake.locationConfirmed }),
    ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: sessionStartedAt, symptomKind: "swelling", selections: intake.swellingLocations, confirmed: intake.swellingLocationConfirmed }),
    ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: sessionStartedAt, symptomKind: "tenderness", selections: intake.tendernessLocations, confirmed: intake.tendernessLocationConfirmed }),
    ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: sessionStartedAt, symptomKind: "sensory", selections: intake.sensoryLocations, confirmed: intake.sensoryLocationConfirmed }),
  ], [localCaseId, problemThreadId, sessionId, sessionStartedAt, intake.bodyLocationHistory, intake.bodyLocations, intake.locationConfirmed, intake.swellingLocations, intake.swellingLocationConfirmed, intake.tendernessLocations, intake.tendernessLocationConfirmed, intake.sensoryLocations, intake.sensoryLocationConfirmed]);

  function notifyCapabilityChange(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function toggleIntakeCapability(key: CapabilityKey) {
    const result = toggleCapability(intakeRef.current.capabilities, key);
    if (!result.accepted) {
      notifyCapabilityChange(result.message ?? "当前能力组合不能这样选择。");
      return;
    }
    const next = {
      ...intakeRef.current,
      capabilities: result.capabilities,
      capabilitiesConfirmed: true,
    };
    intakeRef.current = next;
    setIntake(next);
    // 能力配置是“本次检查的前提”，不是新的主诉。切换它时只让待执行的
    // 评估/处理方案重新计算；已经完成的检查、处理、复测和历史会话必须保留，
    // 否则用户只是勾掉一个能力，就会把真实发生过的记录一并抹掉。
    setReviewStep(null);
    setReviewStepEditable(false);
    setTransitionTarget(null);
    setAssessmentIndex(0);
    assessmentFocusIdRef.current = "";
    setAssessmentSummaryOpen(false);
    setSharedTensionOpen(false);
    setThinkingWorkbenchOpen(false);
    setTrialTargetIndex(0);
    setPendingTrialAdvance(null);
    setCandidateIndex(0);
    setSelectedOptionalCandidateIds([]);
    setBilateralNeedsReferral(false);
    setMidpointDecisionDone(false);
    setBilateralTreatmentSides({});
    setBilateralRetestResponses({});
    setReadyToRetest(false);
    setRetestPlan(null);
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setFunctionRetestCompletion("");
    setFunctionRetestUnableReason("");
    setTreatmentFunctionRetests({});
    setFinalFunctionRetests({});
    setTrainingComplete(false);
    setTrainingPlanSaved(false);
    setExerciseFeedback({});
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setAdverseResponse(null);
    setAdverseConfirmedAssessmentIds([]);
    archivedProblemThreadIdsRef.current.clear();
    // 方案会在当前渲染中按新能力配置重新计算；用同一新 revision 标记这次
    // 重新计算已经完成，同时不删除历史 trialRecords。
    setAssessmentRevision((current) => {
      const nextRevision = Math.max(1, current + 1);
      setTreatmentPlanRevision(nextRevision);
      return nextRevision;
    });
    if (result.message) notifyCapabilityChange(result.message);
  }

  function reloadFromOtherTab() {
    draftPersistenceRef.current?.cancel();
    setMultiTabConflict(null);
    window.location.reload();
  }

  function keepCurrentTabVersion() {
    setMultiTabConflict(null);
    currentDraftFingerprintRef.current = localDraftContentFingerprint({ snapshot: persistSavedDemoSnapshot(buildCurrentSnapshot()) });
    setPilotSyncState("local-saved");
    setToast("已保留当前页面，接下来会另存一份草稿");
    window.setTimeout(() => setToast(""), 2800);
  }

  const assessments = useMemo<AssessmentItem[]>(() => {
    if (!region) return [];
    const forceTags = new Set(forceDirectionTags(intake.forceDirection));
    const strengthSource = `${intake.location} ${intake.description}`;
    const strengthLocationScore = (id: string) => {
      if (region.id === "knee") {
        if (includesAny(strengthSource, ["膝前", "髌骨", "髌腱"])) return id === "knee-quadriceps" ? 9 : id === "knee-posterior-chain" ? 3 : 0;
        if (includesAny(strengthSource, ["膝内侧", "鹅足", "内侧关节线"])) return id === "knee-adductor-pes" ? 9 : id === "knee-glute" ? 5 : id === "knee-posterior-chain" ? 3 : 0;
        if (includesAny(strengthSource, ["膝外侧", "腓骨头", "外侧关节线"])) return id === "knee-glute" ? 9 : id === "knee-adductor-pes" ? 5 : id === "knee-posterior-chain" ? 3 : 0;
        if (includesAny(strengthSource, ["膝后", "腘窝", "大腿后侧"])) return id === "knee-hamstring" ? 9 : id === "knee-posterior-chain" ? 6 : 0;
        if (includesAny(strengthSource, ["小腿上端", "小腿"] )) return id === "knee-calf" ? 8 : id === "knee-posterior-chain" ? 3 : 0;
        return id === "knee-quadriceps" ? 2 : id === "knee-posterior-chain" ? 1 : 0;
      }
      if (includesAny(strengthSource, ["外踝", "外侧", "崴脚"])) return id === "ankle-evertor" ? 8 : id === "ankle-dorsiflexor" ? 4 : 0;
      if (includesAny(strengthSource, ["内踝", "足弓内侧"])) return id === "ankle-invertor" ? 8 : id === "ankle-calf" ? 3 : 0;
      if (includesAny(strengthSource, ["踝前", "脚背"])) return id === "ankle-dorsiflexor" ? 8 : 0;
      if (includesAny(strengthSource, ["跟腱", "踝后", "脚跟"])) return id === "ankle-calf" ? 8 : 0;
      return 0;
    };
    const motionPriority = (id: string) => {
      if (["knee-extension", "knee-flexion"].includes(id)) return 30;
      if (region.id === "knee" && includesAny(intake.location, ["内侧", "外侧", "关节线"]) && ["knee-patella-medial", "knee-patella-lateral"].includes(id)) return 20;
      if (region.id === "knee" && includesAny(intake.location, ["膝前", "髌骨", "髌骨下方"]) && id.startsWith("knee-patella")) return 20;
      return 0;
    };
    const motionItems: AssessmentItem[] = region.directions
      .filter((item) => directionIsRelevant(region.id, item.id, intake))
      // 纯被动项目（例如髌骨滑动）必须由资料显式声明；不能靠页面标题猜测。
      // 自助模式或没有被动检查能力时不展示，避免把被动检查误解成主动发力。
      .filter((item) => {
        const reviewedAccess = p0AssessmentAccess(`motion:${item.id}`, workflowProfile);
        return reviewedAccess ? reviewedAccess.visible : item.testMode !== "passive" || canAssessPassive;
      })
      .sort((a, b) => motionPriority(b.id) - motionPriority(a.id))
      .map((item) => {
      const comparison = motionComparisonMode(region.id, item.id);
      const copy = assessmentCopy(item.id, item.how, item.observe);
      const professionalCopy = professionalAssessmentCopy(item.id, item.how, item.observe);
      const reviewedAccess = p0AssessmentAccess(`motion:${item.id}`, workflowProfile);
      return {
        id: `motion:${item.id}`,
        kind: "motion",
        title: intake.side === "双侧/中间" ? bilateralAssessmentCopy(assessmentTitle(item.id, item.title)) : assessmentTitle(item.id, item.title),
        how: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.how) : copy.how,
        passiveHow: passiveMotionInstruction(comparison),
        professionalHow: professionalCopy.how,
        professionalObserve: professionalCopy.observe,
        observe: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.observe) : copy.observe,
        explain: item.explain,
        tags: item.tags,
        comparison,
        spinal: isSpinalRegion(region.id),
        testMode: item.testMode ?? "combined",
        allowsPassiveAssessment: reviewedAccess?.passive,
        allowsEndFeelAssessment: reviewedAccess?.endFeel,
        allowsMuscleComparison: reviewedAccess?.muscleComparison,
      };
    });
    const strengthItems: AssessmentItem[] = region.strengths
      .filter((item) => strengthIsRelevant(region.id, item.id, intake))
      .sort((a, b) => b.tags.filter((tag) => forceTags.has(tag)).length - a.tags.filter((tag) => forceTags.has(tag)).length || strengthLocationScore(b.id) - strengthLocationScore(a.id))
      .map((item) => {
      const copy = assessmentCopy(item.id, item.how, item.observe);
      const professionalCopy = professionalAssessmentCopy(item.id, item.how, item.observe);
      return ({
      id: `strength:${item.id}`,
      kind: "strength",
      title: intake.side === "双侧/中间" ? bilateralAssessmentCopy(assessmentTitle(item.id, item.title)) : assessmentTitle(item.id, item.title),
      how: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.how) : copy.how,
      observe: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.observe) : copy.observe,
      professionalHow: professionalCopy.how,
      professionalObserve: professionalCopy.observe,
      explain: item.explain,
      tags: item.tags,
      comparison: isSpinalRegion(region.id) ? "midline" : "contralateral",
    });
    });
    const functionPlan = selectFunctionAssessmentPlan({
      ...intake,
      regionId: region.id,
      goal: intake.goal,
      isGuided: workflowProfile.isGuided,
      candidates: region.functions.map((item) => ({ id: item.id, title: item.title, tags: item.tags })),
      firstResults: Object.fromEntries(region.functions.map((item) => [
        `function:${item.id}`,
        functionSimpleAnswer(assessmentResults[`function:${item.id}`] ?? {}),
      ])),
    });
    const selectedFunctionEntries = functionPlan
      .map((plan) => region.functions.find((item) => item.id === plan.id))
      .filter((item): item is FullRegion["functions"][number] => Boolean(item))
      .map((item) => ({ item }));
    const makeFunctionAssessment = (item: FullRegion["functions"][number]): AssessmentItem => {
      const copy = assessmentCopy(item.id, item.how, item.observe);
      const professionalCopy = professionalAssessmentCopy(item.id, item.how, item.observe);
      return {
        id: `function:${item.id}`,
        kind: "function",
        title: intake.side === "双侧/中间" ? bilateralAssessmentCopy(assessmentTitle(item.id, item.title)) : assessmentTitle(item.id, item.title),
        how: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.how) : copy.how,
        observe: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.observe) : copy.observe,
        professionalHow: professionalCopy.how,
        professionalObserve: professionalCopy.observe,
        explain: item.explain,
        tags: item.tags,
      };
    };
    const functionItems: AssessmentItem[] = selectedFunctionEntries.map(({ item }) => makeFunctionAssessment(item));
    const allowedSpecialAccess = workflowProfile.operationTarget === "other"
      ? canRunSpecialTest ? ["self", "coach", "therapist"] : ["self"]
      : ["self"];
    const canUsePalpation = workflowProfile.palpationMode !== "none";
    const structureConfirmedByImaging = imaging.some((entry) => ["有骨折或骨裂异常", "韧带损伤或撕裂", "肌腱损伤或撕裂"].includes(entry));
    const specialCategoryFor = (id: string): AssessmentItem["specialCategory"] => {
      if (/bone|tendon|achilles|continuity|fracture|thompson/i.test(id)) return "safety";
      if (/palp|joint-line|tender|patella-pressure/i.test(id)) return "localization";
      if (/assist|response|support|adjust|fibula/i.test(id)) return "response";
      return "professional-special";
    };
    const structureOnlySpecial = (id: string) => /bone|tendon|achilles|continuity|fracture|thompson/i.test(id);
    const specialItems: AssessmentItem[] = region.specialTests
      .filter((item) => item.id !== "ankle-bone-weight-screen" && allowedSpecialAccess.includes(item.access) && specialIsRelevant(item.trigger, intake))
      .filter((item) => !/palpation/i.test(item.id) || canUsePalpation)
      // 影像已经明确结构时，不再重复做只用于确认同一结构的刺激性专项测试；
      // 活动度、力量和功能表现仍然保留。
      .filter((item) => !structureConfirmedByImaging || !structureOnlySpecial(item.id))
      .slice(0, 2)
      .map((item) => {
        const copy = assessmentCopy(item.id, item.how, item.observe);
        const professionalCopy = professionalAssessmentCopy(item.id, item.how, item.observe);
        return { id: `special:${item.id}`, kind: "special", title: intake.side === "双侧/中间" ? bilateralAssessmentCopy(assessmentTitle(item.id, item.title)) : assessmentTitle(item.id, item.title), how: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.how) : copy.how, observe: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.observe) : copy.observe, professionalHow: professionalCopy.how, professionalObserve: professionalCopy.observe, explain: item.explain, next: item.caution, tags: item.tags, specialCategory: specialCategoryFor(item.id), trigger: item.trigger };
      });
    const forceProvoked = activeProvocationTypes.includes("用力或对抗阻力") || includesAny(intake.description, ["发力", "用力", "使劲", "抗阻", "一撑"]);
    // 方案B：活动度检查与对应力量检查相邻排列（勾脚活动度→勾脚力量、内翻活动度→内翻力量……）
    // 配对表：活动度 item.id（不带 motion: 前缀）→ 力量 item.id（不带 strength: 前缀）
    const motionStrengthPair: Record<string, string> = {
      "ankle-dorsiflexion": "ankle-dorsiflexor",
      "ankle-plantarflexion": "ankle-calf",
      "ankle-inversion": "ankle-invertor",
      "ankle-eversion": "ankle-evertor",
      "knee-extension": "knee-quadriceps",
      // 大腿前侧拉长使用主动屈膝；股四头肌能力使用坐位伸膝。
      // 两者观察目标不同，不能再伪装成“同一个动作主动保持”。
      "thigh-back-length": "thigh-back-strength",
      "thigh-medial-length": "thigh-medial-strength",
      "thigh-lateral-load": "thigh-lateral-strength",
      "calf-dorsiflexion": "calf-dorsiflexor-strength",
      "calf-plantarflexion": "calf-heel-raise-strength",
      "calf-inversion": "calf-invertor-strength",
      "calf-eversion": "calf-evertor-strength",
      "hip-flexion": "hip-flexor",
      "hip-extension": "hip-glute-max",
      "hip-abduction": "hip-glute-med",
      "shoulder-flexion": "shoulder-serratus",
      "shoulder-external-rotation": "shoulder-external-rotation-strength",
      "neck-flexion": "neck-deep-flexor",
    };
    const strengthByMotionId = new Map(strengthItems.map((item) => [item.id.replace(/^strength:/, ""), item]));
    const acuteAnkleStrengthPairIds = new Set(["ankle-dorsiflexor", "ankle-evertor"]);
    const localPrimaryMotionId = region.id === "thigh-local"
      ? ({ front: "thigh-front-length", back: "thigh-back-length", medial: "thigh-medial-length", lateral: "thigh-lateral-load" } as const)[localLimbArea(intake.location)]
      : region.id === "calf-local"
        ? ({ front: "calf-dorsiflexion", back: "calf-plantarflexion", medial: "calf-inversion", lateral: "calf-eversion" } as const)[localLimbArea(intake.location)]
        : "";
    const combinedMotionItems = motionItems.map((motion) => {
      const pairId = motionStrengthPair[motion.id.replace(/^motion:/, "")];
      const pair = pairId ? strengthByMotionId.get(pairId) : undefined;
      const pairIsClinicallySelected = ["thigh-local", "calf-local"].includes(region.id)
        ? motion.id === `motion:${localPrimaryMotionId}`
        : region.id !== "ankle-foot" || !isAcuteTrauma(intake) || acuteAnkleStrengthPairIds.has(pairId);
      const pairAllowed = !(motion.id === "motion:knee-extension" && workflowProfile.operationTarget !== "other");
      return pair && pairIsClinicallySelected && pairAllowed ? {
        ...motion,
        pairedStrengthId: pair.id,
        pairedStrengthTitle: pair.title,
        pairedStrengthTags: pair.tags,
      } : motion;
    });
    const pairedStrengthIds = new Set(combinedMotionItems.map((item) => item.pairedStrengthId?.replace(/^strength:/, "")).filter((id): id is string => Boolean(id)));
    const standaloneStrengthItems = strengthItems.filter((item) => !pairedStrengthIds.has(item.id.replace(/^strength:/, "")));
    const interleaved: AssessmentItem[] = [];
    const interleavedUsed = new Set<string>();
    combinedMotionItems.forEach((motion) => {
      interleaved.push(motion);
      interleavedUsed.add(motion.id);
    });
    // 未配对的剩余力量项（如膝内收/臀肌、踝足弓）追加在交错序列后
    standaloneStrengthItems.forEach((item) => { if (!interleavedUsed.has(item.id)) interleaved.push(item); });

    const pilotInput = pilotInputFromIntake(intake, confirmedIntakeMulti);
    const rankAndLimit = (items: AssessmentItem[], preserveIds: string[] = []) => {
      // 功能评估项只能由 selectFunctionAssessmentPlan 产生。这里仅排序已经
      // 入选的项目，不能再根据主诉文字补插第二套功能检查。
      const byId = new Map(items.map((item) => [item.id, item]));
      const ranked = rankPilotAssessmentIds(pilotInput, items.map((item) => item.id))
        .map((id) => byId.get(id))
        .filter((item): item is AssessmentItem => Boolean(item));
      // 髌骨四方向在页面上合并成一张被动活动卡，但后台仍需要四个方向
      // 的记录来判断真正受限的方向。排序预算不能把最后一个方向挤掉。
      const rankedHasPatella = ranked.some((item) => isPatellaDirectionId(item.id));
      const rankedWithPatella = rankedHasPatella
        ? [...ranked, ...PATELLA_DIRECTION_IDS
          .map((id) => byId.get(id))
          .filter((item): item is AssessmentItem => Boolean(item))
          .filter((item) => !ranked.some((entry) => entry.id === item.id))]
        : ranked;
      const preservedFirst = preserveIds
        .map((id) => byId.get(id))
        .filter((item): item is AssessmentItem => Boolean(item));
      const ordered = [...preservedFirst, ...rankedWithPatella.filter((item) => !preserveIds.includes(item.id))];
      // 保持原有预算，但不截断已经打开的髌骨四方向组。
      const limit = rankedHasPatella ? Math.max(ranked.length, ordered.length) : ranked.length;
      const limited = ordered.slice(0, limit);
      const limitedIds = new Set(limited.map((item) => item.id));
      // 功能计划已经按“主诉动作 → 结果允许后的递进”做过一次决策；
      // 不能让后面的通用排序预算把已明确选中的递进动作重新挤掉。
      const preserved = preserveIds
        .map((id) => byId.get(id))
        .filter((item): item is AssessmentItem => item !== undefined && !limitedIds.has(item.id));
      return [...limited, ...preserved];
    };
    if (workflowProfile.isGuided) {
      const special = specialItems.slice(0, 1);
      const strengthComplaint = intake.symptoms.includes("力量不足") || includesAny(intake.symptomType, ["无力", "不稳"]);
      const selectedStrengths = region.id === "knee"
        ? [
            strengthItems.find((item) => item.id === "strength:knee-quadriceps"),
            includesAny(`${intake.forceDirection} ${intake.location} ${intake.symptomType} ${intake.symptoms.join(" ")}`, ["屈膝", "弯膝发力", "脚跟向后拉", "膝后无力", "大腿后侧无力"])
              ? strengthItems.find((item) => item.id === "strength:knee-hamstring")
              : strengthItems.find((item) => item.id === "strength:knee-posterior-chain"),
          ]
            .filter((item): item is AssessmentItem => Boolean(item))
            .filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index)
            .slice(0, 2)
        : strengthComplaint || !(region.id === "ankle-foot" && special.length)
          ? strengthItems.slice(0, 1)
          : [];
      const guidedStrengths = selectedStrengths
        .filter((item) => !(region.id === "knee" && workflowProfile.operationTarget !== "other" && item.id === "strength:knee-quadriceps"))
        .filter((item) => !pairedStrengthIds.has(item.id.replace(/^strength:/, "")));
      // 继续排查补查项：用户显式接受的方向/力量项必须出现在清单里，
      // 不能被首轮预算挤掉。
      const guidedContinuationItems = [...motionItems, ...strengthItems].filter((item) => continuationRoundIds.includes(item.id));
      return rankAndLimit(
        [...combinedMotionItems, ...special, ...guidedStrengths, ...functionItems, ...guidedContinuationItems],
        [...functionItems.map((item) => item.id), ...guidedContinuationItems.map((item) => item.id)],
      );
    }
    // 先把所有与当前区域相关的候选交给规则库排序，再由角色预算截取。
    // 不能在排序前按原始数组位置截断，否则病例规则点名的鹅足、腓骨肌等检查会被通用项目挤掉。
    const continuationAssessmentItems = [...motionItems, ...strengthItems].filter((item) => continuationRoundIds.includes(item.id));
    const order = forceProvoked || intake.symptoms.includes("力量不足") || includesAny(intake.symptomType, ["无力", "不稳"])
      ? [...interleaved, ...functionItems, ...specialItems]
      : includesAny(intake.symptomType, ["刺", "胀"])
        ? [...combinedMotionItems, ...specialItems, ...functionItems, ...standaloneStrengthItems]
        : [...interleaved, ...specialItems, ...functionItems];
    // 专业模式也必须保留用户明确选中的多个功能动作；通用排序预算只负责
    // 排顺序，不能把第二个主诉动作静默挤出独立评估队列。
    // 触发的专项检查（先有问题再做检查）同样保留：它们是条件触发的明确
    // 临床信号，不与基础评估竞争预算；入口已由触发过滤+上限 2 限流。
    const preservedAssessmentIds = [
      ...functionItems.map((item) => item.id),
      ...motionItems.filter((item) => item.id === "motion:knee-scar-mobility").map((item) => item.id),
      ...continuationAssessmentItems.map((item) => item.id),
    ];
    const rankedAssessments = rankAndLimit([...order, ...continuationAssessmentItems], preservedAssessmentIds);
    // 触发的专项检查追加在基础评估之后：它们是条件触发的明确临床信号
    //（先有问题再做检查），不与基础活动竞争预算，也不抢占基础检查顺序。
    const specialBacked = specialItems.filter((item) => !rankedAssessments.some((entry) => entry.id === item.id));
    return [...rankedAssessments, ...specialBacked];
  }, [region, intake, assessmentResults, confirmedIntakeMulti, canRunSpecialTest, canAssessPassive, workflowProfile, imaging, activeProvocationTypes, continuationRoundIds]);

  // 髌骨四方向在引擎中继续使用四个方向键，便于分别生成“向上/向下/向内/向外”
  // 的异常和处理；用户界面合并为一张卡，避免同一膝盖连续翻四个几乎相同的页面。
  const assessmentDisplayItems = useMemo(
    () => assessments.filter((item) => !isPatellaGroupSecondaryId(item.id)),
    [assessments],
  );
  const displayAssessmentIndexForId = useCallback((id: string) => {
    const visibleId = isPatellaGroupSecondaryId(id) ? PATELLA_GROUP_PRIMARY_ID : id;
    const index = assessmentDisplayItems.findIndex((item) => item.id === visibleId);
    return index >= 0 ? index : 0;
  }, [assessmentDisplayItems]);
  const displayAssessmentComplete = (item: AssessmentItem) => {
    if (item.id === PATELLA_GROUP_PRIMARY_ID) {
      return PATELLA_DIRECTION_IDS.every((id) => {
        const entry = assessments.find((candidate) => candidate.id === id);
        return entry && assessmentRecordComplete(
          entry,
          effectiveAssessmentRecord(entry, assessmentResults[id], intake, region?.id ?? ""),
          assessmentAllowsPassive(entry, canAssessPassive),
          intake.side === "双侧/中间",
          !hasClearChiefAction(intake),
          assessmentAllowsEndFeel(entry, canAssessEndFeel),
        );
      });
    }
    return assessmentRecordComplete(
      item,
      effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? ""),
      assessmentAllowsPassive(item, canAssessPassive),
      intake.side === "双侧/中间",
      !hasClearChiefAction(intake),
      assessmentAllowsEndFeel(item, canAssessEndFeel),
    );
  };

  useEffect(() => {
    const focusId = assessmentFocusIdRef.current;
    if (!focusId) return;
    const nextIndex = displayAssessmentIndexForId(focusId);
    assessmentFocusIdRef.current = "";
    if (nextIndex >= 0) setAssessmentIndex(nextIndex);
  }, [assessments, displayAssessmentIndexForId, setAssessmentIndex]);

  const findings = useMemo<Finding[]>(() => {
    if (!region || !intake.parsed) return [];
    const items: Finding[] = [{
      id: "chief",
      title: chiefComplaintLabel(intake),
      detail: [intake.side, intake.location, intake.symptomType, intake.actionAnalysis?.load].filter(Boolean).join(" · "),
      priority: "chief",
      score: hasClearChiefAction(intake) && intake.baselineScoreConfirmed ? intake.baselineScore : undefined,
      tags: [intake.location, intake.symptomType, ...activeProvocationTypes, intake.forceDirection, intake.actionAnalysis?.category, intake.actionAnalysis?.function, intake.actionAnalysis?.direction, ...(intake.stabbingPalpation === "sharp" ? ["tender:sharp"] : [])].filter(Boolean) as string[],
    }];
    assessments.forEach((item) => {
      const rawResult = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region.id);
      const itemCanAssessPassive = assessmentAllowsPassive(item, canAssessPassive);
      const itemCanAssessEndFeel = assessmentAllowsEndFeel(item, canAssessEndFeel);
      if (!rawResult || !assessmentRecordComplete(item, rawResult, itemCanAssessPassive, intake.side === "双侧/中间", !hasClearChiefAction(intake), itemCanAssessEndFeel)) return;
      const result = item.kind === "motion" ? {
        ...rawResult,
        passive: itemCanAssessPassive ? rawResult.passive : undefined,
        passiveEndFeel: itemCanAssessEndFeel ? rawResult.passiveEndFeel : undefined,
        passiveDiscomfort: itemCanAssessPassive ? rawResult.passiveDiscomfort : undefined,
        passiveDiscomfortType: itemCanAssessPassive ? rawResult.passiveDiscomfortType : undefined,
        passiveSymptomScore: itemCanAssessPassive ? rawResult.passiveSymptomScore : undefined,
        tensionChecked: assessmentAllowsMuscleComparison(item) && Boolean(rawResult.tensionChecked || assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionChecked),
        tensionLocations: assessmentAllowsMuscleComparison(item) ? sharedTensionLocationsForMotion(item.id, rawResult, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]) : [],
      } : rawResult;
      if (item.kind === "motion" && item.testMode === "passive" && result.passive && result.passive !== "skip") {
        const passiveLimited = result.passive !== "same";
        const passivePainful = result.passiveDiscomfort === "yes";
        const passiveSide = bilateralSideForMotionAnswer(result.passive);
        const passiveAngle = formatRangeAngle(result.passiveMeasuredAngleDeg ?? parseRangeAngle(result.passiveMeasuredAngle));
        if (passiveLimited) items.push({
          id: item.id,
          title: `${item.title}${passivePainful ? "范围受限并诱发症状" : "被动活动范围受限"}`,
          detail: [
            result.passive === "limited" || result.passive === "left-limited" || result.passive === "right-limited" || result.passive === "both-limited"
              ? `${passiveSide === "两侧异常" ? "两侧" : passiveSide ?? "一侧"}被动活动偏小`
              : result.passive === "excessive" ? "被动活动大于对侧" : "被动活动差异待确认",
            result.passiveEndFeel ? `终末感：${passiveEndFeelLabel(result.passiveEndFeel)}` : "",
            passiveAngle ? `被动角度：${passiveAngle}` : "",
            typeof result.passiveSymptomScore === "number" ? `不适 ${result.passiveSymptomScore}/10` : "",
          ].filter(Boolean).join("，"),
          priority: "support",
          score: result.passiveSymptomScore,
          tags: [...(item.tags ?? []), "passive", ...discomfortDecisionTags(result.passiveDiscomfortType)],
          note: item.explain,
          side: passiveSide,
        });
        if (passivePainful) items.push({
          id: `symptom:${item.id}`,
          title: `${item.title}被动活动诱发熟悉症状`,
          detail: [result.passiveDiscomfortLocation, result.passiveDiscomfortType, typeof result.passiveSymptomScore === "number" ? `${result.passiveSymptomScore}/10` : ""].filter(Boolean).join(" · "),
          priority: "support",
          score: result.passiveSymptomScore,
          tags: [...(item.tags ?? []), "passive", ...discomfortDecisionTags(result.passiveDiscomfortType)],
          note: item.explain,
        });
      }
      if (item.kind === "motion" && result.active) {
        const hasDiscomfort = result.discomfort === "yes" || result.unableReason === "pain";
        const isFamiliarDiscomfort = hasDiscomfort && (hasClearChiefAction(intake) || result.familiarSymptom === "yes");
        const scoreText = typeof result.symptomScore === "number" ? `，不适 ${result.symptomScore}/10` : "";
        const angleText = result.measuredAngle?.trim() ? `，记录角度 ${result.measuredAngle.trim()}` : "";
        const passiveScoreText = result.passiveDiscomfort === "yes" && typeof result.passiveSymptomScore === "number" ? `，被动时不适 ${result.passiveSymptomScore}/10` : "";
        const target = item.spinal && intake.spineAssessmentMode === "reference" ? "参考角度" : motionComparisonTarget(item.comparison);
        if (motionAnswerIsLimited(result.active)) {
          const bilateralDetail = result.active === "left-limited" ? "左侧更差" : result.active === "right-limited" ? "右侧更差" : result.active === "both-limited" ? "两侧都受限" : "";
          const rangeDetail = result.passive === "same"
            ? `被动接近${target}，主动控制需要补齐`
            : passiveAnswerIsLimited(result.passive)
              ? `主动和被动都小于${target}`
              : result.passive === "skip"
                ? `主动小于${target}，本次未完成被动检查`
                : itemCanAssessPassive
                  ? `主动小于${target}，被动范围待确认`
                  : `主动小于${target}，先尝试相关肌肉处理和主动控制`;
          items.push({
            id: item.id,
            title: `${item.title}范围偏小${isFamiliarDiscomfort ? "并会引起熟悉的不适" : ""}`,
            detail: `${bilateralDetail || rangeDetail}${angleText}${scoreText}${passiveScoreText}`,
            priority: "support",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), ...discomfortDecisionTags(result.discomfortType), ...discomfortDecisionTags(result.passiveDiscomfortType)],
            note: item.explain,
            side: bilateralSideForMotionAnswer(result.active),
          });
          if (isFamiliarDiscomfort) items.push({
            id: `symptom:${item.id}`,
            title: `${item.title}会引起熟悉的不适`,
            detail: [result.discomfortLocation, result.discomfortType, typeof result.symptomScore === "number" ? `${result.symptomScore}/10` : ""].filter(Boolean).join(" · "),
            priority: "support",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), ...discomfortDecisionTags(result.discomfortType)],
            note: item.explain,
            side: bilateralSideForMotionAnswer(result.active),
          });
        } else if (result.active === "excessive") {
          items.push({
            id: `control:${item.id}`,
            title: `${item.title}角度偏大${hasDiscomfort ? "并会引起症状" : ""}`,
            detail: `后续检查动作控制与稳定性${angleText}${scoreText}${passiveScoreText}`,
            priority: "support",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), "control", ...discomfortDecisionTags(result.discomfortType), ...discomfortDecisionTags(result.passiveDiscomfortType)],
          });
        } else if (result.active === "unable") {
          // 疼痛导致无法完成时，这个方向既是症状动作，也是尚未解决的
          // 活动问题。保留基础 motion finding，后续处理与复测队列才能
          // 继续追踪“能否完成、范围及不适”，而不是只剩一条疼痛记录。
          if (isFamiliarDiscomfort) items.push({
            id: item.id,
            title: `${item.title}因不适无法完成`,
            detail: `当前无法判断完整活动范围${scoreText}`,
            priority: "support",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), "unable", "range-pending", ...discomfortDecisionTags(result.discomfortType)],
            note: item.explain,
          });
          items.push({
            id: isFamiliarDiscomfort ? `symptom:${item.id}` : `track:${item.id}`,
            title: isFamiliarDiscomfort ? `${item.title}会引起熟悉的不适` : `${item.title}本次未完成`,
            detail: isFamiliarDiscomfort ? `因疼痛或不适未完成，真实活动范围暂时无法判断${scoreText}` : hasDiscomfort ? "出现了不是平时主诉的感觉，本次只记录" : "本次无法判断活动范围",
            priority: isFamiliarDiscomfort ? "support" : "track",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), ...discomfortDecisionTags(result.discomfortType)],
          });
        } else if (isFamiliarDiscomfort) {
          items.push({
            id: `symptom:${item.id}`,
            title: `${item.title}会引起熟悉的不适`,
            detail: `${result.active === "same" ? "活动范围基本正常" : "活动范围暂时无法判断"}${angleText}${scoreText}`,
            priority: "support",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), ...discomfortDecisionTags(result.discomfortType)],
          });
        } else if (hasDiscomfort || result.active === "unsure") {
          items.push({
            id: `track:${item.id}`,
            title: hasDiscomfort ? `${item.title}出现了其他感觉` : `${item.title}暂时没判断清楚`,
            detail: hasDiscomfort ? "不是平时困扰你的那种感觉，本次只记录" : "不用反复尝试，本次不据此安排处理",
            priority: "track",
            score: result.symptomScore,
            tags: item.tags ?? [],
          });
        }
        const confirmedTension = (assessmentAllowsMuscleComparison(item) ? sharedTensionLocationsForMotion(item.id, result, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]) : [])
          .filter((location) => !["没有明显差别", "两侧感觉接近", "暂不判断"].includes(location));
        const tensionFindings = buildMuscleTensionFindings({ assessmentId: item.id, assessmentTitle: professionalAssessmentTitle(item.id, item.title), locations: confirmedTension, professional: !workflowProfile.isGuided });
        for (const tensionFinding of tensionFindings) {
          // 肌肉区域是共享检查结果：多个动作可能引用同一块肌肉，结果台只保留一条，
          // 但保留首次发现的来源信息，避免“相关区域只检查一次”在输出层重复出现。
          const existingTensionFinding = items.some((finding) => finding.id.startsWith("tension:") && finding.title === tensionFinding.title);
          if (!existingTensionFinding) items.push({
            ...tensionFinding,
            priority: "support",
            tags: [...(item.tags ?? []), `tension:${tensionFinding.location}`],
            side: tensionFinding.side ?? bilateralSideForMotionAnswer(result.active),
          });
        }
        if (item.pairedStrengthId && (result.pairedStrength === "weak" || result.pairedStrength === "painful")) {
          const professionalStrength = canAssessResistance;
          const selfKneeExtensionControl = item.id === "motion:knee-extension" && !professionalStrength;
          const pairedStrengthProjection = pairedStrengthFindingProjection({
            answer: result.pairedStrength,
            unableReason: result.pairedStrengthUnableReason,
            title: item.pairedStrengthTitle ?? item.title,
            professional: professionalStrength,
            selfKneeExtensionControl,
            location: result.pairedStrengthLocation,
            type: result.pairedStrengthType,
            score: result.pairedStrengthScore,
            tags: item.pairedStrengthTags,
            discomfortTags: discomfortDecisionTags(result.pairedStrengthType),
          });
          if (!pairedStrengthProjection) return;
          items.push({
            id: item.pairedStrengthId,
            title: pairedStrengthProjection.title,
            detail: pairedStrengthProjection.detail,
            priority: "support",
            score: pairedStrengthProjection.score,
            tags: pairedStrengthProjection.tags,
            note: item.explain,
            side: bilateralSideForMotionAnswer(result.active),
            internal: true,
            relatedMotionId: item.id,
          });
        }
        return;
      }
      if (item.kind === "strength" && ["weak", "painful"].includes(result.simple ?? "")) {
        const isMidlineStrength = item.comparison === "midline";
        const bilateralComparison = effectiveBilateralComparison(result);
        const bilateralSide = intake.side === "双侧/中间" && bilateralComparison ? `${bilateralComparisonToSide(bilateralComparison) ?? bilateralComparison}：` : "";
        const singleSide = result.worseSide ?? (["左侧", "右侧"].includes(intake.side) ? intake.side : undefined);
        const singleSideStrengthLabel = singleSide ? `${singleSide}力量偏弱` : "一侧力量偏弱";
        const singleSideStrengthDetail = singleSide ? `${singleSide}力量明显小于另一侧` : "一侧力量明显弱于另一侧";
        const strengthSymptomDetail = [result.discomfortLocation, result.discomfortType].filter(Boolean).join(" · ");
        const isFamiliarStrengthSymptom = result.simple !== "painful" || hasClearChiefAction(intake) || result.familiarSymptom === "yes";
        items.push({
          id: isFamiliarStrengthSymptom ? item.id : `track:${item.id}`,
          title: result.simple === "weak" ? `${bilateralSide}${item.title}：${isMidlineStrength ? "控制或耐力不足" : intake.side === "双侧/中间" ? "力量偏弱" : singleSideStrengthLabel}` : `${bilateralSide}${item.title}：发力会引起症状`,
          detail: result.simple === "weak"
            ? isMidlineStrength ? "完成质量、保持能力或动作控制不足" : intake.side === "双侧/中间" ? `${bilateralComparisonToSide(bilateralComparison) ?? "侧别待确认"}力量或耐力较差` : singleSideStrengthDetail
            : `发力时${strengthSymptomDetail ? ` ${strengthSymptomDetail}` : "出现不适"}，${result.symptomScore ?? intake.baselineScore}/10`,
          priority: isFamiliarStrengthSymptom ? "support" : "track",
          score: result.symptomScore,
          tags: [...(item.tags ?? []), result.discomfortLocation, result.discomfortType, ...discomfortDecisionTags(result.discomfortType)].filter(Boolean) as string[],
          note: item.explain,
          side: intake.side === "双侧/中间" ? bilateralComparisonToSide(bilateralComparison) : result.worseSide,
        });
      } else if (item.kind === "strength" && result.simple === "skip") {
        items.push({ id: `track:${item.id}`, title: `${item.title}暂时没判断清楚`, detail: "本次不据此安排处理", priority: "track", tags: item.tags ?? [] });
      }
      const functionalResult = item.kind === "function" ? functionSimpleAnswer(result) : undefined;
      const functionEvidence = item.kind === "function" ? functionEvidenceFromRecord(item.id, result) : undefined;
      if (item.kind === "function" && ["present", "painful", "unable", "weak"].includes(functionalResult ?? "")) {
        const stageText = result.symptomStage ? `，${result.symptomStage}阶段最明显` : "";
        const compensationText = result.compensations?.join("、") ?? "";
        const compensationTags = (result.compensations ?? []).flatMap((entry) => entry.includes("膝盖明显向内")
          ? ["adductor", "hip-abduction", "glute-med"]
          : entry.includes("脚跟提前") || entry.includes("膝盖高度")
            ? ["dorsiflexion", "ankle-rom"]
            : entry.includes("晃动") || entry.includes("站稳")
              ? ["balance", "single-leg", "stability"]
              : entry.includes("抬起高度")
                ? ["heel-raise", "calf"]
                : []);
        const bilateralComparison = effectiveBilateralComparison(result);
        const sideText = intake.side === "双侧/中间" && bilateralComparison ? `${bilateralComparisonToSide(bilateralComparison) ?? bilateralComparison}：` : "";
        const hasControlIssue = functionControlValue(result) === "compensated";
        const hasFunctionSymptom = functionDiscomfortValue(result) === "yes";
        const title = functionalResult === "unable"
          ? `${item.title}因为不适无法完成`
          : functionalResult === "weak"
            ? `${item.title}因为没力或撑不住无法完成`
          : hasControlIssue && hasFunctionSymptom
            ? `${item.title}不稳定并会引起症状`
            : hasFunctionSymptom
              ? `${item.title}会引起症状`
              : `${item.title}动作控制需要改善`;
        const details = [
          ["unable", "weak"].includes(functionalResult ?? "") ? "当前无法完成，训练先从更简单的动作开始" : "",
          hasControlIssue ? compensationText || "有明显晃动或借力" : "",
          hasFunctionSymptom ? [result.discomfortLocation, result.discomfortType, typeof result.symptomScore === "number" ? `${result.symptomScore}/10` : ""].filter(Boolean).join(" · ") : "",
        ].filter(Boolean).join("；");
        const symptomOnly = hasFunctionSymptom && !hasControlIssue;
        const familiarFunctionSymptom = !symptomOnly || hasClearChiefAction(intake) || result.familiarSymptom === "yes";
        items.push({ id: familiarFunctionSymptom ? item.id : `track:${item.id}`, title: `${sideText}${title}`, detail: `${details}${stageText}`, priority: familiarFunctionSymptom ? "support" : "track", score: result.symptomScore, tags: [...(item.tags ?? []), ...compensationTags, ...functionEvidenceDecisionTags(functionEvidence!), ...discomfortDecisionTags(result.discomfortType), ...(result.symptomStage ? [`stage:${result.symptomStage}`] : []), ...(["unable", "weak"].includes(functionalResult ?? "") ? ["unable", "regression"] : [])], note: item.explain, side: intake.side === "双侧/中间" ? bilateralComparisonToSide(bilateralComparison) : result.worseSide });
      } else if (item.kind === "function" && (functionalResult === "skip" || functionControlValue(result) === "unsure")) {
        // M-06：主诉上下文的功能动作被跳过时打标记，供评估结果页给出中性提醒。
        const chiefSkipped = region ? chiefFunctionAssessmentIds(intake, region.id).includes(item.id) : false;
        items.push({ id: `track:${item.id}`, title: `${item.title}暂时没判断清楚`, detail: "本次不据此安排处理", priority: "track", tags: [...(item.tags ?? []), ...(chiefSkipped ? ["chief-skip"] : [])] });
      }
      if (item.kind === "special" && result.simple === "positive") {
        items.push({ id: item.id, title: `${item.title}出现阳性线索`, detail: item.next ?? "提高结构排查优先级", priority: "track", tags: item.tags ?? [] });
      }
    });
    // 配对力量不是第二个动作：把它并入同一条活动动作记录，供用户在一张卡片里看到；
    // 内部仍保留独立 finding 供训练和决策使用。
    assessments.forEach((item) => {
      if (item.kind !== "motion" || !item.pairedStrengthId) return;
      const result = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region.id);
      if (!result?.pairedStrength || !["weak", "painful"].includes(result.pairedStrength)) return;
      const motionFinding = items.find((finding) => finding.id === item.id || finding.id === `symptom:${item.id}` || finding.id === `track:${item.id}`);
      if (!motionFinding) return;
      const professionalStrength = canAssessResistance;
      const strengthText = result.pairedStrength === "weak"
        ? professionalStrength ? "同动作抗阻力量偏弱" : "同动作主动保持较差"
        : professionalStrength ? "同动作抗阻时会引起同样的不适" : "同动作保持时会引起同样的不适";
      motionFinding.detail = [motionFinding.detail, strengthText].filter(Boolean).join("；");
      motionFinding.tags = Array.from(new Set([...motionFinding.tags, ...(item.pairedStrengthTags ?? []), ...discomfortDecisionTags(result.discomfortType), ...discomfortDecisionTags(result.pairedStrengthType)]));
    });
    if (intake.symptoms.includes("肿胀或淤青")) items.push({ id: "track:swelling", title: `肿胀：${intake.swellingLocation || "位置待补充"}`, detail: "稍后和下次比较这一部位的范围与轮廓，不要求当场消失", priority: "track", tags: ["肿胀"] });
    if (intake.symptoms.includes("按压痛") || activeProvocationTypes.includes("按压")) items.push({ id: "track:tender", title: `按压痛：${intake.tendernessLocation || "位置待补充"}`, detail: "不反复重压，下一次在同一位置轻柔比较", priority: "track", tags: ["压痛"] });
    if (intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化")) items.push({ id: "track:sensory", title: `麻或电感：${intake.sensoryLocation || "范围待补充"}`, detail: "后续比较分布范围和肌力变化", priority: "track", tags: ["neural", "sensory"] });
    // 一个肌群可能同时影响多个方向，但处理时只应作为一个处理单元出现。
    // 将同一肌群在不同动作下产生的张力记录合并，动作方向保留在详情里供复盘参考。
    const tensionIndex = new Map<string, Finding>();
    const displayItems = items.filter((finding) => {
      if (!finding.id.startsWith("tension:")) return true;
      const muscleLabel = finding.title.replace(/(?:肌张力增高|按压反应更明显|张力或按压阻力增高)$/, "").trim();
      const normalizedRegion = normalizePilotMuscleRegion(`${muscleLabel} ${finding.detail ?? ""}`);
      const tensionKey = `${finding.side ?? "双侧"}:${normalizedRegion?.id ?? muscleLabel}`;
      const previous = tensionIndex.get(tensionKey);
      if (!previous) {
        tensionIndex.set(tensionKey, finding);
        return true;
      }
      const details = [previous.detail, finding.detail].filter(Boolean).join("；").split("；").filter((entry, index, list) => list.indexOf(entry) === index);
      previous.detail = details.join("；");
      previous.tags = Array.from(new Set([...previous.tags, ...finding.tags]));
      return false;
    });
    const chief = displayItems[0];
    const chiefDirection = chiefMotionDirectionId(intake, region.id);
    const rank = (finding: Finding) => {
      if (finding.priority === "track") return 100;
      const directionId = anyMotionIdFromFinding(finding);
      const chiefMatch = directionId && samePhysicalAction(directionId, chiefDirection) ? 0 : 10;
      const functionalImpact = finding.id.startsWith("motion:") || finding.id.startsWith("symptom:motion:") ? 0 : finding.id.startsWith("strength:") ? 1 : finding.id.startsWith("function:") ? 2 : 3;
      return chiefMatch + functionalImpact;
    };
    return [chief, ...displayItems.slice(1).sort((a, b) => rank(a) - rank(b))];
  }, [region, intake, assessments, assessmentResults, canAssessPassive, canAssessResistance, canAssessEndFeel, workflowProfile.isGuided, activeProvocationTypes]);

  const bilateralAssessmentWorseSide = useMemo<BilateralSide | undefined>(() => {
    if (intake.side !== "双侧/中间") return undefined;
    // M-07：推断规则集中在 bilateral-flow-core；track 级单侧异常同样计入。
    return inferBilateralAssessmentWorseSide(findings);
  }, [findings, intake.side]);
  const bilateralPriorityResolution = resolveBilateralPriority({
    complaintPrioritySide: intake.prioritySide,
    assessmentWorseSide: bilateralAssessmentWorseSide,
  });

  const kneeWorkflowAssessments = useMemo(() => {
    if (region?.id !== "knee") return [];
    return assessments.flatMap((item) => {
      const record = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region.id);
      if (!record) return [];
      const itemCanAssessPassive = assessmentAllowsPassive(item, canAssessPassive);
      const itemCanAssessEndFeel = assessmentAllowsEndFeel(item, canAssessEndFeel);
      const itemCanCompareMuscle = assessmentAllowsMuscleComparison(item);
      const workflowItems = [{
        id: item.id,
        kind: item.kind,
        title: item.title,
        active: record.active,
        passive: itemCanAssessPassive ? record.passive : undefined,
        simple: item.kind === "function" ? functionSimpleAnswer(record) : item.kind === "strength" ? strengthAnswerForWorkflow(record.simple, record.strengthUnableReason) : record.simple,
        discomfort: item.kind === "function" ? functionDiscomfortValue(record) : record.discomfort,
        discomfortType: record.discomfortType,
        symptomScore: record.symptomScore,
        passiveEndFeel: item.kind === "motion" && itemCanAssessEndFeel ? record.passiveEndFeel : undefined,
        passiveDiscomfort: item.kind === "motion" && itemCanAssessPassive ? record.passiveDiscomfort : undefined,
        passiveSymptomScore: item.kind === "motion" && itemCanAssessPassive ? record.passiveSymptomScore : undefined,
        tensionLocations: item.kind === "motion" && itemCanCompareMuscle ? sharedTensionLocationsForMotion(item.id, record, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]) : item.kind === "motion" ? [] : record.tensionLocations,
        tensionChecked: item.kind === "motion" && itemCanCompareMuscle ? Boolean(record.tensionChecked || assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionChecked) : item.kind === "motion" ? false : record.tensionChecked,
        discomfortLocations: (record.discomfortLocations ?? []).map((location) => location.location),
        control: item.kind === "function" ? functionControlValue(record) : undefined,
        // S-01：双侧场景下逐项携带该检查自身侧别，供膝决策按真实侧归属。
        side: ["左侧", "右侧"].includes(record.worseSide ?? "") ? record.worseSide : undefined,
      }];
      if (item.kind === "motion" && item.pairedStrengthId && record.pairedStrength) workflowItems.push({
        id: item.pairedStrengthId,
        kind: "strength",
        title: item.pairedStrengthTitle ?? item.title,
        active: undefined,
        passive: undefined,
         simple: strengthAnswerForWorkflow(record.pairedStrength, record.pairedStrengthUnableReason),
         discomfort: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? "yes" : "no",
         passiveEndFeel: undefined,
         passiveDiscomfort: undefined,
         passiveSymptomScore: undefined,
         // 活动度疼痛和保持疼痛分开记录：保持检查用 pairedStrength 自己的字段。
        discomfortType: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? record.pairedStrengthType : undefined,
        symptomScore: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? record.pairedStrengthScore : undefined,
         tensionLocations: undefined,
         tensionChecked: undefined,
         discomfortLocations: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? (record.pairedStrengthLocations ?? []).map((location) => location.location) : [],
         control: undefined,
         side: ["左侧", "右侧"].includes(record.worseSide ?? "") ? record.worseSide : undefined,
       });
      return workflowItems;
    });
  }, [region, assessments, assessmentResults, intake, canAssessPassive, canAssessEndFeel]);

  const kneeDecision = useMemo(() => {
    if (region?.id !== "knee") return null;
    const decisionInput = kneeDecisionInputFromWorkflow({
      role: workflowProfile.operationTarget === "other" ? "rehab" : "general",
      side: intake.side,
      location: intake.location,
      symptomType: intake.symptomType,
      action: chiefActionSource(intake),
      baselineScore: intake.baselineScoreConfirmed ? intake.baselineScore : undefined,
      symptoms: intake.symptoms,
      swellingLocation: intake.swellingLocation,
      tendernessLocation: intake.tendernessLocation,
      // S-02：结构化带侧别标记原样传入，膝决策不再只看压平文本。
      swellingMarks: intake.swellingLocations.map((item) => ({ side: item.side, location: item.location })),
      tendernessMarks: intake.tendernessLocations.map((item) => ({ side: item.side, location: item.location })),
      assessments: kneeWorkflowAssessments,
      treatmentRecords: trialRecords.map((record) => ({
        candidateId: record.candidateId,
        treatmentKey: record.treatmentKey,
        afterScore: record.afterScore,
        chiefRetested: record.chiefRetested,
        rangeOutcomes: record.rangeOutcomes ?? (record.rangeOutcome && record.targetId.startsWith("target:motion:")
          ? { [record.targetId.replace("target:motion:", "")]: record.rangeOutcome }
          : undefined),
        rangeScores: record.rangeScores,
        retestOnly: record.retestOnly,
        reviewOnly: record.reviewOnly,
      })),
    });
    return buildKneeDecision(decisionInput);
  }, [region, kneeWorkflowAssessments, intake, trialRecords, workflowProfile.operationTarget]);

  const previousSessionForReview = useMemo(() => sessionHistory.find((item) => item.sessionNumber === sessionNumber - 1)
    ?? (followupMode ? sessionHistory.at(-1) : undefined), [sessionHistory, sessionNumber, followupMode]);
  const previousSessionScore = previousSessionEndingScore(sessionHistory, sessionNumber);

  const followupKneeDecision = useMemo(() => {
    if (region?.id !== "knee" || !followupMode) return null;
    const currentSessionRecords = followupTrialRecords.filter((record) => record.sessionNumber === sessionNumber);
    const reviewedAssessments = kneeWorkflowAssessments.map((assessment) => {
      const trend = followupTrends[assessment.id]
        ?? previousSessionForReview?.reviewResults.find((item) => item.id === assessment.id)?.result;
      if (!trend) return assessment;
      if (trend === "unknown" || trend === "unable") {
        if (assessment.kind === "motion") return { ...assessment, active: "unsure", passive: "skip" };
        if (assessment.kind === "strength" || assessment.kind === "function") return { ...assessment, simple: "skip" };
        return assessment;
      }
      if (assessment.kind === "motion") return {
        ...assessment,
        active: trend === "better" ? "same" : trend === "worse" ? "limited" : assessment.active === "same" ? "limited" : assessment.active,
      };
      if (assessment.kind === "strength") return { ...assessment, simple: trend === "better" ? "normal" : "weak" };
      if (assessment.kind === "function") return { ...assessment, simple: trend === "better" ? "normal" : assessment.simple === "normal" ? "painful" : assessment.simple };
      return assessment;
    });
    return buildKneeDecision(kneeDecisionInputFromWorkflow({
      role: workflowProfile.operationTarget === "other" ? "rehab" : "general",
      side: intake.side,
      location: intake.location,
      symptomType: intake.symptomType,
      action: chiefActionSource(intake),
      baselineScore: followupScoreConfirmed
        ? followupScore
        : finalRetestConfirmed
          ? finalRetestScore
          : treatmentFinalRetestConfirmed
            ? treatmentFinalRetestScore
            : previousSessionScore ?? intake.baselineScore,
      // 后续肿胀由复查页单独按时间管理，不让它持续占据即时处理队列首位。
      symptoms: intake.symptoms.filter((symptom) => symptom !== "肿胀或淤青"),
      swellingLocation: intake.swellingLocation,
      tendernessLocation: intake.tendernessLocation,
      assessments: reviewedAssessments,
      // 去重只作用于本次康复；上一次有效处理可以在本次复查后再次使用。
      treatmentRecords: currentSessionRecords.map((record) => ({
        candidateId: record.candidateId,
        treatmentKey: record.treatmentKey,
        afterScore: record.afterScore,
        chiefRetested: record.chiefRetested,
        rangeOutcomes: record.rangeOutcomes,
        rangeScores: record.rangeScores,
        retestOnly: record.retestOnly,
        reviewOnly: record.reviewOnly,
      })),
    }));
  }, [region, followupMode, followupTrialRecords, sessionNumber, intake, followupScoreConfirmed, followupScore, finalRetestConfirmed, finalRetestScore, treatmentFinalRetestConfirmed, treatmentFinalRetestScore, kneeWorkflowAssessments, followupTrends, previousSessionForReview, previousSessionScore, workflowProfile.operationTarget]);

  const previousKneeTreatmentId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (region?.id !== "knee") return;
    const nextId = kneeDecision?.currentTreatment?.id;
    if (!nextId) return;
    if (previousKneeTreatmentId.current && previousKneeTreatmentId.current !== nextId) {
      setTrialTargetIndex(0);
      setCandidateIndex(0);
      setReadyToRetest(false);
      setMovementResponse("");
      setMovementResponses({});
      setMovementDiscomforts({});
      setMovementScores({});
      setMovementScoreConfirmed({});
      setPostDiscomfort("");
      setPostScoreConfirmed(false);
    }
    previousKneeTreatmentId.current = nextId;
  }, [region?.id, kneeDecision?.currentTreatment?.id, setCandidateIndex, setMovementDiscomforts, setMovementResponse, setMovementResponses, setMovementScoreConfirmed, setMovementScores, setPostDiscomfort, setPostScoreConfirmed, setReadyToRetest, setTrialTargetIndex]);

  const treatmentProblems = useMemo<TreatmentProblem[]>(() => {
    const visible = findings.filter((finding) => {
      // 配对力量在检查卡内合并展示，但仍必须进入问题账本并转入训练。
      if (finding.internal && !finding.id.startsWith("strength:")) return false;
      if (finding.priority === "track" && !finding.id.startsWith("track:swelling") && !finding.id.startsWith("track:tender")) return false;
      return finding.id !== "chief" || hasClearChiefAction(intake);
    });
    const chief = visible.find((finding) => finding.id === "chief");
    const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const chiefFunctionId = region ? chiefFunctionAssessmentId(intake, region.id) : "";
    const chiefFunctionFinding = chiefFunctionId ? visible.find((finding) => finding.id === chiefFunctionId) : undefined;
    const assessmentTitleByDirection = (directionId: string) => assessments.find((item) => item.id === `motion:${directionId}`)?.title;
    const toProblem = (finding: Finding): TreatmentProblem => {
      const directionId = anyMotionIdFromFinding(finding);
      if (directionId) return {
        id: finding.id,
        kind: finding.id.startsWith("tension:") ? "肌肉" : finding.id.startsWith("control:") ? "活动控制" : finding.id.startsWith("symptom:") ? "动作不适" : "活动度",
        title: finding.id.startsWith("tension:")
          ? finding.title || `${assessmentTitleByDirection(directionId) || "相关肌群"}按压反应存在差异`
          : assessmentTitleByDirection(directionId) ?? professionalFindingLabel(finding),
        status: finding.id.startsWith("tension:") ? "两侧按压反应存在差异" : finding.id.startsWith("motion:") ? finding.title.includes("引起症状") ? "AROM受限 · 伴不适" : "AROM受限" : finding.id.startsWith("control:") ? "活动控制异常" : "活动诱发症状",
        findingIds: [finding.id],
        directionId,
      };
      const functionControlProblem = finding.id.startsWith("function:")
        && (finding.title.includes("控制") || finding.title.includes("不稳定") || finding.title.includes("没力"));
      const functionSymptomProblem = finding.id.startsWith("function:")
        && (finding.title.includes("不适") || finding.title.includes("症状") || finding.title.includes("疼"));
      return {
        id: finding.id,
        kind: finding.id.startsWith("strength:") ? "力量或控制" : functionControlProblem ? "活动控制" : functionSymptomProblem ? "动作不适" : finding.id.includes("swelling") ? "肿胀" : finding.id.includes("tender") ? "按压痛" : finding.id === "chief" ? "主诉" : "检查发现",
        title: finding.id === "chief" ? chiefComplaintLabel(intake) : finding.title.split("：")[0],
        status: finding.id.startsWith("strength:") ? finding.title.split("：")[1] : undefined,
        findingIds: [finding.id],
      };
    };

    const problems: TreatmentProblem[] = [];
    const mergedFindingIds = new Set<string>();
    const motionGroups = new Map<string, Finding[]>();
    visible.filter((finding) => finding.id !== "chief").forEach((finding) => {
      const directionId = anyMotionIdFromFinding(finding);
      if (!directionId) return;
      motionGroups.set(directionId, [...(motionGroups.get(directionId) ?? []), finding]);
    });
    if (chief && chiefFunctionFinding) {
      const base = toProblem(chiefFunctionFinding);
      problems.push({
        ...base,
        id: `merged:chief:${chiefFunctionId}`,
        kind: "主诉动作",
        title: chiefActionLabel(intake),
        status: chiefFunctionFinding.title,
        findingIds: [chief.id, chiefFunctionFinding.id],
      });
      mergedFindingIds.add(chiefFunctionFinding.id);
    } else if (chief && chiefDirection && motionGroups.has(chiefDirection)) {
      const related = motionGroups.get(chiefDirection) ?? [];
      const base = toProblem(related[0]);
      problems.push({ ...base, id: `merged:chief:${chiefDirection}`, kind: "主诉动作", title: assessmentTitleByDirection(chiefDirection) ?? chiefActionLabel(intake), findingIds: [chief.id, ...related.map((finding) => finding.id)] });
      motionGroups.delete(chiefDirection);
    } else if (chief) problems.push(toProblem(chief));
    motionGroups.forEach((related, directionId) => {
      const base = toProblem(related[0]);
      problems.push({ ...base, id: `merged:motion:${directionId}`, title: assessmentTitleByDirection(directionId) ?? base.title, findingIds: related.map((finding) => finding.id), directionId });
    });
    visible.filter((finding) => finding.id !== "chief" && !mergedFindingIds.has(finding.id) && !anyMotionIdFromFinding(finding)).forEach((finding) => problems.push(toProblem(finding)));
    return problems;
  }, [findings, region, intake, assessments]);

  const matchedCandidateGroups = useMemo(() => {
    if (!region) return [];
    const locationSource = `${intake.location} ${intake.bodyLocations.map((item) => item.location).join(" ")}`;
    const feelingSource = `${intake.symptomType} ${intake.symptoms.join(" ")}`;
    const actionSource = `${chiefActionSource(intake)} ${activeProvocationTypes.join(" ")} ${intake.mechanism}`;
    const scored = region.candidateGroups.map((group, index) => {
      const locationMatch = group.match.locations.some((trigger) => locationSource.includes(trigger));
      const feelingMatch = group.match.feelings.some((trigger) => feelingSource.includes(trigger));
      const actionMatch = group.match.actions.some((trigger) => actionSource.includes(trigger));
      return { group, index, locationMatch, score: (locationMatch ? 8 : 0) + (feelingMatch ? 3 : 0) + (actionMatch ? 5 : 0) };
    });
    const withLocation = scored.filter((entry) => entry.locationMatch);
    const pool = withLocation.length ? withLocation : scored.filter((entry) => entry.score >= 8);
    const ordered = pool.sort((a, b) => b.score - a.score || a.index - b.index);
    const bestScore = ordered[0]?.score ?? 0;
    // The complaint can legitimately span two nearby patterns, but a location
    // alone must not open every generic group attached to that joint.
    return ordered.filter((entry) => entry.score >= bestScore - 2).slice(0, 2).map((entry) => entry.group);
  }, [region, intake, activeProvocationTypes]);

  const pilotDecisionInput = useMemo(
    () => pilotInputFromIntake(intake, confirmedIntakeMulti),
    [intake, confirmedIntakeMulti],
  );
  const pilotRelationsByAssessmentId = useMemo(() => {
    const result = new Map<string, ReturnType<typeof matchPilotRelations>>();
    assessments.forEach((item) => {
      const record = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? "");
      const finding = findings.find((entry) => entry.id === item.id || entry.id === `symptom:${item.id}` || entry.id === `control:${item.id}`);
      if (!record || !finding) return;
      const specificLocations = (record.discomfortLocations ?? []).map((entry) => entry.location);
      const weak = item.kind === "strength" && record.simple === "weak";
      const limited = item.kind === "motion" && motionAnswerIsLimited(record.active);
      const functionEvidence = item.kind === "function" ? functionEvidenceFromRecord(item.id, record) : undefined;
      // 功能疼痛只走处理/复测证据；只有明确代偿或能力不足才允许贡献训练关系。
      if (item.kind === "function" && !functionEvidence?.channels.training) return;
      const controlIssue = functionEvidence?.control === "compensated";
      const derivedSymptoms = [
        ...pilotDecisionInput.symptoms,
        ...(weak ? ["力量不足"] : []),
        ...(limited ? ["活动受限"] : []),
        ...(controlIssue ? ["无力或不稳"] : []),
      ].filter((entry, index, list) => list.indexOf(entry) === index);
      result.set(item.id, matchPilotRelations({
        ...pilotDecisionInput,
        locations: specificLocations.length ? specificLocations : pilotDecisionInput.locations,
        symptomType: record.discomfortType || (weak || controlIssue ? "无力或不稳" : pilotDecisionInput.symptomType),
        symptoms: derivedSymptoms,
        currentTask: item.title,
        noFixedTask: false,
      }));
    });
    return result;
  }, [assessments, assessmentResults, findings, pilotDecisionInput, intake, region?.id]);
  const pilotFindingInputs = useMemo<PilotFindingInput[]>(() => assessments.map((item) => {
    const record = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? "");
    if (!record) return { id: item.id, result: "unknown" };
    if (item.kind === "motion") {
      if (record.active === "unable") return { id: item.id, result: record.unableReason === "pain" ? "painful" : "not-testable" };
      if (record.discomfort === "yes") return { id: item.id, result: "painful" };
      if (motionAnswerIsLimited(record.active)) return { id: item.id, result: "limited" };
      if (record.active === "unsure") return { id: item.id, result: "unknown" };
      return { id: item.id, result: "normal" };
    }
    if (item.kind === "strength") {
      return { id: item.id, result: strengthAnswerResult(record.simple, record.strengthUnableReason) };
    }
    if (item.kind === "function") {
      const result = functionSimpleAnswer(record);
      if (["painful", "unable"].includes(result ?? "")) return { id: item.id, result: "painful" };
      if (result === "present") return { id: item.id, result: "weak" };
      if (result === "skip" || !result) return { id: item.id, result: "unknown" };
      return { id: item.id, result: "normal" };
    }
    if (record.simple === "positive") return { id: item.id, result: "positive" };
    if (record.simple === "skip" || !record.simple) return { id: item.id, result: "unknown" };
    return { id: item.id, result: "normal" };
  }), [assessments, assessmentResults, intake, region?.id]);
  const tissueDecisionInput = useMemo(() => ({
    regionId: intake.regionId,
    location: intake.location,
    onset: intake.onset,
    mechanism: intake.mechanism,
    symptomType: intake.symptomType,
    symptoms: intake.symptoms,
    provocationTypes: activeProvocationTypes,
    description: intake.description,
  }), [intake, activeProvocationTypes]);
  const decisionEngine = useDecisionEngine({ intake: pilotDecisionInput, findings: pilotFindingInputs, tissue: tissueDecisionInput });
  const matchedPilotRelations = decisionEngine.relations;
  const tissuePathway = decisionEngine.tissuePathway;
  const pilotTreatmentUnits = decisionEngine.treatmentUnits;
  const pilotTrainingIds = useMemo(() => new Set([
    ...matchedPilotRelations.flatMap(({ relation }) => relation.trainingIds),
    ...[...pilotRelationsByAssessmentId.values()].flatMap((entries) => entries.flatMap(({ relation }) => relation.trainingIds)),
  ]), [matchedPilotRelations, pilotRelationsByAssessmentId]);
  const firstAssessmentReviewResults = useMemo<ReviewResult[]>(() => {
    const labelFor = (id: string) => {
      const assessment = assessments.find((item) => item.id === id || item.pairedStrengthId === id);
      if (id.startsWith("strength:") && assessment?.pairedStrengthId === id) return assessment.pairedStrengthTitle ?? `${assessment.title}发力`;
      return assessment?.title ?? id.replace(/^(motion|strength|function|special):/, "");
    };
    const base = pilotFindingInputs.map((finding) => ({
      id: finding.id,
      label: labelFor(finding.id),
      result: trendFromAssessmentResult(finding.result as AssessmentReviewResult),
    }));
    const paired = assessments.flatMap((item) => {
      if (!item.pairedStrengthId) return [];
      const record = assessmentResults[item.id];
      const result = strengthAnswerResult(record?.pairedStrength, record?.pairedStrengthUnableReason);
      return [{
        id: item.pairedStrengthId,
        label: labelFor(item.pairedStrengthId),
        result: trendFromAssessmentResult(result === "not-testable" ? "not-testable" : result),
      } satisfies ReviewResult];
    });
    const tracking = findings
      .filter((finding) => !finding.internal && finding.priority === "track")
      .map((finding): ReviewResult => ({ id: finding.id.replace(/^track:/, ""), label: finding.title, result: "same" }));
    return [...base, ...paired, ...tracking]
      .filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index);
  }, [assessments, assessmentResults, findings, pilotFindingInputs]);
  const localLimbDecision = useMemo(() => {
    if (!region || !["thigh-local", "calf-local"].includes(region.id)) return null;
    const directLocalFindings: LocalLimbFinding[] = pilotFindingInputs
      .filter((finding) => finding.id.startsWith("motion:") || finding.id.startsWith("strength:") || finding.id.startsWith("function:"))
      .map((finding) => {
        const bareId = finding.id.replace(/^(motion|strength|function):/, "");
      const followupResult = sessionNumber > 1
          ? followupTrends[finding.id] ?? previousSessionForReview?.reviewResults.find((item) => item.id === finding.id)?.result
          : undefined;
        return {
        id: bareId,
        kind: finding.id.startsWith("motion:") ? "length" : finding.id.startsWith("strength:") ? "strength" : "function",
        result: followupResult === "better" ? "normal"
          : followupResult === "unknown" || followupResult === "unable" ? "unknown"
            : followupResult === "same" || followupResult === "worse"
              ? finding.id.startsWith("motion:") ? "limited" : finding.id.startsWith("strength:") ? "weak" : "painful"
            : finding.result === "not-testable" || finding.result === "positive" ? "unknown" : finding.result,
      }});
    // 局部活动与发力在首诊界面合并成一张卡片；这里把卡片中的
    // pairedStrength 明确还原成力量 finding，防止“用户选了偏弱，核心没收到”。
    const pairedLocalStrengthFindings: LocalLimbFinding[] = assessments.flatMap((item) => {
      if (!item.pairedStrengthId) return [];
      const answer = assessmentResults[item.id]?.pairedStrength;
      const followupResult = sessionNumber > 1
        ? followupTrends[item.pairedStrengthId] ?? previousSessionForReview?.reviewResults.find((entry) => entry.id === item.pairedStrengthId)?.result
        : undefined;
      const pairedResult = strengthAnswerResult(answer, assessmentResults[item.id]?.pairedStrengthUnableReason);
        const result: LocalLimbFinding["result"] = followupResult === "better" ? "normal"
        : followupResult === "unknown" || followupResult === "unable" ? "unknown"
        : followupResult === "same" || followupResult === "worse" ? "weak"
        : pairedResult === "not-testable" ? "unknown" : pairedResult;
      return [{ id: item.pairedStrengthId.replace(/^strength:/, ""), kind: "strength", result }];
    });
    const localFindings = [...directLocalFindings, ...pairedLocalStrengthFindings]
      .filter((finding, index, list) => list.findIndex((item) => item.id === finding.id) === index);
    const treatmentHistory = [
      ...trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly).map((record) => ({ id: record.candidateId, result: record.result, responseRole: record.responseRole, sessionNumber: 1 })),
      ...followupTrialRecords.filter((record) => !record.reviewOnly && !record.retestOnly).map((record) => ({ id: record.candidateId, result: record.result, responseRole: record.responseRole, sessionNumber: record.sessionNumber })),
    ];
    return buildLocalLimbDecision({
      regionId: region.id as "thigh-local" | "calf-local",
      location: intake.location,
      onset: intake.onset,
      mechanism: intake.mechanism,
      symptomType: intake.symptomType,
      symptoms: intake.symptoms,
      provocationTypes: activeProvocationTypes,
      goal: intake.goal,
      sessionNumber,
      findings: localFindings,
      treatmentHistory,
      hasNewSymptom: hasNewSymptom === "yes",
    });
  }, [region, intake, pilotFindingInputs, trialRecords, followupTrialRecords, sessionNumber, hasNewSymptom, followupTrends, previousSessionForReview, assessments, assessmentResults, activeProvocationTypes]);

  const swellingGuidance = useMemo(() => {
    if (!region || !intake.symptoms.includes("肿胀或淤青")) return undefined;
    return [...matchedCandidateGroups.flatMap((group) => group.candidates), ...region.candidateGroups.flatMap((group) => group.candidates)]
      .find((candidate) => candidate.type === "swelling" && candidateIsAvailable(candidate, workflowProfile));
  }, [region, intake, matchedCandidateGroups, workflowProfile]);

  const baseTrialTargets = useMemo<TrialTarget[]>(() => {
    if (!region || !findings.length) return [];
    const ctx: DecisionContext = {
      region,
      findings,
      assessmentResults,
      intake,
      trialRecords,
      tissuePathway,
      kneeDecision,
      localLimbDecision,
      matchedPilotRelations,
      pilotRelationsByAssessmentId,
      pilotTreatmentUnits,
      matchedCandidateGroups,
      canAssessPassive,
      canMobilizeJoint,
      workflowProfile,
      swellingGuidance,
      assessments,
      sharedTensionId: SHARED_TENSION_ASSESSMENT_ID,
      assessmentTitle,
      sharedTensionLocationsForMotion,
      chiefFunctionAssessmentId,
    };
    return buildTrialTargets(ctx) as unknown as TrialTarget[];
  }, [region, findings, matchedCandidateGroups, assessmentResults, intake, canAssessPassive, canMobilizeJoint, workflowProfile, swellingGuidance, assessments, matchedPilotRelations, pilotRelationsByAssessmentId, pilotTreatmentUnits, kneeDecision, localLimbDecision, tissuePathway, trialRecords]);

  const currentSessionTrials = useMemo(
    () => followupMode
      ? followupTrialRecords.filter((record) => record.sessionNumber === sessionNumber).map(sessionTreatmentAsTrialRecord)
      : trialRecords,
    [followupMode, followupTrialRecords, sessionNumber, trialRecords],
  );
  const queueLinkedFunctionRetests = useMemo(() => pendingFunctionRetests({
    targets: baseTrialTargets,
    records: currentSessionTrials,
  }), [baseTrialTargets, currentSessionTrials]);
  const assessmentFunctionRetestItems = useMemo(() => {
    if (assessmentOwnerSessionId !== sessionId) return [];
    const candidateIdsByAssessment = new Map(queueLinkedFunctionRetests.map((item) => [item.assessmentId, item.candidateIds]));
    const ownedAssessmentSet = assessmentHistory.find((item) => item.sessionId === sessionId
      && item.assessmentRevision === assessmentRevision);
    return assessments.flatMap((item) => {
      if (item.kind !== "function") return [];
      const followupReview = ownedAssessmentSet?.reviewResults?.[item.id] ?? followupTrends[item.id];
      if (followupMode && !followupReview) return [];
      if (followupMode && ["better", "unknown", "unable"].includes(followupReview)) return [];
      const record = followupMode ? assessmentResults[item.id] : (ownedAssessmentSet?.results[item.id] ?? assessmentResults[item.id]);
      if (currentSessionTrials.some((trial) => Boolean(trial.functionRetests?.[item.id]))) return [];
      const evidence = functionEvidenceFromRecord(item.id, record);
      const shouldRetest = evidence.completion === "complete"
        ? record?.functionDiscomfort === "yes" || record?.discomfort === "yes"
        : evidence.completion === "unable" && ["pain", "weak"].includes(record?.functionUnableReason ?? "");
      if (!evidence.performed || !shouldRetest || evidence.retestMode === "none") return [];
      return [{
        assessmentId: item.id,
        label: item.title,
        baselineCompletion: evidence.completion as FunctionRetestCompletion,
        mode: evidence.retestMode as FunctionRetestMode,
        baselineScore: evidence.retestMode === "ordinary" && typeof record?.symptomScore === "number" ? record.symptomScore : undefined,
        sides: intake.side === "双侧/中间" ? (["左侧", "右侧"] as Array<"左侧" | "右侧">) : undefined,
        candidateIds: candidateIdsByAssessment.get(item.id) ?? [],
        assessmentRevision,
      }];
    });
  }, [assessmentOwnerSessionId, sessionId, queueLinkedFunctionRetests, assessmentHistory, assessments, assessmentResults, currentSessionTrials, intake.side, assessmentRevision, followupMode, followupTrends]);
  const pendingFunctionRetestItems = assessmentFunctionRetestItems;
  const pendingFunctionRetestIds = useMemo(
    () => new Set(pendingFunctionRetestItems.map((item) => item.assessmentId)),
    [pendingFunctionRetestItems],
  );
  const retestSignals = useMemo(() => {
    const signals: import("@/src/domain/rehab/retest/retest-ledger-core").RetestSignalInput[] = [];
    const actualTreatments = currentSessionTrials.filter((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased);
    const chiefCanBeCompared = intake.baselineScoreConfirmed && hasClearChiefAction(intake);
    const chiefAlreadyRecorded = currentSessionTrials.some((record) => record.chiefRetested);
    const lastTreatmentScore = currentSessionTrials.at(-1)?.afterScore ?? (followupMode ? followupScore : intake.baselineScore);
    const addChiefResult = (source: string, before: number, after: number, recordedAt: string | undefined) => signals.push({
      kind: "chief",
      targetId: "chief-action",
      label: chiefActionLabel(intake),
      required: true,
      status: "completed",
      result: resultFromScore(before, after),
      score: after,
      sourceEventId: `chief-retest:${sessionId}:${source}:${recordedAt ?? sessionStartedAt}`,
      recordedAt: recordedAt ?? sessionStartedAt,
      assessmentRevision,
    });
    if (chiefCanBeCompared) {
      if (!followupMode && treatmentFinalRetestConfirmed) {
        addChiefResult("treatment-final", lastTreatmentScore, treatmentFinalRetestScore, treatmentFinalRetestRecordedAt);
      }
      if (!followupMode && finalRetestConfirmed) {
        addChiefResult("training-final", treatmentFinalRetestConfirmed ? treatmentFinalRetestScore : lastTreatmentScore, finalRetestScore, finalRetestRecordedAt);
      }
      if (followupMode && followupFinalScoreConfirmed) {
        addChiefResult("followup-training-final", lastTreatmentScore, followupFinalScore, followupFinalRetestRecordedAt);
      }
      const chiefConfirmedOutsideTrials = !followupMode
        ? treatmentFinalRetestConfirmed || finalRetestConfirmed
        : followupFinalScoreConfirmed;
      if (actualTreatments.length && !chiefAlreadyRecorded && !chiefConfirmedOutsideTrials) signals.push({
        kind: "chief",
        targetId: "chief-action",
        label: chiefActionLabel(intake),
        required: true,
        status: "pending",
        assessmentRevision,
      });
    }
    if (!followupMode) Object.entries(exerciseFeedback).forEach(([exerciseId, feedback]) => {
      const everWorse = feedback.symptom === "worse" || feedback.symptomHistory?.includes("worse");
      if (!everWorse) return;
      const handled = feedback.symptom !== "worse" || feedback.followUpAction === "regress-training";
      const recordedAt = feedback.recordedAt ?? sessionStartedAt;
      const episodeNumber = [...(feedback.symptomHistory ?? []), feedback.symptom].filter((value) => value === "worse").length;
      const episodeId = `training-worse-${Math.max(1, episodeNumber)}`;
      signals.push({
        kind: "training-safety",
        targetId: exerciseId,
        label: region?.exercises.find((exercise) => exercise.id === exerciseId)?.title ?? "训练动作",
        required: true,
        status: handled ? "completed" : "pending",
        result: handled ? "same" : undefined,
        sourceEventId: handled ? `training-feedback:${sessionId}:${exerciseId}:${episodeId}:${recordedAt}:handled` : undefined,
        episodeId,
        recordedAt,
        assessmentRevision,
      });
    });
    return signals;
  }, [assessmentRevision, currentSessionTrials, exerciseFeedback, finalRetestConfirmed, finalRetestRecordedAt, finalRetestScore, followupFinalRetestRecordedAt, followupFinalScore, followupFinalScoreConfirmed, followupMode, followupScore, intake, region, sessionId, sessionStartedAt, treatmentFinalRetestConfirmed, treatmentFinalRetestRecordedAt, treatmentFinalRetestScore]);
  const activeRetestLedger = useMemo(() => buildRetestLedgerFromTrials({
    caseId: localCaseId,
    problemThreadId,
    sessionId,
    recordedAt: sessionStartedAt,
    assessmentRevision,
    trials: currentSessionTrials,
    pendingFunctions: pendingFunctionRetestItems,
    pendingRangeDirectionIds: (followupMode ? followupRetestPlan : retestPlan)?.directionIds ?? [],
    signals: retestSignals,
    previousObligations: persistedRetestObligations,
    previousRecords: persistedRetestRecords,
  }), [localCaseId, problemThreadId, sessionId, sessionStartedAt, assessmentRevision, currentSessionTrials, pendingFunctionRetestItems, followupMode, followupRetestPlan, retestPlan, retestSignals, persistedRetestObligations, persistedRetestRecords]);
  const outstandingFunctionRetests = useMemo<FunctionRetestObligation[]>(() => {
    const grouped = new Map<string, FunctionRetestObligation>();
    activeRetestLedger.obligations
      .filter((item) => item.sessionId === sessionId && item.kind === "function" && item.required && item.status === "pending")
      .forEach((item) => {
        const existing = grouped.get(item.targetId);
        const sides = [...new Set([...(existing?.sides ?? []), ...(item.side ? [item.side] : [])])];
        grouped.set(item.targetId, {
          assessmentId: item.targetId,
          label: item.label,
          baselineCompletion: item.baselineCompletion ?? "complete",
          mode: item.mode ?? "ordinary",
         baselineScore: item.baselineScore,
         sides: sides.length ? sides : undefined,
          candidateIds: item.scheduledCandidateIds,
       });
      });
    return [...grouped.values()];
  }, [activeRetestLedger.obligations, sessionId]);

  const trialTargets = useMemo<TrialTarget[]>(() => {
    const recordedRangeDirections = new Set(trialRecords.flatMap((record) => Object.keys(record.rangeOutcomes ?? {})));
    const chiefHasCurrentRetest = hasRecordedChiefRetest(trialRecords);
    // Both end-of-treatment and end-of-training chief retests close the
    // current treatment queue. Without this shared lock a dynamic rebuild can
    // reintroduce the old chief muscle card for one render.
    const chiefRetestLocked = treatmentFinalRetestConfirmed || finalRetestConfirmed;
    const resultAlreadyCoversCandidate = (target: TrialTarget, candidate: FullCandidate) => {
      // 最后一次主诉复测完成后，本轮处理已经进入训练交接。该复测不会
      // 新增 trialRecord，所以不能让旧的 target:chief 候选重新浮出来，
      // 否则普通用户刚测完主诉又会再次看到同一块肌肉松解。
      const treatmentSide = target.finding.side ?? intake.side;
      const treatmentKeys = intake.side === "双侧/中间"
        ? new Set([candidateTreatmentKey(candidate, treatmentSide), candidateTreatmentKey(candidate, "")])
        : new Set([candidateTreatmentKey(candidate, treatmentSide)]);
      const prior = [...trialRecords].reverse().find((record) => !record.reviewOnly && !record.retestOnly
        && (treatmentKeys.has(record.treatmentKey ?? "")
          || !record.treatmentSide && record.candidateId === candidate.id));
      // 肿胀是时间性管理，只在本次完成一次；它不属于可以跨问题复用
      // 的即时处理，但已完成的肿胀目标必须从动态队列移除。
      if (candidate.type === "swelling") return Boolean(prior);
      const targetHasPendingFunctionRetest = (target.functionRetestObligations ?? [])
        .some((obligation) => pendingFunctionRetestIds.has(obligation.assessmentId));
      if (prior && targetHasPendingFunctionRetest) return false;
      if (chiefRetestLocked) return true;
      if (!treatmentCanCarryAcrossProblems(candidate)) return false;
      if (!prior) return false;
      // 主诉已经在本次康复中复测过后，同一候选不应因它还带有
      // retestIds 而重新出现在队列。活动范围若仍未达标，会由对应的
      // 活动度/关节/控制目标继续承接，而不是再次松解同一肌肉。
      if (target.id === "target:chief" && chiefHasCurrentRetest) return true;
      const directionIds = candidate.retestIds ?? [];
      if (directionIds.length) return directionIds.every((directionId) => [...recordedRangeDirections].some((recordedId) => samePhysicalAction(recordedId, directionId)));
      return target.id === "target:chief" && chiefHasCurrentRetest;
    };
    const priorityTargets = intake.side === "双侧/中间" && intake.prioritySide
      ? [
        ...baseTrialTargets.filter((target) => target.id === "target:chief"),
        ...orderBilateralSides(baseTrialTargets.filter((target) => target.id !== "target:chief"), intake.prioritySide, (target) => target.finding.side),
      ]
      : baseTrialTargets;
    return consolidateTrialTargetsByTreatment(priorityTargets.map((target) => ({
      ...target,
      candidates: [
        ...target.candidates,
        ...(target.optionalCandidates ?? []).filter((candidate) => selectedOptionalCandidateIds.includes(optionalTreatmentSelectionKey(target.id, candidate.id))),
      ].filter((candidate) => !resultAlreadyCoversCandidate(target, candidate)),
    })).filter((target) => target.candidates.length > 0), intake.side === "双侧/中间");
  }, [baseTrialTargets, selectedOptionalCandidateIds, trialRecords, intake.side, intake.prioritySide, treatmentFinalRetestConfirmed, finalRetestConfirmed, pendingFunctionRetestIds]);

  useEffect(() => {
    if (!pendingTrialAdvance) return;
    const decision = workflowController.recomputeTreatmentQueue({
      currentIndex: trialTargetIndex,
      targets: trialTargets,
      pending: pendingTrialAdvance,
    });
    const resolvedIndex = decision.resolvedIndex;
    if (trialTargetIndex !== resolvedIndex) setTrialTargetIndex(resolvedIndex);
    setPendingTrialAdvance(null);
  }, [trialTargets, trialTargetIndex, pendingTrialAdvance, workflowController, setPendingTrialAdvance, setTrialTargetIndex]);

  useEffect(() => {
    if (!trialTargets.length) {
      // 候选会随评估答案和复测结果动态缩短；索引必须同步回到有效范围。
      if (trialTargetIndex !== 0) setTrialTargetIndex(0);
      if (candidateIndex !== 0) setCandidateIndex(0);
      return;
    }
    if (trialTargetIndex >= trialTargets.length) return;
    const candidateCount = trialTargets[trialTargetIndex]?.candidates.length ?? 0;
    if (candidateCount > 0 && candidateIndex >= candidateCount) {
      setCandidateIndex(0);
      setReadyToRetest(false);
      setRetestPlan(null);
    }
  }, [trialTargets, trialTargetIndex, candidateIndex, setCandidateIndex, setReadyToRetest, setRetestPlan, setTrialTargetIndex]);

  const activeTarget = trialTargets[trialTargetIndex];
  const activeCandidate = activeTarget?.candidates[candidateIndex];
  const activeTargetSides: BilateralSide[] = activeTarget
    ? Array.from(new Set((activeTarget.findingSides ?? [activeTarget.finding.side]).flatMap((side) => side === "两侧异常" ? ["左侧", "右侧"] : side === "左侧" || side === "右侧" ? [side] : [])))
    : [];
  const activeTargetIsBilateral = intake.side === "双侧/中间" && activeTargetSides.length > 1;
  const activeTargetCompletedSides = activeTarget ? bilateralTreatmentSides[activeTarget.id] ?? [] : [];
  const activeTargetPendingSides = activeTargetSides.filter((side) => !activeTargetCompletedSides.includes(side));
  const activeTargetCurrentSide = activeTargetPendingSides.includes(intake.prioritySide ?? "左侧")
    ? intake.prioritySide
    : activeTargetPendingSides[0] ?? activeTargetSides[0];
  function advanceToNextTrialTarget(rebuildFromQueue = false) {
    if (!activeTarget) return;
    const nextTarget = trialTargets[trialTargetIndex + 1];
    setPendingTrialAdvance(workflowController.createPendingQueueAdvance(activeTarget, nextTarget));
    // Time-based items such as swelling are removed from the live queue after
    // saving. Rebuild from index 0 so a newly exposed treatment cannot be
    // skipped when the queue changes shape in the same render cycle.
    setTrialTargetIndex((current) => rebuildFromQueue ? 0 : current + 1);
    setCandidateIndex(0);
  }
  const weakStrengthProblems = findings.filter((finding) => finding.id.startsWith("strength:") && (
    assessmentResults[finding.id]?.simple === "weak"
    || finding.title.includes("发力偏弱")
  ));
  const noChiefActionAndNoAssessmentProblem = !hasClearChiefAction(intake)
    && !findings.some((finding) => finding.priority === "support")
    && !findings.some((finding) => ["track:swelling", "track:tender", "track:sensory"].includes(finding.id));
  const assessmentEvidenceState = classifyPilotAssessmentEvidence(pilotFindingInputs);
  const assessmentEvidenceInsufficient = assessmentEvidenceState === "incomplete";
  const assessmentGap = firstAssessmentGap(assessments.map((item) => item.id), assessmentResults);
  const treatmentWorsened = treatmentMustStop(trialRecords);
  function priorTreatmentFor(candidate: FullCandidate) {
    if (!treatmentCanCarryAcrossProblems(candidate)) return undefined;
    const treatmentSide = activeTarget?.finding.side ?? intake.side;
    return [...trialRecords].reverse().find((record) => !record.retestOnly
      && (record.treatmentKey === candidateTreatmentKey(candidate, treatmentSide)
        || !record.treatmentSide && record.candidateId === candidate.id));
  }
  // 一次只试一个处理区域，才能知道哪一项真正带来变化。
  // 同一区域可能影响多个活动方向，这些方向仍在一次处理后统一复测。
  const activeGroupEndIndex = candidateIndex;
  const activeCandidateGroup = activeTarget ? activeTarget.candidates.slice(candidateIndex, activeGroupEndIndex + 1) : [];
  const activeLedgerFunctionRetests = outstandingFunctionRetests.filter((item) => {
    if (activeTarget?.finding.id === item.assessmentId) return true;
    if (!item.candidateIds?.length) return true;
    return activeCandidateGroup.some((candidate) => item.candidateIds?.includes(candidate.id));
  });
  const activeGroupPriorRecords = activeTarget
    ? activeCandidateGroup.map((candidate) => priorTreatmentFor(candidate)).filter((record): record is TrialRecord => Boolean(record))
    : [];
  const activeNewCandidates = activeTarget
    ? activeCandidateGroup.filter((candidate) => !priorTreatmentFor(candidate))
    : [];
  // 大腿/小腿局部路径切换到新的主要来源时，要再次记录主诉，才能区分
  // A 的部分贡献和 B 的关键完成。同一来源复用、配合处理和复查项不重复问。
  // 大腿/小腿局部路径只在本次处理阶段第一次需要时复测主诉。
  // 后续来源只复测仍异常的相关活动，避免页面不显示评分条、提交逻辑却
  // 仍等待主诉分数而卡住，也避免每处理一个区域都重复主诉复测。
  const localNewSourceNeedsChiefRetest = Boolean(localLimbDecision
    && activeNewCandidates.length
    && hasClearChiefAction(intake)
    && !hasRecordedChiefRetest(trialRecords));
  const priorTreatmentRecord = activeGroupPriorRecords[0];
  const latestRangeOutcomes = useMemo<Record<string, CompletedRangeRetestAnswer>>(() => {
    const latest: Record<string, CompletedRangeRetestAnswer> = {};
    trialRecords.forEach((record) => {
      if (record.rangeOutcomes) Object.assign(latest, record.rangeOutcomes);
      else if (record.rangeOutcome && record.targetId.startsWith("target:motion:")) latest[record.targetId.replace("target:motion:", "")] = record.rangeOutcome;
    });
    return latest;
  }, [trialRecords]);
  const latestOutcomeForDirection = useCallback((directionId: string, outcomes = latestRangeOutcomes) => {
    const exact = outcomes[directionId];
    if (exact) return exact;
    const matchingKey = Object.keys(outcomes).find((id) => samePhysicalAction(id, directionId));
    return matchingKey ? outcomes[matchingKey] : undefined;
  }, [latestRangeOutcomes]);
  const latestRangeScores = useMemo<Record<string, number>>(() => {
    const latest: Record<string, number> = {};
    trialRecords.forEach((record) => {
      if (record.rangeScores) Object.assign(latest, record.rangeScores);
    });
    return latest;
  }, [trialRecords]);
  const latestRangeScoreForDirection = (directionId: string) => {
    const exact = latestRangeScores[directionId];
    if (typeof exact === "number") return exact;
    const alias = Object.entries(latestRangeScores).find(([id]) => samePhysicalAction(id, directionId));
    return alias?.[1];
  };
  const routedProblemIds = new Set(trialTargets.flatMap((target) => [
    target.finding.id,
    ...(target.retestFindings ?? []).map((finding) => finding.id),
  ]));
  // “已经复测”不等于“已经解决”。尤其是活动范围只改善了一部分、或
  // 主诉评分下降但仍大于0时，问题必须继续留在台账中，不能因为本轮有
  // rangeOutcomes 就被标记为完成。
  // 台账只反映每个问题的最新状态。不能因为上一轮曾经达到健侧，
  // 后来又出现“变差”，仍把它永久标成已解决。
  const completedProblemIds = completedProblemIdsFromTreatmentRecords(trialRecords, latestRangeOutcomes);
  const problemLedger = buildProblemLedger(treatmentProblems.map((problem) => ({
    id: problem.id,
    kind: problem.kind,
    routed: routedProblemIds.has(problem.id)
      || problem.findingIds.some((id) => routedProblemIds.has(id))
      || Boolean(problem.directionId && [...routedProblemIds].some((id) => samePhysicalAction(id.replace(/^motion:/, ""), problem.directionId))),
    completed: completedProblemIds.has(problem.id)
      || problem.findingIds.some((id) => completedProblemIds.has(id))
      || Boolean(problem.directionId && latestOutcomeForDirection(problem.directionId) === "both-match"),
  })), { pathway: tissuePathway.id, assessmentInsufficient: assessmentEvidenceInsufficient });
  const treatmentEmptyState = emptyTreatmentMessage(problemLedger);
  const unresolvedLedgerProblem = hasUnroutedImmediateProblem(problemLedger);
  // "已进入处理路径" 不等于 "问题已经解决"。处理队列为空时仍要保留
  // 未达到目标的主诉/活动度，给出明确的下一步，不能静默结束本次流程。
  const unresolvedImmediateLedgerProblems = unresolvedImmediateProblems(problemLedger);

  const recordedImmediateChiefScore = useMemo(() => {
    return latestRecordedChiefScore(trialRecords, intake.baselineScore);
  }, [trialRecords, intake.baselineScore]);
  // 主诉分数只来自显式的主诉复测记录（chiefRetested）。复测方向活动范围时
  // 顺手记的症状分属于「范围分数」，不参与主诉台账——否则主诉没复测、分数却在跳。
  const lastImmediateChiefScore = recordedImmediateChiefScore;
  // 主诉在本次处理阶段只需要先复测一次。只有真的保存过主诉复测后，
  // 后续处理才可以跳过逐项主诉询问；“后面还有候选”本身不能算复测完成，
  // 否则肿胀管理后第一块肌肉就会被错误地直接跳到下一项。
  const chiefRetestCompletedDuringTreatment = hasRecordedChiefRetest(trialRecords);
  const chiefDirectionIdsForBaseline = region && hasClearChiefAction(intake)
    ? chiefMotionDirectionIds(intake, region.id)
    : [];
  const chiefFunctionIdsForBaseline = region && hasClearChiefAction(intake)
    ? chiefFunctionAssessmentIds(intake, region.id)
    : [];
  const hasChiefFunctionPlan = chiefFunctionIdsForBaseline.some((id) => assessments.some((assessment) => assessment.id === id));
  const actualChiefFunctionIdsForBaseline = hasChiefFunctionPlan
    ? chiefFunctionIdsForBaseline.filter((id) => assessments.some((assessment) => assessment.id === id))
    : [];
  // 主诉方向可以由实际完成的主动活动度卡直接形成基线，不要求额外的
  // 配对力量或被动检查再重复一次动作。这里只检查本次实际渲染的 assessment，
  // 不把理论候选当成已完成检查；同一动作通过 samePhysicalAction 归一。
  const chiefBaselineEvidence = [
    ...chiefDirectionIdsForBaseline.flatMap((directionId) => {
      const item = assessments.find((assessment) => assessment.kind === "motion" && samePhysicalAction(assessment.id, `motion:${directionId}`));
      const record = item ? assessmentResults[item.id] : undefined;
      if (!item || !record || record.active === "unable" || !activeMotionRecordComplete(record, false)) return [];
      return [{ mode: "ordinary" as const }];
    }),
    ...actualChiefFunctionIdsForBaseline.flatMap((id) => {
      const item = assessments.find((assessment) => assessment.id === id);
      const record = assessmentResults[id];
      if (!item || !assessmentRecordComplete(
        item,
        record,
        assessmentAllowsPassive(item, canAssessPassive),
        intake.side === "双侧/中间",
        false,
        assessmentAllowsEndFeel(item, canAssessEndFeel),
      )) return [];
      const evidence = functionEvidenceFromRecord(id, record);
      return evidence.retestMode === "none" ? [] : [{ mode: evidence.retestMode }];
    }),
  ];
  const chiefBaselineMode: FunctionRetestMode | "none" = retestBaselineModeFromEvidence(chiefBaselineEvidence);
  const completedChiefBaseline = chiefBaselineMode !== "none";
  const chiefRetestEligibility = retestEligibility({
    hasReportedChiefAction: reportedActionSummary(intake).length === 1,
    hasPerformedBaseline: completedChiefBaseline,
    baselineMode: chiefBaselineMode,
    isComparableNow: intake.baselineScoreConfirmed && intake.side !== "双侧/中间",
  });
  const chiefScoreComparable = ["same-session", "after-training"].includes(chiefRetestEligibility);
  const chiefImprovedDuringTreatment = trialRecords.some((record) => record.chiefRetested && record.afterScore < record.beforeScore)
    || (chiefScoreComparable && lastImmediateChiefScore < intake.baselineScore);
  // 最终主诉复测只由“最近一次主诉记录后是否又做了处理”决定。
  // 后续处理即使仍归在主诉处理链，也会改变主诉，不能因为没有被分类成
  // “独立问题”就跳过本轮最终复测。
  const hasActualTreatmentWithoutChiefRetest = chiefScoreComparable
    && trialRecords.some((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased)
    && !hasRecordedChiefRetest(trialRecords);
  const chiefNeedsFinalRetest = needsTreatmentFinalChiefRetest(trialRecords, chiefScoreComparable)
    || hasActualTreatmentWithoutChiefRetest;
  const lastChiefScore = treatmentFinalRetestConfirmed ? treatmentFinalRetestScore : lastImmediateChiefScore;
  const sessionEndScore = chiefScoreComparable ? (finalRetestConfirmed ? finalRetestScore : lastChiefScore) : intake.baselineScore;

  function directionAllowsPassive(directionId: string) {
    const item = assessments.find((assessment) => assessment.id === `motion:${directionId}`);
    return (item ? assessmentAllowsPassive(item, canAssessPassive) : canAssessPassive)
      && !(item?.spinal && !item.id.includes("rotation"));
  }

  function directionNeedsCandidate(candidate: FullCandidate, directionId: string, outcomes = latestRangeOutcomes) {
    const current = latestOutcomeForDirection(directionId, outcomes);
    const hasRetestForDirection = Object.keys(outcomes).some((id) => samePhysicalAction(id, directionId));
    const initialMotionRecord = valueForPhysicalAction(assessmentResults, `motion:${directionId}`);
    return isTreatmentQueueDirectionCandidateNeeded({
      candidateType: candidate.type,
      currentOutcome: current,
      hasRetestForDirection,
      initialPassive: initialMotionRecord?.passive,
      motionAnswerIsLimited: motionAnswerIsLimited(initialMotionRecord?.active),
      canMobilizeJoint,
      directionAllowsPassive: directionAllowsPassive(directionId),
    });
  }

  const chiefReviewIndex = activeTarget?.candidates.findIndex((candidate) => candidate.id === RESIDUAL_REVIEW_ID) ?? -1;
  const chiefTreatmentEndIndex = chiefReviewIndex >= 0 ? chiefReviewIndex : activeTarget?.id === "target:chief" ? activeTarget.candidates.length : 0;
  const isChiefTreatmentPhase = activeTarget?.id === "target:chief" && candidateIndex < chiefTreatmentEndIndex;
  const isResidualReviewStep = activeCandidate?.id === RESIDUAL_REVIEW_ID;
  const activeGroupRetestIds = new Set(activeCandidateGroup.flatMap((candidate) => candidate.retestIds ?? []));
  // A target normally carries its retest findings when the queue is built.
  // Dynamic target rebuilding can still leave that list stale for one render
  // (especially when the chief is a functional task and the same treatment
  // region also affects a joint direction). Rebuild the relevant directions
  // from the current candidate identity before rendering the treatment card,
  // so a muscle unit never falls back to a chief-only score retest.
  const activeCandidateActionIds = new Set(activeCandidateGroup.flatMap((candidate) => [
    ...(candidate.retestIds ?? []),
    ...candidatePilotMotionIds(candidate),
  ]).map(canonicalActionIdFromAssessmentId));
  const activeGroupRetestActionIds = new Set([...activeGroupRetestIds, ...activeCandidateActionIds].map(canonicalActionIdFromAssessmentId));
  const activeTargetRetestFindings = dedupeRetestFindingsByAction([
    ...(activeTarget?.retestFindings ?? []),
    ...findings.filter((finding) => finding.priority === "support"
      && finding.id.startsWith("motion:")
      && activeGroupRetestActionIds.has(actionIdFromFinding(finding))),
  ]);
  const liveActiveRetestFindings = dedupeRetestFindingsByAction(activeTargetRetestFindings
    .filter((finding) => activeGroupRetestActionIds.has(actionIdFromFinding(finding)))
    // 如果同一物理动作在本轮刚刚已经达到比较目标（或明确变差并已停止），
    // 后续相邻肌肉处理不再重复复测这个动作；只有仍未解决的方向才重新进入清单。
    .filter((finding) => isResidualReviewStep || !["both-match", "worse"].includes(latestOutcomeForDirection(motionIdFromFinding(finding)) ?? ""))
    .filter((finding) => isResidualReviewStep || activeCandidateGroup.some((candidate) => directionNeedsCandidate(candidate, motionIdFromFinding(finding)))));
  const activeRetestFindings = readyToRetest && retestPlan && retestPlan.targetId === activeTarget?.id && retestPlan.candidateId === activeCandidate?.id
    ? dedupeRetestFindingsByAction(activeTargetRetestFindings.filter((finding) => retestPlan.directionIds.some((id) => samePhysicalAction(id, motionIdFromFinding(finding)))))
    : liveActiveRetestFindings;
  const activeControlMotionIds = [...new Set(activeRetestFindings.map(motionIdFromFinding))];

  const effectiveTreatmentCandidates = useMemo<FullCandidate[]>(() => {
    if (!region) return [];
    if (tissuePathway.id === "bone-stress-suspected") return [];
    const sourceCandidates = [...(region.mobilityInterventions ?? []), ...region.candidateGroups.flatMap((group) => group.candidates)];
    const effectiveIds = new Set(trialRecords
      .filter((record) => ["better", "partial"].includes(record.result) && !record.activityWorsened && !record.timeBased && !record.reviewOnly && !record.retestOnly && !record.supportingOnly)
      .map((record) => record.candidateId));
    const effectiveSourceCandidates = sourceCandidates
      .filter((candidate) => effectiveIds.has(candidate.id))
      .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
    const effectiveDynamicCandidates = trialRecords
      .filter((record) => ["better", "partial"].includes(record.result) && !record.activityWorsened && !record.timeBased && !record.reviewOnly && !record.retestOnly && !record.supportingOnly)
      .map(dynamicMuscleCandidateFromRecord)
      .filter((candidate): candidate is FullCandidate => Boolean(candidate));
    // 膝适配层会把线下处理单元映射成 knee-* 核心 id 再写入记录，
    // 这些 id 不存在于原始 candidateGroups。这里把它还原成可展示的
    // 候选，确保“本次有效方向”和后续训练不会凭空消失。
    if (region.id !== "knee" || !kneeDecision) return [...effectiveSourceCandidates, ...effectiveDynamicCandidates]
      .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
    const effectiveKneeCandidates = kneeDecision.treatmentUnits.flatMap((unit) => {
      if (!effectiveIds.has(unit.id)) return [];
      const legacyIds = kneeLegacyCandidateIdsForUnit(unit.id);
      const source = sourceCandidates.find((candidate) => legacyIds.includes(candidate.id))
        ?? sourceCandidates.find((candidate) => candidate.id === unit.id);
      if (!source) return [];
      const access: FullCandidate["access"] = unit.permission === "all"
        ? "self"
        : unit.permission === "coach-rehab" ? "coach" : "therapist";
      return [{
        ...source,
        id: unit.id,
        access,
        tags: [...source.tags, `knee-core:${unit.id}`, ...legacyIds.map((id) => `legacy-candidate:${id}`)],
        retestIds: Array.from(new Set([...(source.retestIds ?? []), ...unit.relatedActionIds.filter((id) => id === "knee-extension" || id === "knee-flexion")])),
        siteLabel: unit.site,
        targetLabel: "",
        actionLabel: unit.action,
        do: kneeTreatmentInstruction(unit),
        retest: kneeRetestInstruction(unit),
      } satisfies FullCandidate];
    });
    return [...effectiveSourceCandidates, ...effectiveDynamicCandidates, ...effectiveKneeCandidates]
      .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
  }, [region, trialRecords, kneeDecision, tissuePathway.id]);
  const effectiveFocusLabels = effectiveTreatmentCandidates
    .filter((candidate) => candidate.type === "muscle")
    .map((candidate) => candidateMuscleFocus(candidate).label)
    .filter((label, index, list) => list.indexOf(label) === index);
  const effectiveControlLabels = effectiveTreatmentCandidates
    .filter((candidate) => candidate.type === "control")
    .map((candidate) => candidate.actionLabel || candidate.title)
    .filter((label, index, list) => list.indexOf(label) === index);
  // 本阶段成果：处理复测后，按方向汇总已经恢复与仍受限但改善的活动范围。
  const recoveredRangeLabels = [...new Set(trialRecords.flatMap((record) => Object.entries(record.rangeOutcomes ?? {})
    .filter(([, outcome]) => outcome === "both-match")
    .map(([directionId]) => professionalAssessmentTitle(`motion:${directionId}`, directionId))))];
  const improvedRangeLabels = [...new Set(trialRecords.flatMap((record) => Object.entries(record.rangeOutcomes ?? {})
    .filter(([, outcome]) => ["better-passive-limited", "passive-match-active-limited"].includes(outcome))
    .map(([directionId]) => professionalAssessmentTitle(`motion:${directionId}`, directionId))))]
    .filter((label) => !recoveredRangeLabels.includes(label));
  const trackObservationLabels = findings
    .filter((finding) => ["track:swelling", "track:tender", "track:sensory"].includes(finding.id))
    .map((finding) => finding.title);
  // 首次康复的肌肉处理已经在“针对性处理”完成，训练页不再重复松解。
  // 复诊可根据当次复查出的紧张区域，在训练前做一次简短准备。
  // 局部大腿/小腿路径使用 target:local-limb，但复测的仍可能就是主诉动作。
  // 只按 target:chief 统计会漏掉这类真实复测，导致局部处理无效后既不进入
  // 低刺激路径，又被误判成“还要补充检查”。
  const completedChiefTrials = trialRecords.filter((record) =>
    !record.reviewOnly && !record.retestOnly && (record.targetId === "target:chief" || record.chiefRetested));
  const noImmediateTreatmentResponse = completedChiefTrials.length > 0
    && !completedChiefTrials.some((record) => ["better", "partial"].includes(record.result))
    && lastChiefScore >= intake.baselineScore;

  const exerciseStage = useMemo(() => {
    const acuteHighIrritability = !followupMode && isAcuteTrauma(intake)
      && ["今天或昨天", "2～7天"].includes(intake.onset)
      && (intake.baselineScore >= 4 || intake.symptoms.includes("活动受限"));
    const conservativeAssessment = intake.stabbingPalpation === "sharp" || findings.some((finding) => finding.tags.includes("assessment-sharp") || finding.tags.includes("stage:全过程"));
    // “看过医生”本身不是限制；但如果医生意见没有明确记录为允许或限制，
    // 也不能擅自放行高负荷训练，只进入保守起始级别等待澄清。
    const doctorGuidanceNeedsClarification = medicalGuidanceNeedsClarification(medicalGuidance);
    const doctorLimited = medicalGuidance.restrictionState === "restricted" || doctorGuidanceNeedsClarification;
    const currentSwellingNeedsProtection = !followupMode
      ? intake.symptoms.includes("肿胀或淤青")
      : followupTrends.swelling === "same" || followupTrends.swelling === "worse";
    if (currentSwellingNeedsProtection || intake.goal <= 1 || acuteHighIrritability || (!followupMode && noImmediateTreatmentResponse) || conservativeAssessment || doctorLimited) return 1;
    const currentScore = followupMode && followupScoreConfirmed ? followupScore : sessionEndScore;
    const unresolvedMotion = findings.some((finding) => {
      if (!finding.id.startsWith("motion:")) return false;
      const directionId = motionIdFromFinding(finding);
      const latestOutcome = latestOutcomeForDirection(directionId);
      // 本轮已有复测时，以最新结果为准；没有复测才沿用评估/复诊趋势。
      return latestOutcome
        ? latestOutcome !== "both-match"
        : followupTrends[finding.id] !== "better";
    });
    const sessionCeiling = Math.min(intake.goal, Math.max(2, sessionNumber + 1));
    if (intake.goal <= 2 || currentScore >= 4 || unresolvedMotion) return Math.min(2, sessionCeiling);
    // 恢复目标是终点，不等于第一次康复就直接进入对应高阶训练。
    return sessionCeiling;
  }, [intake, findings, medicalGuidance, noImmediateTreatmentResponse, followupMode, followupScoreConfirmed, followupScore, sessionEndScore, followupTrends, sessionNumber, latestOutcomeForDirection]);

  const exercises = useMemo<FullExercise[]>(() => {
    if (!region) return [];
    // 疑似骨应力只展示降冲击负荷和医学确认提示，不把普通踝足/小腿
    // 训练卡混入当前安排。页面仍提供完成出口，允许保存本次记录。
    if (tissuePathway.id === "bone-stress-suspected") return [];
    if (tissuePathway.id === "tendon-load") {
      const tendonStarterIds = region.id === "ankle-foot"
        ? ["ankle-achilles-isometric"]
        : localLimbDecision?.trainingIds.slice(0, 1) ?? (region.id === "knee" ? ["knee-heel-slide-quad-set"] : []);
      return region.exercises
        .filter((exercise) => tendonStarterIds.includes(exercise.id))
        .map((exercise) => adaptExerciseForCurrentStage(exercise, 1));
    }
    if (localLimbDecision) {
      const localTrainingOrder = new Map(localLimbDecision.trainingIds.map((id, index) => [id, index]));
      return region.exercises
        .filter((exercise) => localTrainingOrder.has(exercise.id))
        .sort((a, b) => (localTrainingOrder.get(a.id) ?? 99) - (localTrainingOrder.get(b.id) ?? 99))
        .map((exercise) => adaptExerciseForCurrentStage(exercise, Math.min(exerciseStage, exercise.stage)));
    }
    if (noChiefActionAndNoAssessmentProblem) return [];
    const findingTags = new Set(findings.flatMap((finding) => finding.tags));
    const ankleP0EligibleControls = region.id === "ankle-foot"
      ? ankleP0EligibleControlExerciseIds(ankleP0RecordsAfterRangeOutcomes(assessmentResults, trialRecords.map((trial) => trial.rangeOutcomes)))
      : new Set<string>();
    const ankleP1EligiblePlantarflexion = region.id === "ankle-foot"
      ? ankleP1EligiblePlantarflexionExerciseIds(assessmentResults)
      : new Set<string>();
    const weakStrengthFindings = findings.filter((finding) => finding.id.startsWith("strength:") && (
      assessmentResults[finding.id]?.simple === "weak"
      || finding.title.includes("发力偏弱")
    ));
    const weakStrengthTags = new Set(weakStrengthFindings.flatMap((finding) => finding.tags));
    const hasWeakStrength = weakStrengthFindings.length > 0;
    const effectiveTags = new Set(effectiveTreatmentCandidates.flatMap((candidate) => candidate.tags));
    const relevant = region.exercises.filter((exercise) => exercise.tags.some((tag) => findingTags.has(tag) || intake.location.includes(tag) || intake.symptomType.includes(tag)));
    const effectiveRelated = region.exercises.filter((exercise) => exercise.tags.some((tag) => effectiveTags.has(tag)));
    const pilotRelated = region.exercises.filter((exercise) => pilotTrainingIds.has(exercise.id));
    const activeKneeDecision = followupMode ? followupKneeDecision : kneeDecision;
    const kneeCoreTrainingIds = new Set(kneeExerciseIdsForDecision(activeKneeDecision));
    const kneeCoreRelated = region.id === "knee" ? region.exercises.filter((exercise) => kneeCoreTrainingIds.has(exercise.id)) : [];
    const kneeSharedControlAllowed = region.id !== "knee"
      || Boolean(kneeP0LineageFromAssessmentRecord("knee-extension-control", assessmentResults["motion:knee-extension"]))
      || Boolean(activeKneeDecision?.treatmentUnits.some((unit) => ["knee-extension-control", "knee-flexion-control", "knee-quadriceps-strength"].includes(unit.id)));
    const ankleDirectionExerciseIds = new Set(findings
      .filter((finding) => finding.id.startsWith("motion:ankle-"))
      .map((finding) => `${motionIdFromFinding(finding)}-control`));
    const directionSpecific = region.id === "ankle-foot"
      ? region.exercises.filter((exercise) => ankleDirectionExerciseIds.has(exercise.id))
      : [];
    const localToeOnly = region.id === "ankle-foot"
      && includesAny(intake.location, ["足趾", "大拇趾", "小拇趾", "前脚掌"])
      && !includesAny(chiefActionSource(intake), ["走路", "步行", "跑", "跳", "台阶", "下蹲", "单腿", "不稳"]);
    const hasFunctionControlEvidence = findings.some((finding) => finding.id.startsWith("function:") && finding.tags.some((tag) => ["function-control", "function-capacity"].includes(tag)));
    const needsPosteriorChainFoundation = region.id === "knee"
      || (region.id === "ankle-foot" && !localToeOnly && (intake.goal >= 3 || hasFunctionControlEvidence));
    const foundationPatternIds: Partial<Record<FullRegionId, string[]>> = {
      knee: ["knee-bridge"],
      "ankle-foot": ["ankle-bridge"],
    };
    const foundationPatterns = exerciseStage >= 2 && needsPosteriorChainFoundation
      ? region.exercises.filter((exercise) => foundationPatternIds[region.id]?.includes(exercise.id))
      : [];
    const recordPatternIds: Partial<Record<FullRegionId, string[]>> = {
      "lumbar-pelvis": ["lumbar-hip-hinge"],
      "hip-thigh": ["hip-sit-stand-hinge"],
      knee: ["knee-single-leg-bridge", "knee-standing-hip-flexion"],
      "ankle-foot": ["ankle-single-leg-bridge", "ankle-standing-hip-flexion"],
    };
    const recordPatterns = exerciseStage >= 3 && needsPosteriorChainFoundation
      ? region.exercises.filter((exercise) => recordPatternIds[region.id]?.includes(exercise.id))
      : [];
    const current = region.exercises.filter((exercise) => exercise.stage <= exerciseStage);
    const foundation = region.exercises.filter((exercise) => exercise.stage <= Math.max(3, exerciseStage));
    const targetCount = exerciseStage <= 1 ? 2 : exerciseStage === 2 ? 3 : intake.goal >= 3 || findings.length >= 4 ? 4 : 3;
    const primaryDirectionIds = new Set(directionSpecific.slice(0, 2).map((exercise) => exercise.id));
    const directionIds = new Set(directionSpecific.map((exercise) => exercise.id));
    const relevantIds = new Set(relevant.map((exercise) => exercise.id));
    const effectiveIds = new Set(effectiveRelated.map((exercise) => exercise.id));
    const recordPatternSet = new Set(recordPatterns.map((exercise) => exercise.id));
    const chiefSource = `${intake.actionAnalysis?.task ?? ""} ${intake.actionAnalysis?.category ?? ""} ${intake.actionAnalysis?.function ?? ""}`.toLowerCase();
    const prioritiseStrengthControl = hasWeakStrength || intake.symptoms.includes("力量不足") || includesAny(intake.symptomType, ["无力", "不稳"]);
    const startStageSymptom = findings.some((finding) => finding.tags.includes("stage:起始"));
    const endStageSymptom = findings.some((finding) => finding.tags.includes("stage:末端"));
    const exercisePriority = (exercise: FullExercise) => {
      const source = `${exercise.id} ${exercise.title} ${exercise.tags.join(" ")}`.toLowerCase();
      let score = primaryDirectionIds.has(exercise.id) ? 50 : directionIds.has(exercise.id) ? 15 : 0;
      if (kneeCoreTrainingIds.has(exercise.id)) score += 140;
      if (pilotTrainingIds.has(exercise.id)) score += 60;
      if (effectiveIds.has(exercise.id)) score += 40;
      if (relevantIds.has(exercise.id)) score += 30;
      if (recordPatternSet.has(exercise.id)) score += 20;
      if (exercise.stage <= exerciseStage) score += 10;
      if (prioritiseStrengthControl && /control|strength|stability|balance|控制|力量|稳定|平衡/.test(source)) score += 35;
      if (startStageSymptom && /eccentric|slow|control|离心|慢速|控制/.test(source)) score += 30;
      if (includesAny(chiefSource, ["走路", "步行", "行走"]) && /gait|walk|daily|步态|走路|重心/.test(source)) score += 45;
      if (includesAny(chiefSource, ["蹲", "起身"]) && /squat|sit-to-stand|蹲|坐站/.test(source)) score += 45;
      if (includesAny(chiefSource, ["楼", "台阶"]) && /step|stairs|台阶/.test(source)) score += 45;
      if (intake.goal >= 4 && includesAny(chiefSource, ["跑", "跳", "落地"]) && /run|jump|landing|跑|跳|落地/.test(source)) score += 45;
      return score;
    };
    const assessmentRequiredExerciseIds = new Set([
      "knee-side-abduction",
      "knee-hamstring-isometric",
      "knee-supine-adductor",
    ]);
    const orderedExercises = [...kneeCoreRelated, ...pilotRelated, ...directionSpecific, ...foundationPatterns, ...recordPatterns, ...effectiveRelated, ...relevant, ...current, ...foundation, ...region.exercises]
      .filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index)
      .filter((exercise) => exercise.id !== "knee-heel-slide-quad-set" || kneeSharedControlAllowed)
      .filter((exercise) => region.id !== "ankle-foot" || !ANKLE_P0_CONTROL_EXERCISE_IDS.has(exercise.id) || ankleP0EligibleControls.has(exercise.id))
      .filter((exercise) => region.id !== "ankle-foot" || !ANKLE_P1_PLANTARFLEXION_EXERCISE_IDS.has(exercise.id) || ankleP1EligiblePlantarflexion.has(exercise.id))
      .filter((exercise) => !assessmentRequiredExerciseIds.has(exercise.id) || exercise.tags.some((tag) => weakStrengthTags.has(tag)))
      .sort((a, b) => exercisePriority(b) - exercisePriority(a) || a.stage - b.stage);
    const selected = hasWeakStrength && exerciseStage <= 2
      ? [
          ...orderedExercises.filter((exercise) => ["仰卧", "侧卧"].includes(exercise.startPosition) && exercise.tags.some((tag) => weakStrengthTags.has(tag))),
          ...orderedExercises.filter((exercise) => ["仰卧", "侧卧"].includes(exercise.startPosition)),
        ].filter((exercise, index, list) => list.findIndex((entry) => entry.id === exercise.id) === index).slice(0, targetCount)
      : orderedExercises.slice(0, targetCount);
    const previousTraining = sessionHistory.find((item) => item.sessionNumber === sessionNumber - 1)?.training ?? [];
    const progressedIds = followupMode && previousTraining.length
      ? nextSessionTrainingIds(previousTraining, region.exercises.map((exercise) => exercise.id))
      : [];
    const initialPriorityIds = !followupMode && region.id === "knee"
      ? [...INITIAL_TRAINING_PRIORITY.knee]
      : !followupMode && region.id === "ankle-foot" && !localToeOnly
        ? [...INITIAL_TRAINING_PRIORITY["ankle-foot"]]
        : [];
    const sessionSelected = [
      ...progressedIds.map((id) => region.exercises.find((exercise) => exercise.id === id)),
      ...initialPriorityIds.map((id) => region.exercises.find((exercise) => exercise.id === id)),
      ...selected,
      ...orderedExercises,
    ]
      .filter((exercise): exercise is FullExercise => Boolean(exercise))
      .filter((exercise, index, list) => list.findIndex((item) => item.id === exercise.id) === index)
      .filter((exercise) => exercise.id !== "knee-heel-slide-quad-set" || kneeSharedControlAllowed)
      .filter((exercise) => region.id !== "ankle-foot" || !ANKLE_P0_CONTROL_EXERCISE_IDS.has(exercise.id) || ankleP0EligibleControls.has(exercise.id))
      .filter((exercise) => region.id !== "ankle-foot" || !ANKLE_P1_PLANTARFLEXION_EXERCISE_IDS.has(exercise.id) || ankleP1EligiblePlantarflexion.has(exercise.id))
      .slice(0, targetCount);
    return sessionSelected.map((exercise) => {
      const adapted = adaptExerciseForCurrentStage(exercise, exerciseStage);
      if (endStageSymptom) return { ...adapted, title: `${adapted.title.replace(/（基础版）$/, "")}（半程版）`, how: `先在不引起末端不适的半程内完成。${adapted.easier}` };
      if (startStageSymptom) return { ...adapted, how: `慢速启动，控制回程。${adapted.how}` };
      return adapted;
    });
  }, [region, findings, exerciseStage, intake, effectiveTreatmentCandidates, assessmentResults, trialRecords, noChiefActionAndNoAssessmentProblem, pilotTrainingIds, kneeDecision, followupMode, followupKneeDecision, localLimbDecision, tissuePathway, sessionHistory, sessionNumber]);

  const homeRelaxationTargets = useMemo(() => {
    // 训练后自主放松合并四类来源：紧张检查（共享 + 逐项）、有效/部分有效处理肌肉、
    // 当前训练动作主要肌肉；只按标准区域去重，不设置位置数量硬上限。肿胀、清楚
    // 刺痛、麻电或非标准组织路径按风险追加选择性避开提示，规则见 home-relaxation-core。
    const tensionLabels = workflowProfile.palpationMode === "none"
      ? []
      : followupMode
        ? followupTensionLocations
        : [
            ...(assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionLocations ?? []),
            ...assessments
              .filter(assessmentAllowsMuscleComparison)
              .flatMap((item) => assessmentResults[item.id]?.tensionLocations ?? []),
          ];
    const effectiveMuscleLabels = effectiveTreatmentCandidates
      .filter((candidate) => candidate.type === "muscle")
      .map((candidate) => candidateMuscleFocus(candidate).label)
      .filter((label, index, list) => list.indexOf(label) === index);
    return buildHomeRelaxationTargets({
      tissuePathwayId: tissuePathway.id,
      symptoms: intake.symptoms,
      stabbingPalpation: intake.stabbingPalpation,
      symptomType: intake.symptomType,
      tensionLabels,
      effectiveMuscleLabels,
      trainingMuscleLabels: exercises.flatMap((exercise) => exerciseMuscleLabels(exercise.tags, exercise.title)),
    });
  }, [assessmentResults, assessments, followupMode, followupTensionLocations, intake, tissuePathway.id, effectiveTreatmentCandidates, exercises, workflowProfile.palpationMode]);

  const followupCandidates = useMemo<FullCandidate[]>(() => {
    if (!region) return [];
    // 撞伤、疑似骨应力和肌腱负荷都有独立的时间/负荷观察路径，
    // 复诊不能再从通用历史候选中重新混入肌肉松解或关节处理。
    if (tissuePathway.id !== "standard") return [];
    const abnormalPilotMotionIds = findings
      .filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"))
      .map(motionIdFromFinding)
      .filter((directionId) => Boolean(pilotMotionKnowledge(directionId)));
    const dynamicHistoryCandidates = [...trialRecords, ...followupTrialRecords.filter((record) => record.sessionNumber < sessionNumber)]
      .map(dynamicMuscleCandidateFromRecord)
      .filter((candidate): candidate is FullCandidate => Boolean(candidate));
    const ankleP0AssessmentRecords = region.id === "ankle-foot"
      ? ankleP0RecordsAfterRangeOutcomes(assessmentResults, [
          ...trialRecords.map((record) => record.rangeOutcomes),
          ...followupTrialRecords.filter((record) => record.sessionNumber <= sessionNumber).map((record) => record.rangeOutcomes),
        ])
      : assessmentResults;
    const all = [...(region.mobilityInterventions ?? []), ...region.candidateGroups.flatMap((group) => group.candidates), ...dynamicHistoryCandidates]
      .map((candidate) => {
        const currentUnit = region.id === "knee" ? followupKneeDecision?.currentTreatment : undefined;
        const mappedIds = kneeLegacyCandidateIdsForUnit(currentUnit?.id);
        if (!currentUnit || !mappedIds.includes(candidate.id)) return candidate;
        const knowledgeEvidence = kneeP0LineageFromAssessmentRecord(
          currentUnit.id,
          assessmentResults["motion:knee-extension"],
        );
        return {
          ...candidate,
          id: currentUnit.id,
          tags: [...candidate.tags, `knee-core:${currentUnit.id}`, `legacy-candidate:${candidate.id}`],
          retestIds: knowledgeEvidence
            ? knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
            : Array.from(new Set([
                ...(candidate.retestIds ?? []),
                ...currentUnit.relatedActionIds.filter((actionId) => ["knee-extension", "knee-flexion"].includes(actionId)),
              ])),
          knowledgeEvidence,
          siteLabel: currentUnit.site,
          targetLabel: "",
          actionLabel: currentUnit.action,
          do: kneeTreatmentInstruction(currentUnit),
          retest: kneeRetestInstruction(currentUnit),
        };
      })
      .map((candidate) => {
        if (candidate.type !== "muscle") return candidate;
        const normalizedRegion = normalizePilotMuscleRegion(`${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`);
        const declaredMotionIds = candidatePilotMotionIds(candidate);
        const relatedAbnormalMotionIds = normalizedRegion && !declaredMotionIds.length
          ? abnormalPilotMotionIds.filter((directionId) => primaryRetestMotionIdsForRegion(normalizedRegion.id).some((motionId) => samePhysicalAction(motionId, directionId)))
          : [];
        const motionIds = [...new Set([...declaredMotionIds, ...relatedAbnormalMotionIds])];
        return motionIds.length
          ? { ...candidate, retestIds: Array.from(new Set([...(candidate.retestIds ?? []), ...motionIds])) }
          : candidate;
      })
      .flatMap((candidate) => {
        const p0UnitId = region.id === "knee" ? kneeP0UnitIdForTreatmentCandidate(candidate.id) : undefined;
        if (!p0UnitId) return [candidate];
        const knowledgeEvidence = candidate.knowledgeEvidence ?? kneeP0LineageFromAssessmentRecord(
          p0UnitId,
          assessmentResults["motion:knee-extension"],
        );
        return knowledgeEvidence ? [{
          ...candidate,
          knowledgeEvidence,
          retestIds: knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, "")),
        }] : [];
      })
      .flatMap((candidate) => {
        if (region.id !== "knee") return [candidate];
        const knowledgeEvidence = kneeP1LineageForTreatment(candidate.id, assessmentResults, candidate.knowledgeEvidence);
        if (candidate.id === KNEE_P1_SCAR_TREATMENT_ID && !knowledgeEvidence) return [];
        return [{
          ...candidate,
          knowledgeEvidence,
          retestIds: knowledgeEvidence
            ? knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
            : candidate.retestIds,
        }];
      })
      .flatMap((candidate) => {
        if (region.id !== "ankle-foot" || !isAnkleP0CandidateId(candidate.id)) return [candidate];
        const knowledgeEvidence = ankleP0LineageForTreatment(candidate.id, ankleP0AssessmentRecords);
        return knowledgeEvidence ? [{
          ...candidate,
          knowledgeEvidence,
          retestIds: knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, "")),
        }] : [];
      })
      .filter((candidate) => candidateIsAvailable(candidate, workflowProfile))
      .filter((candidate) => canMobilizeJoint || candidate.type !== "joint")
      // 肿胀按时间观察；低次数主动控制已经嵌入肌肉处理单元，正式训练仍在训练页。
      .filter((candidate) => !["swelling", "control"].includes(candidate.type));

    // 局部复诊不再从通用病例关系中扩展新候选：只继续独立决策核心
    // 判定为“上次有效且本次仍异常”的那一个局部松解。
    if (localLimbDecision) {
      if (!localLimbDecision.continueEffectiveTreatment || localLimbDecision.phase !== "nonacute-tension") return [];
      return all
        .filter((candidate) => localLimbDecision.treatmentIds.includes(candidate.id))
        .map((candidate) => {
          const ownActionIds = new Set((candidate.retestIds ?? []).map(canonicalActionIdFromAssessmentId));
          const relevantRetestIds = localLimbDecision.retestIds.filter((id) => ownActionIds.has(canonicalActionIdFromAssessmentId(id)));
          return { ...candidate, retestIds: dedupeAssessmentIdsByAction(relevantRetestIds) };
        })
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
    }
    const supportTags = new Set(findings.filter((finding) => finding.priority === "support").flatMap((finding) => finding.tags));
    const byRelevance = (a: FullCandidate, b: FullCandidate) => candidateRelevance(b, intake, supportTags) - candidateRelevance(a, intake, supportTags);
    const candidateById = new Map(all.map((candidate) => [candidate.id, candidate]));
    const recordedCandidateUnits = (candidateId: string) => {
      const direct = candidateById.get(candidateId);
      if (direct) return candidateMuscleUnits(direct);
      const mapped = (KNEE_CORE_CANDIDATE_IDS[candidateId] ?? [])
        .map((id) => candidateById.get(id))
        .filter((candidate): candidate is FullCandidate => Boolean(candidate));
      return mapped.length ? mapped.flatMap(candidateMuscleUnits) : [candidateId];
    };
    // 同一处理单元跨多次康复可能先无效、后有效，也可能反过来。
    // 复诊只使用最近一次真实处理结果，不能让任意一次旧结果永久覆盖后续反馈。
    const latestUnitResults = new Map<string, TrialResult>();
    const historicalRecords = [
      ...trialRecords.filter((record) => !record.supportingOnly && !record.reviewOnly && !record.retestOnly),
      ...followupTrialRecords.filter((record) => record.sessionNumber < sessionNumber && !record.supportingOnly && !record.reviewOnly && !record.retestOnly),
    ];
    historicalRecords.forEach((record) => recordedCandidateUnits(record.candidateId).forEach((unit) => latestUnitResults.set(unit, record.result)));
    const latestUnitResponseRoles = new Map<string, TreatmentResponseRole>();
    historicalRecords.forEach((record) => recordedCandidateUnits(record.candidateId).forEach((unit) => latestUnitResponseRoles.set(unit, record.responseRole ?? classifyTreatmentResponse({
      beforeScore: record.beforeScore,
      afterScore: record.afterScore,
      result: record.result,
      chiefRetested: record.chiefRetested,
      rangeImproved: Boolean(record.rangeOutcome && ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(record.rangeOutcome)),
      timeBased: record.timeBased,
    }))));
    const retainedUnits = new Set([...latestUnitResults].filter(([, result]) => ["better", "partial"].includes(result)).map(([unit]) => unit));
    const ineffectiveUnits = new Set([...latestUnitResults].filter(([, result]) => ["same", "worse"].includes(result)).map(([unit]) => unit));
    const wasRetained = (candidate: FullCandidate) => candidateMuscleUnits(candidate).some((unit) => retainedUnits.has(unit));
    const retainedPriority = (candidate: FullCandidate) => Math.max(0, ...candidateMuscleUnits(candidate).map((unit) => treatmentResponsePriority(latestUnitResponseRoles.get(unit))));
    // 没有重新走评估时，复诊只能沿用上次实际有效的处理方向。
    // 未尝试过的候选即使能被旧检查或病例关系命中，也不能在第二、三次康复自动新增。
    const currentTensionRegionIds = new Set(followupTensionLocations
      .map((location) => normalizePilotMuscleRegion(location)?.id)
      .filter(Boolean));
    const hasCurrentTensionEvidence = (candidate: FullCandidate) => {
      if (candidate.type !== "muscle") return false;
      const normalized = normalizePilotMuscleRegion(`${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`);
      return Boolean(normalized && currentTensionRegionIds.has(normalized.id));
    };
    const candidateHasUnresolvedDirection = (candidate: FullCandidate) => {
      const directionIds = candidatePilotMotionIds(candidate);
      return !directionIds.length || directionIds.some((directionId) => {
        const trend = valueForPhysicalAction(followupTrends, `motion:${directionId}`);
        return trend !== "better" && trend !== "unknown" && trend !== "unable";
      });
    };
    const eligible = all.filter((candidate) => (wasRetained(candidate) || hasCurrentTensionEvidence(candidate))
      && candidateHasUnresolvedDirection(candidate)
      && (hasCurrentTensionEvidence(candidate) || candidateMuscleUnits(candidate).every((unit) => !ineffectiveUnits.has(unit))));
    const resolvedChiefDirection = chiefMotionDirectionId(intake, region.id);
    const needsMobility = findings.some((finding) => {
      const directionId = anyMotionIdFromFinding(finding);
      return finding.id.startsWith("motion:")
        && !samePhysicalAction(directionId, resolvedChiefDirection)
        && valueForPhysicalAction(followupTrends, `motion:${directionId}`) !== "better";
    });
    const ordered = [
      ...eligible.filter((candidate) => candidate.type === "muscle").sort((a, b) => retainedPriority(b) - retainedPriority(a) || Number(wasRetained(b)) - Number(wasRetained(a)) || byRelevance(a, b)),
      ...(needsMobility ? eligible.filter((candidate) => candidate.type === "joint") : []),
      ...eligible.filter((candidate) => candidate.type === "neural"),
    ];
    return ordered.filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
  }, [region, trialRecords, followupTrialRecords, sessionNumber, intake, findings, assessmentResults, followupTrends, followupTensionLocations, canMobilizeJoint, followupKneeDecision, localLimbDecision, tissuePathway, workflowProfile]);

  const legacyThinkingMode = !intake.productMode && ["coach", "rehab"].includes(intake.userRole);
  const effectiveOperationTarget = intake.productMode ? intake.operationTarget : workflowProfile.operationTarget;
  // 兼容旧快照中的检查方式字段；新快照的权限仍以 WorkflowProfile 为准。
  const legacyExamSetupIsNotProfessionalOther = intake.examSetup !== "professional-other";
  const needsExamSetupChoice = (isThinkingMode || legacyThinkingMode) && !effectiveOperationTarget;
  const needsCapabilitiesChoice = isThinkingMode && effectiveOperationTarget === "other" && !intake.capabilitiesConfirmed;
  const activeGuidedField = canonicalIntakeField(guidedIntakeField);
  // 选择完成后仍保留当前卡片，直到用户主动点“下一步”；否则专业模式的
  // 操作对象/能力卡会瞬间消失，只剩一个空标题，用户会误以为流程卡住。
  const showExamSetupChoice = (isThinkingMode || legacyThinkingMode) && (!effectiveOperationTarget || activeGuidedField === "操作对象");
  const showCapabilitiesChoice = isThinkingMode && effectiveOperationTarget === "other" && (!intake.capabilitiesConfirmed || activeGuidedField === "检查能力");
  const needsSpineModeChoice = isSpinalRegion(intake.regionId) && (isThinkingMode || legacyThinkingMode);
  const describedRegionId = intake.description.trim() ? inferRegion(intake.description) : "";
  const unsupportedDescriptionRegion = describedRegionId && !isPilotRegion(describedRegionId)
    ? FULL_REGIONS.find((item) => item.id === describedRegionId)
    : undefined;
  const selfNeuralReferral = workflowProfile.isGuided && (intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化"));
  const stabbingEarlyReferral = workflowProfile.isGuided && intake.symptomType === "刺痛" && intake.stabbingSpread === "rest";
  const intakeHasTenderness = intake.symptoms.includes("按压痛") || activeProvocationTypes.includes("按压");
  const intakeHasSensorySymptoms = intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化");
  const bilateralSameProblemGuidance = "如果两侧是同一个问题，请同时保留左右标记，再选择本次优先侧；不同大部位请另建问题。";
  // 发力方向不再作为症状收集中的独立必答题；它会在对应活动动作卡片里
  // 与活动范围、主动控制一起记录。
  // 症状性质已在「最接近哪种感觉」里给出「说不清」兜底，不再单独追问疼痛性质补充。
  const needsPainQuality = false;
  const baselineScoreApplicable = shouldCollectBaselineScore(intake);
  const descriptionSuggestsTrauma = includesAny(intake.description, ["崴", "扭伤", "拉伤", "摔", "跌", "撞", "落地", "外伤"]);
  const mechanismQuestionRelevant = !intake.mechanism && (["今天或昨天", "2～7天"].includes(intake.onset) || descriptionSuggestsTrauma);
  const provocationAlreadyClear = hasClearChiefAction(intake);
  const provocationConfirmedForFlow = confirmedIntakeMulti.provocationTypes || provocationAlreadyClear;
  const hasNoFixedProvocation = intake.noFixedAction;
  const needsChiefActionConfirmation = provocationConfirmedForFlow
    && !hasNoFixedProvocation
    && !reportedActionSummary(intake).length;
  const needsStabbingSpread = intake.symptomType === "刺痛" && !provocationAlreadyClear && !intake.stabbingSpread;
  // 刺痛或明确按压痛都需要一次轻按反应记录；没有尝试时允许明确选择，
  // 不把“未尝试”当成阴性，也不因此阻塞普通用户继续填写。
  const needsStabbingPalpation = (intake.symptomType === "刺痛" || intakeHasTenderness) && !intake.stabbingPalpation;
  const intakeMissingFields = useMemo(() => [
    [!intake.productMode && !intake.userRole, "使用方式"],
    [needsExamSetupChoice, "操作对象"],
    [needsCapabilitiesChoice, "检查能力"],
    [needsSpineModeChoice && !intake.spineAssessmentMode, "活动度检查方式"],
    [!intake.locationConfirmed || !intake.bodyLocations.length, "不舒服的位置"],
    [intake.side === "双侧/中间" && !intake.prioritySide, "本次优先侧"],
    [!intake.onset, "出现多久"],
    [mechanismQuestionRelevant, "发生方式"],
    [!intake.symptomType, "不适感觉"],
    [!confirmedIntakeMulti.symptoms, "目前情况"],
    // 肿胀、按压痛和感觉异常一旦被选中，下一题立即定位范围。
    // 这些位置是后续风险判断、检查与处理的直接输入，不能隔着主诉动作
    // 和评分再回来补充，否则用户很容易忘记刚才在标记什么。
    [intake.symptoms.includes("肿胀或淤青") && !intake.swellingLocationConfirmed, "肿胀位置"],
    [intakeHasTenderness && !intake.tendernessLocationConfirmed, "按压痛位置"],
    [intakeHasSensorySymptoms && !intake.sensoryLocationConfirmed, "麻电范围"],
    [!provocationConfirmedForFlow || needsChiefActionConfirmation, "诱发动作"],
    [baselineScoreApplicable && !intake.baselineScoreConfirmed, "不适分数"],
    [needsStabbingSpread, "刺痛出现范围"],
    [needsStabbingPalpation, "轻按反应"],
    [!intake.goal, "恢复目标"],
  ].filter(([missing]) => missing).map(([, label]) => label as string), [intake, needsExamSetupChoice, needsCapabilitiesChoice, needsSpineModeChoice, mechanismQuestionRelevant, provocationConfirmedForFlow, needsChiefActionConfirmation, intakeHasTenderness, intakeHasSensorySymptoms, baselineScoreApplicable, needsStabbingSpread, needsStabbingPalpation, confirmedIntakeMulti]);
  // 进入逐项模式后，当前字段只由路径状态决定；不能因为字段暂时为空，
  // 又回退到 intakeMissingFields[0]，否则返回后点击下一步会跳到最新未填写项。
  const currentIntakeField = showAllIntakeFields ? "" : guidedIntakeField || (guidedIntakePath.length ? "" : intakeMissingFields[0] || "");
  const guidedLocationSelectionReady = currentIntakeField === "不舒服的位置" && intake.bodyLocations.length > 0
    || currentIntakeField === "肿胀位置" && intake.swellingLocations.length > 0
    || currentIntakeField === "按压痛位置" && intake.tendernessLocations.length > 0
    || currentIntakeField === "麻电范围" && intake.sensoryLocations.length > 0;
  const guidedQuestionReady = Boolean(currentIntakeField && (!intakeMissingFields.includes(currentIntakeField) || guidedLocationSelectionReady));
  const intakeComplete = Boolean(intake.parsed && intake.productMode && (!needsExamSetupChoice || effectiveOperationTarget) && (!needsCapabilitiesChoice || intake.capabilitiesConfirmed) && (!needsSpineModeChoice || intake.spineAssessmentMode) && isPilotRegion(intake.regionId) && intake.side && (!intake.side || intake.side !== "双侧/中间" || intake.prioritySide) && intake.location && intake.locationConfirmed && intake.bodyLocations.length && intake.onset && (!mechanismQuestionRelevant || intake.mechanism) && intake.symptomType && !needsPainQuality && confirmedIntakeMulti.symptoms && provocationConfirmedForFlow && (!needsChiefActionConfirmation || intake.actionSelectionConfirmed || reportedActionSummary(intake).length > 0) && intake.goal && (!baselineScoreApplicable || intake.baselineScoreConfirmed)
    && (!intake.symptoms.includes("肿胀或淤青") || (intake.swellingLocationConfirmed && intake.swellingLocation?.trim()))
    && (!intakeHasTenderness || (intake.tendernessLocationConfirmed && intake.tendernessLocation?.trim()))
    && (!intakeHasSensorySymptoms || (intake.sensoryLocationConfirmed && intake.sensoryLocation?.trim()))
    && (!needsStabbingSpread || intake.stabbingSpread)
    && (!needsStabbingPalpation || intake.stabbingPalpation));
  // Keep the CTA tied to the same explicit missing-field ledger that drives
  // the guided questions. This prevents a transient parsed state from
  // rendering “进入关键确认” while one required card is still unresolved.
  const keyConfirmationReady = intakeComplete && intakeMissingFields.length === 0;
  const needsBoneQuestions = intake.regionId === "ankle-foot" && isAcuteTrauma(intake);
  const boneQuestionsAnswered = !needsBoneQuestions || ["boneSpot", "walkThen", "walkNow"].every((id) => Boolean(boneRisk[id]));
  const boneImagingSuggested = needsBoneQuestions && (boneRisk.boneSpot === "yes" || boneRisk.walkThen === "no" || boneRisk.walkNow === "no");
  const activeSafetyItems = intake.regionId === "calf-local" ? SAFETY_ITEMS : SAFETY_ITEMS.filter((item) => item.id !== "calf-clot");
  const safetyAnswered = activeSafetyItems.every((item) => Boolean(safety[item.id]));
  const hasSafetySignal = activeSafetyItems.some((item) => safety[item.id] === "yes");
  const hasClearance = imaging.includes("医生已允许按建议康复");
  const structuralImagingSignal = imaging.some((item) => ["有骨折或骨裂异常", "韧带损伤或撕裂", "肌腱损伤或撕裂"].includes(item));
  const canContinueSafety = workflowController.resolveSafety({
    answersComplete: safetyAnswered && boneQuestionsAnswered,
    imagingSelected: imaging.length > 0,
    safetySignal: hasSafetySignal,
    structuralSignal: structuralImagingSignal,
    medicalClearance: hasClearance,
  }).canContinue;
  const assessmentComplete = assessments.length > 0 && assessments.every((item) => assessmentRecordComplete(
    item,
    effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? ""),
    assessmentAllowsPassive(item, canAssessPassive),
    intake.side === "双侧/中间",
    !hasClearChiefAction(intake),
    assessmentAllowsEndFeel(item, canAssessEndFeel),
  ));
  const limitedPilotMotionItems = assessments.filter((item) => {
    if (item.kind !== "motion" || item.testMode === "passive") return false;
    if (!assessmentAllowsMuscleComparison(item) || workflowProfile.palpationMode === "none") return false;
    return needsMuscleTensionCheck({
      spinal: Boolean(item.spinal),
      tissuePathwayId: tissuePathway.id,
      symptomType: intake.symptomType,
      symptoms: intake.symptoms,
    });
  });
  const sharedTensionRequired = limitedPilotMotionItems.length > 0;
  const sharedTensionRecord = assessmentResults[SHARED_TENSION_ASSESSMENT_ID] ?? {};
  const sharedTensionComplete = !sharedTensionRequired || Boolean(sharedTensionRecord.tensionChecked && sharedTensionRecord.tensionLocations?.length);
  const assessmentFlowComplete = assessmentComplete && sharedTensionComplete;
  const bilateralAssessmentState = bilateralAssessmentGate({
    bilateral: intake.side === "双侧/中间",
    prioritySide: intake.prioritySide,
    requiredAssessmentIds: assessmentDisplayItems.map((item) => item.id),
    completedAssessmentIds: assessmentDisplayItems.filter((item) => displayAssessmentComplete(item)).map((item) => item.id),
  });
  const bilateralAssessmentComplete = intake.side !== "双侧/中间"
    ? assessmentFlowComplete
    : assessmentFlowComplete && bilateralAssessmentState.complete;
  // 双侧必须先把左右对应项目都记录完，才能生成处理队列；未完成时不提前
  // 处理优先侧，避免用户先处理一边、另一边却还没有评估依据。
  const assessmentReadyForTreatment = bilateralAssessmentComplete;
  // 特殊检查阳性线索：需要医学评估出口，不允许静默进入自助处理
  const specialPositiveFindings = Object.keys(assessmentResults)
    .filter((id) => id.startsWith("special:"))
    .filter((id) => assessmentResults[id]?.simple === "positive")
    .map((id) => assessments.find((item) => item.id === id))
    .filter(Boolean) as AssessmentItem[];
  const hasSpecialPositive = specialPositiveFindings.length > 0;
  // 安全分流类（骨折筛查、跟腱连续性）阳性必然转介；稳定性、定位和反应类
  // 阳性只保留排查线索，不再自动阻断普通处理流程。
  const specialSafetyReferral = specialPositiveFindings.some((item) => item.specialCategory === "safety");
  const severeAssessmentRecords = assessments.filter((item) => {
    const result = assessmentResults[item.id];
    if (!result) return false;
    if (item.kind === "motion") return result.unableReason === "pain" && (result.symptomScore ?? 0) >= 7;
    if (item.kind === "function" && functionSimpleAnswer(result) === "unable") return true;
    if (item.kind === "function") return functionSimpleAnswer(result) === "painful" && (result.symptomScore ?? 0) >= 7;
    return item.kind === "strength" && result.simple === "painful" && (result.symptomScore ?? 0) >= 7;
  });
  const painfulMotionUnableCount = assessments.filter((item) => item.kind === "motion" && assessmentResults[item.id]?.unableReason === "pain" && (assessmentResults[item.id]?.symptomScore ?? 0) >= 7).length;
  const hasFunctionUnable = assessments.some((item) => item.kind === "function" && functionSimpleAnswer(assessmentResults[item.id] ?? {}) === "unable");
  const highIrritabilityReferral = workflowProfile.isGuided && (severeAssessmentRecords.length >= 3 || (painfulMotionUnableCount >= 2 && hasFunctionUnable));
  const assessmentNeuralReferral = findings.some((finding) => finding.tags.includes("assessment-neural"));
  const sharpSpecialReferral = intake.stabbingPalpation === "sharp" && hasSpecialPositive;
  const treatmentQueueIsRefreshing = pendingTrialAdvance !== null;
  const pendingKneeAssessmentCheck = region?.id === "knee" ? kneeDecision?.assessmentChecks[0] : undefined;
  // 膝核心仍要求补查时，空处理队列不能被解释为“本次已结束”。
  const assessmentNeedsReferral = highIrritabilityReferral || assessmentNeuralReferral || sharpSpecialReferral || specialSafetyReferral;
  const workflowProjection = workflowController.project({
    intakeComplete,
    safetyComplete: canContinueSafety,
    adverseResponse: Boolean(adverseResponse),
    planIsCurrent: canExecutePlan(treatmentPlanRevision, assessmentRevision),
    assessmentReadyForTreatment,
    assessmentNeedsReferral,
    queueRefreshing: treatmentQueueIsRefreshing,
    pendingAssessmentCheck: Boolean(pendingKneeAssessmentCheck),
    queueLength: trialTargets.length,
    queueIndex: trialTargetIndex,
    pendingRetestCount: retestContractVersion === 1 ? activeRetestLedger.pendingRequiredCount : 0,
    bilateral: intake.side === "双侧/中间",
    assessmentComplete: bilateralAssessmentComplete,
    safetySignal: assessmentNeedsReferral || hasSafetySignal,
    treatmentWorsened,
    trainingComplete,
    trainingPlanSaved,
  });
  const treatmentComplete = workflowProjection.treatmentComplete;
  const trainingStageGate = workflowProjection.trainingStageGate;
  const bilateralTrainingGateState = trainingStageGate.bilateralGate;
  const adverseResolution = adverseResponse ? resolveAdverseResponse(adverseResponse) : null;
  const trainingStageClosed = workflowProjection.trainingStageClosed;
  const maxUnlocked: Step = workflowProjection.maxUnlocked;
  const snapshotRequiresReconfirmation = Boolean(snapshotFreshness?.requiresReconfirmation && !snapshotReconfirmed);
  // 继续排查（owner 确认的决策链）：处理与复查都完成后，主诉仍未解决时
  // 给出下一组值得检查的方向；只作为建议投影，不阻断进入训练。
  const chiefFunctionIdForContinuation = region ? chiefFunctionAssessmentId(intake, region.id) : "";
  const chiefFunctionSimple = chiefFunctionIdForContinuation ? assessmentResults[chiefFunctionIdForContinuation]?.simple : undefined;
  const chiefStillSymptomatic = hasClearChiefAction(intake)
    && !chiefImprovedDuringTreatment
    && (chiefScoreComparable
      ? (sessionEndScore ?? intake.baselineScore) >= intake.baselineScore
      : chiefFunctionSimple !== "normal");
  const continuationCandidatePool = useMemo(() => {
    if (!region) return [];
    // 功能评估项只能由 selectFunctionAssessmentPlan 产生（见评估清单注释），
    // 继续排查建议池与评估清单保持同一口径，只含方向和力量项。
    return [
      ...region.directions.map((item) => ({ id: `motion:${item.id}`, title: item.title })),
      ...region.strengths.map((item) => ({ id: `strength:${item.id}`, title: item.title })),
    ];
  }, [region]);
  const continuationPlan = useMemo(
    () => planContinuationAssessments({
      pilotInput: pilotInputFromIntake(intake, confirmedIntakeMulti),
      hasChiefAction: hasClearChiefAction(intake),
      chiefStillSymptomatic,
      treatmentComplete,
      completedAssessmentIds: Object.keys(assessmentResults),
      candidatePool: continuationCandidatePool,
    }),
    [intake, confirmedIntakeMulti, chiefStillSymptomatic, treatmentComplete, assessmentResults, continuationCandidatePool],
  );
  const continuationSuggestions = continuationPlan.suggested.filter((item) => !continuationRoundIds.includes(item.id));
  function acceptContinuationSuggestions(ids: string[]) {
    setContinuationRoundIds((current) => Array.from(new Set([...current, ...ids])));
    setStep(2);
    setToast("已加入继续检查的方向；补查结果会按新评估生成后续处理");
    window.setTimeout(() => setToast(""), 2400);
  }

  function toggleArray(value: string, current: string[], setter: (next: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function beginGuidedIntake(next: IntakeState) {
    setShowAllIntakeFields(false);
    setGuidedIntakeField("使用方式");
    setGuidedIntakePath(["使用方式"]);
    setGuidedIntakeCursor(0);
    guidedAdvanceRef.current = null;
    setConfirmedIntakeMulti({ symptoms: next.symptoms.length > 0, provocationTypes: next.provocationTypes.length > 0 });
    applyIntakeChange(next);
  }

  function rewriteIntakeDescription() {
    const description = intake.description;
    // 重写时只保留原文，清掉旧解析、旧位置、旧动作和旧评分；否则用户改了
    // 一句话，后续仍可能沿用上一次的关节和主诉动作。
    const next = { ...DEFAULT_INTAKE, description };
    setConfirmedIntakeMulti({ symptoms: false, provocationTypes: false });
    setGuidedIntakePath([]);
    setGuidedIntakeCursor(0);
    guidedAdvanceRef.current = null;
    setGuidedIntakeField("");
    applyIntakeChange(next);
  }

  function advanceGuidedQuestion(field = currentIntakeField) {
    const canonicalField = canonicalIntakeField(field);
    if (!canonicalField) return;
    const currentCursor = guidedIntakePath.indexOf(canonicalField) >= 0
      ? guidedIntakePath.indexOf(canonicalField)
      : guidedIntakeCursor;
    guidedAdvanceRef.current = { field: canonicalField, cursor: currentCursor };
    setGuidedIntakePath((path) => path.includes(canonicalField) ? path : [...path, canonicalField]);
    if (canonicalField === "不舒服的位置" && intake.bodyLocations.length) {
      const primary = intake.bodyLocations[0];
      applyIntakeChange({
        ...intake,
        locationConfirmed: true,
        side: sideFromLocationSelections(intake.bodyLocations),
        regionId: primary.regionId,
        location: intake.bodyLocations.map((item) => item.location).join("、"),
      });
    } else if (canonicalField === "肿胀位置" && intake.swellingLocations.length) {
      applyIntakeChange({ ...intake, swellingLocationConfirmed: true, swellingLocation: locationSelectionsLabel(intake.swellingLocations) });
    } else if (canonicalField === "按压痛位置" && intake.tendernessLocations.length) {
      applyIntakeChange({ ...intake, tendernessLocationConfirmed: true, tendernessLocation: locationSelectionsLabel(intake.tendernessLocations) });
    } else if (canonicalField === "麻电范围" && intake.sensoryLocations.length) {
      applyIntakeChange({ ...intake, sensoryLocationConfirmed: true, sensoryLocation: locationSelectionsLabel(intake.sensoryLocations) });
    }
    // 清空当前字段，等待 effect 根据“当前路径的下一项”或新增问题推进。
    setGuidedIntakeField("");
  }

  useEffect(() => {
    const pending = guidedAdvanceRef.current;
    if (!pending || guidedIntakeField) return;
    const recordedValues: Record<string, boolean> = {
      "使用方式": Boolean(intake.productMode || intake.userRole),
      "操作对象": Boolean(effectiveOperationTarget),
      "检查能力": intake.capabilitiesConfirmed,
      "活动度检查方式": Boolean(intake.spineAssessmentMode),
      "不舒服的位置": Boolean(intake.locationConfirmed && intake.bodyLocations.length),
      "本次优先侧": Boolean(intake.side !== "双侧/中间" || intake.prioritySide),
      "出现多久": Boolean(intake.onset),
      "发生方式": Boolean(intake.mechanism),
      "不适感觉": Boolean(intake.symptomType),
      "疼痛性质": intake.painQualityConfirmed,
      "目前情况": confirmedIntakeMulti.symptoms,
      "诱发动作": provocationConfirmedForFlow && (!needsChiefActionConfirmation || Boolean(reportedActionSummary(intake).length || hasNoFixedProvocation)),
      "不适分数": intake.baselineScoreConfirmed,
      "肿胀位置": intake.swellingLocationConfirmed,
      "按压痛位置": intake.tendernessLocationConfirmed,
      "麻电范围": intake.sensoryLocationConfirmed,
      "刺痛出现范围": Boolean(intake.stabbingSpread),
      "轻按反应": Boolean(intake.stabbingPalpation),
      "恢复目标": Boolean(intake.goal),
    };
    const fieldRelevant = (field: string) => intakeMissingFields.includes(field) || Boolean(recordedValues[field]);
    const currentPath = guidedIntakePath.includes(pending.field)
      ? guidedIntakePath
      : [...guidedIntakePath, pending.field];
    const currentIndex = currentPath.indexOf(pending.field);
    const nextFromPath = currentPath.slice(currentIndex + 1).find((field) => field !== pending.field && fieldRelevant(field));
    const nextNewField = intakeMissingFields.find((field) => !currentPath.includes(field) && field !== pending.field);
    // Once a user selects a local sign, ask for its location immediately. This
    // keeps the answer attached to the sign instead of sending it behind the
    // activity, score and goal questions.
    // Local signs are collected immediately after they are known. This must
    // not depend on the previous page being “目前情况”: a parsed complaint
    // or a return from the body-location card can otherwise jump to onset,
    // mechanism and score before asking where the swelling/tenderness is.
    const symptomLocationField = intake.symptoms.includes("肿胀或淤青") && !intake.swellingLocationConfirmed
      ? "肿胀位置"
      : intakeHasTenderness && !intake.tendernessLocationConfirmed
        ? "按压痛位置"
        : intakeHasSensorySymptoms && !intake.sensoryLocationConfirmed
          ? "麻电范围"
          : "";
    const nextField = symptomLocationField || nextFromPath || nextNewField || "";
    guidedAdvanceRef.current = null;
    if (nextField) {
      const nextIndex = currentPath.indexOf(nextField);
      setGuidedIntakePath(currentPath.includes(nextField) ? currentPath : [...currentPath, nextField]);
      setGuidedIntakeCursor(nextIndex >= 0 ? nextIndex : currentPath.length);
      setGuidedIntakeField(nextField);
    } else {
      setGuidedIntakePath(currentPath);
      setGuidedIntakeCursor(currentPath.length);
      setGuidedIntakeField("");
    }
  }, [intake, intakeMissingFields, guidedIntakeField, guidedIntakePath, confirmedIntakeMulti, effectiveOperationTarget, provocationConfirmedForFlow, hasNoFixedProvocation, needsChiefActionConfirmation, intakeHasTenderness, intakeHasSensorySymptoms]);

  function returnToPreviousIntakeQuestion() {
    guidedAdvanceRef.current = null;
    const currentIndex = guidedIntakeField && guidedIntakePath.includes(guidedIntakeField)
      ? guidedIntakePath.indexOf(guidedIntakeField)
      : guidedIntakeCursor;
    const previousIndex = currentIndex - 1;
    const previous = previousIndex >= 0 ? guidedIntakePath[previousIndex] : "";
    if (!previous) return;
    setGuidedIntakeCursor(previousIndex);
    setGuidedIntakeField(previous);
    setShowAllIntakeFields(false);
  }

  function jumpToIntakeQuestion(field: string) {
    const canonicalField = canonicalIntakeField(field);
    guidedAdvanceRef.current = null;
    setGuidedIntakePath((path) => path.includes(canonicalField) ? path : [...path, canonicalField]);
    setGuidedIntakeCursor(guidedIntakePath.indexOf(canonicalField) >= 0 ? guidedIntakePath.indexOf(canonicalField) : guidedIntakePath.length);
    setGuidedIntakeField(canonicalField);
    setShowAllIntakeFields(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function enterKeyConfirmation() {
    if (intakeComplete) {
      setHighlightedIntakeFields([]);
      goToStep(1);
      return;
    }
    const missing = intakeMissingFields;
    if (!missing.length) {
      goToStep(1);
      return;
    }
    setShowAllIntakeFields(true);
    setHighlightedIntakeFields(missing);
    setGuidedIntakeField(missing[0]);
    setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-intake-field]"))
        .find((element) => element.dataset.intakeField === missing[0]);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function goToStep(next: Step) {
    if (snapshotRequiresReconfirmation && next > 0) {
      setSnapshotReconfirmationOpen(true);
      return;
    }
    const decision = workflowController.navigate({
      currentStep: step,
      maxUnlocked,
      event: { type: "navigate-requested", targetStep: next },
    });
    workflowController.execute(decision.commands, { navigateToStep: (acceptedStep) => {
      setReviewStep(null);
      setReviewStepEditable(false);
      const transitionByStep: Partial<Record<Step, TransitionTarget>> = { 2: "assessment", 3: "treatment", 4: "training", 5: "summary" };
      const target = acceptedStep > step ? transitionByStep[acceptedStep] : undefined;
      if (target) {
        setTransitionTarget(target);
        if (target === "assessment" && isThinkingMode) setThinkingWorkbenchOpen(true);
        setSummaryOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setStep(acceptedStep);
      setTransitionTarget(null);
      setSummaryOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } });
  }

  function reviewCompletedStep(target: Step) {
    if (snapshotRequiresReconfirmation && target > 0) {
      setSnapshotReconfirmationOpen(true);
      return;
    }
    const decision = workflowController.navigate({
      currentStep: step,
      maxUnlocked,
      event: { type: "review-requested", targetStep: target },
    });
    workflowController.execute(decision.commands, { openReadonlyReview: (acceptedStep) => {
      setTransitionTarget(null);
      setReviewStepEditable(false);
      setReviewStep(acceptedStep);
      setSummaryOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } });
  }

  function openWorkflowStage(target: Step) {
    if (target < railStep) reviewCompletedStep(target);
    else if (target === railStep) {
      setReviewStep(null);
      setReviewStepEditable(false);
    } else goToStep(target);
    setMobileStageOpen(false);
  }

  function editCompletedAssessment() {
    if (snapshotRequiresReconfirmation) {
      setSnapshotReconfirmationOpen(true);
      return;
    }
    try {
      const hintKey = "rehabmind-once-hint:edit-old-answer";
      if (window.localStorage.getItem(hintKey) !== "seen") {
        const accepted = window.confirm("修改后，受影响的后续内容需要重新确认。是否继续修改？");
        if (!accepted) return;
        window.localStorage.setItem(hintKey, "seen");
      }
    } catch {
      if (!window.confirm("修改后，受影响的后续内容需要重新确认。是否继续修改？")) return;
    }
    const decision = workflowController.navigate({
      currentStep: step,
      maxUnlocked,
      event: { type: "edit-requested", targetStep: 2, explicitlyEnabled: true },
    });
    workflowController.execute(decision.commands, { openExplicitEdit: (acceptedStep) => {
      setTransitionTarget(null);
      setReviewStepEditable(true);
      setReviewStep(acceptedStep);
      setSummaryOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } });
  }

  function returnFromRetestToTreatment() {
    setReadyToRetest(false);
    setRetestPlan(null);
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setFunctionRetestCompletion("");
    setFunctionRetestUnableReason("");
    setTreatmentFunctionRetests({});
    setFinalFunctionRetests({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnFromFollowupRetestToTreatment() {
    setFollowupReadyToRetest(false);
    setFollowupRetestPlan(null);
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reopenAssessment(message = "请重新完成能安全尝试的检查；仍不会做时可以保存并请专业人员协助。") {
    setFollowupMode(false);
    editCompletedAssessment();
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function beginAdverseReassessment(input: {
    source: AdverseSource;
    sourceId: string;
    sourceLabel: string;
    timing: AdverseTiming;
    beforeScore: number;
    afterScore: number;
    relatedAssessmentIds: string[];
  }) {
    const navigation = workflowController.navigate({
      currentStep: step,
      maxUnlocked,
      event: { type: "adverse-reported", source: input.source },
    });
    let accepted = false;
    workflowController.execute(navigation.commands, {
      captureAdverseResponse: (source) => { accepted = source === input.source; },
    });
    if (!accepted) return;
    const revision = nextAssessmentRevision(assessmentRevision);
    const existingIds = input.relatedAssessmentIds.filter((id) => assessments.some((item) => item.id === id));
    const chiefId = chiefFunctionAssessmentId(intake, region?.id ?? "");
    const focusIds = focusedReassessmentIds({
      ...createAdverseResponse({ ...input, assessmentRevision }),
      relatedAssessmentIds: existingIds,
    }, assessments.some((item) => item.id === chiefId) ? chiefId : undefined);
    const boundedFocusIds = focusIds.length ? focusIds : assessments[0] ? [assessments[0].id] : [];
    if (!boundedFocusIds.length) {
      setStep(0);
      setToast("先补充本次主要部位和症状，再确认加重后的变化");
      window.setTimeout(() => setToast(""), 2800);
      return;
    }
    const event = createAdverseResponse({
      ...input,
      relatedAssessmentIds: boundedFocusIds,
      assessmentRevision,
      returnMode: followupMode ? "followup" : "initial",
      returnFollowupStage: followupMode ? followupStage : undefined,
    });
    const priorAssessmentSet: AssessmentSessionRecord = {
      assessmentSetId: `assessment-set:${assessmentOwnerSessionId}:r${assessmentRevision}`,
      caseId: localCaseId,
      problemThreadId,
      sessionId: assessmentOwnerSessionId,
      assessmentRevision,
      recordedAt: new Date().toISOString(),
      results: assessmentResults,
    };
    setAssessmentHistory((current) => [
      ...current.filter((item) => item.assessmentSetId !== priorAssessmentSet.assessmentSetId),
      priorAssessmentSet,
    ]);
    setAssessmentOwnerSessionId(sessionId);
    assessmentResultsRef.current = {};
    setAssessmentResults({});
    setAssessmentRevision(revision);
    // 处理方案仍属于旧评估版本；聚焦复查确认前不允许继续执行。
    setAdverseResponse({ ...event, assessmentRevision: revision });
    setAdverseConfirmedAssessmentIds([]);
    setFollowupMode(false);
    setStep(2);
    setReviewStep(null);
    setReviewStepEditable(false);
    setTransitionTarget(null);
    setAssessmentSummaryOpen(false);
    setSharedTensionOpen(false);
    setThinkingWorkbenchOpen(false);
    const firstIndex = assessments.findIndex((item) => item.id === boundedFocusIds[0]);
    if (firstIndex >= 0) setAssessmentIndex(firstIndex);
    if (input.source !== "after-session") {
      supersedeCurrentTreatmentFacts(revision, "adverse-reassessment");
      supersedeCurrentRetestFacts(revision, "adverse-reassessment");
      if (followupMode) setFollowupTrialRecords((current) => current.filter((record) => record.sessionNumber !== sessionNumber));
      else setTrialRecords([]);
    }
    setReadyToRetest(false);
    setFollowupReadyToRetest(false);
    setRetestPlan(null);
    setFollowupRetestPlan(null);
    if (input.source !== "after-session") {
      setTrainingComplete(false);
      setTrainingPlanSaved(false);
    }
    setTrainingReadyForFinalRetest(false);
    setFollowupTrainingReadyForRetest(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restoreAdverseReturn(event: AdverseResponseEvent, stageOverride?: FollowupStage) {
    if (event.returnMode === "followup") {
      setFollowupMode(true);
      setFollowupStage(stageOverride ?? event.returnFollowupStage ?? "treatment");
    } else {
      setFollowupMode(false);
    }
  }

  function finishFocusedReassessment(event: AdverseResponseEvent) {
    setTreatmentPlanRevision(event.assessmentRevision);
    setAdverseResponse(null);
    setAdverseConfirmedAssessmentIds([]);
    if (event.returnMode === "followup") {
      restoreAdverseReturn(event, "treatment");
      setStep(3);
      setToast("复查已确认，已按当前结果重新安排本次处理");
    } else {
      setAssessmentSummaryOpen(true);
      setToast("复查已确认，处理和训练已按当前结果重新生成");
    }
    window.setTimeout(() => setToast(""), 2400);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmFocusedAssessment(id: string) {
    if (!adverseResponse) return;
    const ids = adverseResponse.relatedAssessmentIds.filter((assessmentId) => assessments.some((item) => item.id === assessmentId));
    const confirmed = [...new Set([...adverseConfirmedAssessmentIds, id])];
    setAdverseConfirmedAssessmentIds(confirmed);
    const nextId = ids.find((assessmentId) => !confirmed.includes(assessmentId));
    if (nextId) {
      const nextIndex = assessments.findIndex((item) => item.id === nextId);
      if (nextIndex >= 0) setAssessmentIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!focusedReassessmentComplete(adverseResponse, confirmed)) return;
    if (sharedTensionRequired && !sharedTensionComplete) {
      setSharedTensionOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    finishFocusedReassessment(adverseResponse);
  }

  function openAssessmentItem(id: string, message: string) {
    const index = displayAssessmentIndexForId(id);
    setFollowupMode(false);
    setTransitionTarget(null);
    setReviewStepEditable(true);
    setReviewStep(2);
    setAssessmentSummaryOpen(false);
    setSharedTensionOpen(false);
    setThinkingWorkbenchOpen(false);
    if (index >= 0) setAssessmentIndex(index);
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueStageTransition() {
    if (snapshotRequiresReconfirmation) {
      setSnapshotReconfirmationOpen(true);
      return;
    }
    if (!transitionTarget) return;
    const targetStep = STAGE_TRANSITIONS[transitionTarget].step;
    setStep(targetStep);
    setThinkingWorkbenchOpen(targetStep === 2 && isThinkingMode);
    setReviewStep(null);
    setReviewStepEditable(false);
    setTransitionTarget(null);
    setSummaryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAssessment(id: string, patch: AssessmentRecord | ((previous: AssessmentRecord) => AssessmentRecord), keepSharedTensionOpen = false) {
    assessmentFocusIdRef.current = id;
    // 同一张检查卡会连续写入“完成情况、控制表现、不适”等不同字段。
    // 必须在最新状态上合并，否则用户较快地连续点击时，后一次写入会用旧闭包
    // 覆盖前一次结果，最终表现为选项互相取消、下一步永久锁定。
    const current = assessmentResultsRef.current;
    const previous = current[id] ?? {};
    const resolvedPatch = typeof patch === "function" ? patch(previous) : patch;
    const next = { ...previous, ...resolvedPatch };
    // 回看后再次点中原答案时，不应把已经完成的处理和复测全部清空。
    // 只有评估结果真的改变，才让下游处理、训练和总结失效。
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    const nextResults = { ...current, [id]: next };
    assessmentResultsRef.current = nextResults;
    setAssessmentResults(nextResults);
    const hasVersionedDownstreamFacts = reviewStepEditable
      || step > 2
      || trialRecords.length > 0
      || followupTrialRecords.some((record) => record.sessionNumber === sessionNumber)
      || persistedRetestObligations.some((item) => item.sessionId === sessionId);
    const shouldCreateAssessmentRevision = !adverseResponse && hasVersionedDownstreamFacts;
    const updatedAssessmentRevision = shouldCreateAssessmentRevision
      ? nextAssessmentRevision(assessmentRevision)
      : assessmentRevision;
    if (shouldCreateAssessmentRevision) {
      const priorAssessmentSetId = `assessment-set:${assessmentOwnerSessionId}:r${assessmentRevision}`;
      const changedAt = new Date().toISOString();
      setAssessmentHistory((history) => {
        const existing = history.find((item) => item.assessmentSetId === priorAssessmentSetId);
        const prior: AssessmentSessionRecord = {
          assessmentSetId: priorAssessmentSetId,
          caseId: localCaseId,
          problemThreadId,
          sessionId: assessmentOwnerSessionId,
          assessmentRevision,
          recordedAt: existing?.recordedAt ?? changedAt,
          results: current,
        };
        return [...history.filter((item) => item.assessmentSetId !== priorAssessmentSetId), prior];
      });
      setAssessmentRevision(updatedAssessmentRevision);
      setTreatmentPlanRevision(updatedAssessmentRevision);
    }
    if (reviewStepEditable) {
      setStep(2);
      setReviewStep(null);
      setReviewStepEditable(false);
      setTransitionTarget(null);
      setToast("评估答案已修改，后续处理将按新结果重新生成");
      window.setTimeout(() => setToast(""), 2400);
    }
    setAssessmentSummaryOpen(false);
    if (!keepSharedTensionOpen) setSharedTensionOpen(false);
    setTrialTargetIndex(0);
    setCandidateIndex(0);
    setSelectedOptionalCandidateIds([]);
    if (shouldCreateAssessmentRevision) {
      supersedeCurrentTreatmentFacts(updatedAssessmentRevision, "assessment-updated");
      supersedeCurrentRetestFacts(updatedAssessmentRevision, "assessment-updated");
      if (followupMode) setFollowupTrialRecords((records) => records.filter((record) => record.sessionNumber !== sessionNumber));
      else setTrialRecords([]);
    }
    setReadyToRetest(false);
    setRetestPlan(null);
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setTrainingComplete(false);
    setTrainingPlanSaved(false);
    setExerciseFeedback({});
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setBilateralNeedsReferral(false);
    setMidpointDecisionDone(false);
    setBilateralTreatmentSides({});
    setBilateralRetestResponses({});
  }

  // SAVE-02：恢复到评估阶段后，按派生队列推导作答进度并落到正确位置
  useEffect(() => {
    if (!restoredAssessmentCheck) return;
    if (!assessmentDisplayItems.length) return;
    /* eslint-disable react-hooks/set-state-in-effect -- 恢复落点只能等派生队列就绪后一次性校正，属恢复路径的合法级联 */
    // 不再用“对象非空”冒充已完成。逐侧双侧记录会先创建空容器，功能/力量
    // 记录也可能只有半份答案；恢复路径必须与页面进度、处理门使用同一完成合同。
    // 同时按可见队列计算索引，避免髌骨合并项让恢复位置偏移到下一张卡。
    const answered = assessmentDisplayItems.map((item) => displayAssessmentComplete(item));
    const progress = resolveRestoredAssessmentProgress(answered);
    if (progress.complete) {
      setStep(3);
      setAssessmentIndex(progress.total);
    } else {
      setAssessmentIndex(progress.firstIncompleteIndex);
    }
    const notice = restoredAssessmentNotice(progress);
    if (notice) {
      setToast(notice);
      window.setTimeout(() => setToast(""), 3600);
    }
    setRestoredAssessmentCheck(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // 恢复标记触发一次；可见队列/assessmentResults 由上方长度守卫与闭包快照覆盖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredAssessmentCheck, assessmentDisplayItems.length]);

  function targetScoreBeforeRetest(target: TrialTarget) {
    if (target.id === "target:chief") return lastChiefScore;
    if (target.finding.id.startsWith("motion:")) {
      const directionId = motionIdFromFinding(target.finding);
      const initialDirectionScore = assessmentResults[target.finding.id]?.symptomScore;
      const latestRangeScore = latestRangeScoreForDirection(directionId);
      if (typeof latestRangeScore === "number") return latestRangeScore;
      if (typeof initialDirectionScore === "number") return initialDirectionScore;
      if (chiefScoreComparable && samePhysicalAction(directionId, region ? chiefMotionDirectionId(intake, region.id) : undefined)) return lastChiefScore;
    }
    const previous = [...trialRecords].reverse().find((record) => record.targetId === target.id && !record.timeBased);
    return previous?.afterScore ?? target.finding.score ?? intake.baselineScore;
  }

  function undoLastFinish() {
    const snapshot = finishSnapshots[finishSnapshots.length - 1];
    if (!snapshot) return;
    setTrialRecords(snapshot.trialRecords);
    setTrialTargetIndex(snapshot.trialTargetIndex);
    setCandidateIndex(snapshot.candidateIndex);
    setPendingTrialAdvance(snapshot.pendingTrialAdvance);
    setFinishSnapshots((current) => current.slice(0, -1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishTrial(requestedResult: TrialResult, timeBased = false, nextCandidateType?: FullCandidate["type"], deferredRetest = false) {
    if (!activeTarget || !activeCandidate) return;
    const beforeScore = targetScoreBeforeRetest(activeTarget);
    const recordCandidates = activeNewCandidates.length ? activeNewCandidates : [activeCandidate];
    const carryoverOnly = activeNewCandidates.length === 0 && activeGroupPriorRecords.length > 0;
    const activeDirectionIdForTrial = activeTarget.finding.id.startsWith("motion:") ? motionIdFromFinding(activeTarget.finding) : undefined;
    // 主诉目标也可能只复测一个明确的关节方向。把结果同时保存为按方向
    // 记录，确保后续决策能识别“肌肉处理后被动活动仍受限”。
    const singleRangeDirectionId = activeRetestFindings.length === 1
      ? motionIdFromFinding(activeRetestFindings[0])
      : activeDirectionIdForTrial;
    const hasSingleRangeEvidence = Boolean(!timeBased && !deferredRetest && singleRangeDirectionId && movementResponse);
    const singleRangeDiscomfort = singleRangeDirectionId
      ? movementDiscomforts[singleRangeDirectionId] ?? postDiscomfort
      : undefined;
    const singleRangeScoreValue = singleRangeDirectionId && movementScoreConfirmed[singleRangeDirectionId]
      ? movementScores[singleRangeDirectionId]
      : postScoreConfirmed ? postScore : undefined;
    const singleRangeScore = typeof singleRangeScoreValue === "number" && Number.isFinite(singleRangeScoreValue)
      ? singleRangeScoreValue
      : undefined;
    const activeFunctionObligations = activeLedgerFunctionRetests;
    const activeFunctionEvidence = !activeFunctionObligations.length && activeTarget.finding.id.startsWith("function:")
      ? functionEvidenceFromRecord(activeTarget.finding.id, assessmentResults[activeTarget.finding.id])
      : undefined;
    const functionRetestSummary = summarizeFunctionRetestObligations({
      obligations: activeFunctionObligations,
      answers: treatmentFunctionRetests,
    });
    const functionRetests = activeFunctionObligations.length ? functionRetestSummary.records : undefined;
    const singleFunctionRetest = functionRetests && Object.keys(functionRetests).length === 1
      ? Object.values(functionRetests)[0]
      : undefined;
    const functionBaselineCompletion: FunctionRetestCompletion | undefined = singleFunctionRetest?.baselineCompletion
      ?? (activeFunctionEvidence?.completion === "complete" || activeFunctionEvidence?.completion === "unable" ? activeFunctionEvidence.completion : undefined);
    const functionAfterCompletion: FunctionRetestCompletion | undefined = singleFunctionRetest?.afterCompletion ?? (functionRetestCompletion || undefined);
    const functionRetestMode: FunctionRetestMode | undefined = singleFunctionRetest?.mode
      ?? (activeFunctionEvidence?.retestMode === "ordinary" || activeFunctionEvidence?.retestMode === "completion-status" ? activeFunctionEvidence.retestMode : undefined);
    const functionRetestState = resolveFunctionRetestTransition({
      isFunctionTarget: Boolean(activeFunctionEvidence),
      mode: activeFunctionEvidence?.retestMode ?? "none",
      completion: functionRetestCompletion,
      unableReason: functionRetestUnableReason,
      scoreConfirmed: postScoreConfirmed,
    });
    const retestEvidenceCaptured = activeFunctionObligations.length
      ? functionRetestSummary.ready
      : functionRetestState.evidenceCaptured;
    const mergedChiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const targetChiefRetestAllowed = activeTarget.id !== "target:chief"
      || chiefScoreComparable
      || activeFunctionObligations.some((item) => item.mode === "completion-status")
      || functionRetestMode === "completion-status";
    const chiefWasActuallyRetested = resolveChiefRetestCapture({
      timeBased,
      deferredRetest,
      evidenceCaptured: retestEvidenceCaptured,
      targetId: activeTarget.id,
      targetChiefRetestAllowed,
      chiefScoreComparable,
      activeDirectionId: activeDirectionIdForTrial,
      chiefDirectionId: mergedChiefDirection,
      chiefImprovedDuringTreatment,
      chiefRetestCompletedDuringTreatment,
    });
    const recordRetestLabel = activeFunctionObligations.length
      ? activeFunctionObligations.map((item) => item.label).join("、")
      : activeTarget.retestLabel
      ?? assessments.find((item) => item.id === activeTarget.finding.id.replace(/^symptom:/, ""))?.title
      ?? activeTarget.finding.title;
    const recordedAfterScore = timeBased || deferredRetest || !postScoreConfirmed || activeFunctionObligations.length > 1 ? beforeScore : postScore;
    const activityWorsened = movementResponse === "worse"
      || Object.values(movementResponses).some((outcome) => outcome === "worse")
      || Object.values(bilateralRetestResponses).some((outcome) => outcome === "worse")
      || functionRetestSummary.worsened;
    const mixedImprovementAndActivityWorsening = activityWorsened
      && chiefWasActuallyRetested
      && recordedAfterScore < beforeScore;
    const result: TrialResult = mixedImprovementAndActivityWorsening ? "partial" : requestedResult;
    const priorImprovingTreatmentCount = trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly && record.chiefRetested && record.afterScore < record.beforeScore).length;
    const responseRole = activityWorsened
      ? "worsened"
      : classifyTreatmentResponse({
        beforeScore,
        afterScore: recordedAfterScore,
        result,
        chiefRetested: chiefWasActuallyRetested,
        rangeImproved: ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(movementResponse),
        priorImprovingTreatmentCount,
        timeBased: timeBased || deferredRetest,
      });
    const treatmentSide = activeTarget.finding.side ?? intake.side;
    const treatmentRecordFlow = resolveTreatmentRecordFlow({
      retest: {
        timeBased,
        deferredRetest,
        evidenceCaptured: retestEvidenceCaptured,
        targetId: activeTarget.id,
        targetChiefRetestAllowed,
        chiefScoreComparable,
        activeDirectionId: activeDirectionIdForTrial,
        chiefDirectionId: mergedChiefDirection,
        chiefImprovedDuringTreatment,
        chiefRetestCompletedDuringTreatment,
      },
      retestActionKey: canonicalRetestAction(recordRetestLabel),
      recordInput: {
        candidates: recordCandidates.map((candidate) => ({
          id: candidate.id,
          candidateTitle: candidateTreatmentName(candidate),
          treatmentName: candidateTreatmentName(candidate),
          treatmentKey: candidateTreatmentKey(candidate, activeTargetIsBilateral ? "" : treatmentSide),
          action: candidateAction(candidate, activeControlMotionIds),
          sourceCaseIds: activeTarget.sourceCaseIds,
          relationIds: candidate.knowledgeEvidence?.relationIds,
          findingIds: candidate.knowledgeEvidence?.assessmentFindingIds,
          knowledgeBranchId: candidate.knowledgeEvidence?.branchId,
        })),
        carryoverOnly,
        beforeScore,
        recordedAfterScore,
        result,
        activityWorsened,
        timeBased,
        deferredRetest,
        hasSingleRangeEvidence,
        singleRangeDirectionId,
        singleRangeDiscomfort,
        singleRangeScore,
        movementResponse,
        functionBaselineCompletion,
        functionAfterCompletion,
        functionRetestMode,
        functionRetests,
        responseRole,
        priorTreatmentTitle: priorTreatmentRecord?.targetTitle,
        treatmentSide,
        treatmentSides: activeTargetSides.length ? activeTargetSides : undefined,
        sideResults: activeTargetSides.length ? bilateralRetestResponses : undefined,
        targetId: activeTarget.id,
        targetTitle: activeTarget.finding.title,
        residualReviewId: RESIDUAL_REVIEW_ID,
      },
    });
    const recordedAt = new Date().toISOString();
    const records = treatmentRecordFlow.records.map((record) => ({
      ...record,
      treatmentRecordId: `treatment:${sessionId}:${crypto.randomUUID()}`,
      sessionId,
      assessmentRevision,
      recordedAt,
    }));
    setFinishSnapshots((current) => [...current, { trialRecords, trialTargetIndex, candidateIndex, pendingTrialAdvance }]);
    setTrialRecords((current) => [...current, ...records]);
    const treatmentDecision = workflowController.recordTreatmentRetest({
      candidates: activeTarget.candidates,
      startIndex: activeGroupEndIndex,
      preferredTypes: nextCandidateType ? [nextCandidateType] : [],
      getType: (candidate) => candidate.type,
      result,
      activityWorsened,
    });
    const chiefFullyResolved = activeTarget.id === "target:chief" && chiefWasActuallyRetested && recordedAfterScore === 0;
    if (treatmentDecision.queueAdvance.stopped) {
      workflowController.execute(treatmentDecision.commands, { stopTreatment: () => undefined });
    } else if (isChiefTreatmentPhase && result === "better" && chiefFullyResolved) {
      if (chiefReviewIndex >= 0) setCandidateIndex(chiefReviewIndex);
      else {
        advanceToNextTrialTarget();
      }
    } else {
      workflowController.execute(treatmentDecision.commands, {
        selectTreatmentCandidate: setCandidateIndex,
        advanceTreatmentTarget: () => advanceToNextTrialTarget(timeBased),
      });
    }
    setPostScore(["better", "partial"].includes(result) ? recordedAfterScore : beforeScore);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setBilateralRetestResponses({});
    setFunctionRetestCompletion("");
    setFunctionRetestUnableReason("");
    setTreatmentFunctionRetests({});
    setPostDiscomfort("");
    setPostScoreConfirmed(false);
    setReadyToRetest(false);
    setRetestPlan(null);
    setTrainingComplete(false);
    setTrainingPlanSaved(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
  }

  // 只有实际完成过的功能评估才进入主诉复测；问诊里提到的动作只保留为主诉上下文。
  const chiefFunctionLabels = region
    ? chiefFunctionAssessmentIds(intake, region.id)
      .filter((id) => {
        const item = assessments.find((assessment) => assessment.id === id);
        if (!item || !assessmentRecordComplete(
          item,
          assessmentResults[id],
          assessmentAllowsPassive(item, canAssessPassive),
          intake.side === "双侧/中间",
          false,
          assessmentAllowsEndFeel(item, canAssessEndFeel),
        )) return false;
        return item.kind !== "function" || functionEvidenceFromRecord(id, assessmentResults[id]).channels.retest;
      })
      .map((id) => assessments.find((assessment) => assessment.id === id)?.title ?? id.replace(/^function:/, ""))
    : [];
  const hasChiefFunctionAction = chiefFunctionLabels.length > 0;

  function finishOutstandingFunctionRetests() {
    const summary = summarizeFunctionRetestObligations({
      obligations: outstandingFunctionRetests,
      answers: treatmentFunctionRetests,
    });
    if (!summary.ready || !summary.records) return;
    const recordedAt = new Date().toISOString();
    const record: TrialRecord = {
      treatmentRecordId: `treatment:${sessionId}:${crypto.randomUUID()}`,
      sessionId,
      assessmentRevision,
      recordedAt,
      candidateId: "outstanding-function-retest",
      candidateTitle: "剩余动作复查",
      treatmentName: "剩余动作复查",
      targetId: "target:outstanding-function-retest",
      targetTitle: outstandingFunctionRetests.map((item) => item.label).join("、"),
      beforeScore: lastChiefScore,
      afterScore: lastChiefScore,
      result: summary.result,
      movement: summary.result === "worse" ? "worse" : summary.result === "same" ? "same" : "smoother",
      retestOnly: true,
      functionRetests: summary.records,
    };
    if (followupMode) {
      const sharedRecord = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "movement")) as Omit<TrialRecord, "movement">;
      const followupRecord: FollowupTreatmentRecord = {
        ...sharedRecord,
        sessionNumber,
      };
      setFollowupTrialRecords((current) => [...current, followupRecord]);
    } else {
      setTrialRecords((current) => [...current, record]);
    }
    setTreatmentFunctionRetests({});
    setFunctionRetestCompletion("");
    setFunctionRetestUnableReason("");
    setToast("动作复查已记录");
    window.setTimeout(() => setToast(""), 2200);
  }

  function finishRangeBatch() {
    if (!activeTarget || !activeCandidate || !activeRetestFindings.length) return;
    const activeFunctionObligations = activeLedgerFunctionRetests;
    const functionRetestSummary = summarizeFunctionRetestObligations({
      obligations: activeFunctionObligations,
      answers: treatmentFunctionRetests,
    });
    if (activeFunctionObligations.length && !functionRetestSummary.ready) return;
    const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const chiefRangeFinding = chiefDirection ? activeRetestFindings.find((finding) => samePhysicalAction(motionIdFromFinding(finding), chiefDirection)) : undefined;
    const chiefMatchesRange = Boolean(chiefRangeFinding);
    // This flag used to live only inside renderTreatment().  finishRangeBatch()
    // also needs it when a local-limb batch records the chief action, so keep the
    // decision local to this handler instead of reaching into render scope.
    const batchSingleRangeRetestsChief = Boolean(
      activeTarget.id === "target:local-limb"
      && activeTarget.finding.id.startsWith("motion:")
      && chiefScoreComparable
      && (localNewSourceNeedsChiefRetest || (!chiefImprovedDuringTreatment && !chiefRetestCompletedDuringTreatment))
      && !chiefMatchesRange,
    );
    const shouldRetestChiefThisRound = shouldRequestChiefRetest({
      isResidualReviewStep,
      chiefScoreComparable,
      chiefMatchesRange,
      hasChiefFunctionAction,
      activeTargetId: activeTarget.id,
      targetRelatesToChief: treatmentRelatesToChief((activeTarget.retestFindings ?? []).map(motionIdFromFinding), chiefDirection),
      localNewSourceNeedsChiefRetest: batchSingleRangeRetestsChief || localNewSourceNeedsChiefRetest,
      chiefImprovedDuringTreatment,
      chiefRetestCompletedDuringTreatment,
    });
    const chiefRangeDirectionId = chiefRangeFinding ? motionIdFromFinding(chiefRangeFinding) : undefined;
    // 主诉动作可能挂在 target:chief，也可能挂在大腿/小腿的局部目标。
    // 只要复测方向与主诉是同一个物理动作，就应同步更新主诉分数；
    // 其他方向的活动复测不能替代主诉复测。
    const chiefScoreCapturedInRange = chiefScoreComparable && capturesChiefRetestScore(
      activeTarget.id,
      chiefRangeDirectionId,
      chiefDirection,
      Boolean(chiefRangeDirectionId && movementScoreConfirmed[chiefRangeDirectionId]),
    );
    if (shouldRetestChiefThisRound && !postScoreConfirmed) return;
    const selectedEntries = activeRetestFindings
      .map((finding) => [motionIdFromFinding(finding), movementResponses[motionIdFromFinding(finding)]] as const)
      .filter((entry): entry is readonly [string, CompletedRangeRetestAnswer] => isCompletedRangeRetestAnswer(entry[1]));
    if (selectedEntries.length !== activeRetestFindings.length) return;
    const directionIds = selectedEntries.map(([directionId]) => directionId);
    if (directionIds.some((directionId) => !movementDiscomforts[directionId] || (movementDiscomforts[directionId] === "yes" && !movementScoreConfirmed[directionId]))) return;
    const rangeOutcomes = Object.fromEntries(selectedEntries) as Record<string, CompletedRangeRetestAnswer>;
    const singleRangeOutcome: CompletedRangeRetestAnswer | undefined = selectedEntries.length === 1 ? selectedEntries[0][1] : undefined;
    const rangeDiscomforts = Object.fromEntries(directionIds.map((directionId) => [directionId, movementDiscomforts[directionId]])) as Record<string, YesNo>;
    const rangeScores = Object.fromEntries(directionIds.map((directionId) => [directionId, movementDiscomforts[directionId] === "yes" ? movementScores[directionId] : 0])) as Record<string, number>;
    const outcomes = Object.values(rangeOutcomes);
    // 范围记录用该方向最新分，主诉比较用当前主诉分——两个基准彻底分开，
    // 不能像以前那样在非主诉方向复测时回退到最初 baseline。
    const rangeBeforeScore = targetScoreBeforeRetest(activeTarget);
    const chiefBeforeScore = lastChiefScore;
    const rangeChiefScore = chiefScoreCapturedInRange && chiefRangeDirectionId
      ? movementScores[chiefRangeDirectionId]
      : undefined;
    // 复测分数必须是已确认的有限数字。异常情况下回退到本轮主诉分数，
    // 避免“疼痛改善＋活动度改善”点击继续时把 undefined 带入后续队列。
    const recordedChiefScore = typeof rangeChiefScore === "number" && Number.isFinite(rangeChiefScore)
      ? rangeChiefScore
      : typeof postScore === "number" && Number.isFinite(postScore) ? postScore : chiefBeforeScore;
    // 楼梯、下蹲、走路等主诉动作没有唯一的关节方向，批量复测页会
    // 单独显示主诉分数条。只要该分数条确实被记录，就必须写入主诉台账，
    // 不能因为没有 chiefDirection 或队列在本轮重排后变成 support target
    // 而丢掉这次结果，最终总结也不能回退到首次分数。
    const chiefScoreShownAndRecorded = Boolean(
      chiefScoreComparable
      && postScoreConfirmed
      && (activeTarget.id === "target:chief" || activeTarget.id === "target:local-limb")
      && !chiefRetestCompletedDuringTreatment,
    );
    const chiefWasActuallyRetested = resolveRangeChiefRetestCapture({
      shouldRequest: shouldRetestChiefThisRound,
      scoreShownAndRecorded: chiefScoreShownAndRecorded,
      scoreConfirmed: postScoreConfirmed,
      rangeScoreCaptured: chiefScoreCapturedInRange,
    });
    const priorImprovingTreatmentCount = trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly && record.chiefRetested && record.afterScore < record.beforeScore).length;
    const { result, responseRole, activityWorsened } = computeBatchResult({
      chiefBeforeScore,
      recordedChiefScore,
      chiefWasActuallyRetested,
      rangeBeforeScore,
      outcomes,
      priorImprovingTreatmentCount,
      functionResult: activeFunctionObligations.length ? functionRetestSummary.result : undefined,
      functionWorsened: functionRetestSummary.worsened,
    });

    const recordCandidates = activeNewCandidates.length ? activeNewCandidates : [activeCandidate];
    const carryoverOnly = activeNewCandidates.length === 0 && activeGroupPriorRecords.length > 0;
    const batchRetestLabels = [
      ...(shouldRetestChiefThisRound ? [chiefActionLabel(intake)] : []),
      ...activeRetestFindings.map((finding) => assessments.find((item) => item.id === finding.id)?.title ?? finding.title),
      ...activeFunctionObligations.map((obligation) => obligation.label),
    ];
    const batchRetestKey = canonicalRetestAction(batchRetestLabels.join("、"));
    setFinishSnapshots((current) => [...current, { trialRecords, trialTargetIndex, candidateIndex, pendingTrialAdvance }]);
    const recordedAt = new Date().toISOString();
    const records = buildRangeTreatmentRecords({
      candidates: recordCandidates.map((candidate) => ({
        id: candidate.id,
        treatmentKey: candidateTreatmentKey(candidate, activeTargetIsBilateral ? "" : activeTarget.finding.side ?? intake.side),
        treatmentSide: activeTarget.finding.side ?? intake.side,
        treatmentSides: activeTargetSides.length ? activeTargetSides : undefined,
        sideResults: activeTargetSides.length ? bilateralRetestResponses : undefined,
        candidateTitle: candidateTreatmentName(candidate),
        treatmentName: candidateTreatmentName(candidate),
        action: candidateAction(candidate, activeControlMotionIds),
        sourceCaseIds: activeTarget.sourceCaseIds,
        relationIds: candidate.knowledgeEvidence?.relationIds,
        findingIds: candidate.knowledgeEvidence?.assessmentFindingIds,
        knowledgeBranchId: candidate.knowledgeEvidence?.branchId,
      })),
      carryoverOnly,
      rangeOutcome: singleRangeOutcome,
      rangeOutcomes,
      rangeDiscomforts,
      rangeScores,
      functionRetests: functionRetestSummary.records,
      beforeScore: chiefWasActuallyRetested ? chiefBeforeScore : rangeBeforeScore,
      afterScore: chiefWasActuallyRetested ? recordedChiefScore : rangeBeforeScore,
      result,
      activityWorsened,
      chiefWasActuallyRetested,
      reusedFromTargetTitle: priorTreatmentRecord?.targetTitle,
      retestActionKey: batchRetestKey,
      responseRole,
      targetId: activeTarget.id,
      targetTitle: activeRetestFindings.map((finding) => finding.title).join("、"),
      residualReviewId: RESIDUAL_REVIEW_ID,
    }).map((record) => ({
      ...record,
      treatmentRecordId: `treatment:${sessionId}:${crypto.randomUUID()}`,
      sessionId,
      assessmentRevision,
      recordedAt,
    }));
    setTrialRecords((current) => [...current, ...records]);

    const mergedOutcomes = { ...latestRangeOutcomes, ...rangeOutcomes };
    const chiefStillSymptomatic = chiefWasActuallyRetested && recordedChiefScore > 0;
    const trackedDirectionIds = new Set((activeTarget.retestFindings ?? []).map(motionIdFromFinding));
    const preferredNextTypes = Array.from(new Set(outcomes
      .map((outcome) => nextRangeCandidateType(outcome, canAssessPassive && canMobilizeJoint))
      .filter((type): type is "control" | "joint" => Boolean(type))));
    const canUseNextCandidate = (candidate: FullCandidate, target: TrialTarget) => isTreatmentQueueCandidateEligible({
      candidate,
      target,
      preferredTypes: preferredNextTypes,
      trackedDirectionIds,
      mergedOutcomes,
      chiefStillSymptomatic,
      getCandidateType: (item) => item.type,
      getCandidateRetestIds: (item) => item.retestIds ?? [],
      getTargetDirectionId: (item) => item.finding.id.startsWith("motion:") ? motionIdFromFinding(item.finding) : undefined,
      samePhysicalAction,
      directionNeedsCandidate,
    });
    const treatmentDecision = workflowController.recordTreatmentRetest({
      candidates: activeTarget.candidates,
      startIndex: activeGroupEndIndex,
      preferredTypes: preferredNextTypes,
      getType: (candidate) => candidate.type,
      isEligible: (candidate) => canUseNextCandidate(candidate, activeTarget),
      result,
      activityWorsened,
      targets: trialTargets,
      startTargetIndex: trialTargetIndex,
      isEligibleAcrossTargets: (candidate, target) => canUseNextCandidate(candidate, target),
    });
    workflowController.execute(treatmentDecision.commands, {
      selectTreatmentCandidate: setCandidateIndex,
      selectTreatmentTarget: (targetIndex, nextCandidateIndex) => {
        const nextTarget = trialTargets[targetIndex];
        setPendingTrialAdvance(workflowController.createPendingQueueAdvance(activeTarget, nextTarget));
        setTrialTargetIndex(targetIndex);
        setCandidateIndex(nextCandidateIndex);
      },
      advanceTreatmentTarget: () => advanceToNextTrialTarget(),
      stopTreatment: () => undefined,
    });
    setPostScore(["better", "partial"].includes(result) ? recordedChiefScore : chiefBeforeScore);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setBilateralRetestResponses({});
    setTreatmentFunctionRetests({});
    setPostDiscomfort("");
    setPostScoreConfirmed(false);
    setReadyToRetest(false);
    setRetestPlan(null);
    setTrainingComplete(false);
    setTrainingPlanSaved(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
  }

  function continueWithReusedRetest() {
    if (!activeTarget) return;
    const trackedDirectionIds = new Set((activeTarget.retestFindings ?? []).map(motionIdFromFinding));
    const directDirection = activeTarget.finding.id.startsWith("motion:") ? motionIdFromFinding(activeTarget.finding) : undefined;
    if (directDirection) trackedDirectionIds.add(directDirection);
    const nextIndex = findNextCandidateIndex({
      candidates: activeTarget.candidates,
      startIndex: activeGroupEndIndex,
      isEligible: (candidate) => !priorTreatmentFor(candidate) && (() => {
        const candidateDirections = (candidate.retestIds ?? []).filter((directionId) => trackedDirectionIds.has(directionId));
        if (candidateDirections.length) return candidateDirections.some((directionId) => directionNeedsCandidate(candidate, directionId));
        return activeTarget.id === "target:chief" ? lastChiefScore > 0 : true;
      })(),
    });
    if (nextIndex >= 0) setCandidateIndex(nextIndex);
    else {
      advanceToNextTrialTarget();
    }
    setReadyToRetest(false);
    setRetestPlan(null);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setBilateralRetestResponses({});
  }

  function buildCurrentSnapshot(snapshotOverrides: Partial<SavedDemoSnapshot> = {}): SavedDemoSnapshot {
    const previousSnapshot = savedRecordsRef.current.find((item) => savedRecordIdentity(item) === localCaseId)?.snapshot;
    const now = new Date().toISOString();
    const previousThreads = Array.isArray(previousSnapshot?.problemThreads) ? previousSnapshot.problemThreads : [];
    const previousCurrentThread = previousThreads.find((item) => item.problemThreadId === problemThreadId);
    const currentThread: ProblemThreadRecord = previousCurrentThread
      ? {
          ...previousCurrentThread,
          caseId: localCaseId,
          status: "active",
          lastActiveAt: now,
          regionId: intake.regionId || previousCurrentThread.regionId,
          location: intake.location || previousCurrentThread.location,
          title: chiefComplaintLabel(intake) || previousCurrentThread.title,
        }
      : createProblemThreadRecord({
          caseId: localCaseId,
          problemThreadId,
          regionId: intake.regionId,
          location: intake.location,
          title: chiefComplaintLabel(intake),
          createdAt: sessionStartedAt,
        });
    const problemThreads = upsertProblemThreadRecord(previousThreads, currentThread);
    const marksCreatedAt = sessionStartedAt;
    const selectedBodyMarks = sessionNumber === 1 ? [
      ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: marksCreatedAt, symptomKind: "complaint", selections: [...intake.bodyLocationHistory, ...intake.bodyLocations], confirmed: intake.locationConfirmed }),
      ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: marksCreatedAt, symptomKind: "swelling", selections: intake.swellingLocations, confirmed: intake.swellingLocationConfirmed }),
      ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: marksCreatedAt, symptomKind: "tenderness", selections: intake.tendernessLocations, confirmed: intake.tendernessLocationConfirmed }),
      ...bodyMarksFromSelections({ caseId: localCaseId, problemThreadId, sessionId, createdAt: marksCreatedAt, symptomKind: "sensory", selections: intake.sensoryLocations, confirmed: intake.sensoryLocationConfirmed }),
    ] : [];
    const previousBodyMarks = previousSnapshot?.bodyMarks ?? [];
    const bodyMarks = mergeBodyMarks(previousBodyMarks, selectedBodyMarks, now, sessionId);
    const snapshot: SavedDemoSnapshot = {
      schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION,
      contractRevision: REHABMIND_V3_CONTRACT_REVISION,
      ...(retestContractVersion === 1 ? { retestContractVersion: 1 as const } : {}),
      localCaseId,
      bodyMarks,
      problemThreadId,
      sessionId,
      problemThreads,
      sessionIndex: previousSnapshot?.sessionIndex ?? [],
      capabilitySnapshotId: buildCapabilitySnapshotId(sessionId, assessmentRevision, workflowProfile.operationTarget, workflowProfile.capabilities),
      sessionStatus: "draft",
      sessionStartedAt,
      draftSavedAt: new Date().toISOString(),
      step,
      // 新快照不再把旧 userRole/examSetup 作为事实源写出去；恢复旧数据时
      // migrateIntakeState 仍会补回兼容字段，生产权限只看 WorkflowProfile。
      intake: { ...intake, userRole: undefined, examSetup: undefined, medicalGuidance } as unknown as IntakeState,
      confirmedIntakeMulti,
      safety,
      boneRisk,
      imaging,
      assessmentIndex,
      assessmentResults,
      assessmentHistory,
      assessmentOwnerSessionId,
      trialTargetIndex,
      candidateIndex,
      selectedOptionalCandidateIds,
      bilateralNeedsReferral,
      midpointDecisionDone,
      bilateralTreatmentSides,
      bilateralRetestResponses,
      trialRecords,
      supersededTrialRecords,
      postScore,
      postScoreConfirmed,
      postDiscomfort,
      readyToRetest,
      retestPlan,
      movementResponse,
      movementResponses,
      movementDiscomforts,
      movementScores,
      movementScoreConfirmed,
      exerciseFeedback,
      trainingComplete,
      trainingPlanSaved,
      treatmentFinalRetestScore,
      treatmentFinalRetestConfirmed,
      treatmentFinalRetestRecordedAt,
      trainingReadyForFinalRetest,
      finalRetestScore,
      finalRetestConfirmed,
      finalRetestRecordedAt,
      followupMode,
      sessionNumber,
      followupScore,
      followupScoreConfirmed,
      followupScoreHistory,
      followupStage,
      followupPostScore,
      followupPostScoreConfirmed,
      followupPostDiscomfort,
      followupCandidateId,
      followupTrialRecords,
      supersededFollowupTrialRecords,
      historicalTreatments,
      followupReadyToRetest,
      followupRetestPlan,
      followupMovementResponses,
      followupMovementDiscomforts,
      followupMovementScores,
      followupMovementScoreConfirmed,
      followupTensionLocations,
      followupExerciseChoices,
      followupExerciseChoiceRecordedAt,
      trainingFeedbackRecords,
      followupTrainingReadyForRetest,
      followupFinalScore,
      followupFinalScoreConfirmed,
      followupFinalRetestRecordedAt,
      hasNewSymptom: hasNewSymptom === "yes",
      followupTrends,
      sessionHistory,
      assessmentRevision,
      treatmentPlanRevision,
      adverseResponse,
      adverseConfirmedAssessmentIds,
      retestObligations: activeRetestLedger.obligations,
      retestRecords: activeRetestLedger.records,
      ...snapshotOverrides,
    };
    let sessionIndex: SessionIndexRecord[] = snapshot.sessionIndex ?? [];
    (snapshot.sessionHistory ?? []).forEach((summary) => {
      sessionIndex = upsertSessionIndex(sessionIndex, sessionIndexFromSummary({
        caseId: localCaseId,
        problemThreadId: summary.problemThreadId ?? problemThreadId,
        sessionId: summary.sessionId,
        sessionNumber: summary.sessionNumber,
        status: summary.status,
        startedAt: summary.startedAt,
        lastDraftSavedAt: summary.lastDraftSavedAt,
        completedAt: summary.completedAt,
        completionReason: summary.completionReason,
        location: summary.location,
      }));
    });
    sessionIndex = upsertSessionIndex(sessionIndex, sessionIndexFromSummary({
      caseId: localCaseId,
      problemThreadId,
      sessionId,
      sessionNumber,
      status: snapshot.sessionStatus,
      startedAt: snapshot.sessionStartedAt ?? sessionStartedAt,
      lastDraftSavedAt: snapshot.draftSavedAt,
      completedAt: snapshot.completedAt,
      completionReason: snapshot.completionReason,
      location: snapshot.intake.location,
    }));
    snapshot.sessionIndex = sessionIndex;
    const currentAssessmentSet = assessmentHistory.find((item) => item.sessionId === assessmentOwnerSessionId
      && item.assessmentRevision === assessmentRevision);
    const ownedAssessmentResults = followupMode ? (currentAssessmentSet?.results ?? {}) : assessmentResults;
    const newSpecialTestRecords = buildSpecialTestRecords({
      caseId: localCaseId,
      problemThreadId,
      sessionId: assessmentOwnerSessionId,
      assessmentRevision,
      operationTarget: workflowProfile.operationTarget,
      capabilities: workflowProfile.capabilities,
      description: intake.description,
      location: intake.location,
      sensoryLocation: intake.sensoryLocation,
      sensoryLocations: intake.sensoryLocations,
      symptomType: intake.symptomType,
      mechanism: intake.mechanism,
      provocationTypes: activeProvocationTypes,
      forceDirection: intake.forceDirection,
      assessmentResults: ownedAssessmentResults,
    }, assessments.filter((item) => item.kind === "special").map((item) => ({ id: item.id, trigger: item.trigger })), currentAssessmentSet?.recordedAt ?? snapshot.draftSavedAt);
    snapshot.specialTestRecords = [...new Map([
      ...(previousSnapshot?.specialTestRecords ?? []),
      ...newSpecialTestRecords,
    ].map((item) => [item.specialTestRecordId, item])).values()];
    snapshot.professionalNoteRecords = buildProfessionalNoteRecords({
      localCaseId,
      problemThreadId,
      sessionId,
      professionalNotes: intake.professionalNotes,
      assessmentRevision,
    }, snapshot.draftSavedAt);
    const traceTrials = snapshot.followupMode
      ? snapshot.followupTrialRecords.filter((record) => record.sessionNumber === snapshot.sessionNumber).map(sessionTreatmentAsTrialRecord)
      : snapshot.trialRecords;
    const currentDecisionTraces = buildDecisionTraces({
      localCaseId,
      problemThreadId,
      sessionId,
      trialRecords: traceTrials,
    }, snapshot.draftSavedAt);
    snapshot.decisionTraces = [...new Map([
      ...(previousSnapshot?.decisionTraces ?? []),
      ...currentDecisionTraces,
    ].map((item) => [item.traceId, item])).values()];
    const traceIdByTreatment = new Map(currentDecisionTraces.map((trace) => [trace.traceId.replace(/^trace:/, ""), trace.traceId]));
    if (snapshot.followupMode) {
      snapshot.followupTrialRecords = snapshot.followupTrialRecords.map((record) => ({
        ...record,
        decisionTraceId: record.treatmentRecordId ? traceIdByTreatment.get(record.treatmentRecordId) : record.decisionTraceId,
      }));
    } else {
      snapshot.trialRecords = snapshot.trialRecords.map((record) => ({
        ...record,
        decisionTraceId: record.treatmentRecordId ? traceIdByTreatment.get(record.treatmentRecordId) : record.decisionTraceId,
      }));
    }
    return snapshot;
  }

  useEffect(() => {
    if (!draftHydratedRef.current || (!intake.regionId && !intake.description.trim())) return;
    if (multiTabConflict) return;
    const controller = draftPersistenceRef.current;
    if (!controller) return;
    const snapshot = buildCurrentSnapshot();
    const persistedSnapshot = persistSavedDemoSnapshot(snapshot);
    currentDraftFingerprintRef.current = localDraftContentFingerprint({ snapshot: persistedSnapshot });
    controller.schedule({
      schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION,
      localCaseId,
      savedAt: new Date().toISOString(),
      snapshot: persistedSnapshot,
    });
    // buildCurrentSnapshot is intentionally omitted: adding the render-local function would schedule a draft on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    multiTabConflict,
    step,
    intake,
    confirmedIntakeMulti,
    safety,
    boneRisk,
    imaging,
    assessmentIndex,
    assessmentResults,
    trialTargetIndex,
    candidateIndex,
    selectedOptionalCandidateIds,
    bilateralNeedsReferral,
    midpointDecisionDone,
    bilateralTreatmentSides,
    bilateralRetestResponses,
    trialRecords,
    supersededTrialRecords,
    postScore,
    postScoreConfirmed,
    postDiscomfort,
    readyToRetest,
    retestPlan,
    movementResponse,
    movementResponses,
    movementDiscomforts,
    movementScores,
    movementScoreConfirmed,
    exerciseFeedback,
    trainingComplete,
    trainingPlanSaved,
    treatmentFinalRetestScore,
    treatmentFinalRetestConfirmed,
    treatmentFinalRetestRecordedAt,
    trainingReadyForFinalRetest,
    finalRetestScore,
    finalRetestConfirmed,
    finalRetestRecordedAt,
    followupMode,
    sessionNumber,
    followupScore,
    followupScoreConfirmed,
    followupScoreHistory,
    followupStage,
    followupPostScore,
    followupPostScoreConfirmed,
    followupPostDiscomfort,
    followupCandidateId,
    followupTrialRecords,
    supersededFollowupTrialRecords,
    followupReadyToRetest,
    followupRetestPlan,
    followupMovementResponses,
    followupMovementDiscomforts,
    followupMovementScores,
    followupMovementScoreConfirmed,
    followupTensionLocations,
    followupExerciseChoices,
    followupTrainingReadyForRetest,
    followupFinalScore,
    followupFinalScoreConfirmed,
    followupFinalRetestRecordedAt,
    hasNewSymptom,
    followupTrends,
    sessionHistory,
    assessmentRevision,
    treatmentPlanRevision,
    adverseResponse,
    adverseConfirmedAssessmentIds,
    localCaseId,
    problemThreadId,
    sessionId,
    sessionStartedAt,
  ]);

  function saveRecord(status: SavedDemoRecord["status"] = "待复查", latestScoreOverride?: number, snapshotOverrides: Partial<SavedDemoSnapshot> = {}, lifecycle: "draft" | "completed" = "completed") {
    if (workflowProfile.isStudy || intake.operationTarget === "study") {
      setToast("案例学习模式已关闭，当前内容不能保存为康复记录");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    if (snapshotRequiresReconfirmation) {
      setSnapshotReconfirmationOpen(true);
      return;
    }
    if (lifecycle === "completed" && !region) {
      setToast("请先确认本次最想评估的部位");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    const savedAt = new Date().toISOString();
    const sessionIdentity = {
      problemThreadId,
      sessionId,
      sessionStatus: lifecycle,
      sessionStartedAt,
      draftSavedAt: savedAt,
      ...(lifecycle === "completed" ? { completedAt: savedAt, completionReason: "workflow_completed" } : {}),
    } satisfies Partial<SavedDemoSnapshot>;
    const previousRecord = savedRecordsRef.current.find((item) => savedRecordIdentity(item) === localCaseId);
    const snapshot = buildCurrentSnapshot({ ...sessionIdentity, ...snapshotOverrides });
    // 页面仍用数字交互，但落盘时把当前快照投影成带会话/动作/侧别上下文的评分记录；
    // 同一上下文修改分数时保留旧值，并由 mergeScoreRecords 标记 superseded。
    snapshot.scoreRecords = mergeScoreRecords(
      previousRecord?.snapshot?.scoreRecords ?? [],
      buildScoreRecordsFromSnapshot({
        ...snapshot,
        initialFactSessionId: assessmentOwnerSessionId,
        includeInitialFacts: !snapshot.followupMode,
        assessmentResults: snapshot.followupMode
          ? snapshot.assessmentHistory?.find((item) => item.sessionId === assessmentOwnerSessionId
            && item.assessmentRevision === assessmentRevision)?.results ?? {}
          : snapshot.assessmentResults,
      }, savedAt),
    );
    const currentConfirmedScores = snapshot.scoreRecords.filter((score) => score.sessionId === sessionId && score.scoreState === "confirmed");
    snapshot.trialRecords = snapshot.trialRecords.map((record) => {
      const context = record.chiefRetested
        ? "treatment-retest:chief"
        : record.targetId.startsWith("target:motion:")
          ? `treatment-retest:direction:${record.targetId.replace("target:motion:", "")}`
          : undefined;
      const matching = context ? currentConfirmedScores.filter((score) => score.context === context) : [];
      return {
        ...record,
        beforeScoreRecordId: matching.find((score) => score.value === record.beforeScore)?.scoreRecordId,
        afterScoreRecordId: matching.find((score) => score.value === record.afterScore)?.scoreRecordId,
      };
    });
    snapshot.professionalNoteRecords = mergeProfessionalNoteRecords(
      previousRecord?.snapshot?.professionalNoteRecords ?? [],
      snapshot.professionalNoteRecords ?? [],
    );
    const firstSessionSummary: RehabSessionSummary | undefined = lifecycle === "completed" && sessionNumber === 1 ? {
      sessionId,
      problemThreadId,
      status: "completed",
      sessionNumber: 1,
      startedAt: sessionStartedAt,
      completedAt: sessionHistory.find((item) => item.sessionNumber === 1)?.completedAt ?? savedAt,
      lastDraftSavedAt: savedAt,
      completionReason: "workflow_completed",
      location: intake.location,
      startedScore: chiefScoreComparable ? intake.baselineScore : undefined,
      endingScore: chiefScoreComparable ? (latestScoreOverride ?? sessionEndScore) : undefined,
      reviewResults: mergeSessionReviewResults(
        firstAssessmentReviewResults,
        {},
        trialRecords,
        canonicalActionIdFromAssessmentId,
      ),
      treatments: trialRecords.filter((item) => !item.reviewOnly && !item.retestOnly).map((item) => ({ id: item.candidateId, label: item.treatmentName ?? item.candidateTitle, result: item.result, activityWorsened: item.activityWorsened, responseRole: item.responseRole })),
      effectiveCombination: resolvedTreatmentCombination(trialRecords.filter((item) => !item.reviewOnly && !item.retestOnly)).map((item) => item.treatmentName ?? item.candidateTitle),
      continuedEffectiveTreatments: trialRecords.filter((item) => ["better", "partial"].includes(item.result) && !item.activityWorsened && !item.timeBased && !item.reviewOnly && !item.retestOnly).map((item) => item.treatmentName ?? item.candidateTitle),
      stoppedTreatments: trialRecords.filter((item) => (["same", "worse"].includes(item.result) || item.activityWorsened) && !item.reviewOnly && !item.retestOnly).map((item) => item.treatmentName ?? item.candidateTitle),
      resolvedProblems: [],
      training: trainingComplete ? exercises.map((exercise) => ({ id: exercise.id, label: exercise.title, adjustment: "hold" })) : [],
      nextFocus: ["复查主诉和第一次发现的问题", "继续有效处理", trainingPlanSaved ? "确认本次保存的训练方案是否实际执行" : "检查训练完成情况和次日反应"],
    } : undefined;
    const nextSessionHistory = firstSessionSummary
      ? upsertSessionSummary(snapshot.sessionHistory ?? sessionHistory, firstSessionSummary)
      : (snapshot.sessionHistory ?? sessionHistory);
    snapshot.sessionHistory = nextSessionHistory;
    const caseKey = region ? `${region.id}:${intake.side}:${intake.location}:${chiefComplaintLabel(intake)}` : "";
    const nextRecordNumber = Math.max(0, ...savedRecordsRef.current.map((item) => Number(item.id.match(/-(\d+)$/)?.[1] ?? 0))) + 1;
    const snapshotUpdatedAt = new Date().toISOString();
    const record: SavedDemoRecord = {
      id: `case-${sessionNumber}-${nextRecordNumber}`,
      savedAt: `第${sessionNumber}次康复`,
      region: region?.name ?? "未选择部位",
      complaint: chiefComplaintLabel(intake),
      goal: getGoalLabel(intake.goal),
      initialScore: intake.baselineScore,
      latestScore: latestScoreOverride ?? (followupMode
        ? followupFinalScoreConfirmed
          ? followupFinalScore
          : [...followupTrialRecords].reverse().find((item) => item.sessionNumber === sessionNumber)?.afterScore ?? (followupScoreConfirmed ? followupScore : sessionEndScore)
        : sessionEndScore),
      scoreComparable: chiefScoreComparable,
      sessionCount: sessionNumber,
      problemThreadId,
      sessionId,
      sessionStatus: lifecycle,
      localCaseId,
      caseKey,
      sessionHistory: nextSessionHistory,
      problemThreads: snapshot.problemThreads,
      sessionIndex: snapshot.sessionIndex,
      status,
      snapshot,
      pilotSnapshotUpdatedAt: snapshotUpdatedAt,
      pilotCaseId: previousRecord?.pilotCaseId,
      pilotClientCreationId: previousRecord?.pilotClientCreationId ?? createPilotClientCreationId(),
      pilotPublicCode: previousRecord?.pilotPublicCode,
      pilotAccessToken: previousRecord?.pilotAccessToken ?? createPilotAccessToken(),
      pilotRevision: previousRecord?.pilotRevision,
      pilotLastSyncedRevision: previousRecord?.pilotLastSyncedRevision ?? previousRecord?.pilotRevision,
      pilotDirty: true,
      localContentFingerprint: persistedSnapshotFingerprint(snapshot),
      lastSyncedContentFingerprint: previousRecord?.lastSyncedContentFingerprint,
      pilotVersions: previousRecord?.pilotVersions,
      testRunId: testContext?.testRunId,
      scenarioId: testContext?.scenarioId,
    };
    // 同一案例保留一个入口；每次康复追加在 sessionHistory 中。重复保存
    // 同一次只更新当前案例快照，不生成一排难以辨认的重复卡片。
    const fallbackRecords = savedRecords.filter((item) => savedRecordIdentity(item) !== localCaseId && item.id !== record.id);
    const currentRecords = savedRecordsRef.current.length ? savedRecordsRef.current : fallbackRecords;
    const next = [record, ...currentRecords.filter((item) => savedRecordIdentity(item) !== localCaseId && item.id !== record.id)];
    savedRecordsRef.current = next;
    setSavedRecords(next);
    if (testStorageWriteBlocked) setPilotSyncState("error");
    else dispatchPilotSync(localCaseId, { type: "local-changed", caseId: localCaseId });
    setSessionHistory(nextSessionHistory);
    draftPersistenceRef.current?.cancel();
    void clearLocalDraft(storageScope);
    void persistLocalRecords(next)
      .then(() => setToast(status === "等待影像" ? "本次信息已保存，获得影像后可继续" : status === "待医学评估" ? "本次信息已保存，可在完成医学评估后继续" : `第${sessionNumber}次康复记录已保存到本机`))
      .catch(() => {
        setPilotSyncState("error");
        setToast(localSaveFailureCopy(testStorageWriteBlocked));
      });
    enqueuePilotRecordSync(record, { eventType: lifecycle === "draft" ? "session_draft_saved" : "session_completed" });
    window.setTimeout(() => setToast(""), 2400);
  }

  /** 顶部“保存”只保存当前草稿，不把未走完的会话伪装成已完成记录。 */
  function saveDraftRecord() {
    saveRecord("康复中", undefined, {}, "draft");
  }

  /**
   * 新症状不会把旧会话搬到组件内存中的“历史篮子”。
   * 先在同一案例快照里把当前 problemThread 标记为 archived，再清空工作台
   * 的当前会话链；记录页因此仍能按线程找到旧会话，刷新也不会丢失。
   */
  function archiveActiveProblemThread() {
    if (archivedProblemThreadIdsRef.current.has(problemThreadId)) return;
    const currentRecord = savedRecordsRef.current.find((item) => savedRecordIdentity(item) === localCaseId);
    const currentSnapshot = currentRecord?.snapshot;
    if (!currentRecord || !currentSnapshot) return;
    const archivedAt = new Date().toISOString();
    const existingThread = currentSnapshot.problemThreads?.find((item) => item.problemThreadId === problemThreadId)
      ?? createProblemThreadRecord({
        caseId: localCaseId,
        problemThreadId,
        regionId: intake.regionId,
        location: intake.location,
        title: chiefComplaintLabel(intake),
        createdAt: sessionStartedAt,
      });
    const problemThreads = upsertProblemThreadRecord(
      currentSnapshot.problemThreads ?? [],
      archiveProblemThreadRecord(existingThread, archivedAt),
    );
    let sessionIndex: SessionIndexRecord[] = currentSnapshot.sessionIndex ?? [];
    (sessionHistoryRef.current.length ? sessionHistoryRef.current : currentSnapshot.sessionHistory ?? []).forEach((summary) => {
      sessionIndex = upsertSessionIndex(sessionIndex, sessionIndexFromSummary({
        caseId: localCaseId,
        problemThreadId: summary.problemThreadId ?? problemThreadId,
        sessionId: summary.sessionId,
        sessionNumber: summary.sessionNumber,
        status: summary.status,
        startedAt: summary.startedAt,
        lastDraftSavedAt: summary.lastDraftSavedAt,
        completedAt: summary.completedAt,
        completionReason: summary.completionReason,
        location: summary.location,
      }));
    });
    const nextSnapshot: SavedDemoSnapshot = {
      ...currentSnapshot,
      problemThreads,
      sessionIndex,
      sessionHistory: currentSnapshot.sessionHistory ?? sessionHistoryRef.current,
    };
    const nextRecord: SavedDemoRecord = {
      ...currentRecord,
      problemThreads,
      sessionIndex,
      snapshot: nextSnapshot,
      pilotSnapshotUpdatedAt: archivedAt,
      pilotDirty: Boolean(currentRecord.pilotCaseId) || currentRecord.pilotDirty,
      localContentFingerprint: contentFingerprint(nextSnapshot),
    };
    const next = [nextRecord, ...savedRecordsRef.current.filter((item) => savedRecordIdentity(item) !== localCaseId)];
    archivedProblemThreadIdsRef.current.add(problemThreadId);
    savedRecordsRef.current = next;
    setSavedRecords(next);
    void persistLocalRecords(next).catch(() => setPilotSyncState("error"));
    enqueuePilotRecordSync(nextRecord, { eventType: "problem_thread_archived" });
  }

  function reviewRestoredIntake() {
    setSnapshotReconfirmationOpen(false);
    setReviewStep(null);
    setReviewStepEditable(false);
    setTransitionTarget(null);
    setStep(0);
    setShowAllIntakeFields(true);
    setGuidedIntakeField("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reviewRestoredSafety() {
    setSnapshotReconfirmationOpen(false);
    setReviewStep(null);
    setReviewStepEditable(false);
    setTransitionTarget(null);
    setStep(1);
    setSafetyStage(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmRestoredSnapshot() {
    setSnapshotReconfirmed(true);
    setSnapshotReconfirmationOpen(false);
    setStep(snapshotResumeStep);
    setSafetyStage(2);
    setToast("已重新确认当前症状、安全信号和发生时间，可以继续");
    window.setTimeout(() => setToast(""), 2800);
  }

  async function restoreRecord(record: SavedDemoRecord, options: { preferLocalSnapshot?: boolean } = {}) {
    let latestRecord = record;
    let remoteReadNotice = "";
    const snapshotUpdatedAt = record.pilotSnapshotUpdatedAt;
    const identity = savedRecordIdentity(record);
    const nextIdentity = record.localCaseId ?? identity;
    activeCaseIdentityRef.current = nextIdentity;
    setLocalCaseId(nextIdentity);
    const access = pilotAccessFromRecord(record);
    const restoredSyncState = reducePilotSyncState(
      pilotSyncMachinesRef.current[nextIdentity]
        ?? createPilotSyncMachineState(nextIdentity, record.pilotRevision ?? 0, Boolean(access)),
      {
        type: "case-selected",
        caseId: nextIdentity,
        serverRevision: record.pilotRevision ?? 0,
        remoteEnabled: Boolean(access),
      },
    );
    pilotSyncMachinesRef.current[nextIdentity] = restoredSyncState;
    setPilotSyncState(syncDisplayState(restoredSyncState));
    if (access && !options.preferLocalSnapshot) {
      dispatchPilotSync(nextIdentity, { type: "restore-started", caseId: nextIdentity });
      try {
        const remote = await readPilotCase(access);
        void recordPilotCaseOperation("case_recovered", access);
        const remoteSnapshot = normalizeSavedDemoSnapshot(remote.snapshot.payload);
        if (remoteSnapshot) {
          const decision = decidePilotRestoreSource(
            normalizeSavedDemoSnapshot(record.snapshot) ? {
              serverRevision: record.pilotLastSyncedRevision ?? record.pilotRevision ?? 0,
              dirty: record.pilotDirty ?? false,
              localContentFingerprint: record.localContentFingerprint ?? persistedSnapshotFingerprint(normalizeSavedDemoSnapshot(record.snapshot)!),
            } : null,
            {
              revision: remote.snapshot.revision,
              contentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
            },
          );
          if (decision === "use-remote") {
            latestRecord = {
              ...record,
              snapshot: remoteSnapshot,
              pilotSnapshotUpdatedAt: remote.snapshot.updatedAt,
              pilotRevision: remote.snapshot.revision,
              pilotLastSyncedRevision: remote.snapshot.revision,
              pilotDirty: false,
              localContentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
              lastSyncedContentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
            };
            updateStoredPilotRecord(identity, {
              snapshot: remoteSnapshot,
              pilotSnapshotUpdatedAt: remote.snapshot.updatedAt,
              pilotRevision: remote.snapshot.revision,
              pilotLastSyncedRevision: remote.snapshot.revision,
              pilotDirty: false,
              localContentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
              lastSyncedContentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
              pilotConflictSnapshot: undefined,
              pilotConflictRevision: undefined,
              pilotConflictSnapshotUpdatedAt: undefined,
            });
            dispatchPilotSync(nextIdentity, { type: "restore-succeeded", caseId: nextIdentity, revision: remote.snapshot.revision });
          } else if (decision === "use-local") {
            dispatchPilotSync(nextIdentity, { type: "restore-conflict", caseId: nextIdentity });
            remoteReadNotice = "这台设备上的记录更新较晚，已继续保留";
          } else {
            dispatchPilotSync(nextIdentity, { type: "restore-conflict", caseId: nextIdentity });
            void recordPilotCaseOperation("save_conflict", access);
            updateStoredPilotRecord(identity, {
              pilotConflictSnapshot: remoteSnapshot,
              pilotConflictRevision: remote.snapshot.revision,
              pilotConflictSnapshotUpdatedAt: remote.snapshot.updatedAt,
            });
            remoteReadNotice = "这台设备和云端都有修改，请选择要继续查看的记录";
          }
        } else {
          dispatchPilotSync(nextIdentity, { type: "restore-failed", caseId: nextIdentity, code: "invalid-remote-snapshot" });
          remoteReadNotice = "云端记录暂时无法读取，已打开这台设备上的记录";
        }
      } catch {
        dispatchPilotSync(nextIdentity, { type: "restore-failed", caseId: nextIdentity, code: "remote-read-failed" });
        remoteReadNotice = "服务器暂时无法读取，已使用本机副本";
      }
    }
    const snapshot = normalizeSavedDemoSnapshot(latestRecord.snapshot);
    if (!snapshot) {
      setToast("这是一条旧版摘要记录，无法恢复完整流程");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    // 兼容读取不是一次性的内存修补：首次恢复旧快照后，把新增的线程/会话
    // 索引回写本机记录。旧字段仍保留，后续新快照只写 v2 投影。
    const storedRecord = savedRecordsRef.current.find((item) => savedRecordIdentity(item) === nextIdentity && item.id === latestRecord.id);
    if (storedRecord && (!storedRecord.snapshot?.problemThreads || !storedRecord.snapshot?.sessionIndex)) {
      const migratedRecord: SavedDemoRecord = {
        ...storedRecord,
        snapshot,
        problemThreads: snapshot.problemThreads,
        sessionIndex: snapshot.sessionIndex,
        localContentFingerprint: persistedSnapshotFingerprint(snapshot),
      };
      const migratedRecords = savedRecordsRef.current.map((item) => item.id === storedRecord.id ? migratedRecord : item);
      savedRecordsRef.current = migratedRecords;
      setSavedRecords(migratedRecords);
      void persistLocalRecords(migratedRecords).catch(() => setPilotSyncState("error"));
    }
    const restoredIds = legacySessionIdentity(nextIdentity, snapshot.sessionNumber);
    setProblemThreadId(snapshot.problemThreadId ?? latestRecord.problemThreadId ?? restoredIds.problemThreadId);
    setSessionId(snapshot.sessionId ?? latestRecord.sessionId ?? restoredIds.sessionId);
    setSessionStartedAt(snapshot.sessionStartedAt ?? latestRecord.pilotSnapshotUpdatedAt ?? new Date().toISOString());
    setTransitionTarget(null);
    setPendingTrialAdvance(null);
    const restoredIntake = migrateIntakeState(snapshot.intake as Partial<IntakeState>);
    const normalizedRestoredIntake = {
      ...restoredIntake,
      baselineScoreConfirmed: restoredBaselineScoreConfirmed(snapshot.intake as Partial<IntakeState>),
      painQualityConfirmed: snapshot.intake.painQualityConfirmed
        ?? !["疼痛，性质说不清", "说不清的不适"].includes(snapshot.intake.symptomType),
    };
    const restoredTimeSensitive = isTimeSensitiveOnset(normalizedRestoredIntake.onset);
    const restoredFreshness = classifySnapshotFreshness({
      savedAt: latestRecord.pilotSnapshotUpdatedAt ?? snapshotUpdatedAt,
      now: new Date().toISOString(),
      timeSensitive: restoredTimeSensitive,
    });
    setSnapshotFreshness(restoredFreshness.showReminder ? restoredFreshness : null);
    setSnapshotReconfirmed(false);
    setSnapshotReconfirmationOpen(false);
    setSnapshotResumeStep(snapshot.step);
    setStep(restoredFreshness.requiresReconfirmation ? 0 : snapshot.step);
    const restoredBodyLocation = makeLowerLimbLocationSelection(normalizedRestoredIntake.side, normalizedRestoredIntake.location, normalizedRestoredIntake.regionId);
    const savedBodyLocations = snapshot.intake.bodyLocations?.filter((item) => isPilotRegion(item.regionId)) ?? [];
    const savedPrimaryLocation = savedBodyLocations[0];
    setIntake({
      ...normalizedRestoredIntake,
      regionId: savedPrimaryLocation?.regionId ?? normalizedRestoredIntake.regionId,
      side: savedBodyLocations.length ? sideFromLocationSelections(savedBodyLocations) : normalizedRestoredIntake.side,
      location: savedBodyLocations.length ? savedBodyLocations.map((item) => item.location).join("、") : normalizedRestoredIntake.location,
      bodyLocations: savedBodyLocations.length ? savedBodyLocations : restoredBodyLocation ? [restoredBodyLocation] : [],
      locationConfirmed: snapshot.intake.locationConfirmed ?? Boolean(savedPrimaryLocation || restoredBodyLocation),
      swellingLocationConfirmed: snapshot.intake.swellingLocationConfirmed ?? Boolean(snapshot.intake.swellingLocation),
      tendernessLocationConfirmed: snapshot.intake.tendernessLocationConfirmed ?? Boolean(snapshot.intake.tendernessLocation),
      sensoryLocationConfirmed: snapshot.intake.sensoryLocationConfirmed ?? Boolean(snapshot.intake.sensoryLocation),
      actionAnalysis: normalizedRestoredIntake.actionAnalysis ?? analyzeChiefAction(normalizedRestoredIntake.description, savedPrimaryLocation?.regionId ?? normalizedRestoredIntake.regionId, normalizedRestoredIntake.forceDirection, normalizedRestoredIntake.reproduction),
    });
    setConfirmedIntakeMulti(snapshot.confirmedIntakeMulti ?? { symptoms: true, provocationTypes: true });
    setGuidedIntakeField("");
    setGuidedIntakePath([]);
    setGuidedIntakeCursor(0);
    guidedAdvanceRef.current = null;
    setShowAllIntakeFields(false);
    setSafety(snapshot.safety);
    setSafetyStage(restoredFreshness.requiresReconfirmation ? 0 : 2);
    setBoneRisk(snapshot.boneRisk ?? {});
    setImaging(snapshot.imaging);
    setAssessmentIndex(snapshot.assessmentIndex);
    assessmentResultsRef.current = snapshot.assessmentResults;
    setAssessmentResults(snapshot.assessmentResults);
    setAssessmentHistory(snapshot.assessmentHistory ?? []);
    setAssessmentOwnerSessionId(snapshot.assessmentOwnerSessionId ?? snapshot.sessionId ?? sessionId);
    assessmentFocusIdRef.current = "";
    setTrialTargetIndex(snapshot.trialTargetIndex);
    setCandidateIndex(snapshot.candidateIndex);
    setSelectedOptionalCandidateIds(snapshot.selectedOptionalCandidateIds ?? []);
    setBilateralNeedsReferral(snapshot.bilateralNeedsReferral ?? false);
    setMidpointDecisionDone(snapshot.midpointDecisionDone ?? false);
    setBilateralTreatmentSides(snapshot.bilateralTreatmentSides ?? {});
    setBilateralRetestResponses(snapshot.bilateralRetestResponses ?? {});
    setTrialRecords(snapshot.trialRecords);
    setSupersededTrialRecords(snapshot.supersededTrialRecords ?? []);
    setPersistedRetestObligations(snapshot.retestObligations ?? []);
    setPersistedRetestRecords(snapshot.retestRecords ?? []);
    // SAVE-02：恢复到评估阶段时，待派生队列就绪后推导落点（完成→直接进处理；部分→首个未答项）
    if (snapshot.step === 2) setRestoredAssessmentCheck({ token: Date.now() });
    setPostScore(snapshot.postScore ?? 0);
    setPostScoreConfirmed(snapshot.postScoreConfirmed ?? false);
    setPostDiscomfort(snapshot.postDiscomfort ?? "");
    setMovementResponse((["both-match", "passive-match-active-limited", "better-passive-limited", "passive-limited", "worse"] as string[]).includes(snapshot.movementResponse) ? snapshot.movementResponse as RangeRetestAnswer : "");
    setMovementResponses(snapshot.movementResponses ?? {});
    setMovementDiscomforts(snapshot.movementDiscomforts ?? {});
    setMovementScores(snapshot.movementScores ?? {});
    setMovementScoreConfirmed(snapshot.movementScoreConfirmed ?? {});
    setReadyToRetest(snapshot.readyToRetest ?? false);
    setRetestPlan(snapshot.retestPlan ?? null);
    setExerciseFeedback(snapshot.exerciseFeedback);
    setTrainingFeedbackRecords(snapshot.trainingFeedbackRecords ?? []);
    setFollowupExerciseChoiceRecordedAt(snapshot.followupExerciseChoiceRecordedAt ?? {});
    setTrainingComplete(snapshot.trainingComplete);
    setTrainingPlanSaved(snapshot.trainingPlanSaved ?? false);
    setTreatmentFinalRetestScore(snapshot.treatmentFinalRetestScore ?? 0);
    setTreatmentFinalRetestRecordedAt(snapshot.treatmentFinalRetestRecordedAt);
    // 恢复已确认事实不能触发“用户刚刚确认”的时间副作用。
    setTreatmentFinalRetestConfirmedState(snapshot.treatmentFinalRetestConfirmed ?? false);
    setTrainingReadyForFinalRetest(snapshot.trainingReadyForFinalRetest ?? false);
    setFinalRetestScore(snapshot.finalRetestScore ?? 0);
    setFinalRetestRecordedAt(snapshot.finalRetestRecordedAt);
    setFinalRetestConfirmedState(snapshot.finalRetestConfirmed ?? false);
    setFollowupMode(snapshot.followupMode);
    setSessionNumber(snapshot.sessionNumber);
    setRetestContractVersion(snapshot.retestContractVersion ?? (snapshot.step >= 5 ? 0 : 1));
    setFollowupScore(snapshot.followupScoreConfirmed ? snapshot.followupScore : 0);
    setFollowupScoreConfirmed(snapshot.followupScoreConfirmed ?? false);
    setFollowupScoreHistory(snapshot.followupScoreHistory);
    setFollowupStage(snapshot.followupStage);
    setFollowupPostScore(snapshot.followupPostScore ?? 0);
    setFollowupPostScoreConfirmed(snapshot.followupPostScoreConfirmed ?? false);
    setFollowupPostDiscomfort(snapshot.followupPostDiscomfort ?? "");
    setFollowupCandidateId(snapshot.followupCandidateId);
    setFollowupTrialRecords(snapshot.followupTrialRecords);
    setSupersededFollowupTrialRecords(snapshot.supersededFollowupTrialRecords ?? []);
    setHistoricalTreatments(snapshot.historicalTreatments ?? []);
    setFollowupReadyToRetest(snapshot.followupReadyToRetest ?? false);
    setFollowupRetestPlan(snapshot.followupRetestPlan ?? null);
    setFollowupMovementResponses(snapshot.followupMovementResponses ?? {});
    setFollowupTensionLocations(snapshot.followupTensionLocations ?? []);
    setFollowupMovementDiscomforts(snapshot.followupMovementDiscomforts ?? {});
    setFollowupMovementScores(snapshot.followupMovementScores ?? {});
    setFollowupMovementScoreConfirmed(snapshot.followupMovementScoreConfirmed ?? {});
    setFollowupExerciseChoicesRaw(snapshot.followupExerciseChoices);
    setFollowupTrainingReadyForRetest(snapshot.followupTrainingReadyForRetest ?? false);
    setFollowupFinalScore(snapshot.followupFinalScore ?? 0);
    setFollowupFinalRetestRecordedAt(snapshot.followupFinalRetestRecordedAt);
    setFollowupFinalScoreConfirmedState(snapshot.followupFinalScoreConfirmed ?? false);
    setHasNewSymptom(snapshot.hasNewSymptom === true || snapshot.hasNewSymptom === "yes" ? "yes" : snapshot.hasNewSymptom === false || snapshot.hasNewSymptom === "no" ? "no" : "");
    setFollowupTrends(snapshot.followupTrends);
    setSessionHistory(snapshot.sessionHistory ?? record.sessionHistory ?? []);
    setAssessmentRevision(snapshot.assessmentRevision ?? 0);
    setTreatmentPlanRevision(snapshot.treatmentPlanRevision ?? snapshot.assessmentRevision ?? 0);
    setAdverseResponse(snapshot.adverseResponse ?? null);
    setAdverseConfirmedAssessmentIds(snapshot.adverseConfirmedAssessmentIds ?? []);
    setOpenExercise("");
    setRecordsOpen(false);
    setToast(remoteReadNotice || (latestRecord.status === "等待影像" ? "已回到原案例，可补充影像结果" : `已恢复第${latestRecord.sessionCount}次康复记录`));
    window.setTimeout(() => setToast(""), 2400);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDemo() {
    const nextSessionId = createSessionId();
    draftPersistenceRef.current?.cancel();
    void clearLocalDraft(storageScope);
    setStep(0);
    setSnapshotFreshness(null);
    setSnapshotReconfirmed(false);
    setSnapshotReconfirmationOpen(false);
    setSnapshotResumeStep(0);
    setReviewStep(null);
    setTransitionTarget(null);
    const nextIdentity = createLocalCaseId();
    activeCaseIdentityRef.current = nextIdentity;
    setLocalCaseId(nextIdentity);
    setProblemThreadId(createProblemThreadId());
    setSessionId(nextSessionId);
    setAssessmentOwnerSessionId(nextSessionId);
    setAssessmentHistory([]);
    setSessionStartedAt(new Date().toISOString());
    const nextSyncState = createPilotSyncMachineState(nextIdentity, 0, false);
    pilotSyncMachinesRef.current[nextIdentity] = nextSyncState;
    setPilotSyncState("idle");
    setIntake(DEFAULT_INTAKE);
    setShowAllIntakeFields(false);
    setGuidedIntakeField("");
    setGuidedIntakePath([]);
    setGuidedIntakeCursor(0);
    guidedAdvanceRef.current = null;
    setConfirmedIntakeMulti({ symptoms: false, provocationTypes: false });
    setSafety({});
    setSafetyStage(0);
    setBoneRisk({});
    setImaging([]);
    setAssessmentIndex(0);
    assessmentResultsRef.current = {};
    setAssessmentResults({});
    assessmentFocusIdRef.current = "";
    setAssessmentSummaryOpen(false);
    setSharedTensionOpen(false);
    setThinkingWorkbenchOpen(false);
    setTrialTargetIndex(0);
    setPendingTrialAdvance(null);
    setCandidateIndex(0);
    setSelectedOptionalCandidateIds([]);
    setBilateralNeedsReferral(false);
    setMidpointDecisionDone(false);
    setBilateralTreatmentSides({});
    setBilateralRetestResponses({});
    setTrialRecords([]);
    setSupersededTrialRecords([]);
    setSupersededFollowupTrialRecords([]);
    setPersistedRetestObligations([]);
    setPersistedRetestRecords([]);
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setReadyToRetest(false);
    setRetestPlan(null);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setExerciseFeedback({});
    setTrainingFeedbackRecords([]);
    setFollowupExerciseChoiceRecordedAt({});
    setTrainingComplete(false);
    setTrainingPlanSaved(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setFollowupMode(false);
    setSessionNumber(1);
    setRetestContractVersion(1);
    setProblemThreadId(createProblemThreadId());
    setSessionId(createSessionId());
    setSessionStartedAt(new Date().toISOString());
    setFollowupScore(0);
    setFollowupScoreConfirmed(false);
    setFollowupScoreHistory([]);
    setFollowupStage("review");
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupCandidateId("");
    setFollowupTrialRecords([]);
    setFollowupReadyToRetest(false);
    setFollowupRetestPlan(null);
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupTensionLocations([]);
    setFollowupExerciseChoicesRaw({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setHasNewSymptom("");
    setContinuationRoundIds([]);
    setFollowupTrends({});
    sessionHistoryRef.current = [];
    setSessionHistory([]);
    setAssessmentRevision(0);
    setTreatmentPlanRevision(0);
    setAdverseResponse(null);
    setAdverseConfirmedAssessmentIds([]);
    return nextIdentity;
  }

  function createNewCaseFromRecords() {
    setRecordsOpen(false);
    firstUseIntentRef.current = "new";
    if (!pilotSourceRef.current) {
      setPilotSourceGateOpen(true);
      return;
    }
    if (!pilotConsentRef.current) {
      setPilotConsentDeclined(isPilotConsentDeclined(window.localStorage));
      setPilotConsentGateOpen(true);
      return;
    }
    const nextIdentity = resetDemo();
    pendingNewCaseCreationRef.current = nextIdentity;
    setToast("正在创建匿名案例");
  }

  useEffect(() => {
    if (pendingNewCaseCreationRef.current !== localCaseId) return;
    pendingNewCaseCreationRef.current = null;
    const consent = pilotConsentRef.current;
    if (!consent) return;
    void createInitialPilotCaseRecord(consent)
      .then(() => {
        setToast("匿名案例已创建，可以开始描述问题");
        window.setTimeout(() => setToast(""), 2400);
      })
      .catch(() => {
        setPilotSyncState("error");
        setToast("案例创建失败，请检查网络后重试");
      });
    // The reset render supplies the fresh snapshot consumed by case creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCaseId]);

  function applyIntakeChange(
    nextOrUpdater: IntakeState | ((current: IntakeState) => IntakeState),
    options: { preservePriorProblem?: boolean } = {},
  ) {
    const next = typeof nextOrUpdater === "function" ? nextOrUpdater(intakeRef.current) : nextOrUpdater;
    const hasDownstreamFacts = Object.keys(assessmentResultsRef.current).length > 0
      || trialRecords.length > 0
      || followupTrialRecords.some((record) => record.sessionNumber === sessionNumber);
    const nextRevision = hasDownstreamFacts ? nextAssessmentRevision(assessmentRevision) : assessmentRevision;
    if (hasDownstreamFacts) {
      const priorAssessmentSetId = `assessment-set:${assessmentOwnerSessionId}:r${assessmentRevision}`;
      const changedAt = new Date().toISOString();
      setAssessmentHistory((history) => {
        const existing = history.find((item) => item.assessmentSetId === priorAssessmentSetId);
        return [
          ...history.filter((item) => item.assessmentSetId !== priorAssessmentSetId),
          {
            assessmentSetId: priorAssessmentSetId,
            caseId: localCaseId,
            problemThreadId,
            sessionId: assessmentOwnerSessionId,
            assessmentRevision,
            recordedAt: existing?.recordedAt ?? changedAt,
            results: assessmentResultsRef.current,
          },
        ];
      });
      if (!options.preservePriorProblem) {
        supersedeCurrentTreatmentFacts(nextRevision, "assessment-updated");
        supersedeCurrentRetestFacts(nextRevision, "assessment-updated");
      }
    }
    intakeRef.current = next;
    setIntake(next);
    setReviewStep(null);
    setTransitionTarget(null);
    setSafety({});
    setSafetyStage(0);
    setBoneRisk({});
    setImaging(inferImagingFromDescription(next.description));
    assessmentResultsRef.current = {};
    setAssessmentResults({});
    setAssessmentIndex(0);
    assessmentFocusIdRef.current = "";
    setAssessmentSummaryOpen(false);
    if (followupMode) setFollowupTrialRecords((current) => keepOtherSessionRecords(current, sessionNumber));
    else setTrialRecords([]);
    setTrialTargetIndex(0);
    setPendingTrialAdvance(null);
    setCandidateIndex(0);
    setSelectedOptionalCandidateIds([]);
    setBilateralNeedsReferral(false);
    setMidpointDecisionDone(false);
    setBilateralTreatmentSides({});
    setBilateralRetestResponses({});
    setReadyToRetest(false);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setFunctionRetestCompletion("");
    setFunctionRetestUnableReason("");
    setTreatmentFunctionRetests({});
    setFinalFunctionRetests({});
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setExerciseFeedback({});
    setTrainingComplete(false);
    setTrainingPlanSaved(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setFollowupStage("review");
    setFollowupScore(0);
    setFollowupScoreConfirmed(false);
    setFollowupCandidateId("");
    if (!followupMode) setFollowupTrialRecords((current) => keepOtherSessionRecords(current, sessionNumber));
    setFollowupReadyToRetest(false);
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupExerciseChoicesRaw({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setFollowupTensionLocations([]);
    setHasNewSymptom("");
    setFollowupTrends({});
    setAssessmentRevision(nextRevision);
    setTreatmentPlanRevision(nextRevision);
    setAdverseResponse(null);
    setAdverseConfirmedAssessmentIds([]);
  }

  /** 只有用户明确确认“出现新问题”时，才归档旧问题并建立新的身份链。 */
  function startNewProblemThread(nextOrUpdater: IntakeState | ((current: IntakeState) => IntakeState)) {
    archiveActiveProblemThread();
    const nextIntake = typeof nextOrUpdater === "function" ? nextOrUpdater(intakeRef.current) : nextOrUpdater;
    const archivedTreatments: PersistedDemoSnapshotV3["domain"]["treatments"] = [
      ...supersededTrialRecords,
      ...trialRecords,
    ].map((record) => ({
      caseId: localCaseId,
      problemThreadId,
      sessionId: record.sessionId ?? sessionId,
      sessionNumber: 1,
      record: { ...record, caseId: localCaseId, problemThreadId, sessionId: record.sessionId ?? sessionId },
    }));
    archivedTreatments.push(...[
      ...supersededFollowupTrialRecords,
      ...followupTrialRecords,
    ].map((record) => ({
      caseId: localCaseId,
      problemThreadId,
      sessionId: record.sessionId ?? sessionId,
      sessionNumber: record.sessionNumber,
      record: { ...record, caseId: localCaseId, problemThreadId, sessionId: record.sessionId ?? sessionId },
    })));
    setHistoricalTreatments((current) => [...new Map([...current, ...archivedTreatments]
      .map((item) => [item.record.treatmentRecordId, item])).values()]);
    const initialTrainingSessionId = sessionHistory.find((item) => item.sessionNumber === 1)?.sessionId ?? sessionId;
    const archivedTrainingFacts: PersistedDemoSnapshotV3["domain"]["training"]["records"] = [
      ...Object.entries(exerciseFeedback).map(([exerciseId, feedback]) => ({
        trainingFeedbackRecordId: `training:${initialTrainingSessionId}:initial:${exerciseId}:${feedback.recordedAt ?? sessionStartedAt}`,
        caseId: localCaseId,
        problemThreadId,
        sessionId: initialTrainingSessionId,
        exerciseId,
        source: "initial" as const,
        recordedAt: feedback.recordedAt ?? sessionStartedAt,
        feedback,
      })),
      ...Object.entries(followupExerciseChoices).map(([exerciseId, feedback]) => {
        const recordedAt = followupExerciseChoiceRecordedAt[exerciseId] ?? sessionStartedAt;
        return {
          trainingFeedbackRecordId: `training:${sessionId}:followup:${exerciseId}:${recordedAt}`,
          caseId: localCaseId,
          problemThreadId,
          sessionId,
          exerciseId,
          source: "followup" as const,
          recordedAt,
          feedback,
        };
      }),
    ];
    setTrainingFeedbackRecords((current) => [...new Map([...current, ...archivedTrainingFacts]
      .map((item) => [item.trainingFeedbackRecordId, item])).values()]);
    // 先按旧身份封存旧问题事实，再一次性建立新身份；不能让 React 批量更新
    // 把旧评估误标为新线程，也不能把普通问诊编辑当成新问题命令。
    applyIntakeChange(nextIntake, { preservePriorProblem: true });
    const nextSessionId = createSessionId();
    const nextProblemThreadId = createProblemThreadId();
    const nextStartedAt = new Date().toISOString();
    setProblemThreadId(nextProblemThreadId);
    setSessionId(nextSessionId);
    setAssessmentOwnerSessionId(nextSessionId);
    setAssessmentHistory((current) => [...current, {
      assessmentSetId: `assessment-set:${nextSessionId}:r0`,
      caseId: localCaseId,
      problemThreadId: nextProblemThreadId,
      sessionId: nextSessionId,
      assessmentRevision: 0,
      recordedAt: nextStartedAt,
      results: {},
    }]);
    setSessionStartedAt(nextStartedAt);
    setSessionNumber(1);
    setRetestContractVersion(1);
    setContinuationRoundIds([]);
    sessionHistoryRef.current = [];
    setSessionHistory([]);
    setAssessmentRevision(0);
    setTreatmentPlanRevision(0);
    setTrialRecords([]);
    setSupersededTrialRecords([]);
    setSupersededFollowupTrialRecords([]);
    setFollowupMode(false);
    setFollowupScoreHistory([]);
    setFollowupTrialRecords([]);
    setFollowupExerciseChoiceRecordedAt({});
  }

  function followupRetestIds(candidate: FullCandidate) {
    if (candidate.retestIds?.length) return candidate.retestIds;
    if (!region || !["muscle", "joint", "control"].includes(candidate.type)) return [];
    const limitedDirectionIds = new Set(findings.filter((finding) => finding.id.startsWith("motion:")).map(motionIdFromFinding));
    return region.directions
      .filter((direction) => limitedDirectionIds.has(direction.id) && direction.tags.some((tag) => candidate.tags.includes(tag)))
      .map((direction) => direction.id);
  }

  function followupCandidateNeedsWork(candidate: FullCandidate, outcomes: Record<string, CompletedRangeRetestAnswer>) {
    const directionIds = followupRetestIds(candidate);
    if (!directionIds.length) return true;
    return directionIds.some((directionId) => directionNeedsCandidate(candidate, directionId, outcomes));
  }

  function recordFollowupTrial(result: TrialResult, timeBased = false, rangeOutcomes: Record<string, CompletedRangeRetestAnswer> = {}, rangeDiscomforts: Record<string, YesNo> = {}, rangeScores: Record<string, number> = {}) {
    const candidate = followupCandidates.find((item) => item.id === followupCandidateId) ?? followupCandidates[0];
    if (!candidate) return;
    const currentRecords = followupTrialRecords.filter((item) => item.sessionNumber === sessionNumber);
    const previousOutcomes = Object.assign({}, ...currentRecords.map((record) => record.rangeOutcomes ?? {})) as Record<string, CompletedRangeRetestAnswer>;
    const beforeScore = currentRecords.length ? currentRecords[currentRecords.length - 1].afterScore : followupScore;
    // 没有再次复测主诉时沿用最近分数，不能把尚未选择的滑条默认值 0 当成改善。
    const afterScore = timeBased || !followupPostScoreConfirmed ? beforeScore : followupPostScore;
    const activityWorsened = Object.values(rangeOutcomes).some((outcome) => outcome === "worse");
    const mixedImprovementAndActivityWorsening = activityWorsened && afterScore < beforeScore;
    const effectiveResult: TrialResult = mixedImprovementAndActivityWorsening ? "partial" : result;
    const priorImprovingTreatmentCount = currentRecords.filter((record) => !record.reviewOnly && !record.retestOnly && record.chiefRetested && record.afterScore < record.beforeScore).length;
    const responseRole = activityWorsened
      ? "worsened"
      : classifyTreatmentResponse({
        beforeScore,
        afterScore,
        result: effectiveResult,
        chiefRetested: followupPostScoreConfirmed,
        rangeImproved: Object.values(rangeOutcomes).some((outcome) => ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(outcome)),
        priorImprovingTreatmentCount,
        timeBased,
      });
    setFollowupTrialRecords((current) => [...current, {
      treatmentRecordId: `treatment:${sessionId}:${crypto.randomUUID()}`,
      sessionId,
      assessmentRevision,
      recordedAt: new Date().toISOString(),
      sessionNumber,
      targetId: "target:chief",
      candidateId: candidate.id,
      treatmentKey: candidateTreatmentKey(candidate, intake.side),
      candidateTitle: candidateTreatmentName(candidate),
      treatmentName: candidateTreatmentName(candidate),
      action: candidateAction(candidate, Object.keys(rangeOutcomes)),
      beforeScore,
      afterScore,
      result: effectiveResult,
      activityWorsened,
      timeBased,
      chiefRetested: followupPostScoreConfirmed,
      rangeOutcomes: Object.keys(rangeOutcomes).length ? rangeOutcomes : undefined,
      rangeDiscomforts: Object.keys(rangeDiscomforts).length ? rangeDiscomforts : undefined,
      rangeScores: Object.keys(rangeScores).length ? rangeScores : undefined,
      responseRole,
    }]);
    const completedKeys = new Set(currentRecords.map((item) => item.treatmentKey ?? item.candidateId));
    completedKeys.add(candidateTreatmentKey(candidate, intake.side));
    const mergedOutcomes = { ...previousOutcomes, ...rangeOutcomes };
    const nextCandidate = effectiveResult === "worse" || activityWorsened ? undefined : followupCandidates.find((item) => !completedKeys.has(candidateTreatmentKey(item, intake.side)) && followupCandidateNeedsWork(item, mergedOutcomes));
    setFollowupCandidateId(nextCandidate?.id ?? "");
    setFollowupReadyToRetest(false);
    setFollowupRetestPlan(null);
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
  }

  function invalidateCurrentFollowupWork() {
    const groups = resolveDownstreamInvalidation("followup-review-answer");
    if (!groups.includes("followup-current-session")) return;
    const hasFacts = followupTrialRecords.some((record) => record.sessionNumber === sessionNumber)
      || persistedRetestObligations.some((item) => item.sessionId === sessionId);
    if (hasFacts) {
      const nextRevision = nextAssessmentRevision(assessmentRevision);
      supersedeCurrentTreatmentFacts(nextRevision, "assessment-updated");
      supersedeCurrentRetestFacts(nextRevision, "assessment-updated");
      setAssessmentRevision(nextRevision);
      setTreatmentPlanRevision(nextRevision);
    }
    setFollowupTrialRecords((current) => keepOtherSessionRecords(current, sessionNumber));
    setFollowupCandidateId("");
    setFollowupReadyToRetest(false);
    setFollowupRetestPlan(null);
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupExerciseChoicesRaw({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
  }

  function updateFollowupScore(value: number) {
    if (shouldInvalidateFollowupWork({ confirmed: followupScoreConfirmed, current: followupScore, next: value })) invalidateCurrentFollowupWork();
    setFollowupScore(value);
    setFollowupScoreConfirmed(true);
  }

  function updateFollowupTrend(id: string, value: FollowupReviewAnswer) {
    const correcting = shouldInvalidateFollowupWork({ confirmed: true, current: followupTrends[id], next: value });
    if (correcting) invalidateCurrentFollowupWork();
    const targetRevision = correcting ? nextAssessmentRevision(assessmentRevision) : assessmentRevision;
    const assessmentSetId = `assessment-set:${sessionId}:r${targetRevision}`;
    const recordedAt = new Date().toISOString();
    setAssessmentHistory((current) => {
      const prior = current.find((item) => item.assessmentSetId === assessmentSetId);
      const previousRevision = current
        .filter((item) => item.sessionId === sessionId && item.assessmentRevision < targetRevision)
        .sort((left, right) => right.assessmentRevision - left.assessmentRevision)[0];
      const next: AssessmentSessionRecord = {
        assessmentSetId,
        caseId: localCaseId,
        problemThreadId,
        sessionId,
        assessmentRevision: targetRevision,
        recordedAt: prior?.recordedAt ?? recordedAt,
        results: prior?.results ?? {},
        reviewResults: { ...(prior?.reviewResults ?? followupTrends), [id]: value },
        ...(previousRevision ? { supersedesAssessmentSetId: previousRevision.assessmentSetId } : {}),
      };
      return [...current.filter((item) => item.assessmentSetId !== assessmentSetId), next];
    });
    setFollowupTrends((current) => ({ ...current, [id]: value }));
  }

  function finishFollowupTreatmentRetest() {
    if (!followupPostScoreConfirmed) return;
    const currentRecords = followupTrialRecords.filter((item) => item.sessionNumber === sessionNumber);
    const beforeScore = currentRecords.at(-1)?.afterScore ?? followupScore;
    setFollowupTrialRecords((current) => [...current, {
      treatmentRecordId: `treatment:${sessionId}:${crypto.randomUUID()}`,
      sessionId,
      assessmentRevision,
      recordedAt: new Date().toISOString(),
      sessionNumber,
      targetId: "target:chief",
      candidateId: "followup-treatment-final-retest",
      candidateTitle: "处理阶段主诉复测",
      treatmentName: "处理阶段主诉复测",
      beforeScore,
      afterScore: followupPostScore,
      result: resultFromScore(beforeScore, followupPostScore),
      chiefRetested: true,
      reviewOnly: true,
    }]);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupStage("training");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeFollowupSession() {
    const currentSessionRecords = followupTrialRecords.filter((record) => record.sessionNumber === sessionNumber);
    const finalScore = followupFinalScoreConfirmed ? followupFinalScore : currentSessionRecords.at(-1)?.afterScore ?? followupScore;
    const nextHistory = [...(followupScoreHistory.length ? followupScoreHistory : [intake.baselineScore, sessionEndScore]), finalScore];
    const reviewLabel = (id: string) => {
      const directAssessment = assessments.find((item) => item.id === id);
      if (directAssessment) return directAssessment.title;
      const rawId = id.replace(/^(motion|strength|function):/, "");
      if (id.startsWith("strength:")) {
        return region?.strengths.find((item) => item.id === rawId)?.title ?? rawId;
      }
      if (id.startsWith("function:")) {
        return region?.functions.find((item) => item.id === rawId)?.title ?? rawId;
      }
      return rawId;
    };
    const explicitReviewLabels = Object.entries(followupTrends)
      .map(([id, result]) => ({
      id,
      label: reviewLabel(id),
      result,
      }));
    const realTreatments = currentSessionRecords.filter((record) => !record.reviewOnly && !record.retestOnly);
    const reviewLabels = mergeSessionReviewResults(previousSessionForReview?.reviewResults ?? [], Object.fromEntries(explicitReviewLabels.map((item) => [item.id, item.result])), currentSessionRecords, canonicalActionIdFromAssessmentId)
      .map((item) => ({ ...item, label: reviewLabel(item.id) || item.label }));
    const effectiveLabels = realTreatments.filter((record) => ["better", "partial"].includes(record.result) && !record.activityWorsened).map((record) => record.treatmentName ?? record.candidateTitle);
    const stoppedLabels = realTreatments.filter((record) => ["same", "worse"].includes(record.result) || record.activityWorsened).map((record) => record.treatmentName ?? record.candidateTitle);
    const trainingItems = exercises.map((exercise) => ({
      id: exercise.id,
      label: exercise.title,
      adjustment: ((choice) => choice === "worse" ? "reduce" : choice ?? "hold")(followupExerciseChoices[exercise.id]) as "reduce" | "hold" | "progress",
    }));
    const sessionSummary: RehabSessionSummary = {
      sessionId,
      problemThreadId,
      status: "completed",
      sessionNumber,
      startedAt: sessionStartedAt,
      completedAt: sessionHistory.find((item) => item.sessionNumber === sessionNumber)?.completedAt ?? new Date().toISOString(),
      lastDraftSavedAt: new Date().toISOString(),
      completionReason: "workflow_completed",
      location: intake.location,
      startedScore: followupScoreConfirmed ? followupScore : undefined,
      endingScore: chiefScoreComparable ? finalScore : undefined,
      reviewResults: reviewLabels,
      treatments: realTreatments.map((record) => ({ id: record.candidateId, label: record.treatmentName ?? record.candidateTitle, result: record.result, activityWorsened: record.activityWorsened, responseRole: record.responseRole })),
      effectiveCombination: resolvedTreatmentCombination(realTreatments).map((record) => record.treatmentName ?? record.candidateTitle),
      continuedEffectiveTreatments: [...new Set(effectiveLabels)],
      stoppedTreatments: [...new Set(stoppedLabels)],
      resolvedProblems: reviewLabels.filter((item) => item.result === "better").map((item) => item.label),
      training: trainingItems,
      nextFocus: buildNextFocus({
        unresolvedReviewLabels: reviewLabels.filter((item) => item.result !== "better").map((item) => item.label),
        effectiveTreatmentLabels: effectiveLabels,
        stoppedTreatmentLabels: stoppedLabels,
        trainingLabels: trainingItems.map((item) => item.label),
      }),
    };
    const nextSessionHistory = upsertSessionSummary(sessionHistory, sessionSummary);
    saveRecord("待复查", finalScore, {
      followupMode: true,
      sessionNumber,
      followupScore: finalScore,
      followupScoreConfirmed: false,
      followupScoreHistory: nextHistory,
      followupStage: "summary",
      followupPostScore: finalScore,
      followupCandidateId: "",
      followupReadyToRetest: false,
      followupMovementResponses: {},
      followupTensionLocations: [],
      followupExerciseChoices: {},
      followupTrainingReadyForRetest: false,
      followupFinalScore: 0,
      followupFinalScoreConfirmed: false,
      hasNewSymptom: "",
      followupTrends: {},
      sessionHistory: nextSessionHistory,
    });
    setSessionHistory(nextSessionHistory);
    setFollowupScoreHistory(nextHistory);
    setFollowupScore(finalScore);
    setFollowupScoreConfirmed(false);
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupReadyToRetest(false);
    setFollowupRetestPlan(null);
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupTensionLocations([]);
    setFollowupStage("summary");
    setFollowupCandidateId("");
    setFollowupTrends({});
    setFollowupExerciseChoicesRaw({});
    setFollowupExerciseChoiceRecordedAt({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setHasNewSymptom("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginAssessmentSession(nextSessionId: string, ownerProblemThreadId = problemThreadId) {
    const startedAt = new Date().toISOString();
    const previousSetId = `assessment-set:${assessmentOwnerSessionId}:r${assessmentRevision}`;
    const nextSetId = `assessment-set:${nextSessionId}:r0`;
    setAssessmentHistory((current) => {
      const existingPrevious = current.find((item) => item.assessmentSetId === previousSetId);
      const previous: AssessmentSessionRecord = {
        assessmentSetId: previousSetId,
        caseId: localCaseId,
        problemThreadId,
        sessionId: assessmentOwnerSessionId,
        assessmentRevision,
        recordedAt: existingPrevious?.recordedAt ?? sessionStartedAt,
        results: assessmentResultsRef.current,
        reviewResults: existingPrevious?.reviewResults,
      };
      const next: AssessmentSessionRecord = {
        assessmentSetId: nextSetId,
        caseId: localCaseId,
        problemThreadId: ownerProblemThreadId,
        sessionId: nextSessionId,
        assessmentRevision: 0,
        recordedAt: startedAt,
        results: {},
        reviewResults: {},
      };
      return [...current.filter((item) => ![previousSetId, nextSetId].includes(item.assessmentSetId)), previous, next];
    });
    setAssessmentOwnerSessionId(nextSessionId);
    setAssessmentRevision(0);
    setTreatmentPlanRevision(0);
    return startedAt;
  }

  function startNextFollowupSession() {
    const nextSessionNumber = sessionNumber + 1;
    const navigation = workflowController.navigate({
      currentStep: step,
      maxUnlocked,
      event: {
        type: "followup-started",
        sessionNumber: nextSessionNumber,
        priorSessionExists: sessionHistory.some((item) => item.sessionNumber === sessionNumber),
      },
    });
    let accepted = false;
    workflowController.execute(navigation.commands, {
      startFollowup: (acceptedSessionNumber) => { accepted = acceptedSessionNumber === nextSessionNumber; },
    });
    if (!accepted) return;
    const nextSessionId = createSessionId();
    const nextStartedAt = beginAssessmentSession(nextSessionId);
    setSessionNumber((current) => current + 1);
    setRetestContractVersion(1);
    setSessionId(nextSessionId);
    setSessionStartedAt(nextStartedAt);
    setFollowupStage("review");
    setFollowupScore(0);
    setFollowupScoreConfirmed(false);
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupCandidateId("");
    setFollowupReadyToRetest(false);
    setFollowupRetestPlan(null);
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupTensionLocations([]);
    setFollowupTrends({});
    setFollowupExerciseChoicesRaw({});
    setFollowupExerciseChoiceRecordedAt({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setHasNewSymptom("");
    setContinuationRoundIds([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startSecondSession() {
    const currentCaseKey = region
      ? `${region.id}:${intake.side}:${intake.location}:${chiefComplaintLabel(intake)}`
      : "";
    const firstSessionSaved = savedRecords.some((record) => {
      if (record.sessionCount !== 1 || record.initialScore !== intake.baselineScore) return false;
      // Prefer the case context already captured by the demo record.  The
      // complaint text and score alone are not enough: two same-score issues
      // in different locations could otherwise be treated as the same first
      // session.  Keep the old fallback for records created before caseKey
      // was stored.
      if (record.caseKey) return record.caseKey === currentCaseKey;
      return record.complaint === chiefComplaintLabel(intake)
        && record.snapshot?.intake?.regionId === intake.regionId
        && record.snapshot?.intake?.side === intake.side
        && record.snapshot?.intake?.location === intake.location;
    });
    const firstSummary: RehabSessionSummary = {
      sessionId: sessionHistory.find((item) => item.sessionNumber === 1)?.sessionId ?? sessionId,
      problemThreadId,
      status: "completed",
      sessionNumber: 1,
      startedAt: sessionHistory.find((item) => item.sessionNumber === 1)?.startedAt ?? sessionStartedAt,
      completedAt: sessionHistory.find((item) => item.sessionNumber === 1)?.completedAt ?? new Date().toISOString(),
      location: intake.location,
      startedScore: chiefScoreComparable ? intake.baselineScore : undefined,
      endingScore: chiefScoreComparable ? sessionEndScore : undefined,
      reviewResults: mergeSessionReviewResults(
        firstAssessmentReviewResults,
        {},
        trialRecords,
        canonicalActionIdFromAssessmentId,
      ),
      treatments: trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly).map((record) => ({ id: record.candidateId, label: record.treatmentName ?? record.candidateTitle, result: record.result, activityWorsened: record.activityWorsened, responseRole: record.responseRole })),
      effectiveCombination: resolvedTreatmentCombination(trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly)).map((record) => record.treatmentName ?? record.candidateTitle),
      continuedEffectiveTreatments: effectiveTreatmentCandidates.filter((candidate) => trialRecords.some((record) => record.candidateId === candidate.id && !record.activityWorsened)).map(candidateTreatmentName),
      stoppedTreatments: trialRecords.filter((record) => (["same", "worse"].includes(record.result) || record.activityWorsened) && !record.timeBased && !record.reviewOnly && !record.retestOnly).map((record) => record.treatmentName ?? record.candidateTitle),
      resolvedProblems: [],
      training: trainingComplete ? exercises.map((exercise) => ({ id: exercise.id, label: exercise.title, adjustment: "hold" })) : [],
      nextFocus: ["复查主诉和第一次发现的问题", "继续有效处理", trainingPlanSaved ? "确认本次保存的训练方案是否实际执行" : "检查训练完成情况和次日反应"],
    };
    // 每次进入第二次康复都依据真实处理记录重建首诊摘要，以便旧版快照
    // 自动移除肿胀管理，并补回动态生成的有效肌肉处理。
    const firstHistory = upsertSessionSummary(sessionHistory, firstSummary);
    const navigation = workflowController.navigate({
      currentStep: step,
      maxUnlocked,
      event: {
        type: "followup-started",
        sessionNumber: 2,
        priorSessionExists: firstHistory.some((item) => item.sessionNumber === 1),
      },
    });
    let accepted = false;
    workflowController.execute(navigation.commands, {
      startFollowup: (acceptedSessionNumber) => { accepted = acceptedSessionNumber === 2; },
    });
    if (!accepted) return;
    setSessionHistory(firstHistory);
    if (!firstSessionSaved) {
      saveRecord("待复查", sessionEndScore, { sessionHistory: firstHistory });
    }
    setFollowupMode(true);
    setSessionNumber(2);
    setRetestContractVersion(1);
    const nextSessionId = createSessionId();
    const nextStartedAt = beginAssessmentSession(nextSessionId);
    setSessionId(nextSessionId);
    setSessionStartedAt(nextStartedAt);
    setFollowupStage("review");
    setFollowupScoreHistory([intake.baselineScore, sessionEndScore]);
    setFollowupScore(0);
    setFollowupScoreConfirmed(false);
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupTensionLocations([]);
    setFollowupCandidateId("");
    setFollowupTrends({});
    setFollowupExerciseChoicesRaw({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const summaryFacts = [
    { label: "位置", value: intake.bodyLocations.length ? intake.bodyLocations.map((item) => `${item.side} · ${item.location}`).join("；") : "待确认" },
    { label: "时间", value: intake.onset || "待确认" },
    { label: "感觉", value: intake.symptomType || "待确认" },
    ...(intake.symptoms.includes("肿胀或淤青") ? [{ label: "肿胀位置", value: intake.swellingLocation || "待确认" }] : []),
    ...(intake.symptoms.includes("按压痛") || activeProvocationTypes.includes("按压") ? [{ label: "按压痛位置", value: intake.tendernessLocation || "待确认" }] : []),
    ...(intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化") ? [{ label: "麻电范围", value: intake.sensoryLocation || "待确认" }] : []),
    ...((intake.priorCare ?? []).length ? [{ label: "之前处理", value: (intake.priorCare ?? []).join("、") }] : []),
    { label: "恢复目标", value: getGoalLabel(intake.goal) },
  ];
  const intakeProgressItems = [
    { field: "使用方式", value: intake.productMode ? (workflowProfile.isStudy ? "案例学习" : profileLabelForIntake(intake, workflowProfile)) : "待补充" },
    ...(needsExamSetupChoice ? [{ field: "操作对象", value: intake.operationTarget ? operationTargetLabel(intake.operationTarget) : "待补充" }] : []),
    ...(needsSpineModeChoice ? [{ field: "活动度检查方式", value: intake.spineAssessmentMode ? spineModeLabel(intake.spineAssessmentMode) : "待补充" }] : []),
    { field: "不舒服的位置", value: intake.locationConfirmed && intake.bodyLocations.length ? intake.bodyLocations.map((item) => `${item.side}·${item.location}`).join("、") : "待补充" },
    { field: "出现多久", value: intake.onset || "待补充" },
    ...(intake.mechanism || mechanismQuestionRelevant ? [{ field: "发生方式", value: intake.mechanism || "待补充" }] : []),
    { field: "不适感觉", value: intake.symptomType || "待补充" },
    { field: "目前情况", value: confirmedIntakeMulti.symptoms ? intake.symptoms.join("、") || "没有以上情况" : "待补充" },
    { field: "什么动作会不舒服", value: provocationConfirmedForFlow ? hasClearChiefAction(intake) ? chiefActionLabel(intake) : activeProvocationTypes.join("、") || "没有固定动作" : "待补充" },
    ...(baselineScoreApplicable ? [{ field: "不适分数", value: intake.baselineScoreConfirmed ? `${intake.baselineScore}/10` : "待补充" }] : []),
    ...(intake.symptoms.includes("肿胀或淤青") ? [{ field: "肿胀位置", value: intake.swellingLocationConfirmed ? intake.swellingLocation || "说不清" : "待补充" }] : []),
    ...(intakeHasTenderness ? [{ field: "按压痛位置", value: intake.tendernessLocationConfirmed ? intake.tendernessLocation || "说不清" : "待补充" }] : []),
    ...(intakeHasSensorySymptoms ? [{ field: "麻电范围", value: intake.sensoryLocationConfirmed ? intake.sensoryLocation || "说不清" : "待补充" }] : []),
    ...(intake.symptomType === "刺痛" && (needsStabbingSpread || intake.stabbingSpread) ? [
      { field: "刺痛出现范围", value: ({ single: "只有当前动作", multiple: "多个动作", rest: "静止也会", unsure: "说不清", "": "待补充" } as const)[intake.stabbingSpread] },
    ] : []),
    ...((intake.symptomType === "刺痛" || intakeHasTenderness) && (needsStabbingPalpation || intake.stabbingPalpation) ? [
      { field: "轻按反应", value: ({ sharp: "清楚刺痛", dull: "钝痛或酸胀", none: "没有明显感觉", "not-tried": "没有尝试", "": "待补充" } as const)[intake.stabbingPalpation] },
    ] : []),
    { field: "恢复目标", value: intake.goal ? getGoalLabel(intake.goal) : "待补充" },
  ];
  const completedIntakeItemCount = intakeProgressItems.filter((item) => item.value !== "待补充").length;
  const visibleIntakeProgressItems = intakeProgressItems.filter((item) => showAllIntakeFields || item.value !== "待补充" || item.field === currentIntakeField);
  // 配对力量结果在活动动作卡片里合并展示，但它仍然是已确认的问题：
  // 右侧清单和总结页必须使用同一套问题集合，不能只在总结页显示。
  const followupResolvedFindingIds = followupMode
    ? new Set(
      [...(previousSessionForReview?.reviewResults ?? []), ...Object.entries(followupTrends).map(([id, result]) => ({ id, result }))]
        .filter((item) => item.result === "better")
        .map((item) => item.id),
    )
    : new Set<string>();
  const isFollowupFindingResolved = (finding: Finding) => {
    if (!followupMode) return false;
    if (finding.id.startsWith("motion:")) {
      const actionId = motionIdFromFinding(finding);
      return [...followupResolvedFindingIds].some((id) => id.startsWith("motion:") && samePhysicalAction(id.replace(/^motion:/, ""), actionId));
    }
    return followupResolvedFindingIds.has(finding.id);
  };
  const collectedFindings = findings.filter((finding) => (!finding.internal || finding.id.startsWith("strength:")) && finding.priority !== "chief" && !isFollowupFindingResolved(finding));
  const collectedFindingGroups = buildFindingGroups(collectedFindings);
  const professionalRetestItems = activeRetestLedger.obligations.filter((item) => item.sessionId === sessionId).map((item) => ({
    ...item,
    // 待复查的 range 义务 label 存的是域 directionId，展示前必须换回产品文案。
    label: item.kind === "range" ? professionalAssessmentTitle(`motion:${item.targetId}`, item.label) : item.label,
    kindLabel: ({
      range: "活动范围",
      function: "功能动作",
      chief: "主诉动作",
      "training-safety": "训练反应",
    } as const)[item.kind],
    statusLabel: ({
      pending: "待复查",
      completed: "已完成",
      deferred: "稍后复查",
      cancelled: "已取消",
      superseded: "已被新评估替代",
    } as const)[item.status],
  }));
  const findingAsideMeta = (finding: Finding) => {
    if (typeof finding.score === "number") return `${finding.score}/10`;
    if (finding.id.startsWith("strength:")) return finding.title.split("：").slice(1).join("：") || "力量或控制异常";
    if (finding.priority === "track") return "后续复查";
    if (finding.id.startsWith("function:")) return finding.detail.split("，")[0];
    return "";
  };
  const latestFollowupRecord = [...followupTrialRecords].reverse().find((record) => record.sessionNumber === sessionNumber);
  const displayedMainScore: number | string = !intake.baselineScoreConfirmed
    ? "—"
    : !chiefScoreComparable
      ? intake.baselineScore
    : !followupMode
          ? step >= 4 && finalRetestConfirmed ? sessionEndScore : step >= 3 ? lastChiefScore : intake.baselineScore
          : followupStage === "review"
            ? followupScoreConfirmed ? followupScore : "—"
            : followupTrainingReadyForRetest
              ? followupFinalScoreConfirmed ? followupFinalScore : latestFollowupRecord?.afterScore ?? followupScore
              : followupPostScoreConfirmed ? followupPostScore : latestFollowupRecord?.afterScore ?? followupScore;
  const displayedScoreNote = !intake.baselineScoreConfirmed
    ? "还需要补充评分"
        : !chiefScoreComparable
          ? intake.side === "双侧/中间" && hasClearChiefAction(intake) ? "已分别记录两侧的整体感受" : "已记录当前的不适程度"
        : followupMode
          ? followupStage === "review" && !followupScoreConfirmed ? `上次结束 ${sessionHistory.find((item) => item.sessionNumber === sessionNumber - 1)?.endingScore ?? sessionHistory.at(-1)?.endingScore ?? sessionEndScore}分 · 等待本次复测` : followupTrainingReadyForRetest && followupFinalScoreConfirmed ? `本次训练前 ${latestFollowupRecord?.afterScore ?? followupScore}分 → 结束复测 ${followupFinalScore}分` : `第${sessionNumber}次康复当前评分`
      : step >= 4 && finalRetestConfirmed ? `初次 ${intake.baselineScore}分 → 结束复测 ${sessionEndScore}分` : step >= 3 && lastChiefScore !== intake.baselineScore ? `初次 ${intake.baselineScore}分 → 当前 ${lastChiefScore}分` : "首次评分，后续复测会显示作参考";
  const displayedStep = reviewStep ?? step;
  const railStep: Step = followupMode
    ? followupStage === "review" ? 2 : followupStage === "treatment" ? 3 : 4
    : step;
  const feedbackCurrentStage = reviewStep !== null ? STEPS[reviewStep] : STEPS[railStep];
  const currentFeedbackRecord = findLocalCaseRecord(savedRecords, localCaseId);
  const currentPilotConflictRecord = currentFeedbackRecord?.pilotConflictSnapshot ? currentFeedbackRecord : null;
  const currentPilotConflictSections = currentPilotConflictRecord?.snapshot && currentPilotConflictRecord.pilotConflictSnapshot
    ? summarizePilotSnapshotConflict(persistSavedDemoSnapshot(currentPilotConflictRecord.snapshot), persistSavedDemoSnapshot(currentPilotConflictRecord.pilotConflictSnapshot))
    : [];
  const feedbackStageOptions = useMemo(() => STEPS
    .slice(0, Math.max(railStep + 1, 1))
    .map((label) => ({ key: label, label })), [railStep]);
  const feedbackSessions = useMemo(() => Array.from(new Set([
    sessionNumber,
    ...sessionHistory.map((item) => item.sessionNumber),
  ])).sort((left, right) => right - left), [sessionHistory, sessionNumber]);

  function openCurrentFeedback() {
    setFeedbackSourceContext(capturePilotFeedbackSourceContext({
      caseIdentity: localCaseId,
      sessionNumber,
      stage: feedbackCurrentStage,
      eventId: lastPilotEventIdsRef.current[localCaseId] ?? null,
    }));
    setFeedbackOpen(true);
  }

  function closeCurrentFeedback() {
    setFeedbackOpen(false);
    setFeedbackSourceContext(null);
  }

  async function submitCurrentFeedback(draft: PilotFeedbackDraft) {
    const source = feedbackSourceContext;
    if (!source) throw new Error("反馈上下文已经失效");
    await pilotSaveQueueRef.current.drain(source.caseIdentity).catch(() => undefined);
    const latestRecord = findLocalCaseRecord(savedRecordsRef.current, source.caseIdentity);
    const access = latestRecord ? pilotAccessFromRecord(latestRecord) : null;
    if (!access) {
      throw new PilotFeedbackSubmissionError("请先保存当前案例，建立案例编号后再提交问题反馈");
    }
    await submitPilotCaseFeedback({
      access,
      sessionNumber: draft.sessionNumber,
      stage: draft.stage,
      kind: draft.kind,
      message: draft.message,
      eventId: draft.eventId,
      sourceSessionNumber: source.sessionNumber,
      sourceStage: source.stage,
      sourceEventId: source.eventId,
    });
    setToast("问题反馈已提交");
    window.setTimeout(() => setToast(""), 2400);
  }
  const renderStepContent = (targetStep: Step) => targetStep === 0
    ? <SymptomStage
      intake={intake}
      showAllIntakeFields={showAllIntakeFields}
      professionalLocationTab={professionalLocationTab}
      guidedIntakeField={guidedIntakeField}
      guidedIntakePath={guidedIntakePath}
      guidedIntakeCursor={guidedIntakeCursor}
      confirmedIntakeMulti={confirmedIntakeMulti}
      workflowProfile={workflowProfile}
      isThinkingMode={isThinkingMode}
      effectiveOperationTarget={effectiveOperationTarget}
      showExamSetupChoice={showExamSetupChoice}
      showCapabilitiesChoice={showCapabilitiesChoice}
      needsSpineModeChoice={needsSpineModeChoice}
      describedRegionId={describedRegionId}
      unsupportedDescriptionRegion={unsupportedDescriptionRegion}
      selfNeuralReferral={selfNeuralReferral}
      stabbingEarlyReferral={stabbingEarlyReferral}
      intakeHasTenderness={intakeHasTenderness}
      intakeHasSensorySymptoms={intakeHasSensorySymptoms}
      bilateralSameProblemGuidance={bilateralSameProblemGuidance}
      baselineScoreApplicable={baselineScoreApplicable}
      intakeMissingFields={intakeMissingFields}
      currentIntakeField={currentIntakeField}
      guidedQuestionReady={guidedQuestionReady}
      keyConfirmationReady={keyConfirmationReady}
      onIntakeChange={setIntake}
      onShowAllIntakeFieldsChange={setShowAllIntakeFields}
      onProfessionalLocationTabChange={setProfessionalLocationTab}
      onConfirmedIntakeMultiChange={setConfirmedIntakeMulti}
      onToggleIntakeCapability={toggleIntakeCapability}
      onToggleArray={toggleArray}
      onBeginGuidedIntake={beginGuidedIntake}
      onRewriteIntakeDescription={rewriteIntakeDescription}
      onAdvanceGuidedQuestion={advanceGuidedQuestion}
      onReturnToPreviousIntakeQuestion={returnToPreviousIntakeQuestion}
      onEnterKeyConfirmation={enterKeyConfirmation}
      onSaveRecord={saveRecord}
      onInvalidateAfterIntake={applyIntakeChange}
    />
    : targetStep === 1
      ? <ConfirmationStage
        safetyStage={safetyStage}
        safetyAnswered={safetyAnswered}
        needsBoneQuestions={needsBoneQuestions}
        boneQuestionsAnswered={boneQuestionsAnswered}
        boneImagingSuggested={boneImagingSuggested}
        hasSafetySignal={hasSafetySignal}
        hasClearance={hasClearance}
        structuralImagingSignal={structuralImagingSignal}
        canContinueSafety={canContinueSafety}
        priorCare={intake.priorCare ?? []}
        activeSafetyItems={activeSafetyItems}
        safety={safety}
        boneRisk={boneRisk}
        imaging={imaging}
        imagingOptions={IMAGING_OPTIONS}
        backLabel={safetyStage === 0 ? "返回症状信息" : "上一步"}
        continueLabel={safetyStage === 0 ? hasSafetySignal ? "继续填写医生结论" : needsBoneQuestions ? "继续确认骨性风险" : "继续填写影像结论" : safetyStage === 1 ? "继续填写影像结论" : "开始评估检查"}
        onSafetyAnswer={(id, answer) => setSafety((current) => ({ ...current, [id]: answer }))}
        onBoneRiskAnswer={(id, answer) => setBoneRisk((current) => ({ ...current, [id]: answer }))}
        onImagingToggle={(option) => {
          const exclusive = ["没有做影像", "未见骨折", "有骨折或骨裂异常"];
          if (exclusive.includes(option)) setImaging((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current.filter((item) => !exclusive.includes(item)), option]);
          else toggleArray(option, imaging, setImaging);
        }}
        onBack={() => safetyStage === 0 ? goToStep(0) : setSafetyStage(safetyStage === 2 && !needsBoneQuestions ? 0 : Math.max(0, safetyStage - 1) as 0 | 1 | 2)}
        onContinue={() => safetyStage === 0 ? setSafetyStage(needsBoneQuestions ? 1 : 2) : safetyStage === 1 ? setSafetyStage(2) : goToStep(2)}
        onSaveMedicalReview={() => saveRecord("待医学评估")}
      />
      : targetStep === 2
        ? <AssessmentStage
          step={step}
          intake={intake}
          assessmentIndex={assessmentIndex}
          assessmentResults={assessmentResults}
          assessmentSummaryOpen={assessmentSummaryOpen}
          sharedTensionOpen={sharedTensionOpen}
          thinkingWorkbenchOpen={thinkingWorkbenchOpen}
          adverseResponse={adverseResponse}
          adverseConfirmedAssessmentIds={adverseConfirmedAssessmentIds}
          region={region}
          canAssessPassive={canAssessPassive}
          canAssessResistance={canAssessResistance}
          canAssessEndFeel={canAssessEndFeel}
          canRunSpecialTest={canRunSpecialTest}
          isThinkingMode={isThinkingMode}
          assessments={assessments}
          assessmentDisplayItems={assessmentDisplayItems}
          findings={findings}
          bilateralPriorityResolution={bilateralPriorityResolution}
          tissuePathway={tissuePathway}
          assessmentComplete={assessmentComplete}
          limitedPilotMotionItems={limitedPilotMotionItems}
          sharedTensionRequired={sharedTensionRequired}
          sharedTensionRecord={sharedTensionRecord}
          sharedTensionComplete={sharedTensionComplete}
          assessmentFlowComplete={assessmentFlowComplete}
          assessmentReadyForTreatment={assessmentReadyForTreatment}
          canContinueSafety={canContinueSafety}
          specialPositiveFindings={specialPositiveFindings}
          hasSpecialPositive={hasSpecialPositive}
          assessmentNeuralReferral={assessmentNeuralReferral}
          sharpSpecialReferral={sharpSpecialReferral}
          assessmentNeedsReferral={assessmentNeedsReferral}
          adverseResolution={adverseResolution}
          trialRecords={trialRecords}
          exercises={exercises}
          treatmentComplete={treatmentComplete}
          trainingComplete={trainingComplete}
          trainingPlanSaved={trainingPlanSaved}
          trainingStageClosed={trainingStageClosed}
          displayAssessmentIndexForId={displayAssessmentIndexForId}
          displayAssessmentComplete={displayAssessmentComplete}
          onStepChange={setStep}
          onTransitionTargetChange={setTransitionTarget}
          onAssessmentIndexChange={setAssessmentIndex}
          onAssessmentSummaryOpenChange={setAssessmentSummaryOpen}
          onSharedTensionOpenChange={setSharedTensionOpen}
          onThinkingWorkbenchOpenChange={setThinkingWorkbenchOpen}
          onTrialTargetIndexChange={setTrialTargetIndex}
          onCandidateIndexChange={setCandidateIndex}
          onPostScoreChange={setPostScore}
          onPostScoreConfirmedChange={setPostScoreConfirmed}
          onPostDiscomfortChange={setPostDiscomfort}
          onExerciseFeedbackChange={setExerciseFeedback}
          onToastChange={setToast}
          onFollowupExerciseChoicesChange={setFollowupExerciseChoices}
          onTreatmentPlanRevisionChange={setTreatmentPlanRevision}
          onAdverseResponseChange={setAdverseResponse}
          onAdverseConfirmedAssessmentIdsChange={setAdverseConfirmedAssessmentIds}
          onGoToStep={goToStep}
          onRestoreAdverseReturn={restoreAdverseReturn}
          onFinishFocusedReassessment={finishFocusedReassessment}
          onConfirmFocusedAssessment={confirmFocusedAssessment}
          onUpdateAssessment={updateAssessment}
          onSaveRecord={saveRecord}
        />
        : targetStep === 3
          ? <TreatmentRetestStage
            view={{
              intake,
              assessmentResults,
              trialTargetIndex,
              finishSnapshots,
              selectedOptionalCandidateIds,
              bilateralNeedsReferral,
              midpointDecisionDone,
              bilateralRetestResponses,
              trialRecords,
              postScore,
              postScoreConfirmed,
              postDiscomfort,
              readyToRetest,
              movementResponse,
              movementResponses,
              movementDiscomforts,
              movementScores,
              movementScoreConfirmed,
              treatmentFinalRetestConfirmed,
              directionChiefRetestScore,
              directionChiefRetestConfirmed,
              functionRetestCompletion,
              functionRetestUnableReason,
              treatmentFunctionRetests,
              region,
              canAssessPassive,
              canMobilizeJoint,
              assessments,
              bilateralPriorityResolution,
              treatmentProblems,
              localLimbDecision,
              tissuePathway,
              swellingGuidance,
              trialTargets,
              pendingFunctionRetestItems: retestContractVersion === 1 ? activeLedgerFunctionRetests : [],
              activeTarget,
              activeCandidate,
              activeTargetSides,
              activeTargetIsBilateral,
              activeTargetCompletedSides,
              activeTargetPendingSides,
              activeTargetCurrentSide,
              weakStrengthProblems,
              assessmentEvidenceInsufficient,
              assessmentGap,
              treatmentWorsened,
              activeCandidateGroup,
              activeGroupPriorRecords,
              activeNewCandidates,
              localNewSourceNeedsChiefRetest,
              latestRangeScoreForDirection,
              treatmentEmptyState,
              unresolvedLedgerProblem,
              unresolvedImmediateLedgerProblems,
              chiefRetestCompletedDuringTreatment,
              chiefRetestEligibility,
              chiefScoreComparable,
              chiefImprovedDuringTreatment,
              chiefNeedsFinalRetest,
              lastChiefScore,
              directionAllowsPassive,
              isResidualReviewStep,
              activeRetestFindings,
              activeControlMotionIds,
              effectiveFocusLabels,
              effectiveControlLabels,
              recoveredRangeLabels,
              improvedRangeLabels,
              trackObservationLabels,
              noImmediateTreatmentResponse,
              intakeMissingFields,
              bilateralAssessmentComplete,
              treatmentQueueIsRefreshing,
              pendingKneeAssessmentCheck,
              treatmentComplete,
              continuationSuggestions,
              onAcceptContinuationSuggestions: acceptContinuationSuggestions,
              bilateralTrainingGateState,
              chiefFunctionLabels,
              hasChiefFunctionAction,
            }}
            actions={{
              onStepChange: setStep,
              onReviewStepChange: setReviewStep,
              onTransitionTargetChange: setTransitionTarget,
              onSelectedOptionalCandidateIdsChange: setSelectedOptionalCandidateIds,
              onBilateralNeedsReferralChange: setBilateralNeedsReferral,
              onMidpointDecisionDoneChange: setMidpointDecisionDone,
              onBilateralTreatmentSidesChange: setBilateralTreatmentSides,
              onBilateralRetestResponsesChange: setBilateralRetestResponses,
              onPostScoreChange: setPostScore,
              onPostScoreConfirmedChange: setPostScoreConfirmed,
              onPostDiscomfortChange: setPostDiscomfort,
              onReadyToRetestChange: setReadyToRetest,
              onRetestPlanChange: setRetestPlan,
              onMovementResponseChange: setMovementResponse,
              onMovementResponsesChange: setMovementResponses,
              onMovementDiscomfortsChange: setMovementDiscomforts,
              onMovementScoresChange: setMovementScores,
              onMovementScoreConfirmedChange: setMovementScoreConfirmed,
              onTreatmentFinalRetestScoreChange: setTreatmentFinalRetestScore,
              onTreatmentFinalRetestConfirmedChange: setTreatmentFinalRetestConfirmed,
              onDirectionChiefRetestScoreChange: setDirectionChiefRetestScore,
              onDirectionChiefRetestConfirmedChange: setDirectionChiefRetestConfirmed,
              onFunctionRetestCompletionChange: setFunctionRetestCompletion,
              onFunctionRetestUnableReasonChange: setFunctionRetestUnableReason,
              onTreatmentFunctionRetestsChange: setTreatmentFunctionRetests,
              onToastChange: setToast,
              onJumpToIntakeQuestion: jumpToIntakeQuestion,
              onGoToStep: goToStep,
              onReviewCompletedStep: reviewCompletedStep,
              onEditCompletedAssessment: editCompletedAssessment,
              onReturnFromRetestToTreatment: returnFromRetestToTreatment,
              onReopenAssessment: reopenAssessment,
              onBeginAdverseReassessment: beginAdverseReassessment,
              onOpenAssessmentItem: openAssessmentItem,
              onTargetScoreBeforeRetest: targetScoreBeforeRetest,
              onUndoLastFinish: undoLastFinish,
              onFinishTrial: finishTrial,
              onFinishRangeBatch: finishRangeBatch,
              onFinishOutstandingFunctionRetests: finishOutstandingFunctionRetests,
              onContinueWithReusedRetest: continueWithReusedRetest,
              onSaveRecord: saveRecord,
            }}
          />
          : targetStep === 4
            ? <TrainingStage
              intake={intake}
              exerciseFeedback={exerciseFeedback}
              openExercise={openExercise}
              trainingReadyForFinalRetest={trainingReadyForFinalRetest}
              finalRetestScore={finalRetestScore}
              finalRetestConfirmed={finalRetestConfirmed}
              finalFunctionRetests={finalFunctionRetests}
              workflowProfile={workflowProfile}
              isThinkingMode={isThinkingMode}
              assessments={assessments}
              tissuePathway={tissuePathway}
              noChiefActionAndNoAssessmentProblem={noChiefActionAndNoAssessmentProblem}
              chiefRetestEligibility={chiefRetestEligibility}
              chiefScoreComparable={chiefScoreComparable}
              lastChiefScore={lastChiefScore}
              effectiveFocusLabels={effectiveFocusLabels}
              effectiveControlLabels={effectiveControlLabels}
              noImmediateTreatmentResponse={noImmediateTreatmentResponse}
              exerciseStage={exerciseStage}
              exercises={exercises}
              homeRelaxationTargets={homeRelaxationTargets}
              bilateralTrainingGateState={bilateralTrainingGateState}
              chiefFunctionLabels={chiefFunctionLabels}
              onTransitionTargetChange={setTransitionTarget}
              onExerciseFeedbackChange={setExerciseFeedback}
              onOpenExerciseChange={setOpenExercise}
              onTrainingCompleteChange={setTrainingComplete}
              onTrainingPlanSavedChange={setTrainingPlanSaved}
              onTrainingReadyForFinalRetestChange={setTrainingReadyForFinalRetest}
              onFinalRetestScoreChange={setFinalRetestScore}
              onFinalRetestConfirmedChange={setFinalRetestConfirmed}
              onFinalFunctionRetestsChange={setFinalFunctionRetests}
              onGoToStep={goToStep}
              onReopenAssessment={reopenAssessment}
              onBeginAdverseReassessment={beginAdverseReassessment}
              onSaveRecord={saveRecord}
            />
            : <SummaryStage
              view={{
                intake,
                assessmentResults,
                trialRecords,
                retestObligations: activeRetestLedger.obligations,
                retestRecords: activeRetestLedger.records,
                exerciseFeedback,
                trainingComplete,
                trainingPlanSaved,
                 followupMode,
                 sessionHistory,
                bodyMarks: currentBodyMarks,
                region,
                findings,
                treatmentProblems,
                treatmentWorsened,
                chiefScoreComparable,
                sessionEndScore,
                effectiveFocusLabels,
                effectiveControlLabels,
                exerciseStage,
                exercises,
                homeRelaxationTargets,
                hasSafetySignal,
                hasClearance,
                structuralImagingSignal,
                assessmentNeedsReferral,
                sessionNumber,
                followupScore,
                followupScoreConfirmed,
                followupStage,
                followupPostScore,
                followupPostScoreConfirmed,
                followupPostDiscomfort,
                followupCandidateId,
                followupTrialRecords,
                followupReadyToRetest,
                followupRetestPlan,
                followupMovementResponses,
                followupMovementDiscomforts,
                followupMovementScores,
                followupMovementScoreConfirmed,
                followupTensionLocations,
                followupExerciseChoices,
                followupTrainingReadyForRetest,
                followupFinalScore,
                followupFinalScoreConfirmed,
                outstandingFunctionRetests,
                treatmentFunctionRetests,
                hasNewSymptom,
                followupTrends,
                assessments,
                previousSessionForReview,
                previousSessionScore,
                localLimbDecision,
                tissuePathway,
                swellingGuidance,
                followupCandidates,
                latestRangeScoreForDirection,
                directionAllowsPassive,
                directionNeedsCandidate,
                followupRetestIds,
                followupCandidateNeedsWork,
              }}
              actions={{
                onStepChange: setStep,
                onFollowupModeChange: setFollowupMode,
                onFollowupStageChange: setFollowupStage,
                onFollowupPostScoreChange: setFollowupPostScore,
                onFollowupPostScoreConfirmedChange: setFollowupPostScoreConfirmed,
                onFollowupPostDiscomfortChange: setFollowupPostDiscomfort,
                onFollowupCandidateIdChange: setFollowupCandidateId,
                onFollowupReadyToRetestChange: setFollowupReadyToRetest,
                onFollowupRetestPlanChange: setFollowupRetestPlan,
                onFollowupMovementResponsesChange: setFollowupMovementResponses,
                onFollowupMovementDiscomfortsChange: setFollowupMovementDiscomforts,
                onFollowupMovementScoresChange: setFollowupMovementScores,
                onFollowupMovementScoreConfirmedChange: setFollowupMovementScoreConfirmed,
                onFollowupTensionLocationsChange: setFollowupTensionLocations,
                onFollowupExerciseChoicesChange: setFollowupExerciseChoices,
                onFollowupTrainingReadyForRetestChange: setFollowupTrainingReadyForRetest,
                onFollowupFinalScoreChange: setFollowupFinalScore,
                onFollowupFinalScoreConfirmedChange: setFollowupFinalScoreConfirmed,
                onTreatmentFunctionRetestsChange: setTreatmentFunctionRetests,
                onFinishOutstandingFunctionRetests: finishOutstandingFunctionRetests,
                onHasNewSymptomChange: setHasNewSymptom,
                onGoToStep: goToStep,
                onReturnFromFollowupRetestToTreatment: returnFromFollowupRetestToTreatment,
                onReopenAssessment: reopenAssessment,
                onBeginAdverseReassessment: beginAdverseReassessment,
                onSaveRecord: saveRecord,
                onInvalidateAfterIntake: startNewProblemThread,
                onRecordFollowupTrial: recordFollowupTrial,
                onInvalidateCurrentFollowupWork: invalidateCurrentFollowupWork,
                onUpdateFollowupScore: updateFollowupScore,
                onUpdateFollowupTrend: updateFollowupTrend,
                onFinishFollowupTreatmentRetest: finishFollowupTreatmentRetest,
                onCompleteFollowupSession: completeFollowupSession,
                onStartNextFollowupSession: startNextFollowupSession,
                onStartSecondSession: startSecondSession,
              }}
            />;

  return <main className="rm-app" data-trial-record-count={trialRecords.length} data-test-run-id={testContext?.testRunId} data-test-scenario-id={testContext?.scenarioId} data-legacy-exam-setup={legacyExamSetupIsNotProfessionalOther ? "compatible" : "professional-other"}>
    <header className="rm-topbar">
      <button type="button" className="rm-brand" data-rehabmind-tutorial="brand" onClick={resetDemo}><b>RM</b><span><strong>RehabMind</strong><small>康复思路工作台</small></span></button>
      <div className="rm-top-context"><span>{region?.name ?? "新评估"}</span><i>·</i><b>{reviewStep !== null ? `回看：${STEPS[reviewStep]}` : transitionTarget ? STAGE_TRANSITIONS[transitionTarget].title : STEPS[railStep]}</b></div>
      <div className="rm-top-actions" data-rehabmind-tutorial="top-actions">{currentFeedbackRecord?.pilotPublicCode ? <span className="rm-current-case-code" data-testid="current-case-public-code">案例 {currentFeedbackRecord.pilotPublicCode}</span> : null}{pilotSyncState === "local-saved" ? <span aria-live="polite" className="rm-sync-saved">已保存到本机</span> : pilotSyncState !== "idle" && !["synced", "local-saving", "syncing"].includes(pilotSyncState) ? <span aria-live="polite" className="rm-sync-error">{pilotSyncState === "conflict" ? "待处理冲突" : pilotSyncState === "error" ? "本机保存失败" : pilotSyncState === "offline" ? "网络断开，正在本机保存" : "仅本机保存"}</span> : null}<button type="button" className="rm-tutorial-trigger" onClick={() => setFocusTutorialOpen(true)}>关于 RehabMind</button><button type="button" data-testid="feedback-trigger" className="rm-feedback-trigger" data-rehabmind-tutorial="feedback" onClick={openCurrentFeedback}>问题反馈</button><button type="button" data-testid="records-trigger" data-rehabmind-tutorial="records" className="rm-records-trigger" onClick={() => setRecordsOpen(true)}>康复记录 <b>{savedRecords.length}</b></button><button type="button" data-testid="save-draft" onClick={saveDraftRecord}>保存草稿</button></div>
      <MobileTopActions sessionNumber={sessionNumber} syncState={pilotSyncState} moreOpen={mobileMoreOpen} onToggleMore={() => setMobileMoreOpen((open) => !open)} />
    </header>
    <div className="rm-context-hints">
      <OnceHint id="case-code" active={!testContext && Boolean(currentFeedbackRecord?.pilotPublicCode)}>反馈问题时，可以把案例编号告诉我们。</OnceHint>
    </div>
    {snapshotFreshness ? <SnapshotFreshnessBanner
      freshness={snapshotFreshness}
      reconfirmed={snapshotReconfirmed}
      onReconfirm={() => setSnapshotReconfirmationOpen(true)}
      onReviewIntake={reviewRestoredIntake}
    /> : null}
    {multiTabConflict ? <section className="rm-multi-tab-conflict" role="alert" aria-live="assertive">
      <div>
        <strong>其他标签页已保存了更新</strong>
        <p>另一个标签页保存了新内容。当前页面内容仍在，请选择重新加载或保留当前页面继续。</p>
        <small>{multiTabConflict.action === "cleared" ? "另一个标签页清理了草稿。" : "同一个案例在另一个标签页有新修改。"}</small>
      </div>
      <div className="rm-multi-tab-conflict-actions">
        <button type="button" className="rm-primary" onClick={reloadFromOtherTab}>重新加载</button>
        <button type="button" onClick={keepCurrentTabVersion}>保留本页继续</button>
      </div>
    </section> : null}
    <MobileStageNavigation open={mobileStageOpen} railStep={railStep} currentStep={step} maxUnlocked={maxUnlocked} followupMode={followupMode} onOpen={() => setMobileStageOpen(true)} onClose={() => setMobileStageOpen(false)} onSelect={openWorkflowStage} />
    {currentPilotConflictRecord ? <PilotConflictPanel
      publicCode={currentPilotConflictRecord.pilotPublicCode}
      localRevision={currentPilotConflictRecord.pilotLastSyncedRevision ?? currentPilotConflictRecord.pilotRevision ?? 0}
      remoteRevision={currentPilotConflictRecord.pilotConflictRevision ?? 0}
      changedSections={currentPilotConflictSections}
      onUseRemote={() => {
        const remoteSnapshot = currentPilotConflictRecord.pilotConflictSnapshot;
        const remoteRevision = currentPilotConflictRecord.pilotConflictRevision;
        if (!remoteSnapshot || remoteRevision === undefined) return;
        const nextRecord: SavedDemoRecord = {
          ...currentPilotConflictRecord,
          snapshot: remoteSnapshot,
          pilotSnapshotUpdatedAt: currentPilotConflictRecord.pilotConflictSnapshotUpdatedAt,
          pilotRevision: remoteRevision,
          pilotLastSyncedRevision: remoteRevision,
          pilotDirty: false,
          localContentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
          lastSyncedContentFingerprint: persistedSnapshotFingerprint(remoteSnapshot),
          pilotConflictSnapshot: undefined,
          pilotConflictRevision: undefined,
          pilotConflictSnapshotUpdatedAt: undefined,
        };
        updateStoredPilotRecord(localCaseId, nextRecord);
        dispatchPilotSync(localCaseId, { type: "restore-succeeded", caseId: localCaseId, revision: remoteRevision });
        void restoreRecord(nextRecord);
      }}
      onSaveAsNew={() => savePilotConflictAsNew(currentPilotConflictRecord)}
      onExportLocal={() => exportPilotLocalConflict(currentPilotConflictRecord)}
      onLater={() => { dispatchPilotSync(localCaseId, { type: "restore-conflict", caseId: localCaseId }); setToast("已保留这台设备上的记录，稍后可以继续选择"); }}
    /> : null}

    <div className={`rm-shell ${displayedStep === 0 ? "is-intake-step" : ""}`}>
      <nav className="rm-step-rail" data-rehabmind-tutorial="flow" aria-label="康复流程">{STEPS.map((label, index) => {
        const available = followupMode ? index <= railStep : index <= maxUnlocked || index <= step;
        const reviewing = reviewStep === index;
        return <button type="button" key={label} data-rehabmind-tutorial={railStep === index && reviewStep === null ? "flow-current" : undefined} disabled={!available} className={`${railStep === index && reviewStep === null ? "is-current" : ""} ${index < railStep ? "is-done" : ""} ${reviewing ? "is-reviewing" : ""}`} onClick={() => {
          if (index < railStep) reviewCompletedStep(index as Step);
          else if (index === railStep) { setReviewStep(null); setReviewStepEditable(false); }
          else goToStep(index as Step);
        }}><i>{index < railStep ? "✓" : index + 1}</i><span>{label}</span><b>{reviewing ? "正在回看" : railStep === index ? "进行中" : index < railStep ? "可回看" : available ? "可进入" : "待解锁"}</b></button>;
      })}<section><span>当前康复</span><strong>第{sessionNumber}次</strong><small>{followupMode ? "复查上次问题" : "第一次完整评估"}</small></section></nav>

      <section className="rm-workspace">{reviewStep !== null ? <>
        <section className={`rm-readonly-banner ${reviewStepEditable ? "is-editing" : ""}`}><div><span>{reviewStepEditable ? "修改评估" : "只读回看"}</span><strong>{reviewStepEditable ? "只有答案改变，后续处理才会重新生成" : "这里不会改变当前进度"}</strong></div><button type="button" onClick={() => { setReviewStep(null); setReviewStepEditable(false); }}>返回当前步骤</button></section>
        <div className={reviewStepEditable ? "rm-review-editable-content" : "rm-readonly-content"}>{renderStepContent(reviewStep)}</div>
      </> : transitionTarget
        ? <StageTransition {...STAGE_TRANSITIONS[transitionTarget]} onBack={() => setTransitionTarget(null)} onContinue={continueStageTransition} />
        : renderStepContent(step)}</section>

      {summaryOpen ? <button type="button" className="rm-case-aside-backdrop" aria-label="关闭本次记录" onClick={() => setSummaryOpen(false)} /> : null}
      <aside className={`rm-case-aside ${summaryOpen ? "is-open" : ""}`}>
        {displayedStep === 0 ? <>
          <header><div><span>已收集信息</span><strong>{intake.parsed ? `已确认 ${completedIntakeItemCount} 项` : "0项"}</strong></div><button type="button" onClick={() => setSummaryOpen(false)}>关闭</button></header>
          {intake.parsed ? <><section className="rm-intake-progress">{visibleIntakeProgressItems.map((item) => <button type="button" key={item.field} data-intake-field={item.field} className={`${item.field === currentIntakeField && !showAllIntakeFields ? "is-current" : ""} ${item.value === "待补充" ? "is-missing" : "is-complete"} ${item.value === "待补充" && highlightedIntakeFields.includes(item.field) ? "is-highlighted" : ""}`} onClick={() => { setHighlightedIntakeFields((current) => current.filter((field) => field !== item.field)); jumpToIntakeQuestion(item.field); }}><span>{item.field}</span><strong>{item.value}</strong><i>{item.value === "待补充" ? "当前" : "修改"}</i></button>)}</section>
          <button type="button" className="rm-aside-edit" onClick={() => setShowAllIntakeFields(true)}>≡ 全部信息</button></> : <section className="rm-aside-empty">填写症状描述后，识别结果和待补充项目会显示在这里。</section>}
        </> : <>
          <header><div><span>已收集信息</span><strong>{summaryFacts.filter((item) => !["待确认", "等待描述", "尚未确认"].includes(item.value)).length + collectedFindings.length}项</strong></div><button type="button" onClick={() => setSummaryOpen(false)}>关闭</button></header>
          {intake.baselineScoreConfirmed ? <section className="rm-aside-score"><span>主要问题评分</span><strong>{displayedMainScore}<small>{displayedMainScore === "—" ? "" : "/10"}</small></strong><p>{displayedScoreNote}</p></section> : null}
          <dl>{summaryFacts.map((fact, index) => <div key={`${fact.label}:${index}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
          {isThinkingMode && professionalRetestItems.length ? <section
            className="rm-aside-retest-ledger"
            data-testid="retest-ledger-summary"
            data-pending-count={activeRetestLedger.pendingRequiredCount}
          >
            <header>
              <div><span>复查台账</span><strong>处理后仍需确认的项目</strong></div>
              <b>{activeRetestLedger.pendingRequiredCount} 项待完成</b>
            </header>
            <div>
              {professionalRetestItems.map((item) => <article
                key={item.obligationId}
                data-obligation-id={item.obligationId}
                data-status={item.status}
              >
                <i aria-hidden="true" />
                <div><strong>{item.label}</strong><span>{item.kindLabel}{item.side ? ` · ${item.side}` : ""}</span></div>
                <b>{item.statusLabel}</b>
              </article>)}
            </div>
          </section> : null}
          {collectedFindings.length ? <section className="rm-aside-findings"><header><span>评估结果</span><strong>{collectedFindings.length}项</strong></header><div className="rm-aside-finding-groups">{collectedFindingGroups.map((group) => <section key={group.key} className={`is-${group.key}`}><header><i aria-hidden="true" /><strong>{group.label}</strong><span>{group.items.length}</span></header>{group.items.map((finding) => { const meta = findingAsideMeta(finding); return <article key={finding.id}><div><strong>{professionalFindingLabel(finding)}</strong>{meta ? <span>{meta}</span> : null}</div></article>; })}</section>)}</div></section> : <section className="rm-aside-empty">{followupMode ? "本次复查暂未保留未解决异常。" : "评估完成后显示异常结果。"}</section>}
          <button type="button" className="rm-aside-edit" onClick={() => goToStep(0)}>返回修改症状信息</button>
        </>}
      </aside>
    </div>

    <button type="button" className={`rm-mobile-summary${sharedTensionOpen ? " is-hidden" : ""}`} onClick={() => setSummaryOpen(true)}><span>本次记录</span><b>{intake.parsed ? `${intake.baselineScoreConfirmed ? `${intake.baselineScore}分 · ` : ""}${intake.location || "待补位置"}` : "查看"}</b></button>

    <MobileMoreMenu
      open={mobileMoreOpen}
      sessionNumber={sessionNumber}
      record={currentFeedbackRecord}
      onClose={() => setMobileMoreOpen(false)}
      onCopyCaseCode={(record) => void copyPilotPublicCode(record)}
      onOpenRecords={() => { setMobileMoreOpen(false); setRecordsOpen(true); }}
      onOpenFeedback={() => { setMobileMoreOpen(false); openCurrentFeedback(); }}
      onOpenHelp={() => { setMobileMoreOpen(false); setFocusTutorialOpen(true); }}
      onSave={() => { setMobileMoreOpen(false); saveDraftRecord(); }}
    />

    <RehabRecordsPage
      open={recordsOpen}
      records={savedRecords}
      showFirstOpenHint={!testContext}
      onBack={() => setRecordsOpen(false)}
      onCopyCaseCode={(record) => void copyPilotPublicCode(record)}
      onRestore={(record) => void restoreRecord(record)}
      onDelete={(record) => { if (window.confirm("删除后将无法通过当前案例链接继续读取，确定删除吗？")) void deleteSavedRecord(record); }}
      onCreate={createNewCaseFromRecords}
      onClear={() => void clearAllLocalRecords()}
    />

    <PilotFeedbackPanel
      key={`${feedbackOpen ? "open" : "closed"}:${feedbackSourceContext?.caseIdentity ?? localCaseId}:${feedbackSourceContext?.stage ?? feedbackCurrentStage}:${feedbackSourceContext?.sessionNumber ?? sessionNumber}`}
      open={feedbackOpen}
      currentLocation={{ sessionNumber: feedbackSourceContext?.sessionNumber ?? sessionNumber, stage: feedbackSourceContext?.stage ?? feedbackCurrentStage }}
      sessions={feedbackSessions}
      stages={feedbackStageOptions}
      currentEventId={feedbackSourceContext?.eventId ?? null}
      onClose={closeCurrentFeedback}
      onSubmit={submitCurrentFeedback}
    />

    {!testContext ? <RehabMindOnboarding key={onboardingOpen ? "open" : "closed"} open={onboardingOpen} mode="welcome" canContinue={savedRecords.length > 0} onContinue={continueFromWelcome} onStart={startFromWelcome} /> : null}
    {!testContext ? <RehabMindOnboarding key={focusTutorialOpen ? "focus-open" : "focus-closed"} open={focusTutorialOpen} mode="focus" onSkip={markFocusTutorialSeen} onContinue={markFocusTutorialSeen} /> : null}

    {!testContext ? <DevToolbar onReset={devResetFlow} onClearAll={devClearAllData} onJumpToStep={devJumpToStep} /> : null}

    {!testContext ? <PilotSourceGate open={pilotSourceGateOpen} onContinue={handlePilotSourceContinue} /> : null}

    {!testContext ? <PilotConsentGate open={pilotConsentGateOpen} declined={pilotConsentDeclined} onAgree={handlePilotConsentAgree} onDecline={handlePilotConsentDecline} onReconsider={handlePilotConsentReconsider} /> : null}

    {snapshotFreshness?.requiresReconfirmation ? <SnapshotFreshnessReconfirmationDialog
      key={`${snapshotReconfirmationOpen ? "open" : "closed"}:${localCaseId}`}
      open={snapshotReconfirmationOpen}
      ageText={formatSnapshotAge(snapshotFreshness)}
      onClose={() => setSnapshotReconfirmationOpen(false)}
      onReviewIntake={reviewRestoredIntake}
      onReviewSafety={reviewRestoredSafety}
      onConfirm={confirmRestoredSnapshot}
    /> : null}

    {toast ? <button type="button" className="rm-toast" onClick={() => setToast("")}>{toast}</button> : null}
  </main>;
}
