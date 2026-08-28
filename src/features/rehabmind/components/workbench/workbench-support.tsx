"use client";

import { useState } from "react";









import { type FunctionUnableReason } from "@/src/features/rehabmind/controllers/use-function-retest";
import { type ExerciseFeedback } from "@/src/features/rehabmind/controllers/use-training-flow";


import { type CompletedRangeRetestAnswer, type RangeRetestAnswer, type TrialRecord, type TrialResult, type YesNo } from "@/src/domain/rehab/treatment/trial-record-types";
import { makeLowerLimbLocationSelection, type LowerLimbAreaId, type LowerLimbLocationSelection } from "@/src/features/rehabmind/components/assessment/lower-limb-location-picker";
import { MuscleRegionTreatmentMap } from "@/src/features/rehabmind/components/assessment/muscle-region-location-picker";
import { FULL_REGIONS, type FullCandidate, type FullExercise, type FullRegionId } from "@/src/knowledge/pilot/full-demo-content";
import { type PilotIntakeInput } from "@/src/domain/rehab/shared/pilot-decision-engine";



import { type TreatmentResponseRole } from "@/src/domain/rehab/treatment/treatment-response-core";








import { type PilotCaseAccess } from "@/src/infrastructure/pilot/api/case-client";








import { validatePilotSnapshotV3 } from "@/src/infrastructure/pilot/persistence/snapshot-schema";
import { deriveMedicalGuidance, type MedicalGuidance } from "@/src/domain/rehab/intake/medical-guidance-core";
import { type BodyMark } from "@/src/domain/rehab/records/body-mark-core";
import { type ScoreRecord } from "@/src/domain/rehab/records/score-record-core";
import { type SpecialTestRecord } from "@/src/domain/rehab/records/special-test-record-core";
import { type ProfessionalNoteRecord } from "@/src/domain/rehab/records/professional-note-record-core";
import { type DecisionTrace } from "@/src/domain/rehab/records/decision-trace-core";
import { type RangeMeasurement } from "@/src/domain/rehab/assessment/range-measurement-core";




import { type RehabSessionSummary } from "@/src/features/rehabmind/workflow/session-history";
import { type ProblemThreadRecord, type SessionIndexRecord, type SessionLifecycleStatus } from "@/src/domain/rehab/history/session-identity-core";


import { controlPlansForMotions, normalizePilotMuscleRegion, pilotMuscleRegion, pilotMotionKnowledge, primaryRetestMotionIdsForRegion, professionalAssessmentTitle, regionRelationForMotion } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import { type StrengthUnableReason } from "@/src/domain/rehab/assessment/assessment-answer-core";

import { canonicalActionKey, samePhysicalAction } from "@/src/domain/rehab/intake/action-identity-core";





import { currentComplaintText } from "@/src/domain/rehab/intake/intake-complaint-core";
import { type AdverseResponseEvent } from "@/src/domain/rehab/followup/adverse-response-core";
import { type RetestObligation, type RetestRecord } from "@/src/domain/rehab/retest/retest-ledger-core";

import { emptyCapabilities, normalizeWorkflowProfile, workflowProfileFromLegacy, type CapabilitySet, type OperationTarget, type ProductMode } from "@/src/domain/rehab/intake/workflow-profile-core";

import { candidateMuscleFocus, candidateSubject, candidateTreatmentName, isPatellaSpecificCandidate } from "@/src/domain/rehab/treatment/candidate-treatment-core";
import { candidateAction, candidateControlMotionIds, candidatePilotMotionIds } from "@/src/domain/rehab/treatment/candidate-action-core";
import { chiefActionLabel, chiefActionSource, hasClearChiefAction, isAcuteTrauma, isUnclearAction, reportedActionSummary } from "@/src/domain/rehab/intake/chief-action-core";


import { type BilateralAssessmentSide, type BilateralComparison, type BilateralSide } from "@/src/domain/rehab/shared/bilateral-flow-core";



import { includesAny } from "@/src/domain/rehab/treatment/candidate-order-core";




import { functionCompletionValue, functionControlValue, functionDiscomfortValue } from "@/src/domain/rehab/assessment/function-assessment-core";
import { chiefFunctionAssessmentIds } from "@/src/domain/rehab/assessment/function-assessment-plan-core";














export type Step = 0 | 1 | 2 | 3 | 4 | 5;
export type UserRole = "" | "general" | "coach" | "rehab";
export type ExamSetup = "" | "self" | "professional-other";
export type SpineAssessmentMode = "" | "guided" | "reference";
export type MotionAnswer = "same" | "limited" | "excessive" | "painful" | "unable" | "unsure";
export type BilateralMotionAnswer = "left-limited" | "right-limited" | "both-limited";
export type PassiveAnswer = "same" | "limited" | "excessive" | "painful" | "skip" | "left-limited" | "right-limited" | "both-limited";
export type PassiveEndFeel = "soft" | "elastic" | "firm" | "hard" | "painful" | "unknown";
export type SimpleAnswer = "normal" | "present" | "weak" | "painful" | "positive" | "unable" | "skip";
export type FunctionCompletion = "complete" | "unable" | "skip";
export type FunctionControl = "stable" | "compensated" | "unsure";
export type FamiliarSymptomAnswer = "yes" | "no" | "unsure";
export type FollowupReviewAnswer = "better" | "same" | "worse" | "unknown" | "unable";
export type FollowupNewSymptomAnswer = "" | "no" | "yes";
export type FollowupExerciseChoice = "reduce" | "hold" | "progress" | "worse";
export type AssessmentKind = "motion" | "strength" | "function" | "special";
export type MotionComparison = "contralateral" | "opposite-direction" | "midline";

export function isCompletedRangeRetestAnswer(value: RangeRetestAnswer | undefined): value is CompletedRangeRetestAnswer {
  return value !== undefined && value !== "";
}
export type ChiefActionAnalysis = {
  raw: string;
  category: string;
  task: string;
  function: string;
  load: string;
  direction: string;
  retest: string;
};

export type ReportedActionKind = "functional" | "joint-direction" | "custom";

export type ReportedAction = {
  id: string;
  label: string;
  kind: ReportedActionKind;
  raw: string;
};

export type IntakeState = {
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
  /** 双侧主诉必须明确本次先处理哪侧；只决定顺序，不代表另一侧正常。 */
  prioritySide?: BilateralSide;
  location: string;
  bodyLocations: LowerLimbLocationSelection[];
  /** 用户切换主要大部位时保留的旧位置；不参与当前问题队列，只用于历史和审计。 */
  bodyLocationHistory: LowerLimbLocationSelection[];
  locationConfirmed: boolean;
  onset: string;
  mechanism: string;
  symptomType: string;
  /** 通用的“疼/不舒服”需要在位置确认时再让用户确认性质。 */
  painQualityConfirmed: boolean;
  symptoms: string[];
  /** 用户原话中独立出现的诱发条件；具体动作的决策标签不落盘。 */
  provocationContexts: string[];
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
  /** 用户明确表示没有固定诱发动作；不再用 provocationTypes 中的哨兵字符串代替。 */
  noFixedAction: boolean;
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
  /** 从既往就医和医生/影像结论投影出的可审计状态；旧快照可缺省。 */
  medicalGuidance?: MedicalGuidance;
};

export type IntakeMultiConfirmation = {
  symptoms: boolean;
  provocationTypes: boolean;
};

export type AssessmentItem = {
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
  /** 专项检查触发规则的原始快照；用于记录而不是重新推理旧结果。 */
  trigger?: string;
};

/** 髌骨四个方向属于同一项被动筛查；后台仍保留方向级结果，页面只展示一张卡。 */
export const PATELLA_DIRECTION_IDS = [
  "motion:knee-patella-superior",
  "motion:knee-patella-inferior",
  "motion:knee-patella-medial",
  "motion:knee-patella-lateral",
] as const;
export const PATELLA_GROUP_PRIMARY_ID = PATELLA_DIRECTION_IDS[0];
export const PATELLA_DIRECTION_LABELS: Record<string, string> = {
  "motion:knee-patella-superior": "向上",
  "motion:knee-patella-inferior": "向下",
  "motion:knee-patella-medial": "向内",
  "motion:knee-patella-lateral": "向外",
};
export const PATELLA_DIRECTION_TITLES: Record<string, string> = {
  "motion:knee-patella-superior": "髌骨向上滑动",
  "motion:knee-patella-inferior": "髌骨向下滑动",
  "motion:knee-patella-medial": "髌骨向内滑动",
  "motion:knee-patella-lateral": "髌骨向外滑动",
};

export function isPatellaDirectionId(id: string) {
  return (PATELLA_DIRECTION_IDS as readonly string[]).includes(id);
}

export function isPatellaGroupSecondaryId(id: string) {
  return isPatellaDirectionId(id) && id !== PATELLA_GROUP_PRIMARY_ID;
}

export const isPatellaTreatmentCandidate = isPatellaSpecificCandidate;

export type AssessmentRecord = {
  /** 双侧检查的逐侧事实；两侧都记录后才允许生成比较结论。 */
  bilateralSideResults?: Partial<Record<BilateralSide, "normal" | "limited">>;
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
  /** 由 passiveMeasuredAngle 安全解析出的结构化角度；旧快照可缺省。 */
  passiveMeasuredAngleDeg?: number;
  /** 正式测量记录；legacyRaw 仍由 passiveMeasuredAngle 保留。 */
  passiveRangeMeasurement?: RangeMeasurement;
  passiveEndFeel?: PassiveEndFeel;
  passiveSymptomScore?: number;
  /** 功能动作异常时记录"哪个阶段最明显"（起始/中途/末端/全过程/说不清）。 */
  symptomStage?: string;
  compensations?: string[];
  /** 活动受限后，用户已完成轻按取样；用于区分“未作答”和“没有明显紧张位置”。 */
  tensionChecked?: boolean;
  tensionLocations?: string[];
  /** 双侧/中间症状时，记录本项目的比较结果；不代表全局优先侧。 */
  bilateralComparison?: BilateralComparison;
  /** 旧快照兼容字段；新写入同时保留 bilateralComparison。 */
  worseSide?: BilateralAssessmentSide;
  pairedStrength?: SimpleAnswer;
  pairedStrengthUnableReason?: StrengthUnableReason;
  pairedStrengthLocation?: string;
  pairedStrengthLocations?: LowerLimbLocationSelection[];
  pairedStrengthType?: string;
  pairedStrengthScore?: number;
};

export type Finding = {
  id: string;
  title: string;
  detail: string;
  priority: "chief" | "support" | "track";
  score?: number;
  tags: string[];
  note?: string;
  side?: BilateralAssessmentSide;
  /** 双侧合并处理目标中的原始侧别集合。 */
  sides?: BilateralAssessmentSide[];
  /** 配对力量结果只作为内部决策依据，界面合并在同一个活动动作里展示。 */
  internal?: boolean;
  relatedMotionId?: string;
};

export function professionalFindingLabel(finding: Finding) {
  if (finding.id.startsWith("tension:")) return finding.title || "相关肌群 · 张力或按压阻力差异";
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
export type TreatmentProblem = {
  id: string;
  kind: string;
  title: string;
  status?: string;
  findingIds: string[];
  directionId?: string;
};

export type TrialTarget = {
  id: string;
  finding: Finding;
  findingSides?: BilateralAssessmentSide[];
  candidates: FullCandidate[];
  /** 同一项处理完成后需要一起复测、并可分别退出后续流程的活动方向。 */
  retestFindings?: Finding[];
  functionRetestObligations?: import("@/src/domain/rehab/treatment/trial-record-types").FunctionRetestObligation[];
  chain?: string;
  optionalCandidates?: FullCandidate[];
  /** 给用户看的具体复测动作，不允许回退成“说不清”或系统内部标题。 */
  retestLabel?: string;
  sourceCaseIds?: string[];
};

export type RetestPlan = {
  targetId: string;
  candidateId: string;
  directionIds: string[];
};

export type FollowupStage = "review" | "treatment" | "training" | "summary";
export type TransitionTarget = "assessment" | "treatment" | "training" | "summary";

export type FollowupTreatmentRecord = {
  treatmentRecordId?: string;
  sessionId?: string;
  assessmentRevision?: number;
  recordedAt?: string;
  /** 评估改版后保留旧事实，但不再参与当前方案或结果计算。 */
  supersededAt?: string;
  supersededByAssessmentRevision?: number;
  invalidationReason?: "assessment-updated" | "adverse-reassessment";
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
  /** 活动表现恶化可与主诉分数下降并存，必须单独保留。 */
  activityWorsened?: boolean;
  timeBased?: boolean;
  rangeOutcomes?: Record<string, CompletedRangeRetestAnswer>;
  rangeOutcome?: CompletedRangeRetestAnswer;
  rangeDiscomforts?: Record<string, YesNo>;
  rangeScores?: Record<string, number>;
  functionRetests?: Record<string, import("@/src/domain/rehab/treatment/trial-record-types").FunctionRetestRecord>;
  chiefRetested?: boolean;
  retestOnly?: boolean;
  reviewOnly?: boolean;
  supportingOnly?: boolean;
  responseRole?: TreatmentResponseRole;
};

export type SavedDemoSnapshot = {
  schemaVersion?: number;
  contractRevision?: typeof REHABMIND_V3_CONTRACT_REVISION;
  /** v2 内部复查闭环合同；旧总结缺省时只读展示，不强制退回处理。 */
  retestContractVersion?: 1;
  localCaseId?: string;
  bodyMarks?: BodyMark[];
  /** 评分的可追溯投影；旧的裸数字字段继续保留用于兼容读取。 */
  scoreRecords?: ScoreRecord[];
  /** 专项检查的触发、能力快照和停止出口；旧快照可缺省。 */
  specialTestRecords?: SpecialTestRecord[];
  /** 专业备注的追加/更正历史；备注不参与决策。 */
  professionalNoteRecords?: ProfessionalNoteRecord[];
  /** 处理完成时的证据、规则和知识版本追踪。 */
  decisionTraces?: DecisionTrace[];
  /** 案例、问题链、会话的技术身份；不参与临床判断，只用于正确恢复和追踪。 */
  problemThreadId?: string;
  sessionId?: string;
  /** v2：问题线程和会话索引；旧 archivedSessionHistory 只用于迁移读取。 */
  problemThreads?: ProblemThreadRecord[];
  sessionIndex?: SessionIndexRecord[];
  /** 本次评估/检查使用的能力配置快照；能力变更不能覆盖既有检查事实。 */
  capabilitySnapshotId?: string;
  sessionStatus?: SessionLifecycleStatus;
  sessionStartedAt?: string;
  draftSavedAt?: string;
  completedAt?: string;
  completionReason?: string;
  step: Step;
  intake: IntakeState;
  confirmedIntakeMulti?: IntakeMultiConfirmation;
  safety: Record<string, YesNo>;
  boneRisk?: Record<string, "yes" | "no" | "unsure">;
  imaging: string[];
  assessmentIndex: number;
  assessmentResults: Record<string, AssessmentRecord>;
  assessmentHistory?: AssessmentSessionRecord[];
  assessmentOwnerSessionId?: string;
  trialTargetIndex: number;
  candidateIndex: number;
  selectedOptionalCandidateIds?: string[];
  bilateralNeedsReferral?: boolean;
  midpointDecisionDone?: boolean;
  bilateralTreatmentSides?: Record<string, BilateralSide[]>;
  bilateralRetestResponses?: Record<string, "better" | "same" | "worse">;
  trialRecords: TrialRecord[];
  /** 已被新评估替代的首诊处理事实；只读保存，不参与当前页面计算。 */
  supersededTrialRecords?: TrialRecord[];
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
  trainingPlanSaved?: boolean;
  treatmentFinalRetestScore?: number;
  treatmentFinalRetestConfirmed?: boolean;
  treatmentFinalRetestRecordedAt?: string;
  trainingReadyForFinalRetest?: boolean;
  finalRetestScore?: number;
  finalRetestConfirmed?: boolean;
  finalRetestRecordedAt?: string;
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
  /** 已被新评估替代的后续康复处理事实；只读保存，不参与当前页面计算。 */
  supersededFollowupTrialRecords?: FollowupTreatmentRecord[];
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
  followupFinalRetestRecordedAt?: string;
  hasNewSymptom: FollowupNewSymptomAnswer | boolean;
  followupTrends: Record<string, FollowupReviewAnswer>;
  sessionHistory?: RehabSessionSummary[];
  /** @deprecated 仅保留旧快照读取兼容，新快照不再写入。 */
  archivedSessionHistory?: RehabSessionSummary[];
  assessmentRevision?: number;
  treatmentPlanRevision?: number;
  adverseResponse?: AdverseResponseEvent | null;
  adverseConfirmedAssessmentIds?: string[];
  /** v3 唯一复查事实源；页面任务从这里投影，不以候选队列代替。 */
  retestObligations?: RetestObligation[];
  retestRecords?: RetestRecord[];
  /** 服务端在领域段保存的知情同意记录。 */
  consent?: { version: string; confirmedAt: string };
};

export const REHABMIND_V3_CONTRACT_REVISION = 2 as const;

export type AssessmentSessionRecord = {
  assessmentSetId: string;
  sessionId: string;
  assessmentRevision: number;
  recordedAt: string;
  results: Record<string, AssessmentRecord>;
  supersedesAssessmentSetId?: string;
};

export type PersistedTreatmentRecordV3 = {
  sessionId: string;
  sessionNumber: number;
  record: TrialRecord | FollowupTreatmentRecord;
};

/**
 * v3 落盘合同。工作台内部可以分步迁移，但服务器、IndexedDB 和导出文件
 * 只允许保存这个四段结构，避免页面游标再次成为业务事实源。
 */
export type PersistedDemoSnapshotV3 = {
  schemaVersion: 3;
  contractRevision: typeof REHABMIND_V3_CONTRACT_REVISION;
  identity: {
    caseId: string;
    localCaseId: string;
    problemThreadId: string;
    sessionId: string;
    sessionNumber: number;
    sessionStatus: SessionLifecycleStatus;
    sessionStartedAt: string;
    draftSavedAt?: string;
    completedAt?: string;
    completionReason?: string;
    capabilitySnapshotId?: string;
    problemThreads: ProblemThreadRecord[];
    sessionIndex: SessionIndexRecord[];
  };
  domain: {
    consent?: { version: string; confirmedAt: string };
    intake: IntakeState;
    bodyMarks: BodyMark[];
    scoreRecords: ScoreRecord[];
    specialTestRecords: SpecialTestRecord[];
    professionalNoteRecords: ProfessionalNoteRecord[];
    decisionTraces: DecisionTrace[];
    safety: {
      answers: Record<string, YesNo>;
      boneRisk: Record<string, "yes" | "no" | "unsure">;
      imaging: string[];
    };
    assessments: AssessmentSessionRecord[];
    treatments: PersistedTreatmentRecordV3[];
    retests: {
      obligations: RetestObligation[];
      records: RetestRecord[];
    };
    training: {
      initialFeedback: Record<string, ExerciseFeedback>;
      currentSessionChoices: Record<string, FollowupExerciseChoice>;
      complete: boolean;
      planSaved: boolean;
    };
    history: RehabSessionSummary[];
  };
  workflow: {
    stage: Step;
    phase: "intake" | "safety" | "assessment" | "treatment" | "training" | "summary";
    assessmentRevision: number;
    assessmentOwnerSessionId: string;
    treatmentPlanRevision: number;
    pendingRetestCount: number;
    bilateralNeedsReferral: boolean;
    midpointDecisionDone: boolean;
    adverseResponse: AdverseResponseEvent | null;
    adverseConfirmedAssessmentIds: string[];
  };
  draft: {
    confirmedIntakeMulti: IntakeMultiConfirmation;
    assessmentCursor: number;
    treatmentCursor: { target: number; candidate: number };
    selectedOptionalCandidateIds: string[];
    bilateralTreatmentSides: Record<string, BilateralSide[]>;
    bilateralRetestResponses: Record<string, "better" | "same" | "worse">;
    initialRetest: {
      postScore: number;
      postScoreConfirmed: boolean;
      postDiscomfort: YesNo | "";
      ready: boolean;
      plan: RetestPlan | null;
      movementResponse: SavedDemoSnapshot["movementResponse"];
      movementResponses: Record<string, CompletedRangeRetestAnswer>;
      movementDiscomforts: Record<string, YesNo>;
      movementScores: Record<string, number>;
      movementScoreConfirmed: Record<string, boolean>;
      treatmentFinalScore: number;
      treatmentFinalConfirmed: boolean;
      treatmentFinalRecordedAt?: string;
      trainingReadyForFinal: boolean;
      finalScore: number;
      finalConfirmed: boolean;
      finalRecordedAt?: string;
    };
    currentSession: {
      isLaterSession: boolean;
      reviewScore: number;
      reviewScoreConfirmed: boolean;
      scoreHistory: number[];
      phase: FollowupStage;
      postScore: number;
      postScoreConfirmed: boolean;
      postDiscomfort: YesNo | "";
      candidateId: string;
      readyToRetest: boolean;
      retestPlan: RetestPlan | null;
      movementResponses: Record<string, CompletedRangeRetestAnswer>;
      movementDiscomforts: Record<string, YesNo>;
      movementScores: Record<string, number>;
      movementScoreConfirmed: Record<string, boolean>;
      tensionLocations: string[];
      trainingReadyForRetest: boolean;
      finalScore: number;
      finalScoreConfirmed: boolean;
      finalRetestRecordedAt?: string;
      hasNewSymptom: boolean;
      reviewResults: Record<string, FollowupReviewAnswer>;
    };
  };
};

export type SavedDemoRecord = {
  id: string;
  /** Stable local case identity; never derive identity from complaint text. */
  localCaseId?: string;
  savedAt: string;
  region: string;
  complaint: string;
  goal: string;
  initialScore: number;
  latestScore: number;
  scoreComparable?: boolean;
  sessionCount: number;
  problemThreadId?: string;
  sessionId?: string;
  sessionStatus?: SessionLifecycleStatus;
  caseKey?: string;
  sessionHistory?: RehabSessionSummary[];
  problemThreads?: ProblemThreadRecord[];
  sessionIndex?: SessionIndexRecord[];
  /** @deprecated 仅保留旧记录读取兼容，新记录不再写入。 */
  archivedSessionHistory?: RehabSessionSummary[];
  status: "康复中" | "等待影像" | "待医学评估" | "待复查" | "处理后加重，待重新评估" | "训练后加重，待重新评估" | "评估未完成" | "现有检查未形成明确处理方向" | "处理后主诉未明显改善" | "处理完成";
  snapshot?: SavedDemoSnapshot;
  pilotCaseId?: string;
  pilotClientCreationId?: string;
  pilotPublicCode?: string;
  pilotAccessToken?: string;
  pilotRevision?: number;
  /** Revision acknowledged by the server before the current local edit. */
  pilotLastSyncedRevision?: number;
  /** True while the local snapshot has not been acknowledged by the server. */
  pilotDirty?: boolean;
  localContentFingerprint?: string;
  lastSyncedContentFingerprint?: string;
  pilotConflictSnapshot?: SavedDemoSnapshot;
  pilotConflictRevision?: number;
  /** 本机或服务器最近一次成功保存此快照的时间，用于恢复时判断是否陈旧。 */
  pilotSnapshotUpdatedAt?: string;
  /** 冲突副本在服务器上的最近一次成功保存时间。 */
  pilotConflictSnapshotUpdatedAt?: string;
  pilotVersions?: PilotCaseAccess["versions"];
  /** Test-only local metadata. User records never receive these fields. */
  testRunId?: string;
  scenarioId?: string;
};

export type PilotSyncDisplayState = "idle" | "local-saving" | "local-saved" | "syncing" | "synced" | "offline" | "conflict" | "error";

export type PilotDraftEnvelope = {
  schemaVersion: number;
  localCaseId: string;
  savedAt: string;
  snapshot: SavedDemoSnapshot;
};

function phaseForSnapshot(snapshot: SavedDemoSnapshot): PersistedDemoSnapshotV3["workflow"]["phase"] {
  if (snapshot.followupMode) return snapshot.followupStage === "review" ? "assessment" : snapshot.followupStage;
  return (["intake", "safety", "assessment", "treatment", "training", "summary"] as const)[snapshot.step] ?? "intake";
}

export function persistSavedDemoSnapshot(snapshot: SavedDemoSnapshot): PersistedDemoSnapshotV3 {
  const localCaseId = snapshot.localCaseId?.trim();
  const problemThreadId = snapshot.problemThreadId?.trim();
  const sessionId = snapshot.sessionId?.trim();
  const sessionStartedAt = snapshot.sessionStartedAt?.trim();
  if (!localCaseId || !problemThreadId || !sessionId || !sessionStartedAt) {
    throw new Error("v3 snapshot identity is incomplete");
  }
  const initialTreatments: PersistedTreatmentRecordV3[] = [
    ...(snapshot.supersededTrialRecords ?? []),
    ...snapshot.trialRecords,
  ].map((record) => ({
    sessionId: snapshot.sessionIndex?.find((item) => item.sessionNumber === 1)?.sessionId ?? sessionId,
    sessionNumber: 1,
    record,
  }));
  const laterTreatments: PersistedTreatmentRecordV3[] = [
    ...(snapshot.supersededFollowupTrialRecords ?? []),
    ...snapshot.followupTrialRecords,
  ].map((record) => ({
    sessionId: snapshot.sessionIndex?.find((item) => item.sessionNumber === record.sessionNumber)?.sessionId ?? sessionId,
    sessionNumber: record.sessionNumber,
    record,
  }));
  const assessmentOwnerSessionId = snapshot.assessmentOwnerSessionId
    ?? snapshot.sessionIndex?.find((item) => item.sessionNumber === 1)?.sessionId
    ?? sessionId;
  const assessmentSetId = `assessment-set:${assessmentOwnerSessionId}:r${snapshot.assessmentRevision ?? 0}`;
  const existingAssessmentSet = snapshot.assessmentHistory?.find((item) => item.assessmentSetId === assessmentSetId);
  const previousAssessmentSet = snapshot.assessmentHistory
    ?.filter((item) => item.sessionId === assessmentOwnerSessionId && item.assessmentRevision < (snapshot.assessmentRevision ?? 0))
    .sort((left, right) => right.assessmentRevision - left.assessmentRevision)[0];
  const currentAssessmentSet: AssessmentSessionRecord = {
    assessmentSetId,
    sessionId: assessmentOwnerSessionId,
    assessmentRevision: snapshot.assessmentRevision ?? 0,
    recordedAt: existingAssessmentSet?.recordedAt ?? snapshot.draftSavedAt ?? sessionStartedAt,
    results: snapshot.assessmentResults,
    ...(previousAssessmentSet ? { supersedesAssessmentSetId: previousAssessmentSet.assessmentSetId } : {}),
  };
  const assessmentHistory = [
    ...(snapshot.assessmentHistory ?? []).filter((item) => item.assessmentSetId !== assessmentSetId),
    currentAssessmentSet,
  ];
  return {
    schemaVersion: 3,
    contractRevision: REHABMIND_V3_CONTRACT_REVISION,
    identity: {
      caseId: localCaseId,
      localCaseId,
      problemThreadId,
      sessionId,
      sessionNumber: snapshot.sessionNumber,
      sessionStatus: snapshot.sessionStatus ?? "draft",
      sessionStartedAt,
      draftSavedAt: snapshot.draftSavedAt,
      completedAt: snapshot.completedAt,
      completionReason: snapshot.completionReason,
      capabilitySnapshotId: snapshot.capabilitySnapshotId,
      problemThreads: snapshot.problemThreads ?? [],
      sessionIndex: snapshot.sessionIndex ?? [],
    },
    domain: {
      consent: snapshot.consent,
      intake: {
        ...snapshot.intake,
        // 派生标签只在决策时计算；持久化只保留用户明确条件来源。
        provocationTypes: snapshot.intake.provocationContexts,
      },
      bodyMarks: snapshot.bodyMarks ?? [],
      scoreRecords: snapshot.scoreRecords ?? [],
      specialTestRecords: snapshot.specialTestRecords ?? [],
      professionalNoteRecords: snapshot.professionalNoteRecords ?? [],
      decisionTraces: snapshot.decisionTraces ?? [],
      safety: { answers: snapshot.safety, boneRisk: snapshot.boneRisk ?? {}, imaging: snapshot.imaging },
      assessments: assessmentHistory,
      treatments: [...initialTreatments, ...laterTreatments],
      retests: { obligations: snapshot.retestObligations ?? [], records: snapshot.retestRecords ?? [] },
      training: {
        initialFeedback: snapshot.exerciseFeedback,
        currentSessionChoices: snapshot.followupExerciseChoices,
        complete: snapshot.trainingComplete,
        planSaved: snapshot.trainingPlanSaved ?? false,
      },
      history: snapshot.sessionHistory ?? [],
    },
    workflow: {
      stage: snapshot.step,
      phase: phaseForSnapshot(snapshot),
      assessmentRevision: snapshot.assessmentRevision ?? 0,
      assessmentOwnerSessionId,
      treatmentPlanRevision: snapshot.treatmentPlanRevision ?? snapshot.assessmentRevision ?? 0,
      pendingRetestCount: (snapshot.retestObligations ?? []).filter((item) => item.sessionId === sessionId && item.required && item.status === "pending").length,
      bilateralNeedsReferral: snapshot.bilateralNeedsReferral ?? false,
      midpointDecisionDone: snapshot.midpointDecisionDone ?? false,
      adverseResponse: snapshot.adverseResponse ?? null,
      adverseConfirmedAssessmentIds: snapshot.adverseConfirmedAssessmentIds ?? [],
    },
    draft: {
      confirmedIntakeMulti: snapshot.confirmedIntakeMulti ?? { symptoms: true, provocationTypes: true },
      assessmentCursor: snapshot.assessmentIndex,
      treatmentCursor: { target: snapshot.trialTargetIndex, candidate: snapshot.candidateIndex },
      selectedOptionalCandidateIds: snapshot.selectedOptionalCandidateIds ?? [],
      bilateralTreatmentSides: snapshot.bilateralTreatmentSides ?? {},
      bilateralRetestResponses: snapshot.bilateralRetestResponses ?? {},
      initialRetest: {
        postScore: snapshot.postScore,
        postScoreConfirmed: snapshot.postScoreConfirmed ?? false,
        postDiscomfort: snapshot.postDiscomfort ?? "",
        ready: snapshot.readyToRetest ?? false,
        plan: snapshot.retestPlan ?? null,
        movementResponse: snapshot.movementResponse,
        movementResponses: snapshot.movementResponses ?? {},
        movementDiscomforts: snapshot.movementDiscomforts ?? {},
        movementScores: snapshot.movementScores ?? {},
        movementScoreConfirmed: snapshot.movementScoreConfirmed ?? {},
        treatmentFinalScore: snapshot.treatmentFinalRetestScore ?? 0,
        treatmentFinalConfirmed: snapshot.treatmentFinalRetestConfirmed ?? false,
        treatmentFinalRecordedAt: snapshot.treatmentFinalRetestRecordedAt,
        trainingReadyForFinal: snapshot.trainingReadyForFinalRetest ?? false,
        finalScore: snapshot.finalRetestScore ?? 0,
        finalConfirmed: snapshot.finalRetestConfirmed ?? false,
        finalRecordedAt: snapshot.finalRetestRecordedAt,
      },
      currentSession: {
        isLaterSession: snapshot.followupMode,
        reviewScore: snapshot.followupScore,
        reviewScoreConfirmed: snapshot.followupScoreConfirmed ?? false,
        scoreHistory: snapshot.followupScoreHistory,
        phase: snapshot.followupStage,
        postScore: snapshot.followupPostScore,
        postScoreConfirmed: snapshot.followupPostScoreConfirmed ?? false,
        postDiscomfort: snapshot.followupPostDiscomfort ?? "",
        candidateId: snapshot.followupCandidateId,
        readyToRetest: snapshot.followupReadyToRetest ?? false,
        retestPlan: snapshot.followupRetestPlan ?? null,
        movementResponses: snapshot.followupMovementResponses ?? {},
        movementDiscomforts: snapshot.followupMovementDiscomforts ?? {},
        movementScores: snapshot.followupMovementScores ?? {},
        movementScoreConfirmed: snapshot.followupMovementScoreConfirmed ?? {},
        tensionLocations: snapshot.followupTensionLocations ?? [],
        trainingReadyForRetest: snapshot.followupTrainingReadyForRetest ?? false,
        finalScore: snapshot.followupFinalScore ?? 0,
        finalScoreConfirmed: snapshot.followupFinalScoreConfirmed ?? false,
        finalRetestRecordedAt: snapshot.followupFinalRetestRecordedAt,
        hasNewSymptom: snapshot.hasNewSymptom === true || snapshot.hasNewSymptom === "yes",
        reviewResults: snapshot.followupTrends,
      },
    },
  };
}

export function normalizeSavedDemoSnapshot(value: unknown): SavedDemoSnapshot | null {
  // 工作台内存态仍按页面控制器逐步拆分；它从不直接跨持久化边界。
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const internal = value as Partial<SavedDemoSnapshot>;
    if (internal.schemaVersion === 3 && internal.contractRevision === REHABMIND_V3_CONTRACT_REVISION && internal.intake && internal.safety && internal.assessmentResults) {
      return internal.intake.operationTarget === "study" ? null : internal as SavedDemoSnapshot;
    }
  }
  const result = validatePilotSnapshotV3(value);
  if (!result.ok) return null;
  const persisted = result.snapshot as unknown as PersistedDemoSnapshotV3;
  if (persisted.domain.intake.operationTarget === "study") return null;
  const initial = persisted.draft.initialRetest;
  const current = persisted.draft.currentSession;
  return {
    schemaVersion: 3,
    contractRevision: REHABMIND_V3_CONTRACT_REVISION,
    retestContractVersion: 1,
    ...persisted.identity,
    consent: persisted.domain.consent,
    bodyMarks: persisted.domain.bodyMarks,
    scoreRecords: persisted.domain.scoreRecords,
    specialTestRecords: persisted.domain.specialTestRecords,
    professionalNoteRecords: persisted.domain.professionalNoteRecords,
    decisionTraces: persisted.domain.decisionTraces,
    intake: persisted.domain.intake,
    safety: persisted.domain.safety.answers,
    boneRisk: persisted.domain.safety.boneRisk,
    imaging: persisted.domain.safety.imaging,
    assessmentResults: persisted.domain.assessments.find((item) => item.sessionId === persisted.workflow.assessmentOwnerSessionId && item.assessmentRevision === persisted.workflow.assessmentRevision)?.results
      ?? persisted.domain.assessments.findLast((item) => item.sessionId === persisted.workflow.assessmentOwnerSessionId)?.results
      ?? {},
    assessmentHistory: persisted.domain.assessments,
    assessmentOwnerSessionId: persisted.workflow.assessmentOwnerSessionId,
    trialRecords: persisted.domain.treatments
      .filter((item) => item.sessionNumber === 1 && !(item.record as TrialRecord).supersededByAssessmentRevision)
      .map((item) => item.record as TrialRecord),
    supersededTrialRecords: persisted.domain.treatments
      .filter((item) => item.sessionNumber === 1 && Boolean((item.record as TrialRecord).supersededByAssessmentRevision))
      .map((item) => item.record as TrialRecord),
    followupTrialRecords: persisted.domain.treatments
      .filter((item) => item.sessionNumber > 1 && !(item.record as FollowupTreatmentRecord).supersededByAssessmentRevision)
      .map((item) => item.record as FollowupTreatmentRecord),
    supersededFollowupTrialRecords: persisted.domain.treatments
      .filter((item) => item.sessionNumber > 1 && Boolean((item.record as FollowupTreatmentRecord).supersededByAssessmentRevision))
      .map((item) => item.record as FollowupTreatmentRecord),
    retestObligations: persisted.domain.retests.obligations,
    retestRecords: persisted.domain.retests.records,
    exerciseFeedback: persisted.domain.training.initialFeedback,
    trainingComplete: persisted.domain.training.complete,
    trainingPlanSaved: persisted.domain.training.planSaved,
    followupExerciseChoices: persisted.domain.training.currentSessionChoices,
    sessionHistory: persisted.domain.history,
    step: persisted.workflow.stage,
    assessmentRevision: persisted.workflow.assessmentRevision,
    treatmentPlanRevision: persisted.workflow.treatmentPlanRevision,
    bilateralNeedsReferral: persisted.workflow.bilateralNeedsReferral,
    midpointDecisionDone: persisted.workflow.midpointDecisionDone,
    adverseResponse: persisted.workflow.adverseResponse,
    adverseConfirmedAssessmentIds: persisted.workflow.adverseConfirmedAssessmentIds,
    confirmedIntakeMulti: persisted.draft.confirmedIntakeMulti,
    assessmentIndex: persisted.draft.assessmentCursor,
    trialTargetIndex: persisted.draft.treatmentCursor.target,
    candidateIndex: persisted.draft.treatmentCursor.candidate,
    selectedOptionalCandidateIds: persisted.draft.selectedOptionalCandidateIds,
    bilateralTreatmentSides: persisted.draft.bilateralTreatmentSides,
    bilateralRetestResponses: persisted.draft.bilateralRetestResponses,
    postScore: initial.postScore,
    postScoreConfirmed: initial.postScoreConfirmed,
    postDiscomfort: initial.postDiscomfort,
    readyToRetest: initial.ready,
    retestPlan: initial.plan,
    movementResponse: initial.movementResponse,
    movementResponses: initial.movementResponses,
    movementDiscomforts: initial.movementDiscomforts,
    movementScores: initial.movementScores,
    movementScoreConfirmed: initial.movementScoreConfirmed,
    treatmentFinalRetestScore: initial.treatmentFinalScore,
    treatmentFinalRetestConfirmed: initial.treatmentFinalConfirmed,
    treatmentFinalRetestRecordedAt: initial.treatmentFinalRecordedAt,
    trainingReadyForFinalRetest: initial.trainingReadyForFinal,
    finalRetestScore: initial.finalScore,
    finalRetestConfirmed: initial.finalConfirmed,
    finalRetestRecordedAt: initial.finalRecordedAt,
    followupMode: current.isLaterSession,
    followupScore: current.reviewScore,
    followupScoreConfirmed: current.reviewScoreConfirmed,
    followupScoreHistory: current.scoreHistory,
    followupStage: current.phase,
    followupPostScore: current.postScore,
    followupPostScoreConfirmed: current.postScoreConfirmed,
    followupPostDiscomfort: current.postDiscomfort,
    followupCandidateId: current.candidateId,
    followupReadyToRetest: current.readyToRetest,
    followupRetestPlan: current.retestPlan,
    followupMovementResponses: current.movementResponses,
    followupMovementDiscomforts: current.movementDiscomforts,
    followupMovementScores: current.movementScores,
    followupMovementScoreConfirmed: current.movementScoreConfirmed,
    followupTensionLocations: current.tensionLocations,
    followupTrainingReadyForRetest: current.trainingReadyForRetest,
    followupFinalScore: current.finalScore,
    followupFinalScoreConfirmed: current.finalScoreConfirmed,
    followupFinalRetestRecordedAt: current.finalRetestRecordedAt,
    hasNewSymptom: current.hasNewSymptom,
    followupTrends: current.reviewResults,
  };
}

export const SHARED_TENSION_ASSESSMENT_ID = "shared:pilot-muscle-tension";

export const STEPS = ["症状信息", "关键确认", "评估检查", "处理复测", "训练居家", "康复总结"];
export const PILOT_REGION_IDS = ["thigh-local", "knee", "calf-local", "ankle-foot"] as const satisfies readonly FullRegionId[];
export type PilotDemoRegionId = (typeof PILOT_REGION_IDS)[number];
export const isPilotRegion = (regionId: string): regionId is PilotDemoRegionId => PILOT_REGION_IDS.includes(regionId as PilotDemoRegionId);
export function pilotInputFromIntake(intake: IntakeState, confirmed: IntakeMultiConfirmation): PilotIntakeInput {
  const selectedLocations = intake.bodyLocations;
  const profile = intake.productMode
    ? normalizeWorkflowProfile({ productMode: intake.productMode, operationTarget: intake.operationTarget, capabilities: intake.capabilities, learningExplanation: intake.learningExplanation })
    : workflowProfileFromLegacy(intake.userRole, intake.examSetup);
  return {
    // 决策引擎只接收“自助/专业他测”的有效能力结果；userRole 仅保留为
    // 旧快照兼容字段，不再让页面选择的历史角色直接决定权限。
    userRole: profile.operationTarget === "other" ? "rehab" : "general",
    workflowProfile: {
      operationTarget: profile.operationTarget,
      isStudy: profile.isStudy,
      canRecord: profile.canRecord,
    },
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
    provocationTypes: effectiveProvocationTypes(intake),
    provocationConfirmed: confirmed.provocationTypes,
    reportedActions: intake.reportedActions,
    customAction: intake.customAction,
    reproduction: intake.reproduction,
    actionAnalysis: intake.actionAnalysis,
    currentTask: reportedActionSummary(intake).join("、") || intake.actionAnalysis?.task || intake.forceDirection,
    noFixedTask: intake.noFixedAction && reportedActionSummary(intake).length === 0,
    baselineScoreConfirmed: intake.baselineScoreConfirmed,
    swellingLocation: intake.swellingLocation,
    tendernessLocation: intake.tendernessLocation,
    sensoryLocation: intake.sensoryLocation,
    sensoryLocations: intake.sensoryLocations.map((item) => ({ side: item.side, areaId: item.areaId, location: item.location, regionId: item.regionId })),
    goal: intake.goal,
  };
}
export const STAGE_TRANSITIONS: Record<TransitionTarget, { step: Step; number: string; title: string; message: string; button: string }> = {
  assessment: { step: 2, number: "03", title: "症状信息收集完毕", message: "接下来开始评估检查，请跟随提示完成对应操作。", button: "开始评估检查" },
  treatment: { step: 3, number: "04", title: "评估检查完成", message: "接下来开始处理并复测，请跟随提示完成对应操作。", button: "开始处理并复测" },
  training: { step: 4, number: "05", title: "处理复测完成", message: "接下来开始训练，请跟随提示完成对应训练内容。", button: "开始训练" },
  summary: { step: 5, number: "06", title: "本次康复完成", message: "接下来开始复盘。", button: "查看本次康复总结" },
};
export const ONSETS = ["今天或昨天", "2～7天", "1～6周", "超过6周", "反复出现"];
export const MECHANISMS = ["没有明确受伤", "扭转或崴伤", "跌倒或碰撞", "跑跳或拉伤", "逐渐出现", "其他"];
export const SYMPTOM_TYPES = ["疼痛，性质说不清", "酸痛", "胀痛", "刺痛", "烧灼或火辣", "牵扯或紧绷", "挤、卡或弹响", "麻或电感", "无力或不稳", "说不清的不适"];
export const SYMPTOM_TYPE_GROUPS = [
  { title: "疼痛", options: ["酸痛", "胀痛", "刺痛", "疼痛，性质说不清"] },
  { title: "其他异常感觉", options: ["烧灼或火辣", "牵扯或紧绷", "挤、卡或弹响", "麻或电感", "无力或不稳", "说不清的不适"] },
];
export const SYMPTOMS = ["肿胀或淤青", "按压痛", "活动受限", "力量不足", "麻、电或感觉变化"];
export const PROVOCATION_TYPES = ["活动到某个角度", "用力或对抗阻力", "走路、站立或负重", "按压", "静止或夜间", "运动过程中", "运动结束后", "说不清 / 没有固定动作", "其他情况"];
export const PRIOR_CARE_OPTIONS = ["看过医生", "拍过片", "用过口服药", "用过膏药", "做过针灸或理疗", "用过冰敷", "用过护具/支具", "做过康复训练/锻炼", "都没有/没处理过"];
export const GOALS_SELF = [
  { level: 1, title: "先消肿止痛", short: "让肿胀和静息不适先稳定下来" },
  { level: 2, title: "疼痛明显减轻", short: "做动作时不再那么疼" },
  { level: 3, title: "恢复日常活动", short: "走路、上下楼梯、穿衣和拿取" },
  { level: 4, title: "恢复中低强度运动", short: "跑步、健身、瑜伽或球类（无对抗）" },
  { level: 5, title: "恢复高强度与对抗", short: "速度、疲劳、变向或碰撞" },
];
export const GOALS_PRO = [
  { level: 1, title: "急性反应减轻", short: "先让肿胀和静息不适稳定" },
  { level: 2, title: "基础症状改善", short: "疼痛或异常感觉明显减轻" },
  { level: 3, title: "恢复正常生活", short: "走路、楼梯、穿衣和拿取" },
  { level: 4, title: "恢复一般运动", short: "跑步、健身、瑜伽或球类" },
  { level: 5, title: "恢复高强度与对抗", short: "速度、疲劳、变向或碰撞" },
];
export const GOALS = GOALS_SELF;
export const FUNCTION_COMPENSATIONS: Record<string, string[]> = {
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
export const GENERIC_FUNCTION_COMPENSATIONS = ["左右用力不一样", "身体明显晃动", "动作幅度偏小", "需要扶持或借力"];
export function functionCompensationOptions(itemId: string) {
  return FUNCTION_COMPENSATIONS[itemId]?.length ? FUNCTION_COMPENSATIONS[itemId] : GENERIC_FUNCTION_COMPENSATIONS;
}
export const BILATERAL_OBSERVE: Record<string, string> = {
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

export const bilateralMotionOptions: Array<[BilateralMotionAnswer | "same" | "unable" | "unsure", string]> = [
  ["same", "两侧接近｜与平时范围相近"],
  ["left-limited", "左侧偏小｜左侧更差"],
  ["right-limited", "右侧偏小｜右侧更差"],
  ["both-limited", "两侧偏小｜两侧都受限"],
  ["unable", "无法完成｜疼痛或其他原因"],
  ["unsure", "暂不判断｜无法比较"],
];

export const bilateralComparisonOptions: Array<[BilateralComparison, string]> = [
  ["左侧更差", "左侧更差｜右侧相对较好"],
  ["右侧更差", "右侧更差｜左侧相对较好"],
  ["两侧异常", "两侧都有问题｜可分别轻重不同"],
  ["两侧接近", "两侧接近｜暂未见明确差异"],
  ["暂不判断", "暂不判断｜无法安全比较"],
];

export function motionAnswerIsLimited(value?: AssessmentRecord["active"]) {
  return ["limited", "left-limited", "right-limited", "both-limited"].includes(value ?? "");
}

export function bilateralComparisonToSide(value?: BilateralComparison): BilateralAssessmentSide | undefined {
  if (value === "左侧更差") return "左侧";
  if (value === "右侧更差") return "右侧";
  if (value === "两侧异常") return "两侧异常";
  if (value === "两侧接近") return "两侧接近";
  return undefined;
}

export function bilateralSideForMotionAnswer(value?: string): BilateralAssessmentSide | undefined {
  if (value === "left-limited") return "左侧";
  if (value === "right-limited") return "右侧";
  if (value === "both-limited") return "两侧异常";
  if (value === "same") return "两侧接近";
  return undefined;
}

export function effectiveBilateralComparison(record: AssessmentRecord): BilateralComparison | undefined {
  if (record.bilateralComparison) return record.bilateralComparison;
  if (record.worseSide === "左侧") return "左侧更差";
  if (record.worseSide === "右侧") return "右侧更差";
  if (record.worseSide === "两侧异常") return "两侧异常";
  if (record.worseSide === "两侧接近") return "两侧接近";
  return undefined;
}

export function passiveAnswerIsLimited(value?: PassiveAnswer) {
  return ["limited", "left-limited", "right-limited", "both-limited"].includes(value ?? "");
}

export function discomfortDecisionTags(value?: string) {
  if (!value) return [];
  if (includesAny(value, ["麻", "电"])) return ["assessment-neural", "conservative"];
  if (value.includes("刺")) return ["assessment-sharp", "conservative"];
  if (includesAny(value, ["牵扯", "紧绷", "拉扯"])) return ["assessment-pull", "muscle", "mobility"];
  if (includesAny(value, ["酸", "沉", "胀"])) return ["assessment-ache", "muscle", "control"];
  return [];
}

export const SAFETY_ITEMS = [
  { id: "shape", text: "有明显错位、异常轮廓或开放伤口", note: "单纯肿胀、淤青不算明显错位" },
  { id: "vascular", text: "远端持续发白、发凉或感觉明显下降", note: "局部受伤后的淤青单独记录" },
  { id: "neuro", text: "受伤部位以下持续麻木、感觉下降或越来越无力", note: "不是因为疼痛暂时不敢发力" },
  { id: "systemic", text: "发热，同时局部红、热、肿快速加重", note: "需要结合整体状态判断" },
  { id: "calf-clot", text: "没有明确受伤，但单侧小腿突然肿、热、红、痛", note: "尤其近期久坐、手术、卧床或既往有血栓时" },
];
export const IMAGING_OPTIONS = [
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

export const DEFAULT_INTAKE: IntakeState = {
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
  prioritySide: undefined,
  location: "",
  bodyLocations: [],
  bodyLocationHistory: [],
  locationConfirmed: false,
  onset: "",
  mechanism: "",
  symptomType: "",
  painQualityConfirmed: false,
  symptoms: [],
  provocationContexts: [],
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
  noFixedAction: false,
  actionSelectionConfirmed: false,
  professionalNotes: "",
  actionAnalysis: null,
  goal: 0,
  baselineScore: 0,
  baselineScoreConfirmed: false,
  stabbingSpread: "",
  stabbingPalpation: "",
  priorCare: [],
  medicalGuidance: deriveMedicalGuidance(),
};

export const EXAMPLE_DESCRIPTION = "右脚踝昨天扭伤，走路和下楼时疼，恢复目标是正常走路。";

/** 具体动作只在使用时推导决策标签；取消动作后不会留下历史标签。 */
export function actionDerivedProvocationTypes(actions: ReportedAction[], customAction: string) {
  const derived: string[] = [];
  if (actions.some((action) => action.kind === "joint-direction")) derived.push("活动到某个角度");
  if (actions.some((action) => action.kind === "functional")) derived.push("走路、站立或负重");
  if (actions.some((action) => action.id === "functional-run-jump")) derived.push("运动过程中");
  const custom = customAction.trim();
  if (/用力|发力|抗阻|对抗/.test(custom)) derived.push("用力或对抗阻力");
  if (/按压|轻按|压痛/.test(custom)) derived.push("按压");
  if (/休息|静止|夜间|夜里|睡觉/.test(custom)) derived.push("静止或夜间");
  if (/运动|训练|跑步|跑完|跳跃|落地/.test(custom)) derived.push("运动过程中");
  return [...new Set(derived)];
}

export function effectiveProvocationTypes(intake: Pick<IntakeState, "provocationContexts" | "reportedActions" | "customAction" | "noFixedAction">) {
  return [...new Set([
    ...(intake.provocationContexts ?? []),
    ...actionDerivedProvocationTypes(intake.reportedActions ?? [], intake.customAction ?? ""),
    ...(intake.noFixedAction ? ["说不清 / 没有固定动作"] : []),
  ])];
}

/**
 * T-12：恢复旧快照时 baselineScoreConfirmed 缺失不再盲猜为 true。
 * 有正分数视为当时真实作答过（不打扰）；零分或缺失按未确认处理（恢复后补问一次），
 * 避免占位分数绕过 isComparableNow 的前后可比性门控。
 */
export function restoredBaselineScoreConfirmed(intake: Partial<IntakeState>): boolean {
  if (typeof intake.baselineScoreConfirmed === "boolean") return intake.baselineScoreConfirmed;
  return typeof intake.baselineScore === "number" && intake.baselineScore > 0;
}

/**
 * 旧版记录只保存了 userRole/examSetup；新版记录保存产品模式、操作对象和
 * 能力声明。恢复记录时统一走这里，避免旧快照在症状页出现“字段不存在”或
 * 直接跳过操作对象的问题。
 */
export function migrateIntakeState(raw: Partial<IntakeState> | undefined): IntakeState {
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
    prioritySide: raw?.prioritySide === "左侧" || raw?.prioritySide === "右侧" ? raw.prioritySide : undefined,
    bodyLocations: raw?.bodyLocations ?? [],
    bodyLocationHistory: raw?.bodyLocationHistory ?? [],
    swellingLocations: raw?.swellingLocations ?? [],
    tendernessLocations: raw?.tendernessLocations ?? [],
    sensoryLocations: raw?.sensoryLocations ?? [],
    symptoms: raw?.symptoms ?? [],
    provocationContexts: raw?.provocationContexts ?? [],
    provocationTypes: effectiveProvocationTypes({
      ...DEFAULT_INTAKE,
      ...raw,
      provocationContexts: raw?.provocationContexts ?? [],
      reportedActions: raw?.reportedActions ?? [],
      customAction: raw?.customAction ?? "",
      noFixedAction: raw?.noFixedAction ?? raw?.provocationTypes?.includes("说不清 / 没有固定动作") ?? false,
    } as IntakeState),
    reportedActions: raw?.reportedActions ?? [],
    customAction: raw?.customAction ?? "",
    noFixedAction: raw?.noFixedAction ?? raw?.provocationTypes?.includes("说不清 / 没有固定动作") ?? false,
    actionSelectionConfirmed: raw?.actionSelectionConfirmed ?? Boolean(raw?.reproduction),
    professionalNotes: raw?.professionalNotes ?? "",
    priorCare: raw?.priorCare ?? [],
    medicalGuidance: raw?.medicalGuidance ?? deriveMedicalGuidance(raw?.priorCare ?? []),
  };
}

export function canonicalIntakeField(field: string) {
  if (field === "使用身份") return "使用方式";
  if (field === "检查方式") return "操作对象";
  if (["诱发场景", "具体动作", "什么时候最明显"].includes(field)) return "诱发动作";
  return field;
}

export function locationSelectionsLabel(items: LowerLimbLocationSelection[]) {
  return items.map((item) => `${item.side}·${item.location}`).join("、");
}

export function sideFromLocationSelections(items: LowerLimbLocationSelection[]) {
  const sides = new Set(items.map((item) => item.side).filter((side) => side === "左侧" || side === "右侧"));
  if (sides.size > 1) return "双侧/中间";
  return items[0]?.side ?? "";
}

export function extractProvokingAction(text: string) {
  const actionWords = [
    "走", "站", "蹲", "楼", "台阶", "跑", "跳", "抬", "举", "推", "拉", "拧", "转", "坐", "撑", "负重", "按压", "发力", "用力", "使劲",
    "抬脚", "迈步", "踩地", "落脚", "一瘸一拐",
    "低头", "仰头", "弯腰", "后仰", "侧屈", "前屈", "屈曲", "伸直", "弯曲", "摸背", "掌心向上", "掌心向下",
    "外旋", "内旋", "外展", "内收", "勾脚", "踩油门", "提踵", "踮脚", "内翻", "外翻", "脚掌向内", "脚掌向外", "脚底向内", "脚底向外", "squat", "squatting", "walk", "walking",
  ];
  const symptomWords = ["痛", "疼", "不适", "不舒服", "刺", "针扎", "胀", "酸", "麻", "卡", "扯", "紧", "挤", "无力", "不稳", "腿软", "打软", "发软", "走不了", "站不了", "蹲不了", "动不了"];
  const negativeWords = ["还好", "没事", "不痛", "不疼", "不会", "没有不适", "没感觉"];
  const injuryEventWords = ["崴", "扭伤", "拉伤", "摔", "跌", "撞", "受伤", "弄伤"];
  const timingWords = ["后开始", "后出现", "之后开始", "结束后", "跑完后", "第二天", "隔天"];
  const goalWords = ["想恢复", "希望恢复", "目标是", "以后想", "重新开始", "回到运动"];
  const clauses = text.split(/[，。；！？\n]/).map((part) => part.trim()).filter(Boolean);

  const actionPriority = (part: string) => {
    if (includesAny(part, ["走路", "行走", "步行", "上楼", "下楼", "台阶", "下蹲", "蹲起", "起身", "跑步", "慢跑", "跳", "落地", "单腿站", "站立", "久站"])) return 4;
    if (includesAny(part, ["弯腰", "后仰", "转身", "转体", "勾脚", "踩油门", "提踵", "踮脚", "内翻", "外翻", "脚底向内", "脚底向外", "伸直", "弯曲", "屈曲"])) return 3;
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

export function analyzeChiefAction(text: string, regionId: string, forceDirection = "", preferredRaw = ""): ChiefActionAnalysis | null {
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

export function inferRegion(text: string) {
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

export function inferPilotRegions(text: string): FullRegionId[] {
  const normalized = text.toLowerCase();
  const detected: FullRegionId[] = [];
  if (includesAny(normalized, ["大腿前侧", "大腿后侧", "大腿内侧", "大腿外侧", "大腿中段", "大腿拉伤"])) detected.push("thigh-local");
  if (includesAny(normalized, ["膝盖", "漆盖", "膝", "髌骨", "鹅足", "knee"])) detected.push("knee");
  if (includesAny(normalized, ["小腿前侧", "小腿后侧", "小腿内侧", "小腿外侧", "小腿肚", "胫骨前侧", "腓肠肌", "小腿拉伤"])) detected.push("calf-local");
  if (includesAny(normalized, ["脚脖子", "脚踝", "脚腕", "崴脚", "歪脚", "ankle", "踝", "足底", "足跟", "跟腱", "脚背", "脚面", "脚趾", "脚后跟", "脚跟", "后跟"])) detected.push("ankle-foot");
  return detected;
}

export function inferSymptomSide(text: string, currentSide = "") {
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

export function mentionsBothSymptomSides(text: string) {
  const bodyOrSymptom = "膝|腿|脚|足|踝|疼|痛|酸|胀|麻|不适|崴|扭|肿";
  const mentionsLeft = new RegExp(`左(?:侧|边)?[^，。；]{0,8}(?:${bodyOrSymptom})|(?:${bodyOrSymptom})[^，。；]{0,8}左(?:侧|边)?`).test(text);
  const mentionsRight = new RegExp(`右(?:侧|边)?[^，。；]{0,8}(?:${bodyOrSymptom})|(?:${bodyOrSymptom})[^，。；]{0,8}右(?:侧|边)?`).test(text);
  return mentionsLeft && mentionsRight;
}

export function inferImagingFromDescription(text: string) {
  const inferred: string[] = [];
  const mentionsImaging = includesAny(text, ["拍过片", "拍片", "核磁", "CT", "ct", "x光", "X光", "影像"]);
  if (mentionsImaging && includesAny(text, ["没骨折", "没有骨折", "未见骨折", "排除骨折", "骨头没事"])) inferred.push("未见骨折");
  else if (mentionsImaging && /(?:有|发现|提示|确认)(?:了)?(?:骨折|骨裂)|(?:骨折|骨裂)(?:异常|明确|已确认)/.test(text)) inferred.push("有骨折或骨裂异常");
  if (includesAny(text, ["医生允许康复", "医生说可以康复", "医生让康复", "可以开始康复"])) inferred.push("医生已允许按建议康复");
  if (includesAny(text, ["医生有限制", "医生说不能", "限制负重", "限制活动"])) inferred.push("医生有限制");
  return inferred;
}

export function getGoalLabel(level: number) {
  return GOALS_PRO.find((goal) => goal.level === level)?.title ?? "尚未确认";
}

export function forceDirectionOptions(regionId: string) {
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
export function reportedActionOptions(regionId: string): ReportedAction[] {
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

export function inferForceDirection(regionId: string, text: string) {
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

export function forceDirectionTags(value: string) {
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

export function parseIntake(text: string, current: IntakeState): IntakeState {
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
  // 只把用户原话中独立出现的条件保存为上下文。走路、下蹲、跑跳等动作
  // 由 reportedActions 表达，决策标签在使用时推导，取消动作后不会残留。
  const provocationContexts = Array.from(new Set([
    ...(current.provocationContexts ?? []),
    ...(includesAny(actionSource, ["发力", "用力", "使劲", "抗阻", "一撑"] ) ? ["用力或对抗阻力"] : []),
    ...(includesAny(parsedProvokingAction, ["按压", "压痛", "一按"] ) ? ["按压"] : []),
    ...(includesAny(text, ["静止", "不动", "休息", "夜间", "晚上", "夜里", "睡觉"] ) ? ["静止或夜间"] : []),
    ...(includesAny(parsedProvokingAction, ["运动时", "训练时", "运动过程中"] ) ? ["运动过程中"] : []),
    ...(includesAny(text, ["运动后", "训练后", "跑步后", "跑完", "结束后"] ) ? ["运动结束后"] : []),
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
  const parsedActionSource = `${reproduction} ${actionAnalysis?.task ?? ""} ${actionAnalysis?.category ?? ""}`;
  const parsedActionId = ([
    [/下?楼|台阶|楼梯/, "functional-stairs"],
    [/下蹲|蹲起|起身/, "functional-squat"],
    [/走路|行走|步行/, "functional-walk"],
    [/单腿/, "functional-single-leg"],
    [/跑|跳|落地/, "functional-run-jump"],
    [/绷直膝|膝关节伸直/, "knee-extension"],
    [/弯曲膝|膝关节屈曲/, "knee-flexion"],
    [/勾脚|踝背屈/, regionId === "calf-local" ? "calf-dorsiflexion" : "ankle-dorsiflexion"],
    [/绷脚|跖屈/, regionId === "calf-local" ? "calf-plantarflexion" : "ankle-plantarflexion"],
    [/脚底向内|内翻/, regionId === "calf-local" ? "calf-inversion" : "ankle-inversion"],
    [/脚底向外|外翻/, regionId === "calf-local" ? "calf-eversion" : "ankle-eversion"],
  ] as Array<[RegExp, string]>).find(([pattern]) => pattern.test(parsedActionSource))?.[1];
  const parsedReportedAction = reportedActionOptions(regionId).find((action) => action.id === parsedActionId);
  const reportedActions = current.reportedActions.length
    ? current.reportedActions
    : parsedReportedAction
      ? [parsedReportedAction]
      : [];
  const customAction = current.customAction || (!parsedReportedAction && actionAnalysis?.category === "其他动作" ? reproduction : "");
  const noFixedAction = unclearProvocation;
  const provocationTypes = effectiveProvocationTypes({ provocationContexts, reportedActions, customAction, noFixedAction });
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
    provocationContexts,
    provocationTypes,
    forceDirection,
    swellingLocation,
    swellingLocations,
    tendernessLocation,
    tendernessLocations,
    sensoryLocation,
    sensoryLocations,
    reproduction,
    reportedActions,
    customAction,
    noFixedAction,
    actionSelectionConfirmed: current.actionSelectionConfirmed || Boolean(reportedActions.length || customAction || noFixedAction),
    actionAnalysis,
    goal,
    priorCare,
    stabbingSpread,
    stabbingPalpation: symptomType === "刺痛" ? current.stabbingPalpation : "",
  };
}

export function scoreChange(before: number, after: number) {
  const delta = before - after;
  const percent = before > 0 ? Math.round((delta / before) * 100) : null;
  return { delta, percent };
}

export function firstNumber(value: string, fallback = 10) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

/**
 * Keep the route short without cutting off its later clinical branches.
 * Muscle candidates are tried by relevance; joint and control candidates are
 * retained as conditional exits when the range still has not reached its goal.
 */
export type DynamicMuscleHistoryRecord = Pick<TrialRecord, "candidateId" | "candidateTitle" | "action" | "timeBased" | "rangeOutcomes"> & {
  treatmentName?: string;
};

export function dynamicMuscleCandidateFromRecord(record: TrialRecord): FullCandidate | undefined;
export function dynamicMuscleCandidateFromRecord(record: DynamicMuscleHistoryRecord | FollowupTreatmentRecord): FullCandidate | undefined;
export function dynamicMuscleCandidateFromRecord(record: DynamicMuscleHistoryRecord | FollowupTreatmentRecord): FullCandidate | undefined {
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
    do: record.action || `按图示在${normalizedRegion.label}两侧轻按一次，以按压时更酸或更胀的一侧为重点，轻柔处理30～60秒。`,
    observe: "只做轻柔按压；出现明显刺痛、麻或电感就停止。",
    retest: "处理后比较仍未恢复的相关活动和主诉动作。",
    tags: [`tension:${normalizedRegion.label}`],
    retestIds,
    siteLabel: normalizedRegion.label,
    targetLabel: `${normalizedRegion.label}紧张区域`,
    actionLabel: "轻柔肌肉松解",
  };
}

export function optionalTreatmentSelectionKey(targetId: string, candidateId: string) {
  return `${targetId}::${candidateId}`;
}

export const RESIDUAL_REVIEW_ID = "review-existing-findings";

export function localizeTreatmentSite(site: string, side: string) {
  if (!side || side === "双侧/中间" || /左侧|右侧/.test(site)) return site;
  if (site.includes("两侧")) return site.replace("两侧", side);
  return `${side}${site}`;
}

export type TreatmentDisplay = {
  site: string;
  target: string;
  action: string;
};

export type ActionImageVariant = "self" | "pro";

export type ActionVisual = {
  src: string;
  alt: string;
};

export function actionImageVariant(intake: IntakeState): ActionImageVariant {
  const profile = intake.productMode
    ? normalizeWorkflowProfile({ productMode: intake.productMode, operationTarget: intake.operationTarget, capabilities: intake.capabilities })
    : workflowProfileFromLegacy(intake.userRole, intake.examSetup);
  return profile.operationTarget === "other" ? "pro" : "self";
}

export function actionVisual(src: string, alt: string): ActionVisual {
  return { src: `/rehab-actions/${src}`, alt };
}

export function exerciseActionVisual(exercise: FullExercise, variant: ActionImageVariant): ActionVisual | null {
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

export function ActionReferenceFigure({ visual }: { visual: ActionVisual }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <figure className="rm-action-reference">
    {/* 本地生成的临床动作图保持原始比例和清晰度，不走远端图片优化。 */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={visual.src} alt={visual.alt} loading="lazy" onError={() => setFailed(true)} />
    <figcaption>动作参考</figcaption>
  </figure>;
}

export function treatmentDisplay(candidate: FullCandidate, fallbackSite: string, swellingSite = "", side = ""): TreatmentDisplay {
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

export function TreatmentActionCard({ candidate, display, priorityLabel, controlMotionIds }: { candidate: FullCandidate; display: TreatmentDisplay; priorityLabel?: "先做" | "配合处理"; controlMotionIds?: string[] }) {
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
    ? "动作肌 / 拮抗肌参考"
    : relationRoles.includes("agonist") ? "动作肌参考"
      : relationRoles.includes("antagonist") ? "拮抗肌参考"
        : relationRoles.includes("stabilizer") ? "稳定肌参考" : "检查支持区域";
  return <article className={`rm-candidate rm-treatment-card is-${candidate.type}`} data-candidate-id={candidate.id}>
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
    {normalizedRegion ? <MuscleRegionTreatmentMap locations={[normalizedRegion.label]} /> : null}
    {candidate.type === "muscle" && controlPlans.length ? <div className="rm-treatment-unit-steps">
      <section className="is-release"><header><i>1</i><span>轻柔松解</span></header><p>{candidate.do}</p></section>
      <section className="is-control"><header><i>2</i><span>主动控制</span></header>{controlPlans.map((plan) => <article key={plan.id}><strong>{plan.controlTitle}</strong><p>{plan.controlInstruction}{plan.controlRepetitions}。</p></article>)}</section>
      <footer><b>完成后统一复测</b><span>{retestPlans.map((plan) => plan.userAction).join("、")}</span></footer>
    </div> : <section className="rm-treatment-do"><strong>怎么做</strong><p>{candidateAction(candidate, relevantMotionIds)}</p></section>}
    {patellaUnit ? <section className="rm-treatment-unit-followup is-patella"><b>完成后立即复测</b><span>只复测刚才发现受限的髌骨方向，记录活动范围和不适。</span></section> : null}
  </article>;
}

export function adaptExerciseForCurrentStage(exercise: FullExercise, currentStage: number): FullExercise {
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

export const FRIENDLY_ASSESSMENT_COPY: Record<string, { title: string; how: string; observe: string }> = {
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
  "knee-flexion": { title: "把脚跟滑向臀部", how: "仰卧，脚跟贴着床面。先做没有不适的一边，再慢慢把另一边脚跟滑向臀部。", observe: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。" },
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

  "ankle-dorsiflexion": { title: "把脚背向上勾", how: "坐稳，脚跟放在地上。先做没有不适的一边，再把另一边脚背慢慢向小腿靠近。", observe: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。" },
  "ankle-plantarflexion": { title: "踝关节主动跖屈", how: "坐稳，小腿放松。先做没有不适的一边，再把另一边脚背缓慢向下压。", observe: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。" },
  "ankle-inversion": { title: "把脚掌转向内侧", how: "坐稳，小腿保持不动。先做没有不适的一边，再把另一边脚掌慢慢转向身体中间。", observe: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。" },
  "ankle-eversion": { title: "把脚掌转向外侧", how: "坐稳，小腿保持不动。先做没有不适的一边，再把另一边脚掌慢慢向外转。", observe: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。" },
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

export function assessmentTitle(id: string, title: string) {
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

export function assessmentCopy(id: string, how: string, observe: string) {
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
export function professionalAssessmentCopy(id: string, how: string, observe: string) {
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
    .replaceAll("活动到最大范围时会不会牵拉或卡住", "主动活动到最大范围时是否诱发症状");
  return { how: professionalHow, observe: professionalObserve };
}

export function assessmentLocationAreas(itemId: string): LowerLimbAreaId[] {
  const id = itemId.replace(/^(motion|strength|function|special):/, "");
  if (id.startsWith("knee-")) return ["thigh", "knee", "calf"];
  if (id.startsWith("ankle-")) return ["calf", "ankle", "foot"];
  if (id.startsWith("thigh-")) return ["thigh"];
  if (id.startsWith("calf-")) return ["calf"];
  return ["thigh", "knee", "calf", "ankle", "foot"];
}

export function assessmentObservationSentence(item: AssessmentItem, record: AssessmentRecord) {
  const location = record.discomfortLocation?.trim();
  const feeling = record.discomfortType;
  const score = typeof record.symptomScore === "number" ? `${record.symptomScore}/10` : "";
  return [item.title, location, feeling, score].filter(Boolean).join(" · ");
}

export function familiarSymptomRequired(record: AssessmentRecord, hasChiefAction: boolean) {
  return !hasChiefAction && (record.discomfort === "yes" || functionDiscomfortValue(record) === "yes" || record.simple === "painful");
}

export function motionComparisonMode(regionId: string, itemId: string): MotionComparison {
  if (!isSpinalRegion(regionId)) return "contralateral";
  if (/(left|right)$/.test(itemId)) return "opposite-direction";
  return "midline";
}

export function isSpinalRegion(regionId: string) {
  return ["neck", "thoracic-rib", "lumbar-pelvis"].includes(regionId);
}

export function operationTargetLabel(target: OperationTarget | "") {
  return target === "other" ? "给别人检查" : target === "study" ? "旧版案例学习（已关闭）" : target === "self" ? "给自己检查" : "待确认";
}

export function profileLabelForIntake(intake: Pick<IntakeState, "productMode" | "operationTarget">, profile: ReturnType<typeof normalizeWorkflowProfile>) {
  if (profile.isStudy) return "旧版案例学习（已关闭）";
  if (intake.productMode === "guided") return "自助康复";
  return "康复思路模式";
}

export function spineModeLabel(mode: SpineAssessmentMode) {
  return mode === "reference" ? "参考角度判断" : mode === "guided" ? "跟随提示观察" : "待确认";
}

export function motionComparisonTarget(mode: MotionComparison = "contralateral") {
  if (mode === "opposite-direction") return "另一方向";
  if (mode === "midline") return "自己平时的活动范围";
  return "健侧";
}

export function motionAmplitudeLabel(itemId: string) {
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

export function activeMotionRangeQuestion(itemId: string, bilateral = false, passiveOnly = false) {
  const amplitude = motionAmplitudeLabel(itemId);
  const passiveAmplitude = passiveOnly ? amplitude.replace(/的幅度$/, "的被动活动幅度") : amplitude;
  return bilateral ? `比较左右两侧的${passiveAmplitude}` : `与对侧相比，患侧的${passiveAmplitude}`;
}

export function activeMotionRangeOptions(mode: MotionComparison = "contralateral", spinal = false, assessmentMode: SpineAssessmentMode = "guided", professional = false): Array<[MotionAnswer, string]> {
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

export function localLimbMotionRangeOptions(professional = false): Array<[MotionAnswer, string]> {
  const options: Array<[MotionAnswer, string]> = [
    ["same", "接近健侧｜两侧幅度相近"],
    ["limited", "患侧偏小｜活动范围受限"],
    ["unable", "无法完成｜疼痛、担心或不会做"],
    ["unsure", "暂不判断｜今天先跳过"],
  ];
  if (professional) options.splice(2, 0, ["excessive", "患侧偏大｜活动范围明显更大"]);
  return options;
}

export const TENSION_LOCATION_OPTIONS: Record<string, string[]> = {
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

export function tensionLocationOptions(itemId: string, context = "") {
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

export function bilateralAssessmentCopy(text: string) {
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

export function sharedTensionLocationsForMotion(itemId: string, record: AssessmentRecord, sharedRecord?: AssessmentRecord) {
  const directionId = itemId.replace(/^motion:/, "");
  const direct = record.tensionLocations ?? [];
  const shared = (sharedRecord?.tensionLocations ?? []).filter((location) => {
    if (["没有明显差别", "两侧感觉接近", "暂不判断"].includes(location)) return false;
    const normalized = normalizePilotMuscleRegion(location);
    return Boolean(normalized && primaryRetestMotionIdsForRegion(normalized.id).some((motionId) => samePhysicalAction(motionId, directionId)));
  });
  return [...new Set([...direct, ...shared])];
}

export function motionUnableGuidance(item: AssessmentItem, reason?: AssessmentRecord["unableReason"]) {
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

export function strengthUnableGuidance(item: AssessmentItem, reason?: StrengthUnableReason, professional = false) {
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

export function functionSimpleAnswer(record: AssessmentRecord): SimpleAnswer | undefined {
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

export function spinalRangeQuestion(mode: MotionComparison = "midline", assessmentMode: SpineAssessmentMode = "guided") {
  if (assessmentMode === "reference") return "与参考角度相比";
  if (mode === "opposite-direction") return "与另一个方向相比怎么样？";
  return "这个动作完成得怎么样？";
}

export function passiveMotionOptions(mode: MotionComparison = "contralateral", useReferenceAngle = false, bilateral = false): Array<[PassiveAnswer, string]> {
  if (bilateral) return [["same", "两侧接近｜被动范围差异不明显"], ["left-limited", "左侧偏小｜左侧相对更差"], ["right-limited", "右侧偏小｜右侧相对更差"], ["both-limited", "两侧都偏小｜两侧都有受限"], ["skip", "未检查｜无法判断"]];
  if (useReferenceAngle) return [["same", "角度基本正常｜接近参考范围"], ["limited", "角度偏小｜低于参考范围"], ["excessive", "角度偏大｜高于参考范围"], ["skip", "未检查｜无法判断"]];
  if (mode === "opposite-direction") return [["same", "与另一方向接近｜差异不明显"], ["limited", "该方向偏小｜仍明显受限"], ["excessive", "该方向偏大｜范围明显增加"], ["skip", "未检查｜无法判断"]];
  if (mode === "midline") return [["same", "接近平时范围｜差异不明显"], ["limited", "范围偏小｜仍明显受限"], ["excessive", "范围偏大｜超过平时范围"], ["skip", "未检查｜无法判断"]];
  return [["same", "接近健侧｜被动范围差异不明显"], ["limited", "患侧偏小｜仍明显受限"], ["excessive", "患侧偏大｜范围明显增加"], ["skip", "未检查｜无法判断"]];
}

export const PASSIVE_END_FEEL_OPTIONS: Array<[PassiveEndFeel, string]> = [
  ["soft", "软性终末感"],
  ["elastic", "弹性终末感"],
  ["firm", "坚实终末感"],
  ["hard", "硬性阻挡"],
  ["painful", "疼痛性终止"],
  ["unknown", "无法判断"],
];

export function passiveEndFeelLabel(value?: PassiveEndFeel) {
  return PASSIVE_END_FEEL_OPTIONS.find(([key]) => key === value)?.[1] ?? "";
}

export function passiveMotionInstruction(mode: MotionComparison = "contralateral", bilateral = false) {
  if (bilateral) return "让对方放松，左右分别轻柔带动，记录哪一侧范围更小；不熟悉时选择“未做/不确定”。";
  if (mode === "opposite-direction") return "由受训者在放松体位轻柔带动，再与相反方向的末端角度和弹性比较；不熟悉时选择“未做/不确定”。";
  if (mode === "midline") return "由受训者在放松体位轻柔辅助动作，比较是否更接近平时可用范围；不熟悉时选择“未做/不确定”。";
  return "让对方放松，轻柔带动不舒服的一侧，再与健侧比较活动范围；不熟悉时选择“未做/不确定”。";
}

export function professionalPassiveMotionInstruction(item: AssessmentItem, bilateral = false) {
  if (item.testMode === "passive") return item.professionalHow ?? "受检者放松相关关节，检查者与对侧比较被动活动幅度和终末感。";
  if (bilateral) return "受检者放松，检查者以相同体位和力度分别完成左右被动活动（PROM），记录幅度、终末感及症状反应。";
  return "受检者放松，检查者以低刺激完成患侧被动活动（PROM），再与对侧比较幅度、终末感及症状反应。";
}

export function rangeRetestOptions(mode: MotionComparison = "contralateral", canAssessPassive = true, bilateral = false, passiveOnly = false): Array<[CompletedRangeRetestAnswer, string]> {
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

export function shouldCollectBaselineScore(intake: IntakeState) {
  // 分数必须绑定一个能重复完成的具体动作。只有选择“走路/按压/静息”
  // 等场景，仍没有说清动作时，不显示初始评分条，避免把泛泛症状变成
  // 一个后面无法复现的主诉分数。多个动作也不共用一个分数，避免后续
  // 把“下蹲、下楼”误显示成同一个复测条件。
  return reportedActionSummary(intake).length === 1;
}

export function chiefComplaintLabel(intake: IntakeState) {
  if (hasClearChiefAction(intake)) return chiefActionLabel(intake);
  return [intake.side, intake.location && intake.location !== "说不清" ? intake.location : "具体位置待确认", intake.symptomType].filter(Boolean).join(" · ") || "当前主要问题";
}

export function retestConditionLabel(intake: IntakeState) {
  return hasClearChiefAction(intake) ? chiefActionLabel(intake) : "当前主要症状（没有固定动作）";
}

export function chiefFunctionAssessmentId(intake: IntakeState, regionId: string) {
  return chiefFunctionAssessmentIds(intake, regionId)[0] ?? "";
}

export function effectiveAssessmentRecord(_item: AssessmentItem, stored: AssessmentRecord | undefined, _intake: IntakeState, _regionId: string) {
  // 主诉是上下文，不是已经完成的功能检查；没有现场记录就不生成默认 assessment record。
  void _intake;
  void _regionId;
  return stored;
}

export function canonicalRetestAction(label: string) {
  return canonicalActionKey(label);
}

export function directionIsRelevant(regionId: string, itemId: string, intake: IntakeState) {
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

export function strengthIsRelevant(regionId: string, itemId: string, intake: IntakeState) {
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

export function strengthRelatedMotionId(strengthItemId: string) {
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
