import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { AnswerChoiceGrid, ScoreSlider, StepHeading, TreatmentRoadmap } from "@/src/features/rehabmind/components/shared/ui-primitives";
import { FUNCTION_COMPLETION_RETEST_COPY, scoreBeforeContext } from "@/src/features/rehabmind/components/shared/user-facing-copy";
import { OnceHint } from "@/src/features/rehabmind/components/shared/once-hint";
import { StageOutcomeSections } from "@/src/features/rehabmind/components/stages/shared/stage-outcome-sections";
import type { FunctionUnableReason, TreatmentFunctionRetestAnswer } from "@/src/features/rehabmind/controllers/use-function-retest";
import { resultFromScore } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { CompletedRangeRetestAnswer, RangeRetestAnswer, TrialRecord, TrialResult, YesNo } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { summarizeTreatmentCoverage } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefChangeExplanation } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { professionalAssessmentTitle } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import { assessmentGapActionLabel, type AssessmentGap } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { motionIdFromFinding, motionWasSymptomatic, samePhysicalAction, valueForPhysicalAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { nextRangeCandidateType } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { candidateTreatmentKey, candidateTreatmentName } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { candidateAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefActionLabel, chiefMotionDirectionId, chiefMotionDirectionIds, hasClearChiefAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { bilateralCheckpointOptions, type BilateralPriorityResolution, type BilateralSide, type BilateralTrainingGate } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { functionEvidenceFromRecord } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { resolveTreatmentRetestGate } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { canReuseLatestRetest as canReuseLatestRetestDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { PendingQueueAdvance } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { LocalLimbDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { TissuePathwayDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { LedgerEntry } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { RetestEligibility } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { KneeAssessmentCheck } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { AdverseSource, AdverseTiming } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { FullCandidate, FullRegion } from "@/src/knowledge/pilot/full-demo-content";
import {
  type AssessmentItem,
  type AssessmentRecord,
  type Finding,
  type IntakeState,
  type RetestPlan,
  type SavedDemoRecord,
  type SavedDemoSnapshot,
  type Step,
  type TransitionTarget,
  type TreatmentProblem,
  type TrialTarget,
  TreatmentActionCard,
  activeMotionRangeQuestion,
  canonicalRetestAction,
  chiefComplaintLabel,
  isPatellaTreatmentCandidate,
  motionComparisonTarget,
  optionalTreatmentSelectionKey,
  rangeRetestOptions,
  scoreChange,
  treatmentDisplay,
} from "@/src/features/rehabmind/components/workbench/workbench-support";

type FinishSnapshot = {
  trialRecords: TrialRecord[];
  trialTargetIndex: number;
  candidateIndex: number;
  pendingTrialAdvance: PendingQueueAdvance | null;
};

export type TreatmentRetestStageView = {
  intake: IntakeState;
  assessmentResults: Record<string, AssessmentRecord>;
  trialTargetIndex: number;
  finishSnapshots: FinishSnapshot[];
  selectedOptionalCandidateIds: string[];
  bilateralNeedsReferral: boolean;
  midpointDecisionDone: boolean;
  bilateralRetestResponses: Record<string, "same" | "better" | "worse">;
  trialRecords: TrialRecord[];
  postScore: number;
  postScoreConfirmed: boolean;
  postDiscomfort: "" | YesNo;
  readyToRetest: boolean;
  movementResponse: RangeRetestAnswer;
  movementResponses: Record<string, CompletedRangeRetestAnswer>;
  movementDiscomforts: Record<string, YesNo>;
  movementScores: Record<string, number>;
  movementScoreConfirmed: Record<string, boolean>;
  treatmentFinalRetestConfirmed: boolean;
  directionChiefRetestScore: number;
  directionChiefRetestConfirmed: boolean;
  functionRetestCompletion: "" | "unable" | "complete";
  functionRetestUnableReason: "" | FunctionUnableReason;
  treatmentFunctionRetests: Record<string, TreatmentFunctionRetestAnswer>;
  region?: FullRegion;
  canAssessPassive: boolean;
  canMobilizeJoint: boolean;
  assessments: AssessmentItem[];
  bilateralPriorityResolution: BilateralPriorityResolution;
  treatmentProblems: TreatmentProblem[];
  localLimbDecision: LocalLimbDecision | null;
  tissuePathway: TissuePathwayDecision;
  swellingGuidance?: FullCandidate;
  trialTargets: TrialTarget[];
  activeTarget?: TrialTarget;
  activeCandidate?: FullCandidate;
  activeTargetSides: BilateralSide[];
  activeTargetIsBilateral: boolean;
  activeTargetCompletedSides: BilateralSide[];
  activeTargetPendingSides: BilateralSide[];
  activeTargetCurrentSide?: BilateralSide;
  weakStrengthProblems: Finding[];
  assessmentEvidenceInsufficient: boolean;
  assessmentGap: AssessmentGap | null;
  treatmentWorsened: boolean;
  activeCandidateGroup: FullCandidate[];
  activeGroupPriorRecords: TrialRecord[];
  activeNewCandidates: FullCandidate[];
  localNewSourceNeedsChiefRetest: boolean;
  treatmentEmptyState: { title: string; detail: string; action: string };
  unresolvedLedgerProblem: boolean;
  unresolvedImmediateLedgerProblems: LedgerEntry[];
  chiefRetestCompletedDuringTreatment: boolean;
  chiefRetestEligibility: RetestEligibility;
  chiefScoreComparable: boolean;
  chiefImprovedDuringTreatment: boolean;
  chiefNeedsFinalRetest: boolean;
  lastChiefScore: number;
  isResidualReviewStep: boolean;
  activeRetestFindings: Finding[];
  activeControlMotionIds: string[];
  effectiveFocusLabels: string[];
  effectiveControlLabels: string[];
  recoveredRangeLabels: string[];
  improvedRangeLabels: string[];
  trackObservationLabels: string[];
  noImmediateTreatmentResponse: boolean;
  intakeMissingFields: string[];
  bilateralAssessmentComplete: boolean;
  treatmentQueueIsRefreshing: boolean;
  pendingKneeAssessmentCheck?: KneeAssessmentCheck;
  treatmentComplete: boolean;
  bilateralTrainingGateState: BilateralTrainingGate;
  chiefFunctionLabels: string[];
  hasChiefFunctionAction: boolean;
  latestRangeScoreForDirection: (directionId: string) => number | undefined;
  directionAllowsPassive: (directionId: string) => boolean;
};

export type TreatmentRetestStageActions = {
  onStepChange: Dispatch<SetStateAction<Step>>;
  onReviewStepChange: Dispatch<SetStateAction<Step | null>>;
  onTransitionTargetChange: Dispatch<SetStateAction<TransitionTarget | null>>;
  onSelectedOptionalCandidateIdsChange: Dispatch<SetStateAction<string[]>>;
  onBilateralNeedsReferralChange: Dispatch<SetStateAction<boolean>>;
  onMidpointDecisionDoneChange: Dispatch<SetStateAction<boolean>>;
  onBilateralTreatmentSidesChange: Dispatch<SetStateAction<Record<string, BilateralSide[]>>>;
  onBilateralRetestResponsesChange: Dispatch<SetStateAction<Record<string, "same" | "better" | "worse">>>;
  onPostScoreChange: Dispatch<SetStateAction<number>>;
  onPostScoreConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onPostDiscomfortChange: Dispatch<SetStateAction<"" | YesNo>>;
  onReadyToRetestChange: Dispatch<SetStateAction<boolean>>;
  onRetestPlanChange: Dispatch<SetStateAction<RetestPlan | null>>;
  onMovementResponseChange: Dispatch<SetStateAction<RangeRetestAnswer>>;
  onMovementResponsesChange: Dispatch<SetStateAction<Record<string, CompletedRangeRetestAnswer>>>;
  onMovementDiscomfortsChange: Dispatch<SetStateAction<Record<string, YesNo>>>;
  onMovementScoresChange: Dispatch<SetStateAction<Record<string, number>>>;
  onMovementScoreConfirmedChange: Dispatch<SetStateAction<Record<string, boolean>>>;
  onTreatmentFinalRetestScoreChange: Dispatch<SetStateAction<number>>;
  onTreatmentFinalRetestConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onDirectionChiefRetestScoreChange: Dispatch<SetStateAction<number>>;
  onDirectionChiefRetestConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onFunctionRetestCompletionChange: Dispatch<SetStateAction<"" | "unable" | "complete">>;
  onFunctionRetestUnableReasonChange: Dispatch<SetStateAction<"" | FunctionUnableReason>>;
  onTreatmentFunctionRetestsChange: Dispatch<SetStateAction<Record<string, TreatmentFunctionRetestAnswer>>>;
  onToastChange: Dispatch<SetStateAction<string>>;
  onJumpToIntakeQuestion: (field: string) => void;
  onGoToStep: (next: Step) => void;
  onReviewCompletedStep: (target: Step) => void;
  onEditCompletedAssessment: () => void;
  onReturnFromRetestToTreatment: () => void;
  onReopenAssessment: (message?: string) => void;
  onBeginAdverseReassessment: (input: { source: AdverseSource; sourceId: string; sourceLabel: string; timing: AdverseTiming; beforeScore: number; afterScore: number; relatedAssessmentIds: string[] }) => void;
  onOpenAssessmentItem: (id: string, message: string) => void;
  onTargetScoreBeforeRetest: (target: TrialTarget) => number;
  onUndoLastFinish: () => void;
  onFinishTrial: (requestedResult: TrialResult, timeBased?: boolean, nextCandidateType?: FullCandidate["type"], deferredRetest?: boolean) => void;
  onFinishRangeBatch: () => void;
  onContinueWithReusedRetest: () => void;
  onSaveRecord: (status?: SavedDemoRecord["status"], latestScoreOverride?: number, snapshotOverrides?: Partial<SavedDemoSnapshot>) => void;
};

export function TreatmentRetestStage({ view, actions }: { view: TreatmentRetestStageView; actions: TreatmentRetestStageActions }) {
  const {
    intake, assessmentResults, trialTargetIndex, finishSnapshots, selectedOptionalCandidateIds,
    bilateralNeedsReferral, midpointDecisionDone, bilateralRetestResponses, trialRecords,
    postScore, postScoreConfirmed, postDiscomfort, readyToRetest, movementResponse,
    movementResponses, movementDiscomforts, movementScores, movementScoreConfirmed,
    treatmentFinalRetestConfirmed, directionChiefRetestScore, directionChiefRetestConfirmed,
    functionRetestCompletion, functionRetestUnableReason, treatmentFunctionRetests, region, canAssessPassive, canMobilizeJoint,
    assessments, bilateralPriorityResolution, treatmentProblems, localLimbDecision, tissuePathway,
    swellingGuidance, trialTargets, activeTarget, activeCandidate, activeTargetSides,
    activeTargetIsBilateral, activeTargetCompletedSides, activeTargetPendingSides, activeTargetCurrentSide,
    weakStrengthProblems, assessmentEvidenceInsufficient, assessmentGap, treatmentWorsened,
    activeCandidateGroup, activeGroupPriorRecords, activeNewCandidates, localNewSourceNeedsChiefRetest,
    latestRangeScoreForDirection, treatmentEmptyState, unresolvedLedgerProblem,
    unresolvedImmediateLedgerProblems, chiefRetestCompletedDuringTreatment, chiefRetestEligibility,
    chiefScoreComparable, chiefImprovedDuringTreatment, chiefNeedsFinalRetest, lastChiefScore,
    directionAllowsPassive, isResidualReviewStep, activeRetestFindings, activeControlMotionIds,
    effectiveFocusLabels, effectiveControlLabels, recoveredRangeLabels, improvedRangeLabels,
    trackObservationLabels, noImmediateTreatmentResponse, intakeMissingFields, bilateralAssessmentComplete,
    treatmentQueueIsRefreshing, pendingKneeAssessmentCheck, treatmentComplete, bilateralTrainingGateState,
    chiefFunctionLabels, hasChiefFunctionAction,
  } = view;
  const {
    onStepChange: setStep, onReviewStepChange: setReviewStep,
    onTransitionTargetChange: setTransitionTarget,
    onSelectedOptionalCandidateIdsChange: setSelectedOptionalCandidateIds,
    onBilateralNeedsReferralChange: setBilateralNeedsReferral,
    onMidpointDecisionDoneChange: setMidpointDecisionDone,
    onBilateralTreatmentSidesChange: setBilateralTreatmentSides,
    onBilateralRetestResponsesChange: setBilateralRetestResponses,
    onPostScoreChange: setPostScore, onPostScoreConfirmedChange: setPostScoreConfirmed,
    onPostDiscomfortChange: setPostDiscomfort, onReadyToRetestChange: setReadyToRetest,
    onRetestPlanChange: setRetestPlan, onMovementResponseChange: setMovementResponse,
    onMovementResponsesChange: setMovementResponses, onMovementDiscomfortsChange: setMovementDiscomforts,
    onMovementScoresChange: setMovementScores, onMovementScoreConfirmedChange: setMovementScoreConfirmed,
    onTreatmentFinalRetestScoreChange: setTreatmentFinalRetestScore,
    onTreatmentFinalRetestConfirmedChange: setTreatmentFinalRetestConfirmed,
    onDirectionChiefRetestScoreChange: setDirectionChiefRetestScore,
    onDirectionChiefRetestConfirmedChange: setDirectionChiefRetestConfirmed,
    onFunctionRetestCompletionChange: setFunctionRetestCompletion,
    onFunctionRetestUnableReasonChange: setFunctionRetestUnableReason,
    onTreatmentFunctionRetestsChange: setTreatmentFunctionRetests,
    onToastChange: setToast, onJumpToIntakeQuestion: jumpToIntakeQuestion, onGoToStep: goToStep,
    onReviewCompletedStep: reviewCompletedStep, onEditCompletedAssessment: editCompletedAssessment,
    onReturnFromRetestToTreatment: returnFromRetestToTreatment, onReopenAssessment: reopenAssessment,
    onBeginAdverseReassessment: beginAdverseReassessment, onOpenAssessmentItem: openAssessmentItem,
    onTargetScoreBeforeRetest: targetScoreBeforeRetest, onUndoLastFinish: undoLastFinish,
    onFinishTrial: finishTrial, onFinishRangeBatch: finishRangeBatch,
    onContinueWithReusedRetest: continueWithReusedRetest, onSaveRecord: saveRecord,
  } = actions;

  
  const beforeScore = activeTarget ? targetScoreBeforeRetest(activeTarget) : intake.baselineScore;
  const change = scoreChange(beforeScore, postScore);
  const bilateralCheckpointRequired = intake.side === "双侧/中间"
    && !midpointDecisionDone
    && !bilateralNeedsReferral
    && !activeTargetIsBilateral
    && Boolean(activeTarget?.finding.side && activeTarget.finding.side !== "两侧接近" && activeTarget.finding.side !== "两侧异常" && intake.prioritySide && activeTarget.finding.side !== intake.prioritySide);
  const openLowLoadTraining = () => {
    setMidpointDecisionDone(true);
    setReviewStep(null);
    setTransitionTarget(null);
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleTreatmentCompletion = () => {
    if (activeTargetIsBilateral && activeTargetCurrentSide && activeTargetPendingSides.length) {
      setBilateralTreatmentSides((current) => ({
        ...current,
        [activeTarget!.id]: Array.from(new Set([...(current[activeTarget!.id] ?? []), activeTargetCurrentSide])),
      }));
      const nextSide = activeTargetPendingSides.find((side) => side !== activeTargetCurrentSide);
      setToast(nextSide ? `${activeTargetCurrentSide}已记录，继续${nextSide}` : `${activeTargetCurrentSide}已记录，接下来复测两侧`);
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    prepareRetest();
  };
  // 功能动作 target：处理后对所有功能动作都问「能否完成」（松解/松动能改善「做不做得了」）。
  const activeFunctionObligations = activeTarget?.functionRetestObligations ?? [];
  const isFunctionTarget = Boolean(activeFunctionObligations.length || activeTarget?.finding.id.startsWith("function:"));
  const activeFunctionEvidence = !activeFunctionObligations.length && isFunctionTarget && activeTarget
    ? functionEvidenceFromRecord(activeTarget.finding.id, assessmentResults[activeTarget.finding.id])
    : undefined;
  const treatmentRetestGate = resolveTreatmentRetestGate({
    isFunctionTarget,
    mode: activeFunctionEvidence?.retestMode ?? "none",
    completion: functionRetestCompletion,
    unableReason: functionRetestUnableReason,
    scoreConfirmed: postScoreConfirmed,
    targetId: activeTarget?.id,
    chiefScoreComparable,
    initialCompletion: activeFunctionEvidence?.completion,
  });
  const chiefScoreRetestBlocked = treatmentRetestGate.chiefScoreRetestBlocked;
  const functionRetestState = treatmentRetestGate;
  const functionRetestIsCompletionOnly = functionRetestState.completionOnly;
  const functionObligationResults = activeFunctionObligations.map((obligation) => {
    const answer = treatmentFunctionRetests[obligation.assessmentId];
    if (!answer?.completion) return null;
    if (answer.completion === "unable" && !answer.unableReason) return null;
    if (obligation.mode === "ordinary" && answer.completion === "complete" && !answer.scoreConfirmed) return null;
    if (obligation.baselineCompletion === "unable") return answer.completion === "complete" ? "better" as const : "same" as const;
    if (answer.completion === "unable") return "worse" as const;
    if (typeof obligation.baselineScore === "number" && typeof answer.score === "number") {
      return resultFromScore(obligation.baselineScore, answer.score);
    }
    return "same" as const;
  });
  const functionObligationsReady = activeFunctionObligations.length > 0 && functionObligationResults.every(Boolean);
  const functionObligationResult: TrialResult = functionObligationResults.includes("worse")
    ? "worse"
    : functionObligationResults.length > 0 && functionObligationResults.every((result) => result === "better")
      ? "better"
      : functionObligationResults.includes("better")
        ? "partial"
        : "same";
  const updateFunctionRetest = (assessmentId: string, patch: Partial<TreatmentFunctionRetestAnswer>) => {
    setTreatmentFunctionRetests((current) => ({
      ...current,
      [assessmentId]: { ...(current[assessmentId] ?? { completion: "" }), ...patch },
    }));
  };
  const retestReady = activeFunctionObligations.length ? functionObligationsReady : functionRetestState.retestReady;
  // 从「做不了」到「能完成」算改善；疼痛分没变时也记为 partial。
  // T-01：完成状态恶化（能完成→做不完）即使分数不可比也按加重放行。
  const automaticResult: TrialResult = activeFunctionObligations.length
    ? functionObligationResult
    : chiefScoreRetestBlocked
    ? functionRetestState.automaticResult === "worse" ? "worse" : "same"
    : isFunctionTarget && functionRetestState.automaticResult
    ? functionRetestState.automaticResult
    : isFunctionTarget && functionRetestCompletion === "complete" && resultFromScore(beforeScore, postScore) === "same"
      ? "partial"
      : resultFromScore(beforeScore, postScore);
  const isTimeBasedTarget = activeCandidate?.type === "swelling";
  const isBatchRangeTarget = Boolean(activeCandidate?.retestIds?.length && activeRetestFindings.length);
  const isRangeTarget = Boolean(activeTarget?.finding.id.startsWith("motion:"));
  const activeRangeDirection = isRangeTarget && activeTarget ? motionIdFromFinding(activeTarget.finding) : undefined;
  const activeAssessmentId = activeTarget?.finding.id.replace(/^symptom:/, "");
  const activeAssessment = activeAssessmentId ? assessments.find((item) => item.id === activeAssessmentId) : undefined;
  const isStrengthSymptomTarget = Boolean(activeTarget?.finding.id.startsWith("strength:"));
  const noRetestNeededAfterLatestResult = Boolean(
    activeTarget
    && !isResidualReviewStep
    && activeRetestFindings.length === 0
    && activeTarget.id !== "target:chief"
    && !isFunctionTarget
    && !isStrengthSymptomTarget,
  );
  const retestActionTitle = activeTarget?.retestLabel
    ?? (activeTarget?.id === "target:chief" ? chiefActionLabel(intake) : activeAssessment?.title)
    ?? activeTarget?.finding.title.split(/：|会引起|因为|不稳定/)[0]
    ?? "刚才出现不适的动作";
  const activeComparison = activeAssessment?.comparison ?? "contralateral";
  const activeComparisonTarget = motionComparisonTarget(activeComparison);
  const guidedMode = intake.productMode ? intake.productMode === "guided" : intake.userRole === "general";
  const canShowOptionalProfessionalTreatment = intake.operationTarget === "other";
  const persistentStabbing = guidedMode && intake.symptomType === "刺痛" && chiefScoreComparable && lastChiefScore >= 4;
  const isUnspecifiedChiefTarget = !hasClearChiefAction(intake) && !isResidualReviewStep
    && (activeTarget?.id === "target:chief" || Boolean(localLimbDecision && !isBatchRangeTarget));
  const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
  const chiefDirectionIds = region ? chiefMotionDirectionIds(intake, region.id) : [];
  const activeRangeWasSymptomatic = Boolean(activeRangeDirection && motionWasSymptomatic(activeRangeDirection, assessmentResults, chiefDirection));
  const activeRangeAllowsPassive = activeRangeDirection ? directionAllowsPassive(activeRangeDirection) : canAssessPassive;
  const activeRangePassiveOnly = activeAssessment?.kind === "motion" && activeAssessment.testMode === "passive";
  const singleRangeRetestsChief = Boolean(isRangeTarget && activeTarget?.id !== "target:chief" && chiefScoreComparable
    && (localNewSourceNeedsChiefRetest || !chiefImprovedDuringTreatment && !chiefRetestCompletedDuringTreatment)
    && !samePhysicalAction(activeRangeDirection, chiefDirection));
  const singleRangeDiscomfort = activeRangeDirection ? movementDiscomforts[activeRangeDirection] : undefined;
  const singleRangeScoreConfirmed = activeRangeDirection ? Boolean(movementScoreConfirmed[activeRangeDirection]) : false;
  const chiefMatchesRange = Boolean(chiefDirection && activeRetestFindings.some((finding) => samePhysicalAction(motionIdFromFinding(finding), chiefDirection)));
  const retestShortTitle = (finding: Finding) => {
    const assessment = assessments.find((item) => item.id === finding.id);
    return assessment ? professionalAssessmentTitle(assessment.id, assessment.title) : finding.title.split(/：|范围偏小|会引起症状/)[0];
  };
  const batchRangeComplete = activeRetestFindings.length > 0 && activeRetestFindings.every((finding) => {
    const directionId = motionIdFromFinding(finding);
    return Boolean(movementResponses[directionId]
      && movementDiscomforts[directionId]
      && (movementDiscomforts[directionId] === "no" || movementScoreConfirmed[directionId]));
  });
  const shouldRetestChiefInBatch = !isResidualReviewStep
    && chiefScoreComparable
    && (!chiefMatchesRange || hasChiefFunctionAction)
    // 局部大腿/小腿的活动复测通常不是主诉动作本身（例如局部拉长
    // 复测对应“下蹲”主诉）。首个局部处理单元必须同时记录主诉分数，
    // 否则用户明明选了“疼痛下降”，后续仍会显示为“原来的不适未变”。
    && (activeTarget?.id === "target:chief" || activeTarget?.id === "target:local-limb" && (singleRangeRetestsChief || localNewSourceNeedsChiefRetest))
    && !chiefImprovedDuringTreatment;
  const chiefScoreComplete = !shouldRetestChiefInBatch || Boolean(postDiscomfort && (postDiscomfort === "no" || postScoreConfirmed));
  const batchComplete = batchRangeComplete && chiefScoreComplete;
  const batchResultParts = activeRetestFindings.reduce<string[]>((parts, finding) => {
    const directionId = motionIdFromFinding(finding);
    const outcome = movementResponses[directionId];
    const title = retestShortTitle(finding);
    if (outcome === "both-match") parts.push(`${title}已接近比较目标`);
    else if (outcome === "passive-match-active-limited") parts.push(`${title}主动范围仍偏小`);
    else if (outcome === "better-passive-limited") parts.push(`${title}有改善，仍未达到比较目标`);
    else if (outcome === "passive-limited") parts.push(`${title}仍偏小`);
    else if (outcome === "worse") parts.push(`${title}比处理前更差`);
    return parts;
  }, []);
  const displayCandidate = activeNewCandidates[0] ?? activeCandidate;
  const isPatellaCombinedUnit = isPatellaTreatmentCandidate(displayCandidate);
  const activeTreatmentSide = activeTargetIsBilateral
    ? activeTargetCurrentSide ?? intake.side
    : activeTarget?.finding.side && activeTarget.finding.side !== "两侧接近" && activeTarget.finding.side !== "两侧异常" ? activeTarget.finding.side : intake.side;
  const activeDisplay = displayCandidate
    ? treatmentDisplay(displayCandidate, region?.name || intake.location || "当前部位", intake.swellingLocation, activeTreatmentSide)
    : null;
  const roadmapSummary = (record: { rangeOutcomes?: Record<string, CompletedRangeRetestAnswer>; chiefRetested?: boolean; afterScore: number; beforeScore: number }): string => {
    const parts: string[] = [];
    for (const [directionId, outcome] of Object.entries(record.rangeOutcomes ?? {})) {
      const title = assessments.find((item) => item.id === `motion:${directionId}`)?.title ?? directionId;
      const label = ({
        "both-match": "范围恢复",
        "passive-match-active-limited": "主动范围仍偏小",
        "better-passive-limited": "范围改善，仍受限",
        "passive-limited": "仍受限，未明显改变",
        worse: "范围更差",
      } satisfies Record<CompletedRangeRetestAnswer, string>)[outcome];
      parts.push(`${title}${label}`);
    }
    if (record.chiefRetested && record.afterScore < record.beforeScore) parts.push(`不适降 ${record.beforeScore - record.afterScore} 分`);
    return parts.join("、");
  };
  const completedRoadmapItems = [
    ...trialRecords
      .filter((record) => !record.reviewOnly && !record.retestOnly)
      .map((record) => ({ label: record.treatmentName ?? record.candidateTitle, summary: roadmapSummary(record) })),
    ...(readyToRetest && activeCandidate ? [{ label: candidateTreatmentName(activeCandidate), summary: "" }] : []),
  ].filter((item, index, list) => list.findIndex((entry) => entry.label === item.label) === index);
  const carryoverOnly = activeNewCandidates.length === 0 && activeGroupPriorRecords.length > 0;
  const carryoverRetestTitle = isBatchRangeTarget
    ? activeRetestFindings.map(retestShortTitle).join("、")
    : isRangeTarget
      ? activeAssessment?.title ?? (activeTarget ? retestShortTitle(activeTarget.finding) : "当前动作")
      : retestActionTitle;
  const currentRoadmapItem = readyToRetest
    ? isPatellaCombinedUnit
      ? "复测刚才受限的髌骨方向"
      : `复测${isBatchRangeTarget ? [...(shouldRetestChiefInBatch ? [chiefActionLabel(intake)] : []), ...activeRetestFindings.map(retestShortTitle)].join("、") : retestActionTitle}`
    : carryoverOnly
      ? `复测${carryoverRetestTitle}`
      : activeDisplay ? `${activeDisplay.site}：${activeDisplay.action}` : "按提示完成当前处理";
  const plannedRetestLabel = noRetestNeededAfterLatestResult
    ? "无需重复复测"
    : isBatchRangeTarget
      ? isPatellaCombinedUnit
        ? "刚才受限的髌骨方向"
        : [...(shouldRetestChiefInBatch ? [chiefActionLabel(intake)] : []), ...activeRetestFindings.map(retestShortTitle)].join("、")
      : isRangeTarget ? activeAssessment?.title ?? retestActionTitle : retestActionTitle;
  const latestTrialRecord = trialRecords[trialRecords.length - 1];
  const latestTreatmentRecordIndex = trialRecords.findLastIndex((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased);
  const reusableDirectionIds = activeRetestFindings.length
    ? activeRetestFindings.map(motionIdFromFinding)
    : activeRangeDirection ? [activeRangeDirection] : [];
  const latestMatchingRangeRecordIndex = reusableDirectionIds.length
    ? trialRecords.findLastIndex((record) => reusableDirectionIds.every((directionId) => Boolean(valueForPhysicalAction(record.rangeOutcomes, directionId))
      || record.targetId.startsWith("target:motion:") && samePhysicalAction(record.targetId.replace("target:motion:", ""), directionId) && Boolean(record.rangeOutcome)))
    : -1;
  const canReuseLatestRetest = canReuseLatestRetestDecision({
    carryoverOnly,
    hasLatestTrialRecord: Boolean(latestTrialRecord),
    latestMatchingRangeRecordIndex,
    latestTreatmentRecordIndex,
    latestRetestActionKey: latestTrialRecord?.retestActionKey,
    plannedRetestActionKey: canonicalRetestAction(plannedRetestLabel),
    reusableDirectionCount: reusableDirectionIds.length,
  });
  const showingRetest = readyToRetest || carryoverOnly && !canReuseLatestRetest;
  const remainingTargetNames = trialTargets
    .slice(trialTargetIndex + 1)
    .map((target) => target.retestLabel ?? retestShortTitle(target.finding))
    .filter((label, index, list) => Boolean(label) && list.indexOf(label) === index)
    .slice(0, 2);
  const hasPendingTreatmentAfterCurrent = trialTargets
    .slice(trialTargetIndex + 1)
    .some((target) => target.candidates.length > 0);
  const upcomingRoadmapItems = [
    readyToRetest || carryoverOnly ? "完成本次复测" : noRetestNeededAfterLatestResult ? "继续下一项处理" : isTimeBasedTarget ? "完成本项处理" : `复测${plannedRetestLabel}`,
    ...remainingTargetNames.map((label) => label),
    ...(!hasPendingTreatmentAfterCurrent && !remainingTargetNames.length && chiefNeedsFinalRetest ? [chiefActionLabel(intake)] : []),
    "针对性训练",
  ].filter((label, index, list) => list.indexOf(label) === index).slice(0, 3);
  const prepareRetest = () => {
    if (!activeTarget || !activeCandidate) return;
    if (noRetestNeededAfterLatestResult) {
      finishTrial("same", false, undefined, true);
      return;
    }
    setRetestPlan({ targetId: activeTarget.id, candidateId: activeCandidate.id, directionIds: activeRetestFindings.map(motionIdFromFinding) });
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setReadyToRetest(true);
  };
  const treatmentCoverage = summarizeTreatmentCoverage(
    trialRecords.map((record) => ({
      treatmentKey: record.treatmentKey ?? record.candidateId,
      result: record.result,
      activityWorsened: record.activityWorsened,
      responseRole: record.responseRole,
      rangeImproved: Object.values(record.rangeOutcomes ?? {}).some((outcome) => ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(outcome)),
      directionIds: Object.keys(record.rangeOutcomes ?? {}).length
        ? Object.keys(record.rangeOutcomes ?? {})
        : record.targetId.startsWith("target:motion:") ? [record.targetId.replace("target:motion:", "")] : [],
      reviewOnly: record.reviewOnly,
      retestOnly: record.retestOnly,
      timeBased: record.timeBased,
    })),
    trialTargets.flatMap((target) => target.candidates.map((candidate) => ({
      treatmentKey: candidateTreatmentKey(candidate, target.finding.side ?? intake.side),
      directionIds: candidate.retestIds ?? [],
    }))),
  );
  const lastWorsenedTreatment = [...trialRecords].reverse().find((record) => (record.result === "worse" || record.activityWorsened) && !record.reviewOnly);
  const mixedTreatmentOutcome = Boolean(lastWorsenedTreatment?.activityWorsened
    && lastWorsenedTreatment.chiefRetested
    && lastWorsenedTreatment.afterScore < lastWorsenedTreatment.beforeScore);
  const worsenedRelatedAssessments = lastWorsenedTreatment
    ? Object.keys(lastWorsenedTreatment.rangeOutcomes ?? {}).map((id) => `motion:${id}`)
    : [];
  // 统一复测主诉：处理队列走空后、进入训练前，做最后一次主诉复测。
  // 之前只写在「队列非空」分支里，队列一空就漏掉了。
  const hasFunctionChief = chiefFunctionLabels.length > 0;
  const hasDirectionChief = chiefDirectionIds.length > 0;
  const directionLabels = chiefDirectionIds.map((directionId) => assessments.find((item) => item.id === `motion:${directionId}`)?.title ?? directionId).join("、");
  const chiefFunctionRetestIsCompletionOnly = chiefRetestEligibility === "completion-status";
  const finalRetestComplete = (
    (!hasFunctionChief || (functionRetestCompletion && (functionRetestCompletion === "complete" || functionRetestUnableReason) && (chiefFunctionRetestIsCompletionOnly || postScoreConfirmed)))
    && (!hasDirectionChief || directionChiefRetestConfirmed)
  );
  const finalChiefRetestFragment = chiefNeedsFinalRetest && !treatmentFinalRetestConfirmed ? <>
    <TreatmentRoadmap completed={completedRoadmapItems} current={`统一复测${chiefActionLabel(intake)}`} upcoming={["进入训练"]} />
    <section className="rm-treatment-final-retest">
      <span>本轮处理已完成</span>
      <h2>最后再做一次</h2>
      <p>只在这里统一记录本轮处理后的主诉，不在每项处理后重复询问。</p>
      {hasFunctionChief ? <section className="rm-motion-answer-block">
        <h3>{chiefFunctionLabels.join("、")}现在能完成了吗？</h3>
        <p className="rm-choice-hint">以「动作能从头做到尾」为准，姿势不标准、有借力也算完成。</p>
        <div className="rm-result-grid is-two">{([["complete", "能完成"], ["unable", "还是做不完"]] as const).map(([value, label]) => <button type="button" key={value} className={functionRetestCompletion === value ? "is-selected" : ""} onClick={() => { setFunctionRetestCompletion(value); if (value === "complete") setFunctionRetestUnableReason(""); }}>{label}</button>)}</div>
        {functionRetestCompletion === "unable" ? <section className="rm-motion-answer-block is-followup">
          <h3>主要是什么原因？</h3>
          <div className="rm-result-grid is-two">{([["pain", "疼或不舒服"], ["weak", "没力或撑不住"], ["fear", "担心继续会加重"]] as const).map(([value, label]) => <button type="button" key={value} className={functionRetestUnableReason === value ? "is-selected" : ""} onClick={() => setFunctionRetestUnableReason(value)}>{label}</button>)}</div>
        </section> : null}
        {chiefFunctionRetestIsCompletionOnly ? <div className="rm-retest-mode-note"><strong>现在再试一次这个动作</strong><span>上次没有做完，这次只需要确认现在能不能完成。</span></div> : <ScoreSlider value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostScoreConfirmed(true); }} label={`${chiefFunctionLabels.join("、")}现在的不适程度`} context={`最开始 ${intake.baselineScore}/10`} />}
      </section> : null}
      {hasDirectionChief ? <ScoreSlider value={directionChiefRetestScore} selected={directionChiefRetestConfirmed} onChange={(value) => { setDirectionChiefRetestScore(value); setDirectionChiefRetestConfirmed(true); }} label={`${directionLabels}现在的不适程度`} context={`最开始 ${intake.baselineScore}/10`} /> : null}
      <div className="rm-one-action"><button type="button" className="rm-primary" disabled={!finalRetestComplete} onClick={() => { setTreatmentFinalRetestScore(hasFunctionChief ? postScore : directionChiefRetestScore); setTreatmentFinalRetestConfirmed(true); }}>记录本轮最终结果</button></div>
    </section>
  </> : null;
  // 不再用“问题数 >= 6 且处理数 >= 3”中断流程。队列中仍有一个
  // 尚未覆盖、且由当前检查支持的处理区域时继续；只有这些区域全部
  // 覆盖后仍无变化，才在结束页停止继续扩大处理范围。
  if (pendingKneeAssessmentCheck && !trialTargets.length) {
    const relatedAssessmentId = `motion:${pendingKneeAssessmentCheck.actionId}`;
    const canOpenRelatedAssessment = assessments.some((item) => item.id === relatedAssessmentId);
    return <section className="rm-page">
      <StepHeading eyebrow="第3步 · 补充检查" title={pendingKneeAssessmentCheck.title} />
      <section className="rm-complete-panel is-caution">
        <span>还不能结束本次评估</span>
        <h2>{pendingKneeAssessmentCheck.instruction}</h2>
        <p>{pendingKneeAssessmentCheck.record}</p>
        <div className="rm-page-actions split">
          <button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button>
          <button type="button" className="rm-primary" onClick={() => canOpenRelatedAssessment
            ? openAssessmentItem(relatedAssessmentId, "请补充这项检查；完成后再安排处理。")
            : reopenAssessment("还有一项膝关节检查需要补充；完成后再安排处理。")}>返回补充检查</button>
        </div>
      </section>
    </section>;
  }
  if (treatmentWorsened) return <section className="rm-page">
    <StepHeading eyebrow="第4步 · 处理与即时复测" title="本次处理已暂停" />
    <section className="rm-complete-panel is-referral"><span>刚才的反应</span><h2>{mixedTreatmentOutcome ? "疼痛评分下降，但活动表现变差" : "症状或活动表现变差"}</h2><p>{mixedTreatmentOutcome ? "疼痛分数的下降和活动表现的变差需要分开记录。当前处理先停止，不把疼痛改善当作整体安全；接下来只确认变差的活动和相关检查。" : "先停止刚才的处理。接下来只确认症状变化和直接相关的检查，不会返回整套评估。"}</p><div className="rm-page-actions three"><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "treatment", sourceId: lastWorsenedTreatment?.candidateId ?? "treatment", sourceLabel: lastWorsenedTreatment?.treatmentName ?? lastWorsenedTreatment?.candidateTitle ?? "刚才的处理", timing: "immediate", beforeScore: lastWorsenedTreatment?.beforeScore ?? intake.baselineScore, afterScore: lastWorsenedTreatment?.afterScore ?? lastChiefScore, relatedAssessmentIds: worsenedRelatedAssessments })}>确认加重后的变化</button><button type="button" onClick={() => goToStep(0)}>补充症状信息</button><button type="button" onClick={() => saveRecord("处理后加重，待重新评估")}>保存并结束</button></div></section>
  </section>;
  if (bilateralCheckpointRequired) {
    const checkpointOptions = bilateralCheckpointOptions({
      bilateral: true,
      assessmentComplete: bilateralAssessmentComplete,
      otherSideHasPendingTreatment: true,
      safetySignal: bilateralTrainingGateState === "blocked",
      treatmentWorsened,
    });
    return <section className="rm-page rm-bilateral-checkpoint">
      <StepHeading eyebrow="第4步 · 双侧处理顺序" title="一侧完成后，确认下一步" note="请手动选择下一侧；两侧的记录会分别保留。" />
      {bilateralPriorityResolution.needsConfirmation && bilateralPriorityResolution.conflictSide ? <section className="rm-route-note is-waiting"><span>评估结果提醒</span><h2>{bilateralPriorityResolution.conflictSide}的异常更多</h2><p>这只影响提醒和后续排序，不会静默替换你在主诉中选择的优先侧。</p></section> : null}
      <section className="rm-complete-panel">
        <span>已完成{intake.prioritySide || "优先侧"}当前处理</span>
        <h2>另一侧还没有被默认判定为正常</h2>
        <p>可以返回另一侧继续检查，也可以先做低负荷基础活动；完成双侧针对性评估后，才开放正常训练。</p>
        <div className="rm-page-actions three">
          {checkpointOptions.includes("return-other-side-assessment") ? <button type="button" onClick={() => editCompletedAssessment()}>返回另一侧评估</button> : null}
          {checkpointOptions.includes("continue-other-side-treatment") ? <button type="button" className="rm-primary" onClick={() => setMidpointDecisionDone(true)}>继续另一侧处理</button> : null}
          {checkpointOptions.includes("low-load-activity") ? <button type="button" onClick={openLowLoadTraining}>进入低负荷基础活动</button> : null}
          {checkpointOptions.includes("save-and-continue") ? <button type="button" onClick={() => saveRecord("待复查")}>保存，稍后继续</button> : null}
        </div>
      </section>
    </section>;
  }
  if (bilateralNeedsReferral) return <section className="rm-page">
    <StepHeading eyebrow="第4步 · 处理与即时复测" title="本次处理已暂停" />
    <section className="rm-complete-panel is-referral"><span>双侧反馈</span><h2>处理后症状加重</h2><p>先停止刚才的处理。返回检查重新确认，或者保存记录后由专业人员评估。</p><div className="rm-page-actions split"><button type="button" className="rm-primary" onClick={() => reopenAssessment()}>返回相关检查</button><button type="button" onClick={() => saveRecord("待医学评估")}>保存并结束</button></div></section>
  </section>;
  if (treatmentQueueIsRefreshing) {
    return <section className="rm-page">
      <StepHeading eyebrow="第4步 · 处理与即时复测" title="正在更新后续安排" />
      <section className="rm-complete-panel is-caution">
        <span>请稍候</span>
        <h2>正在根据刚才的结果安排下一项</h2>
        <p>刚才的处理和复测已经记录，不会丢失。</p>
      </section>
    </section>;
  }
  if (!trialTargets.length) {
    const completedTreatmentAttempt = treatmentCoverage.coveredTreatmentKeys.length > 0;
    const hasSpecificAssessmentGap = Boolean(assessmentGap);
    // “有所改善” is not the endpoint. Keep the route open until every
    // recorded range direction reaches the comparison target, even when the
    // chief score also dropped in the same batch.
    const hasUnresolvedRangeProgress = trialRecords.some((record) =>
      Object.values(record.rangeOutcomes ?? {}).some((outcome) => outcome !== "both-match"));
    const hasUnresolvedImmediateTreatmentProblem = unresolvedImmediateLedgerProblems.length > 0 || unresolvedLedgerProblem || hasUnresolvedRangeProgress;
    const unresolvedImmediateLabels = unresolvedImmediateLedgerProblems
      .map((entry) => treatmentProblems.find((problem) => problem.id === entry.id)?.title ?? entry.id)
      .filter((label, index, list) => label && list.indexOf(label) === index)
      .slice(0, 4);
    const rangeChangedWithoutChiefChange = treatmentCoverage.hasRangeImprovement && !chiefImprovedDuringTreatment;
    // 队列空且还需要最终主诉复测时，先做统一复测，再做「仍有待处理」判断。
    if (finalChiefRetestFragment) {
      return <section className="rm-page">
        <StepHeading eyebrow="第4步 · 处理与即时复测" title="针对性处理" />
        {finalChiefRetestFragment}
      </section>;
    }
    if (intake.side === "双侧/中间" && !midpointDecisionDone) {
      const checkpointOptions = bilateralCheckpointOptions({
        bilateral: true,
        assessmentComplete: bilateralAssessmentComplete,
        otherSideHasPendingTreatment: false,
        safetySignal: bilateralTrainingGateState === "blocked",
        treatmentWorsened,
      });
      return <section className="rm-page rm-bilateral-checkpoint">
        <StepHeading eyebrow="第4步 · 双侧处理顺序" title="两侧处理完成后，确认训练出口" />
        <section className="rm-complete-panel">
          <span>两侧记录已保留</span>
          <h2>{bilateralAssessmentComplete ? "双侧针对性评估已完成" : "另一侧针对性评估还未完成"}</h2>
          <p>{bilateralAssessmentComplete ? "现在可以进入正常训练；如果想先观察，也可以保存记录。" : "当前只开放低负荷基础活动，不能把未评估侧当成正常，也不能直接进入正常训练。"}</p>
          <div className="rm-page-actions three">
            {!bilateralAssessmentComplete && checkpointOptions.includes("return-other-side-assessment") ? <button type="button" onClick={() => editCompletedAssessment()}>返回另一侧评估</button> : null}
            {checkpointOptions.includes("normal-training") ? <button type="button" className="rm-primary" onClick={() => { setMidpointDecisionDone(true); goToStep(4); }}>进入正常训练</button> : null}
            {checkpointOptions.includes("low-load-activity") ? <button type="button" onClick={openLowLoadTraining}>进入低负荷基础活动</button> : null}
            {checkpointOptions.includes("save-and-continue") ? <button type="button" onClick={() => saveRecord("待复查")}>保存，稍后继续</button> : null}
          </div>
        </section>
      </section>;
    }
    if (hasUnresolvedImmediateTreatmentProblem) {
      return <section className="rm-page">
        <StepHeading eyebrow="第4步 · 处理与即时复测" title="本阶段成果" />
        <section className="rm-complete-panel is-caution">
          <span>本轮处理已完成</span>
          <h2>{chiefComplaintLabel(intake)}</h2>
          {chiefScoreComparable ? <div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>下降 {Math.max(0, intake.baselineScore - lastChiefScore)} 分</small></div> : hasClearChiefAction(intake) ? <p>后续会按实际做过的动作逐项查看变化。</p> : <p>这次没有固定的加重动作，已记录其他活动和症状变化。</p>}
          {(() => { const note = chiefChangeExplanation({ comparable: chiefScoreComparable, baseline: intake.baselineScore, latest: lastChiefScore, hasRangeImprovement: treatmentCoverage.hasRangeImprovement, noImmediateResponse: noImmediateTreatmentResponse }); return note ? <p className="rm-chief-change-note">{note}</p> : null; })()}
          <StageOutcomeSections effectiveFocusLabels={effectiveFocusLabels} effectiveControlLabels={effectiveControlLabels} recoveredRangeLabels={recoveredRangeLabels} improvedRangeLabels={improvedRangeLabels} trackObservationLabels={trackObservationLabels} strengthProblemTitles={weakStrengthProblems.map((finding) => finding.title)} />
          {unresolvedImmediateLabels.length ? <section className="rm-stage-outcome-track"><strong>仍有待处理</strong><span>{unresolvedImmediateLabels.join("、")}</span><small>可重新确认或先进入训练巩固。</small></section> : null}
          <div className="rm-page-actions three">
            <button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button>
            <button type="button" onClick={hasSpecificAssessmentGap ? () => openAssessmentItem(assessmentGap!.assessmentId, "请完成这项检查，完成后再安排处理。") : editCompletedAssessment}>{hasSpecificAssessmentGap ? assessmentGapActionLabel(assessmentGap) : "重新确认剩余问题"}</button>
            <button type="button" className="rm-primary" onClick={() => goToStep(4)}>进入训练</button>
          </div>
        </section>
      </section>;
    }
    const completedAttemptTitle = rangeChangedWithoutChiefChange
      ? "活动表现有变化，原来的不适暂未明显改变"
      : treatmentCoverage.hasRangeImprovement && chiefImprovedDuringTreatment
        ? "主诉和活动表现都有改善，继续巩固"
        : chiefImprovedDuringTreatment && lastChiefScore > 0
          ? "主诉有所改善，继续巩固"
      : treatmentCoverage.decision === "stop-covered-no-effect" || noImmediateTreatmentResponse
        ? "已完成相关方向，原来的不适没有明显变化"
        : "本次针对性处理已完成";
    const completedAttemptDetail = rangeChangedWithoutChiefChange
      ? "活动范围有所改善。接下来按检查出的力量和控制问题安排训练。"
      : treatmentCoverage.hasRangeImprovement && chiefImprovedDuringTreatment
        ? "主诉和活动范围都出现变化，但还没有接近另一侧或第一次记录，需要继续巩固。"
        : chiefImprovedDuringTreatment && lastChiefScore > 0
          ? "主诉已经变轻，但还没有达到本次目标；接下来进入低刺激训练并继续观察。"
      : treatmentCoverage.decision === "stop-covered-no-effect" || noImmediateTreatmentResponse
        ? "相关处理已经完成。今天先保留低刺激基础活动；症状持续不变、变重或影响走路时，建议线下评估。"
        : "当前基础检查和可执行处理已经完成，接下来进入训练与居家安排。";
    return <section className="rm-page">
      <StepHeading eyebrow="第4步 · 处理与即时复测" title="针对性处理" />
      <section className={`rm-complete-panel ${assessmentEvidenceInsufficient ? "is-caution" : ""}`}>
        <span>{assessmentEvidenceInsufficient ? "评估尚未完成" : completedTreatmentAttempt ? "本轮处理结束" : "评估已完成"}</span>
        <h2>{assessmentEvidenceInsufficient
          ? "目前的信息不足以安排处理"
          : completedTreatmentAttempt
            ? completedAttemptTitle
            : tissuePathway.id !== "standard" ? tissuePathway.title : treatmentEmptyState.title}</h2>
        <p>{assessmentEvidenceInsufficient
          ? "刚才的主要检查都没有得到可判断结果。这不代表没有问题，也不能据此选择肌肉处理或训练。"
          : completedTreatmentAttempt
            ? completedAttemptDetail
            : tissuePathway.id !== "standard" ? tissuePathway.immediateActions.join("；") : treatmentEmptyState.detail}</p>
        {weakStrengthProblems.length ? <section className="rm-strength-handoff"><strong>还有力量或控制问题</strong><span>{weakStrengthProblems.map((finding) => finding.title).join("、")}</span><small>训练阶段会从低体位开始针对性练习。</small></section> : null}
        {assessmentEvidenceInsufficient
          ? <div className="rm-page-actions three"><button type="button" className="rm-primary" onClick={() => assessmentGap ? openAssessmentItem(assessmentGap.assessmentId, "已定位到需要补充的检查；完成后会回到原流程。") : reopenAssessment()}>{assessmentGapActionLabel(assessmentGap)}</button><button type="button" onClick={() => { const missing = intakeMissingFields[0]; if (missing) { setStep(0); setReviewStep(null); jumpToIntakeQuestion(missing); } else reopenAssessment(); }}>{intakeMissingFields[0] ? `补充${intakeMissingFields[0]}` : "补充症状信息"}</button><button type="button" onClick={() => saveRecord("评估未完成")}>保存，之后继续</button></div>
          : completedTreatmentAttempt
            ? <div className="rm-page-actions three"><button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" className="rm-primary" onClick={() => goToStep(4)}>{noImmediateTreatmentResponse ? "查看低刺激基础活动" : "查看训练与居家方案"}</button><button type="button" onClick={() => saveRecord(noImmediateTreatmentResponse ? "处理后主诉未明显改善" : "处理完成")}>保存并结束</button></div>
          : unresolvedLedgerProblem && hasSpecificAssessmentGap
            ? <div className="rm-page-actions split"><button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" className="rm-primary" onClick={() => openAssessmentItem(assessmentGap!.assessmentId, "请完成这项检查；完成后会重新安排后续内容。")}>{assessmentGapActionLabel(assessmentGap)}</button></div>
            : unresolvedLedgerProblem
              ? <div className="rm-page-actions three"><button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" className="rm-primary" onClick={() => goToStep(0)}>补充症状信息</button><button type="button" onClick={() => saveRecord("现有检查未形成明确处理方向")}>保存并结束</button></div>
            : <div className="rm-page-actions three"><button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" onClick={editCompletedAssessment}>修改评估答案</button><button type="button" className="rm-primary" onClick={() => goToStep(4)}>{treatmentEmptyState.action}</button></div>}
      </section>
    </section>;
  }
  return <section className="rm-page" data-rehabmind-test="treatment-page" data-planned-retest-action-key={canonicalRetestAction(plannedRetestLabel)}>
    <StepHeading eyebrow="第4步 · 处理与即时复测" title="针对性处理" />
    <OnceHint id="first-retest" active={showingRetest}>再试一次刚才的动作，看看现在有没有变化。</OnceHint>
    {swellingGuidance && trialRecords.length === 0 && activeCandidate?.type !== "swelling" ? <section className="rm-swelling-reminder">
      <span>肿胀管理</span>
      <strong>{intake.swellingLocation || intake.location || "肿胀位置"}</strong>
      <p>{candidateAction(swellingGuidance)}</p>
      <small>不用在每项处理后反复检查；今天晚些时候或明天再比较范围和轮廓。</small>
    </section> : null}

    {!treatmentComplete && activeTarget && activeCandidate ? <>
      <TreatmentRoadmap completed={completedRoadmapItems} current={currentRoadmapItem} upcoming={upcomingRoadmapItems} />
      {activeTargetIsBilateral ? <section className="rm-bilateral-order" data-testid="bilateral-treatment-order" data-priority-side={intake.prioritySide} data-current-side={activeTargetCurrentSide}><b>同一处理单元 · 左右分别执行</b><p>先做{activeTargetCurrentSide ?? intake.prioritySide ?? "优先侧"}，确认没有明显加重后再做另一侧。</p><div>{activeTargetSides.map((side) => <span key={side} data-testid={`bilateral-treatment-${side === "左侧" ? "left" : "right"}`} data-status={activeTargetCompletedSides.includes(side) ? "completed" : side === activeTargetCurrentSide ? "current" : "pending"} className={activeTargetCompletedSides.includes(side) ? "is-done" : side === activeTargetCurrentSide ? "is-current" : ""}>{side}：{activeTargetCompletedSides.includes(side) ? "已完成" : side === activeTargetCurrentSide ? "当前" : "待处理"}</span>)}</div></section> : intake.side === "双侧/中间" && activeTarget.finding.side ? <p className="rm-bilateral-order"><b>本项只处理{activeTarget.finding.side}</b>，另一侧没有对应的处理指征。</p> : null}
      {bilateralNeedsReferral ? <section className="rm-route-note is-waiting"><span>建议线下确认</span><h2>两侧处理后症状加重</h2><p>先停止本轮处理，并让专业人员重新确认。</p></section> : null}
      {!showingRetest && (isResidualReviewStep ? null : activeNewCandidates.length ? <div className="rm-treatment-round">{activeNewCandidates.map((candidate, index) => <TreatmentActionCard key={candidate.id} candidate={candidate} display={treatmentDisplay(candidate, region?.name || intake.location || "当前部位", intake.swellingLocation, activeTreatmentSide)} priorityLabel={activeNewCandidates.length > 1 ? index === 0 ? "先做" : "配合处理" : undefined} controlMotionIds={activeControlMotionIds} />)}</div> : activeDisplay && displayCandidate ? <TreatmentActionCard candidate={displayCandidate} display={activeDisplay} controlMotionIds={activeControlMotionIds} /> : null)}
      {!showingRetest && canShowOptionalProfessionalTreatment && activeTarget.optionalCandidates?.length ? <details className="rm-optional-treatment"><summary>可选处理（{activeTarget.optionalCandidates.length}）</summary><p>核心处理后仍有问题时，再从这里补充。</p><div>{activeTarget.optionalCandidates.map((candidate) => { const selectionKey = optionalTreatmentSelectionKey(activeTarget.id, candidate.id); const added = selectedOptionalCandidateIds.includes(selectionKey); return <button type="button" key={candidate.id} disabled={added} onClick={() => setSelectedOptionalCandidateIds((current) => [...current, selectionKey])}><strong>{candidateTreatmentName(candidate)}</strong><span>{added ? "已加入" : "加入本次处理"}</span></button>; })}</div></details> : null}
       {isTimeBasedTarget ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => finishTrial("partial", true)}>完成这项处理</button></div> : canReuseLatestRetest ? <div className="rm-one-action"><button type="button" className="rm-primary" data-rehabmind-test="retest-reuse-next" data-retest-action-key={canonicalRetestAction(plannedRetestLabel)} onClick={continueWithReusedRetest}>继续下一项</button></div> : isUnspecifiedChiefTarget ? <section className="rm-retest rm-no-action-retest">
        <header><span>本次不做动作评分</span><h2>目前没有确认会引起不适的动作</h2><p>先保存这项处理。活动受限会按该方向的比较方式单独复测，肿胀和压痛留到后续复查。</p></header>
        <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => finishTrial("partial", false, undefined, true)}>完成并继续</button></div>
       </section> : !showingRetest && activeTarget.id === "target:chief" && (chiefImprovedDuringTreatment || chiefRetestCompletedDuringTreatment) && !isBatchRangeTarget ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => finishTrial("same", false, undefined, true)}>完成这项处理，继续下一项</button></div> : !showingRetest ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={handleTreatmentCompletion}>{isResidualReviewStep ? "开始复查" : noRetestNeededAfterLatestResult ? "完成并继续下一项" : activeTargetIsBilateral && activeTargetPendingSides.length ? `完成${activeTargetCurrentSide ?? "当前侧"}，继续另一侧` : activeCandidateGroup.length > 1 ? "本轮处理完成，统一复测" : isRangeTarget ? singleRangeRetestsChief ? "处理完成，复测主诉和活动范围" : "处理完成，复测活动范围" : isStrengthSymptomTarget ? "处理完成，复测发力" : hasClearChiefAction(intake) ? "处理完成，复测原来的动作" : "处理完成，复测这个动作"}</button></div> : intake.side === "双侧/中间" && activeTargetSides.length ? <section className="rm-retest rm-bilateral-retest" data-testid="bilateral-retest-ledger" data-priority-side={intake.prioritySide}><header><span>双侧分别复测</span><h2>分别记录左右两侧处理后的变化</h2><small>同一处理卡只展示一次，但左右结果不能互相覆盖。</small></header><div className="rm-bilateral-side-retest-list">{activeTargetSides.map((side) => { const value = bilateralRetestResponses[side]; const sideKey = side === "左侧" ? "left" : "right"; return <article key={side} data-testid={`bilateral-retest-${sideKey}`} data-status={value ?? "pending"}><strong>{side}</strong><div className="rm-result-grid is-three">{([['better','轻了'],['same','没变化'],['worse','更重']] as const).map(([response, label]) => <button type="button" key={response} data-testid={`bilateral-retest-${sideKey}-${response}`} aria-pressed={value === response} className={value === response ? "is-selected" : ""} onClick={() => setBilateralRetestResponses((current) => ({ ...current, [side]: response }))}>{label}</button>)}</div></article>; })}</div><button type="button" className="rm-primary" data-testid="bilateral-retest-confirm" disabled={activeTargetSides.some((side) => !bilateralRetestResponses[side])} onClick={() => { const responses = activeTargetSides.map((side) => bilateralRetestResponses[side]); const result = responses.includes("worse") ? "worse" : responses.includes("better") ? "better" : "same"; setBilateralNeedsReferral(result === "worse"); finishTrial(result); }}>确认双侧复测</button><p>任一侧加重都停止后续同类处理；只有一侧有改善时，另一侧仍保留为未改善。</p></section> : intake.side === "双侧/中间" ? <section className="rm-retest rm-bilateral-retest"><header><span>整体反馈</span><h2>和刚才比，双侧的疼痛或轻松感有变化吗？</h2></header><div className="rm-result-grid">{([['better','轻了'],['same','没变化'],['worse','更重']] as const).map(([value,label]) => <button type="button" key={value} onClick={() => { setBilateralNeedsReferral(value === "worse"); finishTrial(value); }}>{label}</button>)}</div><p>当前处理没有明确侧别，先记录整体反应。</p></section> : isBatchRangeTarget ? <section className={`rm-retest rm-batch-range-retest rm-followup-retest ${isPatellaCombinedUnit ? "is-combined-patella" : ""}`}>
         {isPatellaCombinedUnit ? <header className="rm-combined-retest-header"><span>同一处理单元 · 完成后立即复测</span><h2>刚才受限的髌骨方向</h2><small>只复测刚才标记受限的方向，并记录活动范围和不适。</small></header> : null}
         {shouldRetestChiefInBatch ? <header><span>复测动作</span><h2>{hasChiefFunctionAction ? chiefFunctionLabels.join("、") : chiefActionLabel(intake)}</h2><strong>处理前 {beforeScore}/10</strong></header> : null}
        {shouldRetestChiefInBatch ? <ScoreSlider compact value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostDiscomfort(value === 0 ? "no" : "yes"); setPostScoreConfirmed(true); }} label="现在的不适程度" context={`处理前 ${beforeScore}/10`} /> : null}
        <section className="rm-followup-range-check">
        <header className="rm-retest-checklist-header"><div><span>复测清单</span><strong>{activeRetestFindings.length}个相关动作</strong></div><small>每个动作只记录一次：先看活动范围，再记录不适程度。</small></header>
        <div className="rm-batch-range-list">{activeRetestFindings.map((finding, index) => {
          const directionId = motionIdFromFinding(finding);
          const selected = movementResponses[directionId];
          const discomfort = movementDiscomforts[directionId];
          const previousRecord = assessmentResults[finding.id];
          const knownDiscomfort = motionWasSymptomatic(directionId, assessmentResults, chiefDirection);
          const previousScore = latestRangeScoreForDirection(directionId) ?? (previousRecord?.discomfort === "yes" ? previousRecord.symptomScore : samePhysicalAction(directionId, chiefDirection) ? beforeScore : undefined);
          const comparison = assessments.find((item) => item.id === finding.id)?.comparison ?? "contralateral";
          const canUsePassive = directionAllowsPassive(directionId);
          const passiveOnly = assessments.find((item) => item.id === finding.id)?.testMode === "passive";
          const rangeRecorded = Boolean(selected);
          const symptomRecorded = knownDiscomfort ? Boolean(movementScoreConfirmed[directionId]) : Boolean(discomfort) && (discomfort !== "yes" || Boolean(movementScoreConfirmed[directionId]));
          return <article key={finding.id} className={rangeRecorded && symptomRecorded ? "is-complete" : "is-pending"}>
            <header><div><span className={chiefDirectionIds.some((id) => samePhysicalAction(directionId, id)) ? "rm-chief-badge" : ""}>{chiefDirectionIds.some((id) => samePhysicalAction(directionId, id)) ? "主诉动作" : `动作 ${index + 1}`}</span><strong>{retestShortTitle(finding)}</strong></div><em>{rangeRecorded && symptomRecorded ? "已记录" : "待记录"}</em></header>
            <section className="rm-retest-field"><div className="rm-retest-field-title"><span>{passiveOnly ? "被动活动范围" : "活动范围"}</span><small>先选一项</small></div><h3>{activeMotionRangeQuestion(finding.id, intake.side === "双侧/中间", passiveOnly)}</h3><AnswerChoiceGrid options={rangeRetestOptions(comparison, canUsePassive, intake.side === "双侧/中间", passiveOnly)} value={selected} onChange={(value) => setMovementResponses((current) => ({ ...current, [directionId]: value }))} /></section>
            {knownDiscomfort ? <section className="rm-retest-score-field"><div className="rm-retest-field-title"><span>不适评分</span><small>参考处理前分数选择现在的程度</small></div><ScoreSlider compact value={movementScores[directionId] ?? 0} selected={Boolean(movementScoreConfirmed[directionId])} onChange={(value) => {
              setMovementDiscomforts((current) => ({ ...current, [directionId]: value === 0 ? "no" : "yes" }));
              setMovementScores((current) => ({ ...current, [directionId]: value }));
              setMovementScoreConfirmed((current) => ({ ...current, [directionId]: true }));
              if (samePhysicalAction(directionId, chiefDirection)) { setPostDiscomfort(value === 0 ? "no" : "yes"); setPostScore(value); setPostScoreConfirmed(true); }
            }} label={passiveOnly ? "现在的被动不适程度" : "现在的不适程度"} context={typeof previousScore === "number" ? `处理前 ${previousScore}/10` : "处理前有不适"} /></section> : <section className="rm-retest-symptom-question"><div className="rm-retest-field-title"><span>{passiveOnly ? "被动活动不适" : "动作不适"}</span><small>再记录现在的感受</small></div><h3>{passiveOnly ? "被动活动时有没有出现新的不适？" : "做这个动作时有没有出现新的不适？"}</h3><div>{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={discomfort === value ? "is-selected" : ""} onClick={() => {
              setMovementDiscomforts((current) => ({ ...current, [directionId]: value }));
              setMovementScores((current) => ({ ...current, [directionId]: 0 }));
              setMovementScoreConfirmed((current) => ({ ...current, [directionId]: value === "no" }));
              if (samePhysicalAction(directionId, chiefDirection)) { setPostDiscomfort(value); setPostScore(0); setPostScoreConfirmed(value === "no"); }
            }}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>
            {discomfort === "yes" ? <ScoreSlider compact value={movementScores[directionId] ?? 0} selected={Boolean(movementScoreConfirmed[directionId])} onChange={(value) => {
              setMovementScores((current) => ({ ...current, [directionId]: value }));
              setMovementScoreConfirmed((current) => ({ ...current, [directionId]: true }));
              if (samePhysicalAction(directionId, chiefDirection)) { setPostScore(value); setPostScoreConfirmed(true); }
            }} label={passiveOnly ? "现在有多不舒服？" : "现在有多不舒服？"} context={typeof previousScore === "number" ? `处理前 ${previousScore}/10` : "处理前未记录不适分数"} /> : null}</section>}
          </article>;
        })}</div>
        <section className={`rm-auto-result is-${batchComplete ? "partial" : "waiting"}`}><span>复测结果</span><strong>{batchResultParts.length ? batchResultParts.join("；") : "请记录每个方向的结果"}</strong><button type="button" data-rehabmind-test="treatment-retest-continue" className="rm-primary" disabled={!batchComplete} onClick={finishRangeBatch}>继续</button></section>
        </section>
      </section> : isRangeTarget ? <section className="rm-retest rm-range-retest">
        {singleRangeRetestsChief ? <>
          <header><span>先复测主诉</span><h2>{chiefActionLabel(intake)}</h2><strong>处理前 {beforeScore}/10</strong></header>
          <ScoreSlider compact value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostScoreConfirmed(true); }} label="现在的不适程度" context={`处理前 ${beforeScore}/10`} />
        </> : null}
        <header><span>{singleRangeRetestsChief ? "再复测活动范围" : activeRangePassiveOnly ? "复测被动活动" : "复测动作"}</span><h2>{activeAssessment?.title ?? retestShortTitle(activeTarget.finding)}</h2></header>
        <h3>{activeMotionRangeQuestion(activeRangeDirection ?? activeTarget.finding.id, intake.side === "双侧/中间", activeRangePassiveOnly)}</h3>
        <AnswerChoiceGrid className="rm-range-result" options={rangeRetestOptions(activeComparison, activeRangeAllowsPassive, intake.side === "双侧/中间", activeRangePassiveOnly)} value={movementResponse || undefined} onChange={(value) => setMovementResponse(value)} />
        {activeRangeWasSymptomatic ? singleRangeRetestsChief && activeRangeDirection
          ? <ScoreSlider compact value={movementScores[activeRangeDirection] ?? 0} selected={singleRangeScoreConfirmed} onChange={(value) => {
            setMovementDiscomforts((current) => ({ ...current, [activeRangeDirection]: value === 0 ? "no" : "yes" }));
            setMovementScores((current) => ({ ...current, [activeRangeDirection]: value }));
            setMovementScoreConfirmed((current) => ({ ...current, [activeRangeDirection]: true }));
          }} label="这个动作现在有多不舒服？" context="与检查时的分数比较" />
          : <ScoreSlider compact value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostDiscomfort(value === 0 ? "no" : "yes"); setPostScoreConfirmed(true); }} label="现在的不适程度" context={`处理前 ${beforeScore}/10`} />
        : <section className="rm-retest-symptom-question"><h3>做这个动作时有没有出现新的不适？</h3><div>{(["no", "yes"] as YesNo[]).map((value) => {
          const selected = singleRangeRetestsChief ? singleRangeDiscomfort : postDiscomfort;
          return <button type="button" key={value} className={selected === value ? "is-selected" : ""} onClick={() => {
            if (singleRangeRetestsChief && activeRangeDirection) {
              setMovementDiscomforts((current) => ({ ...current, [activeRangeDirection]: value }));
              setMovementScores((current) => ({ ...current, [activeRangeDirection]: 0 }));
              setMovementScoreConfirmed((current) => ({ ...current, [activeRangeDirection]: value === "no" }));
            } else {
              setPostDiscomfort(value);
              setPostScore(0);
              setPostScoreConfirmed(value === "no");
            }
          }}>{value === "yes" ? "有不适" : "没有不适"}</button>;
        })}</div>{(singleRangeRetestsChief ? singleRangeDiscomfort : postDiscomfort) === "yes" ? singleRangeRetestsChief && activeRangeDirection
          ? <ScoreSlider compact value={movementScores[activeRangeDirection] ?? 0} selected={singleRangeScoreConfirmed} onChange={(value) => { setMovementScores((current) => ({ ...current, [activeRangeDirection]: value })); setMovementScoreConfirmed((current) => ({ ...current, [activeRangeDirection]: true })); }} label="现在有多不舒服？" context="处理前没有不适" />
          : <ScoreSlider compact value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostScoreConfirmed(true); }} label="现在有多不舒服？" context={`处理前 ${beforeScore}/10`} />
        : null}</section>}
        <section className={`rm-auto-result is-${movementResponse === "both-match" ? "better" : ["passive-match-active-limited", "better-passive-limited", "passive-limited"].includes(movementResponse) ? "partial" : movementResponse || "waiting"}`}><span>复测结果</span><strong>{movementResponse === "both-match"
          ? `${activeRangePassiveOnly ? "被动范围" : activeRangeAllowsPassive ? "主动和被动范围" : "主动范围"}已接近${activeComparisonTarget}`
          : movementResponse === "passive-match-active-limited"
            ? `被动范围接近${activeComparisonTarget}，主动范围仍偏小`
            : movementResponse === "better-passive-limited"
              ? activeRangePassiveOnly
                ? `被动范围有改善，仍未接近${activeComparisonTarget}`
                : activeRangeAllowsPassive ? `主动有改善，被动仍未接近${activeComparisonTarget}` : `主动范围有改善，仍未接近${activeComparisonTarget}`
            : movementResponse === "passive-limited"
              ? `${activeRangePassiveOnly || activeRangeAllowsPassive ? "被动范围" : "主动范围"}仍小于${activeComparisonTarget}`
            : movementResponse === "worse"
              ? "活动范围比处理前更小或更痛"
              : `请选择处理后与${activeComparisonTarget}相比的活动范围`}</strong><button type="button" className="rm-primary" disabled={!movementResponse || (singleRangeRetestsChief && !postScoreConfirmed) || !(singleRangeRetestsChief ? singleRangeDiscomfort : postDiscomfort) || ((singleRangeRetestsChief ? singleRangeDiscomfort : postDiscomfort) === "yes" && !(singleRangeRetestsChief ? singleRangeScoreConfirmed : postScoreConfirmed))} onClick={() => {
                if (movementResponse === "both-match") finishTrial("better");
                else {
                  const nextCandidateType = nextRangeCandidateType(movementResponse, activeRangeAllowsPassive && canMobilizeJoint);
                  if (nextCandidateType) finishTrial("partial", false, nextCandidateType);
                  else finishTrial("worse");
                }
              }}>继续</button></section>
      </section> : <section className="rm-retest">
        <header><span>复测动作</span><h2>{retestActionTitle}</h2></header>
        {activeFunctionObligations.length ? <section className="rm-function-retest-list" data-testid="function-retest-obligations">
          {activeFunctionObligations.map((obligation) => {
            const answer = treatmentFunctionRetests[obligation.assessmentId] ?? { completion: "" };
            return <article key={obligation.assessmentId} data-assessment-id={obligation.assessmentId}>
              <header><span>复测动作</span><h3>{obligation.label}</h3></header>
              <p className="rm-choice-hint">从头做到尾就算完成；可以借力，姿势不需要完全标准。</p>
              <div className="rm-result-grid is-two">{([['complete', '能完成'], ['unable', '还是做不完']] as const).map(([value, label]) => <button type="button" key={value} className={answer.completion === value ? "is-selected" : ""} onClick={() => updateFunctionRetest(obligation.assessmentId, { completion: value, unableReason: value === "complete" ? undefined : answer.unableReason, score: value === "unable" ? undefined : answer.score, scoreConfirmed: value === "unable" ? false : answer.scoreConfirmed })}>{label}</button>)}</div>
              {answer.completion === "unable" ? <div className="rm-function-retest-reason"><strong>主要是什么原因？</strong><div className="rm-result-grid is-two">{([['pain', '疼或不舒服'], ['weak', '没力或撑不住'], ['fear', '担心继续会加重']] as const).map(([value, label]) => <button type="button" key={value} className={answer.unableReason === value ? "is-selected" : ""} onClick={() => updateFunctionRetest(obligation.assessmentId, { unableReason: value })}>{label}</button>)}</div></div> : null}
              {obligation.mode === "ordinary" && answer.completion === "complete" ? <ScoreSlider compact value={answer.score ?? 0} selected={answer.scoreConfirmed ?? false} onChange={(score) => updateFunctionRetest(obligation.assessmentId, { score, scoreConfirmed: true })} label="现在有多不舒服？" context={typeof obligation.baselineScore === "number" ? scoreBeforeContext(obligation.baselineScore) : undefined} /> : null}
              {obligation.mode === "completion-status" ? <div className="rm-retest-mode-note"><strong>{FUNCTION_COMPLETION_RETEST_COPY.title}</strong><span>{FUNCTION_COMPLETION_RETEST_COPY.description}</span></div> : null}
            </article>;
          })}
        </section> : isFunctionTarget ? <section className="rm-motion-answer-block">
          <h3>现在这个动作能完成了吗？</h3>
          <p className="rm-choice-hint">以「动作能从头做到尾」为准，姿势不标准、有借力也算完成。</p>
          <div className="rm-result-grid is-two">{([["complete", "能完成"], ["unable", "还是做不完"]] as const).map(([value, label]) => <button type="button" key={value} className={functionRetestCompletion === value ? "is-selected" : ""} onClick={() => { setFunctionRetestCompletion(value); if (value === "complete") setFunctionRetestUnableReason(""); }}>{label}</button>)}</div>
          {functionRetestCompletion === "unable" ? <section className="rm-motion-answer-block is-followup">
            <h3>主要是什么原因？</h3>
            <div className="rm-result-grid is-two">{([["pain", "疼或不舒服"], ["weak", "没力或撑不住"], ["fear", "担心继续会加重"]] as const).map(([value, label]) => <button type="button" key={value} className={functionRetestUnableReason === value ? "is-selected" : ""} onClick={() => setFunctionRetestUnableReason(value)}>{label}</button>)}</div>
          </section> : null}
        </section> : null}
        {postScoreConfirmed ? <div className="rm-track">
          <div><span>处理前</span><b>{beforeScore}<small>/10</small></b><i style={{ "--dot": `${beforeScore * 10}%` } as CSSProperties} /></div>
          <div className="rm-track-change"><strong>{change.delta > 0 ? `下降 ${change.delta} 分` : change.delta < 0 ? `上升 ${Math.abs(change.delta)} 分` : "分数未变"}</strong><span>{change.percent !== null ? `${change.percent > 0 ? "+" : ""}${change.percent}%` : "不计算比例"}</span></div>
          <div><span>处理后</span><b>{postScore}<small>/10</small></b><i style={{ "--dot": `${postScore * 10}%` } as CSSProperties} /></div>
        </div> : null}
        {activeFunctionObligations.length ? null : chiefScoreRetestBlocked ? <div className="rm-retest-mode-note"><strong>这次不需要重新打分</strong><span>前面没有完整做过同一个动作，现在只记录能不能完成。</span></div> : !functionRetestIsCompletionOnly ? <ScoreSlider compact value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostDiscomfort(value === 0 ? "no" : "yes"); setPostScoreConfirmed(true); }} label={isStrengthSymptomTarget ? "现在的发力不适程度" : "现在的不适程度"} context={scoreBeforeContext(beforeScore)} /> : <div className="rm-retest-mode-note"><strong>{FUNCTION_COMPLETION_RETEST_COPY.title}</strong><span>{FUNCTION_COMPLETION_RETEST_COPY.description}</span></div>}
         <section className={`rm-auto-result is-${retestReady ? automaticResult : "waiting"}`}><span>复测结果</span><strong>{activeFunctionObligations.length ? !retestReady ? "请完成每个动作的复测" : automaticResult === "worse" ? "有动作比处理前更难完成" : automaticResult === "better" ? "这些动作都比处理前更容易完成" : automaticResult === "partial" ? "部分动作有改善" : "这些动作暂时没有明显变化" : !retestReady ? (functionRetestIsCompletionOnly ? "请选择动作完成状态" : "请选择复测分数") : functionRetestState.automaticResult === "worse" ? "动作从能完成变成做不完，需要先停止" : chiefScoreRetestBlocked ? "已记录当前完成情况" : functionRetestIsCompletionOnly ? automaticResult === "partial" ? "现在已经可以完成" : "目前仍未完成" : automaticResult === "better" ? `比处理前下降 ${change.delta} 分` : automaticResult === "worse" ? `比处理前上升 ${Math.abs(change.delta)} 分` : "与处理前相同"}</strong><button type="button" data-rehabmind-test="treatment-retest-continue" className="rm-primary" disabled={!retestReady} onClick={() => finishTrial(automaticResult)}>继续</button></section>
      </section>}
      <div className="rm-treatment-back">{showingRetest ? <button type="button" className="rm-retest-return" onClick={returnFromRetestToTreatment}>返回刚才的处理</button> : null}{finishSnapshots.length ? <button type="button" onClick={undoLastFinish}>撤销上一步</button> : null}<button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" onClick={editCompletedAssessment}>修改评估答案</button></div>
    </> : finalChiefRetestFragment ? finalChiefRetestFragment : treatmentWorsened ? <section className="rm-complete-panel is-referral"><span>处理已停止</span><h2>刚才的处理使症状或活动表现加重</h2><p>不要继续叠加处理或增加训练难度。请重新确认刚才加重的动作和位置；无法判断时保存记录并请专业人员协助。</p><div className="rm-page-actions three"><button type="button" className="rm-primary" onClick={() => reopenAssessment("已返回本次评估；请重新确认刚才加重的动作和症状。")}>重新评估</button><button type="button" onClick={() => goToStep(0)}>补充症状信息</button><button type="button" onClick={() => saveRecord("处理后加重，待重新评估")}>保存并结束</button></div></section> : bilateralNeedsReferral ? <section className="rm-complete-panel is-referral"><span>处理复测结束</span><h2>两侧处理后症状加重</h2><p>先停止本轮处理，建议由专业人员重新评估，再决定是否继续训练。</p><div className="rm-page-actions split"><button type="button" onClick={() => reopenAssessment()}>重新评估</button><button type="button" className="rm-primary" onClick={() => saveRecord("待医学评估")}>保存并结束本次</button></div></section> : persistentStabbing ? <section className="rm-complete-panel is-referral"><span>处理复测结束</span><h2>刺痛仍然存在</h2><div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>已保留有效处理方向</small></div><p>相关的自助处理已经完成。原动作仍会刺痛，建议先做线下专业评估，再决定后续训练。</p><div className="rm-page-actions split"><button type="button" onClick={() => reopenAssessment()}>重新评估</button><button type="button" className="rm-primary" onClick={() => saveRecord("待医学评估")}>保存并结束本次</button></div></section> : <section className={`rm-complete-panel ${noImmediateTreatmentResponse ? "is-caution" : ""}`}><span>本阶段成果</span><h2>{chiefComplaintLabel(intake)}</h2>{chiefScoreComparable ? <div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>下降 {Math.max(0, intake.baselineScore - lastChiefScore)} 分</small></div> : intake.side === "双侧/中间" && hasClearChiefAction(intake) ? <div className="rm-no-score-summary"><strong>已分别记录两侧的整体感受</strong></div> : <p>已记录本次活动和症状变化。</p>}<StageOutcomeSections effectiveFocusLabels={effectiveFocusLabels} effectiveControlLabels={effectiveControlLabels} recoveredRangeLabels={recoveredRangeLabels} improvedRangeLabels={improvedRangeLabels} trackObservationLabels={trackObservationLabels} strengthProblemTitles={weakStrengthProblems.map((finding) => finding.title)} />{noImmediateTreatmentResponse ? <section className="rm-no-response-note"><strong>本次试处理没有改变不适</strong><p>先不要增加训练难度；今天只保留轻柔的基础活动。症状持续不变、变重或影响承重时，建议线下重新评估。</p></section> : null}<div className="rm-page-actions split"><button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" className="rm-primary" onClick={() => goToStep(4)}>{noImmediateTreatmentResponse ? "查看轻柔的基础活动" : "查看训练与居家方案"}</button></div></section>}
  </section>;
}
