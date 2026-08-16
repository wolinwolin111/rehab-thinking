"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import LowerLimbLocationPicker, {
  makeLowerLimbLocationSelection,
  type LowerLimbAreaId,
  type LowerLimbLocationSelection,
} from "./lower-limb-location-picker";
import {
  FULL_REGIONS,
  type FullCandidate,
  type FullExercise,
  type FullRegion,
  type FullRegionId,
} from "./full-demo-content";
import {
  buildPilotTreatmentUnits,
  classifyPilotAssessmentEvidence,
  matchPilotRelations,
  rankPilotAssessmentIds,
  type PilotFindingInput,
  type PilotIntakeInput,
} from "./pilot-decision-engine.ts";
import { buildKneeDecision } from "./knee-decision-core";
import { buildLocalLimbDecision, localLimbArea, type LocalLimbFinding } from "./local-limb-decision-core";
import { buildTissuePathway } from "./tissue-pathway-core";
import {
  classifyTreatmentResponse,
  resolvedTreatmentCombination,
  treatmentResponsePriority,
  type TreatmentResponseRole,
} from "./treatment-response-core";
import { summarizeTreatmentCoverage } from "./treatment-coverage-core";
import { resolveDynamicQueueAdvance, type PendingQueueAdvance } from "./workflow-state-core";
import {
  buildNextFocus,
  sessionScoreTrend,
  upsertSessionSummary,
  type RehabSessionSummary,
} from "./rehab-session-history";
import {
  INITIAL_TRAINING_PRIORITY,
  nextSessionTrainingIds,
} from "./training-progression-core";
import {
  KNEE_CORE_CANDIDATE_IDS,
  kneeCandidateAllowedInTreatmentQueue,
  kneeCandidateBelongsToCurrentDecision,
  kneeDecisionInputFromWorkflow,
  kneeExerciseIdsForDecision,
  kneeLegacyCandidateIdsForUnit,
  kneeRetestInstruction,
  kneeTreatmentInstruction,
} from "./knee-workflow-adapter";
import {
  controlPlansForMotions,
  normalizePilotMuscleRegion,
  pilotMuscleRegion,
  pilotMotionKnowledge,
  primaryRetestMotionIdsForRegion,
  professionalAssessmentTitle,
  regionRelationForMotion,
} from "./pilot-motion-muscle-knowledge";
import {
  shouldAskMotionDiscomfort,
  shouldAskPairedStrength,
  shouldCaptureUnableMotionSymptom,
  strengthAnswerForWorkflow,
  strengthAnswerResult,
  strengthFindingAnswer,
  type StrengthUnableReason,
} from "./assessment-answer-core";
import { assessmentGapActionLabel, firstAssessmentGap } from "./assessment-gap-core";
import {
  actionIdFromFinding,
  anyMotionIdFromFinding,
  canonicalActionIdFromAssessmentId,
  canonicalActionKey,
  dedupeAssessmentIdsByAction,
  dedupeRetestFindingsByAction,
  motionIdFromFinding,
  motionWasSymptomatic,
  samePhysicalAction,
  treatmentRelatesToChief,
} from "./action-identity-core";
import {
  compareFollowupScore,
  mergeSessionReviewResults,
  previousSessionEndingScore,
  trendFromAssessmentResult,
  type AssessmentReviewResult,
  type ReviewResult,
} from "./followup-review-core";
import {
  buildProblemLedger,
  emptyTreatmentMessage,
  hasUnroutedImmediateProblem,
  unresolvedImmediateProblems,
} from "./problem-ledger-core";
import { needsTrainingToleranceRetest, needsTreatmentFinalChiefRetest, treatmentMustStop } from "./treatment-session-core";
import { capturesChiefRetestScore, nextRangeCandidateType } from "./retest-routing-core";
import {
  formatRecommendedDateRange,
  recommendNextSession,
  type NextSessionRecommendation,
} from "./next-session-recommendation-core";
import { currentComplaintText } from "./intake-complaint-core";
import {
  adverseCaptureComplete,
  canExecutePlan,
  createAdverseResponse,
  focusedReassessmentIds,
  focusedReassessmentComplete,
  nextAssessmentRevision,
  resolveAdverseResponse,
  type AdverseResponseEvent,
  type AdverseSource,
  type AdverseTiming,
} from "./adverse-response-core";
import { buildMuscleTensionFindings, needsMuscleTensionCheck } from "./muscle-tension-assessment-core";
import {
  emptyCapabilities,
  normalizeWorkflowProfile,
  workflowProfileFromLegacy,
  type CapabilityKey,
  type CapabilitySet,
  type OperationTarget,
  type ProductMode,
} from "./workflow-profile-core";
import { buildHomeRelaxationTargets, exerciseMuscleLabels } from "./home-relaxation-core";
import { filterPatellaFindingsToLimited, limitedPatellaDirections, patellaMobilityUnitTitle } from "./patella-mobility-core";
import { candidateDedupKey, candidateMatchesTensionLocation, candidateMuscleFocus, candidateMuscleUnits, candidateSubject, candidateTreatmentKey, candidateTreatmentName, isPatellaSpecificCandidate, selectTreatmentChainCandidates } from "./candidate-treatment-core";
import { candidateAction, candidateControlMotionIds, candidatePilotMotionIds } from "./candidate-action-core";
import { assessmentSymptomCanDriveRetest, chiefActionLabel, chiefActionSource, chiefMotionDirectionId, hasClearChiefAction, isUnclearAction, primaryReportedAction, reportedActionSummary } from "./chief-action-core";
import { candidateRelevance } from "./candidate-scoring-core";
import { consolidateTrialTargetsByTreatment, treatmentCanCarryAcrossProblems } from "./trial-target-core";
import { candidateAllowedInSharpPath, candidateIsAvailable } from "./candidate-safety-core";
import { candidateDirectionChain, directionChain, includesAny, orderCandidatesByChain, pilotTreatmentMatchesCandidate } from "./candidate-order-core";
import { workbenchStageStates } from "./stage-workbench-core";
import { buildFindingGroups } from "./finding-groups-core";
import { specialIsRelevant } from "./special-test-trigger-core";
import { StageOutcomeSections } from "./stage-outcome-sections";
import { functionCompletionValue, functionControlValue, functionDiscomfortValue } from "./function-assessment-core";
import { motionNeedsPassive } from "./motion-assessment-core";
import { assessmentRecordComplete } from "./assessment-record-complete-core";

type Step = 0 | 1 | 2 | 3 | 4 | 5;
type YesNo = "yes" | "no";
type UserRole = "" | "general" | "coach" | "rehab";
type ExamSetup = "" | "self" | "professional-other";
type SpineAssessmentMode = "" | "guided" | "reference";
type MotionAnswer = "same" | "limited" | "excessive" | "painful" | "unable" | "unsure";
type BilateralMotionAnswer = "left-limited" | "right-limited" | "both-limited";
type PassiveAnswer = "same" | "limited" | "excessive" | "painful" | "skip";
type PassiveEndFeel = "soft" | "elastic" | "firm" | "hard" | "painful" | "unknown";
type SimpleAnswer = "normal" | "present" | "weak" | "painful" | "positive" | "unable" | "skip";
type FunctionCompletion = "complete" | "unable" | "skip";
type FunctionControl = "stable" | "compensated" | "unsure";
type FunctionUnableReason = "pain" | "weak" | "fear" | "instruction";
type FamiliarSymptomAnswer = "yes" | "no" | "unsure";
type TrialResult = "better" | "partial" | "same" | "worse";
type FollowupReviewAnswer = "better" | "same" | "worse" | "unknown" | "unable";
type FollowupNewSymptomAnswer = "" | "no" | "yes";
type FollowupExerciseChoice = "reduce" | "hold" | "progress" | "worse";
type AssessmentKind = "motion" | "strength" | "function" | "special";
type MotionComparison = "contralateral" | "opposite-direction" | "midline";
type RangeRetestAnswer = "" | "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";
type CompletedRangeRetestAnswer = Exclude<RangeRetestAnswer, "">;

function isCompletedRangeRetestAnswer(value: RangeRetestAnswer | undefined): value is CompletedRangeRetestAnswer {
  return value !== undefined && value !== "";
}

type ChiefActionAnalysis = {
  raw: string;
  category: string;
  task: string;
  function: string;
  load: string;
  direction: string;
  retest: string;
};

type ReportedActionKind = "functional" | "joint-direction" | "custom";

type ReportedAction = {
  id: string;
  label: string;
  kind: ReportedActionKind;
  raw: string;
};

type IntakeState = {
  description: string;
  parsed: boolean;
  userRole: UserRole;
  examSetup: ExamSetup;
  productMode: ProductMode | "";
  operationTarget: OperationTarget | "";
  capabilities: CapabilitySet;
  capabilitiesConfirmed: boolean;
  learningExplanation: boolean;
  spineAssessmentMode: SpineAssessmentMode;
  regionId: string;
  side: string;
  location: string;
  bodyLocations: LowerLimbLocationSelection[];
  locationConfirmed: boolean;
  onset: string;
  mechanism: string;
  symptomType: string;
  /** 通用的“疼/不舒服”需要在位置确认时再让用户确认性质。 */
  painQualityConfirmed: boolean;
  symptoms: string[];
  provocationTypes: string[];
  forceDirection: string;
  swellingLocation: string;
  swellingLocations: LowerLimbLocationSelection[];
  swellingLocationConfirmed: boolean;
  tendernessLocation: string;
  tendernessLocations: LowerLimbLocationSelection[];
  tendernessLocationConfirmed: boolean;
  sensoryLocation: string;
  sensoryLocations: LowerLimbLocationSelection[];
  sensoryLocationConfirmed: boolean;
  reproduction: string;
  /** 用户自己指出的诱发动作；可以多选，不能与评估中的关节方向混为一谈。 */
  reportedActions: ReportedAction[];
  /** 没有现成选项时保存用户原话，后续直接作为主诉复测动作。 */
  customAction: string;
  actionSelectionConfirmed: boolean;
  /** 专业人士对患者的补充记录，不替代患者原话。 */
  professionalNotes: string;
  actionAnalysis: ChiefActionAnalysis | null;
  goal: number;
  baselineScore: number;
  baselineScoreConfirmed: boolean;
  stabbingSpread: "" | "single" | "multiple" | "rest" | "unsure";
  stabbingPalpation: "" | "sharp" | "dull" | "none" | "not-tried";
  priorCare: string[];
};

type IntakeMultiConfirmation = {
  symptoms: boolean;
  provocationTypes: boolean;
};

type AssessmentItem = {
  id: string;
  kind: AssessmentKind;
  title: string;
  how: string;
  passiveHow?: string;
  observe: string;
  next?: string;
  tags?: string[];
  comparison?: MotionComparison;
  spinal?: boolean;
  /** 关节被动专属项目（例如髌骨滑动），不应显示主动活动或主动发力问题。 */
  testMode?: "active" | "passive" | "combined";
  professionalHow?: string;
  professionalObserve?: string;
  explain?: string;
  /** 同一动作下的能力检查：自助模式看主动保持，专业他测模式才看抗阻力量。 */
  pairedStrengthId?: string;
  pairedStrengthTitle?: string;
  pairedStrengthTags?: string[];
  /** 专项检查的用途分类，只用于专业工作台的分组展示。 */
  specialCategory?: "localization" | "response" | "safety" | "professional-special";
};

/** 髌骨四个方向属于同一项被动筛查；后台仍保留方向级结果，页面只展示一张卡。 */
const PATELLA_DIRECTION_IDS = [
  "motion:knee-patella-superior",
  "motion:knee-patella-inferior",
  "motion:knee-patella-medial",
  "motion:knee-patella-lateral",
] as const;
const PATELLA_GROUP_PRIMARY_ID = PATELLA_DIRECTION_IDS[0];
const PATELLA_DIRECTION_LABELS: Record<string, string> = {
  "motion:knee-patella-superior": "向上",
  "motion:knee-patella-inferior": "向下",
  "motion:knee-patella-medial": "向内",
  "motion:knee-patella-lateral": "向外",
};
const PATELLA_DIRECTION_TITLES: Record<string, string> = {
  "motion:knee-patella-superior": "髌骨向上滑动",
  "motion:knee-patella-inferior": "髌骨向下滑动",
  "motion:knee-patella-medial": "髌骨向内滑动",
  "motion:knee-patella-lateral": "髌骨向外滑动",
};

function isPatellaDirectionId(id: string) {
  return (PATELLA_DIRECTION_IDS as readonly string[]).includes(id);
}

function isPatellaGroupSecondaryId(id: string) {
  return isPatellaDirectionId(id) && id !== PATELLA_GROUP_PRIMARY_ID;
}

const isPatellaTreatmentCandidate = isPatellaSpecificCandidate;

type AssessmentRecord = {
  active?: MotionAnswer | BilateralMotionAnswer;
  passive?: PassiveAnswer;
  simple?: SimpleAnswer;
  /** 功能动作分开记录：能否完成、动作是否稳定、是否引发熟悉不适。 */
  functionCompletion?: FunctionCompletion;
  functionControl?: FunctionControl;
  functionDiscomfort?: YesNo;
  functionUnableReason?: FunctionUnableReason;
  discomfort?: YesNo;
  discomfortLocation?: string;
  discomfortLocations?: LowerLimbLocationSelection[];
  discomfortType?: string;
  /** 没有明确主诉动作时，只有复现了平时熟悉的症状，才建立疼痛复测目标。 */
  familiarSymptom?: FamiliarSymptomAnswer;
  unableReason?: "pain" | "fear" | "instruction" | "other";
  strengthUnableReason?: StrengthUnableReason;
  measuredAngle?: string;
  symptomScore?: number;
  passiveDiscomfort?: YesNo;
  passiveDiscomfortLocation?: string;
  passiveDiscomfortLocations?: LowerLimbLocationSelection[];
  passiveDiscomfortType?: string;
  passiveMeasuredAngle?: string;
  passiveEndFeel?: PassiveEndFeel;
  passiveSymptomScore?: number;
  /** 功能动作异常时记录"哪个阶段最明显"（起始/中途/末端/全过程/说不清）。 */
  symptomStage?: string;
  compensations?: string[];
  /** 活动受限后，用户已完成轻按取样；用于区分“未作答”和“没有明显紧张位置”。 */
  tensionChecked?: boolean;
  tensionLocations?: string[];
  /** 双侧/中间症状时，记录相对更差的一侧。 */
  worseSide?: "左侧" | "右侧" | "两侧接近";
  pairedStrength?: SimpleAnswer;
  pairedStrengthUnableReason?: StrengthUnableReason;
  pairedStrengthLocation?: string;
  pairedStrengthLocations?: LowerLimbLocationSelection[];
  pairedStrengthType?: string;
  pairedStrengthScore?: number;
};

type Finding = {
  id: string;
  title: string;
  detail: string;
  priority: "chief" | "support" | "track";
  score?: number;
  tags: string[];
  note?: string;
  side?: "左侧" | "右侧" | "两侧接近";
  /** 配对力量结果只作为内部决策依据，界面合并在同一个活动动作里展示。 */
  internal?: boolean;
  relatedMotionId?: string;
};

function professionalFindingLabel(finding: Finding) {
  if (finding.id.startsWith("tension:")) return finding.title || "相关肌群 · 肌张力增高";
  const assessmentId = finding.id.replace(/^symptom:|^control:/, "");
  if (/^(motion|strength|function|special):/.test(assessmentId)) {
    const base = professionalAssessmentTitle(assessmentId, finding.title.split(/：|会引起|因为/)[0]);
    if (finding.id.startsWith("symptom:")) return `${base} · 活动不适`;
    if (finding.id.startsWith("control:")) return `${base} · 主动控制异常`;
    return base;
  }
  if (finding.id === "track:swelling") return "局部肿胀";
  if (finding.id === "track:tender") return "局部压痛";
  if (finding.id === "track:sensory") return "感觉异常";
  return finding.title.split(/：/)[0];
}

/** 配对在活动度卡片里的力量结果没有独立 assessmentResults 键，需从结果标题补回。 */
type TreatmentProblem = {
  id: string;
  kind: string;
  title: string;
  status?: string;
  findingIds: string[];
  directionId?: string;
};

type TrialTarget = {
  id: string;
  finding: Finding;
  candidates: FullCandidate[];
  /** 同一项处理完成后需要一起复测、并可分别退出后续流程的活动方向。 */
  retestFindings?: Finding[];
  chain?: string;
  optionalCandidates?: FullCandidate[];
  /** 给用户看的具体复测动作，不允许回退成“说不清”或系统内部标题。 */
  retestLabel?: string;
  sourceCaseIds?: string[];
};

type RetestPlan = {
  targetId: string;
  candidateId: string;
  directionIds: string[];
};

type TrialRecord = {
  candidateId: string;
  treatmentKey?: string;
  treatmentSide?: string;
  candidateTitle: string;
  treatmentName?: string;
  action?: string;
  targetId: string;
  targetTitle?: string;
  measurement?: "score" | "range" | "time" | "deferred";
  rangeOutcome?: CompletedRangeRetestAnswer;
  rangeOutcomes?: Record<string, CompletedRangeRetestAnswer>;
  rangeDiscomforts?: Record<string, YesNo>;
  rangeScores?: Record<string, number>;
  beforeScore: number;
  afterScore: number;
  result: TrialResult;
  movement: "smoother" | "same" | "worse";
  timeBased?: boolean;
  /** 同次康复中该处理已经做过；本条只记录它对另一个问题的复测结果。 */
  retestOnly?: boolean;
  reviewOnly?: boolean;
  /** 多项内容一起完成后统一复测，结果只能说明这一组相关，不能归因到其中某一项。 */
  batchedResult?: boolean;
  /** 同组里的配合处理；改善优先归到首项，配合项只保留为相关线索。 */
  supportingOnly?: boolean;
  /** 这一条处理后同时复测了主诉动作，afterScore 可更新当前主诉分数。 */
  chiefRetested?: boolean;
  reusedFromTargetTitle?: string;
  /** 用来识别连续两次完全相同的复测动作；中间没有新处理时直接沿用结果。 */
  retestActionKey?: string;
  /** 区分部分贡献、关键完成和组合解决，不能只按下降分数排名。 */
  responseRole?: TreatmentResponseRole;
};


type ExerciseFeedback = {
  completed: number;
  formChanged: boolean;
  symptom: "better" | "same" | "worse";
  reserve: number;
};

type FollowupStage = "review" | "treatment" | "training" | "summary";
type TransitionTarget = "assessment" | "treatment" | "training" | "summary";

type FollowupTreatmentRecord = {
  sessionNumber: number;
  targetId?: string;
  candidateId: string;
  treatmentKey?: string;
  candidateTitle: string;
  treatmentName?: string;
  action?: string;
  beforeScore: number;
  afterScore: number;
  result: TrialResult;
  timeBased?: boolean;
  rangeOutcomes?: Record<string, CompletedRangeRetestAnswer>;
  rangeOutcome?: CompletedRangeRetestAnswer;
  rangeDiscomforts?: Record<string, YesNo>;
  rangeScores?: Record<string, number>;
  chiefRetested?: boolean;
  retestOnly?: boolean;
  reviewOnly?: boolean;
  supportingOnly?: boolean;
  responseRole?: TreatmentResponseRole;
};

type SavedDemoSnapshot = {
  step: Step;
  intake: IntakeState;
  confirmedIntakeMulti?: IntakeMultiConfirmation;
  safety: Record<string, YesNo>;
  boneRisk?: Record<string, "yes" | "no" | "unsure">;
  imaging: string[];
  assessmentIndex: number;
  assessmentResults: Record<string, AssessmentRecord>;
  trialTargetIndex: number;
  candidateIndex: number;
  selectedOptionalCandidateIds?: string[];
  bilateralNeedsReferral?: boolean;
  midpointDecisionDone?: boolean;
  trialRecords: TrialRecord[];
  postScore: number;
  postScoreConfirmed?: boolean;
  postDiscomfort?: YesNo | "";
  readyToRetest?: boolean;
  retestPlan?: RetestPlan | null;
  movementResponse: RangeRetestAnswer | "smoother" | "both-better" | "active-better-passive-limited" | "same";
  movementResponses?: Record<string, CompletedRangeRetestAnswer>;
  movementDiscomforts?: Record<string, YesNo>;
  movementScores?: Record<string, number>;
  movementScoreConfirmed?: Record<string, boolean>;
  exerciseFeedback: Record<string, ExerciseFeedback>;
  trainingComplete: boolean;
  treatmentFinalRetestScore?: number;
  treatmentFinalRetestConfirmed?: boolean;
  trainingReadyForFinalRetest?: boolean;
  finalRetestScore?: number;
  finalRetestConfirmed?: boolean;
  followupMode: boolean;
  sessionNumber: number;
  followupScore: number;
  followupScoreConfirmed?: boolean;
  followupScoreHistory: number[];
  followupStage: FollowupStage;
  followupPostScore: number;
  followupPostScoreConfirmed?: boolean;
  followupPostDiscomfort?: YesNo | "";
  followupCandidateId: string;
  followupTrialRecords: FollowupTreatmentRecord[];
  followupReadyToRetest?: boolean;
  followupRetestPlan?: RetestPlan | null;
  followupMovementResponses?: Record<string, CompletedRangeRetestAnswer>;
  followupMovementDiscomforts?: Record<string, YesNo>;
  followupMovementScores?: Record<string, number>;
  followupMovementScoreConfirmed?: Record<string, boolean>;
  followupTensionLocations?: string[];
  followupExerciseChoices: Record<string, FollowupExerciseChoice>;
  followupTrainingReadyForRetest?: boolean;
  followupFinalScore?: number;
  followupFinalScoreConfirmed?: boolean;
  hasNewSymptom: FollowupNewSymptomAnswer | boolean;
  followupTrends: Record<string, FollowupReviewAnswer>;
  sessionHistory?: RehabSessionSummary[];
  assessmentRevision?: number;
  treatmentPlanRevision?: number;
  adverseResponse?: AdverseResponseEvent | null;
  adverseConfirmedAssessmentIds?: string[];
};

type SavedDemoRecord = {
  id: string;
  savedAt: string;
  region: string;
  complaint: string;
  goal: string;
  initialScore: number;
  latestScore: number;
  scoreComparable?: boolean;
  sessionCount: number;
  caseKey?: string;
  sessionHistory?: RehabSessionSummary[];
  status: "康复中" | "等待影像" | "待医学评估" | "待复查" | "处理后加重，待重新评估" | "训练后加重，待重新评估" | "评估未完成" | "现有检查未形成明确处理方向" | "处理后主诉未明显改善" | "处理完成";
  snapshot?: SavedDemoSnapshot;
};

const SHARED_TENSION_ASSESSMENT_ID = "shared:pilot-muscle-tension";

const STEPS = ["症状信息", "关键确认", "评估检查", "处理复测", "训练居家", "康复总结"];
const PILOT_REGION_IDS = ["thigh-local", "knee", "calf-local", "ankle-foot"] as const satisfies readonly FullRegionId[];
type PilotDemoRegionId = (typeof PILOT_REGION_IDS)[number];
const isPilotRegion = (regionId: string): regionId is PilotDemoRegionId => PILOT_REGION_IDS.includes(regionId as PilotDemoRegionId);
function pilotInputFromIntake(intake: IntakeState, confirmed: IntakeMultiConfirmation): PilotIntakeInput {
  const selectedLocations = intake.bodyLocations;
  return {
    userRole: intake.userRole,
    regionIds: Array.from(new Set((selectedLocations.length
      ? selectedLocations.map((item) => item.regionId)
      : isPilotRegion(intake.regionId) ? [intake.regionId] : []).filter(isPilotRegion))),
    locations: selectedLocations.length
      ? Array.from(new Set(selectedLocations.map((item) => item.location).filter(Boolean)))
      : [intake.location].filter(Boolean),
    onset: intake.onset,
    mechanism: intake.mechanism,
    symptomType: intake.symptomType,
    symptoms: intake.symptoms,
    symptomsConfirmed: confirmed.symptoms,
    provocationTypes: intake.provocationTypes,
    provocationConfirmed: confirmed.provocationTypes,
    currentTask: reportedActionSummary(intake).join("、") || intake.actionAnalysis?.task || intake.forceDirection,
    noFixedTask: intake.provocationTypes.includes("说不清 / 没有固定动作") && reportedActionSummary(intake).length === 0,
    baselineScoreConfirmed: intake.baselineScoreConfirmed,
    swellingLocation: intake.swellingLocation,
    tendernessLocation: intake.tendernessLocation,
    sensoryLocation: intake.sensoryLocation,
    goal: intake.goal,
  };
}
const STAGE_TRANSITIONS: Record<TransitionTarget, { step: Step; number: string; title: string; message: string; button: string }> = {
  assessment: { step: 2, number: "03", title: "症状信息收集完毕", message: "接下来开始评估检查，请跟随提示完成对应操作。", button: "开始评估检查" },
  treatment: { step: 3, number: "04", title: "评估检查完成", message: "接下来开始处理并复测，请跟随提示完成对应操作。", button: "开始处理并复测" },
  training: { step: 4, number: "05", title: "处理复测完成", message: "接下来开始训练，请跟随提示完成对应训练内容。", button: "开始训练" },
  summary: { step: 5, number: "06", title: "本次康复完成", message: "接下来开始复盘。", button: "查看本次康复总结" },
};
const ONSETS = ["今天或昨天", "2～7天", "1～6周", "超过6周", "反复出现"];
const MECHANISMS = ["没有明确受伤", "扭转或崴伤", "跌倒或碰撞", "跑跳或拉伤", "逐渐出现", "其他"];
const SYMPTOM_TYPES = ["疼痛，性质说不清", "酸痛", "胀痛", "刺痛", "烧灼或火辣", "牵扯或紧绷", "挤、卡或弹响", "麻或电感", "无力或不稳", "说不清的不适"];
const SYMPTOM_TYPE_GROUPS = [
  { title: "疼痛或牵扯感", options: ["疼痛，性质说不清", "酸痛", "胀痛", "刺痛", "烧灼或火辣", "牵扯或紧绷"] },
  { title: "其他异常感觉", options: ["挤、卡或弹响", "麻或电感", "无力或不稳", "说不清的不适"] },
];
const SYMPTOMS = ["肿胀或淤青", "按压痛", "活动受限", "力量不足", "麻、电或感觉变化"];
const PROVOCATION_TYPES = ["活动到某个角度", "用力或对抗阻力", "走路、站立或负重", "按压", "静止或夜间", "运动过程中", "运动结束后", "说不清 / 没有固定动作", "其他情况"];
const PRIOR_CARE_OPTIONS = ["看过医生", "拍过片", "用过膏药", "做过针灸或理疗", "用过冰敷"];
const GOALS = [
  { level: 1, title: "急性反应减轻", short: "先让肿胀和静息不适稳定" },
  { level: 2, title: "基础症状改善", short: "疼痛或异常感觉明显减轻" },
  { level: 3, title: "恢复正常生活", short: "走路、楼梯、穿衣和拿取" },
  { level: 4, title: "恢复一般运动", short: "跑步、健身、瑜伽或球类" },
  { level: 5, title: "恢复高强度与对抗", short: "速度、疲劳、变向或碰撞" },
];
const FUNCTION_COMPENSATIONS: Record<string, string[]> = {
  "function:knee-squat": ["两边膝盖高度不一样", "膝盖明显向内偏", "脚跟提前抬起"],
  "function:ankle-squat": ["两边膝盖高度不一样", "膝盖明显向内偏", "脚跟提前抬起"],
  "function:knee-single-leg": ["身体明显晃动", "不舒服的那边明显更难站稳"],
  "function:knee-single-leg-squat": ["骨盆明显歪斜", "膝盖明显向内偏", "足弓明显塌下", "需要扶持或无法控制下降"],
  "function:knee-step-down": ["膝盖明显向内偏", "身体或骨盆歪向一边", "下降时突然掉下去", "需要扶住栏杆"],
  "function:knee-step-up": ["膝盖明显向内偏", "身体明显向前或向一边倒", "主要靠另一条腿蹬起", "需要用手拉栏杆"],
  "function:ankle-single-leg": ["身体明显晃动", "不舒服的那边明显更难站稳"],
  "function:knee-heel-raise": ["身体明显晃动", "不舒服的那边抬起高度更低"],
  "function:ankle-heel-raise": ["身体明显晃动", "不舒服的那边抬起高度更低"],
  "function:ankle-weight-bearing": ["走路明显一瘸一拐", "不敢让不舒服的一边踩实", "需要扶着才能走", "脚步明显变短"],
  "function:ankle-knee-wall": ["脚跟提前抬起", "膝盖向内或向外偏", "足弓塌下", "踝前卡住或小腿牵扯"],
  "function:ankle-hop": ["落地不敢承重", "脚踝向内或向外晃", "落地时膝盖明显内扣", "无法连续完成"],
  "function:thigh-walk": ["迈步时跛行", "患侧支撑时间变短", "身体向一侧偏", "蹬地时症状明显"],
  "function:thigh-sit-stand": ["起身时偏向另一侧", "膝盖向内偏", "需要用手撑", "坐下时突然掉下去"],
  "function:thigh-bridge-check": ["骨盆一侧下沉", "腰部代偿顶起", "患侧抬起高度更低", "大腿后侧抽筋"],
  "function:thigh-single-leg": ["骨盆下沉", "身体明显侧倒", "膝盖向内偏", "无法保持10秒"],
  "function:thigh-jog": ["落地时疼或不敢承重", "步幅明显变短", "身体上下起伏不稳", "无法连续完成"],
  "function:calf-walk": ["脚跟落地不稳", "脚步明显变短", "蹬地不足", "走路时小腿症状明显"],
  "function:calf-heel-raise": ["患侧抬起高度更低", "身体向一侧偏", "脚趾抓地", "无法连续完成"],
  "function:calf-single-leg": ["足弓塌下", "脚踝反复向内或向外晃", "身体明显晃动", "不舒服的一侧更难站稳"],
  "function:calf-jog": ["落地或蹬地时出现症状", "步幅明显变短", "不敢连续跑", "无法完成小步慢跑"],
  "function:neck-turn-task": ["用躯干代替转头", "肩膀跟着转", "一侧明显转不到位", "转头时出现麻或电感"],
  "function:neck-screen-task": ["很快需要改变姿势", "回正后仍不缓解", "头部前伸", "症状逐渐增加"],
  "function:neck-arm-lift-task": ["耸肩", "伸颈", "头部偏向一侧", "抬手时出现麻或电感"],
  "function:shoulder-overhead-task": ["耸肩代偿", "躯干向一侧偏", "出现疼痛弧", "放下时控制不住"],
  "function:shoulder-dress-task": ["需要弯腰或转身借力", "一侧明显够不到", "动作中途卡住", "放下手臂时疼"],
  "function:shoulder-push-pull": ["肩胛骨翘起", "耸肩", "推拉力量明显不对称", "推或拉时出现熟悉不适"],
  "function:shoulder-support": ["肩胛骨翘起", "肘部锁死或晃动", "身体向一侧偏", "无法保持支撑"],
  "function:thoracic-turn-task": ["骨盆跟着转", "腰椎代偿明显", "一侧转动幅度更小", "呼吸被限制"],
  "function:thoracic-overhead-task": ["腰部过度后仰", "耸肩", "肩胛运动不顺", "抬手高度明显不同"],
  "function:thoracic-breath-task": ["一侧胸廓扩张明显较少", "吸气时疼痛", "呼吸变浅", "无法完成三次缓慢呼吸"],
  "function:elbow-grip-lift": ["需要耸肩或甩腕", "握持不稳", "提起时肘部偏移", "放下时控制不住"],
  "function:elbow-push-task": ["肘部向内或向外偏", "肩胛翘起", "伸肘末端卡住", "推墙时疼痛"],
  "function:elbow-throw-task": ["准备、加速或减速阶段出现症状", "肩或躯干代偿", "肘部轨迹偏移", "无法完成动作"],
  "function:wrist-mouse-task": ["手腕持续抬起", "拇指夹紧", "前臂过度旋转", "症状逐渐增加"],
  "function:wrist-twist-task": ["旋转范围明显较小", "握力下降", "尺侧或桡侧疼痛", "需要耸肩借力"],
  "function:wrist-support-task": ["患侧不敢承重", "腕部向一侧塌下", "肘肩代偿", "无法保持5秒"],
  "function:wrist-carry-task": ["握持不稳", "腕部偏向一侧", "肘肩代偿", "提起或放下时疼痛"],
  "function:lumbar-sit-rise": ["需要用手撑", "身体偏向一侧", "腰部先动而髋部不动", "起身或坐下时症状明显"],
  "function:lumbar-bend-lift": ["腰部代偿多于髋部", "物品离身体太远", "回起时突然发力", "需要扶住才能完成"],
  "function:lumbar-roll-bed": ["肩和骨盆不同步", "需要用手撑起", "翻身中途停住", "起身时症状明显"],
  "function:lumbar-walk-task": ["步幅变短", "骨盆明显晃动", "单腿支撑不稳", "症状随走路增加"],
  "function:hip-squat": ["骨盆偏向一侧", "膝盖内扣", "脚跟提前抬起", "下蹲深度明显不足"],
  "function:hip-single-leg": ["骨盆下沉或旋转", "身体侧倒", "膝盖不稳", "无法保持20秒"],
  "function:hip-step": ["骨盆偏移", "膝盖内扣", "主要靠另一侧抬起", "下台阶时突然掉下"],
  "function:hip-gait": ["步幅变短", "髋部不能后伸", "骨盆晃动", "蹬地时症状明显"],
};
const GENERIC_FUNCTION_COMPENSATIONS = ["左右用力不一样", "身体明显晃动", "动作幅度偏小", "需要扶持或借力"];
function functionCompensationOptions(itemId: string) {
  return FUNCTION_COMPENSATIONS[itemId]?.length ? FUNCTION_COMPENSATIONS[itemId] : GENERIC_FUNCTION_COMPENSATIONS;
}
const BILATERAL_OBSERVE: Record<string, string> = {
  "ankle-dorsiflexion": "脚背能不能明显靠近小腿？注意看脚背，不要只把脚尖勾起来。",
  "ankle-plantarflexion": "脚背能不能向下压到接近和小腿平直？",
  "ankle-inversion": "两只脚分别向内转，记录哪一侧范围更小或更不舒服。",
  "ankle-eversion": "两只脚分别向外转，记录哪一侧范围更小或更不舒服。",
  "ankle-dorsiflexor": "两侧分别保持勾脚5秒，观察哪一侧更快掉下来或需要脚趾代偿。",
  "ankle-calf": "能不能连续完成10次标准提踵，不靠脚趾抓地？",
  "ankle-squat": "下蹲时两侧脚跟能否保持着地，膝盖方向是否一致。",
  "ankle-single-leg": "左右单腿站能不能各坚持10秒？",
  "ankle-heel-raise": "左右提踵高度和稳定性是否接近。",
  "knee-extension": "两侧分别绷直膝盖，记录哪一侧更难压平或更不舒服。",
  "knee-flexion": "两侧分别弯膝，记录哪一侧更难靠近臀部或更不舒服。",
  "knee-quadriceps": "两侧分别绷紧大腿保持5秒，记录哪一侧更容易抖或掉力。",
  "knee-posterior-chain": "比较两侧承担重量时的稳定性，记录哪一侧更难保持骨盆平稳或更容易抽筋。",
  "knee-squat": "下蹲时观察两边膝盖高度和方向是否一致。",
  "knee-single-leg": "左右单腿站能不能各坚持10秒？",
  "knee-heel-raise": "左右提踵高度和稳定性是否接近。",
};

const bilateralMotionOptions: Array<[BilateralMotionAnswer | "same" | "unable" | "unsure", string]> = [
  ["same", "两侧接近｜与平时范围相近"],
  ["left-limited", "左侧偏小｜左侧更差"],
  ["right-limited", "右侧偏小｜右侧更差"],
  ["both-limited", "两侧偏小｜两侧都受限"],
  ["unable", "无法完成｜疼痛或其他原因"],
  ["unsure", "暂不判断｜无法比较"],
];

function motionAnswerIsLimited(value?: AssessmentRecord["active"]) {
  return ["limited", "left-limited", "right-limited", "both-limited"].includes(value ?? "");
}

function discomfortDecisionTags(value?: string) {
  if (!value) return [];
  if (includesAny(value, ["麻", "电"])) return ["assessment-neural", "conservative"];
  if (value.includes("刺")) return ["assessment-sharp", "conservative"];
  if (includesAny(value, ["牵扯", "紧绷", "拉扯"])) return ["assessment-pull", "muscle", "mobility"];
  if (includesAny(value, ["酸", "沉", "胀"])) return ["assessment-ache", "muscle", "control"];
  return [];
}

const SAFETY_ITEMS = [
  { id: "shape", text: "有明显错位、异常轮廓或开放伤口", note: "单纯肿胀、淤青不算明显错位" },
  { id: "vascular", text: "远端持续发白、发凉或感觉明显下降", note: "局部受伤后的淤青单独记录" },
  { id: "neuro", text: "受伤部位以下持续麻木、感觉下降或越来越无力", note: "不是因为疼痛暂时不敢发力" },
  { id: "systemic", text: "发热，同时局部红、热、肿快速加重", note: "需要结合整体状态判断" },
  { id: "calf-clot", text: "没有明确受伤，但单侧小腿突然肿、热、红、痛", note: "尤其近期久坐、手术、卧床或既往有血栓时" },
];
const IMAGING_OPTIONS = [
  "没有做影像",
  "未见骨折",
  "有骨折或骨裂异常",
  "韧带损伤或撕裂",
  "肌腱损伤或撕裂",
  "骨挫伤或骨髓水肿",
  "积液或软组织肿胀",
  "医生已允许按建议康复",
  "医生有限制",
  "不确定报告内容",
];

const DEFAULT_INTAKE: IntakeState = {
  description: "",
  parsed: false,
  userRole: "",
  examSetup: "",
  productMode: "",
  operationTarget: "",
  capabilities: emptyCapabilities(),
  capabilitiesConfirmed: false,
  learningExplanation: false,
  spineAssessmentMode: "",
  regionId: "",
  side: "",
  location: "",
  bodyLocations: [],
  locationConfirmed: false,
  onset: "",
  mechanism: "",
  symptomType: "",
  painQualityConfirmed: false,
  symptoms: [],
  provocationTypes: [],
  forceDirection: "",
  swellingLocation: "",
  swellingLocations: [],
  swellingLocationConfirmed: false,
  tendernessLocation: "",
  tendernessLocations: [],
  tendernessLocationConfirmed: false,
  sensoryLocation: "",
  sensoryLocations: [],
  sensoryLocationConfirmed: false,
  reproduction: "",
  reportedActions: [],
  customAction: "",
  actionSelectionConfirmed: false,
  professionalNotes: "",
  actionAnalysis: null,
  goal: 0,
  baselineScore: 0,
  baselineScoreConfirmed: false,
  stabbingSpread: "",
  stabbingPalpation: "",
  priorCare: [],
};

const EXAMPLE_DESCRIPTION = "右膝内侧下楼梯时刺痛，跑步后慢慢出现两周了，走平路还好，想恢复跑步。";

/**
 * 旧版记录只保存了 userRole/examSetup；新版记录保存产品模式、操作对象和
 * 能力声明。恢复记录时统一走这里，避免旧快照在症状页出现“字段不存在”或
 * 直接跳过操作对象的问题。
 */
function migrateIntakeState(raw: Partial<IntakeState> | undefined): IntakeState {
  const legacyRole = raw?.userRole ?? "";
  const legacySetup = raw?.examSetup ?? "";
  const legacyProfile = workflowProfileFromLegacy(legacyRole, legacySetup);
  const productMode = raw?.productMode || legacyProfile.productMode;
  const operationTarget = raw?.operationTarget || legacyProfile.operationTarget;
  const capabilities = raw?.capabilities ?? legacyProfile.capabilities;
  return {
    ...DEFAULT_INTAKE,
    ...raw,
    productMode,
    operationTarget,
    capabilities,
    capabilitiesConfirmed: raw?.capabilitiesConfirmed ?? Boolean(raw?.productMode || legacyRole),
    learningExplanation: raw?.learningExplanation ?? legacyProfile.learningExplanation,
    userRole: raw?.userRole || (productMode === "guided" ? "general" : "rehab"),
    examSetup: raw?.examSetup || (operationTarget === "other" ? "professional-other" : "self"),
    bodyLocations: raw?.bodyLocations ?? [],
    swellingLocations: raw?.swellingLocations ?? [],
    tendernessLocations: raw?.tendernessLocations ?? [],
    sensoryLocations: raw?.sensoryLocations ?? [],
    symptoms: raw?.symptoms ?? [],
    provocationTypes: raw?.provocationTypes ?? [],
    reportedActions: raw?.reportedActions ?? [],
    customAction: raw?.customAction ?? "",
    actionSelectionConfirmed: raw?.actionSelectionConfirmed ?? Boolean(raw?.reproduction),
    professionalNotes: raw?.professionalNotes ?? "",
    priorCare: raw?.priorCare ?? [],
  };
}

function canonicalIntakeField(field: string) {
  if (field === "使用身份") return "使用方式";
  if (field === "检查方式") return "操作对象";
  return field;
}

function locationSelectionsLabel(items: LowerLimbLocationSelection[]) {
  return items.map((item) => `${item.side}·${item.location}`).join("、");
}

function sideFromLocationSelections(items: LowerLimbLocationSelection[]) {
  const sides = new Set(items.map((item) => item.side).filter((side) => side === "左侧" || side === "右侧"));
  if (sides.size > 1) return "双侧/中间";
  return items[0]?.side ?? "";
}

function extractProvokingAction(text: string) {
  const actionWords = [
    "走", "站", "蹲", "楼", "台阶", "跑", "跳", "抬", "举", "推", "拉", "拧", "转", "坐", "撑", "负重", "按压", "发力", "用力", "使劲",
    "抬脚", "迈步", "踩地", "落脚", "一瘸一拐",
    "低头", "仰头", "弯腰", "后仰", "侧屈", "前屈", "屈曲", "伸直", "弯曲", "摸背", "掌心向上", "掌心向下",
    "外旋", "内旋", "外展", "内收", "勾脚", "踩油门", "提踵", "踮脚", "内翻", "外翻", "脚掌向内", "脚掌向外", "squat", "squatting", "walk", "walking",
  ];
  const symptomWords = ["痛", "疼", "不适", "不舒服", "刺", "针扎", "胀", "酸", "麻", "卡", "扯", "紧", "挤", "无力", "不稳", "腿软", "打软", "发软", "走不了", "站不了", "蹲不了", "动不了"];
  const negativeWords = ["还好", "没事", "不痛", "不疼", "不会", "没有不适", "没感觉"];
  const injuryEventWords = ["崴", "扭伤", "拉伤", "摔", "跌", "撞", "受伤", "弄伤"];
  const timingWords = ["后开始", "后出现", "之后开始", "结束后", "跑完后", "第二天", "隔天"];
  const goalWords = ["想恢复", "希望恢复", "目标是", "以后想", "重新开始", "回到运动"];
  const clauses = text.split(/[，。；！？\n]/).map((part) => part.trim()).filter(Boolean);

  const actionPriority = (part: string) => {
    if (includesAny(part, ["走路", "行走", "步行", "上楼", "下楼", "台阶", "下蹲", "蹲起", "起身", "跑步", "慢跑", "跳", "落地", "单腿站", "站立", "久站"])) return 4;
    if (includesAny(part, ["弯腰", "后仰", "转身", "转体", "勾脚", "踩油门", "提踵", "踮脚", "内翻", "外翻", "伸直", "弯曲", "屈曲"])) return 3;
    if (includesAny(part, ["发力", "用力", "使劲", "抗阻", "对抗"])) return 2;
    if (includesAny(part, ["按压", "压痛", "一按"])) return 1;
    return 0;
  };

  const highestPriorityClause = (items: string[]) => items
    .map((part, order) => ({ part, order, priority: actionPriority(part) }))
    .sort((a, b) => b.priority - a.priority || a.order - b.order)[0]?.part ?? "";

  const clearActionClauses = clauses.filter((part) => {
    if (!includesAny(part, actionWords) || !includesAny(part, symptomWords)) return false;
    if (includesAny(part, negativeWords) || includesAny(part, goalWords)) return false;
    if (includesAny(part, timingWords) && !includesAny(part, ["会痛", "会疼", "不舒服", "酸", "胀", "麻", "紧", "扯", "卡"])) return false;
    if (includesAny(part, injuryEventWords) && !includesAny(part, ["现在", "目前", "会痛", "会疼", "不舒服", "酸", "胀"])) return false;
    if (part.includes("后") && !includesAny(part, ["现在", "目前", "会痛", "会疼", "不舒服", "酸", "胀", "麻", "紧", "扯", "卡"])) return false;
    return true;
  });
  const clearActionClause = highestPriorityClause(clearActionClauses);
  if (clearActionClause) return clearActionClause;

  const fallbackActionClauses = clauses.filter((part) => {
    if (!includesAny(part, actionWords)) return false;
    if (includesAny(part, negativeWords) || includesAny(part, goalWords)) return false;
    if (includesAny(part, injuryEventWords) && !includesAny(part, ["现在", "目前", "也不行", "不能", "一瘸一拐"])) return false;
    if (includesAny(part, timingWords) && !includesAny(part, ["更明显", "加重", "难受", "也不行", "不能"])) return false;
    return includesAny(part, ["更明显", "加重", "难受", "也不行", "不能", "一瘸一拐", "费劲", "受限"]);
  });
  return highestPriorityClause(fallbackActionClauses);
}

function analyzeChiefAction(text: string, regionId: string, forceDirection = "", preferredRaw = ""): ChiefActionAnalysis | null {
  const preferred = preferredRaw.trim() || extractProvokingAction(text);
  const raw = isUnclearAction(preferred) ? "" : preferred;
  if (isUnclearAction(forceDirection)) forceDirection = "";
  const source = `${raw} ${forceDirection}`.trim();
  if (!raw && !forceDirection) return null;

  const actionMap: Array<{ words: string[]; value: Omit<ChiefActionAnalysis, "raw"> }> = [
    { words: ["转头"], value: { category: "颈部转动", task: includesAny(source, ["向左", "左转"]) ? "向左转头" : includesAny(source, ["向右", "右转"]) ? "向右转头" : "转头", function: "颈部旋转和查看侧后方", load: "非负重活动", direction: includesAny(source, ["向左", "左转"]) ? "向左旋转" : includesAny(source, ["向右", "右转"]) ? "向右旋转" : "旋转方向待确认", retest: "保持肩膀和躯干不动，用相同速度向原方向转头" } },
    { words: ["低头"], value: { category: "脊柱活动", task: "低头", function: "颈部前屈和低头使用", load: "非负重活动", direction: "颈部前屈", retest: "保持坐姿和肩膀放松，用相同速度再低头一次" } },
    { words: ["抬头", "仰头"], value: { category: "脊柱活动", task: "抬头", function: "颈部后伸和向上查看", load: "非负重活动", direction: "颈部后伸", retest: "保持躯干不后仰，用相同速度再抬头一次" } },
    { words: ["侧屈", "歪头"], value: { category: "脊柱活动", task: includesAny(source, ["向左", "左侧屈"]) ? "向左侧屈" : includesAny(source, ["向右", "右侧屈"]) ? "向右侧屈" : "侧屈", function: "脊柱侧向活动和控制", load: "非负重活动", direction: includesAny(source, ["向左", "左侧屈"]) ? "向左侧屈" : includesAny(source, ["向右", "右侧屈"]) ? "向右侧屈" : "侧屈方向待确认", retest: "保持躯干不旋转，用相同速度向原方向侧屈" } },
    { words: ["弯腰", "前屈"], value: { category: "躯干活动", task: "弯腰", function: "腰髋前屈和躯干控制", load: "站立活动", direction: "腰髋前屈", retest: "保持脚位和速度相同，再弯腰到原来的范围" } },
    { words: ["后仰"], value: { category: "脊柱活动", task: regionId === "neck" ? "抬头或颈部后仰" : "躯干后仰", function: regionId === "neck" ? "颈部后伸" : "腰椎后伸和躯干控制", load: "站立活动", direction: "后伸", retest: "保持脚位和速度相同，再做一次后仰" } },
    { words: ["转身", "转体"], value: { category: "躯干转动", task: includesAny(source, ["向左", "左转"]) ? "向左转身" : includesAny(source, ["向右", "右转"]) ? "向右转身" : "转身", function: "胸腰椎旋转和躯干控制", load: "日常活动", direction: includesAny(source, ["向左", "左转"]) ? "向左旋转" : includesAny(source, ["向右", "右转"]) ? "向右旋转" : "旋转方向待确认", retest: "固定脚位或坐姿，用相同速度向原方向转身" } },
    { words: ["下楼", "下台阶"], value: { category: "楼梯", task: "下楼梯", function: "单腿承重、髋膝踝减速控制", load: "负重", direction: "屈髋、屈膝和踝背屈", retest: "用同一台阶、同一侧先下，再做一次" } },
    { words: ["上楼", "上台阶"], value: { category: "楼梯", task: "上楼梯", function: "单腿承重、髋膝踝向上发力", load: "负重", direction: "伸髋、伸膝和踝跖屈", retest: "用同一台阶、同一侧先上，再做一次" } },
    { words: ["深蹲", "下蹲", "蹲起", "蹲下", "蹲", "起身", "站起", "站起来", "squat", "squatting"], value: { category: "蹲起", task: includesAny(source, ["蹲", "squat"]) ? (includesAny(source, ["起身", "站起", "起来"]) && !includesAny(source, ["蹲下", "下蹲", "蹲起", "蹲", "squat"]) ? "起身" : "蹲起") : "起身", function: "髋膝踝协同屈伸", load: "负重", direction: "屈髋、屈膝和踝背屈", retest: "用相同深度和扶持方式，再做一次" } },
    { words: ["跑步", "慢跑", "跑", "冲刺"], value: { category: "跑步", task: includesAny(source, ["冲刺"]) ? "冲刺" : "跑步", function: "单腿承重、缓冲和蹬地", load: "动态负重", direction: "髋膝踝连续屈伸", retest: "用相同速度和距离，再做一次" } },
    { words: ["跳", "落地"], value: { category: "跳跃", task: includesAny(source, ["落地"]) ? "落地" : "跳跃", function: "下肢蹬伸、落地缓冲和稳定", load: "冲击负重", direction: "髋膝踝快速屈伸", retest: "用相同高度、方向和落地方式，再做一次" } },
    { words: ["走路", "行走", "步行", "抬脚", "迈步", "踩地", "落脚", "一瘸一拐", "走", "walk", "walking"], value: { category: "走路", task: "走路", function: "连续承重、髋膝踝联动", load: "负重", direction: "脚跟着地到脚尖蹬地", retest: "走相同距离，保持相同速度和扶持方式" } },
    { words: ["站立", "久站", "负重"], value: { category: "站立负重", task: includesAny(source, ["单脚", "单腿"]) ? "单腿站立" : "站立负重", function: "持续承重和身体稳定", load: includesAny(source, ["单脚", "单腿"]) ? "单腿负重" : "负重", direction: "保持身体与关节稳定", retest: "保持相同站立时间和扶持方式，再做一次" } },
    { words: ["抬手", "举手", "上举"], value: { category: "抬手", task: "抬手", function: "肩胛骨稳定与肩关节抬举", load: "上肢活动", direction: "肩关节向前或向外抬起", retest: "用相同方向和高度，再抬一次" } },
    { words: ["向前推", "推", "撑"], value: { category: "推", task: includesAny(source, ["撑", "俯卧撑"]) ? "支撑或推起" : "向前推", function: "肩胛骨稳定与上肢推力", load: "上肢发力", direction: "向前或向外推", retest: "用相同阻力和手臂位置，再推一次" } },
    { words: ["向后拉", "拉"], value: { category: "拉", task: "向后拉", function: "肩胛骨稳定与上肢拉力", load: "上肢发力", direction: "向后拉", retest: "用相同阻力和手臂位置，再拉一次" } },
    { words: ["拧", "旋转", "转动"], value: { category: "旋转", task: includesAny(source, ["拧毛巾"]) ? "拧毛巾" : "旋转动作", function: "关节旋转控制和握力配合", load: "旋转发力", direction: "向症状出现的方向旋转", retest: "用相同方向和阻力，再做一次" } },
    { words: ["按压", "压痛", "一按"], value: { category: "按压", task: "按压患处", function: "局部触压反应", load: "轻触压", direction: "按压已记录的位置", retest: "后续只在同一位置轻柔比较，不反复重按" } },
    { words: ["静止", "不动", "夜间", "晚上", "睡觉", "休息"], value: { category: "静息", task: includesAny(source, ["夜间", "晚上", "睡觉"]) ? "夜间或睡觉时" : "静止休息时", function: "静息状态", load: "无主动负重", direction: "保持原来容易出现症状的体位", retest: "记录持续时间和评分，留到稍后或下次比较" } },
    { words: ["发力", "用力", "使劲", "抗阻", "对抗"], value: { category: "发力", task: forceDirection || "局部发力", function: "局部肌肉抗阻发力", load: "对抗阻力", direction: forceDirection || "需要在评估时确认", retest: "用相同方向和阻力，再发力一次" } },
  ];

  const matched = actionMap.find((item) => includesAny(source, item.words));
  if (matched) return { raw: raw || matched.value.task, ...matched.value };
  return {
    raw: raw || forceDirection,
    category: "其他动作",
    task: raw || forceDirection,
    function: regionId ? "需要结合身体区域在评估中确认" : "需要先确认身体区域",
    load: includesAny(source, ["负重", "提", "抗阻", "用力", "发力"]) ? "有负荷" : "待确认",
    direction: forceDirection || "待确认",
    retest: `用相同方式再做一次“${raw || forceDirection}”`,
  };
}

function inferRegion(text: string) {
  const normalized = text.toLowerCase();
  const map: Array<[string, string[]]> = [
    ["neck", ["颈肩交界", "颈脖", "颈脖子", "颈部", "枕下", "转头"]],
    ["thoracic-rib", ["胸椎", "肋骨", "胸廓", "上背", "胸背"]],
    ["shoulder", ["肩关节", "肩胛", "肩顶部", "肩外侧", "肩前", "肩后", "抬手", "摸背", "肩"]],
    ["elbow", ["网球肘", "高尔夫球肘", "肘"]],
    ["wrist-hand", ["手脖子", "手腕", "腕", "拇指", "手指", "掌心"]],
    ["lumbar-pelvis", ["腰骶", "腰", "骨盆", "坐骨"]],
    ["hip-thigh", ["髋", "腹股沟", "臀部", "大腿根", "腿根"]],
    ["thigh-local", ["大腿前侧", "大腿后侧", "大腿内侧", "大腿外侧", "大腿中段", "大腿"]],
    ["knee", ["膝盖", "漆盖", "膝", "髌骨", "鹅足", "knee"]],
    ["calf-local", ["小腿前侧", "小腿后侧", "小腿内侧", "小腿外侧", "小腿肚", "胫骨前侧", "腓肠肌", "小腿"]],
    ["ankle-foot", ["脚脖子", "脚踝", "脚腕", "崴脚", "歪脚", "ankle", "踝", "足底", "足跟", "跟腱", "脚背", "脚面", "脚趾", "脚后跟", "脚跟", "后跟"]],
  ];
  const ranked = map.map(([id, words], order) => ({
    id,
    order,
    score: words.reduce((score, word) => normalized.includes(word) ? score + Math.max(2, word.length * 2) : score, 0),
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);
  return ranked[0]?.id ?? "";
}

function inferPilotRegions(text: string): FullRegionId[] {
  const normalized = text.toLowerCase();
  const detected: FullRegionId[] = [];
  if (includesAny(normalized, ["大腿前侧", "大腿后侧", "大腿内侧", "大腿外侧", "大腿中段", "大腿拉伤"])) detected.push("thigh-local");
  if (includesAny(normalized, ["膝盖", "漆盖", "膝", "髌骨", "鹅足", "knee"])) detected.push("knee");
  if (includesAny(normalized, ["小腿前侧", "小腿后侧", "小腿内侧", "小腿外侧", "小腿肚", "胫骨前侧", "腓肠肌", "小腿拉伤"])) detected.push("calf-local");
  if (includesAny(normalized, ["脚脖子", "脚踝", "脚腕", "崴脚", "歪脚", "ankle", "踝", "足底", "足跟", "跟腱", "脚背", "脚面", "脚趾", "脚后跟", "脚跟", "后跟"])) detected.push("ankle-foot");
  return detected;
}

function inferSymptomSide(text: string, currentSide = "") {
  if (includesAny(text, ["双侧", "两侧", "两边", "两只", "双膝", "双踝", "正中", "中间"])) return "双侧/中间";
  if (mentionsBothSymptomSides(text)) return "";
  const bodyWords = "颈|肩|肘|腕|手|胸|背|腰|髋|腹股沟|大腿|膝|小腿|踝|脚腕|脚|足|跟";
  const sideBeforeBody = text.match(new RegExp(`(左|右)侧?(?=(?:${bodyWords}))`));
  if (sideBeforeBody) return sideBeforeBody[1] === "左" ? "左侧" : "右侧";
  const bodyBeforeSide = text.match(new RegExp(`(?:${bodyWords})(?:部|关节)?(左|右)侧`));
  if (bodyBeforeSide) return bodyBeforeSide[1] === "左" ? "左侧" : "右侧";
  const plainSide = text.match(/(?:^|[，。；、\s])(左边|右边)(?=[^，。；]{0,6}(?:疼|痛|酸|胀|麻|不适|受限))/);
  if (plainSide) return plainSide[1] === "左边" ? "左侧" : "右侧";
  if (/\bleft\b/i.test(text)) return "左侧";
  if (/\bright\b/i.test(text)) return "右侧";
  return currentSide;
}

function mentionsBothSymptomSides(text: string) {
  const bodyOrSymptom = "膝|腿|脚|足|踝|疼|痛|酸|胀|麻|不适|崴|扭|肿";
  const mentionsLeft = new RegExp(`左(?:侧|边)?[^，。；]{0,8}(?:${bodyOrSymptom})|(?:${bodyOrSymptom})[^，。；]{0,8}左(?:侧|边)?`).test(text);
  const mentionsRight = new RegExp(`右(?:侧|边)?[^，。；]{0,8}(?:${bodyOrSymptom})|(?:${bodyOrSymptom})[^，。；]{0,8}右(?:侧|边)?`).test(text);
  return mentionsLeft && mentionsRight;
}

function inferImagingFromDescription(text: string) {
  const inferred: string[] = [];
  const mentionsImaging = includesAny(text, ["拍过片", "拍片", "核磁", "CT", "ct", "x光", "X光", "影像"]);
  if (mentionsImaging && includesAny(text, ["没骨折", "没有骨折", "未见骨折", "排除骨折", "骨头没事"])) inferred.push("未见骨折");
  else if (mentionsImaging && /(?:有|发现|提示|确认)(?:了)?(?:骨折|骨裂)|(?:骨折|骨裂)(?:异常|明确|已确认)/.test(text)) inferred.push("有骨折或骨裂异常");
  if (includesAny(text, ["医生允许康复", "医生说可以康复", "医生让康复", "可以开始康复"])) inferred.push("医生已允许按建议康复");
  if (includesAny(text, ["医生有限制", "医生说不能", "限制负重", "限制活动"])) inferred.push("医生有限制");
  return inferred;
}

function getGoalLabel(level: number) {
  return GOALS.find((goal) => goal.level === level)?.title ?? "尚未确认";
}

function forceDirectionOptions(regionId: string) {
  const options: Record<string, string[]> = {
    "thigh-local": ["弯曲膝盖", "伸直膝盖", "脚跟向后拉", "双腿向中间夹", "腿向外抬", "说不清，后面检查"],
    "calf-local": ["向上勾脚", "提踵或蹬地", "脚掌向内转", "脚掌向外转", "说不清，后面检查"],
    "ankle-foot": ["脚背向上勾", "脚背向下压", "踮脚或提踵", "脚掌向内转", "脚掌向外转", "脚趾或足弓用力", "说不清，后面检查"],
    knee: ["伸直膝盖", "弯曲膝盖", "下蹲或起身", "上楼或下楼", "说不清，后面检查"],
    "hip-thigh": ["向前抬腿", "腿向后伸", "腿向外打开", "夹腿", "转动髋部", "说不清，后面检查"],
    shoulder: ["抬手", "手臂向外转", "手臂向内转", "向前推", "向后拉", "说不清，后面检查"],
    elbow: ["弯曲手肘", "伸直手肘", "手掌向上或向下转", "握紧或提物", "说不清，后面检查"],
    "wrist-hand": ["手腕向上抬", "手腕向下弯", "握紧", "旋转或拧动", "手指或拇指用力", "说不清，后面检查"],
    neck: ["低头", "抬头", "向左或向右转头", "向一侧歪头", "说不清，后面检查"],
    "lumbar-pelvis": ["弯腰", "后仰", "向一侧弯", "转身", "起身或翻身", "说不清，后面检查"],
    "thoracic-rib": ["转身", "向一侧弯", "深呼吸", "抬手或推拉", "说不清，后面检查"],
  };
  return options[regionId] ?? ["弯曲", "伸直", "向内用力", "向外用力", "推或拉", "说不清，后面检查"];
}

/**
 * 症状收集阶段的动作只记录“用户想复现的动作”。
 * 评估阶段仍会单独记录活动范围和主动控制，不能用这组选项替代查体。
 */
function reportedActionOptions(regionId: string): ReportedAction[] {
  const common: ReportedAction[] = [
    { id: "functional-walk", label: "走路", kind: "functional", raw: "走路" },
    { id: "functional-squat", label: "下蹲或起身", kind: "functional", raw: "下蹲或起身" },
    { id: "functional-stairs", label: "上下楼或下台阶", kind: "functional", raw: "上下楼或下台阶" },
    { id: "functional-single-leg", label: "单腿站立或单腿下蹲", kind: "functional", raw: "单腿站立或单腿下蹲" },
    { id: "functional-run-jump", label: "跑步、跳跃或落地", kind: "functional", raw: "跑步、跳跃或落地" },
  ];
  const direction: Record<string, ReportedAction[]> = {
    "ankle-foot": [
      { id: "ankle-dorsiflexion", label: "踝背屈｜把脚背向小腿方向勾", kind: "joint-direction", raw: "勾脚" },
      { id: "ankle-plantarflexion", label: "踝跖屈｜把脚尖向下绷", kind: "joint-direction", raw: "绷脚或脚尖向下" },
      { id: "ankle-inversion", label: "踝内翻｜把脚底转向身体内侧", kind: "joint-direction", raw: "脚底向内转" },
      { id: "ankle-eversion", label: "踝外翻｜把脚底转向身体外侧", kind: "joint-direction", raw: "脚底向外转" },
      { id: "ankle-heel-raise", label: "提踵｜踮脚或蹬地", kind: "joint-direction", raw: "踮脚或提踵" },
    ],
    "calf-local": [
      { id: "calf-dorsiflexion", label: "踝背屈｜把脚背向小腿方向勾", kind: "joint-direction", raw: "勾脚" },
      { id: "calf-plantarflexion", label: "踝跖屈｜把脚尖向下绷", kind: "joint-direction", raw: "绷脚或脚尖向下" },
      { id: "calf-inversion", label: "踝内翻｜把脚底转向身体内侧", kind: "joint-direction", raw: "脚底向内转" },
      { id: "calf-eversion", label: "踝外翻｜把脚底转向身体外侧", kind: "joint-direction", raw: "脚底向外转" },
    ],
    knee: [
      { id: "knee-extension", label: "膝关节伸直｜把膝盖绷直", kind: "joint-direction", raw: "绷直膝盖" },
      { id: "knee-flexion", label: "膝关节屈曲｜把膝盖弯曲", kind: "joint-direction", raw: "弯曲膝盖" },
    ],
    "thigh-local": [
      { id: "thigh-front-length", label: "膝关节屈曲｜让大腿前侧拉长", kind: "joint-direction", raw: "弯曲膝盖" },
      { id: "thigh-back-length", label: "膝关节伸直｜让大腿后侧拉长", kind: "joint-direction", raw: "绷直膝盖" },
      { id: "thigh-medial-length", label: "髋关节外展｜把腿向外打开", kind: "joint-direction", raw: "把腿向外打开" },
      { id: "thigh-lateral-load", label: "单腿承重｜让大腿外侧参与稳定", kind: "functional", raw: "单腿承重" },
    ],
    "hip-thigh": [
      { id: "hip-flexion", label: "髋关节屈曲｜把大腿向腹部方向抬", kind: "joint-direction", raw: "抬腿" },
      { id: "hip-extension", label: "髋关节伸展｜把腿向身后伸", kind: "joint-direction", raw: "腿向后伸" },
      { id: "hip-abduction", label: "髋关节外展｜把腿向外打开", kind: "joint-direction", raw: "把腿向外打开" },
      { id: "hip-adduction", label: "髋关节内收｜把腿向身体中线靠拢", kind: "joint-direction", raw: "夹腿" },
    ],
  };
  const options = [...(direction[regionId] ?? []), ...common];
  return options.filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index);
}

function inferForceDirection(regionId: string, text: string) {
  const options = forceDirectionOptions(regionId);
  const patterns: Array<[string[], number]> = regionId === "ankle-foot"
    ? [[["勾脚", "背屈", "向上发力"], 0], [["脚背向下", "踩油门", "跖屈", "向下发力"], 1], [["提踵", "踮脚", "蹬地"], 2], [["内翻", "脚掌向内", "向内发力"], 3], [["外翻", "脚掌向外", "向外发力"], 4], [["脚趾", "足弓"], 5]]
    : regionId === "thigh-local"
      ? [[["弯膝", "大腿前侧拉长"], 0], [["伸膝", "踢腿", "大腿前侧发力"], 1], [["屈膝", "脚跟后拉", "大腿后侧"], 2], [["夹腿", "内收", "大腿内侧"], 3], [["外展", "向外抬腿", "大腿外侧"], 4]]
    : regionId === "calf-local"
      ? [[["勾脚", "小腿前"], 0], [["提踵", "蹬地", "小腿后"], 1], [["内翻", "小腿内"], 2], [["外翻", "小腿外"], 3]]
    : regionId === "knee"
      ? [[["伸膝", "伸直", "向前踢"], 0], [["屈膝", "弯膝", "向后勾"], 1], [["下蹲", "起身", "蹲起"], 2], [["上楼", "下楼", "台阶"], 3]]
      : regionId === "shoulder"
        ? [[["抬手", "上举"], 0], [["外旋", "向外转"], 1], [["内旋", "向内转", "摸背"], 2], [["推"], 3], [["拉"], 4]]
        : [];
  const match = patterns.find(([words]) => includesAny(text, words));
  return match ? options[match[1]] : "";
}

function forceDirectionTags(value: string) {
  const map: Array<[string[], string[]]> = [
    [["勾脚", "向上抬"], ["dorsiflexion", "tibialis-anterior", "extensor"]],
    [["脚背向下", "下压", "踩油门"], ["plantarflexion", "calf"]],
    [["提踵", "踮脚", "蹬地"], ["plantarflexion", "calf", "heel-raise"]],
    [["向内转"], ["inversion", "tibialis-posterior", "arch"]],
    [["向外转"], ["eversion", "peroneal"]],
    [["伸直膝盖"], ["quadriceps", "terminal-extension", "knee-extension"]],
    [["弯曲膝盖"], ["hamstring", "knee-flexion"]],
    [["下蹲", "起身"], ["quadriceps", "glute", "squat"]],
    [["抬手"], ["arm-lift", "scapular-control", "cuff-control"]],
    [["向外转"], ["external-rotation", "cuff-control"]],
    [["向内转"], ["internal-rotation", "cuff-control"]],
    [["推"], ["push", "serratus", "triceps"]],
    [["拉"], ["pull", "scapular-control", "biceps"]],
  ];
  return map.filter(([words]) => includesAny(value, words)).flatMap(([, tags]) => tags);
}

function parseIntake(text: string, current: IntakeState): IntakeState {
  const originalText = text;
  text = currentComplaintText(text);
  const inferredRegionId = inferRegion(text);
  const regionId = isPilotRegion(inferredRegionId)
    ? inferredRegionId
    : isPilotRegion(current.regionId)
      ? current.regionId
      : "";
  const region = FULL_REGIONS.find((item) => item.id === regionId);
  // 当前症状文本会过滤掉只描述“怎么发生”的片段；如果侧别只写在
  // “崴了右脚/摔到左膝”这一段，不能因为它没有疼痛词就丢失侧别。
  // 先用当前症状判断，只有当前没有明确侧别时才回看原话，避免历史
  // 左侧问题覆盖本次明确的右侧主诉。
  const side = inferSymptomSide(text, "") || inferSymptomSide(originalText, current.side);
  const onset = includesAny(text, ["今天", "昨天", "昨晚", "今早", "刚刚"]) ? "今天或昨天" : includesAny(text, ["两周", "2周", "三周", "一个月"]) ? "1～6周" : includesAny(text, ["几天", "一周", "7天"]) ? "2～7天" : includesAny(text, ["好几年", "几年", "多年"]) || /[一二两三四五六七八九十0-9]+年/.test(text) ? "超过6周" : includesAny(text, ["半年", "几个月", "长期", "很久", "超过"] ) || /[两三四五六七八九十0-9]+个?月/.test(text) ? "超过6周" : includesAny(text, ["反复", "断断续续", "时好时坏"]) ? "反复出现" : current.onset;
  const deniesTwist = /(?:没|没有|并未|未曾)(?:有)?(?:崴|扭|歪脚)/.test(text);
  const deniesImpact = /(?:没|没有|并未|未曾)(?:有)?(?:撞|摔|跌倒|跌伤)/.test(text);
  const explicitlyNoInjury = includesAny(text, ["没有明确受伤", "没有明显受伤", "没有明显外伤", "没有外伤", "没有受伤", "没受伤", "不记得受伤"]) || (deniesTwist && deniesImpact);
  const mechanism = includesAny(text, ["崴", "歪脚", "扭"]) && !deniesTwist ? "扭转或崴伤" : includesAny(text, ["跌", "撞", "摔"]) && !deniesImpact ? "跌倒或碰撞" : includesAny(text, ["拉伤", "冲刺"] ) ? "跑跳或拉伤" : explicitlyNoInjury ? "没有明确受伤" : includesAny(text, ["慢慢", "逐渐", "不知不觉"]) ? "逐渐出现" : current.mechanism;
  const symptomType = includesAny(text, ["麻", "电感", "放射", "发麻"]) ? "麻或电感" : includesAny(text, ["针扎", "针刺", "扎", "刺", "锐"] ) ? "刺痛" : includesAny(text, ["烧灼", "火辣", "灼热", "烧痛"] ) ? "烧灼或火辣" : includesAny(text, ["胀"] ) ? "胀痛" : includesAny(text, ["牵", "扯", "紧"] ) ? "牵扯或紧绷" : includesAny(text, ["挤", "卡", "弹"] ) ? "挤、卡或弹响" : includesAny(text, ["无力", "不稳", "打软", "腿软", "发软", "没劲", "使不上劲", "发不上力"] ) ? "无力或不稳" : text.includes("酸") ? "酸痛" : (text.includes("疼") || text.includes("痛") || text.toLowerCase().includes("pain")) ? "疼痛，性质说不清" : includesAny(text, ["不舒服", "不得劲", "难受"]) ? "说不清的不适" : current.symptomType;
  const painQualityConfirmed = current.painQualityConfirmed || includesAny(text, ["麻", "电感", "放射", "发麻", "针扎", "针刺", "扎", "刺", "锐", "烧灼", "火辣", "灼热", "烧痛", "胀", "牵", "扯", "紧", "挤", "卡", "弹", "无力", "不稳", "打软", "腿软", "发软", "没劲", "使不上劲", "发不上力", "酸"]);
  const parsedProvokingAction = extractProvokingAction(text);
  const symptoms = Array.from(new Set([
    ...(current.symptoms ?? []),
    ...(includesAny(text, ["肿", "积液", "淤青", "淤血"]) ? ["肿胀或淤青"] : []),
    ...(includesAny(text, ["按压", "压痛", "一按"] ) ? ["按压痛"] : []),
    ...(includesAny(text, ["受限", "伸不直", "弯不了", "抬不起来", "走不了", "站不了", "蹲不了", "动不了"] ) ? ["活动受限"] : []),
    ...(includesAny(text, ["无力", "没劲", "不稳", "使不上劲", "发不上力", "打软", "腿软", "发软"] ) ? ["力量不足"] : []),
    ...(includesAny(text, ["麻", "电感", "放电", "窜麻", "发麻"] ) ? ["麻、电或感觉变化"] : []),
  ]));
  const actionSource = `${parsedProvokingAction} ${text}`.toLowerCase();
  const unclearProvocation = includesAny(text, ["说不清什么时候", "不知道什么时候", "没有固定动作", "没固定动作", "不一定什么时候", "随机出现"]);
  const provocationTypes = Array.from(new Set([
    ...(current.provocationTypes ?? []),
    ...(includesAny(parsedProvokingAction, ["角度", "抬手", "弯曲", "伸直", "转动", "转头", "侧屈", "低头", "抬头", "弯腰", "后仰", "转身", "转体", "勾脚", "下压"] ) ? ["活动到某个角度"] : []),
    ...(includesAny(actionSource, ["发力", "用力", "使劲", "抗阻", "一撑"] ) ? ["用力或对抗阻力"] : []),
    ...(includesAny(actionSource, ["走", "站", "负重", "楼", "台阶", "蹲", "起身", "跑", "跳", "抬脚", "迈步", "踩地", "落脚", "一瘸一拐", "walk", "squat", "run", "jump"] ) ? ["走路、站立或负重"] : []),
    ...(includesAny(parsedProvokingAction, ["按压", "压痛", "一按"] ) ? ["按压"] : []),
    ...(includesAny(text, ["静止", "不动", "夜间", "晚上", "睡觉"] ) ? ["静止或夜间"] : []),
    ...(includesAny(parsedProvokingAction, ["运动时", "训练时", "跑步时", "运动过程中", "跑步", "训练"] ) ? ["运动过程中"] : []),
    ...(includesAny(text, ["运动后", "训练后", "跑步后", "跑完", "结束后"] ) ? ["运动结束后"] : []),
    ...(unclearProvocation ? ["说不清 / 没有固定动作"] : []),
  ]));
  const pilotLocationAliases: Partial<Record<FullRegionId, Array<[string[], string]>>> = {
    "thigh-local": [
      [["大腿前侧", "大腿前面"], "大腿前侧"], [["大腿后侧", "大腿后面"], "大腿后侧"],
      [["大腿内侧", "大腿里面"], "大腿内侧"], [["大腿外侧", "大腿外面"], "大腿外侧"],
    ],
    knee: [
      [["大腿前侧", "大腿前面"], "大腿前侧"],
      [["大腿后侧", "大腿后面"], "大腿后侧"],
      [["大腿内侧", "大腿里面"], "大腿内侧"],
      [["大腿外侧", "大腿外面"], "大腿外侧"],
      [["膝前", "髌骨周围"], "膝前 / 髌骨周围"],
      [["髌骨下", "髌腱"], "髌骨下方"],
      [["膝内侧", "膝盖内侧"], "膝内侧"],
      [["膝外侧", "膝盖外侧"], "膝外侧"],
      [["膝后", "腘窝"], "膝后侧 / 腘窝"],
      [["关节线", "关节缝"], "关节线"],
      [["小腿上端", "胫骨上端", "腓骨头"], "小腿上端"],
    ],
    "ankle-foot": [
      [["小腿前侧", "小腿前面"], "小腿前侧"],
      [["小腿后侧", "小腿后面", "小腿肚"], "小腿后侧"],
      [["小腿内侧", "小腿里面"], "小腿内侧"],
      [["小腿外侧", "小腿外面"], "小腿外侧"],
      [["外踝", "脚踝外侧", "踝外侧", "前外侧"], "外踝 / 前外侧"],
      [["内踝", "脚踝内侧", "踝内侧", "足弓内侧"], "内踝 / 足弓内侧"],
      [["踝前", "脚踝前方"], "踝前方"],
      [["足背", "脚背"], "足背"],
      [["足底", "脚底", "脚跟", "足跟"], "足底 / 足跟"],
      [["跟腱", "踝后", "脚踝后方"], "跟腱 / 踝后方"],
      [["脚趾根", "足趾根", "大脚趾"], "足趾根部"],
    ],
    "calf-local": [
      [["小腿前侧", "小腿前面", "胫骨前侧"], "小腿前侧"], [["小腿后侧", "小腿后面", "小腿肚", "腓肠肌"], "小腿后侧"],
      [["小腿内侧", "小腿里面"], "小腿内侧"], [["小腿外侧", "小腿外面"], "小腿外侧"],
    ],
  };
  const exactLocation = region?.locations.find((location) => text.includes(location));
  const aliasLocation = (pilotLocationAliases[regionId as FullRegionId] ?? []).find(([words]) => includesAny(text, words))?.[1];
  const locationUnclear = includesAny(text, ["不知道具体哪", "不知道具体哪里", "说不清具体位置", "说不清哪里", "不知道哪儿", "位置说不清"]);
  const location = exactLocation ?? aliasLocation ?? region?.locations
    .map((location) => ({ location, core: location.replace(/[部区周围 /]/g, "") }))
    .sort((a, b) => b.core.length - a.core.length)
    .find((item) => item.core.length >= 2 && text.includes(item.core))?.location ?? (locationUnclear ? "说不清" : current.location);
  const bodyLocations = current.locationConfirmed ? current.bodyLocations : [];
  const resolveLocationInClause = (clause?: string) => {
    if (!clause) return "";
    return region?.locations.find((entry) => clause.includes(entry))
      ?? (pilotLocationAliases[regionId as FullRegionId] ?? []).find(([words]) => includesAny(clause, words))?.[1]
      ?? "";
  };
  const clauses = text.split(/[，。；！？\n]/).map((clause) => clause.trim()).filter(Boolean);
  const swellingLocation = current.swellingLocation || resolveLocationInClause(clauses.find((clause) => includesAny(clause, ["肿", "积液", "淤青", "淤血"])));
  const tendernessLocation = current.tendernessLocation || resolveLocationInClause(clauses.find((clause) => includesAny(clause, ["按压", "压痛", "一按"])));
  const sensoryLocation = current.sensoryLocation || resolveLocationInClause(clauses.find((clause) => includesAny(clause, ["麻", "电感", "放电", "窜麻", "发麻"])));
  const parsedSwellingLocation = swellingLocation && side !== "双侧/中间" ? makeLowerLimbLocationSelection(side, swellingLocation, regionId) : null;
  const parsedTendernessLocation = tendernessLocation && side !== "双侧/中间" ? makeLowerLimbLocationSelection(side, tendernessLocation, regionId) : null;
  const parsedSensoryLocation = sensoryLocation && side !== "双侧/中间" ? makeLowerLimbLocationSelection(side, sensoryLocation, regionId) : null;
  const swellingLocations = current.swellingLocations?.length ? current.swellingLocations : parsedSwellingLocation ? [parsedSwellingLocation] : [];
  const tendernessLocations = current.tendernessLocations?.length ? current.tendernessLocations : parsedTendernessLocation ? [parsedTendernessLocation] : [];
  const sensoryLocations = current.sensoryLocations?.length ? current.sensoryLocations : parsedSensoryLocation ? [parsedSensoryLocation] : [];
  const reproduction = parsedProvokingAction || current.reproduction;
  const goalClause = text.split(/[，。；！？\n]/).map((part) => part.trim()).find((part) => includesAny(part, ["想恢复", "希望恢复", "目标", "回到", "重新开始", "恢复正常", "恢复日常"])) ?? "";
  const goal = includesAny(goalClause, ["对抗", "比赛", "高强度"]) ? 5 : includesAny(goalClause, ["运动", "跑步", "健身", "球", "训练"]) ? 4 : includesAny(goalClause, ["正常生活", "日常生活", "办公", "工作", "开车", "驾驶", "家务"]) ? 3 : current.goal;
  const inferredForceDirection = inferForceDirection(regionId, text);
  const deniesToeDirection = /(?:脚趾|足趾|大脚趾)[^，。；]{0,6}(?:没有|没|不)(?:受伤|疼|痛|不适|问题)|(?:没有|没|不)[^，。；]{0,6}(?:脚趾|足趾|大脚趾)(?:受伤|疼|痛|不适|有问题)?/.test(text);
  const forceDirection = deniesToeDirection && inferredForceDirection === "脚趾或足弓用力" ? current.forceDirection : inferredForceDirection || current.forceDirection;
  const actionAnalysis = analyzeChiefAction(text, regionId, forceDirection, reproduction);
  const priorCare = Array.from(new Set([
    ...(current.priorCare ?? []),
    ...(includesAny(originalText, ["看过医生", "去过医院", "医生看过"]) ? ["看过医生"] : []),
    ...(includesAny(originalText, ["拍过片", "拍片", "核磁", "CT", "x光", "X光"]) ? ["拍过片"] : []),
    ...(includesAny(originalText, ["膏药", "贴膏"]) ? ["用过膏药"] : []),
    ...(includesAny(originalText, ["针灸", "理疗"]) ? ["做过针灸或理疗"] : []),
    ...(includesAny(originalText, ["冰敷", "冷敷"]) ? ["用过冰敷"] : []),
  ]));
  const stabbingSpread: IntakeState["stabbingSpread"] = symptomType === "刺痛"
    ? includesAny(text, ["不动", "静止", "躺着", "晚上", "夜间", "睡觉", "休息时"]) ? "rest" : current.stabbingSpread
    : "";
  return {
    ...current,
    parsed: true,
    regionId,
    side,
    location,
    bodyLocations,
    locationConfirmed: current.locationConfirmed,
    onset,
    mechanism,
    symptomType,
    painQualityConfirmed,
    symptoms,
    provocationTypes,
    forceDirection,
    swellingLocation,
    swellingLocations,
    tendernessLocation,
    tendernessLocations,
    sensoryLocation,
    sensoryLocations,
    reproduction,
    customAction: current.customAction || (actionAnalysis?.category === "其他动作" ? reproduction : ""),
    actionSelectionConfirmed: current.actionSelectionConfirmed || Boolean(reproduction) || provocationTypes.includes("说不清 / 没有固定动作"),
    actionAnalysis,
    goal,
    priorCare,
    stabbingSpread,
    stabbingPalpation: symptomType === "刺痛" ? current.stabbingPalpation : "",
  };
}

function scoreChange(before: number, after: number) {
  const delta = before - after;
  const percent = before > 0 ? Math.round((delta / before) * 100) : null;
  return { delta, percent };
}

function resultFromScore(before: number, after: number): TrialResult {
  if (after < before) return "better";
  if (after > before) return "worse";
  return "same";
}

function firstNumber(value: string, fallback = 10) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

/**
 * Keep the route short without cutting off its later clinical branches.
 * Muscle candidates are tried by relevance; joint and control candidates are
 * retained as conditional exits when the range still has not reached its goal.
 */
type DynamicMuscleHistoryRecord = Pick<TrialRecord, "candidateId" | "candidateTitle" | "action" | "timeBased" | "rangeOutcomes"> & {
  treatmentName?: string;
};

function dynamicMuscleCandidateFromRecord(record: TrialRecord): FullCandidate | undefined;
function dynamicMuscleCandidateFromRecord(record: DynamicMuscleHistoryRecord | FollowupTreatmentRecord): FullCandidate | undefined;
function dynamicMuscleCandidateFromRecord(record: DynamicMuscleHistoryRecord | FollowupTreatmentRecord): FullCandidate | undefined {
  if (record.timeBased || !record.candidateId.startsWith("tension-muscle:")) return undefined;
  const source = `${record.treatmentName ?? ""} ${record.candidateTitle} ${record.action}`;
  const normalizedRegion = normalizePilotMuscleRegion(source);
  if (!normalizedRegion) return undefined;
  const retestIds = Object.keys(record.rangeOutcomes ?? {});
  return {
    id: record.candidateId,
    title: record.treatmentName ?? record.candidateTitle,
    type: "muscle",
    access: "self",
    do: record.action || `在${normalizedRegion.label}找到比另一侧更紧、更酸的区域，轻柔松解30～60秒。`,
    observe: "只做轻柔按压；出现明显刺痛、麻或电感就停止。",
    retest: "处理后比较仍未恢复的相关活动和主诉动作。",
    tags: [`tension:${normalizedRegion.label}`],
    retestIds,
    siteLabel: normalizedRegion.label,
    targetLabel: `${normalizedRegion.label}紧张区域`,
    actionLabel: "轻柔肌肉松解",
  };
}

function optionalTreatmentSelectionKey(targetId: string, candidateId: string) {
  return `${targetId}::${candidateId}`;
}

const RESIDUAL_REVIEW_ID = "review-existing-findings";

function localizeTreatmentSite(site: string, side: string) {
  if (!side || side === "双侧/中间" || /左侧|右侧/.test(site)) return site;
  if (site.includes("两侧")) return site.replace("两侧", side);
  return `${side}${site}`;
}

type TreatmentDisplay = {
  site: string;
  target: string;
  action: string;
};

type ActionImageVariant = "self" | "pro";

type ActionVisual = {
  src: string;
  alt: string;
};

function actionImageVariant(intake: IntakeState): ActionImageVariant {
  const profile = intake.productMode
    ? normalizeWorkflowProfile({ productMode: intake.productMode, operationTarget: intake.operationTarget, capabilities: intake.capabilities })
    : workflowProfileFromLegacy(intake.userRole, intake.examSetup);
  return profile.operationTarget === "other" ? "pro" : "self";
}

function actionVisual(src: string, alt: string): ActionVisual {
  return { src: `/rehab-actions/${src}`, alt };
}

function treatmentActionVisuals(candidate: FullCandidate, variant: ActionImageVariant): ActionVisual[] {
  const source = `${candidate.id} ${candidate.title} ${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.tags.join(" ")}`;
  if (candidate.type !== "muscle") return [];
  const visuals: ActionVisual[] = [];
  const add = (file: string, alt: string) => visuals.push(actionVisual(file.replace("{variant}", variant), alt));
  const focus = candidateMuscleFocus(candidate).key;

  if (focus === "thigh-lateral" || (/大腿外侧/.test(source) && /大腿后侧|小腿后侧/.test(source))) {
    add("k-m02-lateral-thigh-release-{variant}.png", "髋外侧与大腿外侧轻柔松解");
  }
  if (focus === "thigh-posterior" || /大腿后侧|腘绳肌|小腿后侧/.test(source) && /knee|膝/.test(source)) {
    add("k-m03-posterior-chain-release-{variant}.png", "大腿后侧与小腿后侧轻柔松解");
  }
  if (/knee-posterior-calf-muscle/.test(source) && !visuals.length) {
    add("k-m03-posterior-chain-release-{variant}.png", "膝后周围与小腿上端轻柔松解");
  }
  if (focus === "calf-posterior" && !/knee|膝/.test(source)) {
    add("a-m01-posterior-calf-release-{variant}.png", "小腿后侧轻柔松解");
  }
  if (["calf-anterior", "calf-anterolateral", "calf-front-back"].includes(focus)) {
    add("a-m02-anterior-calf-release-{variant}.png", "小腿前侧轻柔松解");
  }
  if (["calf-lateral", "calf-anterolateral"].includes(focus)) {
    add("a-m03-lateral-calf-release-{variant}.png", "小腿外侧轻柔松解");
  }
  if (focus === "calf-medial") {
    add("a-m04-medial-calf-release-{variant}.png", "小腿内侧深后方轻柔松解");
  }
  return visuals.filter((visual, index, list) => list.findIndex((item) => item.src === visual.src) === index);
}

function exerciseActionVisual(exercise: FullExercise, variant: ActionImageVariant): ActionVisual | null {
  const files: Partial<Record<string, [string, string]>> = {
    "knee-side-abduction": ["k-a03-glute-med-activation-{variant}.png", "侧卧髋外展训练臀中肌"],
    "knee-hamstring-isometric": ["k-a04-hamstring-activation-{variant}.png", "低负荷腘绳肌等长发力"],
    "knee-heel-slide-quad-set": ["k-a05-quad-set-{variant}.png", "膝后下压与股四头肌发力"],
    "ankle-plantarflexion-control": ["a-a01-plantarflexor-activation-{variant}.png", "坐姿提踵训练小腿后侧"],
    "ankle-dorsiflexion-control": ["a-a02-dorsiflexor-activation-{variant}.png", "主动勾脚训练小腿前侧"],
    "ankle-eversion-control": ["a-a03-evertor-activation-{variant}.png", "主动外翻训练小腿外侧"],
  };
  const match = files[exercise.id];
  // 普通版K-A05把目标错误写成股内斜肌，暂不向用户展示。
  if (!match || (exercise.id === "knee-heel-slide-quad-set" && variant === "self")) return null;
  return actionVisual(match[0].replace("{variant}", variant), match[1]);
}

function ActionReferenceFigure({ visual }: { visual: ActionVisual }) {
  return <figure className="rm-action-reference">
    {/* 本地生成的临床动作图保持原始比例和清晰度，不走远端图片优化。 */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={visual.src} alt={visual.alt} loading="lazy" />
    <figcaption>动作参考</figcaption>
  </figure>;
}

function treatmentDisplay(candidate: FullCandidate, fallbackSite: string, swellingSite = "", side = ""): TreatmentDisplay {
  const controlDirection = candidate.type === "control" && candidate.retestIds?.length === 1 ? candidate.retestIds[0] : "";
  const subject = candidateSubject(candidate);
  const controlSite = subject.replace(/(?:控制|稳定)(?:练习|训练)$|(?:练习|训练)$/u, "");
  const site = candidate.type === "muscle"
    ? candidateMuscleFocus(candidate).label
    : candidate.type === "control"
      ? candidate.siteLabel || fallbackSite || controlSite || candidate.targetLabel
      : candidate.siteLabel || (candidate.type === "swelling" && swellingSite ? swellingSite : fallbackSite) || "当前不适部位";
  return {
    site: localizeTreatmentSite(site || "当前不适部位", side),
    target: ["muscle", "control"].includes(candidate.type) ? "" : candidate.targetLabel || (candidate.siteLabel ? subject : ""),
    action: candidate.type === "muscle" && controlPlansForMotions(candidatePilotMotionIds(candidate)).length
      ? "轻柔松解＋主动控制"
      : candidate.type === "joint" || controlDirection
        ? candidateTreatmentName(candidate)
        : candidate.actionLabel || candidateTreatmentName(candidate),
  };
}

function TreatmentActionCard({ candidate, display, imageVariant, priorityLabel, controlMotionIds }: { candidate: FullCandidate; display: TreatmentDisplay; imageVariant: ActionImageVariant; priorityLabel?: "先做" | "配合处理"; controlMotionIds?: string[] }) {
  const visuals = treatmentActionVisuals(candidate, imageVariant);
  const candidateMotionIds = candidatePilotMotionIds(candidate);
  // undefined means that the caller has no assessment context and the
  // candidate's own directions may be used. An explicit empty list means
  // that no currently unresolved motion direction needs embedded control.
  const relevantRetestMotionIds = controlMotionIds
    ? candidateMotionIds.filter((id) => controlMotionIds.includes(id))
    : candidateMotionIds;
  const relevantMotionIds = candidateControlMotionIds(candidate, controlMotionIds);
  const controlPlans = candidate.type === "muscle" ? controlPlansForMotions(relevantMotionIds) : [];
  const retestPlans = controlPlansForMotions(relevantRetestMotionIds);
  const patellaUnit = isPatellaTreatmentCandidate(candidate);
  const displayAction = candidate.type === "muscle"
    ? controlPlans.length ? "轻柔松解＋主动控制" : "轻柔松解"
    : display.action;
  const muscleSource = `${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`;
  const normalizedRegion = candidate.type === "muscle" ? normalizePilotMuscleRegion(muscleSource) : undefined;
  const relationRoles = normalizedRegion
    ? controlPlans.map((plan) => regionRelationForMotion(plan.id, normalizedRegion.id)?.role).filter(Boolean)
    : [];
  const roleLabel = relationRoles.includes("agonist") && relationRoles.includes("antagonist")
    ? "动作肌 / 拮抗肌候选"
    : relationRoles.includes("agonist") ? "动作肌候选"
      : relationRoles.includes("antagonist") ? "拮抗肌候选"
        : relationRoles.includes("stabilizer") ? "稳定肌候选" : "检查支持区域";
  return <article className={`rm-candidate rm-treatment-card is-${candidate.type}`}>
    {priorityLabel ? <b className={`rm-treatment-priority is-${priorityLabel === "先做" ? "primary" : "support"}`}>{priorityLabel}</b> : null}
    <header className="rm-treatment-ribbon">
      <section className="rm-treatment-site">
        <span>处理部位</span>
        <h2>{display.site}</h2>
        {display.target ? <strong>{display.target}</strong> : null}
        {candidate.type === "muscle" ? <small className="rm-muscle-role">{roleLabel}</small> : null}
      </section>
      <section className="rm-treatment-action">
        <span>现在做</span>
        <h2>{displayAction}</h2>
      </section>
    </header>
    {visuals.length ? <div className={`rm-action-reference-list ${visuals.length > 1 ? "has-multiple" : ""}`}>{visuals.map((visual) => <ActionReferenceFigure key={visual.src} visual={visual} />)}</div> : null}
    {candidate.type === "muscle" && controlPlans.length ? <div className="rm-treatment-unit-steps">
      <section className="is-release"><header><i>1</i><span>轻柔松解</span></header><p>{candidate.do}</p></section>
      <section className="is-control"><header><i>2</i><span>主动控制</span></header>{controlPlans.map((plan) => <article key={plan.id}><strong>{plan.controlTitle}</strong><p>{plan.controlInstruction}{plan.controlRepetitions}。</p></article>)}</section>
      <footer><b>完成后统一复测</b><span>{retestPlans.map((plan) => plan.userAction).join("、")}</span></footer>
    </div> : <section className="rm-treatment-do"><strong>怎么做</strong><p>{candidateAction(candidate, relevantMotionIds)}</p></section>}
    {patellaUnit ? <section className="rm-treatment-unit-followup is-patella"><b>完成后立即复测</b><span>只复测刚才发现受限的髌骨方向，记录活动范围和不适。</span></section> : null}
  </article>;
}

function TreatmentRoadmap({ completed, current, upcoming }: { completed: string[]; current: string; upcoming: string[] }) {
  return <section className="rm-treatment-roadmap">
    <header><div><span>本次流程</span></div><b>已完成 {completed.length} 项</b></header>
    <ol>
      <li className="is-done"><i>✓</i><div><span>已完成</span><section>{completed.length ? completed.slice(-4).map((label) => <b key={label}>{label}</b>) : <b>评估检查</b>}</section></div></li>
      <li className="is-current"><i>现在</i><div><span>正在做</span><strong>{current}</strong></div></li>
      <li className="is-next"><i>{upcoming.length}</i><div><span>接下来</span><section>{upcoming.length ? upcoming.map((label, index) => <b key={`${label}:${index}`}><em>{index + 1}</em>{label}</b>) : <b><em>1</em>针对性训练</b>}</section></div></li>
    </ol>
  </section>;
}

function adaptExerciseForCurrentStage(exercise: FullExercise, currentStage: number): FullExercise {
  if (currentStage <= 1) {
    const isGait = exercise.tags.some((tag) => ["gait", "weight-shift"].includes(tag));
    const isMultiDirectionMotion = exercise.tags.includes("ankle-rom");
    const regressedPosition: FullExercise["startPosition"] = exercise.startPosition === "站立"
      ? "坐位"
      : exercise.startPosition === "四点跪"
        ? "仰卧"
        : exercise.startPosition;
    const regressedHow = exercise.stage > 1 ? exercise.easier : exercise.how;
    return {
      ...exercise,
      title: exercise.stage > 1 ? `${exercise.title}（基础版）` : exercise.title,
      stage: 1,
      sets: "1～2组",
      reps: isGait ? "每组5～10次重心转移或短距离练习" : isMultiDirectionMotion ? "每个方向5～8个" : "每组5～8个",
      startPosition: regressedPosition,
      how: regressedPosition !== exercise.startPosition ? `${regressedPosition}开始，先用较小范围完成。${regressedHow}` : regressedHow,
      harder: exercise.how,
    };
  }
  if (exercise.stage <= currentStage) return exercise;
  const isGait = exercise.tags.some((tag) => ["gait", "weight-shift"].includes(tag));
  return {
    ...exercise,
    title: `${exercise.title}（基础版）`,
    stage: currentStage as FullExercise["stage"],
    sets: isGait ? "2～3组" : "2组",
    reps: isGait ? "每组5～10次重心转移或短距离练习" : "每组6～8个",
    how: exercise.easier,
    harder: exercise.how,
    startPosition: exercise.startPosition === "站立" ? "坐位" : exercise.startPosition,
  };
}

function isAcuteTrauma(intake: IntakeState) {
  return ["今天或昨天", "2～7天"].includes(intake.onset) && ["扭转或崴伤", "跌倒或碰撞", "跑跳或拉伤"].includes(intake.mechanism);
}

const FRIENDLY_ASSESSMENT_COPY: Record<string, { title: string; how: string; observe: string }> = {
  "neck-flexion": { title: "低头", how: "坐直，肩膀放松，慢慢低头，让下巴靠近胸口。", observe: "能低到哪里；哪里不舒服；肩膀或上背有没有跟着动。" },
  "neck-extension": { title: "抬头", how: "坐直，慢慢抬头看向上方，不要把身体向后倒。", observe: "能抬到哪里；颈后有没有挤压感；是否头晕。" },
  "neck-rotation-left": { title: "向左转头", how: "坐直，肩膀不动，慢慢把头转向左边。", observe: "与向右转相比；哪里不舒服；肩膀有没有跟着转。" },
  "neck-rotation-right": { title: "向右转头", how: "坐直，肩膀不动，慢慢把头转向右边。", observe: "与向左转相比；哪里不舒服；肩膀有没有跟着转。" },
  "neck-sidebend-left": { title: "左耳靠近左肩", how: "鼻尖朝前，慢慢让左耳靠近左肩，肩膀不要抬起。", observe: "与另一边相比；哪边牵扯或挤压；身体有没有跟着歪。" },
  "neck-sidebend-right": { title: "右耳靠近右肩", how: "鼻尖朝前，慢慢让右耳靠近右肩，肩膀不要抬起。", observe: "与另一边相比；哪边牵扯或挤压；身体有没有跟着歪。" },

  "shoulder-flexion": { title: "手臂从前面举过头", how: "拇指朝上，手臂伸直，从身体前面慢慢举过头。", observe: "与另一侧相比能举多高；哪里不舒服；有没有耸肩或挺腰。" },
  "shoulder-extension": { title: "手臂向身后抬", how: "站直，手臂伸直向身后抬，不要挺腰或转身。", observe: "与另一侧相比；肩前有没有牵扯；身体有没有跟着动。" },
  "shoulder-abduction": { title: "手臂从侧面举起", how: "掌心向前，手臂伸直，从身体侧面慢慢举高。", observe: "与另一侧相比能举多高；在哪个位置不舒服；有没有耸肩。" },
  "shoulder-internal-rotation": { title: "手从背后向上摸", how: "手背贴着后背，慢慢向上摸，不要扭腰。", observe: "与另一侧相比能摸到哪里；肩前或肩后哪里不舒服。" },
  "shoulder-external-rotation": { title: "前臂向外转", how: "手肘弯成直角并贴住身体，慢慢把前臂向外转。", observe: "与另一侧相比；哪里不舒服；手肘有没有离开身体。" },

  "thoracic-extension": { title: "上背向后伸展", how: "坐在有靠背的椅子上，双手抱头，让上背轻轻越过椅背。", observe: "上背能否伸展开；哪里卡或痛；腰有没有明显向后顶。" },
  "thoracic-rotation-left": { title: "上半身向左转", how: "坐稳，双臂抱胸，膝盖朝前，上半身慢慢向左转。", observe: "与向右转相比；哪里不舒服；骨盆有没有跟着转。" },
  "thoracic-rotation-right": { title: "上半身向右转", how: "坐稳，双臂抱胸，膝盖朝前，上半身慢慢向右转。", observe: "与向左转相比；哪里不舒服；骨盆有没有跟着转。" },
  "thoracic-sidebend-left": { title: "上半身向左弯", how: "坐直，身体慢慢向左弯，保持胸口朝前。", observe: "与另一边相比；哪边牵扯或挤压；骨盆有没有移动。" },
  "thoracic-sidebend-right": { title: "上半身向右弯", how: "坐直，身体慢慢向右弯，保持胸口朝前。", observe: "与另一边相比；哪边牵扯或挤压；骨盆有没有移动。" },

  "elbow-flexion": { title: "弯曲手肘", how: "上臂贴住身体，掌心朝上，慢慢弯手肘，让手靠近肩膀。", observe: "与另一侧相比；肘前或肘后哪里不舒服；肩膀有没有跟着动。" },
  "elbow-extension": { title: "伸直手肘", how: "上臂贴住身体，慢慢把手肘伸直到自然尽头。", observe: "与另一侧相比能否伸直；哪里不舒服；肩膀有没有跟着动。" },
  "elbow-pronation": { title: "掌心转向下", how: "手肘弯成直角并贴住身体，慢慢把掌心转向下。", observe: "与另一侧相比；前臂或手腕哪里不舒服；手肘有没有移开。" },
  "elbow-supination": { title: "掌心转向上", how: "手肘弯成直角并贴住身体，慢慢把掌心转向上。", observe: "与另一侧相比；前臂或手腕哪里不舒服；手肘有没有移开。" },

  "wrist-flexion": { title: "手掌向下弯", how: "前臂放在桌上，手伸出桌边，慢慢把手掌向下弯。", observe: "与另一侧相比；手腕哪一面不舒服；手指有没有用力握紧。" },
  "wrist-extension": { title: "手背向上抬", how: "前臂放在桌上，手伸出桌边，慢慢把手背向上抬。", observe: "与另一侧相比；手腕哪里卡或痛；手指有没有跟着用力。" },
  "wrist-radial-deviation": { title: "手向拇指侧移动", how: "前臂和手掌放平，手保持平放，慢慢向拇指一侧移动。", observe: "与另一侧相比；拇指侧是否不舒服；前臂有没有跟着转。" },
  "wrist-ulnar-deviation": { title: "手向小指侧移动", how: "前臂和手掌放平，手保持平放，慢慢向小指一侧移动。", observe: "与另一侧相比；小指侧是否不舒服；前臂有没有跟着转。" },
  "wrist-pronation": { title: "掌心转向下", how: "手肘弯成直角并贴住身体，慢慢把掌心转向下。", observe: "与另一侧相比；前臂或手腕哪里不舒服；手肘有没有移开。" },
  "wrist-supination": { title: "掌心转向上", how: "手肘弯成直角并贴住身体，慢慢把掌心转向上。", observe: "与另一侧相比；前臂或手腕哪里不舒服；手肘有没有移开。" },

  "lumbar-flexion": { title: "站立弯腰", how: "双脚自然站立，膝盖放松，慢慢弯腰，双手沿大腿向下。", observe: "能弯到哪里；哪里不舒服；身体有没有偏向一边；起身是否困难。" },
  "lumbar-extension": { title: "站立后仰", how: "双手扶髋，慢慢向后仰到舒适范围，不要猛顶。", observe: "能后仰到哪里；腰部哪边有挤压感；膝盖有没有弯曲。" },
  "lumbar-sidebend-left": { title: "身体向左弯", how: "站直，左手沿左腿向下滑，胸口保持朝前。", observe: "与另一边相比；哪边牵扯或挤压；身体有没有转动。" },
  "lumbar-sidebend-right": { title: "身体向右弯", how: "站直，右手沿右腿向下滑，胸口保持朝前。", observe: "与另一边相比；哪边牵扯或挤压；身体有没有转动。" },
  "lumbar-rotation-left": { title: "坐着向左转身", how: "坐稳，双臂抱胸，膝盖朝前，上半身慢慢向左转。", observe: "与向右转相比；腰或臀腿哪里不舒服；骨盆有没有跟着转。" },
  "lumbar-rotation-right": { title: "坐着向右转身", how: "坐稳，双臂抱胸，膝盖朝前，上半身慢慢向右转。", observe: "与向左转相比；腰或臀腿哪里不舒服；骨盆有没有跟着转。" },

  "hip-flexion": { title: "膝盖靠近胸口", how: "仰卧，一条腿放松，另一侧膝盖慢慢靠近胸口。", observe: "与另一侧相比；腹股沟、臀部或腰哪里不舒服；骨盆有没有卷起。" },
  "hip-extension": { title: "大腿向后伸", how: "扶墙站稳，身体保持直立，把一条腿慢慢向后伸。", observe: "与另一侧相比；髋前是否牵扯；腰有没有跟着后仰。" },
  "hip-abduction": { title: "腿向外打开", how: "仰卧或侧卧，脚尖朝前，把一条腿慢慢向外打开。", observe: "与另一侧相比；髋外侧是否不舒服；骨盆有没有翻转。" },
  "hip-adduction": { title: "腿向身体中间靠", how: "仰卧，腿保持伸直，慢慢向身体中间移动。", observe: "与另一侧相比；大腿内侧是否牵扯；骨盆有没有转动。" },
  "hip-internal-rotation": { title: "小腿向外摆", how: "坐稳，髋膝弯成直角，大腿不动，把小腿慢慢向外摆。", observe: "与另一侧相比；腹股沟或臀部是否不舒服；骨盆有没有动。" },
  "hip-external-rotation": { title: "小腿向内摆", how: "坐稳，髋膝弯成直角，大腿不动，把小腿慢慢向内摆。", observe: "与另一侧相比；腹股沟或臀部是否不舒服；骨盆有没有动。" },

  "knee-extension": { title: "把膝盖绷直", how: "仰卧，两条腿放平，脚跟位置保持一致。先绷紧一侧大腿前侧，把膝盖后方向床面压，再换另一侧。", observe: "比较两侧膝后离床面的空隙，以及哪一侧更难向下压。" },
  "knee-flexion": { title: "把脚跟滑向臀部", how: "仰卧，脚跟贴着床面。先做没有不适的一边，再慢慢把另一边脚跟滑向臀部。", observe: "只比较两件事：哪边弯得更少；动作会不会引起不适。" },
  "knee-quadriceps": { title: "把膝盖伸直的力量", how: "仰卧，把膝盖后面向床面压住5秒。再坐好，把小腿抬起并保持5秒。两边各做一次。", observe: "哪边更难压住或抬住；是否明显发抖；用力时哪里不舒服。" },
  "knee-hamstring": { title: "脚跟向后拉的力量", how: "坐稳，脚跟踩地，像要把脚跟向椅子下面拖，但不要真的移动，保持5秒。两边各做一次。", observe: "哪边更难发力；大腿后侧是否容易抽筋；用力时哪里不舒服。" },
  "knee-posterior-chain": { title: "后侧链力量", how: "先做双腿臀桥并保持5秒。双腿稳定、没有明显不适时，再扶稳身体，左右分别做单腿臀桥；单腿版本做不了就停在双腿版本。", observe: "比较两侧抬起高度、保持时间和骨盆是否歪斜；留意是否主要靠腰顶起或大腿后侧抽筋。" },
  "knee-adductor-pes": { title: "夹枕头的力量", how: "仰卧屈膝，在两膝之间放一个软枕，轻轻夹住5秒。两边分别侧重发力，比较哪边更难保持。", observe: "比较哪边大腿内侧更难发力；留意膝内侧会不会出现平时的不适。" },
  "knee-glute": { title: "单腿支撑时臀部能不能稳住", how: "扶住墙，一只脚站立10秒，再换另一边。", observe: "哪边更容易晃；骨盆是否明显歪向一边；膝盖是否跟着向内倒。" },
  "knee-calf": { title: "踮脚力量", how: "扶住墙，双脚慢慢踮起再落下，做5次。两边都能稳定完成时，再分别用单脚试做。", observe: "哪边抬得更低、更容易累，或用力时会不舒服。" },
  "knee-squat": { title: "下蹲", how: "扶住稳固的桌面，慢慢下蹲到舒服的深度，再站起来，做3次。", observe: "哪一段不舒服；膝盖有没有明显向内倒；脚跟是否提前抬起。" },
  "knee-step-up": { title: "上台阶", how: "扶住栏杆，用一侧腿先踏上低台阶并站起，做3次，再换另一边。", observe: "哪边更难站起；是否明显借助手臂；哪里不舒服。" },
  "knee-step-down": { title: "下台阶", how: "扶住栏杆，一只脚站在低台阶上，另一只脚跟慢慢点地再回来，做3次，再换边。", observe: "下降到哪一段不舒服；支撑腿膝盖是否向内倒；哪边更难控制。" },
  "knee-single-leg": { title: "单脚站立", how: "靠近墙，一只脚站立10秒，再换另一边；需要时用手指轻扶。", observe: "哪边更容易晃、站不住或引起不适。" },
  "knee-single-leg-squat": { title: "扶着做单腿浅蹲", how: "只有下蹲和单脚站都能完成时再做。扶住固定物，单腿小幅下蹲3次。", observe: "膝盖是否向内倒；骨盆是否歪；足弓是否塌下；哪里不舒服。" },
  "knee-patella-superior": { title: "髌骨向上移动", how: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向上推。", observe: "与另一侧相比；是否明显更紧或会引起原来的不适。" },
  "knee-patella-inferior": { title: "髌骨向下移动", how: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向下推。", observe: "与另一侧相比；是否明显更紧或会引起原来的不适。" },
  "knee-patella-medial": { title: "髌骨向内移动", how: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向内推。", observe: "与另一侧相比；是否明显更紧或会引起原来的不适。" },
  "knee-patella-lateral": { title: "髌骨向外移动", how: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向外推。", observe: "与另一侧相比；是否明显更紧或会引起原来的不适。" },

  "ankle-dorsiflexion": { title: "把脚背向上勾", how: "坐稳，脚跟放在地上。先做没有不适的一边，再把另一边脚背慢慢向小腿靠近。", observe: "只比较两件事：哪边勾得更少；动作会不会引起不适。" },
  "ankle-plantarflexion": { title: "踝关节主动跖屈", how: "坐稳，小腿放松。先做没有不适的一边，再把另一边脚背缓慢向下压。", observe: "只比较两件事：哪边活动范围更小；动作会不会引起不适。" },
  "ankle-inversion": { title: "把脚掌转向内侧", how: "坐稳，小腿保持不动。先做没有不适的一边，再把另一边脚掌慢慢转向身体中间。", observe: "只比较两件事：哪边转得更少；动作会不会引起不适。" },
  "ankle-eversion": { title: "把脚掌转向外侧", how: "坐稳，小腿保持不动。先做没有不适的一边，再把另一边脚掌慢慢向外转。", observe: "只比较两件事：哪边转得更少；动作会不会引起不适。" },
  "ankle-great-toe-extension": { title: "大脚趾向上抬", how: "脚掌放松，用手轻轻把大脚趾向上抬。", observe: "与另一侧相比；大脚趾或足底哪里不舒服。" },
  "ankle-toe-flexion": { title: "脚趾弯曲和伸直", how: "脚跟着地，先把脚趾全部抬起，再轻轻放下和弯曲。", observe: "脚趾能否分别控制；哪里不舒服；是否只有某个脚趾受限。" },
  "ankle-dorsiflexor": { title: "勾脚力量", how: "坐稳，把另一只脚轻轻压在脚背上，再用下面这只脚向上勾住5秒。两边各做一次。", observe: "哪边更容易被压下去；是否只抬脚趾却没有勾起脚背；哪里不舒服。" },
  "ankle-evertor": { title: "脚掌向外推的力量", how: "坐稳，用另一只脚挡在脚的外侧，再把脚掌向外顶住5秒。两边各做一次。", observe: "哪边更容易被挡住；外踝或小腿外侧是否不舒服。" },
  "ankle-invertor": { title: "脚掌向内推的力量", how: "坐稳，用另一只脚挡在脚的内侧，再把脚掌向内顶住5秒。两边各做一次。", observe: "哪边更容易被挡住；内踝后方或足弓是否不舒服。" },
  "ankle-calf": { title: "踮脚力量", how: "扶住墙，双脚慢慢踮起再落下，做5次。能稳定完成时，再分别用单脚试做。", observe: "哪边抬得更低、更容易累，或用力时会不舒服。" },
  "ankle-weight-bearing": { title: "走几步看看", how: "在能扶住的地方自然走几步，不用故意走快。", observe: "不舒服这边能不能踩地；哪一步会不舒服；有没有明显一瘸一拐。" },
  "ankle-squat": { title: "扶着下蹲", how: "双脚自然站立，扶住固定物，慢慢下蹲到舒服的深度，再站起来。", observe: "脚跟会不会提前抬起；哪边脚踝更难向前弯；哪里不舒服。" },
  "ankle-single-leg": { title: "单脚站立", how: "靠近墙，一只脚站立10秒，再换另一边；需要时用手指轻扶。", observe: "哪边更容易晃、站不住或引起不适。" },
  "ankle-heel-raise": { title: "踮脚", how: "扶住墙，双脚慢慢踮起再落下，做5次。", observe: "两边脚跟抬起的高度是否接近；哪里不舒服；身体是否明显偏向一边。" },
  "ankle-knee-wall": { title: "脚跟不抬，膝盖向前碰墙", how: "面对墙站立，脚跟贴地，膝盖慢慢向前靠近墙。左右脚使用相同距离各做一次。", observe: "哪边更难碰到墙；脚跟是否抬起；踝前或小腿哪里不舒服。" },
};

function assessmentTitle(id: string, title: string) {
  const friendly: Record<string, string> = {
    "ankle-dorsiflexion": "脚背向上勾",
    "ankle-plantarflexion": "脚背向下压",
    "ankle-inversion": "脚掌向内转",
    "ankle-eversion": "脚掌向外转",
    "ankle-great-toe-extension": "大脚趾向上抬",
    "ankle-toe-flexion": "脚趾弯曲和伸直",
    "ankle-dorsiflexor": "勾脚力量（胫骨前肌）",
    "ankle-evertor": "脚掌向外推的力量（腓骨肌）",
    "ankle-invertor": "脚掌向内推和足弓支撑（胫骨后肌）",
    "ankle-calf": "提踵力量（小腿后侧）",
    "ankle-intrinsic": "足弓主动控制",
    "ankle-gait": "走路时脚跟到脚尖的过渡",
    "ankle-knee-wall": "脚跟不抬的屈膝碰墙",
    "ankle-weight-bearing": "不舒服这边承重和走路",
    "ankle-anterior-drawer": "脚踝外侧稳定性检查（专业人员操作）",
    "ankle-thompson": "跟腱连续性检查（小腿挤压）",
    "ankle-windlass": "大脚趾抬起时的足底反应",
  };
  return FRIENDLY_ASSESSMENT_COPY[id]?.title ?? friendly[id] ?? title;
}

function assessmentCopy(id: string, how: string, observe: string) {
  const plain = (value: string) => value
    .replaceAll("屈曲90度", "弯成直角")
    .replaceAll("屈90度", "弯成直角")
    .replaceAll("躯干", "上半身")
    .replaceAll("固定骨盆", "骨盆保持不动")
    .replaceAll("末端", "能到的位置")
    .replaceAll("代偿", "跟着帮忙")
    .replaceAll("抗阻", "对抗轻微阻力")
    .replaceAll("等长", "保持不动发力")
    .replaceAll("没受伤的那边", "健侧");
  return FRIENDLY_ASSESSMENT_COPY[id] ?? { title: "", how: plain(how), observe: plain(observe) };
}

/**
 * 专业工作台使用标准检查术语，操作说明仍保持短句，避免把自助用户文案
 * （如“勾脚”“温和活动”）直接带进专业流程。
 */
function professionalAssessmentCopy(id: string, how: string, observe: string) {
  const normalizedId = id.replace(/^(motion|strength|function|special):/, "");
  const motionCopy: Record<string, { how: string; observe: string }> = {
    "knee-extension": {
      how: "受检者仰卧，双下肢自然伸直；完成膝关节主动伸直（AROM），记录膝后间隙与末端控制。",
      observe: "与对侧比较主动伸直范围、末端控制及症状诱发。",
    },
    "knee-flexion": {
      how: "受检者仰卧，足跟沿床面滑向臀部，骨盆保持稳定；记录膝关节主动屈曲（AROM）。",
      observe: "与对侧比较屈曲范围、终末阻挡及症状诱发。",
    },
    "ankle-dorsiflexion": {
      how: "受检者坐位，足跟支撑，完成踝关节主动背屈（AROM）；避免足趾代偿。",
      observe: "与对侧比较背屈幅度、运动轨迹及症状诱发。",
    },
    "ankle-plantarflexion": {
      how: "受检者坐位，小腿稳定，完成踝关节主动跖屈（AROM）；避免足趾抓地。",
      observe: "与对侧比较跖屈幅度、运动轨迹及症状诱发。",
    },
    "ankle-inversion": {
      how: "受检者坐位，小腿固定，完成踝足主动内翻（AROM）；避免膝关节随动。",
      observe: "与对侧比较内翻幅度、足部轨迹及症状诱发。",
    },
    "ankle-eversion": {
      how: "受检者坐位，小腿固定，完成踝足主动外翻（AROM）；避免膝关节随动。",
      observe: "与对侧比较外翻幅度、足部轨迹及症状诱发。",
    },
    "knee-patella-superior": {
      how: "受检者仰卧并完全放松膝关节；检查者比较两侧髌骨向上滑动（PROM）的幅度与终末感。",
      observe: "记录与对侧的活动差异、终末感及是否诱发熟悉症状。",
    },
    "knee-patella-inferior": {
      how: "受检者仰卧并完全放松膝关节；检查者比较两侧髌骨向下滑动（PROM）的幅度与终末感。",
      observe: "记录与对侧的活动差异、终末感及是否诱发熟悉症状。",
    },
    "knee-patella-medial": {
      how: "受检者仰卧并完全放松膝关节；检查者比较两侧髌骨向内滑动（PROM）的幅度与终末感。",
      observe: "记录与对侧的活动差异、终末感及是否诱发熟悉症状。",
    },
    "knee-patella-lateral": {
      how: "受检者仰卧并完全放松膝关节；检查者比较两侧髌骨向外滑动（PROM）的幅度与终末感。",
      observe: "记录与对侧的活动差异、终末感及是否诱发熟悉症状。",
    },
  };
  const direct = motionCopy[normalizedId];
  if (direct) return direct;
  const professionalHow = how
    .replaceAll("先做没有不适的一边，再", "先完成对侧，再")
    .replaceAll("把脚背向小腿靠近", "完成踝关节背屈（AROM）")
    .replaceAll("把脚掌慢慢转向身体中间", "完成踝足内翻（AROM）")
    .replaceAll("脚掌慢慢向外转", "完成踝足外翻（AROM）")
    .replaceAll("轻轻", "低刺激")
    .replaceAll("由熟悉检查的人", "由检查者")
    .replaceAll("让膝盖完全放松", "使膝关节完全放松")
    .replaceAll("把髌骨", "使髌骨");
  const professionalObserve = observe
    .replaceAll("哪里不舒服", "症状诱发部位")
    .replaceAll("会不会不舒服", "是否诱发症状")
    .replaceAll("与另一侧相比", "与对侧比较")
    .replaceAll("哪边", "哪侧")
    .replaceAll("动作会不会引起不适", "主动活动是否诱发症状");
  return { how: professionalHow, observe: professionalObserve };
}

function assessmentLocationAreas(itemId: string): LowerLimbAreaId[] {
  const id = itemId.replace(/^(motion|strength|function|special):/, "");
  if (id.startsWith("knee-")) return ["thigh", "knee", "calf"];
  if (id.startsWith("ankle-")) return ["calf", "ankle", "foot"];
  if (id.startsWith("thigh-")) return ["thigh"];
  if (id.startsWith("calf-")) return ["calf"];
  return ["thigh", "knee", "calf", "ankle", "foot"];
}

function assessmentObservationSentence(item: AssessmentItem, record: AssessmentRecord) {
  const location = record.discomfortLocation?.trim();
  const feeling = record.discomfortType;
  const score = typeof record.symptomScore === "number" ? `${record.symptomScore}/10` : "";
  return [item.title, location, feeling, score].filter(Boolean).join(" · ");
}

function familiarSymptomRequired(record: AssessmentRecord, hasChiefAction: boolean) {
  return !hasChiefAction && (record.discomfort === "yes" || functionDiscomfortValue(record) === "yes" || record.simple === "painful");
}

function motionComparisonMode(regionId: string, itemId: string): MotionComparison {
  if (!isSpinalRegion(regionId)) return "contralateral";
  if (/(left|right)$/.test(itemId)) return "opposite-direction";
  return "midline";
}

function isSpinalRegion(regionId: string) {
  return ["neck", "thoracic-rib", "lumbar-pelvis"].includes(regionId);
}

function operationTargetLabel(target: OperationTarget | "") {
  return target === "other" ? "给别人检查" : target === "study" ? "只学习案例" : target === "self" ? "给自己检查" : "待确认";
}

function profileLabelForIntake(intake: Pick<IntakeState, "productMode" | "operationTarget">, profile: ReturnType<typeof normalizeWorkflowProfile>) {
  if (profile.isStudy) return "案例学习";
  if (intake.productMode === "guided") return "自助康复";
  return "康复思路模式";
}

function spineModeLabel(mode: SpineAssessmentMode) {
  return mode === "reference" ? "参考角度判断" : mode === "guided" ? "跟随提示观察" : "待确认";
}

function motionComparisonTarget(mode: MotionComparison = "contralateral") {
  if (mode === "opposite-direction") return "另一方向";
  if (mode === "midline") return "自己平时的活动范围";
  return "健侧";
}

function motionAmplitudeLabel(itemId: string) {
  const id = itemId.replace(/^motion:/, "");
  const labels: Record<string, string> = {
    "ankle-dorsiflexion": "脚背向上的幅度",
    "calf-dorsiflexion": "脚背向上的幅度",
    "ankle-plantarflexion": "脚背向下的幅度",
    "calf-plantarflexion": "脚背向下的幅度",
    "ankle-inversion": "足部向内翻的幅度",
    "calf-inversion": "足部向内翻的幅度",
    "ankle-eversion": "足部向外翻的幅度",
    "calf-eversion": "足部向外翻的幅度",
    "knee-extension": "膝关节伸直幅度",
    "knee-flexion": "膝关节屈曲幅度",
    "knee-patella-superior": "髌骨向上滑动幅度",
    "knee-patella-inferior": "髌骨向下滑动幅度",
    "knee-patella-medial": "髌骨向内滑动幅度",
    "knee-patella-lateral": "髌骨向外滑动幅度",
    "thigh-front-length": "屈膝时大腿前侧拉长幅度",
    "thigh-back-length": "抬腿伸膝时大腿后侧拉长幅度",
    "thigh-medial-length": "髋外展时大腿内侧拉长幅度",
    "thigh-lateral-load": "腿向中线靠近时大腿外侧拉长幅度",
  };
  return labels[id] ?? "该方向的主动活动幅度";
}

function activeMotionRangeQuestion(itemId: string, bilateral = false, passiveOnly = false) {
  const amplitude = motionAmplitudeLabel(itemId);
  const passiveAmplitude = passiveOnly ? amplitude.replace(/的幅度$/, "的被动活动幅度") : amplitude;
  return bilateral ? `比较左右两侧的${passiveAmplitude}` : `与对侧相比，患侧的${passiveAmplitude}`;
}

function activeMotionRangeOptions(mode: MotionComparison = "contralateral", spinal = false, assessmentMode: SpineAssessmentMode = "guided", professional = false): Array<[MotionAnswer, string]> {
  if (spinal && assessmentMode === "reference") return [
    ["same", "角度基本正常｜接近参考范围"],
    ["limited", "角度偏小｜低于参考范围"],
    ["excessive", "角度偏大｜高于参考范围"],
    ["unable", "无法完成｜疼痛或其他原因"],
    ["unsure", "暂不判断｜无法测量或比较"],
  ];
  if (spinal && mode === "opposite-direction") return [
    ["same", "与另一方向接近｜幅度差不明显"],
    ["limited", "该方向偏小｜明显受限"],
    ["unable", "无法完成｜疼痛或其他原因"],
    ["unsure", "暂不判断｜无法比较"],
  ];
  if (spinal) return [
    ["same", "可以完成｜动作顺畅"],
    ["limited", "范围偏小｜动作受限"],
    ["unable", "无法完成｜疼痛或其他原因"],
    ["unsure", "暂不判断｜无法比较"],
  ];
  const options: Array<[MotionAnswer, string]> = [
    ["same", "接近健侧｜两侧幅度相近"],
    ["limited", "患侧偏小｜活动范围受限"],
    ["unable", "无法完成｜疼痛、担心或不会做"],
    ["unsure", "暂不判断｜今天先跳过"],
  ];
  if (professional) options.splice(2, 0, ["excessive", "患侧偏大｜活动范围明显更大"]);
  return options;
}

function localLimbMotionRangeOptions(professional = false): Array<[MotionAnswer, string]> {
  const options: Array<[MotionAnswer, string]> = [
    ["same", "接近健侧｜两侧幅度相近"],
    ["limited", "患侧偏小｜活动范围受限"],
    ["unable", "无法完成｜疼痛、担心或不会做"],
    ["unsure", "暂不判断｜今天先跳过"],
  ];
  if (professional) options.splice(2, 0, ["excessive", "患侧偏大｜活动范围明显更大"]);
  return options;
}

const TENSION_LOCATION_OPTIONS: Record<string, string[]> = {
  "hip-flexion": ["大腿前侧", "腹股沟附近", "腰侧"],
  "hip-extension": ["髋前侧", "大腿前侧", "腰侧"],
  "hip-abduction": ["大腿内侧", "髋外侧", "腰侧"],
  "hip-adduction": ["大腿外侧", "臀外侧", "腹股沟附近"],
  "hip-internal-rotation": ["臀后外侧", "髋外侧", "大腿内侧"],
  "hip-external-rotation": ["大腿内侧", "臀后侧", "髋前侧"],
  "shoulder-flexion": ["胸前", "肩后侧", "腋窝后侧"],
  "shoulder-extension": ["胸前", "肩前侧", "上臂前侧"],
  "shoulder-abduction": ["胸前", "肩上方", "腋窝后侧"],
  "elbow-flexion": ["上臂后侧", "肘后侧", "前臂后侧"],
  "elbow-extension": ["上臂前侧", "肘前侧", "前臂前侧"],
  "wrist-flexion": ["前臂背侧", "手腕背侧"],
  "wrist-extension": ["前臂掌侧", "手腕掌侧"],
  "thigh-front-length": ["大腿前侧", "髋前"],
  "thigh-back-length": ["大腿后侧", "膝后"],
  "thigh-medial-length": ["大腿内侧", "腹股沟附近"],
  "thigh-lateral-load": ["大腿外侧", "髋外侧"],
  "calf-dorsiflexion": ["小腿后侧"],
  "calf-plantarflexion": ["小腿前侧"],
  "calf-inversion": ["小腿外侧"],
  "calf-eversion": ["小腿内侧"],
};

function tensionLocationOptions(itemId: string, context = "") {
  const motion = pilotMotionKnowledge(itemId);
  if (!motion) return TENSION_LOCATION_OPTIONS[itemId] ?? ["动作方向前侧", "动作方向后侧", "关节附近"];
  const primary = motion.relations.filter((relation) => relation.role !== "stabilizer");
  const supportedStabilizers = motion.relations.filter((relation) => relation.role === "stabilizer" && (
    relation.regionId === "thigh-lateral" && /外侧|外链|阔筋膜|髂胫束|膝内侧|下楼/.test(context)
    || relation.regionId === "thigh-medial" && /内侧|鹅足|内收/.test(context)
    || relation.regionId === "calf-lateral" && /外侧|外踝|不稳/.test(context)
    || relation.regionId === "calf-medial" && /内侧|内踝|足弓/.test(context)
    || relation.regionId === "calf-posterior" && /膝后|小腿后/.test(context)
    || relation.regionId === "plantar" && /足底|足弓|脚底/.test(context)
  ));
  return [...primary, ...supportedStabilizers]
    .filter((relation, index, list) => list.findIndex((entry) => entry.regionId === relation.regionId) === index)
    .map((relation) => pilotMuscleRegion(relation.regionId).label);
}

function bilateralAssessmentCopy(text: string) {
  return text
    .replaceAll("先做健侧，再做患侧", "左、右两侧分别做一次")
    .replaceAll("先做健侧，再用患侧", "左、右两侧分别")
    .replaceAll("先做健侧，再用同样姿势做不舒服的一侧", "左、右两侧分别用同样姿势完成")
    .replaceAll("先做健侧", "左、右两侧分别做")
    .replaceAll("患侧先上", "左、右腿分别先上")
    .replaceAll("患侧支撑", "左、右腿分别支撑")
    .replaceAll("不舒服这边", "左右两侧")
    .replaceAll("不舒服的一侧", "左右两侧")
    .replaceAll("患侧", "左右两侧")
    .replaceAll("健侧", "另一侧");
}

function sharedTensionLocationsForMotion(itemId: string, record: AssessmentRecord, sharedRecord?: AssessmentRecord) {
  const directionId = itemId.replace(/^motion:/, "");
  const direct = record.tensionLocations ?? [];
  const shared = (sharedRecord?.tensionLocations ?? []).filter((location) => {
    if (["没有明显差别", "两侧感觉接近"].includes(location)) return false;
    const normalized = normalizePilotMuscleRegion(location);
    return Boolean(normalized && primaryRetestMotionIdsForRegion(normalized.id).some((motionId) => samePhysicalAction(motionId, directionId)));
  });
  return [...new Set([...direct, ...shared])];
}

function motionUnableGuidance(item: AssessmentItem, reason?: AssessmentRecord["unableReason"]) {
  if (!reason) return null;
  if (reason === "pain") return {
    action: "改成坐稳或躺稳，只做不会明显加重的小幅动作。",
    fallback: "仍会痛就停止；这次记录为“因不适未完成”，不强行测完整范围。",
  };
  if (reason === "fear") return {
    action: "扶住固定物，把动作缩小到你觉得安全的范围，再慢慢试一次。",
    fallback: "仍不敢做就停止；这次只记为暂时无法判断。",
  };
  if (reason === "instruction") return {
    action: `先回到起始姿势，只做一小段：${item.how}`,
    fallback: "仍不知道怎么做就先跳过；这次不把它算成正常或受限。",
  };
  return {
    action: "换成更稳定的坐位或卧位，只尝试一小段舒适动作。",
    fallback: "仍做不了就停止；这次保留为待确认。",
  };
}

function strengthUnableGuidance(item: AssessmentItem, reason?: StrengthUnableReason, professional = false) {
  if (!reason) return null;
  if (reason === "pain") return {
    action: "减小用力，只尝试轻轻保持3秒。",
    fallback: "仍会痛就停止；记录为发力会引起不适。",
  };
  if (reason === "weak" || reason === "control") return {
    action: "先不加阻力，在舒适范围找到位置并保持3秒。",
    fallback: "仍保持不住就记录为力量或控制不足，后续安排基础训练。",
  };
  if (reason === "no-helper") return {
    action: `改用自助等长：${item.how}`,
    fallback: "不需要他人按压；仍无法判断就先跳过。",
  };
  if (reason === "fear") return {
    action: "把用力减到很轻，先保持3秒，不追求最大力量。",
    fallback: "仍担心加重就停止；这次不判断强弱。",
  };
  return {
    action: professional ? `先不加阻力，让对方主动完成并保持3秒：${item.how}` : `先照着动作做一次，不加阻力：${item.how}`,
    fallback: "仍不会做就先跳过；这次不把它算成正常或偏弱。",
  };
}

function functionSimpleAnswer(record: AssessmentRecord): SimpleAnswer | undefined {
  const completion = functionCompletionValue(record);
  if (completion === "skip") return "skip";
  if (completion === "unable") {
    if (record.functionUnableReason === "pain") return "unable";
    if (record.functionUnableReason === "weak") return "weak";
    if (["fear", "instruction"].includes(record.functionUnableReason ?? "")) return "skip";
    return undefined;
  }
  if (record.functionCompletion === "complete") {
    if (!record.functionControl || !record.functionDiscomfort) return undefined;
    if (record.functionDiscomfort === "yes") return "painful";
    if (record.functionControl === "compensated") return "present";
    return "normal";
  }
  if (functionDiscomfortValue(record) === "yes") return "painful";
  if (functionControlValue(record) === "compensated") return "present";
  if (completion === "complete") return "normal";
  return undefined;
}

function definedAssessmentFields(record: AssessmentRecord): AssessmentRecord {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as AssessmentRecord;
}

function spinalRangeQuestion(mode: MotionComparison = "midline", assessmentMode: SpineAssessmentMode = "guided") {
  if (assessmentMode === "reference") return "与参考角度相比";
  if (mode === "opposite-direction") return "与另一个方向相比怎么样？";
  return "这个动作完成得怎么样？";
}

function passiveMotionOptions(mode: MotionComparison = "contralateral", useReferenceAngle = false, bilateral = false): Array<[PassiveAnswer, string]> {
  if (bilateral) return [["same", "两侧接近｜被动范围差异不明显"], ["limited", "一侧偏小｜更差侧仍受限"], ["excessive", "一侧偏大｜范围明显增加"], ["skip", "未检查｜无法判断"]];
  if (useReferenceAngle) return [["same", "角度基本正常｜接近参考范围"], ["limited", "角度偏小｜低于参考范围"], ["excessive", "角度偏大｜高于参考范围"], ["skip", "未检查｜无法判断"]];
  if (mode === "opposite-direction") return [["same", "与另一方向接近｜差异不明显"], ["limited", "该方向偏小｜仍明显受限"], ["excessive", "该方向偏大｜范围明显增加"], ["skip", "未检查｜无法判断"]];
  if (mode === "midline") return [["same", "接近平时范围｜差异不明显"], ["limited", "范围偏小｜仍明显受限"], ["excessive", "范围偏大｜超过平时范围"], ["skip", "未检查｜无法判断"]];
  return [["same", "接近健侧｜被动范围差异不明显"], ["limited", "患侧偏小｜仍明显受限"], ["excessive", "患侧偏大｜范围明显增加"], ["skip", "未检查｜无法判断"]];
}

const PASSIVE_END_FEEL_OPTIONS: Array<[PassiveEndFeel, string]> = [
  ["soft", "软性终末感"],
  ["elastic", "弹性终末感"],
  ["firm", "坚实终末感"],
  ["hard", "硬性阻挡"],
  ["painful", "疼痛性终止"],
  ["unknown", "无法判断"],
];

function passiveEndFeelLabel(value?: PassiveEndFeel) {
  return PASSIVE_END_FEEL_OPTIONS.find(([key]) => key === value)?.[1] ?? "";
}

function passiveMotionInstruction(mode: MotionComparison = "contralateral", bilateral = false) {
  if (bilateral) return "让对方放松，左右分别轻柔带动，记录哪一侧范围更小；不熟悉时选择“未做/不确定”。";
  if (mode === "opposite-direction") return "由受训者在放松体位轻柔带动，再与相反方向的末端角度和弹性比较；不熟悉时选择“未做/不确定”。";
  if (mode === "midline") return "由受训者在放松体位轻柔辅助动作，比较是否更接近平时可用范围；不熟悉时选择“未做/不确定”。";
  return "让对方放松，轻柔带动不舒服的一侧，再与健侧比较活动范围；不熟悉时选择“未做/不确定”。";
}

function professionalPassiveMotionInstruction(item: AssessmentItem, bilateral = false) {
  if (item.testMode === "passive") return item.professionalHow ?? "受检者放松相关关节，检查者与对侧比较被动活动幅度和终末感。";
  if (bilateral) return "受检者放松，检查者以相同体位和力度分别完成左右被动活动（PROM），记录幅度、终末感及症状反应。";
  return "受检者放松，检查者以低刺激完成患侧被动活动（PROM），再与对侧比较幅度、终末感及症状反应。";
}

function rangeRetestOptions(mode: MotionComparison = "contralateral", canAssessPassive = true, bilateral = false, passiveOnly = false): Array<[CompletedRangeRetestAnswer, string]> {
  const target = bilateral ? "较好一侧或原有活动范围" : motionComparisonTarget(mode);
  if (passiveOnly) return [
    ["both-match", `接近目标｜被动活动幅度与${target}接近`],
    ["better-passive-limited", `有所改善｜被动活动幅度增加但仍小于${target}`],
    ["passive-limited", `仍受限｜被动活动幅度仍小于${target}`],
    ["worse", "变差｜被动活动幅度减小或不适加重"],
  ];
  if (!canAssessPassive) return [
    ["both-match", `接近目标｜主动活动幅度与${target}接近`],
    ["better-passive-limited", `有所改善｜幅度增加但仍小于${target}`],
    ["passive-limited", `仍受限｜主动活动幅度仍小于${target}`],
    ["worse", "变差｜幅度减小或不适加重"],
  ];
  return [
    ["both-match", `均接近目标｜主动和被动范围都接近${target}`],
    ["passive-match-active-limited", `控制仍不足｜被动接近${target}，主动仍偏小`],
    ["better-passive-limited", `部分改善｜主动有改善，被动仍小于${target}`],
    ["passive-limited", `被动仍受限｜被动活动幅度仍小于${target}`],
    ["worse", "变差｜幅度减小或不适加重"],
  ];
}

function shouldCollectBaselineScore(intake: IntakeState) {
  // 分数必须绑定一个能重复完成的具体动作。只有选择“走路/按压/静息”
  // 等场景，仍没有说清动作时，不显示初始评分条，避免把泛泛症状变成
  // 一个后面无法复现的主诉分数。
  return hasClearChiefAction(intake);
}

function chiefComplaintLabel(intake: IntakeState) {
  if (hasClearChiefAction(intake)) return chiefActionLabel(intake);
  return [intake.side, intake.location && intake.location !== "说不清" ? intake.location : "具体位置待确认", intake.symptomType].filter(Boolean).join(" · ") || "当前主要问题";
}

function retestConditionLabel(intake: IntakeState) {
  return hasClearChiefAction(intake) ? chiefActionLabel(intake) : "当前主要症状（没有固定动作）";
}

function chiefFunctionAssessmentId(intake: IntakeState, regionId: string) {
  if (!hasClearChiefAction(intake)) return "";
  const source = [intake.actionAnalysis?.task, ...reportedActionSummary(intake), intake.forceDirection].filter(Boolean).join(" ");
  if (regionId === "knee") {
    if (includesAny(source, ["下楼", "下台阶"])) return "function:knee-step-down";
    if (includesAny(source, ["上楼", "上台阶"])) return "function:knee-step-up";
    if (includesAny(source, ["下蹲", "蹲起", "坐站"])) return "function:knee-squat";
  }
  if (regionId === "ankle-foot") {
    if (includesAny(source, ["走路", "步行", "承重"])) return "function:ankle-weight-bearing";
    if (includesAny(source, ["提踵", "踮脚", "蹬地"])) return "function:ankle-heel-raise";
  }
  return "";
}

function chiefFunctionRecordFromIntake(intake: IntakeState): AssessmentRecord {
  const unable = /(无法|不能|做不了|走不了|下不了|不敢继续|无法完成)/.test([
    intake.description,
    ...reportedActionSummary(intake),
    intake.actionAnalysis?.task,
  ].filter(Boolean).join(" "));
  const record: AssessmentRecord = {
    functionCompletion: unable ? "unable" : "complete",
    // 主诉只能复用“这个动作会不舒服”，不能替用户猜动作是否稳定。
    // 能完成时仍需要现场选择控制表现。
    functionControl: undefined,
    functionUnableReason: unable ? "pain" : undefined,
    functionDiscomfort: "yes",
    discomfortLocation: intake.location,
    discomfortLocations: intake.bodyLocations,
    discomfortType: intake.symptomType,
    symptomScore: intake.baselineScoreConfirmed ? intake.baselineScore : undefined,
    familiarSymptom: "yes",
  };
  return { ...record, simple: functionSimpleAnswer(record) };
}

function effectiveAssessmentRecord(item: AssessmentItem, stored: AssessmentRecord | undefined, intake: IntakeState, regionId: string) {
  const overlapsChief = item.kind === "function"
    && item.id === chiefFunctionAssessmentId(intake, regionId)
    && hasClearChiefAction(intake);
  return overlapsChief ? { ...chiefFunctionRecordFromIntake(intake), ...definedAssessmentFields(stored ?? {}) } : stored;
}

function canonicalRetestAction(label: string) {
  return canonicalActionKey(label);
}

function directionIsRelevant(regionId: string, itemId: string, intake: IntakeState) {
  const source = chiefActionSource(intake);
  if (regionId === "ankle-foot" && ["ankle-great-toe-extension", "ankle-toe-flexion"].includes(itemId)) {
    const explicitFootSource = `${intake.description} ${intake.location} ${intake.reproduction}`;
    const deniesToeProblem = /(?:脚趾|足趾|大脚趾)[^，。；]{0,6}(?:没有|没|不)(?:受伤|疼|痛|不适|问题)|(?:没有|没|不)[^，。；]{0,6}(?:脚趾|足趾|大脚趾)(?:受伤|疼|痛|不适|有问题)?/.test(explicitFootSource);
    const toeOnlyMention = includesAny(explicitFootSource, ["脚趾", "足趾", "大脚趾"]);
    if (toeOnlyMention && deniesToeProblem && !includesAny(explicitFootSource, ["前脚掌", "足底", "脚底", "足跟", "脚跟", "足弓"])) return false;
    return includesAny(explicitFootSource, ["脚趾", "足趾", "大脚趾", "前脚掌", "足底", "脚底", "足跟", "脚跟", "足弓"]);
  }
  if (regionId === "knee" && itemId.includes("knee-patella")) {
    const profile = intake.productMode
      ? normalizeWorkflowProfile({ productMode: intake.productMode, operationTarget: intake.operationTarget, capabilities: intake.capabilities })
      : workflowProfileFromLegacy(intake.userRole, intake.examSetup);
    if (profile.operationTarget !== "other") return false;
    return includesAny(source, ["膝前", "髌骨", "下楼", "上楼", "蹲", "伸不直", "弯不了", "活动受限"]);
  }
  if (regionId === "thigh-local") {
    // 局部模块的“主方向＋条件式协同/相反方向”由统一排序器决定。
    // 这里不再提前按点击位置删掉候选，否则排序器无法补查高价值方向。
    return itemId.startsWith("thigh-");
  }
  if (regionId === "calf-local") {
    return itemId.startsWith("calf-");
  }
  return true;
}

function functionIsRelevant(regionId: string, itemId: string, intake: IntakeState) {
  const source = chiefActionSource(intake);
  if (regionId === "thigh-local") {
    if (itemId === "thigh-jog") return intake.goal >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跑", "冲刺", "运动"]);
    if (itemId === "thigh-sit-stand") return includesAny(source, ["蹲", "起身", "坐", "站"]);
    if (itemId === "thigh-bridge-check") return includesAny(`${intake.location} ${source}`, ["大腿后", "臀桥", "后侧链", "跑", "冲刺"]);
    if (itemId === "thigh-single-leg") return includesAny(`${intake.location} ${source}`, ["大腿内", "大腿外", "单腿", "侧移", "变向", "不稳"]);
    return itemId === "thigh-walk";
  }
  if (regionId === "calf-local") {
    if (itemId === "calf-jog") return intake.goal >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跑", "跳", "运动"]);
    if (itemId === "calf-heel-raise") return includesAny(source, ["提踵", "蹬地", "跑", "跳", "小腿后"]);
    if (itemId === "calf-single-leg") return includesAny(`${intake.location} ${source}`, ["小腿内", "小腿外", "单腿", "足弓", "不稳"]);
    return itemId === "calf-walk";
  }
  if (regionId !== "ankle-foot") return true;
  if (itemId === "ankle-hop") return intake.goal >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跳", "跑", "运动", "球"]);
  if (itemId === "ankle-heel-raise") return !isAcuteTrauma(intake) || includesAny(source, ["提踵", "蹬地", "跑", "跟腱"]);
  if (itemId === "ankle-single-leg") return !isAcuteTrauma(intake) || includesAny(source, ["单脚", "不稳", "平衡"]);
  if (itemId === "ankle-knee-wall") return !intake.symptoms.includes("肿胀或淤青") && includesAny(source, ["蹲", "楼", "踝前", "活动受限", "走"]);
  return true;
}

function strengthIsRelevant(regionId: string, itemId: string, intake: IntakeState) {
  if (["thigh-local", "calf-local"].includes(regionId)) return directionIsRelevant(regionId, itemId, intake);
  if (regionId !== "ankle-foot") return true;
  const source = chiefActionSource(intake);
  // 急性踝扭伤的常用能力优先看背屈和外翻控制。主诉动作只负责
  // 追加高相关项目，不能因为“跖屈会痛”就把外翻控制挤掉。
  const relevant = new Set<string>();
  if (isAcuteTrauma(intake) && includesAny(`${source} ${intake.mechanism}`, ["崴脚", "崴伤", "扭伤", "扭到", "外踝", "脚踝"])) {
    relevant.add("ankle-dorsiflexor");
    relevant.add("ankle-evertor");
  }
  if (intake.forceDirection.includes("向上勾脚") || intake.forceDirection.includes("脚背向上勾")) relevant.add("ankle-dorsiflexor");
  if (intake.forceDirection.includes("脚背向下压")) relevant.add("ankle-calf");
  if (intake.forceDirection.includes("提踵") || intake.forceDirection.includes("踮脚")) ["ankle-calf", "ankle-intrinsic"].forEach((id) => relevant.add(id));
  if (intake.forceDirection.includes("向内转")) relevant.add("ankle-invertor");
  if (intake.forceDirection.includes("向外转")) relevant.add("ankle-evertor");
  if (intake.forceDirection.includes("脚趾") || intake.forceDirection.includes("足弓")) ["ankle-invertor", "ankle-calf", "ankle-intrinsic"].forEach((id) => relevant.add(id));
  if (relevant.size) return relevant.has(itemId);
  if (includesAny(source, ["足趾", "脚趾", "足弓", "足底"])) return ["ankle-invertor", "ankle-calf", "ankle-intrinsic"].includes(itemId);
  if (includesAny(source, ["内踝", "内侧"])) return ["ankle-invertor", "ankle-calf", "ankle-dorsiflexor"].includes(itemId);
  if (includesAny(source, ["外踝", "崴脚", "外侧"])) return (isAcuteTrauma(intake) ? ["ankle-evertor", "ankle-dorsiflexor"] : ["ankle-evertor", "ankle-dorsiflexor", "ankle-calf"]).includes(itemId);
  return ["ankle-dorsiflexor", "ankle-evertor", "ankle-calf"].includes(itemId);
}

function strengthRelatedMotionId(strengthItemId: string) {
  const map: Record<string, string> = {
    "strength:knee-quadriceps": "motion:knee-extension",
    "strength:knee-hamstring": "motion:knee-flexion",
    "strength:ankle-dorsiflexor": "motion:ankle-dorsiflexion",
    "strength:ankle-calf": "motion:ankle-plantarflexion",
    "strength:ankle-invertor": "motion:ankle-inversion",
    "strength:ankle-evertor": "motion:ankle-eversion",
    "strength:thigh-front-strength": "motion:thigh-front-length",
    "strength:thigh-back-strength": "motion:thigh-back-length",
    "strength:thigh-medial-strength": "motion:thigh-medial-length",
    "strength:thigh-lateral-strength": "motion:thigh-lateral-load",
    "strength:calf-dorsiflexor-strength": "motion:calf-dorsiflexion",
    "strength:calf-heel-raise-strength": "motion:calf-plantarflexion",
    "strength:calf-invertor-strength": "motion:calf-inversion",
    "strength:calf-evertor-strength": "motion:calf-eversion",
  };
  return map[strengthItemId] ?? "";
}

function PillOptions({ options, value, onChange, columns = 2 }: { options: string[]; value: string; onChange: (value: string) => void; columns?: number }) {
  return <div className="rm-options" style={{ "--columns": columns } as CSSProperties}>{options.map((option) => <button type="button" key={option} className={value === option ? "is-selected" : ""} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

/**
 * 评估和复测共用的结果选项：按钮第一行只放结论，第二行再给很短的说明。
 * 这样不会把“结果、原因和下一步决策”全部挤在同一行，也不会改变原有值域。
 */
function AnswerChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value?: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return <div className={`rm-result-grid rm-answer-grid ${className}`.trim()}>
    {options.map(([optionValue, label]) => {
      const [title, hint] = label.split("｜", 2);
      return <button type="button" key={optionValue} className={value === optionValue ? "is-selected" : ""} onClick={() => onChange(optionValue)}>
        <strong>{title}</strong>
        {hint ? <small>{hint}</small> : null}
      </button>;
    })}
  </div>;
}

function ScoreSlider({ value, onChange, label, context, compact = false, selected = true }: { value: number; onChange: (value: number) => void; label: string; context?: string; compact?: boolean; selected?: boolean }) {
  const sourceKey = `${selected}:${value}:${context ?? ""}`;
  const initialDraft = selected ? value : 0;
  const [draftState, setDraftState] = useState({ sourceKey, value: initialDraft, dirty: false });
  const currentDraft = useMemo(
    () => draftState.sourceKey === sourceKey ? draftState : { sourceKey, value: initialDraft, dirty: false },
    [draftState, sourceKey, initialDraft],
  );
  const sliderStateRef = useRef(currentDraft);
  useEffect(() => {
    sliderStateRef.current = currentDraft;
  }, [currentDraft]);
  const handleSliderChange = (event: FormEvent<HTMLInputElement>) => {
    const nextValue = Number(event.currentTarget.value);
    // 评分条的值必须在输入事件发生时就同步到业务状态。
    // 仅依赖 pointerup/change 会让键盘、辅助技术和自动化输入出现“看得到数值、但仍未记录”的卡死。
    const next = { sourceKey, value: nextValue, dirty: false };
    sliderStateRef.current = next;
    setDraftState(next);
    onChange(nextValue);
  };
  const commitDraft = () => {
    const latest = sliderStateRef.current;
    if (latest.sourceKey !== sourceKey) return;
    if (latest.dirty) {
      sliderStateRef.current = { ...latest, dirty: false };
      setDraftState({ ...latest, dirty: false });
      onChange(latest.value);
    }
  };
  const handleSliderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const steps: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -2,
      PageUp: 2,
    };
    const nextValue = event.key === "Home"
      ? 0
      : event.key === "End"
        ? 10
        : Math.min(10, Math.max(0, currentDraft.value + (steps[event.key] ?? 0)));
    if (!(event.key in steps) && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = { sourceKey: `${true}:${nextValue}:${context ?? ""}`, value: nextValue, dirty: false };
    sliderStateRef.current = next;
    setDraftState(next);
    onChange(nextValue);
  };
  const draft = currentDraft.value;
  const displayedValue = draft;
  return <section className={`rm-score ${compact ? "is-compact" : ""} ${selected && !currentDraft.dirty ? "is-recorded" : ""}`}>
    <div className="rm-score-head"><div><span>{label}</span>{context ? <strong>{context}</strong> : null}</div><output>{selected || currentDraft.dirty ? displayedValue : "—"}<small>/10</small></output></div>
    <input aria-label={label} type="range" min="0" max="10" step="1" value={displayedValue} onInput={handleSliderChange} onChange={commitDraft} onBlur={commitDraft} onPointerUp={commitDraft} onMouseUp={commitDraft} onTouchEnd={commitDraft} onKeyDown={handleSliderKeyDown} style={{ "--score": `${displayedValue * 10}%` } as CSSProperties} />
    <div className="rm-score-scale"><span>0 · 没有疼痛或不适</span><span>10 · 极重，无法继续当前动作</span></div>
    <div className="rm-score-guide"><span><b>1～3</b>轻微，基本不影响动作</span><span><b>4～6</b>明显，会影响动作</span><span><b>7～9</b>很重，难以继续</span></div>
    <p className="rm-score-status">{selected && !currentDraft.dirty ? "已记录" : "拖动后松手即可记录"}</p>
  </section>;
}

function ScoreHistory({ scores, condition }: { scores: number[]; condition: string }) {
  return <section className="rm-score-history">
    <header><span>之前的评分参考</span><strong>{condition || "同一个动作 · 同样条件"}</strong></header>
    <div>{scores.map((score, index, list) => <article key={`${index}:${score}`}><i>{index + 1}</i><span>{index === 0 ? "初次评估" : `第${index}次康复结束`}</span><b>{score}<small>/10</small></b>{index < list.length - 1 ? <em>→</em> : null}</article>)}</div>
  </section>;
}

function StepHeading({ eyebrow, title, note, current, total }: { eyebrow: string; title: string; note?: string; current?: number; total?: number }) {
  return <header className="rm-heading"><div><span>{eyebrow}</span><h1>{title}</h1>{note ? <p>{note}</p> : null}</div>{typeof current === "number" && total ? <b>{current + 1}<small>/{total}</small></b> : null}</header>;
}

function StageTransition({ target, onContinue, onBack }: { target: TransitionTarget; onContinue: () => void; onBack: () => void }) {
  const content = STAGE_TRANSITIONS[target];
  return <section className="rm-stage-transition" aria-live="polite">
    <div className="rm-stage-transition-number">{content.number}</div>
    <div className="rm-stage-transition-copy">
      <span>下一阶段</span>
      <h1>{content.title}</h1>
      <p>{content.message}</p>
    </div>
    <div className="rm-stage-transition-actions">
      <button type="button" onClick={onBack}>返回查看</button>
      <button type="button" className="rm-primary" onClick={onContinue}>{content.button}</button>
    </div>
  </section>;
}

function NextSessionCard({ recommendation, nextSessionNumber, completedAt, onStart, onReportWorsening }: { recommendation: NextSessionRecommendation; nextSessionNumber: number; completedAt?: string; onStart?: () => void; onReportWorsening?: () => void }) {
  const [renderedAt] = useState(() => Date.now());
  const completedDate = completedAt ? new Date(completedAt) : new Date(renderedAt);
  const dateLabel = formatRecommendedDateRange(completedDate, recommendation);
  const earliestStart = recommendation.earliestDays === undefined ? null : new Date(completedDate.getTime() + recommendation.earliestDays * 86_400_000);
  const startingEarly = Boolean(earliestStart && renderedAt < earliestStart.getTime());
  const start = () => {
    if (startingEarly && !window.confirm("还没到建议复查时间。只有出现新变化、明显加重或专业人员另有安排时才建议提前开始。仍要开始吗？")) return;
    onStart?.();
  };
  return <section className={`rm-next-session-card is-${recommendation.mode}`}>
    <header><div><span>下次康复建议</span><h2>{recommendation.label}</h2></div><strong>{dateLabel}</strong></header>
    <div className="rm-next-session-grid">
      <article><span>这几天</span><ul>{recommendation.interimChecks.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><span>可以开始时</span><p>{recommendation.startCondition}</p></article>
      <article><span>提前复查</span><p>{recommendation.earlyReviewTriggers.join("、")}</p></article>
    </div>
    <footer><small>当天和第二天的反应记录不算新的一次康复。</small><div>{onReportWorsening ? <button type="button" onClick={onReportWorsening}>记录加重反应</button> : null}{recommendation.mode === "scheduled" && onStart ? <button type="button" className="rm-primary" onClick={start}>{startingEarly ? "提前开始" : "开始"}第{nextSessionNumber}次康复</button> : null}</div></footer>
  </section>;
}

export default function RehabMindCompleteDemo() {
  const [step, setStep] = useState<Step>(0);
  const [reviewStep, setReviewStep] = useState<Step | null>(null);
  const [reviewStepEditable, setReviewStepEditable] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<TransitionTarget | null>(null);
  const [intake, setIntake] = useState<IntakeState>(DEFAULT_INTAKE);
  const intakeRef = useRef<IntakeState>(DEFAULT_INTAKE);
  useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);
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
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  // 评估题目会根据已记录答案重新排序或逐级追加；记住当前题目 id，
  // 避免返回修改后数字索引落到另一题。
  const assessmentFocusIdRef = useRef("");
  const [assessmentResults, setAssessmentResults] = useState<Record<string, AssessmentRecord>>({});
  const assessmentResultsRef = useRef<Record<string, AssessmentRecord>>({});
  const [assessmentSummaryOpen, setAssessmentSummaryOpen] = useState(false);
  const [sharedTensionOpen, setSharedTensionOpen] = useState(false);
  const [thinkingWorkbenchOpen, setThinkingWorkbenchOpen] = useState(false);
  const [trialTargetIndex, setTrialTargetIndex] = useState(0);
  // 处理队列会在每条记录写入后重新计算。先记住期望进入的下一目标，
  // 避免前一项（尤其肿胀管理）退出队列后，旧的数字下标越过后续处理。
  const [pendingTrialAdvance, setPendingTrialAdvance] = useState<PendingQueueAdvance | null>(null);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [selectedOptionalCandidateIds, setSelectedOptionalCandidateIds] = useState<string[]>([]);
  const [bilateralNeedsReferral, setBilateralNeedsReferral] = useState(false);
  const [midpointDecisionDone, setMidpointDecisionDone] = useState(false);
  const [trialRecords, setTrialRecords] = useState<TrialRecord[]>([]);
  const [postScore, setPostScore] = useState(0);
  const [postScoreConfirmed, setPostScoreConfirmed] = useState(false);
  const [postDiscomfort, setPostDiscomfort] = useState<YesNo | "">("");
  const [readyToRetest, setReadyToRetest] = useState(false);
  const [retestPlan, setRetestPlan] = useState<RetestPlan | null>(null);
  const [movementResponse, setMovementResponse] = useState<RangeRetestAnswer>("");
  const [movementResponses, setMovementResponses] = useState<Record<string, CompletedRangeRetestAnswer>>({});
  const [movementDiscomforts, setMovementDiscomforts] = useState<Record<string, YesNo>>({});
  const [movementScores, setMovementScores] = useState<Record<string, number>>({});
  const [movementScoreConfirmed, setMovementScoreConfirmed] = useState<Record<string, boolean>>({});
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, ExerciseFeedback>>({});
  const [openExercise, setOpenExercise] = useState<string>("");
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [treatmentFinalRetestScore, setTreatmentFinalRetestScore] = useState(0);
  const [treatmentFinalRetestConfirmed, setTreatmentFinalRetestConfirmed] = useState(false);
  const [trainingReadyForFinalRetest, setTrainingReadyForFinalRetest] = useState(false);
  const [finalRetestScore, setFinalRetestScore] = useState(0);
  const [finalRetestConfirmed, setFinalRetestConfirmed] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [savedRecords, setSavedRecords] = useState<SavedDemoRecord[]>([]);
  const [followupMode, setFollowupMode] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [followupScore, setFollowupScore] = useState(0);
  const [followupScoreConfirmed, setFollowupScoreConfirmed] = useState(false);
  const [followupScoreHistory, setFollowupScoreHistory] = useState<number[]>([]);
  const [followupStage, setFollowupStage] = useState<FollowupStage>("review");
  const [followupPostScore, setFollowupPostScore] = useState(0);
  const [followupPostScoreConfirmed, setFollowupPostScoreConfirmed] = useState(false);
  const [followupPostDiscomfort, setFollowupPostDiscomfort] = useState<YesNo | "">("");
  const [followupCandidateId, setFollowupCandidateId] = useState("");
  const [followupTrialRecords, setFollowupTrialRecords] = useState<FollowupTreatmentRecord[]>([]);
  const [followupReadyToRetest, setFollowupReadyToRetest] = useState(false);
  const [followupRetestPlan, setFollowupRetestPlan] = useState<RetestPlan | null>(null);
  const [followupMovementResponses, setFollowupMovementResponses] = useState<Record<string, CompletedRangeRetestAnswer>>({});
  const [followupMovementDiscomforts, setFollowupMovementDiscomforts] = useState<Record<string, YesNo>>({});
  const [followupMovementScores, setFollowupMovementScores] = useState<Record<string, number>>({});
  const [followupMovementScoreConfirmed, setFollowupMovementScoreConfirmed] = useState<Record<string, boolean>>({});
  const [followupTensionLocations, setFollowupTensionLocations] = useState<string[]>([]);
  const [followupExerciseChoices, setFollowupExerciseChoices] = useState<Record<string, FollowupExerciseChoice>>({});
  const [followupTrainingReadyForRetest, setFollowupTrainingReadyForRetest] = useState(false);
  const [followupFinalScore, setFollowupFinalScore] = useState(0);
  const [followupFinalScoreConfirmed, setFollowupFinalScoreConfirmed] = useState(false);
  const [hasNewSymptom, setHasNewSymptom] = useState<FollowupNewSymptomAnswer>("");
  const [followupTrends, setFollowupTrends] = useState<Record<string, FollowupReviewAnswer>>({});
  const [sessionHistory, setSessionHistory] = useState<RehabSessionSummary[]>([]);
  const [assessmentRevision, setAssessmentRevision] = useState(0);
  const [treatmentPlanRevision, setTreatmentPlanRevision] = useState(0);
  const [adverseResponse, setAdverseResponse] = useState<AdverseResponseEvent | null>(null);
  const [adverseConfirmedAssessmentIds, setAdverseConfirmedAssessmentIds] = useState<string[]>([]);

  useEffect(() => {
    assessmentResultsRef.current = assessmentResults;
  }, [assessmentResults]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem("rehabmind-complete-demo-records");
        if (raw) setSavedRecords(JSON.parse(raw) as SavedDemoRecord[]);
      } catch {
        setSavedRecords([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      .filter((item) => item.testMode !== "passive" || canAssessPassive)
      .sort((a, b) => motionPriority(b.id) - motionPriority(a.id))
      .map((item) => {
      const comparison = motionComparisonMode(region.id, item.id);
      const copy = assessmentCopy(item.id, item.how, item.observe);
      const professionalCopy = professionalAssessmentCopy(item.id, item.how, item.observe);
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
    const rankedFunctionEntries = region.functions
      .filter((item) => functionIsRelevant(region.id, item.id, intake))
      .filter(() => !(region.id === "ankle-foot" && isAcuteTrauma(intake) && intake.goal <= 1))
      .filter((item) => !workflowProfile.isGuided || ["thigh-walk", "thigh-sit-stand", "thigh-jog", "calf-walk", "calf-heel-raise", "calf-jog", "knee-squat", "knee-step-up", "knee-step-down", "knee-single-leg", "knee-single-leg-squat", "knee-heel-raise", "ankle-weight-bearing", "ankle-squat", "ankle-single-leg", "ankle-heel-raise", "ankle-hop"].includes(item.id))
      .map((item, originalIndex) => {
        // 主诉动作相关性排序：用户说下楼/下蹲/跑步/走路时，对应功能项排前
        const tagText = item.title + " " + (item.tags ?? []).join(" ");
        let relevance = 0;
        const chiefSource = chiefActionSource(intake);
        if (includesAny(chiefSource, ["下楼", "下楼梯", "下台阶"]) && /下楼|下台阶|step-down|eccentric/.test(tagText)) relevance += 20;
        else if (includesAny(chiefSource, ["台阶"]) && /台阶|stairs/.test(tagText)) relevance += 10;
        if (includesAny(chiefSource, ["上楼", "上楼梯", "上台阶"]) && /上楼|上台阶|step-up/.test(tagText)) relevance += 20;
        if (includesAny(chiefSource, ["蹲", "起身", "坐站"]) && /蹲|squat|sit-to-stand/.test(tagText)) relevance += 10;
        if (includesAny(chiefSource, ["跑", "跑步"]) && /跑步|跑|jump|run|单腿/.test(tagText)) relevance += 10;
        if (includesAny(chiefSource, ["走路", "步行", "走"]) && /走路|步行|gait|walk/.test(tagText)) relevance += 8;
        if (includesAny(chiefSource, ["单腿", "单脚"]) && /单腿|单脚|single-leg|balance/.test(tagText)) relevance += 8;
        return { item, relevance, originalIndex };
      })
      .sort((a, b) => b.relevance - a.relevance || a.originalIndex - b.originalIndex);
    const selectedFunctionEntries = (() => {
      if (!workflowProfile.isGuided) return rankedFunctionEntries.slice(0, intake.goal >= 4 ? 3 : 2);
      const chiefMatch = rankedFunctionEntries.find((entry) => entry.relevance > 0);
      if (chiefMatch) return [chiefMatch];
      const progressionIds = region.id === "thigh-local"
        ? ["thigh-walk", "thigh-sit-stand", "thigh-jog"]
        : region.id === "calf-local"
          ? ["calf-walk", "calf-heel-raise", "calf-jog"]
      : region.id === "knee"
        ? ["knee-squat", "knee-single-leg", "knee-single-leg-squat"]
        : region.id === "ankle-foot"
          ? ["ankle-weight-bearing", "ankle-squat", "ankle-single-leg"]
          : [];
      const progression = progressionIds
        .map((id) => rankedFunctionEntries.find((entry) => entry.item.id === id))
        .filter((entry): entry is (typeof rankedFunctionEntries)[number] => Boolean(entry));
      if (!progression.length) return rankedFunctionEntries.slice(0, 1);
      const visible = [progression[0]];
      const firstResult = functionSimpleAnswer(assessmentResults[`function:${progression[0].item.id}`] ?? {});
      if (firstResult === "normal" && progression[1]) visible.push(progression[1]);
      return visible;
    })();
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
    const structureConfirmedByImaging = imaging.some((entry) => ["有骨折或骨裂异常", "韧带损伤或撕裂", "肌腱损伤或撕裂"].includes(entry));
    const specialCategoryFor = (id: string): AssessmentItem["specialCategory"] => {
      if (/bone|tendon|achilles|risk|continuity|fracture/i.test(id)) return "safety";
      if (/palp|joint-line|tender|patella-pressure/i.test(id)) return "localization";
      if (/assist|response|support|adjust|fibula/i.test(id)) return "response";
      return "professional-special";
    };
    const structureOnlySpecial = (id: string) => /bone|tendon|achilles|continuity|fracture/i.test(id);
    const specialItems: AssessmentItem[] = region.specialTests
      .filter((item) => item.id !== "ankle-bone-weight-screen" && allowedSpecialAccess.includes(item.access) && specialIsRelevant(item.trigger, intake))
      // 影像已经明确结构时，不再重复做只用于确认同一结构的刺激性专项测试；
      // 活动度、力量和功能表现仍然保留。
      .filter((item) => !structureConfirmedByImaging || !structureOnlySpecial(item.id))
      .slice(0, 2)
      .map((item) => {
        const copy = assessmentCopy(item.id, item.how, item.observe);
        const professionalCopy = professionalAssessmentCopy(item.id, item.how, item.observe);
        return { id: `special:${item.id}`, kind: "special", title: intake.side === "双侧/中间" ? bilateralAssessmentCopy(assessmentTitle(item.id, item.title)) : assessmentTitle(item.id, item.title), how: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.how) : copy.how, observe: intake.side === "双侧/中间" ? bilateralAssessmentCopy(copy.observe) : copy.observe, professionalHow: professionalCopy.how, professionalObserve: professionalCopy.observe, explain: item.explain, next: item.caution, tags: item.tags, specialCategory: specialCategoryFor(item.id) };
      });
    const forceProvoked = intake.provocationTypes.includes("用力或对抗阻力") || includesAny(intake.description, ["发力", "用力", "使劲", "抗阻", "一撑"]);
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
      return pair && pairIsClinicallySelected ? {
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
    const chiefFunctionId = chiefFunctionAssessmentId(intake, region.id);
    const rankAndLimit = (items: AssessmentItem[]) => {
      const chiefFunctionSource = chiefFunctionId
        ? region.functions.find((item) => `function:${item.id}` === chiefFunctionId)
        : undefined;
      const chiefFunctionFallback = chiefFunctionSource ? makeFunctionAssessment(chiefFunctionSource) : undefined;
      const availableItems = chiefFunctionFallback && !items.some((item) => item.id === chiefFunctionFallback.id)
        ? [chiefFunctionFallback, ...items]
        : items;
      const byId = new Map(availableItems.map((item) => [item.id, item]));
      const ranked = rankPilotAssessmentIds(pilotInput, availableItems.map((item) => item.id))
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
      const chiefFunction = chiefFunctionId ? byId.get(chiefFunctionId) : undefined;
      if (!chiefFunction) return rankedWithPatella;
      const ordered = [chiefFunction, ...rankedWithPatella.filter((item) => item.id !== chiefFunction.id)];
      // 保持原有预算，但不截断已经打开的髌骨四方向组。
      const limit = rankedHasPatella ? Math.max(ranked.length, ordered.length) : ranked.length;
      return ordered.slice(0, limit);
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
      return rankAndLimit([...combinedMotionItems, ...special, ...selectedStrengths.filter((item) => !pairedStrengthIds.has(item.id.replace(/^strength:/, ""))), ...functionItems]);
    }
    // 先把所有与当前区域相关的候选交给规则库排序，再由角色预算截取。
    // 不能在排序前按原始数组位置截断，否则病例规则点名的鹅足、腓骨肌等检查会被通用项目挤掉。
    const order = forceProvoked || intake.symptoms.includes("力量不足") || includesAny(intake.symptomType, ["无力", "不稳"])
      ? [...interleaved, ...functionItems, ...specialItems]
      : includesAny(intake.symptomType, ["刺", "胀"])
        ? [...combinedMotionItems, ...specialItems, ...functionItems, ...standaloneStrengthItems]
        : [...interleaved, ...specialItems, ...functionItems];
    return rankAndLimit(order);
  }, [region, intake, assessmentResults, confirmedIntakeMulti, canRunSpecialTest, canAssessPassive, workflowProfile.isGuided, workflowProfile.operationTarget, imaging]);

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
          canAssessPassive,
          intake.side === "双侧/中间",
          !hasClearChiefAction(intake),
          canAssessEndFeel,
        );
      });
    }
    return assessmentRecordComplete(
      item,
      effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? ""),
      canAssessPassive,
      intake.side === "双侧/中间",
      !hasClearChiefAction(intake),
      canAssessEndFeel,
    );
  };

  useEffect(() => {
    const focusId = assessmentFocusIdRef.current;
    if (!focusId) return;
    const nextIndex = displayAssessmentIndexForId(focusId);
    assessmentFocusIdRef.current = "";
    if (nextIndex >= 0) setAssessmentIndex(nextIndex);
  }, [assessments, displayAssessmentIndexForId]);

  const findings = useMemo<Finding[]>(() => {
    if (!region || !intake.parsed) return [];
    const items: Finding[] = [{
      id: "chief",
      title: chiefComplaintLabel(intake),
      detail: [intake.side, intake.location, intake.symptomType, intake.actionAnalysis?.load].filter(Boolean).join(" · "),
      priority: "chief",
      score: hasClearChiefAction(intake) && intake.baselineScoreConfirmed ? intake.baselineScore : undefined,
      tags: [intake.location, intake.symptomType, ...intake.provocationTypes, intake.forceDirection, intake.actionAnalysis?.category, intake.actionAnalysis?.function, intake.actionAnalysis?.direction, ...(intake.stabbingPalpation === "sharp" ? ["tender:sharp"] : [])].filter(Boolean) as string[],
    }];
    assessments.forEach((item) => {
      const rawResult = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region.id);
      if (!rawResult || !assessmentRecordComplete(item, rawResult, canAssessPassive, intake.side === "双侧/中间", !hasClearChiefAction(intake), canAssessEndFeel)) return;
      const result = item.kind === "motion" ? {
        ...rawResult,
        tensionChecked: Boolean(rawResult.tensionChecked || assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionChecked),
        tensionLocations: sharedTensionLocationsForMotion(item.id, rawResult, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]),
      } : rawResult;
      if (item.kind === "motion" && item.testMode === "passive" && result.passive && result.passive !== "skip") {
        const passiveLimited = result.passive !== "same";
        const passivePainful = result.passiveDiscomfort === "yes";
        if (passiveLimited) items.push({
          id: item.id,
          title: `${item.title}${passivePainful ? "范围受限并诱发症状" : "被动活动范围受限"}`,
          detail: [result.passive === "limited" ? "被动活动小于对侧" : result.passive === "excessive" ? "被动活动大于对侧" : "被动活动差异待确认", result.passiveEndFeel ? `终末感：${passiveEndFeelLabel(result.passiveEndFeel)}` : "", typeof result.passiveSymptomScore === "number" ? `不适 ${result.passiveSymptomScore}/10` : ""].filter(Boolean).join("，"),
          priority: "support",
          score: result.passiveSymptomScore,
          tags: [...(item.tags ?? []), "passive", ...discomfortDecisionTags(result.passiveDiscomfortType)],
          note: item.explain,
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
            : result.passive === "limited"
              ? `主动和被动都小于${target}`
              : result.passive === "skip"
                ? `主动小于${target}，本次未完成被动检查`
                : canAssessPassive
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
            side: result.active === "left-limited" ? "左侧" : result.active === "right-limited" ? "右侧" : result.active === "both-limited" ? "两侧接近" : undefined,
          });
          if (isFamiliarDiscomfort) items.push({
            id: `symptom:${item.id}`,
            title: `${item.title}会引起熟悉的不适`,
            detail: [result.discomfortLocation, result.discomfortType, typeof result.symptomScore === "number" ? `${result.symptomScore}/10` : ""].filter(Boolean).join(" · "),
            priority: "support",
            score: result.symptomScore,
            tags: [...(item.tags ?? []), ...discomfortDecisionTags(result.discomfortType)],
            note: item.explain,
            side: result.active === "left-limited" ? "左侧" : result.active === "right-limited" ? "右侧" : result.active === "both-limited" ? "两侧接近" : undefined,
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
        const confirmedTension = sharedTensionLocationsForMotion(item.id, result, assessmentResults[SHARED_TENSION_ASSESSMENT_ID])
          .filter((location) => !["没有明显差别", "两侧感觉接近"].includes(location));
        const tensionFindings = buildMuscleTensionFindings({ assessmentId: item.id, assessmentTitle: professionalAssessmentTitle(item.id, item.title), locations: confirmedTension });
        for (const tensionFinding of tensionFindings) {
          if (!items.some((finding) => finding.id === tensionFinding.id)) items.push({
            ...tensionFinding,
            priority: "support",
            tags: [...(item.tags ?? []), `tension:${tensionFinding.location}`],
            side: result.active === "left-limited" ? "左侧" : result.active === "right-limited" ? "右侧" : result.active === "both-limited" ? "两侧接近" : undefined,
          });
        }
        if (item.pairedStrengthId && ["weak", "painful"].includes(result.pairedStrength ?? "")) {
          const professionalStrength = canAssessResistance;
          const selfKneeExtensionControl = item.id === "motion:knee-extension" && !professionalStrength;
          items.push({
            id: item.pairedStrengthId,
            title: result.pairedStrength === "weak"
              ? selfKneeExtensionControl ? "膝盖绷直后保持能力不足" : `${item.pairedStrengthTitle ?? item.title}：${professionalStrength ? "抗阻力量偏弱" : "主动保持较差"}`
              : `${item.pairedStrengthTitle ?? item.title}：${professionalStrength ? "抗阻时会引起不适" : "保持时会引起不适"}`,
            detail: result.pairedStrength === "weak"
              ? professionalStrength ? "检查者施加轻度抗阻时，这侧力量小于另一侧" : selfKneeExtensionControl ? "抬起整条腿后，膝盖会弯、明显抖动或很快落下" : "两侧主动保持时，这侧更容易掉下、抖动或提前结束"
              : [result.discomfortLocation, result.discomfortType, typeof result.symptomScore === "number" ? `${result.symptomScore}/10` : ""].filter(Boolean).join(" · ") || (professionalStrength ? "抗阻时出现不适" : "主动保持时出现不适"),
            priority: "support",
            score: result.symptomScore,
            tags: [
              ...(item.pairedStrengthTags ?? []),
              ...discomfortDecisionTags(result.discomfortType),
            ],
            note: item.explain,
            side: result.active === "left-limited" ? "左侧" : result.active === "right-limited" ? "右侧" : result.active === "both-limited" ? "两侧接近" : undefined,
            internal: true,
            relatedMotionId: item.id,
          });
        }
        return;
      }
      if (item.kind === "strength" && ["weak", "painful"].includes(result.simple ?? "")) {
        const isMidlineStrength = item.comparison === "midline";
        const bilateralSide = intake.side === "双侧/中间" && result.worseSide ? `${result.worseSide}：` : "";
        const strengthSymptomDetail = [result.discomfortLocation, result.discomfortType].filter(Boolean).join(" · ");
        const isFamiliarStrengthSymptom = result.simple !== "painful" || hasClearChiefAction(intake) || result.familiarSymptom === "yes";
        items.push({
          id: isFamiliarStrengthSymptom ? item.id : `track:${item.id}`,
          title: result.simple === "weak" ? `${bilateralSide}${item.title}：${isMidlineStrength ? "控制或耐力不足" : intake.side === "双侧/中间" ? "力量偏弱" : "患侧力量偏弱"}` : `${bilateralSide}${item.title}：发力会引起症状`,
          detail: result.simple === "weak"
            ? isMidlineStrength ? "完成质量、保持能力或动作控制不足" : intake.side === "双侧/中间" ? `${result.worseSide ?? "更差侧"}力量或耐力较差` : "患侧力量明显小于健侧"
            : `发力时${strengthSymptomDetail ? ` ${strengthSymptomDetail}` : "出现不适"}，${result.symptomScore ?? intake.baselineScore}/10`,
          priority: isFamiliarStrengthSymptom ? "support" : "track",
          score: result.symptomScore,
          tags: [...(item.tags ?? []), result.discomfortLocation, result.discomfortType, ...discomfortDecisionTags(result.discomfortType)].filter(Boolean) as string[],
          note: item.explain,
          side: result.worseSide,
        });
      } else if (item.kind === "strength" && result.simple === "skip") {
        items.push({ id: `track:${item.id}`, title: `${item.title}暂时没判断清楚`, detail: "本次不据此安排处理", priority: "track", tags: item.tags ?? [] });
      }
      const functionalResult = item.kind === "function" ? functionSimpleAnswer(result) : undefined;
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
        const sideText = intake.side === "双侧/中间" && result.worseSide ? `${result.worseSide}：` : "";
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
        items.push({ id: familiarFunctionSymptom ? item.id : `track:${item.id}`, title: `${sideText}${title}`, detail: `${details}${stageText}`, priority: familiarFunctionSymptom ? "support" : "track", score: result.symptomScore, tags: [...(item.tags ?? []), ...compensationTags, ...discomfortDecisionTags(result.discomfortType), ...(result.symptomStage ? [`stage:${result.symptomStage}`] : []), ...(["unable", "weak"].includes(functionalResult ?? "") ? ["unable", "regression"] : [])], note: item.explain, side: result.worseSide });
      } else if (item.kind === "function" && (functionalResult === "skip" || functionControlValue(result) === "unsure")) {
        items.push({ id: `track:${item.id}`, title: `${item.title}暂时没判断清楚`, detail: "本次不据此安排处理", priority: "track", tags: item.tags ?? [] });
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
      motionFinding.tags = Array.from(new Set([...motionFinding.tags, ...(item.pairedStrengthTags ?? []), ...discomfortDecisionTags(result.discomfortType)]));
    });
    if (intake.symptoms.includes("肿胀或淤青")) items.push({ id: "track:swelling", title: `肿胀：${intake.swellingLocation || "位置待补充"}`, detail: "稍后和下次比较这一部位的范围与轮廓，不要求当场消失", priority: "track", tags: ["肿胀"] });
    if (intake.symptoms.includes("按压痛") || intake.provocationTypes.includes("按压")) items.push({ id: "track:tender", title: `按压痛：${intake.tendernessLocation || "位置待补充"}`, detail: "不反复重压，下一次在同一位置轻柔比较", priority: "track", tags: ["压痛"] });
    if (intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化")) items.push({ id: "track:sensory", title: `麻或电感：${intake.sensoryLocation || "范围待补充"}`, detail: "后续比较分布范围和肌力变化", priority: "track", tags: ["neural", "sensory"] });
    // 一个肌群可能同时影响多个方向，但处理时只应作为一个处理单元出现。
    // 将同一肌群在不同动作下产生的张力记录合并，动作方向保留在详情里供复盘参考。
    const tensionIndex = new Map<string, Finding>();
    const displayItems = items.filter((finding) => {
      if (!finding.id.startsWith("tension:")) return true;
      const muscleLabel = finding.title.replace(/肌张力增高$/, "").trim();
      const normalizedRegion = normalizePilotMuscleRegion(`${muscleLabel} ${finding.detail ?? ""}`);
      const tensionKey = normalizedRegion?.id ?? muscleLabel;
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
  }, [region, intake, assessments, assessmentResults, canAssessPassive, canAssessResistance, canAssessEndFeel]);

  const kneeWorkflowAssessments = useMemo(() => {
    if (region?.id !== "knee") return [];
    return assessments.flatMap((item) => {
      const record = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region.id);
      if (!record) return [];
      const workflowItems = [{
        id: item.id,
        kind: item.kind,
        title: item.title,
        active: record.active,
        passive: record.passive,
        simple: item.kind === "function" ? functionSimpleAnswer(record) : item.kind === "strength" ? strengthAnswerForWorkflow(record.simple, record.strengthUnableReason) : record.simple,
        discomfort: item.kind === "function" ? functionDiscomfortValue(record) : record.discomfort,
        discomfortType: record.discomfortType,
        symptomScore: record.symptomScore,
        passiveEndFeel: item.kind === "motion" ? record.passiveEndFeel : undefined,
        passiveDiscomfort: item.kind === "motion" ? record.passiveDiscomfort : undefined,
        passiveSymptomScore: item.kind === "motion" ? record.passiveSymptomScore : undefined,
        tensionLocations: item.kind === "motion" ? sharedTensionLocationsForMotion(item.id, record, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]) : record.tensionLocations,
        tensionChecked: item.kind === "motion" ? Boolean(record.tensionChecked || assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionChecked) : record.tensionChecked,
        discomfortLocations: (record.discomfortLocations ?? []).map((location) => location.location),
        control: item.kind === "function" ? functionControlValue(record) : undefined,
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
        // 活动度和力量使用同一个动作，也共用同一份不适记录。
        discomfortType: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? record.discomfortType : undefined,
        symptomScore: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? record.symptomScore : undefined,
        tensionLocations: undefined,
        tensionChecked: undefined,
        discomfortLocations: strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? (record.discomfortLocations ?? []).map((location) => location.location) : [],
        control: undefined,
      });
      return workflowItems;
    });
  }, [region, assessments, assessmentResults, intake]);

  const kneeDecision = useMemo(() => {
    if (region?.id !== "knee") return null;
    const decisionInput = kneeDecisionInputFromWorkflow({
      role: intake.userRole,
      side: intake.side,
      location: intake.location,
      symptomType: intake.symptomType,
      action: chiefActionSource(intake),
      baselineScore: intake.baselineScoreConfirmed ? intake.baselineScore : undefined,
      symptoms: intake.symptoms,
      swellingLocation: intake.swellingLocation,
      tendernessLocation: intake.tendernessLocation,
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
  }, [region, kneeWorkflowAssessments, intake, trialRecords]);

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
      role: intake.userRole,
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
  }, [region, followupMode, followupTrialRecords, sessionNumber, intake, followupScoreConfirmed, followupScore, finalRetestConfirmed, finalRetestScore, treatmentFinalRetestConfirmed, treatmentFinalRetestScore, kneeWorkflowAssessments, followupTrends, previousSessionForReview, previousSessionScore]);

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
  }, [region?.id, kneeDecision?.currentTreatment?.id]);

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
          ? finding.title || `${assessmentTitleByDirection(directionId) || "相关肌群"}肌张力增高`
          : assessmentTitleByDirection(directionId) ?? professionalFindingLabel(finding),
        status: finding.id.startsWith("tension:") ? "双侧触诊比较异常" : finding.id.startsWith("motion:") ? finding.title.includes("引起症状") ? "AROM受限 · 伴不适" : "AROM受限" : finding.id.startsWith("control:") ? "活动控制异常" : "活动诱发症状",
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
    const actionSource = `${chiefActionSource(intake)} ${intake.provocationTypes.join(" ")} ${intake.mechanism}`;
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
  }, [region, intake]);

  const pilotDecisionInput = useMemo(
    () => pilotInputFromIntake(intake, confirmedIntakeMulti),
    [intake, confirmedIntakeMulti],
  );
  const matchedPilotRelations = useMemo(
    () => matchPilotRelations(pilotDecisionInput),
    [pilotDecisionInput],
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
      const controlIssue = item.kind === "function" && functionControlValue(record) === "compensated";
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
  const pilotTrainingIds = useMemo(() => new Set([
    ...matchedPilotRelations.flatMap(({ relation }) => relation.trainingIds),
    ...[...pilotRelationsByAssessmentId.values()].flatMap((entries) => entries.flatMap(({ relation }) => relation.trainingIds)),
  ]), [matchedPilotRelations, pilotRelationsByAssessmentId]);

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
      provocationTypes: intake.provocationTypes,
      goal: intake.goal,
      sessionNumber,
      findings: localFindings,
      treatmentHistory,
      hasNewSymptom: hasNewSymptom === "yes",
    });
  }, [region, intake, pilotFindingInputs, trialRecords, followupTrialRecords, sessionNumber, hasNewSymptom, followupTrends, previousSessionForReview, assessments, assessmentResults]);

  const tissuePathway = useMemo(() => buildTissuePathway({
    regionId: intake.regionId,
    location: intake.location,
    onset: intake.onset,
    mechanism: intake.mechanism,
    symptomType: intake.symptomType,
    symptoms: intake.symptoms,
    provocationTypes: intake.provocationTypes,
    description: intake.description,
  }), [intake]);
  const pilotTreatmentUnits = useMemo(
    () => buildPilotTreatmentUnits(pilotDecisionInput, pilotFindingInputs),
    [pilotDecisionInput, pilotFindingInputs],
  );

  const swellingGuidance = useMemo(() => {
    if (!region || !intake.symptoms.includes("肿胀或淤青")) return undefined;
    return [...matchedCandidateGroups.flatMap((group) => group.candidates), ...region.candidateGroups.flatMap((group) => group.candidates)]
      .find((candidate) => candidate.type === "swelling" && candidateIsAvailable(candidate, intake.userRole));
  }, [region, intake, matchedCandidateGroups]);

  const baseTrialTargets = useMemo<TrialTarget[]>(() => {
    if (!region || !findings.length) return [];
    const conservativeSharpPath = intake.stabbingPalpation === "sharp" || findings.some((finding) => finding.tags.includes("assessment-sharp"));
    const abnormalPilotMotionIds = findings
      .filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"))
      .map(motionIdFromFinding)
      .filter((directionId) => Boolean(pilotMotionKnowledge(directionId)));
    const sourceCandidatePool = [...(region.mobilityInterventions ?? []), ...region.candidateGroups.flatMap((group) => group.candidates)];
    const completedMuscleTrialDirections = new Set(trialRecords.flatMap((record) => {
      if (record.reviewOnly || record.retestOnly) return [];
      const sourceCandidate = sourceCandidatePool.find((candidate) => candidate.id === record.candidateId)
        ?? sourceCandidatePool.find((candidate) => pilotTreatmentMatchesCandidate(record.candidateId, candidate.id));
      if (sourceCandidate?.type !== "muscle" && !record.candidateId.startsWith("tension-muscle:")) return [];
      return [
        ...Object.keys(record.rangeOutcomes ?? {}),
        ...(record.targetId.startsWith("target:motion:") ? [record.targetId.replace("target:motion:", "")] : []),
        ...(sourceCandidate ? candidatePilotMotionIds(sourceCandidate) : []),
      ];
    }));
    const relatedMuscleTrialCompleted = (unit: (typeof pilotTreatmentUnits)[number]) => {
      const directionIds = unit.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""));
      return directionIds.some((directionId) => [...completedMuscleTrialDirections].some((completedId) => samePhysicalAction(completedId, directionId)));
    };
    // 髌腱/髌骨下方主诉如果同时出现在下蹲、台阶等负荷动作中，仍然要先
    // 走膝关节已经确认的高相关肌肉反应实验。肌腱负荷路径负责限制负荷
    // 和安排训练，不应把普通用户的首轮股直肌/股四头肌处理整个过滤掉。
    const allowKneeTendonMusclePath = region.id === "knee" && tissuePathway.id === "tendon-load";
    const allCandidates = sourceCandidatePool
      .map((candidate) => {
        const sourceUnits = pilotTreatmentUnits.filter((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id));
        if (!sourceUnits.length) return candidate;
        return {
          ...candidate,
          retestIds: Array.from(new Set([
            ...(candidate.retestIds ?? []),
            ...sourceUnits.flatMap((unit) => unit.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""))),
          ])),
        };
      })
      .map((candidate) => {
        const currentUnit = region.id === "knee" ? kneeDecision?.currentTreatment : undefined;
        const mappedIds = kneeLegacyCandidateIdsForUnit(currentUnit?.id);
        if (!currentUnit || !mappedIds.includes(candidate.id)) return candidate;
        return {
          ...candidate,
          id: currentUnit.id,
          tags: [...candidate.tags, `knee-core:${currentUnit.id}`, `legacy-candidate:${candidate.id}`],
          retestIds: Array.from(new Set([
            ...(candidate.retestIds ?? []),
            ...currentUnit.relatedActionIds.filter((actionId) => ["knee-extension", "knee-flexion"].includes(actionId)),
          ])),
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
      .filter((candidate) => candidateIsAvailable(candidate, intake.userRole))
      .filter((candidate) => !pilotTreatmentUnits.some((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id)
        && unit.requiresProfessional && intake.userRole !== "rehab"))
      .filter((candidate) => !pilotTreatmentUnits.some((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id)
        && unit.requiresPriorMuscleTrial && !relatedMuscleTrialCompleted(unit)))
      .filter((candidate) => tissuePathway.id !== "bone-stress-suspected" || candidate.type !== "muscle")
      .filter((candidate) => tissuePathway.id !== "tendon-load"
        || candidate.type === "swelling"
        || (allowKneeTendonMusclePath && ["muscle", "joint"].includes(candidate.type)))
      .filter((candidate) => tissuePathway.id !== "muscle-contusion" || candidate.type !== "muscle")
      .filter((candidate) => !localLimbDecision || localLimbDecision.treatmentIds.includes(candidate.id))
      .filter((candidate) => canMobilizeJoint || (candidate.type !== "joint" && candidate.type !== "neural"))
      .filter((candidate) => !(["thigh-local", "calf-local"].includes(region.id) && isAcuteTrauma(intake) && candidate.type === "muscle"))
      .filter((candidate) => candidateAllowedInSharpPath(candidate, conservativeSharpPath))
      .filter((candidate) => region.id !== "knee" || kneeCandidateBelongsToCurrentDecision(candidate.id, kneeDecision))
      .filter((candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index);

    // 大腿/小腿局部模块使用独立决策结果，不再继续进入膝踝通用的
    // “按每个异常 finding 扩展候选”流程。这样一个局部只生成一次处理，
    // 急性拉伤和单纯无力也不会被通用规则重新塞入肌肉松解。
    if (localLimbDecision) {
      const completedLocalCandidateIds = new Set(trialRecords
        .filter((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased)
        .map((record) => record.candidateId));
      const localCandidates = allCandidates
        .filter((candidate) => candidate.type === "muscle" && localLimbDecision.treatmentIds.includes(candidate.id))
        // 本次已完成的局部来源从动态队列移除；若它的反应只解决一部分，
        // 新开放的下一来源会占据原位置继续验证。历史康复记录不在这里移除。
        .filter((candidate) => !completedLocalCandidateIds.has(candidate.id))
        .map((candidate) => {
          const ownActionIds = new Set((candidate.retestIds ?? []).map(canonicalActionIdFromAssessmentId));
          const relevantRetestIds = localLimbDecision.retestIds.filter((id) => ownActionIds.has(canonicalActionIdFromAssessmentId(id)));
          return { ...candidate, retestIds: dedupeAssessmentIdsByAction(relevantRetestIds) };
        });
      const localTargets: TrialTarget[] = [];
      if (swellingGuidance) {
        const swellingFinding = findings.find((finding) => finding.id === "track:swelling");
        if (swellingFinding) localTargets.push({ id: "target:swelling", finding: swellingFinding, candidates: [swellingGuidance], chain: "肿胀管理" });
      }
      if (localCandidates.length) {
        const retestActionIds = new Set(localCandidates.flatMap((candidate) => candidate.retestIds ?? []).map(canonicalActionIdFromAssessmentId));
        const retestFindings = dedupeRetestFindingsByAction(findings.filter((finding) => finding.id.startsWith("motion:") && retestActionIds.has(actionIdFromFinding(finding))));
        localTargets.push({
          id: "target:local-limb",
          finding: retestFindings[0] ?? findings[0],
          retestFindings,
          candidates: localCandidates,
          chain: "局部症状",
          retestLabel: chiefActionLabel(intake),
        });
      }
      // 局部大腿/小腿路径也必须承接专业被动活动结果。此前这里早早
      // return 了局部肌肉目标，导致 PROM 明确受限时永远没有后续关节
      // 处理，即使使用者已经勾选“被动活动度”和“关节处理”。
      const locallyLimitedPassiveFindings = canAssessPassive
        ? dedupeRetestFindingsByAction(findings.filter((finding) => {
          if (!finding.id.startsWith("motion:")) return false;
          const record = assessmentResults[finding.id];
          return record?.passive === "limited";
        }))
        : [];
      if (canMobilizeJoint && locallyLimitedPassiveFindings.length) {
        const locallyLimitedDirections = locallyLimitedPassiveFindings.map(motionIdFromFinding);
        const localJointCandidates = allCandidates
          .filter((candidate) => candidate.type === "joint")
          .filter((candidate) => (candidate.retestIds ?? []).some((candidateDirection) => locallyLimitedDirections.some((directionId) => samePhysicalAction(candidateDirection, directionId))));
        const fallbackJointCandidates = locallyLimitedDirections
          .filter((directionId) => !localJointCandidates.some((candidate) => (candidate.retestIds ?? []).some((candidateDirection) => samePhysicalAction(candidateDirection, directionId))))
          .map((directionId) => ({
            id: `joint-mobilization:${directionId}`,
            title: `${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}关节松动`,
            type: "joint" as const,
            access: "therapist" as const,
            do: `由专业人员根据${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}的受限方向完成低刺激关节松动。`,
            observe: "只记录活动范围和原动作反应；出现锐痛、硬性阻挡或症状加重时停止。",
            retest: `先复测${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}，再复测原来的不适动作。`,
            tags: ["local-limb", "joint-mobility", "professional-fallback"],
            retestIds: [directionId],
          } satisfies FullCandidate));
        const jointCandidates = [...localJointCandidates, ...fallbackJointCandidates]
          .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
        if (jointCandidates.length) localTargets.push({
          id: "target:local-limb-joint",
          finding: locallyLimitedPassiveFindings[0],
          retestFindings: locallyLimitedPassiveFindings,
          candidates: jointCandidates,
          chain: "关节处理",
          retestLabel: locallyLimitedPassiveFindings.map((finding) => finding.title).join("、"),
        });
      }
      return localTargets;
    }
    // 非标准组织路径不进入通用的“没有候选就补温和活动”兜底。
    // 否则疑似骨应力或肌腱负荷即使已过滤普通候选，仍会被重新生成
    // 即时处理并要求当场复测。只有用户确实记录了肿胀时保留一次管理。
    if (tissuePathway.id !== "standard" && !allowKneeTendonMusclePath) {
      const swellingFinding = findings.find((finding) => finding.id === "track:swelling");
      return swellingGuidance && swellingFinding
        ? [{ id: "target:swelling", finding: swellingFinding, candidates: [swellingGuidance], chain: "肿胀管理" }]
        : [];
    }
    const pilotSourceCaseIds = Array.from(new Set(matchedPilotRelations.flatMap(({ relation }) => relation.sourceCases)));
    const relationsForFinding = (finding: Finding) => {
      const assessmentId = finding.id.replace(/^symptom:|^control:/, "");
      return pilotRelationsByAssessmentId.get(assessmentId) ?? matchedPilotRelations;
    };
    const sourceCaseIdsForFinding = (finding: Finding) => Array.from(new Set(relationsForFinding(finding).flatMap(({ relation }) => relation.sourceCases)));
    const pilotCandidateScore = (candidate: FullCandidate, relationEntries = matchedPilotRelations) => {
      const identity = `${candidate.id} ${candidate.title} ${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.actionLabel ?? ""} ${candidate.tags.join(" ")}`;
      const currentKneeCandidateIds = kneeDecision?.currentTreatment
        ? [kneeDecision.currentTreatment.id, ...(KNEE_CORE_CANDIDATE_IDS[kneeDecision.currentTreatment.id] ?? [])]
        : [];
      const availableKneeCandidateIds = kneeDecision
        ? new Set(kneeDecision.treatmentUnits.flatMap((unit) => KNEE_CORE_CANDIDATE_IDS[unit.id] ?? []))
        : new Set<string>();
      const kneeCoreScore = region.id === "knee"
        ? currentKneeCandidateIds.includes(candidate.id) ? 5000 : availableKneeCandidateIds.has(candidate.id) ? 1200 : 0
        : 0;
      const supportedFindingScore = pilotTreatmentUnits.reduce((total, hint) => {
        const exactSourceMatch = pilotTreatmentMatchesCandidate(hint.id, candidate.id);
        const sameKind = hint.kind === candidate.type || hint.kind === "symptom-management" && candidate.type === "swelling";
        const hintRetestIds = hint.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""));
        const sameRetest = (candidate.retestIds ?? []).some((id) => hintRetestIds.some((hintId) => samePhysicalAction(id, hintId)));
        const siteTokens = hint.site.split(/[、，与和/\s]+/).filter((token) => token.length >= 2);
        const siteMatch = siteTokens.some((token) => identity.includes(token));
        return total + (exactSourceMatch ? 600 : sameKind && sameRetest && siteMatch ? 180 : sameKind && sameRetest ? 120 : 0);
      }, 0);
      const relationScore = relationEntries.reduce((total, { relation, score }) => total + relation.treatmentCandidates.reduce((candidateTotal, hint) => {
        const exactSourceMatch = pilotTreatmentMatchesCandidate(hint.id, candidate.id);
        const sameKind = hint.kind === candidate.type || hint.kind === "symptom-management" && candidate.type === "swelling";
        const hintRetestIds = hint.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""));
        const sameRetest = (candidate.retestIds ?? []).some((id) => hintRetestIds.some((hintId) => samePhysicalAction(id, hintId)));
        const siteTokens = hint.site.split(/[、，与和/\s]+/).filter((token) => token.length >= 2);
        const siteMatch = siteTokens.some((token) => identity.includes(token));
        return candidateTotal + (exactSourceMatch ? score * 30 : sameKind && sameRetest ? score * 12 : sameKind && siteMatch ? score * 8 : sameRetest ? score * 4 : 0);
      }, 0), 0);
      return kneeCoreScore + supportedFindingScore + relationScore;
    };
    const supportTags = new Set(findings.filter((finding) => finding.priority === "support").flatMap((finding) => finding.tags));
    const matchedChiefCandidateIds = new Set(matchedCandidateGroups.flatMap((group) => group.candidates.map((candidate) => candidate.id)));
    const abnormalMotionFindings = findings.filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"));
    const abnormalMotionIds = abnormalMotionFindings.map(motionIdFromFinding);
    const selectedTensionLocations = [...new Set((assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionLocations ?? [])
      .filter((location) => !["没有明显差别", "两侧感觉接近"].includes(location)))];
    // 处理单位按区域建立，而不是按“区域 × 每个受限方向”建立。
    // 同一区域只出现一次，并只携带该区域直接影响的异常活动平面。
    const directTensionCandidates: FullCandidate[] = selectedTensionLocations.flatMap((location) => {
      const normalizedRegion = normalizePilotMuscleRegion(location);
      const relatedMotionIds = normalizedRegion
        ? abnormalMotionIds.filter((directionId) => primaryRetestMotionIdsForRegion(normalizedRegion.id).some((motionId) => samePhysicalAction(motionId, directionId)))
        : [];
      return relatedMotionIds.length ? [{
          id: `tension-muscle:${normalizedRegion?.id ?? location}`,
          title: `${location}轻柔松解`,
          type: "muscle",
          access: "self",
          do: `在${location}找到比另一侧更紧、更酸的区域，用手轻柔松解30～60秒。`,
          observe: "只做轻柔按压；出现明显刺痛、麻或电感就停止。",
          retest: "处理后只比较该区域直接影响的活动方向和原来的不适动作。",
          tags: [...new Set(relatedMotionIds.flatMap((directionId) => abnormalMotionFindings.find((finding) => samePhysicalAction(motionIdFromFinding(finding), directionId))?.tags ?? [])), `tension:${location}`],
          retestIds: relatedMotionIds,
          siteLabel: location,
          targetLabel: `${location}紧张区域`,
          actionLabel: "轻柔肌肉松解",
        } satisfies FullCandidate] : [];
      });
    const chiefCandidateScore = (candidate: FullCandidate) => candidateRelevance(candidate, intake, supportTags) + pilotCandidateScore(candidate) + (matchedChiefCandidateIds.has(candidate.id) ? 30 : 0) + (candidate.id.startsWith("tension-muscle:") ? 1000 : 0);
    const typeOrder: FullCandidate["type"][] = includesAny(intake.symptomType, ["麻", "电"])
      ? ["neural", "muscle", "control", "joint", "swelling"]
      : intake.provocationTypes.includes("用力或对抗阻力") || intake.symptoms.includes("力量不足") || includesAny(intake.symptomType, ["无力", "不稳"])
        ? ["muscle", "control", "joint", "neural", "swelling"]
        : includesAny(intake.symptomType, ["刺", "胀"])
          ? ["swelling", "muscle", "joint", "control", "neural"]
          : ["muscle", "control", "joint", "neural", "swelling"];
    const sourceBackedCandidates = allCandidates.filter((candidate) => pilotTreatmentUnits.some((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id)));
    const orderedChiefCandidates = [...directTensionCandidates, ...sourceBackedCandidates, ...matchedCandidateGroups.flatMap((group) => group.candidates), ...allCandidates.filter((candidate) => candidate.tags.some((tag) => supportTags.has(tag)))]
      .filter((candidate) => region.id !== "knee" || kneeCandidateAllowedInTreatmentQueue(candidate.id, kneeDecision))
      .filter((candidate) => candidateIsAvailable(candidate, intake.userRole))
      .filter((candidate) => canMobilizeJoint || (candidate.type !== "joint" && candidate.type !== "neural"))
      .filter((candidate) => candidateAllowedInSharpPath(candidate, conservativeSharpPath))
      // 现场处理只保留能立刻复测的松解、关节或专业神经处理；肿胀单独跟踪，控制训练放到训练阶段。
      .filter((candidate) => !["swelling", "control"].includes(candidate.type))
      .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index)
      .sort((a, b) => {
        const relevanceDifference = chiefCandidateScore(b) - chiefCandidateScore(a);
        return relevanceDifference || typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      });
    const chiefCandidates = orderedChiefCandidates.slice(0, 3);
    const chiefOptionalCandidates = orderedChiefCandidates.slice(3, 6);
    const chiefDirection = chiefMotionDirectionId(intake, region.id);
    const spinalRegion = ["neck", "thoracic-rib", "lumbar-pelvis"].includes(region.id);
    const motionFindings = findings
      .filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"))
      // 脊柱以症状动作和功能影响为处理入口；无不适的单纯角度差先记录，不自动追着角度处理。
      .filter((finding) => !spinalRegion
        || samePhysicalAction(motionIdFromFinding(finding), chiefDirection)
        || motionWasSymptomatic(motionIdFromFinding(finding), assessmentResults, chiefDirection));
    const painfulStrengthTargets = findings
      // 配对力量结果显示在活动度卡片里，finding 本身没有独立的
      // assessmentResults 键；不能因为查不到该键就把“发力会痛”丢掉。
      .filter((finding) => finding.id.startsWith("strength:") && strengthFindingAnswer(finding, assessmentResults) === "painful")
      // 配对力量已合并到同一个活动动作；独立力量检查仍保留单独处理入口。
      .filter((finding) => !finding.relatedMotionId)
      .filter((finding) => {
        const record = assessmentResults[finding.id];
        return record ? assessmentSymptomCanDriveRetest(record, intake) : true;
      })
      .map((finding): TrialTarget | null => {
        const direct = allCandidates
          .filter((candidate) => !["joint", "swelling", "control"].includes(candidate.type))
          .filter((candidate) => candidate.tags.some((tag) => finding.tags.includes(tag)))
          .sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
        const relationEntries = relationsForFinding(finding);
        const ordered = orderCandidatesByChain(direct
          .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index));
        ordered.sort((a, b) => pilotCandidateScore(b, relationEntries) - pilotCandidateScore(a, relationEntries));
        return ordered.length ? { id: `target:${finding.id}`, finding, candidates: ordered.slice(0, 3), optionalCandidates: ordered.slice(3), chain: directionChain(anyMotionIdFromFinding(finding) ?? finding.id.replace(/^strength:/, "")), retestLabel: assessments.find((item) => item.id === finding.id)?.title ?? finding.title.split("：")[0], sourceCaseIds: sourceCaseIdsForFinding(finding) } : null;
      })
      .filter((target): target is TrialTarget => Boolean(target));
    const painfulFunctionTargets = findings
      .filter((finding) => finding.id.startsWith("function:") && ["painful", "unable"].includes(assessmentResults[finding.id]?.simple ?? ""))
      .filter((finding) => assessmentSymptomCanDriveRetest(assessmentResults[finding.id], intake))
      .map((finding): TrialTarget | null => {
      const pool = allCandidates.filter((candidate) => candidate.tags.some((tag) => finding.tags.includes(tag)) && !["swelling", "control"].includes(candidate.type));
      const relationEntries = relationsForFinding(finding);
      const ordered = orderCandidatesByChain(pool).sort((a, b) => pilotCandidateScore(b, relationEntries) - pilotCandidateScore(a, relationEntries));
      return ordered.length ? { id: `target:${finding.id}`, finding, candidates: ordered.slice(0, 3), optionalCandidates: ordered.slice(3), chain: directionChain(anyMotionIdFromFinding(finding) ?? ""), retestLabel: assessments.find((item) => item.id === finding.id)?.title ?? finding.title.split(/因为|不稳定|会引起/)[0], sourceCaseIds: sourceCaseIdsForFinding(finding) } : null;
    }).filter((target): target is TrialTarget => Boolean(target));

    const painfulMotionOnlyTargets = findings
      .filter((finding) => finding.id.startsWith("symptom:motion:"))
      .filter((finding) => !findings.some((entry) => entry.id === finding.id.replace(/^symptom:/, "")))
      .filter((finding) => assessmentSymptomCanDriveRetest(assessmentResults[finding.id.replace(/^symptom:/, "")], intake))
      .map((finding): TrialTarget | null => {
        const assessmentId = finding.id.replace(/^symptom:/, "");
        const pool = allCandidates
          .filter((candidate) => !["swelling", "control"].includes(candidate.type))
          .filter((candidate) => candidate.tags.some((tag) => finding.tags.includes(tag)));
        const relationEntries = relationsForFinding(finding);
        const ordered = orderCandidatesByChain(pool)
          .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
        ordered.sort((a, b) => pilotCandidateScore(b, relationEntries) - pilotCandidateScore(a, relationEntries));
        return ordered.length ? {
          id: `target:${finding.id}`,
          finding,
          candidates: ordered.slice(0, 3),
          optionalCandidates: ordered.slice(3, 6),
          chain: directionChain(assessmentId.replace(/^motion:/, "")),
          retestLabel: assessments.find((item) => item.id === assessmentId)?.title ?? finding.title.split("会引起")[0],
          sourceCaseIds: sourceCaseIdsForFinding(finding),
        } : null;
      })
      .filter((target): target is TrialTarget => Boolean(target));

    const buildMotionTarget = (finding: Finding): TrialTarget | null => {
      const record = assessmentResults[finding.id];
      const directionId = motionIdFromFinding(finding);
      const selectedTension = sharedTensionLocationsForMotion(finding.id, record ?? {}, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]).filter((location) => location !== "没有明显差别");
      const patellaDirection = isPatellaDirectionId(`motion:${directionId}`);
      const directionCandidates = allCandidates
        .filter((candidate) => (candidate.retestIds ?? []).some((candidateDirection) => samePhysicalAction(candidateDirection, directionId)) || candidate.tags.some((tag) => finding.tags.includes(tag)))
        // 髌骨方向只使用明确的髌骨处理候选；不能把“膝关节伸直方向松动”
        // 这种泛化候选因为带有 patella 标签，误合并成髌骨处理单元。
        .filter((candidate) => !patellaDirection || isPatellaSpecificCandidate(candidate));
      const muscleCandidates = directionCandidates
        .filter((candidate) => candidate.type === "muscle")
        .filter((candidate) => !selectedTension.length || selectedTension.some((location) => candidateMatchesTensionLocation(candidate, location)));
      // 只看当前处理序列的最新被动结果。初始评估的 PROM 受限不能在
      // 肌肉处理后已经恢复时继续把通用关节候选抢到队列前面。
      const directionRetestRecords = trialRecords.filter((trial) =>
        !trial.reviewOnly && !trial.retestOnly
        && Object.keys(trial.rangeOutcomes ?? {}).some((id) => samePhysicalAction(id, directionId)));
      const latestDirectionOutcome = [...trialRecords].reverse()
        .flatMap((trial) => Object.entries(trial.rangeOutcomes ?? {}))
        .find(([id]) => samePhysicalAction(id, directionId))?.[1];
      const postTreatmentPassiveLimited = ["better-passive-limited", "passive-limited"].includes(latestDirectionOutcome ?? "");
      // 关节路径只由“被动活动仍小于对侧”触发。终末感继续记录用于
      // 选择更谨慎的手法和安全提示，但不再作为必须命中的硬门槛。
      const jointEvidence = canAssessPassive
        && (postTreatmentPassiveLimited || (!directionRetestRecords.length && record?.passive === "limited"));
      const declaredJointCandidates = jointEvidence
        ? directionCandidates.filter((candidate) => candidate.type === "joint")
        : [];
      // Keep a guaranteed professional exit for a confirmed PROM limitation.
      // Some older library entries describe a joint by structure tags only and
      // therefore do not match a direction-specific finding (notably ankle
      // eversion). The fallback is never available to self-guided users.
      const jointCandidates = jointEvidence && canMobilizeJoint && !declaredJointCandidates.length
        ? [{
          id: `joint-mobilization:${directionId}`,
          title: `${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}关节松动`,
          type: "joint" as const,
          access: "therapist" as const,
          do: `由专业人员根据${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}的受限方向完成低刺激关节松动。`,
          observe: "只记录活动范围和原动作反应；出现锐痛、硬性阻挡或症状加重时停止。",
          retest: `先复测${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}，再复测原来的不适动作。`,
          tags: [...finding.tags, "joint-mobility", "professional-fallback"],
          retestIds: [directionId],
        } satisfies FullCandidate]
        : declaredJointCandidates;
      const controlCandidates = directionCandidates.filter((candidate) => candidate.type === "control");
      let pool: FullCandidate[] = [];
      if (selectedTension.length) {
        const explicitTensionCandidates: FullCandidate[] = selectedTension.map((location) => {
          const normalizedRegion = normalizePilotMuscleRegion(location);
          const relatedMotionIds = normalizedRegion
            ? abnormalMotionIds.filter((motionId) => primaryRetestMotionIdsForRegion(normalizedRegion.id).some((primaryMotionId) => samePhysicalAction(primaryMotionId, motionId)))
            : [directionId];
          return ({
          id: `tension-muscle:${normalizedRegion?.id ?? location}`,
          title: `${location}轻柔松解`,
          type: "muscle",
          access: "self",
          do: `在${location}找到比另一侧更紧、更酸的区域，用手轻柔松解30～60秒。`,
          observe: "只做轻柔按压；出现明显刺痛、麻或电感就停止。",
          retest: `重新比较${assessmentTitle(directionId, finding.title)}的活动范围和不适。`,
          tags: [...finding.tags, `tension:${location}`],
          retestIds: relatedMotionIds.length ? relatedMotionIds : [directionId],
          siteLabel: location,
          targetLabel: `${location}紧张区域`,
          actionLabel: "轻柔肌肉松解",
        }); });
        pool = [...explicitTensionCandidates, ...muscleCandidates, ...jointCandidates, ...controlCandidates];
      }
      else {
        const localMuscleCheck = ["thigh-local", "calf-local"].includes(region.id) && !isAcuteTrauma(intake);
        pool = [...(localMuscleCheck ? muscleCandidates : []), ...controlCandidates, ...jointCandidates];
      }
      if (!pool.length) pool = [{
          id: `gentle-motion:${directionId}`,
          title: `${assessmentTitle(directionId, finding.title)}温和活动`,
          type: "control",
          access: "self",
          do: `在不明显增加不适的范围内，缓慢完成${assessmentTitle(directionId, finding.title)}5～8次。`,
          observe: "动作保持轻柔，不追求一次做到最大范围。",
          retest: `重新比较${assessmentTitle(directionId, finding.title)}的活动范围和不适。`,
          tags: [...finding.tags, "gentle-motion"],
          retestIds: [directionId],
          siteLabel: region.shortName,
          actionLabel: "温和活动",
        }];
      const relationEntries = relationsForFinding(finding);
      const ordered = pool
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index)
        .sort((a, b) => {
          const chainDifference = Number(candidateDirectionChain(a, directionChain(directionId)) !== directionChain(directionId)) - Number(candidateDirectionChain(b, directionChain(directionId)) !== directionChain(directionId));
          return chainDifference || (candidateRelevance(b, intake, new Set(finding.tags)) + pilotCandidateScore(b, relationEntries)) - (candidateRelevance(a, intake, new Set(finding.tags)) + pilotCandidateScore(a, relationEntries));
        });
      const selected = selectTreatmentChainCandidates(ordered).map((candidate) => ({
        ...candidate,
        // 该处理候选既然是为当前异常方向生成，就必须把当前方向保留
        // 到复测计划中。候选知识条目遗漏 retestIds 时也不能丢掉它。
        retestIds: Array.from(new Set([...(candidate.retestIds ?? []), directionId])),
      }));
      const selectedRetestIds = new Set(selected.flatMap((candidate) => candidate.retestIds ?? []));
      const retestFindings = motionFindings.filter((motionFinding) => [...selectedRetestIds].some((id) => samePhysicalAction(id, motionIdFromFinding(motionFinding))));
      return selected.length ? { id: `target:${finding.id}`, finding, retestFindings, candidates: selected, optionalCandidates: ordered.filter((candidate) => !selected.some((chosen) => candidateDedupKey(chosen) === candidateDedupKey(candidate))).slice(0, 3), chain: directionChain(directionId), retestLabel: assessments.find((item) => item.id === finding.id)?.title ?? finding.title.split(/范围偏小|会引起/)[0], sourceCaseIds: sourceCaseIdsForFinding(finding) } : null;
    };

    const patellaMotionFindings = motionFindings.filter((finding) => isPatellaDirectionId(`motion:${motionIdFromFinding(finding)}`));
    // 髌骨四方向是一个稳定处理单元：一张处理卡列出所有受限方向，一张复测卡
    // 统一记录；后台仍按方向保存，达到比较目标的方向由复测引擎退出后续队列。
    // 只有具备关节松动能力的专业操作才进入合并单元；不能松动时仍走原有
    // 按方向生成候选的路径，保留“需要专业人员协助”等既有出口。
    const limitedPatellaIds = limitedPatellaDirections(assessmentResults);
    const useCombinedPatellaUnit = canMobilizeJoint && limitedPatellaIds.length > 0 && patellaMotionFindings.length > 0;
    const nonPatellaMotionFindings = useCombinedPatellaUnit
      ? motionFindings.filter((finding) => !isPatellaDirectionId(`motion:${motionIdFromFinding(finding)}`))
      : motionFindings;
    const patellaMobilityTarget: TrialTarget | null = (() => {
      if (!useCombinedPatellaUnit) return null;
      const title = patellaMobilityUnitTitle(limitedPatellaIds);
      const candidate: FullCandidate = {
        id: "patella-mobility-unit",
        title,
        type: "joint",
        access: "therapist",
        do: "由专业人员让膝盖完全放松，逐一轻柔比较并处理刚才受限的髌骨方向；每个方向只做一次，出现锐痛或硬性阻挡时立即停止。",
        observe: "与对侧相比的被动活动幅度、末端感觉和被动不适；只记录真正受限的方向。",
        retest: "统一复测刚才受限的髌骨方向，记录被动活动幅度和被动不适。",
        tags: ["patella", "joint-mobility", "patella-mobility-unit"],
        retestIds: [...limitedPatellaIds],
        siteLabel: "髌骨",
        targetLabel: "",
        actionLabel: title,
      };
      return {
        id: "target:patella-mobility-unit",
        finding: patellaMotionFindings[0],
        retestFindings: filterPatellaFindingsToLimited(patellaMotionFindings, limitedPatellaIds),
        candidates: [candidate],
        chain: "髌骨活动",
        retestLabel: title,
        sourceCaseIds: [...new Set(patellaMotionFindings.flatMap((finding) => sourceCaseIdsForFinding(finding)))],
      };
    })();
    const motionTargets = [patellaMobilityTarget, ...nonPatellaMotionFindings.map(buildMotionTarget)].filter((target): target is TrialTarget => Boolean(target));
    const collapseEmbeddedControls = (target: TrialTarget): TrialTarget => {
      const embeddedDirectionIds = new Set(target.candidates
        .filter((candidate) => candidate.type === "muscle")
        .flatMap(candidatePilotMotionIds));
      if (!embeddedDirectionIds.size) return target;
      const keep = (candidate: FullCandidate) => candidate.type !== "control"
        || !candidatePilotMotionIds(candidate).some((directionId) => embeddedDirectionIds.has(directionId));
      return {
        ...target,
        candidates: target.candidates.filter(keep),
        optionalCandidates: target.optionalCandidates?.filter(keep),
      };
    };
    const sameDirectionMotionTarget = chiefDirection ? motionTargets.find((target) => samePhysicalAction(motionIdFromFinding(target.finding), chiefDirection)) : undefined;
    const remainingMotionTargets = sameDirectionMotionTarget ? motionTargets.filter((target) => target !== sameDirectionMotionTarget) : motionTargets;
    const targets: TrialTarget[] = [];
    if (hasClearChiefAction(intake)) {
      const chiefSide = sameDirectionMotionTarget?.finding.side ?? findings.find((finding) => finding.priority === "support" && finding.side)?.side;
      const combinedChiefCandidates = [...(sameDirectionMotionTarget?.candidates ?? []), ...chiefCandidates]
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
      const combinedOptional = [...(sameDirectionMotionTarget?.optionalCandidates ?? []), ...chiefOptionalCandidates]
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index)
        .filter((candidate) => !combinedChiefCandidates.some((chosen) => candidateDedupKey(chosen) === candidateDedupKey(candidate)));
      // The chief route may start with several highly related muscles, but it
      // must not lose the later joint/control branch simply because of slicing.
      // 用户在统一触诊中明确选出的区域都属于本次检查证据。全阳性时不能
      // 被固定的“三项上限”截掉第4个区域；这些候选仍按区域逐个验证，
      // 相关方向若提前恢复，后续候选会由 directionNeedsCandidate 自动跳过。
      const explicitChiefMuscleLimit = Math.max(3, directTensionCandidates.length);
      const selectedChiefCandidates = selectTreatmentChainCandidates(combinedChiefCandidates, explicitChiefMuscleLimit);
      const chiefCandidateRetestIds = new Set(selectedChiefCandidates.flatMap((candidate) => candidate.retestIds ?? []));
      const chiefRetestFindings = motionFindings.filter((finding) => [...chiefCandidateRetestIds].some((id) => samePhysicalAction(id, motionIdFromFinding(finding))));
      if (selectedChiefCandidates.length) targets.push({ id: "target:chief", finding: { ...findings[0], side: chiefSide }, retestFindings: chiefRetestFindings, candidates: selectedChiefCandidates, optionalCandidates: [...combinedChiefCandidates.filter((candidate) => !selectedChiefCandidates.some((chosen) => candidateDedupKey(chosen) === candidateDedupKey(candidate))), ...combinedOptional].filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index).slice(0, 3), chain: chiefDirection ? directionChain(chiefDirection) : "主诉相关", retestLabel: chiefActionLabel(intake), sourceCaseIds: pilotSourceCaseIds });
    }
    const provisionalSymptomTargets = [...painfulMotionOnlyTargets, ...painfulStrengthTargets, ...painfulFunctionTargets];
    if (!hasClearChiefAction(intake)) targets.push(...provisionalSymptomTargets, ...remainingMotionTargets);
    else targets.push(
      ...remainingMotionTargets,
      ...painfulStrengthTargets,
      // The assessment that reproduced the chief action is already merged
      // into target:chief and must not become a second treatment target.
      ...painfulFunctionTargets.filter((target) => target.finding.id !== chiefFunctionAssessmentId(intake, region.id)),
    );
    const currentKneeSwellingCandidate = region.id === "knee" && kneeDecision?.currentTreatment?.kind === "symptom-management"
      ? allCandidates.find((candidate) => candidate.id === kneeDecision.currentTreatment?.id)
      : undefined;
    if (swellingGuidance && (region.id !== "knee" || currentKneeSwellingCandidate)) {
      const swellingFinding = findings.find((finding) => finding.id === "track:swelling");
      if (swellingFinding) targets.unshift({ id: "target:swelling", finding: swellingFinding, candidates: [currentKneeSwellingCandidate ?? swellingGuidance], chain: "肿胀管理" });
    }
    return consolidateTrialTargetsByTreatment(targets.map(collapseEmbeddedControls));
  }, [region, findings, matchedCandidateGroups, assessmentResults, intake, canAssessPassive, canMobilizeJoint, swellingGuidance, assessments, matchedPilotRelations, pilotRelationsByAssessmentId, pilotTreatmentUnits, kneeDecision, localLimbDecision, tissuePathway, trialRecords]);

  const trialTargets = useMemo<TrialTarget[]>(() => {
    const recordedRangeDirections = new Set(trialRecords.flatMap((record) => Object.keys(record.rangeOutcomes ?? {})));
    const chiefHasCurrentRetest = trialRecords.some((record) => record.chiefRetested && !record.reviewOnly);
    // Both end-of-treatment and end-of-training chief retests close the
    // current treatment queue. Without this shared lock a dynamic rebuild can
    // reintroduce the old chief muscle card for one render.
    const chiefRetestLocked = treatmentFinalRetestConfirmed || finalRetestConfirmed;
    const resultAlreadyCoversCandidate = (target: TrialTarget, candidate: FullCandidate) => {
      // 最后一次主诉复测完成后，本轮处理已经进入训练交接。该复测不会
      // 新增 trialRecord，所以不能让旧的 target:chief 候选重新浮出来，
      // 否则普通用户刚测完主诉又会再次看到同一块肌肉松解。
      const treatmentSide = target.finding.side ?? intake.side;
      const prior = [...trialRecords].reverse().find((record) => !record.reviewOnly && !record.retestOnly
        && (record.treatmentKey === candidateTreatmentKey(candidate, treatmentSide)
          || !record.treatmentSide && record.candidateId === candidate.id));
      // 肿胀是时间性管理，只在本次完成一次；它不属于可以跨问题复用
      // 的即时处理，但已完成的肿胀目标必须从动态队列移除。
      if (candidate.type === "swelling") return Boolean(prior);
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
    return consolidateTrialTargetsByTreatment(baseTrialTargets.map((target) => ({
      ...target,
      candidates: [
        ...target.candidates,
        ...(target.optionalCandidates ?? []).filter((candidate) => selectedOptionalCandidateIds.includes(optionalTreatmentSelectionKey(target.id, candidate.id))),
      ].filter((candidate) => !resultAlreadyCoversCandidate(target, candidate)),
    })).filter((target) => target.candidates.length > 0));
  }, [baseTrialTargets, selectedOptionalCandidateIds, trialRecords, intake.side, treatmentFinalRetestConfirmed, finalRetestConfirmed]);

  useEffect(() => {
    if (!pendingTrialAdvance) return;
    const targetKey = (target: TrialTarget) => `${target.id}:${target.candidates[0]?.id ?? ""}`;
    const resolvedIndex = resolveDynamicQueueAdvance(trialTargetIndex, trialTargets.map(targetKey), pendingTrialAdvance);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (trialTargetIndex !== resolvedIndex) setTrialTargetIndex(resolvedIndex);
    setPendingTrialAdvance(null);
  }, [trialTargets, trialTargetIndex, pendingTrialAdvance]);

  useEffect(() => {
    if (!trialTargets.length) {
      // 候选会随评估答案和复测结果动态缩短；索引必须同步回到有效范围。
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [trialTargets, trialTargetIndex, candidateIndex]);

  const activeTarget = trialTargets[trialTargetIndex];
  const activeCandidate = activeTarget?.candidates[candidateIndex];
  function advanceToNextTrialTarget(rebuildFromQueue = false) {
    if (!activeTarget) return;
    const targetKey = (target: TrialTarget) => `${target.id}:${target.candidates[0]?.id ?? ""}`;
    const nextTarget = trialTargets[trialTargetIndex + 1];
    setPendingTrialAdvance({ completedKey: targetKey(activeTarget), nextKey: nextTarget ? targetKey(nextTarget) : "", completedTargetId: activeTarget.id });
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
    && !trialRecords.some((record) => record.chiefRetested && !record.reviewOnly));
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
  const latestProblemRecords = new Map<string, TrialRecord>();
  trialRecords.forEach((record) => {
    if (record.reviewOnly || record.retestOnly) return;
    const key = record.targetId;
    latestProblemRecords.set(key, record);
  });
  const completedProblemIds = new Set<string>();
  const latestResolvedDirections = new Set<string>();
  Object.entries(latestRangeOutcomes).forEach(([directionId, outcome]) => {
    if (outcome === "both-match") latestResolvedDirections.add(`motion:${directionId}`);
  });
  latestProblemRecords.forEach((record, targetId) => {
    const problemKey = targetId.replace(/^target:/, "");
    const rangeEntries = Object.entries(record.rangeOutcomes ?? {});
    if (problemKey === "chief" && record.chiefRetested && record.afterScore === 0) completedProblemIds.add("chief");
    if (problemKey.startsWith("motion:") && rangeEntries.length > 0 && rangeEntries.every(([, outcome]) => outcome === "both-match")) {
      completedProblemIds.add(problemKey);
    }
    if (!rangeEntries.length && (targetId === "target:swelling" || record.result === "better")) completedProblemIds.add(problemKey);
  });
  latestResolvedDirections.forEach((id) => completedProblemIds.add(id));
  const problemLedger = buildProblemLedger(treatmentProblems.map((problem) => ({
    id: problem.id,
    kind: problem.kind,
    routed: routedProblemIds.has(problem.id)
      || problem.findingIds.some((id) => routedProblemIds.has(id))
      || Boolean(problem.directionId && [...routedProblemIds].some((id) => samePhysicalAction(id.replace(/^motion:/, ""), problem.directionId))),
    completed: completedProblemIds.has(problem.id)
      || problem.findingIds.some((id) => completedProblemIds.has(id))
      || Boolean(problem.directionId && latestRangeOutcomes[problem.directionId] === "both-match"),
  })), { pathway: tissuePathway.id, assessmentInsufficient: assessmentEvidenceInsufficient });
  const treatmentEmptyState = emptyTreatmentMessage(problemLedger);
  const unresolvedLedgerProblem = hasUnroutedImmediateProblem(problemLedger);
  // "已进入处理路径" 不等于 "问题已经解决"。处理队列为空时仍要保留
  // 未达到目标的主诉/活动度，给出明确的下一步，不能静默结束本次流程。
  const unresolvedImmediateLedgerProblems = unresolvedImmediateProblems(problemLedger);

  const recordedImmediateChiefScore = useMemo(() => {
    const records = trialRecords.filter((item) => item.chiefRetested && !item.reviewOnly);
    return records.length ? records[records.length - 1].afterScore : intake.baselineScore;
  }, [trialRecords, intake.baselineScore]);
  const chiefDirectionForScore = region ? chiefMotionDirectionId(intake, region.id) : undefined;
  const latestChiefRangeScore = chiefDirectionForScore
    ? [...trialRecords].reverse()
      .flatMap((record) => Object.entries(record.rangeScores ?? {}))
      .find(([directionId]) => samePhysicalAction(directionId, chiefDirectionForScore))?.[1]
    : undefined;
  // A local-length retest can capture the same physical action as the chief
  // complaint without setting `chiefRetested` on its record. Keep that score
  // in the live chief ledger so a real improvement is not rendered as a
  // range-only change.
  const lastImmediateChiefScore = typeof latestChiefRangeScore === "number"
    ? latestChiefRangeScore
    : recordedImmediateChiefScore;
  // 主诉在本次处理阶段只需要先复测一次。只有真的保存过主诉复测后，
  // 后续处理才可以跳过逐项主诉询问；“后面还有候选”本身不能算复测完成，
  // 否则肿胀管理后第一块肌肉就会被错误地直接跳到下一项。
  const chiefRetestCompletedDuringTreatment = trialRecords.some((record) =>
    record.chiefRetested && !record.reviewOnly);
  const chiefScoreComparable = hasClearChiefAction(intake) && intake.baselineScoreConfirmed && intake.side !== "双侧/中间";
  const chiefImprovedDuringTreatment = trialRecords.some((record) => record.chiefRetested && record.afterScore < record.beforeScore)
    || (chiefScoreComparable && lastImmediateChiefScore < intake.baselineScore);
  // 最终主诉复测只由“最近一次主诉记录后是否又做了处理”决定。
  // 后续处理即使仍归在主诉处理链，也会改变主诉，不能因为没有被分类成
  // “独立问题”就跳过本轮最终复测。
  const hasActualTreatmentWithoutChiefRetest = chiefScoreComparable
    && trialRecords.some((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased)
    && !trialRecords.some((record) => record.chiefRetested && !record.reviewOnly);
  const chiefNeedsFinalRetest = needsTreatmentFinalChiefRetest(trialRecords, chiefScoreComparable)
    || hasActualTreatmentWithoutChiefRetest;
  const lastChiefScore = treatmentFinalRetestConfirmed ? treatmentFinalRetestScore : lastImmediateChiefScore;
  const sessionEndScore = chiefScoreComparable ? (finalRetestConfirmed ? finalRetestScore : lastChiefScore) : intake.baselineScore;

  function directionAllowsPassive(directionId: string) {
    const item = assessments.find((assessment) => assessment.id === `motion:${directionId}`);
    return canAssessPassive && !(item?.spinal && !item.id.includes("rotation"));
  }

  function directionNeedsCandidate(candidate: FullCandidate, directionId: string, outcomes = latestRangeOutcomes) {
    const current = latestOutcomeForDirection(directionId, outcomes);
    const hasRetestForDirection = Object.keys(outcomes).some((id) => samePhysicalAction(id, directionId));
    if (["both-match", "worse"].includes(current ?? "")) return false;
    // A first muscle area may be unrelated or only partly effective. Keep the
    // next, non-duplicated muscle area available until this direction reaches
    // the comparison goal; deduplication prevents repeating the same region.
    if (candidate.type === "muscle") return !current || !["both-match", "worse"].includes(current);
    if (candidate.type === "joint") {
      if (!canMobilizeJoint || !directionAllowsPassive(directionId)) return false;
      const initialPassive = assessmentResults[`motion:${directionId}`]?.passive;
      return current === "better-passive-limited" || current === "passive-limited"
        || (!hasRetestForDirection && initialPassive === "limited");
    }
    if (candidate.type === "control") {
      if (!directionAllowsPassive(directionId)) return ["better-passive-limited", "passive-limited"].includes(current ?? "")
        || (!hasRetestForDirection && !current && motionAnswerIsLimited(assessmentResults[`motion:${directionId}`]?.active));
      const initialPassive = assessmentResults[`motion:${directionId}`]?.passive;
      return current === "passive-match-active-limited"
        || (!hasRetestForDirection && !current && initialPassive === "same");
    }
    return false;
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
  const activeRetestFindings = readyToRetest && retestPlan?.targetId === activeTarget?.id && retestPlan.candidateId === activeCandidate?.id
    ? dedupeRetestFindingsByAction(activeTargetRetestFindings.filter((finding) => retestPlan.directionIds.some((id) => samePhysicalAction(id, motionIdFromFinding(finding)))))
    : liveActiveRetestFindings;
  const activeControlMotionIds = [...new Set(activeRetestFindings.map(motionIdFromFinding))];

  const effectiveTreatmentCandidates = useMemo<FullCandidate[]>(() => {
    if (!region) return [];
    if (tissuePathway.id === "bone-stress-suspected") return [];
    const sourceCandidates = [...(region.mobilityInterventions ?? []), ...region.candidateGroups.flatMap((group) => group.candidates)];
    const effectiveIds = new Set(trialRecords
      .filter((record) => ["better", "partial"].includes(record.result) && !record.timeBased && !record.reviewOnly && !record.retestOnly && !record.supportingOnly)
      .map((record) => record.candidateId));
    const effectiveSourceCandidates = sourceCandidates
      .filter((candidate) => effectiveIds.has(candidate.id))
      .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
    const effectiveDynamicCandidates = trialRecords
      .filter((record) => ["better", "partial"].includes(record.result) && !record.timeBased && !record.reviewOnly && !record.retestOnly && !record.supportingOnly)
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
    const doctorLimited = intake.priorCare.includes("看过医生") || imaging.includes("医生有限制");
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
  }, [intake, findings, noImmediateTreatmentResponse, imaging, followupMode, followupScoreConfirmed, followupScore, sessionEndScore, followupTrends, sessionNumber, latestOutcomeForDirection]);

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
    if (noChiefActionAndNoAssessmentProblem) {
      const basicIds: Partial<Record<FullRegionId, string[]>> = {
        knee: ["knee-heel-slide-quad-set", "knee-bridge"],
        "ankle-foot": ["ankle-four-way-motion"],
      };
      return region.exercises
        .filter((exercise) => basicIds[region.id]?.includes(exercise.id))
        .map((exercise) => adaptExerciseForCurrentStage(exercise, 1));
    }
    const findingTags = new Set(findings.flatMap((finding) => finding.tags));
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
    const ankleDirectionExerciseIds = new Set(findings
      .filter((finding) => finding.id.startsWith("motion:ankle-"))
      .map((finding) => `${motionIdFromFinding(finding)}-control`));
    const directionSpecific = region.id === "ankle-foot"
      ? region.exercises.filter((exercise) => ankleDirectionExerciseIds.has(exercise.id))
      : [];
    const localToeOnly = region.id === "ankle-foot"
      && includesAny(intake.location, ["足趾", "大拇趾", "小拇趾", "前脚掌"])
      && !includesAny(chiefActionSource(intake), ["走路", "步行", "跑", "跳", "台阶", "下蹲", "单腿", "不稳"]);
    const needsPosteriorChainFoundation = region.id === "knee"
      || (region.id === "ankle-foot" && !localToeOnly && (intake.goal >= 3 || findings.some((finding) => finding.id.startsWith("function:"))));
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
      .slice(0, targetCount);
    return sessionSelected.map((exercise) => {
      const adapted = adaptExerciseForCurrentStage(exercise, exerciseStage);
      if (endStageSymptom) return { ...adapted, title: `${adapted.title.replace(/（基础版）$/, "")}（半程版）`, how: `先在不引起末端不适的半程内完成。${adapted.easier}` };
      if (startStageSymptom) return { ...adapted, how: `慢速启动，控制回程。${adapted.how}` };
      return adapted;
    });
  }, [region, findings, exerciseStage, intake, effectiveTreatmentCandidates, assessmentResults, noChiefActionAndNoAssessmentProblem, pilotTrainingIds, kneeDecision, followupMode, followupKneeDecision, localLimbDecision, tissuePathway, sessionHistory, sessionNumber]);

  const homeRelaxationTargets = useMemo(() => {
    // 训练后自主放松合并四类来源：紧张检查（共享 + 逐项）、有效/部分有效处理肌肉、
    // 当前训练动作主要肌肉；去重后最多 2～3 个。肿胀、清楚刺痛、麻电或非标准
    // 组织路径（撞伤/骨应力/肌腱负荷）时整体隐藏，规则见 home-relaxation-core。
    const tensionLabels = followupMode
      ? followupTensionLocations
      : [
          ...(assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionLocations ?? []),
          ...Object.values(assessmentResults).flatMap((record) => record.tensionLocations ?? []),
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
  }, [assessmentResults, followupMode, followupTensionLocations, intake, tissuePathway.id, effectiveTreatmentCandidates, exercises]);

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
    const all = [...(region.mobilityInterventions ?? []), ...region.candidateGroups.flatMap((group) => group.candidates), ...dynamicHistoryCandidates]
      .map((candidate) => {
        const currentUnit = region.id === "knee" ? followupKneeDecision?.currentTreatment : undefined;
        const mappedIds = kneeLegacyCandidateIdsForUnit(currentUnit?.id);
        if (!currentUnit || !mappedIds.includes(candidate.id)) return candidate;
        return {
          ...candidate,
          id: currentUnit.id,
          tags: [...candidate.tags, `knee-core:${currentUnit.id}`, `legacy-candidate:${candidate.id}`],
          retestIds: Array.from(new Set([
            ...(candidate.retestIds ?? []),
            ...currentUnit.relatedActionIds.filter((actionId) => ["knee-extension", "knee-flexion"].includes(actionId)),
          ])),
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
      .filter((candidate) => candidateIsAvailable(candidate, intake.userRole))
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
        const trend = followupTrends[`motion:${directionId}`];
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
        && followupTrends[`motion:${directionId}`] !== "better";
    });
    const ordered = [
      ...eligible.filter((candidate) => candidate.type === "muscle").sort((a, b) => retainedPriority(b) - retainedPriority(a) || Number(wasRetained(b)) - Number(wasRetained(a)) || byRelevance(a, b)),
      ...(needsMobility ? eligible.filter((candidate) => candidate.type === "joint") : []),
      ...eligible.filter((candidate) => candidate.type === "neural"),
    ];
    return ordered.filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
  }, [region, trialRecords, followupTrialRecords, sessionNumber, intake, findings, followupTrends, followupTensionLocations, canMobilizeJoint, followupKneeDecision, localLimbDecision, tissuePathway]);

  const legacyThinkingMode = !intake.productMode && ["coach", "rehab"].includes(intake.userRole);
  const effectiveOperationTarget = intake.productMode ? intake.operationTarget : workflowProfile.operationTarget;
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
  const selfNeuralReferral = intake.userRole === "general" && (intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化"));
  const stabbingEarlyReferral = intake.userRole === "general" && intake.symptomType === "刺痛" && intake.stabbingSpread === "rest";
  const intakeHasTenderness = intake.symptoms.includes("按压痛") || intake.provocationTypes.includes("按压");
  const intakeHasSensorySymptoms = intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化");
  // 发力方向不再作为症状收集中的独立必答题；它会在对应活动动作卡片里
  // 与活动范围、主动控制一起记录。
  const needsPainQuality = ["疼痛，性质说不清", "说不清的不适"].includes(intake.symptomType) && !intake.painQualityConfirmed;
  const baselineScoreApplicable = shouldCollectBaselineScore(intake);
  const descriptionSuggestsTrauma = includesAny(intake.description, ["崴", "扭伤", "拉伤", "摔", "跌", "撞", "落地", "外伤"]);
  const mechanismQuestionRelevant = !intake.mechanism && (["今天或昨天", "2～7天"].includes(intake.onset) || descriptionSuggestsTrauma);
  const provocationAlreadyClear = hasClearChiefAction(intake);
  const provocationConfirmedForFlow = confirmedIntakeMulti.provocationTypes || provocationAlreadyClear;
  const hasNoFixedProvocation = intake.provocationTypes.includes("说不清 / 没有固定动作");
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
    [!intake.onset, "出现多久"],
    [mechanismQuestionRelevant, "发生方式"],
    [!intake.symptomType, "不适感觉"],
    [needsPainQuality, "疼痛性质"],
    [!confirmedIntakeMulti.symptoms, "目前情况"],
    // 肿胀、按压痛和感觉异常一旦被选中，下一题立即定位范围。
    // 这些位置是后续风险判断、检查与处理的直接输入，不能隔着主诉动作
    // 和评分再回来补充，否则用户很容易忘记刚才在标记什么。
    [intake.symptoms.includes("肿胀或淤青") && !intake.swellingLocationConfirmed, "肿胀位置"],
    [intakeHasTenderness && !intake.tendernessLocationConfirmed, "按压痛位置"],
    [intakeHasSensorySymptoms && !intake.sensoryLocationConfirmed, "麻电范围"],
    [!provocationConfirmedForFlow, "诱发场景"],
    [needsChiefActionConfirmation, "具体动作"],
    [baselineScoreApplicable && !intake.baselineScoreConfirmed, "不适分数"],
    [needsStabbingSpread, "刺痛出现范围"],
    [needsStabbingPalpation, "轻按反应"],
    [!intake.goal, "恢复目标"],
  ].filter(([missing]) => missing).map(([, label]) => label as string), [intake, needsExamSetupChoice, needsCapabilitiesChoice, needsSpineModeChoice, mechanismQuestionRelevant, provocationConfirmedForFlow, needsChiefActionConfirmation, intakeHasTenderness, intakeHasSensorySymptoms, baselineScoreApplicable, needsStabbingSpread, needsStabbingPalpation, confirmedIntakeMulti, needsPainQuality]);
  // 进入逐项模式后，当前字段只由路径状态决定；不能因为字段暂时为空，
  // 又回退到 intakeMissingFields[0]，否则返回后点击下一步会跳到最新未填写项。
  const currentIntakeField = showAllIntakeFields ? "" : guidedIntakeField || (guidedIntakePath.length ? "" : intakeMissingFields[0] || "");
  const guidedLocationSelectionReady = currentIntakeField === "不舒服的位置" && intake.bodyLocations.length > 0
    || currentIntakeField === "肿胀位置" && intake.swellingLocations.length > 0
    || currentIntakeField === "按压痛位置" && intake.tendernessLocations.length > 0
    || currentIntakeField === "麻电范围" && intake.sensoryLocations.length > 0;
  const guidedQuestionReady = Boolean(currentIntakeField && (!intakeMissingFields.includes(currentIntakeField) || guidedLocationSelectionReady));
  const intakeComplete = Boolean(intake.parsed && intake.productMode && (!needsExamSetupChoice || effectiveOperationTarget) && (!needsCapabilitiesChoice || intake.capabilitiesConfirmed) && (!needsSpineModeChoice || intake.spineAssessmentMode) && isPilotRegion(intake.regionId) && intake.side && intake.location && intake.locationConfirmed && intake.bodyLocations.length && intake.onset && (!mechanismQuestionRelevant || intake.mechanism) && intake.symptomType && !needsPainQuality && confirmedIntakeMulti.symptoms && provocationConfirmedForFlow && (!needsChiefActionConfirmation || intake.actionSelectionConfirmed || reportedActionSummary(intake).length > 0) && intake.goal && (!baselineScoreApplicable || intake.baselineScoreConfirmed)
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
  const canContinueSafety = safetyAnswered && boneQuestionsAnswered && imaging.length > 0 && (!hasSafetySignal || hasClearance) && (!structuralImagingSignal || hasClearance);
  const assessmentComplete = assessments.length > 0 && assessments.every((item) => assessmentRecordComplete(
    item,
    effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? ""),
    canAssessPassive,
    intake.side === "双侧/中间",
    !hasClearChiefAction(intake),
    canAssessEndFeel,
  ));
  const limitedPilotMotionItems = assessments.filter((item) => {
    if (item.kind !== "motion" || item.testMode === "passive") return false;
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
  // 特殊检查阳性线索：需要医学评估出口，不允许静默进入自助处理
  const specialPositiveFindings = Object.keys(assessmentResults)
    .filter((id) => id.startsWith("special:"))
    .filter((id) => assessmentResults[id]?.simple === "positive")
    .map((id) => assessments.find((item) => item.id === id))
    .filter(Boolean) as AssessmentItem[];
  const hasSpecialPositive = specialPositiveFindings.length > 0;
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
  const highIrritabilityReferral = intake.userRole === "general" && (severeAssessmentRecords.length >= 3 || (painfulMotionUnableCount >= 2 && hasFunctionUnable));
  const assessmentNeuralReferral = findings.some((finding) => finding.tags.includes("assessment-neural"));
  const sharpSpecialReferral = intake.stabbingPalpation === "sharp" && hasSpecialPositive;
  const treatmentQueueIsRefreshing = pendingTrialAdvance !== null;
  const pendingKneeAssessmentCheck = region?.id === "knee" ? kneeDecision?.assessmentChecks[0] : undefined;
  // 膝核心仍要求补查时，空处理队列不能被解释为“本次已结束”。
  const treatmentComplete = !treatmentQueueIsRefreshing
    && !pendingKneeAssessmentCheck
    // 未路由问题会在处理页提供精确的“返回补充检查”出口，但不把已经
    // 完成的评估步骤重新锁死，避免用户既进不了处理也无法定位缺口。
    && (trialTargets.length === 0 || trialTargetIndex >= trialTargets.length);
  const assessmentNeedsReferral = highIrritabilityReferral || assessmentNeuralReferral || sharpSpecialReferral;
  const adverseResolution = adverseResponse ? resolveAdverseResponse(adverseResponse) : null;
  const planIsCurrent = canExecutePlan(treatmentPlanRevision, assessmentRevision);
  const maxUnlocked: Step = !intakeComplete ? 0 : !canContinueSafety ? 1 : adverseResponse || !planIsCurrent ? 2 : !assessmentFlowComplete || assessmentNeedsReferral ? 2 : !treatmentComplete ? 3 : !trainingComplete ? 4 : 5;

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
    invalidateAfterIntake(next);
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
    invalidateAfterIntake(next);
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
      invalidateAfterIntake({
        ...intake,
        locationConfirmed: true,
        side: sideFromLocationSelections(intake.bodyLocations),
        regionId: primary.regionId,
        location: intake.bodyLocations.map((item) => item.location).join("、"),
      });
    } else if (canonicalField === "肿胀位置" && intake.swellingLocations.length) {
      invalidateAfterIntake({ ...intake, swellingLocationConfirmed: true, swellingLocation: locationSelectionsLabel(intake.swellingLocations) });
    } else if (canonicalField === "按压痛位置" && intake.tendernessLocations.length) {
      invalidateAfterIntake({ ...intake, tendernessLocationConfirmed: true, tendernessLocation: locationSelectionsLabel(intake.tendernessLocations) });
    } else if (canonicalField === "麻电范围" && intake.sensoryLocations.length) {
      invalidateAfterIntake({ ...intake, sensoryLocationConfirmed: true, sensoryLocation: locationSelectionsLabel(intake.sensoryLocations) });
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
      "出现多久": Boolean(intake.onset),
      "发生方式": Boolean(intake.mechanism),
      "不适感觉": Boolean(intake.symptomType),
      "疼痛性质": intake.painQualityConfirmed,
      "目前情况": confirmedIntakeMulti.symptoms,
      "诱发场景": provocationConfirmedForFlow,
      "具体动作": Boolean(reportedActionSummary(intake).length || hasNoFixedProvocation),
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
  }, [intake, intakeMissingFields, guidedIntakeField, guidedIntakePath, confirmedIntakeMulti, effectiveOperationTarget, provocationConfirmedForFlow, hasNoFixedProvocation, intakeHasTenderness, intakeHasSensorySymptoms]);

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
    if (next <= maxUnlocked || next <= step) {
      setReviewStep(null);
      setReviewStepEditable(false);
      const transitionByStep: Partial<Record<Step, TransitionTarget>> = { 2: "assessment", 3: "treatment", 4: "training", 5: "summary" };
      const target = next > step ? transitionByStep[next] : undefined;
      if (target) {
        setTransitionTarget(target);
        if (target === "assessment" && isThinkingMode) setThinkingWorkbenchOpen(true);
        setSummaryOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setStep(next);
      setTransitionTarget(null);
      setSummaryOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function reviewCompletedStep(target: Step) {
    setTransitionTarget(null);
    setReviewStepEditable(false);
    setReviewStep(target);
    setSummaryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editCompletedAssessment() {
    setTransitionTarget(null);
    setReviewStepEditable(true);
    setReviewStep(2);
    setSummaryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setTrialRecords([]);
      setFollowupTrialRecords((current) => current.filter((record) => record.sessionNumber !== sessionNumber));
    }
    setReadyToRetest(false);
    setFollowupReadyToRetest(false);
    setRetestPlan(null);
    setFollowupRetestPlan(null);
    if (input.source !== "after-session") setTrainingComplete(false);
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

  function renderThinkingWorkbench() {
    const completedAssessmentIds = new Set(assessmentDisplayItems.filter((item) => displayAssessmentComplete(item)).map((item) => item.id));
    const groupedSpecials = [
      { key: "localization", label: "定位筛查" },
      { key: "response", label: "反应实验" },
      { key: "safety", label: "安全分流" },
      { key: "professional-special", label: "专项检查" },
    ] as const;
    const unresolved = findings.filter((finding) => !finding.internal && !["track:swelling", "track:tender"].includes(finding.id));
    const stageStates = workbenchStageStates({
      canContinueSafety,
      assessmentFlowComplete,
      completedAssessmentCount: completedAssessmentIds.size,
      totalAssessmentCount: assessmentDisplayItems.length,
      unresolvedProblemCount: unresolved.length,
      trialRecordCount: trialRecords.length,
      trainingComplete,
      exerciseCount: exercises.length,
      isSummaryStep: step === 5,
    });
    const stageItems = [
      { label: "症状与安全", state: stageStates[0], detail: `${intake.location || "未定位"} · ${intake.symptomType || "感觉待确认"}`, onClick: () => goToStep(1) },
      { label: "评估", state: stageStates[1], detail: "活动度、力量、功能和必要专项检查", onClick: () => { setThinkingWorkbenchOpen(false); const next = assessmentDisplayItems.findIndex((item) => !displayAssessmentComplete(item)); setAssessmentIndex(next >= 0 ? next : 0); } },
      { label: "问题台账", state: stageStates[2], detail: "按活动度、肌肉、控制和局部体征分组", onClick: () => { setThinkingWorkbenchOpen(false); setAssessmentSummaryOpen(true); } },
      { label: "处理与复测", state: stageStates[3], detail: "一次处理一组相关区域，再复测原动作", onClick: () => { if (assessmentFlowComplete) { setTransitionTarget("treatment"); setThinkingWorkbenchOpen(false); } } },
      { label: "训练", state: stageStates[4], detail: "按力量、控制和功能目标安排进阶", onClick: () => { if (treatmentComplete) { setTransitionTarget("training"); setThinkingWorkbenchOpen(false); } } },
      { label: "总结", state: stageStates[5], detail: "保留有效方向、未解决问题和下次重点", onClick: () => { if (trainingComplete) { setTransitionTarget("summary"); setThinkingWorkbenchOpen(false); } } },
    ];
    return <section className="rm-page rm-thinking-workbench">
      <StepHeading eyebrow="康复思路模式 · 阶段工作台" title="按阶段查看这次康复" note="先完成当前阶段，再进入下一阶段；可直接打开需要记录的项目。" />
      <section className="rm-workbench-stage-grid">{stageItems.map((stage, index) => <button type="button" key={stage.label} className={`rm-workbench-stage ${stage.state === "已完成" ? "is-done" : index === 1 ? "is-current" : ""}`} disabled={index > 1 && stage.state === "待开始"} onClick={stage.onClick}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage.label}</strong><b>{stage.state}</b><small>{stage.detail}</small></button>)}</section>
      <section className="rm-workbench-columns">
        <article className="rm-workbench-module"><header><div><span>评估项目</span><strong>{completedAssessmentIds.size}/{assessmentDisplayItems.length}</strong></div><button type="button" onClick={() => { setThinkingWorkbenchOpen(false); const next = assessmentDisplayItems.findIndex((item) => !displayAssessmentComplete(item)); setAssessmentIndex(next >= 0 ? next : 0); }}>打开检查</button></header><div className="rm-workbench-list">{assessmentDisplayItems.map((item) => <button type="button" key={item.id} className={displayAssessmentComplete(item) ? "is-done" : ""} onClick={() => { setThinkingWorkbenchOpen(false); setAssessmentIndex(assessmentDisplayItems.findIndex((entry) => entry.id === item.id)); }}><i>{displayAssessmentComplete(item) ? "✓" : "·"}</i><span>{item.id === PATELLA_GROUP_PRIMARY_ID ? "髌骨四方向被动活动" : professionalAssessmentTitle(item.id, item.title)}</span><b>{displayAssessmentComplete(item) ? "已记录" : "待记录"}</b></button>)}</div></article>
         <article className="rm-workbench-module"><header><div><span>问题台账</span><strong>{unresolved.length}项</strong></div><button type="button" disabled={!assessmentFlowComplete} onClick={() => { setThinkingWorkbenchOpen(false); setAssessmentSummaryOpen(true); }}>查看</button></header>{unresolved.length ? <div className="rm-workbench-ledger">{buildFindingGroups(unresolved).map((group) => <section key={group.key}><b>{group.label}</b><ul>{group.items.slice(0, 6).map((finding) => <li key={finding.id}>{professionalFindingLabel(finding)}</li>)}</ul></section>)}</div> : <p className="rm-workbench-empty">完成评估后，这里会按类别显示需要处理的问题。</p>}</article>
        <article className="rm-workbench-module"><header><div><span>专项检查</span><strong>{assessments.filter((item) => item.kind === "special").length}项</strong></div><span className="rm-workbench-capability">{canRunSpecialTest ? "已开放" : canAssessEndFeel ? "按权限" : "未开放"}</span></header>{groupedSpecials.map((group) => { const items = assessments.filter((item) => item.kind === "special" && item.specialCategory === group.key); return items.length ? <section className="rm-workbench-special-group" key={group.key}><b>{group.label}</b><span>{items.map((item) => professionalAssessmentTitle(item.id, item.title)).join("、")}</span></section> : null; })}</article>
      </section>
      <div className="rm-page-actions split"><button type="button" onClick={() => goToStep(1)}>返回安全确认</button><button type="button" className="rm-primary" disabled={!assessmentFlowComplete} onClick={() => { setTransitionTarget("treatment"); setThinkingWorkbenchOpen(false); }}>评估完成，进入处理</button></div>
    </section>;
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
    if (!adverseResponse) setAssessmentRevision((currentRevision) => {
      const nextRevision = nextAssessmentRevision(currentRevision);
      setTreatmentPlanRevision(nextRevision);
      return nextRevision;
    });
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
    setTrialRecords([]);
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
    setExerciseFeedback({});
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setBilateralNeedsReferral(false);
    setMidpointDecisionDone(false);
  }

  function targetScoreBeforeRetest(target: TrialTarget) {
    if (target.id === "target:chief") return lastChiefScore;
    if (target.finding.id.startsWith("motion:")) {
      const directionId = motionIdFromFinding(target.finding);
      const initialDirectionScore = assessmentResults[target.finding.id]?.symptomScore;
      const latestRangeScore = latestRangeScoreForDirection(directionId);
      if (typeof latestRangeScore === "number") return latestRangeScore;
      if (typeof initialDirectionScore === "number") return initialDirectionScore;
      if (hasClearChiefAction(intake) && samePhysicalAction(directionId, region ? chiefMotionDirectionId(intake, region.id) : undefined)) return lastChiefScore;
    }
    const previous = [...trialRecords].reverse().find((record) => record.targetId === target.id && !record.timeBased);
    return previous?.afterScore ?? target.finding.score ?? intake.baselineScore;
  }

  function finishTrial(result: TrialResult, timeBased = false, nextCandidateType?: FullCandidate["type"], finishTarget = false, deferredRetest = false) {
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
    const mergedChiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const chiefWasActuallyRetested = !timeBased && !deferredRetest && postScoreConfirmed && (
      activeTarget.id === "target:chief"
      || Boolean(hasClearChiefAction(intake) && activeDirectionIdForTrial && (activeDirectionIdForTrial === mergedChiefDirection || (!chiefImprovedDuringTreatment && !chiefRetestCompletedDuringTreatment)))
    );
    const recordRetestLabel = activeTarget.retestLabel
      ?? assessments.find((item) => item.id === activeTarget.finding.id.replace(/^symptom:/, ""))?.title
      ?? activeTarget.finding.title;
    const recordedAfterScore = timeBased || deferredRetest || !postScoreConfirmed ? beforeScore : postScore;
    const priorImprovingTreatmentCount = trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly && record.chiefRetested && record.afterScore < record.beforeScore).length;
    const responseRole = classifyTreatmentResponse({
      beforeScore,
      afterScore: recordedAfterScore,
      result,
      chiefRetested: chiefWasActuallyRetested,
      rangeImproved: ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(movementResponse),
      priorImprovingTreatmentCount,
      timeBased: timeBased || deferredRetest,
    });
    setTrialRecords((current) => [...current, ...recordCandidates.map((candidate, index): TrialRecord => ({
      candidateId: candidate.id,
      treatmentKey: candidateTreatmentKey(candidate, activeTarget.finding.side ?? intake.side),
      treatmentSide: activeTarget.finding.side ?? intake.side,
      candidateTitle: candidateTreatmentName(candidate),
      treatmentName: candidateTreatmentName(candidate),
      action: candidateAction(candidate, activeControlMotionIds),
      targetId: activeTarget.id,
      targetTitle: activeTarget.finding.title,
      measurement: deferredRetest ? "deferred" : timeBased ? "time" : hasSingleRangeEvidence ? "range" : "score",
      rangeOutcome: hasSingleRangeEvidence && isCompletedRangeRetestAnswer(movementResponse) ? movementResponse : undefined,
      rangeOutcomes: hasSingleRangeEvidence && singleRangeDirectionId && isCompletedRangeRetestAnswer(movementResponse) ? { [singleRangeDirectionId]: movementResponse } : undefined,
      rangeDiscomforts: hasSingleRangeEvidence && singleRangeDirectionId && singleRangeDiscomfort ? { [singleRangeDirectionId]: singleRangeDiscomfort } : undefined,
      rangeScores: hasSingleRangeEvidence && singleRangeDirectionId && typeof singleRangeScore === "number" ? { [singleRangeDirectionId]: singleRangeScore } : undefined,
      beforeScore,
      afterScore: recordedAfterScore,
      result,
      movement: result === "better" ? "smoother" : result === "worse" ? "worse" : "same",
      timeBased,
      retestOnly: carryoverOnly,
      reviewOnly: candidate.id === RESIDUAL_REVIEW_ID,
      batchedResult: recordCandidates.length > 1,
      supportingOnly: recordCandidates.length > 1 && index > 0,
      chiefRetested: chiefWasActuallyRetested,
      reusedFromTargetTitle: carryoverOnly ? priorTreatmentRecord?.targetTitle : undefined,
      retestActionKey: deferredRetest || timeBased ? undefined : canonicalRetestAction(recordRetestLabel),
      responseRole: recordCandidates.length > 1 && index > 0 ? "not-immediately-testable" : responseRole,
    }))]);
    const requestedNextIndex = nextCandidateType
      ? activeTarget.candidates.findIndex((candidate, index) => index > activeGroupEndIndex && candidate.type === nextCandidateType)
      : -1;
    const activeDirectionResolved = Boolean(activeDirectionIdForTrial && movementResponse === "both-match");
    const chiefFullyResolved = activeTarget.id === "target:chief" && chiefWasActuallyRetested && recordedAfterScore === 0;
    const strengthSymptomResolved = activeTarget.finding.id.startsWith("strength:") && postScoreConfirmed && recordedAfterScore === 0;
    // 全部区域共用：主诉改善不能清除活动度、力量、控制等独立问题。
    const hasUnresolvedSupportProblem = findings.some((finding) => {
      if (finding.priority !== "support") return false;
      const directionId = anyMotionIdFromFinding(finding);
      if (!directionId) return true;
      if (samePhysicalAction(directionId, mergedChiefDirection)) return false;
      const currentOutcome = activeDirectionIdForTrial && samePhysicalAction(activeDirectionIdForTrial, directionId) && movementResponse ? movementResponse : latestOutcomeForDirection(directionId);
      return currentOutcome !== "both-match";
    });
    const targetFinished = finishTarget
      || result === "worse"
      || activeDirectionResolved
      || (result === "better" && chiefFullyResolved && !hasUnresolvedSupportProblem && !activeTarget.retestFindings?.length)
      || (result === "better" && strengthSymptomResolved)
      || activeGroupEndIndex >= activeTarget.candidates.length - 1;
    if (isChiefTreatmentPhase && result === "better" && chiefFullyResolved) {
      if (chiefReviewIndex >= 0) setCandidateIndex(chiefReviewIndex);
      else {
        advanceToNextTrialTarget();
      }
    } else if (requestedNextIndex >= 0) {
      setCandidateIndex(requestedNextIndex);
    } else if (targetFinished || nextCandidateType) {
      advanceToNextTrialTarget(timeBased);
    } else {
      setCandidateIndex(activeGroupEndIndex + 1);
    }
    setPostScore(["better", "partial"].includes(result) ? recordedAfterScore : beforeScore);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setPostDiscomfort("");
    setPostScoreConfirmed(false);
    setReadyToRetest(false);
    setRetestPlan(null);
    setTrainingComplete(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
  }

  function finishRangeBatch() {
    if (!activeTarget || !activeCandidate || !activeRetestFindings.length) return;
    const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const chiefRangeFinding = chiefDirection ? activeRetestFindings.find((finding) => samePhysicalAction(motionIdFromFinding(finding), chiefDirection)) : undefined;
    const chiefMatchesRange = Boolean(chiefRangeFinding);
    // This flag used to live only inside renderTreatment().  finishRangeBatch()
    // also needs it when a local-limb batch records the chief action, so keep the
    // decision local to this handler instead of reaching into render scope.
    const batchSingleRangeRetestsChief = Boolean(
      activeTarget.id === "target:local-limb"
      && activeTarget.finding.id.startsWith("motion:")
      && hasClearChiefAction(intake)
      && (localNewSourceNeedsChiefRetest || (!chiefImprovedDuringTreatment && !chiefRetestCompletedDuringTreatment))
      && !chiefMatchesRange,
    );
    const shouldRetestChiefThisRound = !isResidualReviewStep
      && hasClearChiefAction(intake)
      && !chiefMatchesRange
      && (activeTarget.id === "target:chief" || activeTarget.id === "target:local-limb" && (batchSingleRangeRetestsChief || localNewSourceNeedsChiefRetest) || treatmentRelatesToChief((activeTarget.retestFindings ?? []).map(motionIdFromFinding), chiefDirection))
      && (localNewSourceNeedsChiefRetest || !chiefImprovedDuringTreatment && !chiefRetestCompletedDuringTreatment);
    const chiefRangeDirectionId = chiefRangeFinding ? motionIdFromFinding(chiefRangeFinding) : undefined;
    // 主诉动作可能挂在 target:chief，也可能挂在大腿/小腿的局部目标。
    // 只要复测方向与主诉是同一个物理动作，就应同步更新主诉分数；
    // 其他方向的活动复测不能替代主诉复测。
    const chiefScoreCapturedInRange = capturesChiefRetestScore(
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
    const beforeScore = activeTarget.id === "target:chief" || chiefScoreCapturedInRange || shouldRetestChiefThisRound ? lastChiefScore : intake.baselineScore;
    const rangeChiefScore = chiefScoreCapturedInRange && chiefRangeDirectionId
      ? movementScores[chiefRangeDirectionId]
      : undefined;
    // 复测分数必须是已确认的有限数字。异常情况下回退到本轮主诉分数，
    // 避免“疼痛改善＋活动度改善”点击继续时把 undefined 带入后续队列。
    const recordedChiefScore = typeof rangeChiefScore === "number" && Number.isFinite(rangeChiefScore)
      ? rangeChiefScore
      : typeof postScore === "number" && Number.isFinite(postScore) ? postScore : beforeScore;
    // 楼梯、下蹲、走路等主诉动作没有唯一的关节方向，批量复测页会
    // 单独显示主诉分数条。只要该分数条确实被记录，就必须写入主诉台账，
    // 不能因为没有 chiefDirection 或队列在本轮重排后变成 support target
    // 而丢掉这次结果，最终总结也不能回退到首次分数。
    const chiefScoreShownAndRecorded = Boolean(
      hasClearChiefAction(intake)
      && postScoreConfirmed
      && (activeTarget.id === "target:chief" || activeTarget.id === "target:local-limb")
      && !chiefRetestCompletedDuringTreatment,
    );
    const chiefWasActuallyRetested = (shouldRetestChiefThisRound || chiefScoreShownAndRecorded) && postScoreConfirmed || chiefScoreCapturedInRange;
    const scoreResult = chiefWasActuallyRetested ? resultFromScore(beforeScore, recordedChiefScore) : "same";
    const hasProgress = outcomes.some((outcome) => ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(outcome));
    const allResolved = outcomes.every((outcome) => outcome === "both-match");
    const anyWorse = outcomes.some((outcome) => outcome === "worse");
    const result: TrialResult = scoreResult === "worse" || anyWorse ? "worse" : allResolved ? "better" : hasProgress || scoreResult === "better" ? "partial" : "same";
    const priorImprovingTreatmentCount = trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly && record.chiefRetested && record.afterScore < record.beforeScore).length;
    const responseRole = classifyTreatmentResponse({
      beforeScore,
      afterScore: chiefWasActuallyRetested ? recordedChiefScore : beforeScore,
      result,
      chiefRetested: chiefWasActuallyRetested,
      rangeImproved: hasProgress,
      priorImprovingTreatmentCount,
    });

    const recordCandidates = activeNewCandidates.length ? activeNewCandidates : [activeCandidate];
    const carryoverOnly = activeNewCandidates.length === 0 && activeGroupPriorRecords.length > 0;
    const batchRetestLabels = [
      ...(shouldRetestChiefThisRound ? [chiefActionLabel(intake)] : []),
      ...activeRetestFindings.map((finding) => assessments.find((item) => item.id === finding.id)?.title ?? finding.title),
    ];
    const batchRetestKey = canonicalRetestAction(batchRetestLabels.join("、"));
    setTrialRecords((current) => [...current, ...recordCandidates.map((candidate, index): TrialRecord => ({
      candidateId: candidate.id,
      treatmentKey: candidateTreatmentKey(candidate, activeTarget.finding.side ?? intake.side),
      treatmentSide: activeTarget.finding.side ?? intake.side,
      candidateTitle: candidateTreatmentName(candidate),
      treatmentName: candidateTreatmentName(candidate),
      action: candidateAction(candidate, activeControlMotionIds),
      targetId: activeTarget.id,
      targetTitle: activeRetestFindings.map((finding) => finding.title).join("、"),
      measurement: "range",
      rangeOutcome: singleRangeOutcome,
      rangeOutcomes,
      rangeDiscomforts,
      rangeScores,
      beforeScore,
      afterScore: chiefWasActuallyRetested ? recordedChiefScore : beforeScore,
      result,
      movement: result === "better" ? "smoother" : result === "worse" ? "worse" : "same",
      retestOnly: carryoverOnly,
      reviewOnly: candidate.id === RESIDUAL_REVIEW_ID,
      batchedResult: recordCandidates.length > 1,
      supportingOnly: recordCandidates.length > 1 && index > 0,
      chiefRetested: chiefWasActuallyRetested,
      reusedFromTargetTitle: carryoverOnly ? priorTreatmentRecord?.targetTitle : undefined,
      retestActionKey: batchRetestKey,
      responseRole: recordCandidates.length > 1 && index > 0 ? "not-immediately-testable" : responseRole,
    }))]);

    const mergedOutcomes = { ...latestRangeOutcomes, ...rangeOutcomes };
    const chiefStillSymptomatic = chiefWasActuallyRetested && recordedChiefScore > 0;
    const trackedDirectionIds = new Set((activeTarget.retestFindings ?? []).map(motionIdFromFinding));
    const preferredNextTypes = Array.from(new Set(outcomes
      .map((outcome) => nextRangeCandidateType(outcome, canAssessPassive && canMobilizeJoint))
      .filter((type): type is "control" | "joint" => Boolean(type))));
    const candidateMatchesNextType = (candidate: FullCandidate) => !preferredNextTypes.length || preferredNextTypes.some((type) => type === candidate.type);
    const candidateNeedsMergedOutcome = (candidate: FullCandidate, target: TrialTarget) => {
      const candidateDirectionIds = (candidate.retestIds ?? []).filter((directionId) => Object.keys(mergedOutcomes).some((recordedId) => samePhysicalAction(recordedId, directionId)));
      if (candidateDirectionIds.length) return candidateDirectionIds.some((directionId) => directionNeedsCandidate(candidate, directionId, mergedOutcomes));
      const targetDirectionId = target.finding.id.startsWith("motion:") ? motionIdFromFinding(target.finding) : undefined;
      return Boolean(targetDirectionId && directionNeedsCandidate(candidate, targetDirectionId, mergedOutcomes));
    };
    const nextIndex = result === "worse" ? -1 : activeTarget.candidates.findIndex((candidate, index) => index > activeGroupEndIndex
      && candidateMatchesNextType(candidate)
      && (() => {
        const trackedCandidateDirections = (candidate.retestIds ?? []).filter((directionId) => trackedDirectionIds.has(directionId));
        if (trackedCandidateDirections.length) {
          return trackedCandidateDirections.some((directionId) => directionNeedsCandidate(candidate, directionId, mergedOutcomes));
        }
        return candidateNeedsMergedOutcome(candidate, activeTarget) || chiefStillSymptomatic;
      })());
    const nextTargetCandidate = result !== "worse" && nextIndex < 0 && preferredNextTypes.length
      ? trialTargets.slice(trialTargetIndex + 1).flatMap((target, offset) => target.candidates.map((candidate, candidateIndex) => ({
        target,
        targetIndex: trialTargetIndex + 1 + offset,
        candidate,
        candidateIndex,
      }))).find(({ target, candidate }) => candidateMatchesNextType(candidate) && candidateNeedsMergedOutcome(candidate, target))
      : undefined;
    if (nextIndex >= 0) {
      setCandidateIndex(nextIndex);
    } else if (nextTargetCandidate) {
      const targetKey = (target: TrialTarget) => `${target.id}:${target.candidates[0]?.id ?? ""}`;
      const nextTarget = nextTargetCandidate.target;
      setPendingTrialAdvance({
        completedKey: `${activeTarget.id}:${activeTarget.candidates[0]?.id ?? ""}`,
        nextKey: targetKey(nextTarget),
        nextTargetId: nextTarget.id,
        completedTargetId: activeTarget.id,
      });
      setTrialTargetIndex(nextTargetCandidate.targetIndex);
      setCandidateIndex(nextTargetCandidate.candidateIndex);
    } else {
      advanceToNextTrialTarget();
    }
    setPostScore(["better", "partial"].includes(result) ? recordedChiefScore : beforeScore);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setPostDiscomfort("");
    setPostScoreConfirmed(false);
    setReadyToRetest(false);
    setRetestPlan(null);
    setTrainingComplete(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
  }

  function continueWithReusedRetest() {
    if (!activeTarget) return;
    const trackedDirectionIds = new Set((activeTarget.retestFindings ?? []).map(motionIdFromFinding));
    const directDirection = activeTarget.finding.id.startsWith("motion:") ? motionIdFromFinding(activeTarget.finding) : undefined;
    if (directDirection) trackedDirectionIds.add(directDirection);
    const nextIndex = activeTarget.candidates.findIndex((candidate, index) => index > activeGroupEndIndex
      && !priorTreatmentFor(candidate)
      && (() => {
        const candidateDirections = (candidate.retestIds ?? []).filter((directionId) => trackedDirectionIds.has(directionId));
        if (candidateDirections.length) return candidateDirections.some((directionId) => directionNeedsCandidate(candidate, directionId));
        return activeTarget.id === "target:chief" ? lastChiefScore > 0 : true;
      })());
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
  }

  function saveRecord(status: SavedDemoRecord["status"] = "待复查", latestScoreOverride?: number, snapshotOverrides: Partial<SavedDemoSnapshot> = {}) {
    if (!region) {
      setToast("请先确认本次最想评估的部位");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    const snapshot: SavedDemoSnapshot = {
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
      trialRecords,
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
      treatmentFinalRetestScore,
      treatmentFinalRetestConfirmed,
      trainingReadyForFinalRetest,
      finalRetestScore,
      finalRetestConfirmed,
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
      hasNewSymptom: hasNewSymptom === "yes",
      followupTrends,
      sessionHistory,
      assessmentRevision,
      treatmentPlanRevision,
      adverseResponse,
      adverseConfirmedAssessmentIds,
      ...snapshotOverrides,
    };
    const firstSessionSummary: RehabSessionSummary | undefined = sessionNumber === 1 ? {
      sessionNumber: 1,
      completedAt: sessionHistory.find((item) => item.sessionNumber === 1)?.completedAt ?? new Date().toISOString(),
      startedScore: chiefScoreComparable ? intake.baselineScore : undefined,
      endingScore: chiefScoreComparable ? (latestScoreOverride ?? sessionEndScore) : undefined,
      reviewResults: mergeSessionReviewResults(
        firstAssessmentReviewResults,
        {},
        trialRecords,
        canonicalActionIdFromAssessmentId,
      ),
      treatments: trialRecords.filter((item) => !item.reviewOnly && !item.retestOnly).map((item) => ({ id: item.candidateId, label: item.treatmentName ?? item.candidateTitle, result: item.result, responseRole: item.responseRole })),
      effectiveCombination: resolvedTreatmentCombination(trialRecords.filter((item) => !item.reviewOnly && !item.retestOnly)).map((item) => item.treatmentName ?? item.candidateTitle),
      continuedEffectiveTreatments: trialRecords.filter((item) => ["better", "partial"].includes(item.result) && !item.timeBased && !item.reviewOnly && !item.retestOnly).map((item) => item.treatmentName ?? item.candidateTitle),
      stoppedTreatments: trialRecords.filter((item) => ["same", "worse"].includes(item.result) && !item.reviewOnly && !item.retestOnly).map((item) => item.treatmentName ?? item.candidateTitle),
      resolvedProblems: [],
      training: exercises.map((exercise) => ({ id: exercise.id, label: exercise.title, adjustment: "hold" })),
      nextFocus: ["复查主诉和第一次发现的问题", "继续有效处理", "检查训练完成情况和次日反应"],
    } : undefined;
    const nextSessionHistory = snapshot.sessionHistory
      ?? (firstSessionSummary ? upsertSessionSummary(sessionHistory, firstSessionSummary) : sessionHistory);
    snapshot.sessionHistory = nextSessionHistory;
    const caseKey = `${region.id}:${intake.side}:${intake.location}:${chiefComplaintLabel(intake)}`;
    const nextRecordNumber = Math.max(0, ...savedRecords.map((item) => Number(item.id.match(/-(\d+)$/)?.[1] ?? 0))) + 1;
    const record: SavedDemoRecord = {
      id: `case-${sessionNumber}-${nextRecordNumber}`,
      savedAt: `第${sessionNumber}次康复`,
      region: region.name,
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
      caseKey,
      sessionHistory: nextSessionHistory,
      status,
      snapshot,
    };
    // 同一案例保留一个入口；每次康复追加在 sessionHistory 中。重复保存
    // 同一次只更新当前案例快照，不生成一排难以辨认的重复卡片。
    const next = [record, ...savedRecords.filter((item) => item.caseKey !== caseKey && item.id !== record.id)].slice(0, 8);
    setSavedRecords(next);
    setSessionHistory(nextSessionHistory);
    try {
      localStorage.setItem("rehabmind-complete-demo-records", JSON.stringify(next));
      setToast(status === "等待影像" ? "本次信息已保存，获得影像后可继续" : status === "待医学评估" ? "本次信息已保存，可在完成医学评估后继续" : `第${sessionNumber}次康复记录已保存到本机`);
    } catch {
      setToast("当前浏览器无法保存记录，请保留本页或截图");
    }
    window.setTimeout(() => setToast(""), 2400);
  }

  function restoreRecord(record: SavedDemoRecord) {
    const snapshot = record.snapshot;
    if (!snapshot) {
      setToast("这是一条旧版摘要记录，无法恢复完整流程");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    setStep(snapshot.step);
    setTransitionTarget(null);
    setPendingTrialAdvance(null);
    const restoredIntake = migrateIntakeState(snapshot.intake as Partial<IntakeState>);
    const normalizedRestoredIntake = {
      ...restoredIntake,
      baselineScoreConfirmed: snapshot.intake.baselineScoreConfirmed ?? true,
      painQualityConfirmed: snapshot.intake.painQualityConfirmed
        ?? !["疼痛，性质说不清", "说不清的不适"].includes(snapshot.intake.symptomType),
    };
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
    setSafetyStage(2);
    setBoneRisk(snapshot.boneRisk ?? {});
    setImaging(snapshot.imaging);
    setAssessmentIndex(snapshot.assessmentIndex);
    assessmentResultsRef.current = snapshot.assessmentResults;
    setAssessmentResults(snapshot.assessmentResults);
    assessmentFocusIdRef.current = "";
    setTrialTargetIndex(snapshot.trialTargetIndex);
    setCandidateIndex(snapshot.candidateIndex);
    setSelectedOptionalCandidateIds(snapshot.selectedOptionalCandidateIds ?? []);
    setBilateralNeedsReferral(snapshot.bilateralNeedsReferral ?? false);
    setMidpointDecisionDone(snapshot.midpointDecisionDone ?? false);
    setTrialRecords(snapshot.trialRecords);
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
    setTrainingComplete(snapshot.trainingComplete);
    setTreatmentFinalRetestScore(snapshot.treatmentFinalRetestScore ?? 0);
    setTreatmentFinalRetestConfirmed(snapshot.treatmentFinalRetestConfirmed ?? false);
    setTrainingReadyForFinalRetest(snapshot.trainingReadyForFinalRetest ?? false);
    setFinalRetestScore(snapshot.finalRetestScore ?? 0);
    setFinalRetestConfirmed(snapshot.finalRetestConfirmed ?? false);
    setFollowupMode(snapshot.followupMode);
    setSessionNumber(snapshot.sessionNumber);
    setFollowupScore(snapshot.followupScoreConfirmed ? snapshot.followupScore : 0);
    setFollowupScoreConfirmed(snapshot.followupScoreConfirmed ?? false);
    setFollowupScoreHistory(snapshot.followupScoreHistory);
    setFollowupStage(snapshot.followupStage);
    setFollowupPostScore(snapshot.followupPostScore ?? 0);
    setFollowupPostScoreConfirmed(snapshot.followupPostScoreConfirmed ?? false);
    setFollowupPostDiscomfort(snapshot.followupPostDiscomfort ?? "");
    setFollowupCandidateId(snapshot.followupCandidateId);
    setFollowupTrialRecords(snapshot.followupTrialRecords);
    setFollowupReadyToRetest(snapshot.followupReadyToRetest ?? false);
    setFollowupRetestPlan(snapshot.followupRetestPlan ?? null);
    setFollowupMovementResponses(snapshot.followupMovementResponses ?? {});
    setFollowupTensionLocations(snapshot.followupTensionLocations ?? []);
    setFollowupMovementDiscomforts(snapshot.followupMovementDiscomforts ?? {});
    setFollowupMovementScores(snapshot.followupMovementScores ?? {});
    setFollowupMovementScoreConfirmed(snapshot.followupMovementScoreConfirmed ?? {});
    setFollowupExerciseChoices(snapshot.followupExerciseChoices);
    setFollowupTrainingReadyForRetest(snapshot.followupTrainingReadyForRetest ?? false);
    setFollowupFinalScore(snapshot.followupFinalScore ?? 0);
    setFollowupFinalScoreConfirmed(snapshot.followupFinalScoreConfirmed ?? false);
    setHasNewSymptom(snapshot.hasNewSymptom === true || snapshot.hasNewSymptom === "yes" ? "yes" : snapshot.hasNewSymptom === false || snapshot.hasNewSymptom === "no" ? "no" : "");
    setFollowupTrends(snapshot.followupTrends);
    setSessionHistory(snapshot.sessionHistory ?? record.sessionHistory ?? []);
    setAssessmentRevision(snapshot.assessmentRevision ?? 0);
    setTreatmentPlanRevision(snapshot.treatmentPlanRevision ?? snapshot.assessmentRevision ?? 0);
    setAdverseResponse(snapshot.adverseResponse ?? null);
    setAdverseConfirmedAssessmentIds(snapshot.adverseConfirmedAssessmentIds ?? []);
    setOpenExercise("");
    setRecordsOpen(false);
    setToast(record.status === "等待影像" ? "已回到原案例，可补充影像结果" : `已恢复第${record.sessionCount}次康复记录`);
    window.setTimeout(() => setToast(""), 2400);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetDemo() {
    setStep(0);
    setReviewStep(null);
    setTransitionTarget(null);
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
    setTrialRecords([]);
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
    setTrainingComplete(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setFollowupMode(false);
    setSessionNumber(1);
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
    setFollowupExerciseChoices({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setHasNewSymptom("");
    setFollowupTrends({});
    setSessionHistory([]);
    setAssessmentRevision(0);
    setTreatmentPlanRevision(0);
    setAdverseResponse(null);
    setAdverseConfirmedAssessmentIds([]);
  }

  function invalidateAfterIntake(nextOrUpdater: IntakeState | ((current: IntakeState) => IntakeState)) {
    const next = typeof nextOrUpdater === "function" ? nextOrUpdater(intakeRef.current) : nextOrUpdater;
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
    setTrialRecords([]);
    setTrialTargetIndex(0);
    setPendingTrialAdvance(null);
    setCandidateIndex(0);
    setSelectedOptionalCandidateIds([]);
    setBilateralNeedsReferral(false);
    setMidpointDecisionDone(false);
    setReadyToRetest(false);
    setMovementResponse("");
    setMovementResponses({});
    setMovementDiscomforts({});
    setMovementScores({});
    setMovementScoreConfirmed({});
    setPostScore(0);
    setPostScoreConfirmed(false);
    setPostDiscomfort("");
    setExerciseFeedback({});
    setTrainingComplete(false);
    setTreatmentFinalRetestScore(0);
    setTreatmentFinalRetestConfirmed(false);
    setTrainingReadyForFinalRetest(false);
    setFinalRetestScore(0);
    setFinalRetestConfirmed(false);
    setFollowupStage("review");
    setFollowupMode(false);
    setSessionNumber(1);
    setFollowupScore(0);
    setFollowupScoreConfirmed(false);
    setFollowupScoreHistory([]);
    setFollowupCandidateId("");
    setFollowupTrialRecords([]);
    setFollowupReadyToRetest(false);
    setFollowupMovementResponses({});
    setFollowupMovementDiscomforts({});
    setFollowupMovementScores({});
    setFollowupMovementScoreConfirmed({});
    setFollowupPostScore(0);
    setFollowupPostScoreConfirmed(false);
    setFollowupPostDiscomfort("");
    setFollowupExerciseChoices({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setFollowupTensionLocations([]);
    setHasNewSymptom("");
    setFollowupTrends({});
    setSessionHistory([]);
    setAssessmentRevision(0);
    setTreatmentPlanRevision(0);
    setAdverseResponse(null);
    setAdverseConfirmedAssessmentIds([]);
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
    const priorImprovingTreatmentCount = currentRecords.filter((record) => !record.reviewOnly && !record.retestOnly && record.chiefRetested && record.afterScore < record.beforeScore).length;
    const responseRole = classifyTreatmentResponse({
      beforeScore,
      afterScore,
      result,
      chiefRetested: followupPostScoreConfirmed,
      rangeImproved: Object.values(rangeOutcomes).some((outcome) => ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(outcome)),
      priorImprovingTreatmentCount,
      timeBased,
    });
    setFollowupTrialRecords((current) => [...current.filter((item) => !(item.sessionNumber === sessionNumber && item.candidateId === candidate.id)), {
      sessionNumber,
      targetId: "target:chief",
      candidateId: candidate.id,
      treatmentKey: candidateTreatmentKey(candidate, intake.side),
      candidateTitle: candidateTreatmentName(candidate),
      treatmentName: candidateTreatmentName(candidate),
      action: candidateAction(candidate, Object.keys(rangeOutcomes)),
      beforeScore,
      afterScore,
      result,
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
    const nextCandidate = result === "worse" ? undefined : followupCandidates.find((item) => !completedKeys.has(candidateTreatmentKey(item, intake.side)) && followupCandidateNeedsWork(item, mergedOutcomes));
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
    setFollowupTrialRecords((current) => current.filter((record) => record.sessionNumber !== sessionNumber));
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
    setFollowupExerciseChoices({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
  }

  function updateFollowupScore(value: number) {
    if (!followupScoreConfirmed || followupScore !== value) invalidateCurrentFollowupWork();
    setFollowupScore(value);
    setFollowupScoreConfirmed(true);
  }

  function updateFollowupTrend(id: string, value: FollowupReviewAnswer) {
    if (followupTrends[id] !== value) invalidateCurrentFollowupWork();
    setFollowupTrends((current) => ({ ...current, [id]: value }));
  }

  function finishFollowupTreatmentRetest() {
    if (!followupPostScoreConfirmed) return;
    const currentRecords = followupTrialRecords.filter((item) => item.sessionNumber === sessionNumber);
    const beforeScore = currentRecords.at(-1)?.afterScore ?? followupScore;
    setFollowupTrialRecords((current) => [...current, {
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
    const effectiveLabels = realTreatments.filter((record) => ["better", "partial"].includes(record.result)).map((record) => record.treatmentName ?? record.candidateTitle);
    const stoppedLabels = realTreatments.filter((record) => ["same", "worse"].includes(record.result)).map((record) => record.treatmentName ?? record.candidateTitle);
    const trainingItems = exercises.map((exercise) => ({
      id: exercise.id,
      label: exercise.title,
      adjustment: ((choice) => choice === "worse" ? "reduce" : choice ?? "hold")(followupExerciseChoices[exercise.id]) as "reduce" | "hold" | "progress",
    }));
    const sessionSummary: RehabSessionSummary = {
      sessionNumber,
      completedAt: sessionHistory.find((item) => item.sessionNumber === sessionNumber)?.completedAt ?? new Date().toISOString(),
      startedScore: followupScoreConfirmed ? followupScore : undefined,
      endingScore: chiefScoreComparable ? finalScore : undefined,
      reviewResults: reviewLabels,
      treatments: realTreatments.map((record) => ({ id: record.candidateId, label: record.treatmentName ?? record.candidateTitle, result: record.result, responseRole: record.responseRole })),
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
    setFollowupExerciseChoices({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setHasNewSymptom("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNextFollowupSession() {
    setSessionNumber((current) => current + 1);
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
    setFollowupExerciseChoices({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    setHasNewSymptom("");
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
      sessionNumber: 1,
      completedAt: sessionHistory.find((item) => item.sessionNumber === 1)?.completedAt ?? new Date().toISOString(),
      startedScore: chiefScoreComparable ? intake.baselineScore : undefined,
      endingScore: chiefScoreComparable ? sessionEndScore : undefined,
      reviewResults: mergeSessionReviewResults(
        firstAssessmentReviewResults,
        {},
        trialRecords,
        canonicalActionIdFromAssessmentId,
      ),
      treatments: trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly).map((record) => ({ id: record.candidateId, label: record.treatmentName ?? record.candidateTitle, result: record.result, responseRole: record.responseRole })),
      effectiveCombination: resolvedTreatmentCombination(trialRecords.filter((record) => !record.reviewOnly && !record.retestOnly)).map((record) => record.treatmentName ?? record.candidateTitle),
      continuedEffectiveTreatments: effectiveTreatmentCandidates.map(candidateTreatmentName),
      stoppedTreatments: trialRecords.filter((record) => ["same", "worse"].includes(record.result) && !record.timeBased && !record.reviewOnly && !record.retestOnly).map((record) => record.treatmentName ?? record.candidateTitle),
      resolvedProblems: [],
      training: exercises.map((exercise) => ({ id: exercise.id, label: exercise.title, adjustment: "hold" })),
      nextFocus: ["复查主诉和第一次发现的问题", "继续有效处理", "检查训练完成情况和次日反应"],
    };
    // 每次进入第二次康复都依据真实处理记录重建首诊摘要，以便旧版快照
    // 自动移除肿胀管理，并补回动态生成的有效肌肉处理。
    const firstHistory = upsertSessionSummary(sessionHistory, firstSummary);
    setSessionHistory(firstHistory);
    if (!firstSessionSaved) {
      saveRecord("待复查", sessionEndScore, { sessionHistory: firstHistory });
    }
    setFollowupMode(true);
    setSessionNumber(2);
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
    setFollowupExerciseChoices({});
    setFollowupTrainingReadyForRetest(false);
    setFollowupFinalScore(0);
    setFollowupFinalScoreConfirmed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderIntake() {
    const hasTenderness = intakeHasTenderness;
    const hasSensorySymptoms = intakeHasSensorySymptoms;
    const professionalIntake = isThinkingMode && !workflowProfile.isStudy;
    const autoProvocationTypes = new Set(parseIntake(intake.description, { ...DEFAULT_INTAKE, description: intake.description }).provocationTypes);
    const regionWasNotDetected = Boolean(intake.description.trim() && !describedRegionId);
    const describedPilotRegions = inferPilotRegions(currentComplaintText(intake.description));
    const hasMultiplePilotRegions = describedPilotRegions.length > 1;
    const mentionedBothSides = mentionsBothSymptomSides(intake.description);
    const vascularDescriptionSignal = includesAny(intake.description, ["发凉", "发白", "冰凉", "苍白"]);
    const missingFields = intakeMissingFields;
    const nextMissingField = currentIntakeField;
    const showIntakeQuestion = (...labels: string[]) => showAllIntakeFields || labels.includes(nextMissingField);
    const actionOptions = reportedActionOptions(intake.regionId);
    const selectedReportedActionIds = new Set((intake.reportedActions ?? []).map((action) => action.id));
    const updateReportedActions = (nextActions: ReportedAction[], customAction = intake.customAction) => {
      const primaryRaw = nextActions[0]?.raw || customAction.trim() || "";
      invalidateAfterIntake({
        ...intake,
        reportedActions: nextActions,
        customAction,
        actionSelectionConfirmed: true,
        reproduction: primaryRaw,
        actionAnalysis: analyzeChiefAction(intake.description, intake.regionId, intake.forceDirection, primaryRaw),
      });
    };
    if (professionalIntake && intake.parsed) {
      const professionalSymptoms = intake.symptoms ?? [];
      const professionalActionSummary = reportedActionSummary(intake);
      const professionalLocationTabs = [
        ...(professionalSymptoms.includes("肿胀或淤青") ? [{ id: "swelling" as const, label: "肿胀/淤青", count: intake.swellingLocations.length, emptyLabel: "位置不清楚" }] : []),
        ...(hasTenderness ? [{ id: "tenderness" as const, label: "按压痛", count: intake.tendernessLocations.length, emptyLabel: "位置不清楚" }] : []),
        ...(hasSensorySymptoms ? [{ id: "sensory" as const, label: "麻/电感", count: intake.sensoryLocations.length, emptyLabel: "范围不清楚" }] : []),
      ];
      const activeProfessionalLocationTab = professionalLocationTabs.some((tab) => tab.id === professionalLocationTab)
        ? professionalLocationTab
        : professionalLocationTabs[0]?.id;
      const professionalComplete = keyConfirmationReady && !unsupportedDescriptionRegion && !selfNeuralReferral && !stabbingEarlyReferral && !vascularDescriptionSignal;
      const selectProfessionalMode = (mode: ProductMode | "study") => {
        setShowAllIntakeFields(mode === "thinking");
        invalidateAfterIntake({
          ...intake,
          productMode: mode === "study" ? "thinking" : mode,
          operationTarget: mode === "guided" ? "self" : mode === "study" ? "study" : intake.operationTarget,
          userRole: mode === "guided" ? "general" : "rehab",
          examSetup: mode === "guided" ? "self" : mode === "study" ? "self" : intake.examSetup,
          capabilitiesConfirmed: mode !== "thinking" || intake.operationTarget !== "other" ? true : intake.capabilitiesConfirmed,
          learningExplanation: mode === "study",
          spineAssessmentMode: mode === "guided" ? "guided" : intake.spineAssessmentMode,
        });
      };
      const updateProfessionalSymptoms = (symptoms: string[]) => {
        setConfirmedIntakeMulti((current) => ({ ...current, symptoms: true }));
        invalidateAfterIntake({
          ...intake,
          symptoms,
          swellingLocation: symptoms.includes("肿胀或淤青") ? intake.swellingLocation : "",
          swellingLocations: symptoms.includes("肿胀或淤青") ? intake.swellingLocations : [],
          swellingLocationConfirmed: symptoms.includes("肿胀或淤青") ? intake.swellingLocationConfirmed : false,
          tendernessLocation: symptoms.includes("按压痛") ? intake.tendernessLocation : "",
          tendernessLocations: symptoms.includes("按压痛") ? intake.tendernessLocations : [],
          tendernessLocationConfirmed: symptoms.includes("按压痛") ? intake.tendernessLocationConfirmed : false,
          stabbingPalpation: intake.symptomType === "刺痛" || symptoms.includes("按压痛") || intake.provocationTypes.includes("按压") ? intake.stabbingPalpation : "",
        });
      };
      const updateProfessionalProvocation = (item: string) => {
        const unknownOption = "说不清 / 没有固定动作";
        const selected = intake.provocationTypes.includes(item);
        const selectingUnknown = item === unknownOption && !selected;
        const provocationTypes = item === unknownOption
          ? selected ? [] : [unknownOption]
          : selected
            ? intake.provocationTypes.filter((value) => value !== item)
            : [...intake.provocationTypes.filter((value) => value !== unknownOption), item];
        setConfirmedIntakeMulti((current) => ({ ...current, provocationTypes: provocationTypes.length > 0 }));
        const nextIntake = {
          ...intake,
          provocationTypes,
          reproduction: selectingUnknown ? "" : intake.reproduction,
          reportedActions: selectingUnknown ? [] : intake.reportedActions,
          customAction: selectingUnknown ? "" : intake.customAction,
          actionSelectionConfirmed: selectingUnknown ? true : intake.actionSelectionConfirmed,
          forceDirection: selectingUnknown ? "" : provocationTypes.includes("用力或对抗阻力") ? intake.forceDirection : "",
          stabbingPalpation: intake.symptomType === "刺痛" || provocationTypes.includes("按压") || intake.symptoms.includes("按压痛") ? intake.stabbingPalpation : "",
          actionAnalysis: selectingUnknown ? analyzeChiefAction(intake.description, intake.regionId, "", "") : intake.actionAnalysis,
        };
        invalidateAfterIntake({
          ...nextIntake,
          baselineScore: shouldCollectBaselineScore(nextIntake) ? intake.baselineScore : 0,
          baselineScoreConfirmed: shouldCollectBaselineScore(nextIntake) ? intake.baselineScoreConfirmed : false,
        });
      };
      return <section className="rm-page rm-professional-intake">
        <StepHeading eyebrow="第1步 · 专业症状收集" title="记录主诉与评估条件" note="一次展开填写；患者原话、专业判断和后续检查分开保存。" />

        <section className="rm-professional-banner">
          <div><span>专业工作台</span><strong>结构化录入</strong><small>不按普通用户逐题跳转，填写完需要的字段后再进入关键确认。</small></div>
          <button type="button" onClick={() => selectProfessionalMode("guided")}>切换为自助模式</button>
        </section>

        <section className="rm-professional-source">
          <header><div><span>患者原话</span><strong>不改写，作为本次主诉依据</strong></div><button type="button" onClick={rewriteIntakeDescription}>重新整理</button></header>
          <p>{intake.description || "未记录患者原话"}</p>
        </section>

        <section className="rm-professional-section">
          <header><span>01</span><div><h2>主诉部位</h2><p>先确定本次只解决的一个主要问题；同一大部位可以标记多个具体位置。</p></div></header>
          {hasMultiplePilotRegions ? <div className="rm-pilot-hint">描述涉及多个大部位。本次只保留一个主要问题，其他部位请另开评估。</div> : null}
          {mentionedBothSides ? <div className="rm-pilot-hint">双侧都不舒服时，先选择本次优先处理的一侧。</div> : null}
          <LowerLimbLocationPicker
            professional
            value={intake.bodyLocations}
            initialRegionId={intake.regionId}
            initialSide={intake.side}
            initialLocation={intake.location}
            maxSelections={3}
            onChange={(bodyLocations) => {
              const primary = bodyLocations[0];
              const regionId = primary?.regionId ?? "";
              const forceDirection = intake.regionId === regionId ? intake.forceDirection : "";
              invalidateAfterIntake({
                ...intake,
                bodyLocations,
                locationConfirmed: Boolean(primary),
                regionId,
                side: sideFromLocationSelections(bodyLocations),
                location: bodyLocations.map((item) => item.location).join("、"),
                forceDirection,
                actionAnalysis: analyzeChiefAction(intake.description, regionId, forceDirection, primaryReportedAction(intake)),
              });
            }}
          />
        </section>

        {needsSpineModeChoice ? <section className="rm-professional-section rm-professional-spine-mode"><header><span>01A</span><div><h2>脊柱活动度记录方式</h2><p>普通用户按不适和左右差异记录；有测量工具时再填写参考角度。</p></div></header><div className="rm-options rm-professional-options" style={{ "--columns": 2 } as CSSProperties}><button type="button" className={intake.spineAssessmentMode === "guided" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "guided" })}><strong>观察不适与左右差异</strong><small>不需要测量工具</small></button><button type="button" className={intake.spineAssessmentMode === "reference" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "reference" })}><strong>按参考角度记录</strong><small>有规范测量工具和协助者</small></button></div></section> : null}

        <section className="rm-professional-section">
          <header><span>02</span><div><h2>病程与发生机制</h2><p>记录时间和出现方式，供后续判断急性、反复或代偿线索。</p></div></header>
          <div className="rm-professional-fields">
            <label><b>病程</b><select value={intake.onset} onChange={(event) => invalidateAfterIntake({ ...intake, onset: event.target.value })}><option value="">请选择</option>{ONSETS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><b>发生机制</b><select value={intake.mechanism} onChange={(event) => invalidateAfterIntake({ ...intake, mechanism: event.target.value })}><option value="">请选择</option>{MECHANISMS.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </section>

        <section className="rm-professional-section">
          <header><span>03</span><div><h2>症状性质与伴随表现</h2><p>可多选；不确定的内容保留为空，不代替患者做判断。</p></div></header>
          <div className="rm-professional-symptom-groups"><div className="rm-label"><span>症状性质</span><b>选择最接近的一项</b></div>{SYMPTOM_TYPE_GROUPS.map((group) => <section key={group.title}><strong>{group.title}</strong><PillOptions options={group.options} value={intake.symptomType} onChange={(symptomType) => invalidateAfterIntake({ ...intake, symptomType, painQualityConfirmed: !["疼痛，性质说不清", "说不清的不适"].includes(symptomType), stabbingSpread: symptomType === "刺痛" ? intake.stabbingSpread : "", stabbingPalpation: (symptomType === "刺痛" || hasTenderness) ? intake.stabbingPalpation : "" })} columns={3} /></section>)}</div>
          {showAllIntakeFields && (intake.symptomType === "疼痛，性质说不清" || intake.symptomType === "说不清的不适") ? <div className="rm-professional-subfield"><div className="rm-label"><span>疼痛性质补充</span><b>仍然分不清可以保留“说不清”</b></div><PillOptions options={["酸痛", "胀痛", "刺痛", "烧灼或火辣", "牵扯或紧绷", "挤、卡或弹响", "麻或电感", "无力或不稳", "还是说不清"]} value={intake.painQualityConfirmed ? (intake.symptomType === "疼痛，性质说不清" || intake.symptomType === "说不清的不适" ? "还是说不清" : intake.symptomType) : ""} onChange={(value) => invalidateAfterIntake({ ...intake, symptomType: value === "还是说不清" ? "疼痛，性质说不清" : value, painQualityConfirmed: true })} columns={3} /></div> : null}
          <div className="rm-label rm-professional-symptom-label"><span>伴随表现</span><b>可多选；没有就选“没有以上情况”</b></div>
          <div className="rm-check-grid">{SYMPTOMS.map((symptom) => <button type="button" key={symptom} className={professionalSymptoms.includes(symptom) ? "is-selected" : ""} onClick={() => updateProfessionalSymptoms(professionalSymptoms.includes(symptom) ? professionalSymptoms.filter((item) => item !== symptom) : [...professionalSymptoms, symptom])}><i>{professionalSymptoms.includes(symptom) ? "✓" : ""}</i>{symptom}</button>)}<button type="button" className={confirmedIntakeMulti.symptoms && !professionalSymptoms.length ? "is-selected" : ""} onClick={() => updateProfessionalSymptoms([])}><i>{confirmedIntakeMulti.symptoms && !professionalSymptoms.length ? "✓" : ""}</i>没有以上情况</button></div>
          {professionalLocationTabs.length ? <div className="rm-professional-location-workbench">
            <nav className="rm-professional-location-tabs" aria-label="选择要标记的位置类型">
              {professionalLocationTabs.map((tab) => <button type="button" key={tab.id} className={activeProfessionalLocationTab === tab.id ? "is-active" : ""} onClick={() => setProfessionalLocationTab(tab.id)}><strong>{tab.label}</strong><small>{tab.count ? `已标记 ${tab.count} 处` : "尚未标记"}</small></button>)}
            </nav>
            <div className="rm-professional-location-panel">
              {activeProfessionalLocationTab === "swelling" ? <div><header><b>肿胀或淤青位置</b><span>标记所有明显区域</span></header><LowerLimbLocationPicker professional mode="swelling" value={intake.swellingLocations} initialRegionId={intake.regionId} initialSide={intake.side} initialLocation={intake.swellingLocation || intake.location} onChange={(swellingLocations) => invalidateAfterIntake({ ...intake, swellingLocations, swellingLocation: locationSelectionsLabel(swellingLocations), swellingLocationConfirmed: Boolean(swellingLocations.length) })} />{!intake.swellingLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, swellingLocation: "说不清", swellingLocations: [], swellingLocationConfirmed: true })}>位置不清楚</button> : null}</div> : null}
              {activeProfessionalLocationTab === "tenderness" ? <div><header><b>按压痛位置</b><span>轻按后标记出现明显疼痛的区域</span></header><LowerLimbLocationPicker professional mode="tenderness" value={intake.tendernessLocations} initialRegionId={intake.regionId} initialSide={intake.side} initialLocation={intake.tendernessLocation || intake.location} onChange={(tendernessLocations) => invalidateAfterIntake({ ...intake, tendernessLocations, tendernessLocation: locationSelectionsLabel(tendernessLocations), tendernessLocationConfirmed: Boolean(tendernessLocations.length) })} />{!intake.tendernessLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, tendernessLocation: "说不清", tendernessLocations: [], tendernessLocationConfirmed: true })}>位置不清楚</button> : null}</div> : null}
              {activeProfessionalLocationTab === "sensory" ? <div><header><b>麻/电感范围</b><span>标记麻、刺、电感出现的区域</span></header><LowerLimbLocationPicker professional mode="sensory" value={intake.sensoryLocations} initialRegionId={intake.regionId} initialSide={intake.side} initialLocation={intake.sensoryLocation || intake.location} onChange={(sensoryLocations) => invalidateAfterIntake({ ...intake, sensoryLocations, sensoryLocation: locationSelectionsLabel(sensoryLocations), sensoryLocationConfirmed: Boolean(sensoryLocations.length) })} />{!intake.sensoryLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, sensoryLocation: "说不清", sensoryLocations: [], sensoryLocationConfirmed: true })}>范围不清楚</button> : null}</div> : null}
            </div>
          </div> : null}
          {(intake.symptomType === "刺痛" || hasTenderness) ? <div className="rm-professional-subfield rm-professional-palpation-response"><div className="rm-label"><span>轻按反应</span><b>在刚才最不舒服的位置轻按一次；没有尝试也可以直接记录</b></div><PillOptions options={["清楚的刺痛", "钝痛或酸胀", "没有明显感觉", "没有尝试"]} value={({ sharp: "清楚的刺痛", dull: "钝痛或酸胀", none: "没有明显感觉", "not-tried": "没有尝试", "": "" } as const)[intake.stabbingPalpation]} onChange={(value) => invalidateAfterIntake({ ...intake, stabbingPalpation: ({ "清楚的刺痛": "sharp", "钝痛或酸胀": "dull", "没有明显感觉": "none", "没有尝试": "not-tried" } as const)[value] ?? "" })} columns={2} /></div> : null}
        </section>

        <section className="rm-professional-section">
          <header><span>04</span><div><h2>诱发动作与负荷</h2><p>主诉动作可多选；没有固定动作时不生成虚假的动作评分。</p></div></header>
          <div className="rm-trigger-grid">{PROVOCATION_TYPES.map((item) => { const selected = intake.provocationTypes.includes(item); const automatic = selected && autoProvocationTypes.has(item); return <button type="button" key={item} className={`${selected ? "is-selected" : ""} ${automatic ? "is-auto" : ""}`} onClick={() => { if (automatic && !window.confirm(`系统根据描述自动识别了“${item}”，确定取消吗？`)) return; updateProfessionalProvocation(item); }}><i>{selected ? "✓" : ""}</i><span>{item}{automatic ? <small>自动识别</small> : null}</span></button>; })}</div>
          <div className="rm-label rm-action-picker-label"><span>主诉动作</span><b>可多选；动作无法归类时保留原话</b></div>
          <div className="rm-action-picker-grid">{actionOptions.map((action) => <button type="button" key={action.id} className={selectedReportedActionIds.has(action.id) ? "is-selected" : ""} onClick={() => updateReportedActions(selectedReportedActionIds.has(action.id) ? (intake.reportedActions ?? []).filter((item) => item.id !== action.id) : [...(intake.reportedActions ?? []), action])}><strong>{action.label.split("｜")[0]}</strong><small>{action.label.split("｜")[1] ?? action.label}</small></button>)}</div>
          <label className="rm-custom-action-field"><span>自定义主诉动作</span><input value={intake.customAction} onChange={(event) => updateReportedActions(intake.reportedActions ?? [], event.target.value)} placeholder="例如：跨步落地、抱孩子起身、骑车踩踏" /><small>保留患者原话；没有标准关键词也不影响后续记录。</small></label>
          <button type="button" className={intake.actionSelectionConfirmed && !professionalActionSummary.length ? "is-selected rm-action-unknown" : "rm-action-unknown"} onClick={() => updateReportedActions([], "")}>说不清或没有固定动作</button>
        </section>

        {baselineScoreApplicable ? <section className="rm-professional-section"><header><span>05</span><div><h2>基线评分与恢复目标</h2><p>分数用于本次前后比较；没有明确动作时不生成分数。</p></div></header><ScoreSlider value={intake.baselineScore} selected={intake.baselineScoreConfirmed} onChange={(baselineScore) => invalidateAfterIntake({ ...intake, baselineScore, baselineScoreConfirmed: true })} label="当前主诉动作的不适程度" /><div className="rm-label rm-professional-goal-label"><span>恢复目标</span><b>选择患者希望达到的阶段</b></div><div className="rm-goals">{GOALS.map((goal) => <button type="button" key={goal.level} className={intake.goal === goal.level ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, goal: goal.level })}><i>{goal.level}</i><span><strong>{goal.title}</strong><small>{goal.short}</small></span></button>)}</div></section> : <section className="rm-professional-section"><header><span>05</span><div><h2>恢复目标</h2><p>没有固定动作时仍可记录目标，但不会伪造动作分数。</p></div></header><div className="rm-goals">{GOALS.map((goal) => <button type="button" key={goal.level} className={intake.goal === goal.level ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, goal: goal.level })}><i>{goal.level}</i><span><strong>{goal.title}</strong><small>{goal.short}</small></span></button>)}</div></section>}

        <section className="rm-professional-section">
          <header><span>06</span><div><h2>本次检查条件</h2><p>先说明由谁操作、能够完成哪些专业检查，后续评估会按此开放。</p></div></header>
          <div className="rm-options rm-professional-options" style={{ "--columns": 2 } as CSSProperties}>
            <button type="button" className={intake.operationTarget === "self" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "self", examSetup: "self", capabilitiesConfirmed: true })}><strong>自我检查</strong><small>记录主动活动与自我感受</small></button>
            <button type="button" className={intake.operationTarget === "other" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "other", examSetup: "professional-other", capabilitiesConfirmed: false })}><strong>协助他人检查</strong><small>可继续选择被动、抗阻和触诊能力</small></button>
          </div>
          {effectiveOperationTarget === "other" ? <div className="rm-professional-capabilities"><div className="rm-label"><span>可执行的检查能力</span><b>点击即生效；没有的能力可以不选</b></div><div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>{([ ["passiveRange", "被动活动度"], ["resistedStrength", "抗阻力量"], ["endFeel", "末端感觉"], ["palpation", "基础触诊"], ["specialTest", "专项检查"], ["jointMobilization", "关节处理"] ] as Array<[CapabilityKey, string]>).map(([key, label]) => <button type="button" key={key} className={intake.capabilities[key] ? "is-selected" : ""} onClick={() => invalidateAfterIntake((current) => ({ ...current, capabilities: { ...current.capabilities, [key]: !current.capabilities[key] }, capabilitiesConfirmed: true }))}>{label}</button>)}</div></div> : null}
        </section>

        <section className="rm-professional-section rm-professional-notes"><header><span>07</span><div><h2>专业备注</h2><p>记录你的判断或需要后续验证的假设，不直接等同于已确认的查体结果。</p></div></header><textarea value={intake.professionalNotes} onChange={(event) => invalidateAfterIntake({ ...intake, professionalNotes: event.target.value })} placeholder="例如：考虑外侧链参与；待活动度与抗阻结果验证。" /></section>

        {unsupportedDescriptionRegion ? <section className="rm-route-note is-waiting"><span>当前首发范围</span><h2>暂不支持{unsupportedDescriptionRegion.name}</h2><p>现在只开放大腿至足部。骨盆、臀部、腹股沟和髋关节不会被套进膝踝方案。</p></section> : null}
        {vascularDescriptionSignal ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>描述中出现发凉或发白</h2><p>这可能与末端循环有关，不要先做强刺激处理。可以保存当前信息，优先完成线下评估。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
        {selfNeuralReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>出现麻、电或感觉变化</h2><p>普通自助路径不安排神经松动或自行处理。可保存当前信息，由专业人员检查感觉范围和力量变化。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
        {stabbingEarlyReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>不活动时也会刺痛</h2><p>先确认局部刺激、外伤或其他需要医学处理的问题，可保存当前信息后再继续。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
        {/* 原先的 disabled={!professionalComplete} 会把缺项藏起来；现在改为点击后高亮并定位缺项。 */}
        <div className="rm-professional-footer"><span>{professionalComplete ? "信息已足够进入关键确认" : `还需补充：${intakeMissingFields.join("、") || "检查条件"}`}</span><div><button type="button" onClick={rewriteIntakeDescription}>重新整理原话</button>{professionalComplete && keyConfirmationReady ? <button type="button" className="rm-primary" onClick={enterKeyConfirmation}>进入关键确认</button> : null}</div></div>
      </section>;
    }
    return <section className="rm-page">
      <StepHeading eyebrow="第1步 · 症状信息收集" title={intake.parsed ? professionalIntake ? "记录主诉与评估条件" : "确认你的症状信息" : "先说说哪里不舒服"} note={intake.parsed ? professionalIntake ? "可一次填写多个字段；患者原话、检查条件和专业判断分开记录。" : undefined : "写下怎么出现的、现在什么感觉；不知道的内容可以不写。"} />
      {!intake.parsed ? <>
        <div className="rm-hero-input">
          <label htmlFor="chief-description">哪里不舒服？发生了什么？</label>
          <textarea id="chief-description" value={intake.description} onChange={(event) => setIntake((current) => ({ ...current, description: event.target.value }))} placeholder="例如：昨天打球落地时崴了右脚，现在外踝肿；或者：右膝下楼时内侧刺痛。" />
          <div><button type="button" disabled={!intake.description.trim()} onClick={() => beginGuidedIntake(parseIntake(intake.description, { ...DEFAULT_INTAKE, description: intake.description }))}>帮我整理</button></div>
        </div>
        <button type="button" className="rm-example" onClick={() => { const next = { ...DEFAULT_INTAKE, description: EXAMPLE_DESCRIPTION }; beginGuidedIntake(parseIntake(next.description, next)); }}>不知道怎么写？查看“下楼膝内侧刺痛”示例</button>
      </> : <>
        <section className="rm-collected">
          <header><div><span>已收集到的信息</span><h2>{chiefComplaintLabel(intake)}</h2></div><b>{missingFields.length ? "正在补充" : "症状信息已确认"}</b></header>
          {showAllIntakeFields && missingFields.length ? <div className="rm-missing-fields"><strong>还需要：</strong>{missingFields.map((field) => <span key={field}>{field}</span>)}</div> : null}
          <div className="rm-collected-quick">
            <span><b>部位</b>{intake.bodyLocations.length ? intake.bodyLocations.map((item) => `${item.side}·${item.location}`).join("、") : "具体位置待确认"}</span>
            <span><b>感觉</b>{intake.symptomType || "待确认"}</span>
            <span><b>时间</b>{intake.onset || "待确认"}</span>
            <span><b>动作</b>{hasClearChiefAction(intake) ? chiefActionLabel(intake) : "待确认"}</span>
          </div>
          <div className="rm-collected-actions">
            <button type="button" onClick={rewriteIntakeDescription}>重写症状描述</button>
            <button type="button" className="rm-all-info-button" onClick={() => setShowAllIntakeFields((current) => !current)}>{showAllIntakeFields ? "回到逐项补充" : "≡ 全部信息"}</button>
          </div>
        </section>

        <section className="rm-guided-status">
          <span>{showAllIntakeFields ? "全部信息" : guidedQuestionReady ? "这一项已完成" : missingFields.length > 5 ? "只补充最关键的信息" : missingFields.length ? `还需 ${missingFields.length} 项` : "信息已完成"}</span>
          <h2>{showAllIntakeFields ? "按需要修改" : nextMissingField || "你希望恢复到什么程度？"}</h2>
          <p>{showAllIntakeFields ? "只改需要调整的内容即可。" : missingFields.length || guidedQuestionReady ? "选好后直接点下一步。" : "信息已补充完成。"}</p>
        </section>
        {!showAllIntakeFields ? <nav className="rm-guided-nav" aria-label="症状信息问题导航">
          <button type="button" disabled={guidedIntakePath.length === 0 || (guidedIntakeField ? guidedIntakePath.indexOf(guidedIntakeField) <= 0 : guidedIntakeCursor <= 0)} onClick={returnToPreviousIntakeQuestion}>← 上一步</button>
          {nextMissingField ? <button type="button" className="rm-primary" disabled={!guidedQuestionReady} onClick={() => advanceGuidedQuestion(nextMissingField)}>下一步 →</button> : null}
        </nav> : null}

        {unsupportedDescriptionRegion ? <section className="rm-route-note is-waiting">
          <span>当前首发范围</span><h2>暂不支持{unsupportedDescriptionRegion.name}</h2>
          <p>现在只开放大腿至足部。骨盆、臀部、腹股沟和髋关节不会被套进膝踝方案。</p>
        </section> : null}
        {vascularDescriptionSignal ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>描述中出现发凉或发白</h2><p>这可能与末端循环有关，不要先做强刺激处理。可以保存当前信息，优先完成线下评估。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}

        {showIntakeQuestion("使用方式", "使用身份") ? <div className="rm-form-block rm-role-choice">
          <div className="rm-label"><span>这次使用哪种模式？</span></div>
          <div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>
            {([[ 
              "guided", "自助康复", "跟随一步一步的提示完成"
            ], [
              "thinking", "康复思路模式", "按阶段记录检查、处理和复测"
            ]] as Array<[ProductMode, string, string]>).map(([mode, label, note]) => {
              const selected = intake.productMode === mode;
              return <button type="button" key={mode} className={selected ? "is-selected" : ""} onClick={() => {
                setShowAllIntakeFields(mode === "thinking");
                invalidateAfterIntake({
                  ...intake,
                  productMode: mode,
                  operationTarget: mode === "guided" ? "self" : "",
                  userRole: mode === "guided" ? "general" : "rehab",
                  examSetup: mode === "guided" ? "self" : "",
                  capabilities: emptyCapabilities(),
                  capabilitiesConfirmed: mode !== "thinking",
                  learningExplanation: false,
                  spineAssessmentMode: mode === "guided" ? "guided" : "",
                });
              }}><strong>{label}</strong><small>{note}</small></button>;
            })}
          </div>
        </div> : null}

        {showExamSetupChoice && showIntakeQuestion("操作对象", "检查方式") ? <div className="rm-form-block rm-exam-setup-choice">
          <div className="rm-label"><span>这次怎样完成检查？</span><b>这次由谁完成检查？选择给自己检查，还是给别人检查</b></div>
          <div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>
            <button type="button" className={intake.operationTarget === "self" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "self", examSetup: "self", capabilitiesConfirmed: true })}><strong>给自己检查</strong><small>自己跟随提示检查，只记录主动活动</small></button>
            <button type="button" className={intake.operationTarget === "other" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "other", examSetup: "professional-other", capabilitiesConfirmed: true })}><strong>给别人检查</strong><small>我在给别人检查，能力选项点击即生效</small></button>
          </div>
        </div> : null}

        {showCapabilitiesChoice && showIntakeQuestion("检查能力") ? <div className="rm-form-block rm-capability-choice">
          <div className="rm-label"><span>这次可以完成哪些检查？</span><b>点击即生效；没有的能力可以不选</b></div>
          <div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>
            {([
              ["passiveRange", "被动活动度"], ["resistedStrength", "抗阻力量"], ["endFeel", "末端感觉"],
              ["palpation", "基础触诊"], ["specialTest", "专项检查"], ["jointMobilization", "关节处理"],
            ] as Array<[CapabilityKey, string]>).map(([key, label]) => <button type="button" key={key} className={intake.capabilities[key] ? "is-selected" : ""} onClick={() => invalidateAfterIntake((current) => ({ ...current, capabilities: { ...current.capabilities, [key]: !current.capabilities[key] }, capabilitiesConfirmed: true }))}>{label}</button>)}
          </div>
        </div> : null}

        {needsSpineModeChoice && showIntakeQuestion("活动度检查方式") ? <div className="rm-form-block rm-spine-mode-choice">
          <div className="rm-label"><span>这次怎样判断脊柱活动？</span></div>
          <div className="rm-options" style={{ "--columns": 2 } as CSSProperties}>
            <button type="button" className={intake.spineAssessmentMode === "guided" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "guided" })}><strong>跟随提示观察</strong><small>不需要测量工具</small></button>
            <button type="button" className={intake.spineAssessmentMode === "reference" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "reference" })}><strong>按参考角度判断</strong><small>我会规范测量且有工具</small></button>
          </div>
        </div> : null}

        {showIntakeQuestion("不舒服的位置") ? <>
          {hasMultiplePilotRegions ? <div className="rm-pilot-hint">你提到了多个位置。本版一次只评估一个主要问题，请选择这次最想解决的位置；其他问题请另开一次评估。</div> : regionWasNotDetected ? <div className="rm-pilot-hint">没有准确识别位置，请直接在图上选择。</div> : mentionedBothSides ? <div className="rm-pilot-hint">如果两侧是同一个问题，可选择更影响你的那一侧先评估；另一侧请另开一次评估。</div> : null}
          <LowerLimbLocationPicker
            value={intake.bodyLocations}
            initialRegionId={intake.regionId}
            initialSide={intake.side}
            initialLocation={intake.location}
            maxSelections={3}
            onChange={(bodyLocations) => {
              const primary = bodyLocations[0];
              const regionId = primary?.regionId ?? "";
              const forceDirection = intake.regionId === regionId ? intake.forceDirection : "";
              invalidateAfterIntake({
                ...intake,
                bodyLocations,
                locationConfirmed: Boolean(primary),
                regionId,
                side: sideFromLocationSelections(bodyLocations),
                location: bodyLocations.map((item) => item.location).join("、"),
                forceDirection,
                actionAnalysis: analyzeChiefAction(intake.description, regionId, forceDirection, primaryReportedAction(intake)),
              });
            }}
          />
        </> : null}

        {showIntakeQuestion("不适感觉") ? <div className="rm-form-block rm-symptom-type-groups"><div className="rm-label"><span>最接近哪种感觉</span></div>{SYMPTOM_TYPE_GROUPS.map((group) => <section key={group.title}><strong>{group.title}</strong><PillOptions options={group.options} value={intake.symptomType} onChange={(symptomType) => invalidateAfterIntake({ ...intake, symptomType, painQualityConfirmed: !["疼痛，性质说不清", "说不清的不适"].includes(symptomType), stabbingSpread: symptomType === "刺痛" ? intake.stabbingSpread : "", stabbingPalpation: (symptomType === "刺痛" || intakeHasTenderness) ? intake.stabbingPalpation : "" })} columns={3} /></section>)}</div> : null}

        {showIntakeQuestion("疼痛性质") ? <div className="rm-form-block rm-pain-quality-choice">
          <div className="rm-label"><span>你更接近哪一种感觉？</span><b>如果还是分不清，可以保留“说不清”</b></div>
          <PillOptions
            options={["酸痛", "胀痛", "刺痛", "烧灼或火辣", "牵扯或紧绷", "挤、卡或弹响", "麻或电感", "无力或不稳", "还是说不清"]}
            value={intake.painQualityConfirmed ? (intake.symptomType === "疼痛，性质说不清" || intake.symptomType === "说不清的不适" ? "还是说不清" : intake.symptomType) : ""}
            onChange={(value) => invalidateAfterIntake({ ...intake, symptomType: value === "还是说不清" ? "疼痛，性质说不清" : value, painQualityConfirmed: true })}
            columns={3}
          />
        </div> : null}

        {(intake.symptomType === "刺痛" || intakeHasTenderness) && showIntakeQuestion("刺痛出现范围", "轻按反应") ? <div className="rm-form-block rm-stabbing-check">
          {intake.symptomType === "刺痛" && (showAllIntakeFields || nextMissingField === "刺痛出现范围") ? <><div className="rm-label"><span>刺痛还会在什么时候出现？</span></div><PillOptions options={["只有刚才那个动作", "好几个动作都会", "不活动时也会", "说不清"]} value={({ single: "只有刚才那个动作", multiple: "好几个动作都会", rest: "不活动时也会", unsure: "说不清", "": "" } as const)[intake.stabbingSpread]} onChange={(value) => invalidateAfterIntake({ ...intake, stabbingSpread: ({ "只有刚才那个动作": "single", "好几个动作都会": "multiple", "不活动时也会": "rest", "说不清": "unsure" } as const)[value] ?? "" })} columns={2} /></> : null}
          {showAllIntakeFields || nextMissingField === "轻按反应" ? <><div className="rm-label"><span>在刚才最不舒服的位置轻按一次，会出现什么？</span></div><PillOptions options={["清楚的刺痛", "钝痛或酸胀", "没有明显感觉", "没有尝试"]} value={({ sharp: "清楚的刺痛", dull: "钝痛或酸胀", none: "没有明显感觉", "not-tried": "没有尝试", "": "" } as const)[intake.stabbingPalpation]} onChange={(value) => invalidateAfterIntake({ ...intake, stabbingPalpation: ({ "清楚的刺痛": "sharp", "钝痛或酸胀": "dull", "没有明显感觉": "none", "没有尝试": "not-tried" } as const)[value] ?? "" })} columns={2} /></> : null}
        </div> : null}

        {showIntakeQuestion("诱发场景") ? <div className="rm-form-block rm-provocation-block">
          <div className="rm-label"><span>{professionalIntake ? "诱发动作与负荷" : "什么情况下最容易出现？"}</span><b>可多选；不知道可以跳过具体动作</b></div>
          <div className="rm-trigger-grid">{PROVOCATION_TYPES.map((item) => {
          const selected = intake.provocationTypes.includes(item);
          const automatic = selected && autoProvocationTypes.has(item);
          return <button type="button" key={item} className={`${selected ? "is-selected" : ""} ${automatic ? "is-auto" : ""}`} onClick={() => {
            if (automatic && !window.confirm(`系统根据描述自动识别了“${item}”，确定取消吗？`)) return;
            const unknownOption = "说不清 / 没有固定动作";
            const selectingUnknown = item === unknownOption && !selected;
            const provocationTypes = item === unknownOption
              ? selected ? [] : [unknownOption]
              : (selected ? intake.provocationTypes.filter((value) => value !== item) : [...intake.provocationTypes.filter((value) => value !== unknownOption), item]);
            setConfirmedIntakeMulti((current) => ({ ...current, provocationTypes: provocationTypes.length > 0 }));
            const nextIntake = {
              ...intake,
              provocationTypes,
              reproduction: selectingUnknown ? "" : intake.reproduction,
              reportedActions: selectingUnknown ? [] : intake.reportedActions,
              customAction: selectingUnknown ? "" : intake.customAction,
              actionSelectionConfirmed: selectingUnknown ? true : intake.actionSelectionConfirmed,
              forceDirection: selectingUnknown ? "" : provocationTypes.includes("用力或对抗阻力") ? intake.forceDirection : "",
              stabbingPalpation: intake.symptomType === "刺痛" || provocationTypes.includes("按压") || intake.symptoms.includes("按压痛") ? intake.stabbingPalpation : "",
              actionAnalysis: selectingUnknown ? analyzeChiefAction(intake.description, intake.regionId, "", "") : intake.actionAnalysis,
            };
            invalidateAfterIntake({
              ...nextIntake,
              baselineScore: shouldCollectBaselineScore(nextIntake) ? intake.baselineScore : 0,
              baselineScoreConfirmed: shouldCollectBaselineScore(nextIntake) ? intake.baselineScoreConfirmed : false,
            });
          }}><i>{selected ? "✓" : ""}</i><span>{item}{automatic ? <small>自动识别</small> : null}</span></button>;
          })}</div>
        </div> : null}

        {showIntakeQuestion("具体动作") ? <div className="rm-form-block rm-action-picker-block">
          <div className="rm-label rm-action-picker-label"><span>{professionalIntake ? "主诉动作" : "具体是哪个动作？"}</span><b>可以多选；没有合适的动作可自己填写</b></div>
          <div className="rm-action-picker-grid">{actionOptions.map((action) => <button type="button" key={action.id} className={selectedReportedActionIds.has(action.id) ? "is-selected" : ""} onClick={() => {
            const nextActions = selectedReportedActionIds.has(action.id)
              ? (intake.reportedActions ?? []).filter((item) => item.id !== action.id)
              : [...(intake.reportedActions ?? []), action];
            updateReportedActions(nextActions);
          }}><strong>{action.label.split("｜")[0]}</strong><small>{action.label.split("｜")[1] ?? action.label}</small></button>)}</div>
          <label className="rm-custom-action-field"><span>没有合适的动作？</span><input value={intake.customAction} onChange={(event) => updateReportedActions(intake.reportedActions ?? [], event.target.value)} placeholder="例如：打球跨步、抱孩子起身、骑车踩踏" /><small>保留你的原话，后面会让你重复这个动作复测，不要求一定匹配标准词。</small></label>
          <button type="button" className={intake.actionSelectionConfirmed && !reportedActionSummary(intake).length ? "is-selected rm-action-unknown" : "rm-action-unknown"} onClick={() => invalidateAfterIntake({
            ...intake,
            provocationTypes: ["说不清 / 没有固定动作"],
            reproduction: "",
            reportedActions: [],
            customAction: "",
            actionSelectionConfirmed: true,
            actionAnalysis: analyzeChiefAction(intake.description, intake.regionId, "", ""),
          })}>说不清或没有固定动作</button>
        </div> : null}

        {baselineScoreApplicable && showIntakeQuestion("不适分数") ? <ScoreSlider value={intake.baselineScore} selected={intake.baselineScoreConfirmed} onChange={(baselineScore) => invalidateAfterIntake({ ...intake, baselineScore, baselineScoreConfirmed: true })} label="现在的疼痛或不适有多重？" /> : null}

        {showIntakeQuestion("出现多久", "发生方式") ? <div className={`rm-two-columns ${!showAllIntakeFields ? "is-guided-single" : ""}`}>
          {showAllIntakeFields || nextMissingField === "出现多久" ? <div className="rm-form-block"><div className="rm-label"><span>这个问题出现多久了？</span></div><select value={intake.onset} onChange={(event) => invalidateAfterIntake({ ...intake, onset: event.target.value })}><option value="">请选择时间</option>{ONSETS.map((item) => <option key={item}>{item}</option>)}</select></div> : null}
          {showAllIntakeFields || nextMissingField === "发生方式" ? <div className="rm-form-block"><div className="rm-label"><span>它是怎么出现的？</span></div><select value={intake.mechanism} onChange={(event) => invalidateAfterIntake({ ...intake, mechanism: event.target.value })}><option value="">请选择发生方式</option>{MECHANISMS.map((item) => <option key={item}>{item}</option>)}</select></div> : null}
        </div> : null}

        {showIntakeQuestion("目前情况") ? <div className="rm-form-block"><div className="rm-label"><span>{professionalIntake ? "主要症状和伴随表现" : "目前有哪些情况"}</span><b>可多选</b></div><div className="rm-check-grid">{SYMPTOMS.map((symptom) => <button type="button" key={symptom} className={intake.symptoms.includes(symptom) ? "is-selected" : ""} onClick={() => { setConfirmedIntakeMulti((current) => ({ ...current, symptoms: true })); toggleArray(symptom, intake.symptoms, (symptoms) => invalidateAfterIntake({
          ...intake,
          symptoms,
          swellingLocation: symptoms.includes("肿胀或淤青") ? intake.swellingLocation : "",
          swellingLocations: symptoms.includes("肿胀或淤青") ? intake.swellingLocations : [],
          swellingLocationConfirmed: symptoms.includes("肿胀或淤青") ? intake.swellingLocationConfirmed : false,
          tendernessLocation: symptoms.includes("按压痛") ? intake.tendernessLocation : "",
          tendernessLocations: symptoms.includes("按压痛") ? intake.tendernessLocations : [],
          tendernessLocationConfirmed: symptoms.includes("按压痛") ? intake.tendernessLocationConfirmed : false,
          stabbingPalpation: intake.symptomType === "刺痛" || symptoms.includes("按压痛") || intake.provocationTypes.includes("按压") ? intake.stabbingPalpation : "",
        })); }}><i>{intake.symptoms.includes(symptom) ? "✓" : ""}</i>{symptom}</button>)}<button type="button" className={confirmedIntakeMulti.symptoms && !intake.symptoms.length ? "is-selected" : ""} onClick={() => { setConfirmedIntakeMulti((current) => ({ ...current, symptoms: true })); invalidateAfterIntake({ ...intake, symptoms: [], swellingLocation: "", swellingLocations: [], swellingLocationConfirmed: false, tendernessLocation: "", tendernessLocations: [], tendernessLocationConfirmed: false, stabbingPalpation: intake.symptomType === "刺痛" || intake.provocationTypes.includes("按压") ? intake.stabbingPalpation : "" }); }}><i>{confirmedIntakeMulti.symptoms && !intake.symptoms.length ? "✓" : ""}</i>没有以上情况</button></div></div> : null}

        {(intake.symptoms.includes("肿胀或淤青") || hasTenderness || hasSensorySymptoms) && showIntakeQuestion("肿胀位置", "按压痛位置", "麻电范围") ? <div className="rm-location-detail-atlas">
          {intake.symptoms.includes("肿胀或淤青") && (showAllIntakeFields || nextMissingField === "肿胀位置") ? <>
            <LowerLimbLocationPicker
              mode="swelling"
              value={intake.swellingLocations}
              initialRegionId={intake.regionId}
              initialSide={intake.side}
              initialLocation={intake.swellingLocation || intake.location}
              onChange={(swellingLocations) => invalidateAfterIntake({ ...intake, swellingLocations, swellingLocation: locationSelectionsLabel(swellingLocations), swellingLocationConfirmed: Boolean(swellingLocations.length) })}
            />
            {!intake.swellingLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, swellingLocation: "说不清", swellingLocations: [], swellingLocationConfirmed: true })}>暂时说不清位置</button> : null}
          </> : null}
          {hasTenderness && (showAllIntakeFields || nextMissingField === "按压痛位置") ? <>
            <LowerLimbLocationPicker
              mode="tenderness"
              value={intake.tendernessLocations}
              initialRegionId={intake.regionId}
              initialSide={intake.side}
              initialLocation={intake.tendernessLocation || intake.location}
              onChange={(tendernessLocations) => invalidateAfterIntake({ ...intake, tendernessLocations, tendernessLocation: locationSelectionsLabel(tendernessLocations), tendernessLocationConfirmed: Boolean(tendernessLocations.length) })}
            />
            {!intake.tendernessLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, tendernessLocation: "说不清", tendernessLocations: [], tendernessLocationConfirmed: true })}>暂时说不清位置</button> : null}
          </> : null}
          {hasSensorySymptoms && (showAllIntakeFields || nextMissingField === "麻电范围") ? <>
            <LowerLimbLocationPicker
              mode="sensory"
              value={intake.sensoryLocations}
              initialRegionId={intake.regionId}
              initialSide={intake.side}
              initialLocation={intake.sensoryLocation || intake.location}
              onChange={(sensoryLocations) => invalidateAfterIntake({ ...intake, sensoryLocations, sensoryLocation: locationSelectionsLabel(sensoryLocations), sensoryLocationConfirmed: Boolean(sensoryLocations.length) })}
            />
            {!intake.sensoryLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, sensoryLocation: "说不清", sensoryLocations: [], sensoryLocationConfirmed: true })}>暂时说不清范围</button> : null}
          </> : null}
        </div> : null}

        {showAllIntakeFields ? <div className="rm-form-block rm-prior-care"><div className="rm-label"><span>之前做过哪些处理？</span><b>选填</b></div><div className="rm-check-grid">{PRIOR_CARE_OPTIONS.map((item) => <button type="button" key={item} className={(intake.priorCare ?? []).includes(item) ? "is-selected" : ""} onClick={() => toggleArray(item, intake.priorCare ?? [], (priorCare) => invalidateAfterIntake({ ...intake, priorCare }))}><i>{(intake.priorCare ?? []).includes(item) ? "✓" : ""}</i>{item}</button>)}</div></div> : null}

        {showIntakeQuestion("恢复目标") ? <div className="rm-form-block"><div className="rm-label"><span>你希望最后恢复到什么程度？</span></div><div className="rm-goals">{GOALS.map((goal) => <button type="button" key={goal.level} className={intake.goal === goal.level ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, goal: goal.level })}><i>{goal.level}</i><span><strong>{goal.title}</strong><small>{goal.short}</small></span></button>)}</div></div> : null}

        {selfNeuralReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>出现麻、电或感觉变化</h2><p>普通自助路径不安排神经松动或自行处理。不必补完其余问题，可以直接保存退出，由专业人员检查感觉范围和力量变化。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
        {stabbingEarlyReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>不活动时也会刺痛</h2><p>先确认局部刺激、外伤或其他需要医学处理的问题。不必补完其余问题，可以直接保存退出。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
        {!unsupportedDescriptionRegion && !selfNeuralReferral && !stabbingEarlyReferral && !vascularDescriptionSignal ? <div className="rm-page-actions rm-intake-actions"><span>{keyConfirmationReady ? "症状信息已经够用了" : "还有信息需要补充"}</span>{keyConfirmationReady ? <button type="button" className="rm-primary" onClick={enterKeyConfirmation}>进入关键确认</button> : null}</div> : null}
      </>}
    </section>;
  }

  function renderSafety() {
    const boneQuestions = [
      { id: "boneSpot", title: "最明显的压痛是否集中在脚踝两侧突出的骨头、足外侧骨头突起或足弓内侧骨头突起？", note: "普通软组织压痛、肿胀和淤青不算；分不清就选“不确定”。" },
      { id: "walkThen", title: "刚受伤后，你当时能否自己连续走四步？", note: "可以跛行；这里回忆当时的承重能力，不要现在重新强行测试。" },
      { id: "walkNow", title: "现在能否在安全扶持下连续走四步？", note: "不能因为明显疼痛承重时选“不能”；不需要硬走来证明可以。" },
    ];
    return <section className="rm-page">
      <StepHeading eyebrow="第2步 · 开始前确认" title="先确认能否安全开始检查" />
      <nav className="rm-safety-stages"><span className={safetyStage === 0 ? "is-current" : safetyAnswered ? "is-done" : ""}>1 安全信号</span>{needsBoneQuestions ? <span className={safetyStage === 1 ? "is-current" : safetyStage > 1 ? "is-done" : ""}>2 骨性风险</span> : null}<span className={safetyStage === 2 ? "is-current" : ""}>{needsBoneQuestions ? "3" : "2"} 影像结论</span></nav>
      {(intake.priorCare ?? []).length ? <section className="rm-prior-care-note">
        <span>之前已经做过</span>
        <strong>{(intake.priorCare ?? []).join("、")}</strong>
        {imaging.includes("未见骨折") ? <p>描述中提到拍片未见骨折，已经带入影像结论；最后一步仍可修改。</p> : intake.priorCare.includes("拍过片") ? <p>请在影像结论中选择报告写明的情况，不需要粘贴报告原文。</p> : intake.priorCare.includes("看过医生") ? <p>继续时请以医生已经说明的活动和负重限制为准。</p> : null}
        {intake.priorCare.includes("用过冰敷") ? <p>冰敷不作为恢复必做项；目前证据不能确认它能改善急性踝扭伤的肿胀、活动度或恢复。</p> : null}
      </section> : null}
      {safetyStage === 0 ? <div className="rm-safety-list">{activeSafetyItems.map((item) => <article key={item.id}><div><strong>{item.text}</strong><span>{item.note}</span></div><div>{(["no", "yes"] as YesNo[]).map((answer) => <button type="button" key={answer} className={`${safety[item.id] === answer ? "is-selected" : ""} ${answer === "yes" ? "is-alert" : ""}`} onClick={() => setSafety((current) => ({ ...current, [item.id]: answer }))}>{answer === "no" ? "没有" : "有"}</button>)}</div></article>)}</div> : null}

      {safetyStage === 1 && needsBoneQuestions ? <section className="rm-bone-check">
        <header><span>急性崴脚后，是否建议优先拍片？</span><p>回答下面3个问题。</p></header>
        {boneQuestions.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.note}</span></div><div>{(["yes", "no", "unsure"] as const).map((answer) => <button type="button" key={answer} className={boneRisk[item.id] === answer ? "is-selected" : ""} onClick={() => setBoneRisk((current) => ({ ...current, [item.id]: answer }))}>{answer === "yes" ? item.id === "boneSpot" ? "是" : "能" : answer === "no" ? item.id === "boneSpot" ? "不是" : "不能" : "不确定"}</button>)}</div></article>)}
        {boneQuestionsAnswered ? <div className={boneImagingSuggested ? "is-review" : "is-clear"}><strong>{boneImagingSuggested ? "建议优先结合影像确认" : "目前没有明显的拍片优先线索"}</strong><span>{boneImagingSuggested ? "这不等于骨折。没有明显错位或其他危险信号时，可以先做轻柔检查；暂不跳跃、不强压。" : "疼痛或承重能力持续变差时重新评估。"}</span></div> : null}
      </section> : null}

      {safetyStage === 2 ? <div className="rm-form-block"><div className="rm-label"><span>已有影像或医生结论</span><b>不要求粘贴报告原文</b></div><div className="rm-imaging">{IMAGING_OPTIONS.map((option) => <button type="button" key={option} className={imaging.includes(option) ? "is-selected" : ""} onClick={() => {
        const exclusive = ["没有做影像", "未见骨折", "有骨折或骨裂异常"];
        if (exclusive.includes(option)) setImaging((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current.filter((item) => !exclusive.includes(item)), option]);
        else toggleArray(option, imaging, setImaging);
      }}>{option}</button>)}</div></div> : null}

      {safetyStage === 2 && hasSafetySignal && !hasClearance ? <section className="rm-route-note is-waiting"><span>接下来</span><h2>先完成针对性医学评估</h2><p>明显错位、远端感觉或循环异常、力量持续下降以及发热伴快速加重，不适合继续普通检查。本次信息会保存。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : safetyStage === 2 && structuralImagingSignal && !hasClearance ? <section className="rm-route-note is-waiting"><span>先确认医生意见</span><h2>影像提示结构异常</h2><p>先明确允许的负重、活动范围和训练时间。获得医生允许后，可以回到本次记录继续评估。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : safetyStage === 2 && safetyAnswered && boneQuestionsAnswered && imaging.length > 0 ? <section className="rm-route-note is-clear"><span>接下来</span><h2>{boneImagingSuggested && imaging.includes("没有做影像") ? "先做轻柔检查，同时安排影像确认" : "开始本次功能检查"}</h2></section> : null}

      {(structuralImagingSignal || imaging.includes("医生有限制")) && <p className="rm-inline-note">后续只在医生允许的负重、活动范围和时间内进行；系统不会覆盖医生限制。</p>}

      <div className="rm-page-actions split">
        <button type="button" onClick={() => safetyStage === 0 ? goToStep(0) : setSafetyStage(safetyStage === 2 && !needsBoneQuestions ? 0 : Math.max(0, safetyStage - 1) as 0 | 1 | 2)}>{safetyStage === 0 ? "返回症状信息" : "上一步"}</button>
        {safetyStage === 0 ? <button type="button" className="rm-primary" disabled={!safetyAnswered} onClick={() => setSafetyStage(needsBoneQuestions ? 1 : 2)}>{hasSafetySignal ? "继续填写医生结论" : needsBoneQuestions ? "继续确认骨性风险" : "继续填写影像结论"}</button> : safetyStage === 1 ? <button type="button" className="rm-primary" disabled={!boneQuestionsAnswered} onClick={() => setSafetyStage(2)}>继续填写影像结论</button> : <button type="button" className="rm-primary" disabled={!canContinueSafety} onClick={() => goToStep(2)}>开始评估检查</button>}
      </div>
    </section>;
  }

  function renderAssessment() {
    if (adverseResponse && (!adverseCaptureComplete(adverseResponse) || !adverseConfirmedAssessmentIds.includes("__capture__"))) {
      const updateEvent = (patch: Partial<AdverseResponseEvent>) => setAdverseResponse((current) => current ? { ...current, ...patch } : current);
      const answerButtons = (field: "settledAfterStopping" | "locationChanged" | "symptomChanged" | "neuralOrWeakness", labels: [string, string]) => <div className="rm-adverse-options">{(["yes", "no"] as const).map((value) => <button type="button" key={value} className={adverseResponse[field] === value ? "is-selected" : ""} onClick={() => updateEvent({ [field]: value })}>{value === "yes" ? labels[0] : labels[1]}</button>)}</div>;
      return <section className="rm-page rm-adverse-page">
        <StepHeading eyebrow="异常反应确认" title={`${adverseResponse.sourceLabel}后更不舒服`} />
        <section className="rm-adverse-source"><span>{adverseResponse.source === "training" ? "训练动作" : adverseResponse.source === "treatment" ? "针对性处理" : "稍后反应"}</span><strong>{adverseResponse.sourceLabel}</strong><p>先停止这项内容，再确认现在的变化。</p></section>
        <ScoreSlider value={adverseResponse.afterScore} selected={adverseResponse.afterScoreConfirmed} onChange={(afterScore) => updateEvent({ afterScore, afterScoreConfirmed: true })} label="停止后，现在有多不舒服？" context={`之前 ${adverseResponse.beforeScore}/10`} />
        <div className="rm-adverse-questions">
          <article><strong>停止后是否逐渐回到之前的程度？</strong>{answerButtons("settledAfterStopping", ["是，逐渐回落", "没有，仍然更重"])}</article>
          <article><strong>不舒服的位置有没有改变？</strong>{answerButtons("locationChanged", ["位置变了", "位置没变"])}</article>
          <article><strong>感觉的性质有没有改变？</strong>{answerButtons("symptomChanged", ["感觉变了", "感觉没变"])}</article>
          <article><strong>有没有新出现麻、电感或明显无力？</strong>{answerButtons("neuralOrWeakness", ["有", "没有"])}</article>
        </div>
        <div className="rm-page-actions split"><button type="button" onClick={() => saveRecord("待复查")}>保存，稍后继续</button><button type="button" className="rm-primary" disabled={!adverseCaptureComplete(adverseResponse)} onClick={() => setAdverseConfirmedAssessmentIds(["__capture__"])}>确认并继续</button></div>
      </section>;
    }
    if (adverseResponse && adverseResolution === "stop-and-refer") return <section className="rm-page rm-adverse-page">
      <StepHeading eyebrow="异常反应" title="本次先停止" />
      <section className="rm-complete-panel is-referral"><span>{adverseResponse.sourceLabel}</span><h2>停止后仍明显加重或出现新的感觉、力量变化</h2><p>本次不继续增加处理或训练，保存当前记录并安排专业评估。</p><div className="rm-page-actions split"><button type="button" onClick={() => saveRecord("待医学评估")}>保存并结束</button><button type="button" className="rm-primary" onClick={() => goToStep(0)}>补充症状变化</button></div></section>
    </section>;
    if (adverseResponse && adverseResolution === "regress-training") return <section className="rm-page rm-adverse-page">
      <StepHeading eyebrow="训练调整" title="先降低一个难度变量" />
      <section className="rm-adverse-source"><span>停止当前版本</span><strong>{adverseResponse.sourceLabel}</strong><p>改小动作范围、减少个数或换成更稳定的体位，只试一小组。</p></section>
      <div className="rm-page-actions split"><button type="button" onClick={() => setAdverseResponse((current) => current ? { ...current, regressionAttempted: true, settledAfterStopping: "no" } : current)}>退阶后仍然加重</button><button type="button" className="rm-primary" onClick={() => {
        setExerciseFeedback((current) => ({ ...current, [adverseResponse.sourceId]: { ...(current[adverseResponse.sourceId] ?? { completed: 1, reserve: 0 }), formChanged: true, symptom: "same" } }));
        setFollowupExerciseChoices((current) => current[adverseResponse.sourceId] ? { ...current, [adverseResponse.sourceId]: "reduce" } : current);
        setTreatmentPlanRevision(adverseResponse.assessmentRevision);
        restoreAdverseReturn(adverseResponse, "training");
        setAdverseResponse(null);
        setAdverseConfirmedAssessmentIds([]);
        setStep(4);
        setToast("已保留退阶版本；本次不再进阶");
      }}>采用退阶版本</button></div>
    </section>;
    if (isThinkingMode && thinkingWorkbenchOpen && !assessmentSummaryOpen && !sharedTensionOpen) return renderThinkingWorkbench();
    const visibleAssessmentIndex = Math.min(assessmentIndex, Math.max(assessmentDisplayItems.length - 1, 0));
    const item = assessmentDisplayItems[visibleAssessmentIndex];
    const focusedReassessmentActive = Boolean(adverseResponse && adverseResolution === "focused-reassessment");
    const focusedAssessmentIds = adverseResponse?.relatedAssessmentIds.filter((id) => assessments.some((entry) => entry.id === id)) ?? [];
    const focusedAssessmentPosition = focusedAssessmentIds.indexOf(item?.id ?? "");
    if (!item) return <section className="rm-page"><StepHeading eyebrow="第3步 · 评估检查" title="先确认身体区域" /><button type="button" className="rm-primary" onClick={() => goToStep(0)}>返回补充信息</button></section>;
    if (sharedTensionOpen && sharedTensionRequired) {
      const tensionComparisonLabel = intake.side === "双侧/中间" ? "两侧感觉接近" : "没有明显差别";
      const tensionContext = `${intake.location} ${intake.description} ${intake.symptomType} ${intake.provocationTypes.join(" ")}`;
      const locations = [...new Set(limitedPilotMotionItems.flatMap((motionItem) => tensionLocationOptions(motionItem.id.replace(/^motion:/, ""), tensionContext)))];
      const selectedLocations = sharedTensionRecord.tensionLocations ?? [];
      return <section className="rm-page">
        <StepHeading eyebrow={`第3步 · 评估检查 ${assessments.length + 1}/${assessments.length + 1}`} title="相关肌肉紧张度检查" />
        <article className="rm-check-card rm-shared-tension-check">
          <header><i>肌</i><div><span>肌肉紧张度双侧比较</span><strong>相关区域只检查一次</strong></div></header>
          <section><b>怎么做</b><p>{intake.side === "双侧/中间" ? "左、右两侧使用相近力度，用指腹依次轻按下面区域。" : "先按另一侧，再用相近力度轻按不舒服的一侧。"}</p></section>
          <section><b>选择结果</b><p>把明显更紧或更酸的区域选出来；这些区域只统一检查一次。</p></section>
          <div className="rm-result-grid">{[...locations, tensionComparisonLabel].map((location) => {
            const selected = selectedLocations.includes(location);
            return <button type="button" key={location} className={selected ? "is-selected" : ""} onClick={() => {
              updateAssessment(SHARED_TENSION_ASSESSMENT_ID, (latestRecord) => {
                const latestLocations = latestRecord.tensionLocations ?? [];
                const alreadySelected = latestLocations.includes(location);
                const next = location === tensionComparisonLabel
                  ? alreadySelected ? [] : [location]
                  : alreadySelected
                    ? latestLocations.filter((entry) => entry !== location)
                    : [...latestLocations.filter((entry) => !["没有明显差别", "两侧感觉接近"].includes(entry)), location];
                return { tensionChecked: true, tensionLocations: next };
              }, true);
            }}>{location}</button>;
          })}</div>
          <p className="rm-choice-hint">不要按骨头、关节缝或明显肿胀中心；出现刺痛、麻或电感就停止。</p>
        </article>
        <div className="rm-page-actions split"><button type="button" onClick={() => setSharedTensionOpen(false)}>返回活动检查</button><button type="button" className="rm-primary" disabled={!sharedTensionComplete} onClick={() => {
          setSharedTensionOpen(false);
          if (focusedReassessmentActive && adverseResponse) finishFocusedReassessment(adverseResponse);
          else {
            setAssessmentSummaryOpen(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}>{focusedReassessmentActive ? "确认复查结果" : "查看评估结果"}</button></div>
      </section>;
    }
    if (assessmentSummaryOpen && assessmentFlowComplete) {
      const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
      const discovered = findings.filter((finding) => !finding.internal && finding.id !== "chief" && finding.priority !== "track");
      const tracking = findings.filter((finding) => !finding.internal && finding.priority === "track");
      const assessmentFindingGroups = buildFindingGroups([...discovered, ...tracking]);
      const findingRow = (finding: Finding, short: string) => {
        const related = Boolean(chiefDirection && samePhysicalAction(anyMotionIdFromFinding(finding), chiefDirection));
        return <li key={finding.id} className={related ? "is-chief-related" : ""}><i>{short}</i><div><strong>{finding.title}</strong>{related ? <span>主诉相关</span> : null}</div></li>;
      };
      return <section className="rm-page rm-assessment-summary">
        <StepHeading eyebrow="第3步 · 评估结果" title="先看清问题，再开始处理" />
        <article><span>你最开始说的</span><strong>{intake.description}</strong></article>
        <section className="rm-finding-board"><header><span>本次发现的问题</span><strong>{discovered.length + tracking.length}项</strong></header>{assessmentFindingGroups.length ? <div>{assessmentFindingGroups.map((group) => <section key={group.key} className={`is-${group.key}`}><header><i aria-hidden="true" /><div><strong>{group.label}</strong><span>{group.items.length}项</span></div></header><ul>{group.items.map((finding) => findingRow(finding, group.short))}</ul></section>)}</div> : <p>本次没有找到需要现场处理的明确问题。</p>}</section>
        {tissuePathway.id !== "standard" ? <section className="rm-route-note"><span>{tissuePathway.title}</span><h2>{tissuePathway.immediateActions[0]}</h2><p>{tissuePathway.blockedActions[0]}</p></section> : null}
        {assessmentNeedsReferral ? <section className="rm-route-note is-waiting">
          <span>先不要继续自助处理</span>
          <h2>{assessmentNeuralReferral ? "检查动作出现麻或电感" : sharpSpecialReferral ? "轻按刺痛并伴随特殊检查异常" : "多项检查因明显疼痛无法完成"}</h2>
          <p>{assessmentNeuralReferral ? "先由专业人员检查感觉范围和力量变化，再决定是否适合继续处理。" : sharpSpecialReferral ? "不要继续按压、关节刺激或负重进阶，建议先线下评估。" : "建议先由专业人员线下评估，再决定适合的松解、关节处理和训练内容。"}</p>
        </section> : <article><span>接下来</span><strong>{discovered.length === 0 && !tracking.some((finding) => ["track:swelling", "track:tender"].includes(finding.id)) ? "当前没有明确异常需要即时处理；下一步查看基础活动。" : hasClearChiefAction(intake) ? `先处理“${chiefActionLabel(intake)}”和仍存在的活动受限；力量或稳定问题放到训练。` : "按刚才复现的熟悉症状和活动问题开始处理；没有判断清楚的项目暂不处理。"}</strong></article>}
        <div className="rm-page-actions split"><button type="button" onClick={() => { setAssessmentSummaryOpen(false); if (sharedTensionRequired) setSharedTensionOpen(true); }}>返回检查</button>{assessmentNeedsReferral ? <button type="button" className="rm-primary" onClick={() => saveRecord("待医学评估")}>保存并结束本次</button> : <button type="button" className="rm-primary" onClick={() => { setTrialTargetIndex(0); setCandidateIndex(0); setPostScore(0); setPostScoreConfirmed(false); setPostDiscomfort(""); setTransitionTarget("treatment"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>评估完成，继续</button>}</div>
      </section>;
    }
    const isChiefFunctionAssessment = item.kind === "function"
      && item.id === chiefFunctionAssessmentId(intake, region?.id ?? "")
      && hasClearChiefAction(intake);
    const chiefFunctionDefaults = isChiefFunctionAssessment ? chiefFunctionRecordFromIntake(intake) : {};
    const record = assessmentResults[item.id] ?? {};
    const effectiveRecord = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? "") ?? {};
    const relatedMotionRecord = item.kind === "strength" ? assessmentResults[strengthRelatedMotionId(item.id)] : undefined;
    const reuseRelatedMotionSymptom = Boolean(relatedMotionRecord?.discomfort === "yes" && relatedMotionRecord.discomfortLocation && relatedMotionRecord.discomfortType);
    const passiveOnly = item.kind === "motion" && item.testMode === "passive";
    const needsPassive = item.kind === "motion" && motionNeedsPassive(item, record, canAssessPassive);
    const itemComplete = displayAssessmentComplete(item);
    const functionCompletion = item.kind === "function" ? functionCompletionValue(effectiveRecord) : undefined;
    const functionControl = item.kind === "function" ? functionControlValue(effectiveRecord) : undefined;
    const functionDiscomfort = item.kind === "function" ? functionDiscomfortValue(effectiveRecord) : undefined;
    const updateFunctionAssessment = (patch: Partial<AssessmentRecord>) => {
      // 主诉重合动作只把已知疼痛作为默认值，不应在每次点击时重新写入整份
      // 默认记录。否则用户选择“做不完”后再选原因，默认的“可以做完”会把
      // 刚才的选择覆盖。这里必须在 React 最新记录上合并并计算派生结果，
      // 不能使用当前页面渲染时的 record 快照。
      updateAssessment(item.id, (latestRecord) => {
        const nextRecord = { ...chiefFunctionDefaults, ...latestRecord, ...patch };
        return { ...patch, simple: functionSimpleAnswer(nextRecord) };
      });
    };
    const renderSymptomDetails = (scoreLabel: string, context?: string) => <div className="rm-motion-symptom-detail rm-assessment-symptom-capture">
      <LowerLimbLocationPicker
        compact
        mode="assessment"
        maxSelections={2}
        allowedAreaIds={assessmentLocationAreas(item.id)}
        value={record.discomfortLocations ?? []}
        initialRegionId={region?.id}
        initialSide={record.worseSide && record.worseSide !== "两侧接近" ? record.worseSide : intake.side}
        initialLocation={record.discomfortLocation || intake.location}
        onChange={(discomfortLocations) => updateAssessment(item.id, {
          discomfortLocations,
          discomfortLocation: locationSelectionsLabel(discomfortLocations),
        })}
      />
      {(record.discomfortLocations?.length ?? 0) > 0 ? <>
        <label className="rm-assessment-feeling"><span>刚才是什么感觉？</span><select value={record.discomfortType ?? ""} onChange={(event) => updateAssessment(item.id, { discomfortType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <ScoreSlider compact value={record.symptomScore ?? 0} selected={typeof record.symptomScore === "number"} onChange={(symptomScore) => updateAssessment(item.id, { symptomScore })} label={scoreLabel} context={context} />
        {familiarSymptomRequired(record, hasClearChiefAction(intake)) ? <section className="rm-familiar-symptom-question">
          <h3>这是平时困扰你的那种感觉吗？</h3>
          <div className="rm-result-grid is-three">{([[
            "yes", "是，就是这种感觉"], ["no", "不是，是新出现的"], ["unsure", "说不清"]] as Array<[FamiliarSymptomAnswer, string]>).map(([value, label]) => <button type="button" key={value} className={record.familiarSymptom === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, { familiarSymptom: value })}>{label}</button>)}</div>
          <p>{record.familiarSymptom === "yes" ? `后面会复测“${assessmentObservationSentence(item, record)}”。` : record.familiarSymptom === "no" ? "这项只记入检查发现，不当作主诉反复处理。" : record.familiarSymptom === "unsure" ? "先记录活动范围或动作表现，不强行建立疼痛复测。" : "这一步决定刚才的动作是否进入后续复测。"}</p>
        </section> : null}
      </> : null}
    </div>;
    // 旧记录兼容语义：intake.examSetup !== "professional-other" 时仍只展示自助发力判断。
    // 髌骨四方向是同一项 PROM 筛查。后台仍保留四个方向键，页面合并为一张卡，
    // 只让用户完成一次检查并分别记录真正异常的方向。
    if (item.id === PATELLA_GROUP_PRIMARY_ID) {
      const patellaItems = PATELLA_DIRECTION_IDS
        .map((id) => assessments.find((entry) => entry.id === id))
        .filter((entry): entry is AssessmentItem => Boolean(entry));
      const renderPatellaDirection = (subItem: AssessmentItem) => {
        const subRecord = assessmentResults[subItem.id] ?? {};
        const complete = assessmentRecordComplete(subItem, subRecord, canAssessPassive, intake.side === "双侧/中间", !hasClearChiefAction(intake), canAssessEndFeel);
        return <article className={`rm-check-card rm-patella-direction ${complete ? "is-done" : ""}`} key={subItem.id}>
          <header><i>{PATELLA_DIRECTION_LABELS[subItem.id]}</i><div><span>髌骨被动滑动</span><strong>{PATELLA_DIRECTION_TITLES[subItem.id]}</strong></div>{complete ? <b>已记录</b> : null}</header>
          <section><b>检查方法</b><p>{subItem.professionalHow ?? subItem.how}</p></section>
          <section className="rm-motion-answer-block"><h3>与对侧相比，活动范围如何？</h3><AnswerChoiceGrid options={passiveMotionOptions("contralateral")} value={subRecord.passive} onChange={(value) => updateAssessment(subItem.id, value === "skip"
            ? { passive: value, passiveEndFeel: undefined, passiveDiscomfort: undefined, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined }
            : { passive: value, ...(subRecord.passive !== value ? { passiveEndFeel: undefined, passiveDiscomfort: undefined, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined } : {}) })} /></section>
          {canAssessEndFeel && subRecord.passive && subRecord.passive !== "skip" ? <section className="rm-motion-answer-block is-passive-end-feel"><h3>记录被动活动的终末感</h3><AnswerChoiceGrid options={PASSIVE_END_FEEL_OPTIONS} value={subRecord.passiveEndFeel} onChange={(passiveEndFeel) => updateAssessment(subItem.id, { passiveEndFeel })} /></section> : null}
          {subRecord.passive && subRecord.passive !== "skip" ? <section className="rm-motion-answer-block is-symptom"><h3>被动滑动时有不适吗？</h3><div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={subRecord.passiveDiscomfort === value ? "is-selected" : ""} onClick={() => updateAssessment(subItem.id, value === "yes" ? { passiveDiscomfort: value } : { passiveDiscomfort: value, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined })}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>{subRecord.passiveDiscomfort === "yes" ? <div className="rm-motion-symptom-detail"><LowerLimbLocationPicker compact mode="assessment" maxSelections={2} allowedAreaIds={assessmentLocationAreas(subItem.id)} value={subRecord.passiveDiscomfortLocations ?? []} initialRegionId={region?.id} initialSide={subRecord.worseSide && subRecord.worseSide !== "两侧接近" ? subRecord.worseSide : intake.side} initialLocation={subRecord.passiveDiscomfortLocation || intake.location} onChange={(passiveDiscomfortLocations) => updateAssessment(subItem.id, { passiveDiscomfortLocations, passiveDiscomfortLocation: locationSelectionsLabel(passiveDiscomfortLocations) })} />{(subRecord.passiveDiscomfortLocations?.length ?? 0) > 0 ? <><label className="rm-assessment-feeling"><span>不适是什么感觉？</span><select value={subRecord.passiveDiscomfortType ?? ""} onChange={(event) => updateAssessment(subItem.id, { passiveDiscomfortType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><ScoreSlider compact value={subRecord.passiveSymptomScore ?? 0} selected={typeof subRecord.passiveSymptomScore === "number"} onChange={(passiveSymptomScore) => updateAssessment(subItem.id, { passiveSymptomScore })} label="被动滑动时有多不舒服？" /></> : null}</div> : null}</section> : null}
        </article>;
      };
      return <section className="rm-page">
        <StepHeading eyebrow={`第3步 · 评估检查 ${visibleAssessmentIndex + 1}/${assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)}`} title="髌骨四方向被动活动" current={visibleAssessmentIndex} total={assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)} />
        <p className="rm-comparison-anchor"><b>膝盖完全放松</b>，由专业人员分别比较髌骨向上、向下、向内、向外的活动；只记录与对侧有差异的方向。</p>
        <section className="rm-patella-group">{patellaItems.map(renderPatellaDirection)}</section>
        <div className="rm-page-actions split"><button type="button" onClick={() => visibleAssessmentIndex === 0 ? goToStep(1) : setAssessmentIndex(visibleAssessmentIndex - 1)}>上一个检查</button>{visibleAssessmentIndex < assessmentDisplayItems.length - 1 ? <button type="button" className="rm-primary" disabled={!itemComplete} onClick={() => setAssessmentIndex(visibleAssessmentIndex + 1)}>下一个检查</button> : sharedTensionRequired ? <button type="button" className="rm-primary" disabled={!assessmentComplete} onClick={() => { setSharedTensionOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>检查相关肌肉</button> : <button type="button" className="rm-primary" disabled={!assessmentFlowComplete} onClick={() => { setAssessmentSummaryOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>查看评估结果</button>}</div>
      </section>;
    }

    const localLimbStrengthOptions: Array<[SimpleAnswer, string]> = intake.examSetup === "professional-other"
      ? [["normal", "抗阻接近｜两侧力量差异不明显"], ["weak", "患侧偏弱｜抗阻更容易失去位置"], ["painful", "抗阻不适｜发力诱发症状"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]]
      : [["normal", "保持稳定｜两侧控制接近"], ["weak", "控制偏弱｜容易掉下或发抖"], ["painful", "发力不适｜一用力就出现症状"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]];
    const options: Array<[SimpleAnswer, string]> = item.kind === "strength"
      ? ["thigh-local", "calf-local"].includes(region?.id ?? "")
        ? localLimbStrengthOptions
        : item.comparison === "midline"
        ? [["normal", "完成质量正常｜动作可稳定完成"], ["weak", "控制偏弱｜耐力或保持不足"], ["painful", "发力不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]]
        : intake.side === "双侧/中间"
          ? [["normal", "两侧接近｜完成质量都正常"], ["weak", "一侧或两侧偏弱｜保持不足"], ["painful", "发力不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]]
          : [["normal", "力量接近｜两侧完成质量相近"], ["weak", "患侧偏弱｜不舒服这侧更差"], ["painful", "发力不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]]
      : item.kind === "special"
        ? [["normal", "未见异常反应｜没有出现提示信号"], ["positive", "出现提示反应｜需要结合其他结果"], ["painful", "只有疼痛｜暂不能判断"], ["skip", "暂不检查｜不会做或暂不做"]]
        : [];
    const pairedCheckUsesResistance = canAssessResistance;
    const isSelfKneeExtension = item.id === "motion:knee-extension" && !pairedCheckUsesResistance && intake.side !== "双侧/中间";
    const acuteMotionGuidance = isAcuteTrauma(intake)
      && (intake.symptoms.includes("肿胀或淤青") || (intake.baselineScoreConfirmed && intake.baselineScore >= 6))
      || record.active === "unable";
    const pairedCheckOptions: Array<[SimpleAnswer, string]> = pairedCheckUsesResistance
      ? [["normal", "抗阻接近｜两侧力量差异不明显"], ["weak", "患侧偏弱｜抗阻更容易失去位置"], ["painful", "抗阻不适｜发力诱发症状"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]]
      : [["normal", "保持稳定｜两侧控制接近"], ["weak", "控制偏弱｜容易掉下或发抖"], ["painful", "发力不适｜一用力就出现症状"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]];
    const motionFallback = item.kind === "motion" ? motionUnableGuidance(item, record.unableReason) : null;
    const pairedStrengthFallback = item.pairedStrengthId ? strengthUnableGuidance(item, record.pairedStrengthUnableReason, pairedCheckUsesResistance) : null;
    const strengthFallback = item.kind === "strength" ? strengthUnableGuidance(item, record.strengthUnableReason, canAssessResistance) : null;
    return <section className="rm-page">
      <StepHeading eyebrow={`第3步 · 评估检查 ${visibleAssessmentIndex + 1}/${assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)}`} title={item.id === PATELLA_GROUP_PRIMARY_ID ? "髌骨四方向被动活动" : professionalAssessmentTitle(item.id, item.title)} current={visibleAssessmentIndex} total={assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)} />
      {isThinkingMode && !focusedReassessmentActive ? <button type="button" className="rm-workbench-back" onClick={() => setThinkingWorkbenchOpen(true)}>返回阶段工作台</button> : null}
      {focusedReassessmentActive && adverseResponse ? <section className="rm-focused-reassessment"><header><span>只复查相关内容</span><strong>{adverseResponse.sourceLabel}后出现加重</strong></header><div>{focusedAssessmentIds.map((id, index) => { const assessment = assessments.find((entry) => entry.id === id); const done = adverseConfirmedAssessmentIds.includes(id); return <article key={id} className={id === item.id ? "is-current" : done ? "is-done" : ""}><i>{done ? "✓" : index + 1}</i><span>{assessment ? professionalAssessmentTitle(assessment.id, assessment.title) : id}</span></article>; })}</div><p>完成并确认这些项目后，系统会停用旧方案并重新安排后续内容。</p></section> : null}
      <section className="rm-assessment-progress"><header><span>检查进度</span><strong>{assessmentDisplayItems.filter((entry) => displayAssessmentComplete(entry)).length + (sharedTensionComplete && sharedTensionRequired ? 1 : 0)}/{assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)}</strong></header><div>{assessmentDisplayItems.map((entry, index) => { const done = displayAssessmentComplete(entry); return <button type="button" key={entry.id} disabled={index > visibleAssessmentIndex} className={done ? "is-done" : ""} onClick={() => setAssessmentIndex(index)}><i>{done ? "✓" : index + 1}</i><span>{entry.id === PATELLA_GROUP_PRIMARY_ID ? "髌骨四方向被动活动" : professionalAssessmentTitle(entry.id, entry.title)}</span>{done ? <b>已记录</b> : null}</button>; })}{sharedTensionRequired ? <button type="button" disabled className={sharedTensionComplete ? "is-done" : ""}><i>{sharedTensionComplete ? "✓" : assessmentDisplayItems.length + 1}</i><span>相关肌群触诊比较</span>{sharedTensionComplete ? <b>已记录</b> : null}</button> : null}</div></section>
      {item.kind === "motion" ? <div className="rm-assessment-stack">
        {!passiveOnly ? <article className="rm-check-card">
          <header><i>1</i><div><span>关节活动度检查</span><strong>{professionalAssessmentTitle(item.id, item.title)}</strong></div></header>
          {acuteMotionGuidance ? <p className="rm-passive-reminder">急性损伤先轻柔查看活动范围；页面出现保持或发力检查时，如果会明显加重，今天可以跳过。</p> : null}
          <section><b>{isThinkingMode ? "检查方法" : "现在做"}</b><p>{isThinkingMode ? item.professionalHow ?? item.how : item.how}</p></section>
          <section><b>{isThinkingMode ? "记录" : "做的时候留意"}</b><p>{isThinkingMode ? item.professionalObserve ?? item.observe : intake.side === "双侧/中间" ? BILATERAL_OBSERVE[item.id.replace(/^motion:/, "")] ?? "两侧都异常时，记录哪一侧更差；如果一样差就选择两侧都受限。" : item.observe}</p></section>
          {!item.spinal && !isPilotRegion(intake.regionId) ? intake.side === "双侧/中间" ? <p className="rm-comparison-anchor"><b>左右各做一次</b>，找出更差的一侧；如果两边都差，选择“两侧都受限”。</p> : <p className="rm-comparison-anchor"><b>先做健侧</b>，再用同样姿势做不舒服的一侧。</p> : null}
          <section className="rm-motion-answer-block">
            <h3>{isSelfKneeExtension ? "膝后能不能像另一边一样压向床面？" : isThinkingMode ? `${professionalAssessmentTitle(item.id, item.title)}：主动活动范围` : item.spinal ? spinalRangeQuestion(item.comparison, intake.spineAssessmentMode) : activeMotionRangeQuestion(item.id, intake.side === "双侧/中间")}</h3>
            {isSelfKneeExtension ? <p className="rm-choice-hint">看不清时，把同一条薄毛巾先后放在两侧膝后。绷紧大腿后轻轻抽动，明显更容易抽出的一侧，下压表现较差。</p> : null}
            <AnswerChoiceGrid options={(isSelfKneeExtension
              ? [["same", "接近健侧｜两侧膝后压平程度相近"], ["limited", "患侧偏小｜膝后仍明显悬空"], ["unable", "无法完成｜疼痛或担心继续"], ["unsure", "暂不判断｜看不清差异"]] as Array<[MotionAnswer, string]>
              : intake.side === "双侧/中间" && !item.spinal ? bilateralMotionOptions : ["thigh-local", "calf-local"].includes(region?.id ?? "") ? localLimbMotionRangeOptions(intake.userRole !== "general") : activeMotionRangeOptions(item.comparison, item.spinal, intake.spineAssessmentMode, intake.userRole !== "general"))} value={record.active} onChange={(value) => updateAssessment(item.id, {
              active: value,
              passive: undefined,
              pairedStrength: undefined,
              pairedStrengthLocation: undefined,
              pairedStrengthLocations: undefined,
              pairedStrengthType: undefined,
              pairedStrengthScore: undefined,
              passiveDiscomfort: undefined,
              passiveDiscomfortLocation: undefined,
              passiveDiscomfortLocations: undefined,
              passiveDiscomfortType: undefined,
              passiveMeasuredAngle: undefined,
              passiveSymptomScore: undefined,
              unableReason: value === "unable" ? record.unableReason : undefined,
              tensionChecked: false,
              tensionLocations: [],
              familiarSymptom: undefined,
            })} />
            {intake.spineAssessmentMode === "reference" ? <label className="rm-optional-angle"><span>记录主动角度</span><small>选填 · 仅供对比参考</small><input inputMode="decimal" value={record.measuredAngle ?? ""} onChange={(event) => updateAssessment(item.id, { measuredAngle: event.target.value })} placeholder="例如：45°" /></label> : null}
          </section>

          {record.active === "unable" ? <section className="rm-motion-answer-block is-followup">
            <h3>是什么让你停下来？</h3>
            <p className="rm-choice-hint">如果是因为疼所以不敢继续，选“疼痛或不适”。</p>
            <div className="rm-result-grid">{([
              ["pain", "因为不适停下"],
              ["fear", "担心继续会加重"],
              ["instruction", "不知道动作怎么做"],
              ["other", "有其他原因"],
            ] as Array<[NonNullable<AssessmentRecord["unableReason"]>, string]>).map(([value, label]) => <button type="button" key={value} className={record.unableReason === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, {
              unableReason: value,
              discomfort: value === "pain" ? "yes" : undefined,
              discomfortLocation: value === "pain" ? record.discomfortLocation : undefined,
              discomfortLocations: value === "pain" ? record.discomfortLocations : undefined,
              discomfortType: value === "pain" ? record.discomfortType : undefined,
              symptomScore: value === "pain" ? record.symptomScore : undefined,
              pairedStrength: undefined,
              pairedStrengthUnableReason: undefined,
            })}>{label}</button>)}</div>
            {motionFallback ? <div className="rm-unable-guidance"><strong>先这样试</strong><p>{motionFallback.action}</p><small>{motionFallback.fallback}</small></div> : null}
          </section> : null}

          {item.pairedStrengthId && shouldAskPairedStrength(record.active) ? <section className="rm-motion-answer-block is-strength">
            <h3>{pairedCheckUsesResistance ? "同一个动作：检查抗阻力量" : isSelfKneeExtension ? "再看一次：绷直后能不能保持" : "同一个动作：看主动保持"}</h3>
            <p className="rm-choice-hint">{pairedCheckUsesResistance
              ? "由检查者沿刚才动作的反方向逐渐施加轻阻力，保持3～5秒并比较两侧；不要突然用力。"
              : isSelfKneeExtension
                ? "先把膝盖绷直，再将整条腿抬离床面约10厘米，保持3秒后放下；左右各做一次，不需要别人按压。"
                : "不需要别人压，也不需要自己用手加阻力。两侧同时保持刚才的位置3～5秒，看是否容易掉下、抖动或提前结束。"}</p>
            {record.active === "unable" && !pairedCheckUsesResistance ? <p className="rm-passive-reminder">刚才没有完成主动活动，这一步可以跳过，不要为了测试强行完成。</p> : null}
            <AnswerChoiceGrid options={isSelfKneeExtension
              ? [["normal", "保持稳定｜抬起后膝盖仍笔直"], ["weak", "控制偏弱｜膝盖弯曲、抖动或下落"], ["painful", "发力不适｜抬腿时出现症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]] as Array<[SimpleAnswer, string]>
              : pairedCheckOptions} value={record.pairedStrength} onChange={(value) => updateAssessment(item.id, {
                pairedStrength: value,
                pairedStrengthUnableReason: value === "unable" ? record.pairedStrengthUnableReason : undefined,
                pairedStrengthLocation: undefined,
                pairedStrengthLocations: undefined,
                pairedStrengthType: undefined,
                pairedStrengthScore: undefined,
                discomfort: value === "painful" ? "yes" : record.discomfort,
              })} />
            {record.pairedStrength === "unable" ? <div className="rm-strength-unable">
              <h4>主要卡在哪里？</h4>
              <div className="rm-result-grid is-three">{([[
                "pain", "一用力就不适"], ["weak", "完全使不上力"], ["control", "找不到发力感觉"], ["instruction", "不知道怎么做"], ["no-helper", "身边没人协助"], ["fear", "担心会加重"]] as Array<[StrengthUnableReason, string]>).map(([value, label]) => <button type="button" key={value} className={record.pairedStrengthUnableReason === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, {
                  pairedStrengthUnableReason: value,
                  discomfort: value === "pain" ? "yes" : record.discomfort,
                })}>{label}</button>)}</div>
              {pairedStrengthFallback ? <div className="rm-unable-guidance"><strong>先这样试</strong><p>{pairedStrengthFallback.action}</p><small>{pairedStrengthFallback.fallback}</small></div> : null}
            </div> : null}
            {strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? <p className="rm-reused-symptom">下面只记录一次这个动作的不适位置、性质和分数。</p> : null}
          </section> : null}

          {shouldAskMotionDiscomfort(record.active) ? <section className="rm-motion-answer-block is-symptom">
            <h3>刚才活动或发力时，有没有不适？</h3>
            <div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={record.discomfort === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, (latestRecord) => value === "yes"
              ? { ...latestRecord, discomfort: value }
              : { ...latestRecord, discomfort: value, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, unableReason: latestRecord.unableReason === "pain" ? undefined : latestRecord.unableReason, pairedStrength: latestRecord.pairedStrength === "painful" ? undefined : latestRecord.pairedStrength })}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>
            {record.discomfort === "yes" ? renderSymptomDetails("刚才这个动作有多不舒服？") : null}
          </section> : shouldCaptureUnableMotionSymptom(record.active, record.unableReason) ? <section className="rm-motion-answer-block is-symptom">
            <h3>记录刚才让你停下来的不适</h3>
            {renderSymptomDetails("刚才这个动作有多不舒服？")}
          </section> : null}

          {!canAssessPassive && ["limited", "excessive", "unable"].includes(record.active ?? "") ? <p className="rm-passive-reminder">有专业人员协助时，可以补充被动活动检查；现在先记录主动活动，后续安排相关肌肉处理和主动控制。</p> : null}
        </article> : null}
        {needsPassive ? <article className="rm-check-card is-secondary">
          <header><i>{passiveOnly ? "P" : "2"}</i><div><span>{passiveOnly ? "被动活动度（PROM）" : "专业检查 · 被动活动"}</span><strong>{passiveOnly ? professionalAssessmentTitle(item.id, item.title) : "不强压疼痛末端"}</strong></div></header>
          <section><b>检查方法</b><p>{isThinkingMode ? professionalPassiveMotionInstruction(item, intake.side === "双侧/中间") : intake.side === "双侧/中间" ? passiveMotionInstruction(item.comparison, true) : item.passiveHow ?? passiveMotionInstruction(item.comparison)}</p></section>
          {isThinkingMode ? <section><b>记录</b><p>{item.professionalObserve ?? "与对侧比较活动范围、终末感及症状诱发。"}</p></section> : null}
          <section className="rm-motion-answer-block">
            <h3>{passiveOnly ? "与对侧相比，被动活动范围怎么样？" : "被动活动范围怎么样？"}</h3>
            <div className="rm-result-grid rm-passive-options">{passiveMotionOptions(item.comparison, Boolean(item.spinal && intake.spineAssessmentMode === "reference"), intake.side === "双侧/中间").map(([value, label]) => <button type="button" key={value} className={record.passive === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, value === "skip"
              ? { passive: value, passiveEndFeel: undefined, passiveDiscomfort: undefined, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveMeasuredAngle: undefined, passiveSymptomScore: undefined }
              : { passive: value, ...(record.passive !== value ? { passiveEndFeel: undefined } : {}) })}>{label}</button>)}</div>
            {record.passive && record.passive !== "skip" ? <label className="rm-optional-angle"><span>记录被动角度</span><small>选填 · 仅供对比参考</small><input inputMode="decimal" value={record.passiveMeasuredAngle ?? ""} onChange={(event) => updateAssessment(item.id, { passiveMeasuredAngle: event.target.value })} placeholder="例如：50°" /></label> : null}
          </section>
          {canAssessEndFeel && record.passive && record.passive !== "skip" ? <section className="rm-motion-answer-block is-passive-end-feel">
            <h3>记录被动活动的终末感</h3>
            <p className="rm-choice-hint">在不强压疼痛末端的前提下，记录最后的阻力感觉；无法判断可选“无法判断”。</p>
            <AnswerChoiceGrid options={PASSIVE_END_FEEL_OPTIONS} value={record.passiveEndFeel} onChange={(passiveEndFeel) => updateAssessment(item.id, { passiveEndFeel })} />
          </section> : null}
          {record.passive && record.passive !== "skip" ? <section className="rm-motion-answer-block is-symptom">
            <h3>被动活动时有没有不适？</h3>
            <div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={record.passiveDiscomfort === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, (latestRecord) => value === "yes"
              ? { ...latestRecord, passiveDiscomfort: value }
              : { ...latestRecord, passiveDiscomfort: value, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined })}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>
            {record.passiveDiscomfort === "yes" ? <div className="rm-motion-symptom-detail">
              <LowerLimbLocationPicker compact mode="assessment" maxSelections={2} allowedAreaIds={assessmentLocationAreas(item.id)} value={record.passiveDiscomfortLocations ?? []} initialRegionId={region?.id} initialSide={record.worseSide && record.worseSide !== "两侧接近" ? record.worseSide : intake.side} initialLocation={record.passiveDiscomfortLocation || intake.location} onChange={(passiveDiscomfortLocations) => updateAssessment(item.id, { passiveDiscomfortLocations, passiveDiscomfortLocation: locationSelectionsLabel(passiveDiscomfortLocations) })} />
              {(record.passiveDiscomfortLocations?.length ?? 0) > 0 ? <><label className="rm-assessment-feeling"><span>刚才是什么感觉？</span><select value={record.passiveDiscomfortType ?? ""} onChange={(event) => updateAssessment(item.id, { passiveDiscomfortType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><ScoreSlider compact value={record.passiveSymptomScore ?? 0} selected={typeof record.passiveSymptomScore === "number"} onChange={(passiveSymptomScore) => updateAssessment(item.id, { passiveSymptomScore })} label="被动活动时有多不舒服？" /></> : null}
            </div> : null}
          </section> : null}
        </article> : null}
      </div> : <article className="rm-check-card">
        <header><i>{item.kind === "strength" ? "力" : item.kind === "special" ? "测" : "动"}</i><div><span>{item.kind === "strength" ? "肌力与控制检查" : item.kind === "special" ? "特殊检查" : "功能动作检查"}</span><strong>{professionalAssessmentTitle(item.id, item.title)}</strong></div></header>
        <section><b>现在做</b><p>{item.how}</p></section>
        <section><b>做的时候留意</b><p>{intake.side === "双侧/中间" ? BILATERAL_OBSERVE[item.id.replace(/^(strength|function|special):/, "")] ?? item.observe.replaceAll("患侧", "更差的一侧").replaceAll("健侧", "另一侧") : item.observe}</p></section>
        {item.kind === "special" && item.next ? <p className="rm-special-next"><b>如果出现提示信号：</b>{item.next}</p> : null}
        {item.kind !== "function" ? <><AnswerChoiceGrid options={options} value={record.simple} onChange={(value) => updateAssessment(item.id, value === "painful"
          ? { simple: value, compensations: undefined, discomfortLocation: record.discomfortLocation || relatedMotionRecord?.discomfortLocation, discomfortLocations: record.discomfortLocations || relatedMotionRecord?.discomfortLocations, discomfortType: record.discomfortType || relatedMotionRecord?.discomfortType, familiarSymptom: record.familiarSymptom || relatedMotionRecord?.familiarSymptom, worseSide: record.worseSide }
          : value === "present"
            ? { simple: value, symptomStage: record.symptomStage, compensations: record.compensations, worseSide: record.worseSide }
            : { simple: value, strengthUnableReason: value === "unable" ? record.strengthUnableReason : undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, symptomStage: undefined, compensations: undefined, worseSide: value === "weak" ? record.worseSide : undefined })} />
          {item.kind === "strength" && record.simple === "unable" ? <section className="rm-motion-answer-block is-followup rm-strength-unable">
            <h3>主要卡在哪里？</h3>
            <div className="rm-result-grid is-three">{([[
              "pain", "一用力就不适"], ["weak", "完全使不上力"], ["control", "找不到发力感觉"], ["instruction", "不知道怎么做"], ["no-helper", "身边没人协助"], ["fear", "担心会加重"]] as Array<[StrengthUnableReason, string]>).map(([value, label]) => <button type="button" key={value} className={record.strengthUnableReason === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, {
                strengthUnableReason: value,
                discomfortLocation: value === "pain" ? record.discomfortLocation || relatedMotionRecord?.discomfortLocation : undefined,
                discomfortLocations: value === "pain" ? record.discomfortLocations || relatedMotionRecord?.discomfortLocations : undefined,
                discomfortType: value === "pain" ? record.discomfortType || relatedMotionRecord?.discomfortType : undefined,
              })}>{label}</button>)}</div>
            {strengthFallback ? <div className="rm-unable-guidance"><strong>先这样试</strong><p>{strengthFallback.action}</p><small>{strengthFallback.fallback}</small></div> : null}
          </section> : null}</> : <div className="rm-function-result-stack">
          {isChiefFunctionAssessment ? <section className="rm-chief-function-result">
            <span>主诉不适已记录</span>
            <strong>{[intake.location, intake.symptomType, intake.baselineScoreConfirmed ? `${intake.baselineScore}/10` : ""].filter(Boolean).join(" · ")}</strong>
            <small>下面只补充动作完成情况和控制表现，不重复选择疼痛信息。</small>
          </section> : null}
          <section className="rm-motion-answer-block">
            <h3>这个动作能做完吗？</h3>
            <div className="rm-result-grid is-three">{([
              ["complete", "可以做完"],
              ["unable", "做不完或不敢继续"],
              ["skip", "暂时不做"],
            ] as Array<[FunctionCompletion, string]>).map(([value, label]) => <button type="button" key={value} className={functionCompletion === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment(value === "complete"
              ? { functionCompletion: value, functionControl: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.functionControl, functionDiscomfort: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.functionDiscomfort, functionUnableReason: undefined, discomfortLocation: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.discomfortLocation, discomfortType: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.discomfortType, symptomScore: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.symptomScore }
              : value === "unable"
                ? { functionCompletion: value, functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: isChiefFunctionAssessment ? effectiveRecord.discomfortLocation : undefined, discomfortLocations: isChiefFunctionAssessment ? effectiveRecord.discomfortLocations : undefined, discomfortType: isChiefFunctionAssessment ? effectiveRecord.discomfortType : undefined, symptomScore: isChiefFunctionAssessment ? effectiveRecord.symptomScore : undefined, familiarSymptom: isChiefFunctionAssessment ? effectiveRecord.familiarSymptom : undefined }
                : { functionCompletion: value, functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, worseSide: undefined })}>{label}</button>)}</div>
          </section>
          {functionCompletion === "unable" ? <section className="rm-motion-answer-block is-followup">
            <h3>主要是什么原因停下来？</h3>
            <div className="rm-result-grid is-two">{([[
              "pain", "疼或不舒服"], ["weak", "没力或撑不住"], ["fear", "担心继续会加重"], ["instruction", "不知道动作怎么做"]] as Array<[FunctionUnableReason, string]>).map(([value, label]) => <button type="button" key={value} className={record.functionUnableReason === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment({
                functionUnableReason: value,
                functionDiscomfort: value === "pain" ? "yes" : "no",
                discomfortLocation: value === "pain" ? effectiveRecord.discomfortLocation : undefined,
                discomfortLocations: value === "pain" ? effectiveRecord.discomfortLocations : undefined,
                discomfortType: value === "pain" ? effectiveRecord.discomfortType : undefined,
                symptomScore: value === "pain" ? effectiveRecord.symptomScore : undefined,
                familiarSymptom: value === "pain" ? effectiveRecord.familiarSymptom : undefined,
              })}>{label}</button>)}</div>
          </section> : null}
          {functionCompletion === "complete" ? <section className="rm-motion-answer-block">
            <h3>做的时候稳不稳？</h3>
            <div className="rm-result-grid is-three">{([
              ["stable", "动作基本稳定"],
              ["compensated", "有明显晃动或借力"],
              ["unsure", "看不出来"],
            ] as Array<[FunctionControl, string]>).map(([value, label]) => <button type="button" key={value} className={functionControl === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment({ functionControl: value, compensations: value === "compensated" ? record.compensations ?? (isChiefFunctionAssessment ? ["动作不稳定"] : undefined) : undefined })}>{label}</button>)}</div>
          </section> : null}
          {functionCompletion === "complete" && !isChiefFunctionAssessment ? <section className="rm-motion-answer-block is-symptom">
            <h3>做的时候会不会不舒服？</h3>
            <div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={functionDiscomfort === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment(value === "yes"
              ? { functionDiscomfort: value }
              : { functionDiscomfort: value, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined })}>{value === "yes" ? "会" : "不会"}</button>)}</div>
          </section> : null}
        </div>}
        {intake.side === "双侧/中间" && !isChiefFunctionAssessment && (item.kind === "function" ? record.functionUnableReason === "weak" || functionControl === "compensated" || functionDiscomfort === "yes" : ["weak", "present", "painful", "unable"].includes(record.simple ?? "")) && item.kind !== "special" ? <section className="rm-motion-answer-block is-side-compare">
          <h3>{item.kind === "strength" ? "两侧都试过后，哪一侧更弱？" : "两侧都做过后，哪一侧更差？"}</h3>
          <div className="rm-result-grid is-three">{(["左侧", "右侧", "两侧接近"] as const).map((side) => <button type="button" key={side} className={record.worseSide === side ? "is-selected" : ""} onClick={() => updateAssessment(item.id, { worseSide: side })}>{side}</button>)}</div>
        </section> : null}
        {item.kind === "strength" && strengthAnswerResult(record.simple, record.strengthUnableReason) === "painful" ? reuseRelatedMotionSymptom ? <div className="rm-motion-symptom-detail rm-strength-symptom-detail">
          <p className="rm-reused-symptom">刚才已经标记：{relatedMotionRecord?.discomfortLocation} · {relatedMotionRecord?.discomfortType}</p>
          <ScoreSlider compact value={record.symptomScore ?? 0} selected={typeof record.symptomScore === "number"} onChange={(symptomScore) => updateAssessment(item.id, { symptomScore })} label="这次用力时有多不舒服？" context={typeof relatedMotionRecord?.symptomScore === "number" ? `刚才活动时 ${relatedMotionRecord.symptomScore}/10` : undefined} />
        </div> : renderSymptomDetails("发力时有多不舒服？") : null}
        {item.kind === "function" && !isChiefFunctionAssessment && functionCompletion !== "skip" && (functionControl === "compensated" || functionDiscomfort === "yes") ? <section className="rm-motion-answer-block is-stage">
          {functionControl === "compensated" ? <>
            <h3>你看到了什么？</h3>
            <div className="rm-result-grid">{functionCompensationOptions(item.id).map((entry) => <button type="button" key={entry} className={record.compensations?.includes(entry) ? "is-selected" : ""} onClick={() => updateAssessment(item.id, (latestRecord) => ({ compensations: latestRecord.compensations?.includes(entry) ? latestRecord.compensations.filter((item) => item !== entry) : [...(latestRecord.compensations ?? []), entry] }))}>{entry}</button>)}</div>
          </> : null}
          {functionDiscomfort === "yes" || functionCompletion === "unable" ? isChiefFunctionAssessment ? <p className="rm-reused-symptom"><b>动作不适</b>{intake.location} · {intake.symptomType}{intake.baselineScoreConfirmed ? ` · ${intake.baselineScore}/10` : ""}</p> : renderSymptomDetails("做这个动作时有多不舒服？") : null}
        </section> : null}
      </article>}
      {hasSpecialPositive ? <section className="rm-route-note is-waiting">
        <span>建议补充确认</span>
        <h2>{specialPositiveFindings.map((entry) => entry.title).join("、")}出现了异常反应</h2>
        <p>{intake.stabbingPalpation === "sharp" ? "轻按也有清楚刺痛，同时特殊检查出现异常反应。不要继续按压、关节刺激或负重进阶，建议先线下评估。" : "这个结果不能单独判断结构问题。可以完成其余低刺激检查；如果症状较重、持续不改善或伴随卡住、明显不稳，建议线下评估或结合影像确认。"}</p>
      </section> : null}
      <div className="rm-page-actions split"><button type="button" onClick={() => {
        if (focusedReassessmentActive) {
          if (focusedAssessmentPosition > 0) setAssessmentIndex(displayAssessmentIndexForId(focusedAssessmentIds[focusedAssessmentPosition - 1]));
          else setAdverseConfirmedAssessmentIds((current) => current.filter((id) => id !== "__capture__"));
          return;
        }
        if (visibleAssessmentIndex === 0) goToStep(1);
        else setAssessmentIndex(visibleAssessmentIndex - 1);
      }}>{focusedReassessmentActive ? focusedAssessmentPosition > 0 ? "上一个复查" : "返回异常反应" : visibleAssessmentIndex === 0 ? "返回关键确认" : "上一个检查"}</button>{focusedReassessmentActive ? <button type="button" className="rm-primary" disabled={!itemComplete || focusedAssessmentPosition < 0} onClick={() => confirmFocusedAssessment(item.id)}>{focusedAssessmentPosition >= focusedAssessmentIds.length - 1 ? "确认复查结果" : "确认，检查下一项"}</button> : visibleAssessmentIndex < assessmentDisplayItems.length - 1 ? <button type="button" className="rm-primary" disabled={!itemComplete} onClick={() => setAssessmentIndex(visibleAssessmentIndex + 1)}>下一个检查</button> : sharedTensionRequired ? <button type="button" className="rm-primary" disabled={!assessmentComplete} onClick={() => { setSharedTensionOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>检查相关肌肉</button> : <button type="button" className="rm-primary" disabled={!assessmentFlowComplete} onClick={() => { setAssessmentSummaryOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>查看评估结果</button>}</div>
    </section>;
  }

  function renderTreatment() {
    const beforeScore = activeTarget ? targetScoreBeforeRetest(activeTarget) : intake.baselineScore;
    const change = scoreChange(beforeScore, postScore);
    const automaticResult = resultFromScore(beforeScore, postScore);
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
      && !isStrengthSymptomTarget,
    );
    const retestActionTitle = activeTarget?.retestLabel
      ?? (activeTarget?.id === "target:chief" ? chiefActionLabel(intake) : activeAssessment?.title)
      ?? activeTarget?.finding.title.split(/：|会引起|因为|不稳定/)[0]
      ?? "刚才出现不适的动作";
    const activeComparison = activeAssessment?.comparison ?? "contralateral";
    const activeComparisonTarget = motionComparisonTarget(activeComparison);
    const persistentStabbing = intake.userRole === "general" && intake.symptomType === "刺痛" && hasClearChiefAction(intake) && lastChiefScore >= 4;
    const isUnspecifiedChiefTarget = !hasClearChiefAction(intake) && !isResidualReviewStep
      && (activeTarget?.id === "target:chief" || Boolean(localLimbDecision && !isBatchRangeTarget));
    const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const activeRangeWasSymptomatic = Boolean(activeRangeDirection && motionWasSymptomatic(activeRangeDirection, assessmentResults, chiefDirection));
    const activeRangeAllowsPassive = activeRangeDirection ? directionAllowsPassive(activeRangeDirection) : canAssessPassive;
    const activeRangePassiveOnly = activeAssessment?.kind === "motion" && activeAssessment.testMode === "passive";
    const singleRangeRetestsChief = Boolean(isRangeTarget && activeTarget?.id !== "target:chief" && hasClearChiefAction(intake)
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
      && hasClearChiefAction(intake)
      && !chiefMatchesRange
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
    const activeTreatmentSide = activeTarget?.finding.side && activeTarget.finding.side !== "两侧接近" ? activeTarget.finding.side : intake.side;
    const activeDisplay = displayCandidate
      ? treatmentDisplay(displayCandidate, region?.name || intake.location || "当前部位", intake.swellingLocation, activeTreatmentSide)
      : null;
    const completedRoadmapItems = trialRecords
      .filter((record) => !record.reviewOnly && !record.retestOnly)
      .map((record) => record.treatmentName ?? record.candidateTitle)
      .filter((label, index, list) => list.indexOf(label) === index);
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
      ? trialRecords.findLastIndex((record) => reusableDirectionIds.every((directionId) => Boolean(record.rangeOutcomes?.[directionId])
        || record.targetId === `target:motion:${directionId}` && Boolean(record.rangeOutcome)))
      : -1;
    const latestChiefRecordIndex = trialRecords.findLastIndex((record) => record.chiefRetested && !record.reviewOnly);
    const canReuseLatestRetest = Boolean(carryoverOnly
      && (latestTrialRecord || latestMatchingRangeRecordIndex >= 0)
      && (
        latestTrialRecord?.retestActionKey === canonicalRetestAction(plannedRetestLabel)
        || reusableDirectionIds.length > 0 && latestMatchingRangeRecordIndex >= latestTreatmentRecordIndex
        || reusableDirectionIds.length === 0 && latestChiefRecordIndex >= latestTreatmentRecordIndex
      ));
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
        finishTrial("same", false, undefined, true, true);
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
    const lastWorsenedTreatment = [...trialRecords].reverse().find((record) => record.result === "worse" && !record.reviewOnly);
    const worsenedRelatedAssessments = lastWorsenedTreatment
      ? Object.keys(lastWorsenedTreatment.rangeOutcomes ?? {}).map((id) => `motion:${id}`)
      : [];
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
      <section className="rm-complete-panel is-referral"><span>刚才的反应</span><h2>症状或活动表现变差</h2><p>先停止刚才的处理。接下来只确认症状变化和直接相关的检查，不会返回整套评估。</p><div className="rm-page-actions three"><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "treatment", sourceId: lastWorsenedTreatment?.candidateId ?? "treatment", sourceLabel: lastWorsenedTreatment?.treatmentName ?? lastWorsenedTreatment?.candidateTitle ?? "刚才的处理", timing: "immediate", beforeScore: lastWorsenedTreatment?.beforeScore ?? intake.baselineScore, afterScore: lastWorsenedTreatment?.afterScore ?? lastChiefScore, relatedAssessmentIds: worsenedRelatedAssessments })}>确认加重后的变化</button><button type="button" onClick={() => goToStep(0)}>补充症状信息</button><button type="button" onClick={() => saveRecord("处理后加重，待重新评估")}>保存并结束</button></div></section>
    </section>;
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
      const hasUnresolvedImmediateTreatmentProblem = !treatmentFinalRetestConfirmed
        // A queue can be empty after a partial local-limb trial even though
        // the finding is still unresolved. Keep the user in an explicit
        // continuation state instead of falling through to a completion card.
        // This also covers a dynamically rebuilt knee queue whose next unit
        // has not appeared in the same render yet.
        && (unresolvedImmediateLedgerProblems.length > 0 || unresolvedLedgerProblem || hasUnresolvedRangeProgress);
      const unresolvedImmediateLabels = unresolvedImmediateLedgerProblems
        .map((entry) => treatmentProblems.find((problem) => problem.id === entry.id)?.title ?? entry.id)
        .filter((label, index, list) => label && list.indexOf(label) === index)
        .slice(0, 4);
      const rangeChangedWithoutChiefChange = treatmentCoverage.hasRangeImprovement && !chiefImprovedDuringTreatment;
      if (hasUnresolvedImmediateTreatmentProblem) {
        return <section className="rm-page">
          <StepHeading eyebrow="第4步 · 处理与即时复测" title="本阶段成果" />
          <section className="rm-complete-panel is-caution">
            <span>本轮处理已完成</span>
            <h2>{chiefComplaintLabel(intake)}</h2>
            {chiefScoreComparable ? <div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>下降 {Math.max(0, intake.baselineScore - lastChiefScore)} 分</small></div> : <p>本次没有固定主诉动作，未生成动作评分变化。</p>}
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
          ? "主诉和活动范围都出现变化，但只要还没有达到比较目标，就保留为需要巩固的问题。"
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
    return <section className="rm-page">
      <StepHeading eyebrow="第4步 · 处理与即时复测" title="针对性处理" />
      {swellingGuidance && trialRecords.length === 0 && activeCandidate?.type !== "swelling" ? <section className="rm-swelling-reminder">
        <span>肿胀管理</span>
        <strong>{intake.swellingLocation || intake.location || "肿胀位置"}</strong>
        <p>{candidateAction(swellingGuidance)}</p>
        <small>不用在每项处理后反复检查；今天晚些时候或明天再比较范围和轮廓。</small>
      </section> : null}

      {!treatmentComplete && activeTarget && activeCandidate ? <>
        <TreatmentRoadmap completed={completedRoadmapItems} current={currentRoadmapItem} upcoming={upcomingRoadmapItems} />
        {intake.side === "双侧/中间" && activeTarget.finding.side ? <p className="rm-bilateral-order">{activeTarget.finding.side === "两侧接近" ? <><b>双侧都处理</b>，两边使用相同方式和强度。</> : <><b>先处理{activeTarget.finding.side}</b>，再用同样方法处理另一侧。</>}</p> : null}
        {bilateralNeedsReferral ? <section className="rm-route-note is-waiting"><span>建议线下确认</span><h2>两侧处理后症状加重</h2><p>先停止本轮处理，并让专业人员重新确认。</p></section> : null}
        {!showingRetest && (isResidualReviewStep ? null : activeNewCandidates.length ? <div className="rm-treatment-round">{activeNewCandidates.map((candidate, index) => <TreatmentActionCard key={candidate.id} candidate={candidate} display={treatmentDisplay(candidate, region?.name || intake.location || "当前部位", intake.swellingLocation, activeTreatmentSide)} imageVariant={actionImageVariant(intake)} priorityLabel={activeNewCandidates.length > 1 ? index === 0 ? "先做" : "配合处理" : undefined} controlMotionIds={activeControlMotionIds} />)}</div> : activeDisplay && displayCandidate ? <TreatmentActionCard candidate={displayCandidate} display={activeDisplay} imageVariant={actionImageVariant(intake)} controlMotionIds={activeControlMotionIds} /> : null)}
        {!showingRetest && intake.userRole !== "general" && activeTarget.optionalCandidates?.length ? <details className="rm-optional-treatment"><summary>可选处理（{activeTarget.optionalCandidates.length}）</summary><p>核心处理后仍有问题时，再从这里补充。</p><div>{activeTarget.optionalCandidates.map((candidate) => { const selectionKey = optionalTreatmentSelectionKey(activeTarget.id, candidate.id); const added = selectedOptionalCandidateIds.includes(selectionKey); return <button type="button" key={candidate.id} disabled={added} onClick={() => setSelectedOptionalCandidateIds((current) => [...current, selectionKey])}><strong>{candidateTreatmentName(candidate)}</strong><span>{added ? "已加入" : "加入本次处理"}</span></button>; })}</div></details> : null}
         {isTimeBasedTarget ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => finishTrial("partial", true)}>完成这项处理</button></div> : canReuseLatestRetest ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={continueWithReusedRetest}>继续下一项</button></div> : isUnspecifiedChiefTarget ? <section className="rm-retest rm-no-action-retest">
          <header><span>本次不做动作评分</span><h2>目前没有确认会引起不适的动作</h2><p>先保存这项处理。活动受限会按该方向的比较方式单独复测，肿胀和压痛留到后续复查。</p></header>
          <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => finishTrial("partial", false, undefined, true, true)}>完成并继续</button></div>
         </section> : !showingRetest && activeTarget.id === "target:chief" && (chiefImprovedDuringTreatment || chiefRetestCompletedDuringTreatment) && !isBatchRangeTarget ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={() => finishTrial("same", false, undefined, false, true)}>完成这项处理，继续下一项</button></div> : !showingRetest ? <div className="rm-one-action"><button type="button" className="rm-primary" onClick={prepareRetest}>{isResidualReviewStep ? "开始复查" : noRetestNeededAfterLatestResult ? "完成并继续下一项" : activeCandidateGroup.length > 1 ? "本轮处理完成，统一复测" : isRangeTarget ? singleRangeRetestsChief ? "处理完成，复测主诉和活动范围" : "处理完成，复测活动范围" : isStrengthSymptomTarget ? "处理完成，复测发力" : hasClearChiefAction(intake) ? "处理完成，复测原来的动作" : "处理完成，复测这个动作"}</button></div> : intake.side === "双侧/中间" ? <section className="rm-retest rm-bilateral-retest"><header><span>感受反馈</span><h2>和刚才比，双侧的疼痛或轻松感有变化吗？</h2></header><div className="rm-result-grid">{([['better','轻了'],['same','没变化'],['worse','更重']] as const).map(([value,label]) => <button type="button" key={value} onClick={() => { setBilateralNeedsReferral(value === "worse"); finishTrial(value); }}>{label}</button>)}</div><p>没有变化时继续检查支持的其他处理；更重时立即停止。</p></section> : isBatchRangeTarget ? <section className={`rm-retest rm-batch-range-retest rm-followup-retest ${isPatellaCombinedUnit ? "is-combined-patella" : ""}`}>
           {isPatellaCombinedUnit ? <header className="rm-combined-retest-header"><span>同一处理单元 · 完成后立即复测</span><h2>刚才受限的髌骨方向</h2><small>只复测刚才标记受限的方向，并记录活动范围和不适。</small></header> : null}
           {shouldRetestChiefInBatch ? <header><span>复测动作</span><h2>{chiefActionLabel(intake)}</h2><strong>处理前 {beforeScore}/10</strong></header> : null}
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
              <header><div><span>动作 {index + 1}</span><strong>{retestShortTitle(finding)}</strong></div><em>{rangeRecorded && symptomRecorded ? "已记录" : "待记录"}</em></header>
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
          <section className={`rm-auto-result is-${batchComplete ? "partial" : "waiting"}`}><span>复测结果</span><strong>{batchResultParts.length ? batchResultParts.join("；") : "请记录每个方向的结果"}</strong><button type="button" className="rm-primary" disabled={!batchComplete} onClick={finishRangeBatch}>继续</button></section>
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
                    else finishTrial("worse", false, undefined, true);
                  }
                }}>继续</button></section>
        </section> : <section className="rm-retest">
          <header><span>复测动作</span><h2>{retestActionTitle}</h2></header>
          {postScoreConfirmed ? <div className="rm-track">
            <div><span>处理前</span><b>{beforeScore}<small>/10</small></b><i style={{ "--dot": `${beforeScore * 10}%` } as CSSProperties} /></div>
            <div className="rm-track-change"><strong>{change.delta > 0 ? `下降 ${change.delta} 分` : change.delta < 0 ? `上升 ${Math.abs(change.delta)} 分` : "分数未变"}</strong><span>{change.percent !== null ? `${change.percent > 0 ? "+" : ""}${change.percent}%` : "不计算比例"}</span></div>
            <div><span>处理后</span><b>{postScore}<small>/10</small></b><i style={{ "--dot": `${postScore * 10}%` } as CSSProperties} /></div>
          </div> : null}
          <ScoreSlider compact value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostDiscomfort(value === 0 ? "no" : "yes"); setPostScoreConfirmed(true); }} label={isStrengthSymptomTarget ? "现在的发力不适程度" : "现在的不适程度"} context={`处理前 ${beforeScore}/10`} />
          <section className={`rm-auto-result is-${postScoreConfirmed ? automaticResult : "waiting"}`}><span>复测结果</span><strong>{!postScoreConfirmed ? "请选择复测分数" : automaticResult === "better" ? `比处理前下降 ${change.delta} 分` : automaticResult === "worse" ? `比处理前上升 ${Math.abs(change.delta)} 分` : "与处理前相同"}</strong><button type="button" className="rm-primary" disabled={!postScoreConfirmed} onClick={() => finishTrial(automaticResult)}>继续</button></section>
        </section>}
        <div className="rm-treatment-back">{showingRetest ? <button type="button" className="rm-retest-return" onClick={returnFromRetestToTreatment}>返回刚才的处理</button> : null}<button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" onClick={editCompletedAssessment}>修改评估答案</button></div>
      </> : chiefNeedsFinalRetest && !treatmentFinalRetestConfirmed ? <>
        <TreatmentRoadmap completed={completedRoadmapItems} current={`统一复测${chiefActionLabel(intake)}`} upcoming={["进入训练"]} />
        <section className="rm-treatment-final-retest">
        <span>本轮处理已完成</span>
        <h2>最后再做一次：{chiefActionLabel(intake)}</h2>
        <p>只在这里统一记录本轮处理后的主诉，不在每项处理后重复询问。</p>
        <ScoreSlider value={postScore} selected={postScoreConfirmed} onChange={(value) => { setPostScore(value); setPostScoreConfirmed(true); }} label="现在的不适程度" context={`最开始 ${intake.baselineScore}/10 · 上次主诉 ${lastImmediateChiefScore}/10`} />
        <div className="rm-one-action"><button type="button" className="rm-primary" disabled={!postScoreConfirmed} onClick={() => { setTreatmentFinalRetestScore(postScore); setTreatmentFinalRetestConfirmed(true); }}>记录本轮最终结果</button></div>
      </section></> : treatmentWorsened ? <section className="rm-complete-panel is-referral"><span>处理已停止</span><h2>刚才的处理使症状或活动表现加重</h2><p>不要继续叠加处理或直接进阶训练。回到本次评估，重新确认活动、症状位置和遗漏因素；无法判断时保存记录并请专业人员协助。</p><div className="rm-page-actions three"><button type="button" className="rm-primary" onClick={() => reopenAssessment("已返回本次评估；请重新确认刚才加重的动作和症状。")}>重新评估</button><button type="button" onClick={() => goToStep(0)}>补充症状信息</button><button type="button" onClick={() => saveRecord("处理后加重，待重新评估")}>保存并结束</button></div></section> : bilateralNeedsReferral ? <section className="rm-complete-panel is-referral"><span>处理复测结束</span><h2>两侧处理后症状加重</h2><p>先停止本轮处理，建议由专业人员重新评估，再决定是否继续训练。</p><div className="rm-page-actions split"><button type="button" onClick={() => reopenAssessment()}>重新评估</button><button type="button" className="rm-primary" onClick={() => saveRecord("待医学评估")}>保存并结束本次</button></div></section> : persistentStabbing ? <section className="rm-complete-panel is-referral"><span>处理复测结束</span><h2>刺痛仍然存在</h2><div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>已保留有效处理方向</small></div><p>相关的自助处理已经完成。原动作仍会刺痛，建议先做线下专业评估，再决定后续负荷训练。</p><div className="rm-page-actions split"><button type="button" onClick={() => reopenAssessment()}>重新评估</button><button type="button" className="rm-primary" onClick={() => saveRecord("待医学评估")}>保存并结束本次</button></div></section> : <section className={`rm-complete-panel ${noImmediateTreatmentResponse ? "is-caution" : ""}`}><span>本阶段成果</span><h2>{chiefComplaintLabel(intake)}</h2>{chiefScoreComparable ? <div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>下降 {Math.max(0, intake.baselineScore - lastChiefScore)} 分</small></div> : intake.side === "双侧/中间" && hasClearChiefAction(intake) ? <div className="rm-no-score-summary"><strong>双侧整体感受已记录</strong><small>双侧场景不生成单侧式评分对比</small></div> : <p>当前没有固定主诉动作，本次未生成动作评分变化。</p>}<StageOutcomeSections effectiveFocusLabels={effectiveFocusLabels} effectiveControlLabels={effectiveControlLabels} recoveredRangeLabels={recoveredRangeLabels} improvedRangeLabels={improvedRangeLabels} trackObservationLabels={trackObservationLabels} strengthProblemTitles={weakStrengthProblems.map((finding) => finding.title)} />{noImmediateTreatmentResponse ? <section className="rm-no-response-note"><strong>本次试处理没有改变主诉</strong><p>先不要增加训练难度；今天只保留低刺激基础活动。症状持续不变、变重或影响承重时，建议线下重新评估。</p></section> : null}<div className="rm-page-actions split"><button type="button" onClick={() => reviewCompletedStep(2)}>查看评估记录</button><button type="button" className="rm-primary" onClick={() => goToStep(4)}>{noImmediateTreatmentResponse ? "查看低刺激基础活动" : "查看训练与居家方案"}</button></div></section>}
    </section>;
  }

  function feedbackAdvice(exercise: FullExercise) {
    const feedback = exerciseFeedback[exercise.id];
    if (!feedback) return "先按建议完成第一组，再根据质量调整。";
    const target = firstNumber(exercise.reps);
    if (feedback.symptom === "worse") return "先停止这个版本，改做“做不了”里的退阶；退阶后仍加重就结束该动作。";
    if (feedback.formChanged || feedback.completed < Math.max(4, target - 3)) return "改做“做不了”里的退阶，减少个数或增加扶持。";
    if (feedback.completed >= target && feedback.reserve >= 5) return "当前版本偏轻松，下次只增加阻力、难度或个数中的一项。";
    if (feedback.reserve >= 2 && feedback.reserve <= 3) return "当前版本合适，保持组数和个数。";
    return "先保持当前版本，观察当天晚些时候和第二天反应。";
  }

  function renderTraining() {
    const trainingHasWorsened = exercises.some((exercise) => exerciseFeedback[exercise.id]?.symptom === "worse");
    const worsenedExercise = exercises.find((exercise) => exerciseFeedback[exercise.id]?.symptom === "worse");
    const worsenedExerciseAssessmentIds = worsenedExercise
      ? assessments.filter((assessment) => (assessment.tags ?? []).some((tag) => worsenedExercise.tags.includes(tag))).map((assessment) => assessment.id).slice(0, 3)
      : [];
    const trainingNeedsChiefRetest = needsTrainingToleranceRetest({
      comparableChief: chiefScoreComparable,
      immediateTiming: tissuePathway.retestTiming === "same-session",
      answeredExerciseCount: exercises.filter((exercise) => Boolean(exerciseFeedback[exercise.id])).length,
    });
    if (trainingReadyForFinalRetest) {
      const finalChange = scoreChange(intake.baselineScore, finalRetestScore);
      const finalResult = finalRetestConfirmed ? resultFromScore(intake.baselineScore, finalRetestScore) : "same";
      return <section className="rm-page rm-overall-retest-page">
        <StepHeading eyebrow="第5步 · 结束前复测" title="最后再看一次整体变化" />
        <section className="rm-overall-retest-action">
          <span>{hasClearChiefAction(intake) ? "再做一次" : "再感受一次"}</span>
          <h2>{hasClearChiefAction(intake) ? chiefActionLabel(intake) : chiefComplaintLabel(intake)}</h2>
          <p>{hasClearChiefAction(intake) ? "按最开始的方式完成一次，不额外增加速度、负重或次数。" : "按最开始记录的位置和感觉，判断现在的主要不适。"}</p>
        </section>
        <ScoreSlider value={finalRetestScore} selected={finalRetestConfirmed} onChange={(value) => { setFinalRetestScore(value); setFinalRetestConfirmed(true); }} label="现在的疼痛或不适是多少分？" context={`最开始 ${intake.baselineScore}/10 · 处理后 ${lastChiefScore}/10`} />
        {finalRetestConfirmed ? <section className={`rm-overall-retest-result is-${finalResult}`}>
          <span>本次整体结果</span>
          <strong>{finalChange.delta > 0 ? `比最开始下降 ${finalChange.delta} 分` : finalChange.delta < 0 ? `比最开始上升 ${Math.abs(finalChange.delta)} 分` : "与最开始相同"}</strong>
          <p>{finalResult === "better" ? "本次方向有帮助，按当前训练版本继续。" : finalResult === "worse" ? "先停止加重的处理和训练，建议线下评估。" : "本次没有明显变化，先不进阶；持续不变时建议线下评估。"}</p>
        </section> : null}
        <div className="rm-page-actions split"><button type="button" onClick={() => setTrainingReadyForFinalRetest(false)}>返回训练</button><button type="button" className="rm-primary" disabled={!finalRetestConfirmed} onClick={() => { setTrainingComplete(true); setTransitionTarget("summary"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>完成并查看总结</button></div>
      </section>;
    }
    return <section className="rm-page">
      <StepHeading eyebrow="第5步 · 训练与居家" title="今天需要做的训练" />
      {tissuePathway.id !== "standard" ? <section className="rm-training-hold"><span>{tissuePathway.title}</span><strong>{tissuePathway.trainingStages[0]}</strong><p>{tissuePathway.trainingStages.join(" → ")}</p></section> : null}
      {noChiefActionAndNoAssessmentProblem ? <section className="rm-training-hold"><span>本次未发现明确异常</span><strong>先做低刺激基础活动</strong><p>保持舒适活动即可；如果实际症状仍存在，请返回重新描述发生经过、当前位置和会加重的动作。</p></section> : null}
      {noImmediateTreatmentResponse ? <section className="rm-training-hold"><span>本次先不进阶</span><strong>只做低刺激基础活动</strong><p>刚才的试处理没有改变主诉。以下动作只用于保持舒适活动和基础控制，不增加速度、阻力或训练量。</p></section> : null}
      <div className="rm-stage-line">{GOALS.map((goal) => <div key={goal.level} className={`${goal.level < exerciseStage ? "is-done" : ""} ${goal.level === exerciseStage ? "is-current" : ""} ${goal.level > intake.goal ? "is-outside" : ""}`}><i>{goal.level < exerciseStage ? "✓" : goal.level}</i><span>{goal.title}</span></div>)}</div>


      {(effectiveFocusLabels.length || effectiveControlLabels.length) ? <section className="rm-effective-home-focus">
        <span>本次改善相关内容</span>
        <div>{effectiveFocusLabels.map((label) => <article key={label}><strong>{label}</strong><small>本轮做完后主诉变轻，可保留轻柔放松</small></article>)}{effectiveControlLabels.map((label) => <article key={label}><strong>{label}</strong><small>本轮做完后主诉变轻，可保留练习</small></article>)}</div>
      </section> : null}

      <div className="rm-exercise-list">{exercises.map((exercise, index) => {
        const open = openExercise === exercise.id;
        const feedback = exerciseFeedback[exercise.id];
        const targetReps = firstNumber(exercise.reps);
        const exerciseVisual = exerciseActionVisual(exercise, actionImageVariant(intake));
        return <article className="rm-exercise" key={exercise.id}>
          <button type="button" className="rm-exercise-summary" aria-expanded={open} onClick={() => setOpenExercise(open ? "" : exercise.id)}><i>{index + 1}</i><span><small>{exercise.startPosition}</small><strong>{exercise.title}</strong></span><b>{exercise.sets} · {exercise.reps}</b><em>{open ? "收起" : "查看做法"}</em></button>
          {open ? <div className="rm-exercise-detail">
            {exerciseVisual ? <ActionReferenceFigure visual={exerciseVisual} /> : <div className="rm-demo-strip is-training"><div><i>1</i><span>起始</span></div><b>→</b><div><i>2</i><span>发力</span></div><b>→</b><div><i>3</i><span>回位</span></div></div>}
            <dl><div><dt>怎么做</dt><dd><b>{exercise.startPosition}开始：</b>{exercise.how}</dd></div><div><dt>做不了</dt><dd>{exercise.easier}</dd></div><div><dt>太轻松</dt><dd>{exercise.harder}</dd></div></dl>
            <section className="rm-first-set"><header><span>第一组做完后，选一个最接近的情况</span><strong>{feedbackAdvice(exercise)}</strong></header><div className="rm-feedback-quick">{([
              ["reduce", "做不了或动作变形"],
              ["hold", "难度正合适"],
              ["progress", "做完还很轻松"],
              ["worse", "做完更不舒服"],
            ] as const).map(([mode, label]) => {
              const selected = mode === "worse" ? feedback?.symptom === "worse" : mode === "reduce" ? Boolean(feedback?.formChanged) : mode === "progress" ? (feedback?.reserve ?? 0) >= 5 && feedback?.symptom !== "worse" : Boolean(feedback && !feedback.formChanged && feedback.reserve >= 2 && feedback.reserve < 5 && feedback.symptom !== "worse");
              return <button type="button" key={mode} className={selected ? "is-selected" : ""} onClick={() => setExerciseFeedback((current) => ({ ...current, [exercise.id]: mode === "worse"
                ? { completed: targetReps, formChanged: false, symptom: "worse", reserve: 3 }
                : mode === "reduce" ? { completed: Math.max(1, targetReps - 3), formChanged: true, symptom: "same", reserve: 0 }
                  : mode === "progress" ? { completed: targetReps, formChanged: false, symptom: "same", reserve: 5 }
                    : { completed: targetReps, formChanged: false, symptom: "same", reserve: 3 } }))}>{label}</button>;
            })}</div></section>
            {!exerciseVisual ? <button type="button" className="rm-video-placeholder" disabled><span>动作视频</span><b>暂未上传</b></button> : null}
          </div> : null}
        </article>;
      })}</div>

      {homeRelaxationTargets.length ? <section className="rm-home-relaxation" aria-label="训练结束后的自主放松">
        <header><span>训练结束后</span><strong>针对性自主放松</strong><small>只安排本次检查紧张、处理有效或训练涉及的肌肉区域</small></header>
        <div>{homeRelaxationTargets.map((target) => <article key={target.id}>
          <div><b>{target.title}</b><span>{target.dosage}</span></div>
          <p>{target.instruction}</p>
          <small>{target.limit}</small>
        </article>)}</div>
        <footer>如果出现刺痛、麻、电感或症状加重，立即停止。</footer>
      </section> : null}

      {trainingHasWorsened ? <section className="rm-training-warning"><strong>{worsenedExercise?.title ?? "训练动作"}后不适更重</strong><p>先停止这个版本，确认停止后的变化；不会直接返回整套评估。</p><div className="rm-page-actions split"><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "training", sourceId: worsenedExercise?.id ?? "training", sourceLabel: worsenedExercise?.title ?? "刚才的训练", timing: "during", beforeScore: lastChiefScore, afterScore: lastChiefScore, relatedAssessmentIds: worsenedExerciseAssessmentIds })}>处理这次加重</button><button type="button" onClick={() => saveRecord("训练后加重，待重新评估")}>保存并结束</button></div></section> : null}

      <section className="rm-next-stage"><span>下一阶段</span><h2>{exerciseStage < intake.goal ? GOALS.find((goal) => goal.level === exerciseStage + 1)?.title : "巩固当前目标能力"}</h2><p>连续两次完成、动作质量稳定且第二天没有持续加重后，一次只增加个数、阻力、动作难度或训练量中的一个变量。</p></section>

      {!trainingHasWorsened ? <div className="rm-page-actions split"><button type="button" onClick={() => goToStep(3)}>返回处理记录</button><button type="button" className="rm-primary" onClick={() => {
        if (!exercises.length || tissuePathway.retestTiming !== "same-session" || !trainingNeedsChiefRetest) {
          setFinalRetestConfirmed(false);
          setTrainingComplete(true);
          setTransitionTarget("summary");
        } else {
          setFinalRetestScore(0);
          setFinalRetestConfirmed(false);
          setTrainingReadyForFinalRetest(true);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}>{!exercises.length ? "完成当前安排，查看总结" : tissuePathway.retestTiming !== "same-session" ? "训练完成，稍后复查" : trainingNeedsChiefRetest ? "训练完成，整体复测" : "训练完成，查看总结"}</button></div> : null}
    </section>;
  }

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
      return { tone: "hold", title: "保持当前方案", text: "复查仍存在的问题，保持当前组数、个数和动作版本。" };
    }
    if (scoreComparison === "worse" || values.includes("worse")) return { tone: "reduce", title: "本次状态比上次差", text: "先完成本次评估，不沿用旧结论直接增加处理或训练。" };
    if (followupCandidates.length) return { tone: "hold", title: "复查后继续上次有效处理", text: "先快速比较相关活动范围，再继续上次有效的轻柔松解，最后进入训练。" };
    if (scoreComparison === "better" && values.filter((item) => item === "better").length >= 1) return { tone: "progress", title: "继续处理，并推进一个变量", text: "仍存在的活动或疼痛问题继续处理；训练一次只进阶一个变量。" };
    return { tone: "hold", title: "保持当前方案", text: "复查仍存在的问题，保持当前组数、个数和动作版本。" };
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
    const followupTrainingNeedsChiefRetest = needsTrainingToleranceRetest({
      comparableChief: hasChiefAction,
      immediateTiming: tissuePathway.retestTiming === "same-session",
      answeredExerciseCount: Object.keys(followupExerciseChoices).length,
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
      ...((intake.symptoms.includes("按压痛") || intake.provocationTypes.includes("按压")) && wasUnresolvedLastSession("tenderness") ? [["tenderness", `按压痛：${intake.tendernessLocation || intake.location}`, "只在同一位置轻按一次"] as [string, string, string]] : []),
      ...((intake.symptomType === "麻或电感" || intake.symptoms.includes("麻、电或感觉变化")) && wasUnresolvedLastSession("sensory") ? [["sensory", `麻或电感：${intake.sensoryLocation || intake.location}`, "比较范围是否变化"] as [string, string, string]] : []),
    ];
    const unresolvedFollowupMotionIds = remainingMotionReviews
      .filter(([id]) => followupTrends[id] !== "better")
      .map(([id]) => id.replace(/^motion:/, ""));
    const followupTensionContext = `${intake.location} ${intake.description} ${intake.symptomType} ${intake.provocationTypes.join(" ")}`;
    const followupTensionOptions = [...new Set(unresolvedFollowupMotionIds.flatMap((directionId) => tensionLocationOptions(directionId, followupTensionContext)))];
    const followupTensionComparisonLabel = intake.side === "双侧/中间" ? "两侧感觉接近" : "没有明显差别";
    const followupTensionRequired = tissuePathway.id === "standard" && !localLimbDecision && unresolvedFollowupMotionIds.length > 0;
    const followupTensionComplete = !followupTensionRequired || followupTensionLocations.length > 0;
    const reviewComplete = reviewItems.every(([id]) => Boolean(followupTrends[id])) && followupTensionComplete;
    const decision = followupDecision(reviewComplete);
    const currentRecords = followupTrialRecords.filter((record) => record.sessionNumber === sessionNumber);
    const followupTreatmentWorsened = treatmentMustStop(currentRecords);
    const lastWorsenedFollowup = [...currentRecords].reverse().find((record) => record.result === "worse" && !record.reviewOnly);
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
      return Boolean(problem.directionId && (record.rangeOutcomes?.[problem.directionId] || record.targetId === `target:motion:${problem.directionId}`));
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
    const followupCompletedLabels = currentRecords
      .filter((record) => !record.reviewOnly && !record.retestOnly)
      .map((record) => record.treatmentName ?? record.candidateTitle)
      .filter((label, index, list) => list.indexOf(label) === index);
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

    if (followupStage === "summary") {
      const completedSummary = sessionHistory.find((item) => item.sessionNumber === sessionNumber) ?? sessionHistory.at(-1);
      const nextRecommendation = recommendNextSession({
        acute: ["今天或昨天", "2～7天"].includes(intake.onset) && intake.mechanism !== "没有明确受伤",
        hasSwelling: intake.symptoms.includes("肿胀或淤青") && completedSummary?.reviewResults.some((item) => item.id === "swelling" && item.result !== "better") !== false,
        hasImmediateTreatment: Boolean(completedSummary?.treatments.length),
        hasUnresolvedMobility: Boolean(completedSummary?.reviewResults.some((item) => item.id.startsWith("motion:") && item.result !== "better")),
        hasTraining: Boolean(completedSummary?.training.length),
        trainingStage: exerciseStage,
        waitingForMedicalClearance: structuralImagingSignal || assessmentNeedsReferral,
        worsened: Boolean(completedSummary?.reviewResults.some((item) => item.result === "worse") || completedSummary?.treatments.some((item) => item.result === "worse")),
      });
      return <section className="rm-page rm-session-summary">
        <StepHeading eyebrow={`第${sessionNumber}次康复`} title="本次康复总结" />
        <section className="rm-session-hero"><div><span>本次主诉</span><h2>{chiefComplaintLabel(intake)}</h2><p>本次康复已经保存</p></div>{typeof completedSummary?.endingScore === "number" ? <div className="rm-final-score"><b>{completedSummary.startedScore ?? previousSessionScore ?? "—"}</b><i>→</i><strong>{completedSummary.endingScore}</strong><small>/10</small></div> : null}</section>
        <div className="rm-summary-dashboard">
          <section className="rm-summary-module is-treatments"><header><div><span>本次处理</span><strong>{completedSummary?.treatments.length ?? 0}项</strong></div></header><div className="rm-summary-compact-list">{completedSummary?.treatments.length ? completedSummary.treatments.map((item) => <article key={item.id}><strong>{item.label}</strong><span>{item.result === "better" ? "有效" : item.result === "partial" ? "部分改善" : item.result === "worse" ? "已停止" : "变化不明显"}</span></article>) : <p>本次没有新增现场处理。</p>}</div></section>
          <section className="rm-summary-module is-training"><header><div><span>居家训练</span><strong>{completedSummary?.training.length ?? 0}个</strong></div></header><div className="rm-summary-compact-list">{completedSummary?.training.map((item) => <article key={item.id}><strong>{item.label}</strong><span>{item.adjustment === "progress" ? "进阶一项" : item.adjustment === "reduce" ? "降低一档" : "保持当前"}</span></article>)}{homeRelaxationTargets.map((target) => <article key={target.id}><strong>{target.title}</strong><span>{target.dosage}</span></article>)}</div></section>
        </div>
        <NextSessionCard recommendation={nextRecommendation} nextSessionNumber={sessionNumber + 1} completedAt={completedSummary?.completedAt} onStart={startNextFollowupSession} onReportWorsening={() => beginAdverseReassessment({ source: "after-session", sourceId: `session-${sessionNumber}`, sourceLabel: `第${sessionNumber}次康复结束后的反应`, timing: "later", beforeScore: completedSummary?.endingScore ?? followupSessionScore, afterScore: completedSummary?.endingScore ?? followupSessionScore, relatedAssessmentIds: completedSummary?.reviewResults.filter((item) => item.result !== "better").map((item) => item.id) ?? [] })} />
      </section>;
    }

    if (followupStage === "treatment" && followupTreatmentWorsened) return <section className="rm-page">
      <StepHeading eyebrow={`第${sessionNumber}次康复 · 处理并复测`} title="本次处理已暂停" />
      <section className="rm-complete-panel is-referral"><span>刚才的反应</span><h2>症状或活动表现变差</h2><p>先停止刚才的处理，只确认症状变化和直接相关的检查。</p><div className="rm-page-actions split"><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "treatment", sourceId: lastWorsenedFollowup?.candidateId ?? "followup-treatment", sourceLabel: lastWorsenedFollowup?.treatmentName ?? lastWorsenedFollowup?.candidateTitle ?? "刚才的处理", timing: "immediate", beforeScore: lastWorsenedFollowup?.beforeScore ?? followupScore, afterScore: lastWorsenedFollowup?.afterScore ?? followupSessionScore, relatedAssessmentIds: Object.keys(lastWorsenedFollowup?.rangeOutcomes ?? {}).map((id) => `motion:${id}`) })}>确认加重后的变化</button><button type="button" onClick={() => saveRecord("处理后加重，待重新评估")}>保存并结束</button></div></section>
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
        {!followupReadyToRetest ? <TreatmentActionCard candidate={selectedCandidate} display={selectedDisplay} imageVariant={actionImageVariant(intake)} controlMotionIds={followupControlMotionIds} /> : null}
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
              const previousScore = currentRangeScores[directionId]
                ?? previousFollowupRangeScores[directionId]
                ?? latestRangeScoreForDirection(directionId)
                ?? (assessmentResults[finding.id]?.discomfort === "yes" ? assessmentResults[finding.id]?.symptomScore : samePhysicalAction(directionId, followupChiefDirection) ? followupBeforeScore : undefined);
              const comparison = assessments.find((item) => item.id === finding.id)?.comparison ?? "contralateral";
              const canUsePassive = directionAllowsPassive(directionId);
              const passiveOnly = assessments.find((item) => item.id === finding.id)?.testMode === "passive";
              const rangeRecorded = Boolean(selected);
              const symptomRecorded = knownDiscomfort ? Boolean(followupMovementScoreConfirmed[directionId]) : Boolean(discomfort) && (discomfort !== "yes" || Boolean(followupMovementScoreConfirmed[directionId]));
              return <article key={finding.id} className={rangeRecorded && symptomRecorded ? "is-complete" : "is-pending"}><header><div><span>动作 {index + 1}</span><strong>{followupShortTitle(finding)}</strong></div><em>{rangeRecorded && symptomRecorded ? "已记录" : "待记录"}</em></header><section className="rm-retest-field"><div className="rm-retest-field-title"><span>{passiveOnly ? "被动活动范围" : "活动范围"}</span><small>先选一项</small></div><h3>{activeMotionRangeQuestion(finding.id, intake.side === "双侧/中间", passiveOnly)}</h3><AnswerChoiceGrid options={rangeRetestOptions(comparison, canUsePassive, intake.side === "双侧/中间", passiveOnly)} value={selected} onChange={(value) => setFollowupMovementResponses((current) => ({ ...current, [directionId]: value }))} /></section>{knownDiscomfort ? <section className="rm-retest-score-field"><div className="rm-retest-field-title"><span>不适评分</span><small>参考上次分数选择现在的程度</small></div><ScoreSlider compact value={followupMovementScores[directionId] ?? 0} selected={Boolean(followupMovementScoreConfirmed[directionId])} onChange={(value) => {
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
              const result: TrialResult = scoreResult === "worse" || anyWorse ? "worse" : allResolved && scoreResult === "better" ? "better" : hasRangeChange || scoreResult === "better" ? "partial" : "same";
              recordFollowupTrial(result, false, rangeOutcomes, rangeDiscomforts, rangeScores);
            }}>继续</button></section>
          </section> : !shouldRetestChiefNow ? <section className="rm-auto-result is-partial"><span>下一步</span><strong>{hasChiefAction ? "继续完成其余处理" : "当前没有固定动作，本次不做动作评分"}</strong><button type="button" className="rm-primary" onClick={() => recordFollowupTrial("partial")}>继续</button></section> : <section className={`rm-auto-result is-${followupPostScoreConfirmed ? resultFromScore(followupBeforeScore, followupPostScore) : "waiting"}`}><span>下一步</span><strong>{!followupPostScoreConfirmed ? "请选择现在有没有不适" : followupPostScore < followupBeforeScore ? `下降 ${followupBeforeScore - followupPostScore} 分，保留这项处理` : followupPostScore > followupBeforeScore ? `上升 ${followupPostScore - followupBeforeScore} 分，停止这项处理` : "分数没有变化，换下一项"}</strong><button type="button" className="rm-primary" disabled={!followupPostScoreConfirmed} onClick={() => recordFollowupTrial(resultFromScore(followupBeforeScore, followupPostScore))}>继续</button></section>}
        </section>}
        {followupReadyToRetest ? <div className="rm-treatment-back"><button type="button" className="rm-retest-return" onClick={returnFromFollowupRetestToTreatment}>返回刚才的处理</button></div> : null}
      </> : followupNeedsTreatmentFinalRetest ? <section className="rm-treatment-final-retest">
        <span>处理阶段复测</span>
        <h2>{chiefActionLabel(intake)}</h2>
        <ScoreSlider value={followupPostScore} selected={followupPostScoreConfirmed} onChange={(value) => { setFollowupPostScore(value); setFollowupPostScoreConfirmed(true); }} label="现在的不适程度" context={`本次处理前 ${followupScore}/10`} />
        <div className="rm-one-action"><button type="button" className="rm-primary" disabled={!followupPostScoreConfirmed} onClick={finishFollowupTreatmentRetest}>记录并进入训练</button></div>
      </section> : <section className="rm-route-note"><h2>{currentRecords.length === 0 && followupCandidates.length === 0 ? "本次没有新的即时处理" : "需要处理的项目已完成"}</h2>{currentRecords.length === 0 && followupCandidates.length === 0 ? <p>已恢复的项目不重复处理；力量和动作控制进入训练，仍说不清或无法完成的项目保留待确认。</p> : null}<button type="button" className="rm-primary" onClick={() => setFollowupStage("training")}>查看训练调整</button></section>}
      {selectedCandidate ? <div className="rm-page-actions"><button type="button" onClick={() => setFollowupStage("review")}>返回本次复查</button></div> : null}
    </section>;

    if (followupStage === "training" && followupTrainingReadyForRetest) return <section className="rm-page">
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
      {tissuePathway.id === "standard" && followupTensionLocations.some((location) => !["没有明显差别", "两侧感觉接近"].includes(location)) ? <section className="rm-training-preparation"><header><span>训练前准备</span><strong>先做一次轻柔松解</strong></header><div>{followupTensionLocations.filter((location) => !["没有明显差别", "两侧感觉接近"].includes(location)).slice(0, 2).map((location) => <article key={location}><b>{location}</b><span>轻柔松解30～60秒</span></article>)}</div><footer>完成后直接开始训练，不新增复测步骤。</footer></section> : null}
      <div className="rm-followup-training">{exercises.map((exercise) => {
        const choice = followupExerciseChoices[exercise.id];
        return <article key={exercise.id}><header><div><strong>{exercise.title}</strong><span>{exercise.sets} · {exercise.reps}</span></div><b>第{exercise.stage}层</b></header><p>{choice === "reduce" ? exercise.easier : choice === "progress" ? exercise.harder : choice === "worse" ? "先停止当前版本，记录停止后的反应。" : exercise.observe}</p><div>{([[
          "reduce", "降低一档"], ["hold", "保持当前"], ["progress", "进阶一项"], ["worse", "做完更不舒服"]] as Array<[FollowupExerciseChoice, string]>).map(([value, label]) => <button type="button" key={value} disabled={value === "progress" && ["reduce", "review"].includes(decision.tone)} className={choice === value ? "is-selected" : ""} onClick={() => setFollowupExerciseChoices((current) => ({ ...current, [exercise.id]: value }))}>{label}</button>)}</div></article>;
      })}</div>
      {followupWorsenedExercise ? <section className="rm-training-warning"><strong>{followupWorsenedExercise.title}后不适更重</strong><p>先停止这个版本，确认停止后的变化。</p><button type="button" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "training", sourceId: followupWorsenedExercise.id, sourceLabel: followupWorsenedExercise.title, timing: "during", beforeScore: followupSessionScore, afterScore: followupSessionScore, relatedAssessmentIds: followupWorsenedExerciseAssessmentIds })}>处理这次加重</button></section> : <><section className="rm-next-stage"><span>下次继续</span><h2>先复查旧问题，再决定是否进阶</h2></section>
      <div className="rm-page-actions split"><button type="button" onClick={() => setFollowupStage("treatment")}>返回继续处理</button><button type="button" className="rm-primary" onClick={() => { if (!followupTrainingNeedsChiefRetest) { completeFollowupSession(); return; } setFollowupFinalScore(0); setFollowupFinalScoreConfirmed(false); setFollowupTrainingReadyForRetest(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{followupTrainingNeedsChiefRetest ? "训练完成，整体复测" : `保存第${sessionNumber}次康复`}</button></div></>}
    </section>;

    return <section className="rm-page">
      <StepHeading eyebrow={`第${sessionNumber}次康复 · 评估检查`} title="先复查，再决定今天做什么" />
      <section className="rm-session-reference"><span>本次沿用</span><strong>{[intake.location, intake.symptomType, chiefWasRecorded ? chiefActionLabel(intake) : "没有固定动作"].filter(Boolean).join(" · ")}</strong></section>
      {sessionHistory.length ? <section className="rm-session-history-strip"><header><span>恢复记录</span><strong>已完成 {sessionHistory.length} 次</strong></header><div className="rm-session-score-trend">{scoreTrend.map((item) => <article key={item.sessionNumber}><span>第{item.sessionNumber}次</span><strong>{item.score}<small>/10</small></strong></article>)}</div>{previousSession ? <div className="rm-last-session-summary"><article><span>上次有效处理</span><strong>{previousSession.continuedEffectiveTreatments.join("、") || "无"}</strong></article><article><span>上次训练</span><strong>{previousSession.training.map((item) => item.label).join("、") || "无"}</strong></article><article><span>本次先关注</span><strong>{previousFocus.join("；") || "快速复查当前情况"}</strong></article></div> : null}</section> : null}
      <section className="rm-followup-new"><div><span>有没有新症状或新的受伤事件？</span></div><div><button type="button" className={hasNewSymptom === "no" ? "is-selected" : ""} onClick={() => { if (hasNewSymptom !== "no") invalidateCurrentFollowupWork(); setHasNewSymptom("no"); }}>没有</button><button type="button" className={hasNewSymptom === "yes" ? "is-selected is-alert" : ""} onClick={() => { if (hasNewSymptom !== "yes") invalidateCurrentFollowupWork(); setHasNewSymptom("yes"); }}>有</button></div></section>
      {hasChiefAction ? <ScoreHistory scores={history} condition={retestConditionLabel(intake)} /> : null}
      {hasChiefAction ? <ScoreSlider value={followupScore} selected={followupScoreConfirmed} onChange={updateFollowupScore} label="现在做主诉动作，有多不舒服？" context={chiefActionLabel(intake)} /> : <section className="rm-route-note"><h2>{chiefWasRecorded && !chiefScoreComparable ? "双侧主诉采用整体感受记录" : chiefWasRecorded ? "主诉分数已经很低" : "当前没有固定主诉动作"}</h2><p>{chiefWasRecorded && !chiefScoreComparable ? "复查双侧整体感受、活动范围和动作质量，不生成单侧式前后评分。" : chiefWasRecorded ? "仍会快速复查相关活动范围，并继续上次有效的处理。" : "本次先复查活动度、肿胀或按压痛等已有问题，不强行生成动作评分。"}</p></section>}
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
      {followupTensionRequired ? <section className="rm-followup-tension"><header><span>肌肉紧张度复查</span><strong>轻按比较两侧</strong></header><ol><li>{intake.side === "双侧/中间" ? "左、右两侧分别检查。" : "先检查另一侧，再检查不舒服的一侧。"}</li><li>用指腹和相近力度，依次轻按下面列出的区域。</li><li>选出明显更紧或更酸的位置；不要按骨头、关节缝或肿胀中心。</li></ol><div>{[...followupTensionOptions, followupTensionComparisonLabel].map((location) => {
        const selected = followupTensionLocations.includes(location);
        return <button type="button" key={location} className={selected ? "is-selected" : ""} onClick={() => setFollowupTensionLocations((current) => {
          const alreadySelected = current.includes(location);
          return location === followupTensionComparisonLabel
            ? alreadySelected ? [] : [location]
            : alreadySelected ? current.filter((entry) => entry !== location) : [...current.filter((entry) => !["没有明显差别", "两侧感觉接近"].includes(entry)), location];
        })}>{location}</button>;
      })}</div></section> : null}
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

  function renderSummary() {
    const resolvedChiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
    const muscleProblems = findings
      .filter((finding) => !finding.internal && finding.id.startsWith("tension:"))
      .map((finding): TreatmentProblem => ({ id: finding.id, kind: "肌肉", title: finding.title.replace(/肌张力增高$/, "").trim() || "相关肌群", status: "双侧触诊比较异常", findingIds: [finding.id], directionId: anyMotionIdFromFinding(finding) }))
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
    const summaryProblems = [...treatmentProblems.filter((problem) => problem.kind !== "检查发现"), ...muscleProblems, ...strengthProblems]
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
      "查看居家训练的完成质量，以及当天晚些时候和第二天的反应",
    ].filter((focus, index, list) => list.indexOf(focus) === index).slice(0, 3);
    if (followupMode) return renderFollowup();

    const summaryTreatmentFeedback = (record: TrialRecord) => {
      if (record.responseRole === "key-completion") return "在前面已有部分改善的基础上，本项使剩余主诉降至0；记录为关键完成项";
      if (record.responseRole === "independent-completion") return "本项单独使当前主诉降至0；下次有自然症状时优先复验";
      if (record.responseRole === "partial-contribution") return "主诉部分下降，说明该区域有贡献，但仍有剩余来源需要处理";
      if (record.responseRole === "range-contribution") return "活动表现改善，主诉未同步改变；保留为活动相关候选";
      if (record.responseRole === "not-immediately-testable") return "本次无法单独归因，留待后续康复观察";
      if (record.timeBased) return "留到今天晚些时候或下次比较";
      if (record.rangeOutcomes && Object.keys(record.rangeOutcomes).length) {
        const restored = Object.values(record.rangeOutcomes).filter((outcome) => outcome === "both-match").length;
        return restored === Object.keys(record.rangeOutcomes).length
          ? "相关活动已接近比较目标"
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
      hasTraining: exercises.length > 0,
      trainingStage: exerciseStage,
      waitingForMedicalClearance: structuralImagingSignal || hasSafetySignal && !hasClearance || assessmentNeedsReferral,
      worsened: treatmentWorsened || exercises.some((exercise) => exerciseFeedback[exercise.id]?.symptom === "worse"),
    });
    return <section className="rm-page rm-session-summary">
      <StepHeading eyebrow="第6步" title="本次康复总结" />
      <section className="rm-session-hero"><div><span>{hasClearChiefAction(intake) ? "本次主诉" : "本次症状信息"}</span><h2>{chiefComplaintLabel(intake)}</h2><p>{hasClearChiefAction(intake) ? `当前诱发动作：${chiefActionLabel(intake)}` : "本次没有确认固定诱发动作"}</p></div>{chiefScoreComparable ? <div className="rm-final-score"><b>{intake.baselineScore}</b><i>→</i><strong>{sessionEndScore}</strong><small>下降 {Math.max(0, intake.baselineScore - sessionEndScore)} 分</small></div> : <div className="rm-no-score-summary"><strong>{hasClearChiefAction(intake) ? "双侧整体感受已记录" : "未生成动作评分变化"}</strong><small>{hasClearChiefAction(intake) ? "双侧场景不生成单侧式评分对比" : "避免把一般不适评分误当作同一动作复测"}</small></div>}</section>
      <div className="rm-summary-dashboard">
        <div className="rm-summary-column">
          <section className="rm-summary-module is-findings"><header><div><span>评估结果</span><strong>{summaryProblems.length}项</strong></div></header>{summaryProblemGroups.length ? <div className="rm-summary-finding-groups">{summaryProblemGroups.map((group) => <article key={group.key}><b>{group.label}</b><ul>{group.items.map((problem) => <li key={problem.id}><strong>{problem.title}</strong>{problem.status ? <span>{problem.status}</span> : null}</li>)}</ul></article>)}</div> : <p>未记录明确异常。</p>}</section>
          <section className="rm-summary-module is-training"><header><div><span>居家训练</span><strong>{exercises.length}个</strong></div></header><div className="rm-summary-compact-list">{exercises.map((exercise) => <article key={exercise.id}><strong>{exercise.title}</strong><span>{exercise.sets} · {exercise.reps}</span></article>)}{homeRelaxationTargets.map((target) => <article key={target.id}><strong>{target.title}</strong><span>{target.dosage}</span></article>)}</div></section>
        </div>
        <div className="rm-summary-column">
          <section className="rm-summary-module is-treatments"><header><div><span>处理记录</span><strong>{summarizedTreatments.length}项</strong></div></header>{summarizedTreatments.length ? <><div className="rm-summary-treatment-cards">{summarizedTreatments.map((record) => <article key={record.treatmentKey ?? record.candidateId} className={`is-${record.result}`}><header><span>{record.responseRole === "key-completion" ? "关键完成" : record.responseRole === "independent-completion" ? "单项完成" : record.responseRole === "partial-contribution" ? "部分贡献" : record.responseRole === "range-contribution" ? "活动改善" : record.result === "better" ? "有效" : record.result === "partial" ? "待巩固" : record.result === "worse" ? "已停止" : "变化小"}</span><strong>{record.treatmentName ?? record.candidateTitle}</strong></header><p>{summaryTreatmentFeedback(record)}</p></article>)}</div>{resolvedTreatmentCombination(summarizedTreatments).length > 1 ? <section className="rm-effective-combination"><strong>本次组合解决</strong><span>{resolvedTreatmentCombination(summarizedTreatments).map((record) => record.treatmentName ?? record.candidateTitle).join(" ＋ ")}</span><small>记录处理顺序与组合反应，不直接认定病因。</small></section> : null}</> : <p>本次无处理记录。</p>}</section>
          <section className="rm-summary-module is-next"><header><div><span>下次复查</span><strong>{nextFocus.length}项</strong></div></header><ol>{nextFocus.map((focus) => <li key={focus}>{focus}</li>)}</ol></section>
        </div>
      </div>
      <NextSessionCard recommendation={nextSessionRecommendation} nextSessionNumber={2} completedAt={sessionHistory.find((item) => item.sessionNumber === 1)?.completedAt} onStart={startSecondSession} onReportWorsening={() => beginAdverseReassessment({ source: "after-session", sourceId: "session-1", sourceLabel: "本次康复结束后的反应", timing: "later", beforeScore: sessionEndScore, afterScore: sessionEndScore, relatedAssessmentIds: findings.filter((finding) => finding.id.startsWith("motion:")).map((finding) => finding.id).slice(0, 3) })} />
      <div className="rm-page-actions split"><button type="button" onClick={() => goToStep(4)}>返回训练</button><button type="button" className="rm-primary" onClick={() => saveRecord("待复查")}>保存本次记录</button></div>
    </section>;
  }

  const summaryFacts = [
    { label: "当前诱发动作", value: intake.parsed ? chiefActionLabel(intake) : "等待描述" },
    { label: "位置", value: intake.bodyLocations.length ? intake.bodyLocations.map((item) => `${item.side} · ${item.location}`).join("；") : "待确认" },
    { label: "时间", value: intake.onset || "待确认" },
    { label: "感觉", value: intake.symptomType || "待确认" },
    { label: "什么时候出现", value: hasClearChiefAction(intake) ? chiefActionLabel(intake) : intake.provocationTypes.length ? intake.provocationTypes.join("、") : "待确认" },
    ...(intake.symptoms.includes("肿胀或淤青") ? [{ label: "肿胀位置", value: intake.swellingLocation || "待确认" }] : []),
    ...(intake.symptoms.includes("按压痛") || intake.provocationTypes.includes("按压") ? [{ label: "按压痛位置", value: intake.tendernessLocation || "待确认" }] : []),
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
    { field: "诱发场景", value: provocationConfirmedForFlow ? hasClearChiefAction(intake) ? chiefActionLabel(intake) : intake.provocationTypes.join("、") || "没有固定动作" : "待补充" },
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
          ? intake.side === "双侧/中间" && hasClearChiefAction(intake) ? "双侧整体感受记录，不生成单侧式评分对比" : "当前一般不适评分，不生成动作前后对比"
        : followupMode
          ? followupStage === "review" && !followupScoreConfirmed ? `上次结束 ${sessionHistory.find((item) => item.sessionNumber === sessionNumber - 1)?.endingScore ?? sessionHistory.at(-1)?.endingScore ?? sessionEndScore}分 · 等待本次复测` : followupTrainingReadyForRetest && followupFinalScoreConfirmed ? `本次训练前 ${latestFollowupRecord?.afterScore ?? followupScore}分 → 结束复测 ${followupFinalScore}分` : `第${sessionNumber}次康复当前评分`
      : step >= 4 && finalRetestConfirmed ? `初次 ${intake.baselineScore}分 → 结束复测 ${sessionEndScore}分` : step >= 3 && lastChiefScore !== intake.baselineScore ? `初次 ${intake.baselineScore}分 → 当前 ${lastChiefScore}分` : "首次评分，后续复测会显示作参考";
  const displayedStep = reviewStep ?? step;
  const railStep: Step = followupMode
    ? followupStage === "review" ? 2 : followupStage === "treatment" ? 3 : 4
    : step;
  const renderStepContent = (targetStep: Step) => targetStep === 0 ? renderIntake() : targetStep === 1 ? renderSafety() : targetStep === 2 ? renderAssessment() : targetStep === 3 ? renderTreatment() : targetStep === 4 ? renderTraining() : renderSummary();

  return <main className="rm-app">
    <header className="rm-topbar">
      <button type="button" className="rm-brand" onClick={resetDemo}><b>RM</b><span><strong>RehabMind</strong><small>康复思路工作台</small></span></button>
      <div className="rm-top-context"><span>{region?.name ?? "新评估"}</span><i>·</i><b>{reviewStep !== null ? `回看：${STEPS[reviewStep]}` : transitionTarget ? STAGE_TRANSITIONS[transitionTarget].title : STEPS[railStep]}</b></div>
      <div className="rm-top-actions"><button type="button" onClick={() => setRecordsOpen(true)}>康复记录 <b>{savedRecords.length}</b></button><button type="button" onClick={() => saveRecord(step === 1 && hasSafetySignal && !hasClearance ? "等待影像" : "待复查")}>保存</button></div>
    </header>

    <div className={`rm-shell ${displayedStep === 0 ? "is-intake-step" : ""}`}>
      <nav className="rm-step-rail" aria-label="康复流程">{STEPS.map((label, index) => {
        const available = followupMode ? index <= railStep : index <= maxUnlocked || index <= step;
        const reviewing = reviewStep === index;
        return <button type="button" key={label} disabled={!available} className={`${railStep === index && reviewStep === null ? "is-current" : ""} ${index < railStep ? "is-done" : ""} ${reviewing ? "is-reviewing" : ""}`} onClick={() => {
          if (index < railStep) reviewCompletedStep(index as Step);
          else if (index === railStep) { setReviewStep(null); setReviewStepEditable(false); }
          else goToStep(index as Step);
        }}><i>{index < railStep ? "✓" : index + 1}</i><span>{label}</span><b>{reviewing ? "正在回看" : railStep === index ? "进行中" : index < railStep ? "可回看" : available ? "可进入" : "待解锁"}</b></button>;
      })}<section><span>当前康复</span><strong>第{sessionNumber}次</strong><small>{followupMode ? "复查上次问题" : "第一次完整评估"}</small></section></nav>

      <section className="rm-workspace">{reviewStep !== null ? <>
        <section className={`rm-readonly-banner ${reviewStepEditable ? "is-editing" : ""}`}><div><span>{reviewStepEditable ? "修改评估" : "只读回看"}</span><strong>{reviewStepEditable ? "只有答案改变，后续处理才会重新生成" : "这里不会改变当前进度"}</strong></div><button type="button" onClick={() => { setReviewStep(null); setReviewStepEditable(false); }}>返回当前步骤</button></section>
        <div className={reviewStepEditable ? "rm-review-editable-content" : "rm-readonly-content"}>{renderStepContent(reviewStep)}</div>
      </> : transitionTarget
        ? <StageTransition target={transitionTarget} onBack={() => setTransitionTarget(null)} onContinue={continueStageTransition} />
        : renderStepContent(step)}</section>

      <aside className={`rm-case-aside ${summaryOpen ? "is-open" : ""}`}>
        {displayedStep === 0 ? <>
          <header><div><span>已收集信息</span><strong>{intake.parsed ? `已确认 ${completedIntakeItemCount} 项` : "0项"}</strong></div><button type="button" onClick={() => setSummaryOpen(false)}>关闭</button></header>
          {intake.parsed ? <><section className="rm-intake-progress">{visibleIntakeProgressItems.map((item) => <button type="button" key={item.field} data-intake-field={item.field} className={`${item.field === currentIntakeField && !showAllIntakeFields ? "is-current" : ""} ${item.value === "待补充" ? "is-missing" : "is-complete"} ${item.value === "待补充" && highlightedIntakeFields.includes(item.field) ? "is-highlighted" : ""}`} onClick={() => { setHighlightedIntakeFields((current) => current.filter((field) => field !== item.field)); jumpToIntakeQuestion(item.field); }}><span>{item.field}</span><strong>{item.value}</strong><i>{item.value === "待补充" ? "当前" : "修改"}</i></button>)}</section>
          <button type="button" className="rm-aside-edit" onClick={() => setShowAllIntakeFields(true)}>≡ 全部信息</button></> : <section className="rm-aside-empty">填写症状描述后，识别结果和待补充项目会显示在这里。</section>}
        </> : <>
          <header><div><span>已收集信息</span><strong>{summaryFacts.filter((item) => !["待确认", "等待描述", "尚未确认"].includes(item.value)).length + collectedFindings.length}项</strong></div><button type="button" onClick={() => setSummaryOpen(false)}>关闭</button></header>
          {intake.baselineScoreConfirmed ? <section className="rm-aside-score"><span>主要问题评分</span><strong>{displayedMainScore}<small>{displayedMainScore === "—" ? "" : "/10"}</small></strong><p>{displayedScoreNote}</p></section> : null}
          <dl>{summaryFacts.map((fact, index) => <div key={`${fact.label}:${index}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
          {collectedFindings.length ? <section className="rm-aside-findings"><header><span>评估结果</span><strong>{collectedFindings.length}项</strong></header><div className="rm-aside-finding-groups">{collectedFindingGroups.map((group) => <section key={group.key} className={`is-${group.key}`}><header><i aria-hidden="true" /><strong>{group.label}</strong><span>{group.items.length}</span></header>{group.items.map((finding) => { const meta = findingAsideMeta(finding); return <article key={finding.id}><div><strong>{professionalFindingLabel(finding)}</strong>{meta ? <span>{meta}</span> : null}</div></article>; })}</section>)}</div></section> : <section className="rm-aside-empty">{followupMode ? "本次复查暂未保留未解决异常。" : "评估完成后显示异常结果。"}</section>}
          <button type="button" className="rm-aside-edit" onClick={() => goToStep(0)}>返回修改症状信息</button>
        </>}
      </aside>
    </div>

    <button type="button" className="rm-mobile-summary" onClick={() => setSummaryOpen(true)}><span>已收集信息</span><b>{intake.parsed ? `${intake.baselineScoreConfirmed ? `${intake.baselineScore}分 · ` : ""}${intake.location || "待补位置"}` : "查看"}</b></button>

    {recordsOpen ? <div className="rm-modal-backdrop" role="presentation" onMouseDown={() => setRecordsOpen(false)}><section className="rm-records-modal" role="dialog" aria-modal="true" aria-label="康复记录" onMouseDown={(event) => event.stopPropagation()}><header><div><span>保存在本机的Demo记录</span><h2>康复记录</h2></div><button type="button" onClick={() => setRecordsOpen(false)}>关闭</button></header>{savedRecords.length ? <div>{savedRecords.map((record) => <article key={record.id} className="rm-record-case"><div><span>{record.status} · 已记录 {record.sessionHistory?.length || record.sessionCount} 次</span><strong>{record.complaint}</strong><small>{record.region} · {record.goal}</small>{record.sessionHistory?.length ? <div className="rm-record-session-list">{record.sessionHistory.map((session) => <i key={session.sessionNumber}>第{session.sessionNumber}次{typeof session.endingScore === "number" ? ` · ${session.endingScore}/10` : ""}</i>)}</div> : null}</div>{record.scoreComparable !== false ? <b>{record.initialScore}<i>→</i>{record.latestScore}<small>/10</small></b> : <b>{record.initialScore}<small>/10 · 一般不适记录</small></b>}<button type="button" className="rm-record-continue" disabled={!record.snapshot} onClick={() => restoreRecord(record)}>{record.status === "等待影像" ? "补充影像" : "继续"}</button></article>)}</div> : <section className="rm-record-empty"><strong>还没有保存记录</strong><p>完成一次评估后，可以从这里查看评分和康复次数。</p></section>}<footer><button type="button" onClick={resetDemo}>新建一份评估</button><button type="button" disabled={!savedRecords.length} onClick={() => { localStorage.removeItem("rehabmind-complete-demo-records"); setSavedRecords([]); }}>清空Demo记录</button></footer></section></div> : null}

    {toast ? <button type="button" className="rm-toast" onClick={() => setToast("")}>{toast}</button> : null}
  </main>;
}
