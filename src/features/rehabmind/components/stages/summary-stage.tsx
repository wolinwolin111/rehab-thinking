import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { AnswerChoiceGrid, ScoreHistory, ScoreSlider, StepHeading, TreatmentRoadmap } from "@/src/features/rehabmind/components/shared/ui-primitives";
import { NextSessionCard } from "@/src/features/rehabmind/components/stages/shared/next-session-card";
import MuscleRegionLocationPicker from "@/src/features/rehabmind/components/assessment/muscle-region-location-picker";
import { resultFromScore } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { CompletedRangeRetestAnswer, TrialRecord, TrialResult, YesNo } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { resolvedTreatmentCombination, treatmentResponsePriority } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefChangeExplanation } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { sessionScoreTrend, type RehabSessionSummary } from "@/src/features/rehabmind/workflow/session-history";
import { professionalAssessmentTitle } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import { actionIdFromFinding, anyMotionIdFromFinding, canonicalActionIdFromAssessmentId, dedupeAssessmentIdsByAction, dedupeRetestFindingsByAction, motionIdFromFinding, motionWasSymptomatic, samePhysicalAction, valueForPhysicalAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { needsTrainingToleranceRetest, needsTreatmentFinalChiefRetest, treatmentMustStop } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { formatRecommendedDateRange, recommendNextSession } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { compareFollowupScore, complaintShiftNotice, followupRedFlagSignal, trendScoreContradiction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { candidateTreatmentKey } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { candidateAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefActionLabel, chiefMotionDirectionId, chiefMotionDirectionIds, hasClearChiefAction, reportedActionSummary } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { pendingTrainingFeedback, trainingFeedbackComplete } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { functionCompletionValue, functionDiscomfortValue } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { LocalLimbDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { TissuePathwayDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { tissueReferralAdvice } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { HomeRelaxationTarget } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { AdverseSource, AdverseTiming } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { BodyMark } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { FullCandidate, FullExercise, FullRegion } from "@/src/knowledge/pilot/full-demo-content";
import type { ExerciseFeedback } from "@/src/features/rehabmind/controllers/use-training-flow";
import type { TreatmentFunctionRetestAnswer } from "@/src/features/rehabmind/controllers/use-function-retest";
import type { FunctionRetestObligation } from "@/src/domain/rehab/treatment/trial-record-types";
import { functionRetestAnswerKey, summarizeFunctionRetestObligations } from "@/src/domain/rehab/retest/retest-obligation-core";
import type { RetestObligation, RetestRecord } from "@/src/domain/rehab/retest/retest-ledger-core";
import {
  type AssessmentItem,
  type AssessmentRecord,
  type Finding,
  type FollowupExerciseChoice,
  type FollowupNewSymptomAnswer,
  type FollowupReviewAnswer,
  type FollowupStage,
  type FollowupTreatmentRecord,
  type IntakeState,
  type RetestPlan,
  type SavedDemoRecord,
  type SavedDemoSnapshot,
  type Step,
  type TreatmentProblem,
  DEFAULT_INTAKE,
  TreatmentActionCard,
  activeMotionRangeQuestion,
  chiefComplaintLabel,
  effectiveProvocationTypes,
  motionComparisonTarget,
  professionalFindingLabel,
  rangeRetestOptions,
  retestConditionLabel,
  tensionLocationOptions,
  treatmentDisplay,
} from "@/src/features/rehabmind/components/workbench/workbench-support";

type FunctionActionSummary = {
  id: string;
  label: string;
  initial: string;
  retest: string;
  retested: boolean;
};

function functionActionSummaries(
  assessmentResults: Record<string, AssessmentRecord>,
  assessments: AssessmentItem[],
  retestObligations: RetestObligation[],
  retestRecords: RetestRecord[],
): FunctionActionSummary[] {
  return Object.entries(assessmentResults).flatMap<FunctionActionSummary>(([assessmentId, record]) => {
    if (!assessmentId.startsWith("function:")) return [];
    const completion = functionCompletionValue(record);
    if (!completion || completion === "skip") return [];
    const label = assessments.find((item) => item.id === assessmentId)?.title
      ?? assessmentId.replace(/^function:/, "");
    const initial = completion === "unable"
      ? record.functionUnableReason === "weak" ? "第一次因没力没有做完" : "第一次因不舒服没有做完"
      : functionDiscomfortValue(record) === "yes" && typeof record.symptomScore === "number"
        ? `第一次能完成，不适 ${record.symptomScore}/10`
        : functionDiscomfortValue(record) === "yes" ? "第一次能完成，但有不适" : "第一次能完成";
    const obligations = retestObligations.filter((item) => item.sourceAssessmentId === assessmentId && !["cancelled", "superseded"].includes(item.status));
    if (!obligations.length) return [{ id: assessmentId, label, initial, retest: "这次不需要复查", retested: true }];
    const results = obligations.flatMap((obligation) => retestRecords
      .filter((item) => item.obligationId === obligation.obligationId)
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
      .slice(-1)
      .map((record) => ({ obligation, record })));
    if (results.length !== obligations.length) return [{ id: assessmentId, label, initial, retest: "本次未复查", retested: false }];
    const retestLabel = results.map(({ obligation, record }) => {
      const side = obligation.side ? `${obligation.side}：` : "";
      if (record.completion === "unable") return `${side}${record.unableReason === "weak" ? "仍因没力做不完" : "仍然做不完"}`;
      if (obligation.baselineCompletion === "unable") return `${side}现在可以完成`;
      if (typeof obligation.baselineScore === "number" && typeof record.score === "number") {
        return `${side}${record.score < obligation.baselineScore ? `不适降到 ${record.score}/10` : record.score > obligation.baselineScore ? `更不舒服，${record.score}/10` : `仍为 ${record.score}/10`}`;
      }
      return `${side}已完成复查`;
    }).join("，");
    return [{ id: assessmentId, label, initial, retest: retestLabel, retested: true }];
  });
}

function ChiefSummaryContent({
  intake,
  assessmentResults,
  assessments,
  retestObligations,
  retestRecords,
  completed = false,
}: {
  intake: IntakeState;
  assessmentResults: Record<string, AssessmentRecord>;
  assessments: AssessmentItem[];
  retestObligations: RetestObligation[];
  retestRecords: RetestRecord[];
  completed?: boolean;
}) {
  const functionActions = functionActionSummaries(assessmentResults, assessments, retestObligations, retestRecords);
  if (functionActions.length) return <div className="rm-chief-action-summary rm-function-action-summary">
    <span>本次动作变化</span>
    <ul>{functionActions.map((action) => <li key={action.id} className={action.retested ? "is-retested" : "is-pending"}>
      <strong>{action.label}</strong>
      <small>{action.initial}</small>
      <em>{action.retest}</em>
    </li>)}</ul>
  </div>;
  const actions = reportedActionSummary(intake);
  if (actions.length > 1) return <div className="rm-chief-action-summary">
    <span>本次不舒服的动作</span>
    <ul>{actions.map((action) => <li key={action}>{action}</li>)}</ul>
    {completed ? <p>本次记录已保存。</p> : null}
  </div>;
  return <div>
    <span>{hasClearChiefAction(intake) ? "本次主诉" : "本次症状信息"}</span>
    <h2>{chiefComplaintLabel(intake)}</h2>
    {completed ? <p>本次康复已经保存</p> : actions.length ? null : <p>这次没有固定的加重动作</p>}
  </div>;
}

export type SummaryStageView = {
  intake: IntakeState;
  assessmentResults: Record<string, AssessmentRecord>;
  trialRecords: TrialRecord[];
  retestObligations: RetestObligation[];
  retestRecords: RetestRecord[];
  exerciseFeedback: Record<string, ExerciseFeedback>;
  trainingComplete: boolean;
  trainingPlanSaved: boolean;
  followupMode: boolean;
  sessionHistory: RehabSessionSummary[];
  bodyMarks: BodyMark[];
  region?: FullRegion;
  findings: Finding[];
  treatmentProblems: TreatmentProblem[];
  treatmentWorsened: boolean;
  chiefScoreComparable: boolean;
  sessionEndScore: number;
  effectiveFocusLabels: string[];
  effectiveControlLabels: string[];
  exerciseStage: number;
  exercises: FullExercise[];
  homeRelaxationTargets: HomeRelaxationTarget[];
  hasSafetySignal: boolean;
  hasClearance: boolean;
  structuralImagingSignal: boolean;
  assessmentNeedsReferral: boolean;
  sessionNumber: number;
  followupScore: number;
  followupScoreConfirmed: boolean;
  followupStage: FollowupStage;
  followupPostScore: number;
  followupPostScoreConfirmed: boolean;
  followupPostDiscomfort: "" | YesNo;
  followupCandidateId: string;
  followupTrialRecords: FollowupTreatmentRecord[];
  followupReadyToRetest: boolean;
  followupRetestPlan: RetestPlan | null;
  followupMovementResponses: Record<string, CompletedRangeRetestAnswer>;
  followupMovementDiscomforts: Record<string, YesNo>;
  followupMovementScores: Record<string, number>;
  followupMovementScoreConfirmed: Record<string, boolean>;
  followupTensionLocations: string[];
  followupExerciseChoices: Record<string, FollowupExerciseChoice>;
  followupTrainingReadyForRetest: boolean;
  followupFinalScore: number;
  followupFinalScoreConfirmed: boolean;
  outstandingFunctionRetests: FunctionRetestObligation[];
  treatmentFunctionRetests: Record<string, TreatmentFunctionRetestAnswer>;
  hasNewSymptom: FollowupNewSymptomAnswer;
  followupTrends: Record<string, FollowupReviewAnswer>;
  assessments: AssessmentItem[];
  previousSessionForReview?: RehabSessionSummary;
  previousSessionScore?: number;
  localLimbDecision: LocalLimbDecision | null;
  tissuePathway: TissuePathwayDecision;
  swellingGuidance?: FullCandidate;
  followupCandidates: FullCandidate[];
  latestRangeScoreForDirection: (directionId: string) => number | undefined;
  directionAllowsPassive: (directionId: string) => boolean;
  directionNeedsCandidate: (candidate: FullCandidate, directionId: string, outcomes?: Record<string, CompletedRangeRetestAnswer>) => boolean;
  followupRetestIds: (candidate: FullCandidate) => string[];
  followupCandidateNeedsWork: (candidate: FullCandidate, outcomes: Record<string, CompletedRangeRetestAnswer>) => boolean;
};

export type SummaryStageActions = {
  onStepChange: Dispatch<SetStateAction<Step>>;
  onFollowupModeChange: Dispatch<SetStateAction<boolean>>;
  onFollowupStageChange: Dispatch<SetStateAction<FollowupStage>>;
  onFollowupPostScoreChange: Dispatch<SetStateAction<number>>;
  onFollowupPostScoreConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onFollowupPostDiscomfortChange: Dispatch<SetStateAction<"" | YesNo>>;
  onFollowupCandidateIdChange: Dispatch<SetStateAction<string>>;
  onFollowupReadyToRetestChange: Dispatch<SetStateAction<boolean>>;
  onFollowupRetestPlanChange: Dispatch<SetStateAction<RetestPlan | null>>;
  onFollowupMovementResponsesChange: Dispatch<SetStateAction<Record<string, CompletedRangeRetestAnswer>>>;
  onFollowupMovementDiscomfortsChange: Dispatch<SetStateAction<Record<string, YesNo>>>;
  onFollowupMovementScoresChange: Dispatch<SetStateAction<Record<string, number>>>;
  onFollowupMovementScoreConfirmedChange: Dispatch<SetStateAction<Record<string, boolean>>>;
  onFollowupTensionLocationsChange: Dispatch<SetStateAction<string[]>>;
  onFollowupExerciseChoicesChange: Dispatch<SetStateAction<Record<string, FollowupExerciseChoice>>>;
  onFollowupTrainingReadyForRetestChange: Dispatch<SetStateAction<boolean>>;
  onFollowupFinalScoreChange: Dispatch<SetStateAction<number>>;
  onFollowupFinalScoreConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onTreatmentFunctionRetestsChange: Dispatch<SetStateAction<Record<string, TreatmentFunctionRetestAnswer>>>;
  onFinishOutstandingFunctionRetests: () => void;
  onHasNewSymptomChange: Dispatch<SetStateAction<FollowupNewSymptomAnswer>>;
  onGoToStep: (next: Step) => void;
  onReturnFromFollowupRetestToTreatment: () => void;
  onReopenAssessment: (message?: string) => void;
  onBeginAdverseReassessment: (input: { source: AdverseSource; sourceId: string; sourceLabel: string; timing: AdverseTiming; beforeScore: number; afterScore: number; relatedAssessmentIds: string[] }) => void;
  onSaveRecord: (status?: SavedDemoRecord["status"], latestScoreOverride?: number, snapshotOverrides?: Partial<SavedDemoSnapshot>) => void;
  onInvalidateAfterIntake: (nextOrUpdater: IntakeState | ((current: IntakeState) => IntakeState)) => void;
  onRecordFollowupTrial: (result: TrialResult, timeBased?: boolean, rangeOutcomes?: Record<string, CompletedRangeRetestAnswer>, rangeDiscomforts?: Record<string, YesNo>, rangeScores?: Record<string, number>) => void;
  onInvalidateCurrentFollowupWork: () => void;
  onUpdateFollowupScore: (value: number) => void;
  onUpdateFollowupTrend: (id: string, value: FollowupReviewAnswer) => void;
  onFinishFollowupTreatmentRetest: () => void;
  onCompleteFollowupSession: () => void;
  onStartNextFollowupSession: () => void;
  onStartSecondSession: () => void;
};

export function SummaryStage({ view, actions }: { view: SummaryStageView; actions: SummaryStageActions }) {
  const {
    intake, assessmentResults, trialRecords, retestObligations, retestRecords, exerciseFeedback, trainingComplete, trainingPlanSaved,
    followupMode, sessionHistory, bodyMarks, region, findings, treatmentProblems, treatmentWorsened,
    chiefScoreComparable, sessionEndScore, effectiveFocusLabels, effectiveControlLabels,
    exerciseStage, exercises, homeRelaxationTargets, hasSafetySignal, hasClearance,
    structuralImagingSignal, assessmentNeedsReferral, sessionNumber, followupScore,
    followupScoreConfirmed, followupStage, followupPostScore, followupPostScoreConfirmed,
    followupPostDiscomfort, followupCandidateId, followupTrialRecords, followupReadyToRetest,
    followupRetestPlan, followupMovementResponses, followupMovementDiscomforts,
    followupMovementScores, followupMovementScoreConfirmed, followupTensionLocations,
    followupExerciseChoices, followupTrainingReadyForRetest, followupFinalScore,
    followupFinalScoreConfirmed, outstandingFunctionRetests, treatmentFunctionRetests, hasNewSymptom, followupTrends, assessments,
    previousSessionForReview, previousSessionScore, localLimbDecision, tissuePathway,
    swellingGuidance, followupCandidates, latestRangeScoreForDirection, directionAllowsPassive,
    directionNeedsCandidate, followupRetestIds, followupCandidateNeedsWork,
  } = view;
  const {
    onStepChange: setStep, onFollowupModeChange: setFollowupMode,
    onFollowupStageChange: setFollowupStage, onFollowupPostScoreChange: setFollowupPostScore,
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
    onHasNewSymptomChange: setHasNewSymptom, onGoToStep: goToStep,
    onReturnFromFollowupRetestToTreatment: returnFromFollowupRetestToTreatment,
    onReopenAssessment: reopenAssessment, onBeginAdverseReassessment: beginAdverseReassessment,
    onSaveRecord: saveRecord, onInvalidateAfterIntake: invalidateAfterIntake,
    onRecordFollowupTrial: recordFollowupTrial,
    onInvalidateCurrentFollowupWork: invalidateCurrentFollowupWork,
    onUpdateFollowupScore: updateFollowupScore, onUpdateFollowupTrend: updateFollowupTrend,
    onFinishFollowupTreatmentRetest: finishFollowupTreatmentRetest,
    onCompleteFollowupSession: completeFollowupSession,
    onStartNextFollowupSession: startNextFollowupSession,
    onStartSecondSession: startSecondSession,
  } = actions;

  // T-03：复查红旗最小重检（麻电/放射、进行性加重），按次重置，不阻断流程。
  const [redFlagAnswers, setRedFlagAnswers] = useState<{ session: number; numbnessOrRadiation: string; progressiveWeakness: string }>({ session: sessionNumber, numbnessOrRadiation: "", progressiveWeakness: "" });
  const effectiveRedFlags = redFlagAnswers.session === sessionNumber ? redFlagAnswers : { session: sessionNumber, numbnessOrRadiation: "", progressiveWeakness: "" };
  const redFlagReview = followupRedFlagSignal(effectiveRedFlags);
  const updateRedFlag = (key: "numbnessOrRadiation" | "progressiveWeakness", value: string) => setRedFlagAnswers({ ...effectiveRedFlags, session: sessionNumber, [key]: value });
  // T-06：逐项趋势与确认分数反向矛盾时提醒复核。
  const trendContradiction = trendScoreContradiction({
    trends: Object.values(followupTrends),
    comparison: compareFollowupScore({ currentScore: followupScore, currentConfirmed: followupScoreConfirmed, previousScore: previousSessionScore }),
  });
  // T-07：本次主诉部位与上次记录不同时给出比对提醒。
  const complaintShift = complaintShiftNotice({ currentLocation: intake.location, previousLocation: previousSessionForReview?.location });

  function followupDecision(reviewComplete: boolean) {
  const values = Object.values(followupTrends);
  if (hasNewSymptom === "yes") return { tone: "review", title: "回到相关评估", text: "先确认新症状的发生过程和安全信息，再决定是否沿用原方案。" };
  if (!hasNewSymptom) return { tone: "pending", title: "先确认本次有没有新情况", text: "确认后再复查上次结束时仍存在的问题。" };
  if (!reviewComplete || (chiefScoreComparable && !followupScoreConfirmed)) return { tone: "pending", title: "先完成本次复查", text: "本次答案完成后，再与上次康复结束状态比较。" };
  const scoreComparison = compareFollowupScore({
    currentScore: followupScore,
    currentConfirmed: followupScoreConfirmed,
    previousScore: previousSessionScore,
  });
  if (!chiefScoreComparable) {
    if (values.includes("worse")) return { tone: "reduce", title: "降低刺激并重新评估", text: "不要继续增加同一处理力度或训练量，回查活动、局部反应和遗漏因素。" };
    if (followupCandidates.length) return { tone: "hold", title: "复查后继续上次有效处理", text: "先快速比较相关活动范围，再继续上次有效的轻柔松解，最后进入训练。" };
    if (values.includes("better")) return { tone: "progress", title: "继续有效方向", text: "保留出现改善的活动或训练，一次只进阶一个变量。" };
    return { tone: "hold", title: "保持当前方案", text: "继续复查还存在的问题，训练组数和个数暂时不变。" };
  }
  if (scoreComparison === "worse" || values.includes("worse")) return { tone: "reduce", title: "本次状态比上次差", text: "先完成本次评估，不沿用旧结论直接增加处理或训练。" };
  if (followupCandidates.length) return { tone: "hold", title: "复查后继续上次有效处理", text: "先快速比较相关活动范围，再继续上次有效的轻柔松解，最后进入训练。" };
  if (scoreComparison === "better" && values.filter((item) => item === "better").length >= 1) return { tone: "progress", title: "继续处理，并推进一个变量", text: "仍存在的活动或疼痛问题继续处理；训练一次只进阶一个变量。" };
  return { tone: "hold", title: "保持当前方案", text: "继续复查还存在的问题，训练组数和个数暂时不变。" };
  }

  function renderFollowup() {
    
  const completedSessionScores = sessionScoreTrend(sessionHistory).map((item) => item.score);
  const history = [intake.baselineScore, ...(completedSessionScores.length ? completedSessionScores : [sessionEndScore])];
  const scoreTrend = sessionScoreTrend(sessionHistory);
  const previousSession = sessionHistory.find((item) => item.sessionNumber === sessionNumber - 1) ?? sessionHistory.at(-1);
  const previousFocus = previousSession?.nextFocus.map((focus) => {
    const strength = region?.strengths.find((item) => focus.includes(item.id));
    const functional = region?.functions.find((item) => focus.includes(item.id));
    const assessment = [...(region?.directions ?? []), ...(region?.specialTests ?? [])].find((item) => focus.includes(item.id));
    const matched = strength ?? functional ?? assessment;
    return matched ? focus.replace(matched.id, matched.title) : focus;
  }) ?? [];
  const chiefWasRecorded = hasClearChiefAction(intake);
  const hasChiefAction = chiefScoreComparable && chiefWasRecorded;
  const chiefRetestUnavailableTitle = intake.side === "双侧/中间"
    ? "分别看两侧的变化"
    : reportedActionSummary(intake).length > 1
      ? "逐项查看不舒服的动作"
      : chiefWasRecorded
        ? "先完成这个动作的第一次记录"
        : "这次没有固定的加重动作";
  const chiefRetestUnavailableText = intake.side === "双侧/中间"
    ? "分别记录两侧的感受、活动范围和动作质量。"
    : reportedActionSummary(intake).length > 1
      ? "下面会按实际做过的动作逐项查看变化。"
      : chiefWasRecorded
        ? "先复查已经记录的活动范围、症状和动作质量。"
        : "先复查活动度、肿胀或按压痛等已有问题。";
  const followupTrainingNeedsChiefRetest = needsTrainingToleranceRetest({
    comparableChief: hasChiefAction,
    immediateTiming: tissuePathway.retestTiming === "same-session",
  });
  const localReviewIdSet = new Set(localLimbDecision?.reviewIds ?? []);
  // 已明确恢复的项目不在下一次机械重复；上一轮没有记录到的必要基础项
  // 仍可出现，不能把“缺少记录”误当成已经恢复。
  const wasUnresolvedLastSession = (id: string) => previousSessionForReview?.reviewResults.find((item) => item.id === id)?.result !== "better";
  const remainingMotionReviews = Array.from(new Map(findings
    .filter((finding) => !finding.internal && finding.id.startsWith("motion:"))
    .filter((finding) => !localLimbDecision || localReviewIdSet.has(motionIdFromFinding(finding)))
    .filter((finding) => wasUnresolvedLastSession(finding.id))
    .map((finding) => {
      const directionId = anyMotionIdFromFinding(finding)!;
      const assessment = assessments.find((item) => item.id === `motion:${directionId}`);
      const title = assessment?.title ?? finding.title.split(/：|范围偏小/)[0];
      return [directionId, [`motion:${directionId}`, title, assessment?.how ?? "按第一次相同的动作再做一次"] as [string, string, string]];
    })).values());
  const strengthAndFunctionReviews: Array<[string, string, string]> = (previousSessionForReview?.reviewResults ?? [])
    .filter((item) => item.result !== "better" && (item.id.startsWith("strength:") || item.id.startsWith("function:")))
    .flatMap((item) => {
      const direct = assessments.find((assessment) => assessment.id === item.id);
      const paired = assessments.find((assessment) => assessment.pairedStrengthId === item.id);
      if (direct) return [[direct.id, direct.title, direct.how] as [string, string, string]];
      if (paired) {
        const rawId = item.id.replace(/^strength:/, "");
        const source = region?.strengths.find((assessment) => assessment.id === rawId);
        return [[item.id, paired.pairedStrengthTitle ?? item.label, source?.how ?? paired.how] as [string, string, string]];
      }
      return [];
    })
    .filter((item, index, list) => list.findIndex((entry) => entry[0] === item[0]) === index);
  const reviewItems: Array<[string, string, string]> = [
    ...remainingMotionReviews,
    ...strengthAndFunctionReviews,
    ...(intake.symptoms.includes("肿胀或淤青") && wasUnresolvedLastSession("swelling") ? [["swelling", `肿胀：${intake.swellingLocation || intake.location}`, "比较范围和轮廓"] as [string, string, string]] : []),
    ...((intake.symptoms.includes("按压痛") || effectiveProvocationTypes(intake).includes("按压")) && wasUnresolvedLastSession("tenderness") ? [["tenderness", `按压痛：${intake.tendernessLocation || intake.location}`, "只在同一位置轻按一次"] as [string, string, string]] : []),
    ...((intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化")) && wasUnresolvedLastSession("sensory") ? [["sensory", `麻或电感：${intake.sensoryLocation || intake.location}`, "比较范围是否变化"] as [string, string, string]] : []),
  ];
  const unresolvedFollowupMotionIds = remainingMotionReviews
    .filter(([id]) => followupTrends[id] !== "better")
    .map(([id]) => id.replace(/^motion:/, ""));
  const followupTensionContext = `${intake.location} ${intake.description} ${intake.symptomType} ${effectiveProvocationTypes(intake).join(" ")}`;
  const followupTensionOptions = [...new Set(unresolvedFollowupMotionIds.flatMap((directionId) => tensionLocationOptions(directionId, followupTensionContext)))];
  const followupTensionComparisonLabel = intake.side === "双侧/中间" ? "两侧感觉接近" : "没有明显差别";
  const followupTensionRequired = tissuePathway.id === "standard" && !localLimbDecision && unresolvedFollowupMotionIds.length > 0;
  const followupTensionComplete = !followupTensionRequired || followupTensionLocations.length > 0;
  const toggleFollowupTensionLocation = (location: string) => setFollowupTensionLocations((current) => {
    const alreadySelected = current.includes(location);
    const specialLabels = ["没有明显差别", "两侧感觉接近", "暂不判断"];
    if (specialLabels.includes(location)) return alreadySelected ? [] : [location];
    if (alreadySelected) return current.filter((entry) => entry !== location);
    return [...current.filter((entry) => !specialLabels.includes(entry)), location];
  });
  const reviewComplete = reviewItems.every(([id]) => Boolean(followupTrends[id])) && followupTensionComplete;
  const decision = followupDecision(reviewComplete);
  const currentRecords = followupTrialRecords.filter((record) => record.sessionNumber === sessionNumber);
  const followupTreatmentWorsened = treatmentMustStop(currentRecords);
  const lastWorsenedFollowup = [...currentRecords].reverse().find((record) => (record.result === "worse" || record.activityWorsened) && !record.reviewOnly);
  const mixedFollowupOutcome = Boolean(lastWorsenedFollowup?.activityWorsened
    && lastWorsenedFollowup.chiefRetested
    && lastWorsenedFollowup.afterScore < lastWorsenedFollowup.beforeScore);
  // 后续训练调整中的四个选项同时承担“本次第一组反馈”和“下一次调整”两层含义；
  // 未选择时不允许把本次训练保存为已完成，避免后续记录出现无反馈的训练结果。
  const pendingFollowupFeedbackExercises = pendingTrainingFeedback(exercises, followupExerciseChoices);
  const followupTrainingFeedbackComplete = trainingFeedbackComplete(exercises, followupExerciseChoices);
  const followupWorsenedExercise = exercises.find((exercise) => followupExerciseChoices[exercise.id] === "worse");
  const followupWorsenedExerciseAssessmentIds = followupWorsenedExercise
    ? assessments.filter((assessment) => (assessment.tags ?? []).some((tag) => followupWorsenedExercise.tags.includes(tag))).map((assessment) => assessment.id).slice(0, 3)
    : [];
  const followupNeedsTreatmentFinalRetest = needsTreatmentFinalChiefRetest(currentRecords, hasChiefAction);
  const currentRangeOutcomes = currentRecords.reduce<Record<string, CompletedRangeRetestAnswer>>((all, record) => ({ ...all, ...(record.rangeOutcomes ?? {}) }), {});
  const currentRangeScores = currentRecords.reduce<Record<string, number>>((all, record) => ({ ...all, ...(record.rangeScores ?? {}) }), {});
  const previousFollowupRangeScores = followupTrialRecords
    .filter((record) => record.sessionNumber < sessionNumber)
    .reduce<Record<string, number>>((all, record) => ({ ...all, ...(record.rangeScores ?? {}) }), {});
  const completedFollowupKeys = new Set(currentRecords.filter((record) => !record.reviewOnly && !record.retestOnly).map((record) => record.treatmentKey ?? record.candidateId));
  const selectedCandidate = followupCandidates.find((candidate) => candidate.id === followupCandidateId
    && !completedFollowupKeys.has(candidateTreatmentKey(candidate, intake.side)))
    ?? followupCandidates.find((candidate) => !completedFollowupKeys.has(candidateTreatmentKey(candidate, intake.side))
      && followupCandidateNeedsWork(candidate, currentRangeOutcomes));
  const selectedCandidateGroup = selectedCandidate ? [selectedCandidate] : [];
  const selectedDisplay = selectedCandidate
    ? treatmentDisplay(selectedCandidate, region?.name || intake.location || "当前部位", intake.swellingLocation, intake.side)
    : null;
  const followupWorseSide = findings.find((finding) => finding.side && finding.side !== "两侧接近")?.side;
  const followupBeforeScore = currentRecords.length ? currentRecords[currentRecords.length - 1].afterScore : followupScore;
  const followupSessionScore = currentRecords.at(-1)?.afterScore ?? followupScore;
  const selectedRetestIds = dedupeAssessmentIdsByAction(selectedCandidateGroup.flatMap((candidate) => followupRetestIds(candidate)));
  const followupChiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
  const followupChiefDirectionIds = region ? chiefMotionDirectionIds(intake, region.id) : [];
  const selectedRetestActionIds = new Set(selectedRetestIds.map(canonicalActionIdFromAssessmentId));
  const liveFollowupRetestFindings = selectedRetestIds.length && selectedCandidate
    ? dedupeRetestFindingsByAction(findings
      .filter((finding) => finding.id.startsWith("motion:") && selectedRetestActionIds.has(actionIdFromFinding(finding)))
      // 复诊先快速复查上次相关活动范围；即使当前疼痛很低，也不能直接跳过。
      .filter((finding) => finding.priority === "support" || motionWasSymptomatic(motionIdFromFinding(finding), assessmentResults, followupChiefDirection))
      .filter((finding) => selectedCandidateGroup.some((candidate) => directionNeedsCandidate(candidate, motionIdFromFinding(finding), currentRangeOutcomes))))
    : [];
  const activeFollowupRetestPlan = followupReadyToRetest ? followupRetestPlan : null;
  const activeFollowupDirectionIds = activeFollowupRetestPlan?.directionIds ?? [];
  const followupRetestFindings = activeFollowupRetestPlan?.candidateId === selectedCandidate?.id
    ? dedupeRetestFindingsByAction(findings.filter((finding) => finding.id.startsWith("motion:") && activeFollowupDirectionIds.some((id) => samePhysicalAction(id, motionIdFromFinding(finding)))))
    : liveFollowupRetestFindings;
  const followupControlMotionIds = [...new Set(followupRetestFindings.map(motionIdFromFinding))];
  const followupChiefMatchesRange = Boolean(followupChiefDirection && followupRetestFindings.some((finding) => samePhysicalAction(motionIdFromFinding(finding), followupChiefDirection)));
  const shouldRetestChiefNow = hasChiefAction && !followupChiefMatchesRange && !currentRecords.some((record) => record.chiefRetested);
  const followupShortTitle = (finding: Finding) => {
    const assessment = assessments.find((item) => item.id === finding.id);
    return assessment ? professionalAssessmentTitle(assessment.id, assessment.title) : finding.title.split(/：|范围偏小|会引起症状/)[0];
  };
  const followupProblemIsCurrent = (problem: TreatmentProblem) => {
    const directionId = problem.directionId;
    return problem.findingIds.includes("chief")
      || Boolean(directionId && selectedCandidateGroup.some((candidate) => (candidate.retestIds ?? []).some((id) => samePhysicalAction(id, directionId)) && directionNeedsCandidate(candidate, directionId, currentRangeOutcomes)));
  };
  const followupProblemWasHandled = (problem: TreatmentProblem) => currentRecords.some((record) => {
    if (problem.findingIds.includes("chief") && record.targetId === "target:chief") return true;
    if (problem.findingIds.some((findingId) => record.targetId === `target:${findingId}`)) return true;
    return Boolean(problem.directionId && (valueForPhysicalAction(record.rangeOutcomes, problem.directionId)
      || record.targetId?.startsWith("target:motion:") && samePhysicalAction(record.targetId.replace("target:motion:", ""), problem.directionId)));
  });
  const followupProblemItems = treatmentProblems
    .map((problem) => ({ ...problem, state: followupProblemIsCurrent(problem) ? "current" as const : followupProblemWasHandled(problem) ? "done" as const : "pending" as const }))
    .sort((a, b) => ({ current: 0, pending: 1, done: 2 }[a.state] - { current: 0, pending: 1, done: 2 }[b.state]));
  const followupRangeComplete = followupRetestFindings.length > 0 && followupRetestFindings.every((finding) => {
    const directionId = motionIdFromFinding(finding);
    return Boolean(followupMovementResponses[directionId]
      && followupMovementDiscomforts[directionId]
      && (followupMovementDiscomforts[directionId] === "no" || followupMovementScoreConfirmed[directionId]));
  });
  const followupChiefScoreComplete = !shouldRetestChiefNow || Boolean(followupPostDiscomfort && (followupPostDiscomfort === "no" || followupPostScoreConfirmed));
  const followupRetestComplete = followupRangeComplete && followupChiefScoreComplete;
  const outstandingFunctionSummary = summarizeFunctionRetestObligations({
    obligations: outstandingFunctionRetests,
    answers: treatmentFunctionRetests,
  });
  const outstandingFunctionPanel = outstandingFunctionRetests.length ? <section className="rm-complete-panel is-caution" data-testid="followup-pending-function-retests">
    <span>本次复查还没完成</span>
    <h2>还有动作需要再试一次</h2>
    <p>逐项记录现在能不能完成；这些结果不会由活动范围代替。</p>
    {outstandingFunctionRetests.flatMap((item) => (item.sides?.length ? item.sides : [undefined]).map((side) => {
      const key = functionRetestAnswerKey(item.assessmentId, side);
      const answer = treatmentFunctionRetests[key] ?? { completion: "" as const };
      const update = (patch: Partial<TreatmentFunctionRetestAnswer>) => setTreatmentFunctionRetests((current) => ({
        ...current,
        [key]: { ...(current[key] ?? { completion: "" }), ...patch },
      }));
      return <article key={key} className="rm-motion-answer-block">
        <h3>{side ? `${item.label} · ${side}` : item.label}</h3>
        <div className="rm-result-grid is-two">{([[
          "complete", "现在能完成"], ["unable", "还是做不完"]] as const).map(([value, label]) => <button type="button" key={value} className={answer.completion === value ? "is-selected" : ""} onClick={() => update({ completion: value, unableReason: undefined, score: undefined, scoreConfirmed: false })}>{label}</button>)}</div>
        {answer.completion === "unable" ? <div className="rm-result-grid is-two">{([[
          "pain", "疼或不舒服"], ["weak", "没力或撑不住"], ["fear", "担心继续会加重"]] as const).map(([value, label]) => <button type="button" key={value} className={answer.unableReason === value ? "is-selected" : ""} onClick={() => update({ unableReason: value })}>{label}</button>)}</div> : null}
        {item.mode === "ordinary" && answer.completion === "complete" ? <ScoreSlider compact value={answer.score ?? 0} selected={Boolean(answer.scoreConfirmed)} onChange={(score) => update({ score, scoreConfirmed: true })} label="现在的不适程度" context={typeof item.baselineScore === "number" ? `第一次记录 ${item.baselineScore}/10` : undefined} /> : null}
      </article>;
    }))}
    <div className="rm-page-actions split"><button type="button" className="rm-primary" disabled={!outstandingFunctionSummary.ready} onClick={finishOutstandingFunctionRetests}>记录这些动作</button><button type="button" onClick={() => saveRecord("康复中")}>保存，之后继续</button></div>
  </section> : null;
  const followupRangeNext = followupRetestFindings.reduce<string[]>((parts, finding) => {
    const directionId = motionIdFromFinding(finding);
    const outcome = followupMovementResponses[directionId];
    const title = followupShortTitle(finding);
    const comparison = assessments.find((item) => item.id === finding.id)?.comparison ?? "contralateral";
    const canUsePassive = directionAllowsPassive(directionId);
    if (outcome === "both-match") parts.push(`${title}已接近${motionComparisonTarget(comparison)}`);
    else if (outcome === "passive-match-active-limited") parts.push(`${title}主动范围仍偏小`);
    else if (["better-passive-limited", "passive-limited"].includes(outcome)) parts.push(`${title}${canUsePassive ? "被动范围仍偏小" : "主动范围仍偏小"}`);
    else if (outcome === "worse") parts.push(`${title}比处理前更差`);
    return parts;
  }, []);
  const roadmapSummary = (record: { rangeOutcomes?: Record<string, CompletedRangeRetestAnswer>; chiefRetested?: boolean; afterScore: number; beforeScore: number }): string => {
    const parts: string[] = [];
    for (const [directionId, outcome] of Object.entries(record.rangeOutcomes ?? {})) {
      const title = assessments.find((item) => item.id === `motion:${directionId}`)?.title ?? directionId;
      const label = outcome === "both-match" ? "范围恢复" : outcome === "worse" ? "范围更差" : "范围改善";
      parts.push(`${title}${label}`);
    }
    if (record.chiefRetested && record.afterScore < record.beforeScore) parts.push(`不适降 ${record.beforeScore - record.afterScore} 分`);
    return parts.join("、");
  };
  const followupCompletedLabels = currentRecords
    .filter((record) => !record.reviewOnly && !record.retestOnly)
    .map((record) => ({ label: record.treatmentName ?? record.candidateTitle, summary: roadmapSummary(record) }))
    .filter((item, index, list) => list.findIndex((entry) => entry.label === item.label) === index);
  const followupCurrentRoadmapItem = followupReadyToRetest
    ? `复测${followupRetestFindings.length ? followupRetestFindings.map(followupShortTitle).join("、") : (selectedDisplay?.action ?? "当前处理")}`
    : selectedDisplay ? `${selectedDisplay.site}：${selectedDisplay.action}` : "选择下一项处理";
  const followupUpcomingRoadmapItems = [
    followupReadyToRetest
      ? "记录复测结果"
      : `复测${followupRetestFindings.length ? followupRetestFindings.map(followupShortTitle).join("、") : (selectedDisplay?.action ?? "当前处理")}`,
    ...followupProblemItems
      .filter((problem) => problem.state === "pending")
      .map((problem) => `继续处理：${problem.title}`),
    "调整训练内容",
  ].filter((label, index, list) => Boolean(label) && list.indexOf(label) === index).slice(0, 3);

  if (outstandingFunctionRetests.length && !["review", "treatment"].includes(followupStage)) return <section className="rm-page">
    <StepHeading eyebrow={`第${sessionNumber}次康复 · 动作复查`} title="先完成还没记录的动作" />
    {outstandingFunctionPanel}
    <div className="rm-page-actions"><button type="button" onClick={() => setFollowupStage("treatment")}>返回处理与复查</button></div>
  </section>;

  if (followupStage === "summary") {
    const completedSummary = sessionHistory.find((item) => item.sessionNumber === sessionNumber) ?? sessionHistory.at(-1);
    const tissueReferral = tissueReferralAdvice(tissuePathway);
    const nextRecommendation = recommendNextSession({
      acute: ["今天或昨天", "2～7天"].includes(intake.onset) && intake.mechanism !== "没有明确受伤",
      hasSwelling: intake.symptoms.includes("肿胀或淤青") && completedSummary?.reviewResults.some((item) => item.id === "swelling" && item.result !== "better") !== false,
      hasImmediateTreatment: Boolean(completedSummary?.treatments.length),
      hasUnresolvedMobility: Boolean(completedSummary?.reviewResults.some((item) => item.id.startsWith("motion:") && item.result !== "better")),
      hasTraining: Boolean(completedSummary?.training.length),
      trainingStage: exerciseStage,
      waitingForMedicalClearance: structuralImagingSignal || assessmentNeedsReferral,
      worsened: Boolean(completedSummary?.reviewResults.some((item) => item.result === "worse") || completedSummary?.treatments.some((item) => item.result === "worse" || item.activityWorsened)),
    });
  const summaryChiefNote = chiefChangeExplanation({ comparable: chiefScoreComparable, baseline: intake.baselineScore, latest: sessionEndScore, hasRangeImprovement: false, noImmediateResponse: false });
    return <section className="rm-page rm-session-summary">
      <StepHeading eyebrow={`第${sessionNumber}次康复`} title="本次康复总结" />
      <section className={`rm-session-hero ${reportedActionSummary(intake).length > 1 ? "is-multi-action" : ""}`}><ChiefSummaryContent intake={intake} assessmentResults={assessmentResults} assessments={assessments} retestObligations={retestObligations} retestRecords={retestRecords} completed />{reportedActionSummary(intake).length <= 1 && typeof completedSummary?.endingScore === "number" ? <div className="rm-final-score"><b>{completedSummary.startedScore ?? previousSessionScore ?? "—"}</b><i>→</i><strong>{completedSummary.endingScore}</strong><small>/10</small></div> : null}</section>
      {summaryChiefNote ? <p className="rm-chief-change-note">{summaryChiefNote}</p> : null}
      <NextSessionCard recommendation={nextRecommendation} nextSessionNumber={sessionNumber + 1} completedAt={completedSummary?.completedAt} formatDateRange={formatRecommendedDateRange} onStart={startNextFollowupSession} onReportWorsening={() => beginAdverseReassessment({ source: "after-session", sourceId: `session-${sessionNumber}`, sourceLabel: `第${sessionNumber}次康复结束后的反应`, timing: "later", beforeScore: completedSummary?.endingScore ?? followupSessionScore, afterScore: completedSummary?.endingScore ?? followupSessionScore, relatedAssessmentIds: completedSummary?.reviewResults.filter((item) => item.result !== "better").map((item) => item.id) ?? [] })} />
      {tissueReferral ? <section className="rm-route-note is-waiting rm-referral-advice"><span>就医提醒</span><h2>{tissueReferral.title}</h2><ul>{tissueReferral.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>出现以上任何一种情况，先暂停训练并线下请专业人员确认。</p></section> : null}
      <details className="rm-summary-details"><summary>查看本次详细记录</summary><div className="rm-summary-dashboard">
        <section className="rm-summary-module is-treatments"><header><div><span>本次处理</span><strong>{completedSummary?.treatments.length ?? 0}项</strong></div></header><div className="rm-summary-compact-list">{completedSummary?.treatments.length ? completedSummary.treatments.map((item) => <article key={item.id}><strong>{item.label}</strong><span>{item.activityWorsened ? "已停止（活动变差）" : item.result === "better" ? "有效" : item.result === "partial" ? "部分改善" : item.result === "worse" ? "已停止" : "变化不明显"}</span></article>) : <p>本次没有新增现场处理。</p>}</div></section>
        <section className="rm-summary-module is-training"><header><div><span>居家训练</span><strong>{completedSummary?.training.length ?? 0}个</strong></div></header><div className="rm-summary-compact-list">{completedSummary?.training.map((item) => <article key={item.id}><strong>{item.label}</strong><span>{item.adjustment === "progress" ? "进阶一项" : item.adjustment === "reduce" ? "降低一档" : "保持当前"}</span></article>)}{homeRelaxationTargets.map((target) => <article key={target.id}><strong>{target.title}</strong><span>{target.dosage}</span></article>)}</div></section>
      </div></details>
    </section>;
  }

  if (followupStage === "treatment" && followupTreatmentWorsened) return <section className="rm-page">
    <StepHeading eyebrow={`第${sessionNumber}次康复 · 处理并复测`} title="本次处理已暂停" />
    <section className="rm-complete-panel is-referral"><span>刚才的反应</span><h2>{mixedFollowupOutcome ? "疼痛评分下降，但活动表现变差" : "症状或活动表现变差"}</h2><p>{mixedFollowupOutcome ? "疼痛分数的下降和活动表现的变差需要分开记录。当前处理先停止，不把疼痛改善当作整体安全；接下来只确认变差的活动和相关检查。" : "先停止刚才的处理，只确认症状变化和直接相关的检查。"}</p><div className="rm-page-actions split"><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "treatment", sourceId: lastWorsenedFollowup?.candidateId ?? "followup-treatment", sourceLabel: lastWorsenedFollowup?.treatmentName ?? lastWorsenedFollowup?.candidateTitle ?? "刚才的处理", timing: "immediate", beforeScore: lastWorsenedFollowup?.beforeScore ?? followupScore, afterScore: lastWorsenedFollowup?.afterScore ?? followupSessionScore, relatedAssessmentIds: Object.keys(lastWorsenedFollowup?.rangeOutcomes ?? {}).map((id) => `motion:${id}`) })}>确认加重后的变化</button><button type="button" onClick={() => saveRecord("处理后加重，待重新评估")}>保存并结束</button></div></section>
  </section>;

  if (followupStage === "treatment") return <section className="rm-page">
    <StepHeading eyebrow={`第${sessionNumber}次康复 · 处理并复测`} title="针对性处理" />
    {swellingGuidance && followupTrends.swelling !== "better" && currentRecords.length === 0 ? <section className="rm-swelling-reminder">
      <span>肿胀管理</span>
      <strong>{intake.swellingLocation || intake.location || "肿胀位置"}</strong>
      <p>{candidateAction(swellingGuidance)}</p>
      <small>今天晚些时候或明天再比较，不在每项处理后重复检查。</small>
    </section> : null}
    {selectedCandidate && selectedDisplay ? <>
      <TreatmentRoadmap completed={followupCompletedLabels} current={followupCurrentRoadmapItem} upcoming={followupUpcomingRoadmapItems} />
      {intake.side === "双侧/中间" ? <p className="rm-bilateral-order">{followupWorseSide ? `先处理${followupWorseSide}，再用同样方法处理另一侧。` : "两侧使用相同方法和强度处理。"}</p> : null}
      {!followupReadyToRetest ? <TreatmentActionCard candidate={selectedCandidate} display={selectedDisplay} controlMotionIds={followupControlMotionIds} side={intake.side} /> : null}
      {!followupReadyToRetest ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => { setFollowupRetestPlan({ targetId: "target:followup", candidateId: selectedCandidate.id, directionIds: followupRetestFindings.map(motionIdFromFinding) }); setFollowupPostScore(0); setFollowupPostScoreConfirmed(false); setFollowupPostDiscomfort(""); setFollowupMovementResponses({}); setFollowupMovementDiscomforts({}); setFollowupMovementScores({}); setFollowupMovementScoreConfirmed({}); setFollowupReadyToRetest(true); }}>处理完成，开始复测</button></div> : <section className="rm-retest rm-followup-retest">
        {shouldRetestChiefNow ? <header><span>复测动作</span><h2>{chiefActionLabel(intake)}</h2><strong>处理前 {followupBeforeScore}/10</strong></header> : null}
        {shouldRetestChiefNow ? <ScoreSlider compact value={followupPostScore} selected={followupPostScoreConfirmed} onChange={(value) => { setFollowupPostScore(value); setFollowupPostDiscomfort(value === 0 ? "no" : "yes"); setFollowupPostScoreConfirmed(true); }} label="现在的不适程度" context={`处理前 ${followupBeforeScore}/10`} /> : null}
        {followupRetestFindings.length ? <section className="rm-followup-range-check">
          <header className="rm-retest-checklist-header"><div><span>复测清单</span><strong>{followupRetestFindings.length}个相关动作</strong></div><small>每个动作只记录一次：先看活动范围，再记录不适程度。</small></header>
          <div className="rm-batch-range-list">{followupRetestFindings.map((finding, index) => {
            const directionId = motionIdFromFinding(finding);
            const selected = followupMovementResponses[directionId];
            const discomfort = followupMovementDiscomforts[directionId];
            const knownDiscomfort = motionWasSymptomatic(directionId, assessmentResults, followupChiefDirection);
            const previousScore = valueForPhysicalAction(currentRangeScores, directionId)
              ?? valueForPhysicalAction(previousFollowupRangeScores, directionId)
              ?? latestRangeScoreForDirection(directionId)
              ?? (assessmentResults[finding.id]?.discomfort === "yes" ? assessmentResults[finding.id]?.symptomScore : samePhysicalAction(directionId, followupChiefDirection) ? followupBeforeScore : undefined);
            const comparison = assessments.find((item) => item.id === finding.id)?.comparison ?? "contralateral";
            const canUsePassive = directionAllowsPassive(directionId);
            const passiveOnly = assessments.find((item) => item.id === finding.id)?.testMode === "passive";
            const rangeRecorded = Boolean(selected);
            const symptomRecorded = knownDiscomfort ? Boolean(followupMovementScoreConfirmed[directionId]) : Boolean(discomfort) && (discomfort !== "yes" || Boolean(followupMovementScoreConfirmed[directionId]));
            return <article key={finding.id} className={rangeRecorded && symptomRecorded ? "is-complete" : "is-pending"}><header><div><span className={followupChiefDirectionIds.some((id) => samePhysicalAction(directionId, id)) ? "rm-chief-badge" : ""}>{followupChiefDirectionIds.some((id) => samePhysicalAction(directionId, id)) ? "主诉动作" : `动作 ${index + 1}`}</span><strong>{followupShortTitle(finding)}</strong></div><em>{rangeRecorded && symptomRecorded ? "已记录" : "待记录"}</em></header><section className="rm-retest-field"><div className="rm-retest-field-title"><span>{passiveOnly ? "被动活动范围" : "活动范围"}</span><small>先选一项</small></div><h3>{activeMotionRangeQuestion(finding.id, intake.side === "双侧/中间", passiveOnly)}</h3><AnswerChoiceGrid options={rangeRetestOptions(comparison, canUsePassive, intake.side === "双侧/中间", passiveOnly)} value={selected} onChange={(value) => setFollowupMovementResponses((current) => ({ ...current, [directionId]: value }))} /></section>{knownDiscomfort ? <section className="rm-retest-score-field"><div className="rm-retest-field-title"><span>不适评分</span><small>参考上次分数选择现在的程度</small></div><ScoreSlider compact value={followupMovementScores[directionId] ?? 0} selected={Boolean(followupMovementScoreConfirmed[directionId])} onChange={(value) => {
              setFollowupMovementDiscomforts((current) => ({ ...current, [directionId]: value === 0 ? "no" : "yes" }));
              setFollowupMovementScores((current) => ({ ...current, [directionId]: value }));
              setFollowupMovementScoreConfirmed((current) => ({ ...current, [directionId]: true }));
              if (samePhysicalAction(directionId, followupChiefDirection)) { setFollowupPostDiscomfort(value === 0 ? "no" : "yes"); setFollowupPostScore(value); setFollowupPostScoreConfirmed(true); }
            }} label={passiveOnly ? "现在的被动不适程度" : "现在的不适程度"} context={typeof previousScore === "number" ? `处理前 ${previousScore}/10` : "处理前有不适"} /></section> : <section className="rm-retest-symptom-question"><div className="rm-retest-field-title"><span>{passiveOnly ? "被动活动不适" : "动作不适"}</span><small>再记录现在的感受</small></div><h3>{passiveOnly ? "被动活动时有没有出现新的不适？" : "做这个动作时有没有出现新的不适？"}</h3><div>{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={discomfort === value ? "is-selected" : ""} onClick={() => {
              setFollowupMovementDiscomforts((current) => ({ ...current, [directionId]: value }));
              setFollowupMovementScores((current) => ({ ...current, [directionId]: 0 }));
              setFollowupMovementScoreConfirmed((current) => ({ ...current, [directionId]: value === "no" }));
              if (samePhysicalAction(directionId, followupChiefDirection)) { setFollowupPostDiscomfort(value); setFollowupPostScore(0); setFollowupPostScoreConfirmed(value === "no"); }
            }}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>{discomfort === "yes" ? <ScoreSlider compact value={followupMovementScores[directionId] ?? 0} selected={Boolean(followupMovementScoreConfirmed[directionId])} onChange={(value) => {
              setFollowupMovementScores((current) => ({ ...current, [directionId]: value }));
              setFollowupMovementScoreConfirmed((current) => ({ ...current, [directionId]: true }));
              if (samePhysicalAction(directionId, followupChiefDirection)) { setFollowupPostScore(value); setFollowupPostScoreConfirmed(true); }
            }} label="现在有多不舒服？" context={typeof previousScore === "number" ? `初次评估 ${previousScore}/10` : `本次处理前 ${followupBeforeScore}/10`} /> : null}</section>}</article>;
          })}</div>
          <section className={`rm-auto-result is-${followupRetestComplete ? "partial" : "waiting"}`}><span>下一步</span><strong>{followupRangeNext.length ? followupRangeNext.join("；") : "请记录每个方向"}</strong><button type="button" className="rm-primary" disabled={!followupRetestComplete} onClick={() => {
            const rangeOutcomes = Object.fromEntries(followupRetestFindings.map((finding) => [motionIdFromFinding(finding), followupMovementResponses[motionIdFromFinding(finding)]])) as Record<string, CompletedRangeRetestAnswer>;
            const rangeDiscomforts = Object.fromEntries(followupRetestFindings.map((finding) => { const directionId = motionIdFromFinding(finding); return [directionId, followupMovementDiscomforts[directionId]]; })) as Record<string, YesNo>;
            const rangeScores = Object.fromEntries(followupRetestFindings.map((finding) => { const directionId = motionIdFromFinding(finding); return [directionId, followupMovementDiscomforts[directionId] === "yes" ? followupMovementScores[directionId] : 0]; })) as Record<string, number>;
            const outcomes = Object.values(rangeOutcomes);
            const scoreResult = followupPostScoreConfirmed ? resultFromScore(followupBeforeScore, followupPostScore) : "same";
            const allResolved = outcomes.every((outcome) => outcome === "both-match");
            const anyWorse = outcomes.some((outcome) => outcome === "worse");
            const hasRangeChange = outcomes.some((outcome) => ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(outcome));
            const result: TrialResult = scoreResult === "worse" || anyWorse && scoreResult !== "better" ? "worse" : allResolved && scoreResult === "better" ? "better" : hasRangeChange || scoreResult === "better" ? "partial" : "same";
            recordFollowupTrial(result, false, rangeOutcomes, rangeDiscomforts, rangeScores);
          }}>继续</button></section>
        </section> : !shouldRetestChiefNow ? <section className="rm-auto-result is-partial"><span>下一步</span><strong>{hasChiefAction ? "继续完成其余处理" : "当前没有固定动作，本次不做动作评分"}</strong><button type="button" className="rm-primary" onClick={() => recordFollowupTrial("partial")}>继续</button></section> : <section className={`rm-auto-result is-${followupPostScoreConfirmed ? resultFromScore(followupBeforeScore, followupPostScore) : "waiting"}`}><span>下一步</span><strong>{!followupPostScoreConfirmed ? "请选择现在有没有不适" : followupPostScore < followupBeforeScore ? `下降 ${followupBeforeScore - followupPostScore} 分，保留这项处理` : followupPostScore > followupBeforeScore ? `上升 ${followupPostScore - followupBeforeScore} 分，停止这项处理` : "分数没有变化，换下一项"}</strong><button type="button" className="rm-primary" disabled={!followupPostScoreConfirmed} onClick={() => recordFollowupTrial(resultFromScore(followupBeforeScore, followupPostScore))}>继续</button></section>}
      </section>}
      {followupReadyToRetest ? <div className="rm-treatment-back"><button type="button" className="rm-retest-return" onClick={returnFromFollowupRetestToTreatment}>返回刚才的处理</button></div> : null}
    </> : outstandingFunctionRetests.length ? outstandingFunctionPanel : followupNeedsTreatmentFinalRetest ? <section className="rm-treatment-final-retest">
      <span>处理阶段复测</span>
      <h2>{chiefActionLabel(intake)}</h2>
      <ScoreSlider value={followupPostScore} selected={followupPostScoreConfirmed} onChange={(value) => { setFollowupPostScore(value); setFollowupPostScoreConfirmed(true); }} label="现在的不适程度" context={`本次处理前 ${followupScore}/10`} />
      <div className="rm-one-action"><button type="button" className="rm-primary" disabled={!followupPostScoreConfirmed} onClick={finishFollowupTreatmentRetest}>记录并进入训练</button></div>
    </section> : <section className="rm-route-note"><h2>{currentRecords.length === 0 && followupCandidates.length === 0 ? "本次没有新的即时处理" : "需要处理的项目已完成"}</h2>{currentRecords.length === 0 && followupCandidates.length === 0 ? <p>已恢复的项目不重复处理；力量和动作控制进入训练，仍说不清或无法完成的项目保留待确认。</p> : null}<button type="button" className="rm-primary" onClick={() => setFollowupStage("training")}>查看训练调整</button></section>}
    {selectedCandidate ? <div className="rm-page-actions"><button type="button" onClick={() => setFollowupStage("review")}>返回本次复查</button></div> : null}
  </section>;

  if (followupStage === "training" && followupTrainingReadyForRetest && followupTrainingFeedbackComplete) return <section className="rm-page">
    <StepHeading eyebrow={`第${sessionNumber}次康复 · 最后复测`} title="训练结束，再看一次主诉动作" />
    {hasChiefAction ? <section className="rm-followup-final-reference"><header><span>本次评分</span><strong>{retestConditionLabel(intake)}</strong></header><div>{[
      ["本次开始", followupScore],
      ["本次训练前", followupSessionScore],
    ].map(([label, score]) => <article key={label}><span>{label}</span><strong>{score}<small>/10</small></strong></article>)}</div></section> : null}
    {hasChiefAction ? <>
      <section className="rm-final-retest-action"><span>现在再做</span><strong>{chiefActionLabel(intake)}</strong><small>按本次复查时相同的动作范围和速度完成。</small></section>
      <ScoreSlider value={followupFinalScore} selected={followupFinalScoreConfirmed} onChange={(value) => { setFollowupFinalScore(value); setFollowupFinalScoreConfirmed(true); }} label="现在有多不舒服？" context={`训练前 ${followupSessionScore}/10`} />
      {followupFinalScoreConfirmed ? <section className={`rm-auto-result is-${resultFromScore(followupSessionScore, followupFinalScore)}`}><span>本次结果</span><strong>{followupFinalScore < followupSessionScore ? `又下降 ${followupSessionScore - followupFinalScore} 分，保留当前训练` : followupFinalScore > followupSessionScore ? "训练后更不舒服，降低训练并停止进阶" : "分数没有变化，保持或降低当前训练"}</strong></section> : null}
    </> : <section className="rm-route-note"><h2>本次没有固定主诉动作</h2><p>保存本次训练选择，下次继续复查已有问题。</p></section>}
    <div className="rm-page-actions split"><button type="button" onClick={() => { setFollowupTrainingReadyForRetest(false); setFollowupFinalScore(0); setFollowupFinalScoreConfirmed(false); }}>返回训练调整</button><button type="button" className="rm-primary" disabled={hasChiefAction && !followupFinalScoreConfirmed} onClick={completeFollowupSession}>保存第{sessionNumber}次康复</button></div>
  </section>;

  if (followupStage === "training") return <section className="rm-page">
    <StepHeading eyebrow={`第${sessionNumber}次康复 · 训练调整`} title="调整今天的训练" />
    {hasChiefAction ? <><ScoreHistory scores={history} condition={retestConditionLabel(intake)} /><section className="rm-followup-session-change"><span>本次同条件复测</span><div><b>{followupScore}</b><i>→</i><strong>{followupSessionScore}</strong><small>/10</small></div></section></> : null}
    {tissuePathway.id === "standard" && followupTensionLocations.some((location) => !["没有明显差别", "两侧感觉接近", "暂不判断"].includes(location)) ? <section className="rm-training-preparation"><header><span>训练前准备</span><strong>先做一次轻柔松解</strong></header><div>{followupTensionLocations.filter((location) => !["没有明显差别", "两侧感觉接近", "暂不判断"].includes(location)).map((location) => <article key={location}><b>{location}</b><span>轻柔松解30～60秒</span></article>)}</div><footer>完成后直接开始训练，不新增复测步骤。</footer></section> : null}
    <div className="rm-followup-training">{exercises.map((exercise) => {
      const choice = followupExerciseChoices[exercise.id];
      return <article key={exercise.id}><header><div><strong>{exercise.title}</strong><span>{exercise.sets} · {exercise.reps}</span></div><b>第{exercise.stage}层</b></header><p>{choice === "reduce" ? exercise.easier : choice === "progress" ? exercise.harder : choice === "worse" ? "先停止刚才的做法，记录停下来后的反应。" : exercise.observe}</p><div>{([[
        "reduce", "降低一档"], ["hold", "保持当前"], ["progress", "进阶一项"], ["worse", "做完更不舒服"]] as Array<[FollowupExerciseChoice, string]>).map(([value, label]) => <button type="button" key={value} disabled={value === "progress" && ["reduce", "review"].includes(decision.tone)} className={choice === value ? "is-selected" : ""} onClick={() => setFollowupExerciseChoices((current) => ({ ...current, [exercise.id]: value }))}>{label}</button>)}</div></article>;
    })}</div>
    {followupWorsenedExercise ? <section className="rm-training-warning"><strong>{followupWorsenedExercise.title}后不适更重</strong><p>先停止刚才的做法，看看停下来后是否缓解。</p><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "training", sourceId: followupWorsenedExercise.id, sourceLabel: followupWorsenedExercise.title, timing: "during", beforeScore: followupSessionScore, afterScore: followupSessionScore, relatedAssessmentIds: followupWorsenedExerciseAssessmentIds })}>处理这次加重</button></section> : <>{exercises.length > 0 ? <section className="rm-training-feedback-gate"><strong>完成本次训练前，还需要记录每个动作的反馈</strong><span>未选择反馈的动作：{pendingFollowupFeedbackExercises.map((exercise) => exercise.title).join("、") || "无"}</span></section> : null}<section className="rm-next-stage"><span>下次继续</span><h2>先复查以前的问题，再决定是否增加难度</h2></section>
    <div className="rm-page-actions split"><button type="button" onClick={() => setFollowupStage("treatment")}>返回继续处理</button><button type="button" className="rm-primary" disabled={!followupTrainingFeedbackComplete} onClick={() => { if (!followupTrainingNeedsChiefRetest) { completeFollowupSession(); return; } setFollowupFinalScore(0); setFollowupFinalScoreConfirmed(false); setFollowupTrainingReadyForRetest(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{followupTrainingNeedsChiefRetest ? "训练完成，整体复测" : `保存第${sessionNumber}次康复`}</button></div></>}
  </section>;

  return <section className="rm-page">
    <StepHeading eyebrow={`第${sessionNumber}次康复 · 评估检查`} title="先复查，再决定今天做什么" />
    <section className="rm-session-reference"><span>本次沿用</span><strong>{[intake.location, intake.symptomType, chiefWasRecorded ? chiefActionLabel(intake) : "没有固定动作"].filter(Boolean).join(" · ")}</strong></section>
    {sessionHistory.length ? <section className="rm-session-history-strip"><header><span>恢复记录</span><strong>已完成 {sessionHistory.length} 次</strong></header><div className="rm-session-score-trend">{scoreTrend.map((item) => <article key={item.sessionNumber}><span>第{item.sessionNumber}次</span><strong>{item.score}<small>/10</small></strong></article>)}</div>{previousSession ? <div className="rm-last-session-summary"><article><span>上次有效处理</span><strong>{previousSession.continuedEffectiveTreatments.join("、") || "无"}</strong></article><article><span>上次训练</span><strong>{previousSession.training.map((item) => item.label).join("、") || "无"}</strong></article><article><span>本次先关注</span><strong>{previousFocus.join("；") || "快速复查当前情况"}</strong></article></div> : null}</section> : null}
    <section className="rm-followup-new"><div><span>有没有新症状或新的受伤事件？</span></div><div><button type="button" className={hasNewSymptom === "no" ? "is-selected" : ""} onClick={() => { if (hasNewSymptom !== "no") invalidateCurrentFollowupWork(); setHasNewSymptom("no"); }}>没有</button><button type="button" className={hasNewSymptom === "yes" ? "is-selected is-alert" : ""} onClick={() => { if (hasNewSymptom !== "yes") invalidateCurrentFollowupWork(); setHasNewSymptom("yes"); }}>有</button></div></section>
    <section className="rm-followup-new"><div><span>安全重检 · 本次有没有新出现的麻、电感或放射痛？</span></div><div><button type="button" className={effectiveRedFlags.numbnessOrRadiation === "no" ? "is-selected" : ""} onClick={() => updateRedFlag("numbnessOrRadiation", "no")}>没有</button><button type="button" className={effectiveRedFlags.numbnessOrRadiation === "yes" ? "is-selected is-alert" : ""} onClick={() => updateRedFlag("numbnessOrRadiation", "yes")}>有</button></div></section>
    <section className="rm-followup-new"><div><span>安全重检 · 症状是否在加重（无力或麻木范围扩大）？</span></div><div><button type="button" className={effectiveRedFlags.progressiveWeakness === "no" ? "is-selected" : ""} onClick={() => updateRedFlag("progressiveWeakness", "no")}>没有</button><button type="button" className={effectiveRedFlags.progressiveWeakness === "yes" ? "is-selected is-alert" : ""} onClick={() => updateRedFlag("progressiveWeakness", "yes")}>有</button></div></section>
    {redFlagReview.needsReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>复查发现神经相关或进行性加重信号</h2><p>普通自助路径不安排神经松动或自行处理。可保存当前信息，由专业人员检查感觉范围和力量变化。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
    {hasChiefAction ? <ScoreHistory scores={history} condition={retestConditionLabel(intake)} /> : null}
    {hasChiefAction ? <ScoreSlider value={followupScore} selected={followupScoreConfirmed} onChange={updateFollowupScore} label="现在做主诉动作，有多不舒服？" context={chiefActionLabel(intake)} /> : <section className="rm-route-note"><h2>{chiefRetestUnavailableTitle}</h2><p>{chiefRetestUnavailableText}</p></section>}
    {trendContradiction ? <section className="rm-route-note is-waiting rm-trend-contradiction"><span>请再确认</span><h2>{trendContradiction === "trend-better-score-worse" ? "趋势说更好，但分数更高" : "趋势说更差，但分数更低"}</h2><p>分数和逐项趋势指向相反。请复核今天的评分与各项选择；两条记录都会分别保留，不会互相覆盖。</p></section> : null}
    {complaintShift ? <section className="rm-route-note is-waiting rm-complaint-shift"><span>请确认</span><h2>主诉部位与上次记录不同</h2><p>{complaintShift}</p></section> : null}
    {reviewItems.length ? <section className="rm-followup-items"><header><span>快速复查上次问题</span></header>{reviewItems.map(([id, title, note]) => {
      const options: Array<[FollowupReviewAnswer, string]> = id.startsWith("motion:")
        ? [["better", "接近健侧"], ["same", "仍然偏小"], ["worse", "比上次更差"], ["unknown", "看不出来"], ["unable", "现在做不了"]]
        : id.startsWith("strength:")
          ? [["better", "接近健侧"], ["same", "仍然偏弱"], ["worse", "发力更差或更不适"], ["unknown", "看不出来"], ["unable", "现在做不了"]]
          : [["better", "改善"], ["same", "差不多"], ["worse", "变差"], ["unknown", "看不出来"], ["unable", "现在无法检查"]];
      return <article key={id}><div><strong>{title}</strong><small>{note}</small></div><div>{options.map(([value, label]) => <button type="button" key={value} className={followupTrends[id] === value ? `is-selected is-${value}` : ""} onClick={() => updateFollowupTrend(id, value)}>{label}</button>)}</div></article>;
    })}</section>
      : followupCandidates.length ? <section className="rm-route-note is-clear"><h2>继续上次有效处理</h2><p>本次先快速看相关活动范围，再继续有效的轻柔松解，然后进入训练。</p></section>
        : <section className="rm-route-note"><h2>本次先完成复查</h2><p>没有明确处理依据时不新增肌肉处理；力量和动作控制继续进入训练，无法判断的项目保留待确认。</p></section>}
    {followupTensionRequired ? <section className="rm-followup-tension"><header><span>肌肉紧张度复查</span><strong>轻按两侧，看看哪里差别更明显</strong></header><MuscleRegionLocationPicker locations={followupTensionOptions} selectedLocations={followupTensionLocations} comparisonLabel={followupTensionComparisonLabel} professional={intake.userRole !== "general"} bilateral={intake.side === "双侧/中间"} side={intake.side} onToggle={toggleFollowupTensionLocation} /></section> : null}
    <section className={`rm-followup-decision is-${decision.tone}`}><span>这次建议</span><h2>{decision.title}</h2></section>
    <div className="rm-page-actions split"><button type="button" onClick={() => setFollowupMode(false)}>查看第一次记录</button><button type="button" className="rm-primary" disabled={!hasNewSymptom || hasNewSymptom === "no" && (!reviewComplete || (hasChiefAction && !followupScoreConfirmed))} onClick={() => {
      if (hasNewSymptom === "yes") {
        setFollowupMode(false);
        setStep(0);
        // 新症状开启一条新的完整评估路径。保留用户身份与检查方式，
        // 但旧主诉、旧关节、旧评分和复诊派生状态都必须失效。
        invalidateAfterIntake({
          ...DEFAULT_INTAKE,
          userRole: intake.userRole,
          examSetup: intake.examSetup,
          productMode: intake.productMode,
          operationTarget: intake.operationTarget,
          capabilities: intake.capabilities,
          capabilitiesConfirmed: intake.capabilitiesConfirmed,
          learningExplanation: intake.learningExplanation,
          spineAssessmentMode: intake.spineAssessmentMode,
        });
        return;
      }
      if (decision.tone === "reduce") {
        reopenAssessment("本次状态比上次差，请重新确认发生变化的动作和位置。");
        return;
      }
      setFollowupPostScore(0);
      setFollowupPostScoreConfirmed(false);
      setFollowupPostDiscomfort("");
      setFollowupCandidateId(followupCandidates[0]?.id ?? "");
      setFollowupReadyToRetest(false);
      setFollowupMovementResponses({});
      setFollowupMovementDiscomforts({});
      setFollowupMovementScores({});
      setFollowupMovementScoreConfirmed({});
      setFollowupStage(followupCandidates.length === 0 && (Boolean(localLimbDecision) || tissuePathway.id !== "standard") ? "training" : "treatment");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}>{hasNewSymptom === "yes" ? "补充新症状" : decision.tone === "reduce" ? "重新评估变化" : "继续本次处理"}</button></div>
  </section>;
  }

  
  const resolvedChiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
  const muscleProblems = findings
    .filter((finding) => !finding.internal && finding.id.startsWith("tension:"))
    .map((finding): TreatmentProblem => ({ id: finding.id, kind: "肌肉", title: finding.title.replace(/(?:肌张力增高|按压反应更明显|张力或按压阻力增高)$/, "").trim() || "相关肌群", status: "两侧按压反应存在差异", findingIds: [finding.id], directionId: anyMotionIdFromFinding(finding) }))
    // 统一触诊结果会被各活动方向共同引用；总结按实际肌肉组合聚合，
    // 不按背屈、外翻、跖屈、内翻重复显示同一组区域。
    .filter((problem, index, list) => list.findIndex((item) => item.title === problem.title) === index);
  const strengthProblems = findings
    .filter((finding) => finding.id.startsWith("strength:"))
    .map((finding): TreatmentProblem => ({
      id: finding.id,
      kind: "力量或控制",
      title: professionalFindingLabel(finding),
      status: finding.title.split("：").slice(1).join("：") || "力量或控制异常",
      findingIds: [finding.id],
    }));
  // 肌肉问题统一由 muscleProblems 输出；treatmentProblems 里的同一 tension
  // finding 已作为活动方向的关联问题出现，不能在总结里再复制一条肌肉卡。
  const summaryProblems = [...treatmentProblems.filter((problem) => problem.kind !== "检查发现" && problem.kind !== "肌肉"), ...muscleProblems, ...strengthProblems]
    .filter((problem, index, list) => list.findIndex((item) => item.id === problem.id) === index);
  const summaryProblemGroups = [
    { key: "symptom", label: "症状", items: summaryProblems.filter((problem) => ["主诉", "主诉动作", "动作不适"].includes(problem.kind)) },
    { key: "mobility", label: "活动度", items: summaryProblems.filter((problem) => problem.kind === "活动度") },
    { key: "tension", label: "肌肉", items: summaryProblems.filter((problem) => problem.kind === "肌肉") },
    { key: "control", label: "肌力与控制", items: summaryProblems.filter((problem) => ["力量或控制", "活动控制"].includes(problem.kind)) },
    { key: "tracking", label: "局部体征", items: summaryProblems.filter((problem) => ["肿胀", "按压痛"].includes(problem.kind)) },
  ].filter((group) => group.items.length > 0);
  const summarizedTreatments = [...trialRecords.reduce((groups, record) => {
    if (record.reviewOnly || record.retestOnly) return groups;
    const key = record.treatmentKey ?? record.candidateId;
    const existing = groups.get(key);
    if (!existing) groups.set(key, { ...record, targetTitles: [record.targetTitle].filter(Boolean) as string[] });
    else {
      existing.targetTitles = [...new Set([...existing.targetTitles, ...(record.targetTitle ? [record.targetTitle] : [])])];
      existing.rangeOutcomes = { ...(existing.rangeOutcomes ?? {}), ...(record.rangeOutcomes ?? {}) };
      if (record.result === "better" || existing.result !== "better" && record.result === "partial") existing.result = record.result;
      if (treatmentResponsePriority(record.responseRole) > treatmentResponsePriority(existing.responseRole)) existing.responseRole = record.responseRole;
      existing.afterScore = record.afterScore;
    }
    return groups;
  }, new Map<string, TrialRecord & { targetTitles: string[] }>()).values()];
  const nextFocus = [
    ...(chiefScoreComparable ? sessionEndScore > 0 ? [`复测${chiefActionLabel(intake)}，比较上次 ${sessionEndScore} 分是否继续下降`] : [] : hasClearChiefAction(intake) ? [`复查${chiefActionLabel(intake)}时双侧整体感受和动作质量`] : ["确认是否出现明确诱发动作，并复查相关活动度和局部变化"]),
    ...effectiveFocusLabels.map((label) => `继续${label}的居家轻柔放松，并复查相关活动`),
    ...effectiveControlLabels.map((label) => `继续${label}，观察相关动作是否更轻松`),
    ...findings.filter((finding) => !finding.internal && finding.priority === "support" && anyMotionIdFromFinding(finding) !== resolvedChiefDirection).map((finding) => `复查${finding.title}`),
    ...findings.filter((finding) => !finding.internal && finding.priority === "track").map((finding) => `比较${finding.title}的恢复趋势`),
    trainingPlanSaved ? "本次未执行训练，下次先确认是否实际完成保存的方案" : "查看居家训练的完成质量，以及当天晚些时候和第二天的反应",
  ].filter((focus, index, list) => list.indexOf(focus) === index).slice(0, 3);
  if (followupMode) return renderFollowup();

  const summaryTreatmentFeedback = (record: TrialRecord) => {
    if (record.responseRole === "key-completion") return "前面的处理已经有帮助，这一项让剩余不适继续下降";
    if (record.responseRole === "independent-completion") return "完成这一项后，当前不适明显下降";
    if (record.responseRole === "partial-contribution") return "不适有下降，但还需要继续观察";
    if (record.responseRole === "range-contribution") return "活动比之前顺畅，但不舒服的感觉没有一起改变";
    if (record.responseRole === "not-immediately-testable") return "这项变化需要在后续康复中继续观察";
    if (record.timeBased) return "留到今天晚些时候或下次比较";
    if (record.rangeOutcomes && Object.keys(record.rangeOutcomes).length) {
      const restored = Object.values(record.rangeOutcomes).filter((outcome) => outcome === "both-match").length;
      return restored === Object.keys(record.rangeOutcomes).length
        ? "相关活动已接近参照范围"
        : restored ? "部分方向恢复，剩余方向继续跟进"
          : record.result === "better" || record.result === "partial" ? "主诉变轻，活动仍受限，继续巩固"
            : record.result === "worse" ? "出现加重，本次停止" : "变化不足，后续调整处理";
    }
    return record.result === "better" ? "主诉变轻，保留这个方向" : record.result === "partial" ? "有部分变化，继续观察" : record.result === "worse" ? "出现加重，本次停止" : "本次变化不明显";
  };
  const nextSessionRecommendation = recommendNextSession({
    acute: ["今天或昨天", "2～7天"].includes(intake.onset) && intake.mechanism !== "没有明确受伤",
    hasSwelling: intake.symptoms.includes("肿胀或淤青"),
    hasImmediateTreatment: summarizedTreatments.length > 0,
    hasUnresolvedMobility: summaryProblems.some((problem) => problem.kind === "活动度"),
    hasTraining: trainingComplete && exercises.length > 0,
    trainingStage: exerciseStage,
    waitingForMedicalClearance: structuralImagingSignal || hasSafetySignal && !hasClearance || assessmentNeedsReferral,
    worsened: treatmentWorsened || exercises.some((exercise) => exerciseFeedback[exercise.id]?.symptom === "worse"),
  });
  const summaryChiefNote = chiefChangeExplanation({ comparable: chiefScoreComparable, baseline: intake.baselineScore, latest: sessionEndScore, hasRangeImprovement: false, noImmediateResponse: false });
  const firstSessionTissueReferral = tissueReferralAdvice(tissuePathway);
  const bodyMarkKindLabels: Record<BodyMark["symptomKind"], string> = { complaint: "主诉", swelling: "肿胀", bruise: "淤青", tenderness: "按压痛", sensory: "麻电/感觉" };
  const visibleBodyMarks = bodyMarks.filter((mark) => mark.status !== "invalidated");
    return <section className="rm-page rm-session-summary">
    <StepHeading eyebrow="第6步" title="本次康复总结" />
    <section className={`rm-session-hero ${reportedActionSummary(intake).length > 1 ? "is-multi-action" : ""}`}><ChiefSummaryContent intake={intake} assessmentResults={assessmentResults} assessments={assessments} retestObligations={retestObligations} retestRecords={retestRecords} />{reportedActionSummary(intake).length <= 1 && chiefScoreComparable ? <div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{sessionEndScore}</strong><small>下降 {Math.max(0, intake.baselineScore - sessionEndScore)} 分</small></div> : null}</section>{summaryChiefNote ? <p className="rm-chief-change-note">{summaryChiefNote}</p> : null}
     {intake.professionalNotes.trim() ? <section className="rm-route-note rm-professional-note-summary"><span>专业备注</span><p>{intake.professionalNotes}</p><small>这是尚未确认的判断，不会改变页面建议。</small></section> : null}
     {visibleBodyMarks.length ? <section className="rm-route-note rm-body-mark-summary"><span>症状位置记录</span><div className="rm-body-mark-summary-list">{visibleBodyMarks.map((mark) => <span key={mark.markId}><b>{bodyMarkKindLabels[mark.symptomKind]}</b>{mark.humanLabel}{mark.coordinateCompleteness === "zone-only" ? "（大致位置）" : ""}</span>)}</div></section> : null}
    <NextSessionCard recommendation={nextSessionRecommendation} nextSessionNumber={2} completedAt={sessionHistory.find((item) => item.sessionNumber === 1)?.completedAt} formatDateRange={formatRecommendedDateRange} onStart={startSecondSession} onReportWorsening={() => beginAdverseReassessment({ source: "after-session", sourceId: "session-1", sourceLabel: "本次康复结束后的反应", timing: "later", beforeScore: sessionEndScore, afterScore: sessionEndScore, relatedAssessmentIds: findings.filter((finding) => finding.id.startsWith("motion:")).map((finding) => finding.id).slice(0, 3) })} />
    {firstSessionTissueReferral ? <section className="rm-route-note is-waiting rm-referral-advice"><span>就医提醒</span><h2>{firstSessionTissueReferral.title}</h2><ul>{firstSessionTissueReferral.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>出现以上任何一种情况，先暂停训练并线下请专业人员确认。</p></section> : null}
    <details className="rm-summary-details"><summary>查看本次详细记录</summary><div className="rm-summary-dashboard">
      <div className="rm-summary-column">
        <section className="rm-summary-module is-findings"><header><div><span>评估结果</span><strong>{summaryProblems.length}项</strong></div></header>{summaryProblemGroups.length ? <div className="rm-summary-finding-groups">{summaryProblemGroups.map((group) => <article key={group.key}><b>{group.label}</b><ul>{group.items.map((problem) => <li key={problem.id}><strong>{problem.title}</strong>{problem.status ? <span>{problem.status}</span> : null}</li>)}</ul></article>)}</div> : <p>未记录明确异常。</p>}</section>
        <section className="rm-summary-module is-training"><header><div><span>居家训练</span><strong>{trainingPlanSaved ? "方案已保存，未执行" : trainingComplete ? `${exercises.length}个 · 已完成` : `${exercises.length}个`}</strong></div></header>{trainingPlanSaved ? <p className="rm-summary-unexecuted">这次只保存了训练方案。下次开始前先确认是否做过。</p> : <div className="rm-summary-compact-list">{exercises.map((exercise) => <article key={exercise.id}><strong>{exercise.title}</strong><span>{exercise.sets} · {exercise.reps}{exerciseFeedback[exercise.id] ? ` · ${exerciseFeedback[exercise.id]?.symptom === "worse" ? "加重" : exerciseFeedback[exercise.id]?.formChanged ? "需要简单一些" : "已记录反馈"}` : " · 待反馈"}</span></article>)}{homeRelaxationTargets.map((target) => <article key={target.id}><strong>{target.title}</strong><span>{target.dosage}</span></article>)}</div>}</section>
      </div>
      <div className="rm-summary-column">
        <section className="rm-summary-module is-treatments"><header><div><span>处理记录</span><strong>{summarizedTreatments.length}项</strong></div></header>{summarizedTreatments.length ? <><div className="rm-summary-treatment-cards">{summarizedTreatments.map((record) => <article key={record.treatmentKey ?? record.candidateId} className={`is-${record.result}`}><header><span>{record.responseRole === "key-completion" ? "关键完成" : record.responseRole === "independent-completion" ? "单项完成" : record.responseRole === "partial-contribution" ? "部分贡献" : record.responseRole === "range-contribution" ? "活动改善" : record.result === "better" ? "有效" : record.result === "partial" ? "待巩固" : record.result === "worse" ? "已停止" : "变化小"}</span><strong>{record.treatmentName ?? record.candidateTitle}</strong></header><p>{summaryTreatmentFeedback(record)}</p></article>)}</div>{resolvedTreatmentCombination(summarizedTreatments).length > 1 ? <section className="rm-effective-combination"><strong>本次组合解决</strong><span>{resolvedTreatmentCombination(summarizedTreatments).map((record) => record.treatmentName ?? record.candidateTitle).join(" ＋ ")}</span><small>记录处理顺序与组合反应，不直接认定病因。</small></section> : null}</> : <p>本次无处理记录。</p>}</section>
        <section className="rm-summary-module is-next"><header><div><span>下次复查</span><strong>{nextFocus.length}项</strong></div></header><ol>{nextFocus.map((focus) => <li key={focus}>{focus}</li>)}</ol></section>
      </div>
    </div></details>
    <div className="rm-page-actions split"><button type="button" onClick={() => goToStep(4)}>返回训练</button><button type="button" className="rm-primary" onClick={() => saveRecord("待复查")}>保存本次记录</button></div>
  </section>;
}
