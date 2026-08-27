import {
  DEFAULT_INTAKE,
  SAFETY_ITEMS,
  SHARED_TENSION_ASSESSMENT_ID,
  type AssessmentRecord,
  type IntakeState,
  type SavedDemoSnapshot,
  type Step,
} from "@/src/features/rehabmind/components/workbench/workbench-support";
import { makeLowerLimbLocationSelection, type LowerLimbLocationSelection } from "@/src/features/rehabmind/components/assessment/lower-limb-location-picker";
import type { ProblemThreadRecord, SessionIndexRecord } from "@/src/domain/rehab/history/session-identity-core";
import type { RehabSessionSummary } from "@/src/features/rehabmind/workflow/session-history";
import { PILOT_SNAPSHOT_SCHEMA_VERSION } from "@/src/infrastructure/pilot/api/case-contracts";
import type { PilotTestFaultMode } from "@/src/infrastructure/pilot/api/case-client";

export type PilotTestMode = "full_flow" | "page_boundary";

export type PilotScenarioFixtureKind = "bilateral-longitudinal" | "bilateral-training-gate" | "history-second-session" | "history-new-problem";

export type PilotScenarioSeedContext = Readonly<{
  localCaseId: string;
  problemThreadId: string;
  sessionId: string;
  historicalProblemThreadId: string;
  historicalSessionId: string;
  savedAt: string;
}>;

export type PilotScenarioSnapshotOverrides = Omit<Partial<SavedDemoSnapshot>, "intake"> & {
  /** 场景只需改少数 intake 字段，不要求重复整份生产状态。 */
  intake?: Partial<IntakeState>;
};

export type PilotTestScenario = Readonly<{
  id: string;
  title: string;
  description: string;
  mode: PilotTestMode;
  target: string;
  initialProblem: string;
  step?: Step;
  snapshotOverrides?: PilotScenarioSnapshotOverrides;
  /** 页面恢复时使用的历史年龄；只影响测试种子，不改变生产时间规则。 */
  restoreAgeMs?: number;
  /** 需要在页面上直接观察的正式状态组合。 */
  fixtureKind?: PilotScenarioFixtureKind;
  /** 仅用于验证既有保存/同步错误出口。 */
  faultMode?: PilotTestFaultMode;
  fixtureNote?: string;
}>;

const COMPLETED_KNEE_INTAKE = {
  ...DEFAULT_INTAKE,
  description: "右膝下楼和下蹲时疼痛，希望恢复正常上下楼。",
  parsed: true,
  userRole: "general",
  examSetup: "self",
  productMode: "guided",
  operationTarget: "self",
  capabilitiesConfirmed: true,
  regionId: "knee",
  side: "右侧",
  location: "膝关节前侧",
  locationConfirmed: true,
  onset: "1～6周",
  mechanism: "逐渐出现",
  symptomType: "酸痛",
  painQualityConfirmed: true,
  provocationTypes: ["走路、站立或负重"],
  customAction: "下楼和下蹲",
  reproduction: "下楼和下蹲",
  actionSelectionConfirmed: true,
  goal: 3,
  baselineScore: 5,
  baselineScoreConfirmed: true,
} satisfies IntakeState;

const NORMAL_MOTION: AssessmentRecord = { active: "same", discomfort: "no", pairedStrength: "normal" };
const NORMAL_STRENGTH: AssessmentRecord = { simple: "normal" };
const NORMAL_FUNCTION: AssessmentRecord = { functionCompletion: "complete", functionControl: "stable", functionDiscomfort: "no" };

function withCompletedBilateralComparisons(records: Record<string, AssessmentRecord>) {
  return Object.fromEntries(Object.entries(records).map(([id, record]) => {
    if (!/^(strength|function|special):/.test(id)) return [id, record];
    return [id, {
      ...record,
      bilateralComparison: "两侧接近",
      worseSide: "两侧接近",
    } satisfies AssessmentRecord];
  })) as Record<string, AssessmentRecord>;
}

function locationSelection(side: string, location: string, regionId: string): LowerLimbLocationSelection {
  const selection = makeLowerLimbLocationSelection(side, location, regionId);
  if (!selection) throw new Error(`Invalid test fixture location: ${side}/${location}/${regionId}`);
  return selection;
}

const BILATERAL_INTAKE: IntakeState = {
  ...({
    ...DEFAULT_INTAKE,
    description: "两侧膝盖下蹲都不舒服，右侧更明显，想先改善右侧。",
    parsed: true,
    userRole: "general",
    examSetup: "self",
    productMode: "guided",
    operationTarget: "self",
    capabilitiesConfirmed: true,
    regionId: "knee",
    side: "双侧/中间",
    prioritySide: "右侧",
    location: "左膝前侧、右膝前侧",
    locationConfirmed: true,
    bodyLocations: [locationSelection("左侧", "膝关节前侧", "knee"), locationSelection("右侧", "膝关节前侧", "knee")],
    bodyLocationHistory: [],
    onset: "1～6周",
    mechanism: "逐渐出现",
    symptomType: "酸痛",
    painQualityConfirmed: true,
    provocationTypes: ["走路、站立或负重"],
    customAction: "下楼和下蹲",
    reproduction: "下楼和下蹲",
    actionSelectionConfirmed: true,
    goal: 3,
    baselineScore: 5,
    baselineScoreConfirmed: true,
  } satisfies IntakeState),
};

const NEW_PROBLEM_INTAKE: IntakeState = {
  ...COMPLETED_KNEE_INTAKE,
  description: "复查原右膝问题时，又出现新的右踝外侧不适。",
  regionId: "ankle-foot",
  location: "外踝前外侧",
  bodyLocations: [locationSelection("右侧", "外踝前外侧", "ankle-foot")],
  bodyLocationHistory: [locationSelection("右侧", "膝关节前侧", "knee")],
  customAction: "走路",
  reproduction: "走路",
};

function currentThreadForSeed(input: PilotScenarioSeedContext, snapshot: SavedDemoSnapshot): ProblemThreadRecord {
  const thread: ProblemThreadRecord = {
    problemThreadId: input.problemThreadId,
    caseId: input.localCaseId,
    status: "active",
    createdAt: input.savedAt,
    lastActiveAt: input.savedAt,
    title: snapshot.intake.description,
  };
  if (snapshot.intake.regionId) thread.regionId = snapshot.intake.regionId;
  if (snapshot.intake.location) thread.location = snapshot.intake.location;
  return thread;
}

function sessionIndexForSeed(input: PilotScenarioSeedContext, sessionNumber: number, problemThreadId = input.problemThreadId, sessionId = input.sessionId, status: SessionIndexRecord["status"] = "draft", startedAt = input.savedAt): SessionIndexRecord {
  const index: SessionIndexRecord = {
    sessionId,
    problemThreadId,
    caseId: input.localCaseId,
    sessionNumber,
    status,
    startedAt,
    lastDraftSavedAt: startedAt,
  };
  if (status === "completed") {
    index.completedAt = startedAt;
    index.completionReason = "workflow_completed";
  }
  return index;
}

function fixtureSummary(input: { sessionId: string; problemThreadId: string; sessionNumber: number; startedAt: string; status: RehabSessionSummary["status"]; location: string; endingScore?: number }): RehabSessionSummary {
  return {
    sessionId: input.sessionId,
    problemThreadId: input.problemThreadId,
    status: input.status,
    sessionNumber: input.sessionNumber,
    startedAt: input.startedAt,
    lastDraftSavedAt: input.startedAt,
    ...(input.status === "completed" ? { completedAt: input.startedAt, completionReason: "workflow_completed" } : {}),
    location: input.location,
    startedScore: 5,
    endingScore: input.endingScore,
    reviewResults: [{ id: "fixture-chief-action", label: "下楼和下蹲", result: input.status === "completed" ? "better" : "unknown" }],
    treatments: input.status === "completed" ? [{ id: "fixture-treatment", label: "示例有效处理", result: "better", responseRole: "key-completion" }] : [],
    effectiveCombination: input.status === "completed" ? ["示例有效处理"] : [],
    continuedEffectiveTreatments: input.status === "completed" ? ["示例有效处理"] : [],
    stoppedTreatments: [],
    resolvedProblems: [],
    training: input.status === "completed" ? [{ id: "fixture-training", label: "基础控制", adjustment: "hold" }] : [],
    nextFocus: input.status === "completed" ? ["复查主诉和第一次发现的问题"] : ["完成当前会话"],
  };
}

/**
 * A broad, internally consistent knee assessment ledger for page-boundary tests.
 * The production selector still decides which entries are relevant; unused keys are ignored.
 */
const KNEE_PAGE_ASSESSMENTS: Record<string, AssessmentRecord> = {
  "motion:knee-extension": { active: "limited", discomfort: "no", pairedStrength: "normal" },
  "motion:knee-flexion": NORMAL_MOTION,
  "motion:knee-patella-superior": { passive: "same", passiveDiscomfort: "no" },
  "motion:knee-patella-inferior": { passive: "same", passiveDiscomfort: "no" },
  "motion:knee-patella-medial": { passive: "same", passiveDiscomfort: "no" },
  "motion:knee-patella-lateral": { passive: "same", passiveDiscomfort: "no" },
  "strength:knee-quadriceps": NORMAL_STRENGTH,
  "strength:knee-hamstring": NORMAL_STRENGTH,
  "strength:knee-posterior-chain": NORMAL_STRENGTH,
  "strength:knee-adductor-pes": NORMAL_STRENGTH,
  "strength:knee-glute": NORMAL_STRENGTH,
  "strength:knee-calf": NORMAL_STRENGTH,
  "strength:knee-foot-arch": NORMAL_STRENGTH,
  "function:knee-gait": NORMAL_FUNCTION,
  "function:knee-squat": NORMAL_FUNCTION,
  "function:knee-heel-raise": NORMAL_FUNCTION,
  "function:knee-step-up": NORMAL_FUNCTION,
  "function:knee-step-down": NORMAL_FUNCTION,
  "function:knee-single-leg": NORMAL_FUNCTION,
  "function:knee-single-leg-squat": NORMAL_FUNCTION,
  "function:knee-hop-landing": NORMAL_FUNCTION,
  "special:knee-patella-tenderness-self": { simple: "normal" },
  "special:knee-joint-line-tenderness": { simple: "normal" },
  [SHARED_TENSION_ASSESSMENT_ID]: { tensionChecked: true, tensionLocations: ["thigh-anterior"] },
};

export function createPilotScenarioSnapshot(scenario: PilotTestScenario, seed?: PilotScenarioSeedContext): SavedDemoSnapshot {
  const isFullFlow = scenario.mode === "full_flow";
  const base: SavedDemoSnapshot = {
    schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION,
    step: isFullFlow ? 0 : scenario.step ?? 0,
    intake: isFullFlow
      ? { ...DEFAULT_INTAKE, description: scenario.initialProblem }
      : { ...COMPLETED_KNEE_INTAKE, description: scenario.initialProblem },
    confirmedIntakeMulti: isFullFlow
      ? { symptoms: false, provocationTypes: false }
      : { symptoms: true, provocationTypes: true },
    // 页面定向夹具从安全确认之后的阶段启动，必须把被跳过的正式前置
    // 完整种入快照。否则页面能操作，但服务端工作流投影会把后续事件
    // 判为越级。完整流程仍从空答案开始，继续验证真实安全问答。
    safety: isFullFlow
      ? {}
      : Object.fromEntries(SAFETY_ITEMS.map((item) => [item.id, "no" as const])),
    boneRisk: {},
    imaging: isFullFlow ? [] : ["没有做影像"],
    assessmentIndex: 0,
    assessmentResults: isFullFlow ? {} : KNEE_PAGE_ASSESSMENTS,
    trialTargetIndex: 0,
    candidateIndex: 0,
    selectedOptionalCandidateIds: [],
    bilateralNeedsReferral: false,
    midpointDecisionDone: false,
    bilateralTreatmentSides: {},
    bilateralRetestResponses: {},
    trialRecords: [],
    postScore: 0,
    postScoreConfirmed: false,
    postDiscomfort: "",
    readyToRetest: false,
    retestPlan: null,
    movementResponse: "",
    movementResponses: {},
    movementDiscomforts: {},
    movementScores: {},
    movementScoreConfirmed: {},
    exerciseFeedback: {},
    trainingComplete: false,
    trainingPlanSaved: false,
    treatmentFinalRetestScore: 0,
    treatmentFinalRetestConfirmed: false,
    trainingReadyForFinalRetest: false,
    finalRetestScore: 0,
    finalRetestConfirmed: false,
    followupMode: false,
    sessionNumber: 1,
    followupScore: 0,
    followupScoreConfirmed: false,
    followupScoreHistory: [],
    followupStage: "review",
    followupPostScore: 0,
    followupPostScoreConfirmed: false,
    followupPostDiscomfort: "",
    followupCandidateId: "",
    followupTrialRecords: [],
    followupReadyToRetest: false,
    followupRetestPlan: null,
    followupMovementResponses: {},
    followupMovementDiscomforts: {},
    followupMovementScores: {},
    followupMovementScoreConfirmed: {},
    followupTensionLocations: [],
    followupExerciseChoices: {},
    followupTrainingReadyForRetest: false,
    followupFinalScore: 0,
    followupFinalScoreConfirmed: false,
    hasNewSymptom: "",
    followupTrends: {},
    sessionHistory: [],
    assessmentRevision: 0,
    treatmentPlanRevision: 0,
    adverseResponse: null,
    adverseConfirmedAssessmentIds: [],
  };

  const fixtureIntake = scenario.fixtureKind === "history-new-problem"
    ? NEW_PROBLEM_INTAKE
    : scenario.fixtureKind === "bilateral-training-gate" || scenario.fixtureKind === "bilateral-longitudinal"
      ? BILATERAL_INTAKE
      : undefined;
  const snapshot: SavedDemoSnapshot = {
    ...base,
    ...scenario.snapshotOverrides,
    intake: {
      ...base.intake,
      ...(fixtureIntake ?? {}),
      ...(scenario.snapshotOverrides?.intake ?? {}),
    },
  };

  if (!seed) return snapshot;

  const currentThread = currentThreadForSeed(seed, snapshot);
  const seededIdentity: Partial<SavedDemoSnapshot> = {
    localCaseId: seed.localCaseId,
    problemThreadId: seed.problemThreadId,
    sessionId: seed.sessionId,
    sessionStatus: "draft",
    sessionStartedAt: seed.savedAt,
    draftSavedAt: seed.savedAt,
    problemThreads: [currentThread],
    sessionIndex: [sessionIndexForSeed(seed, snapshot.sessionNumber)],
  };

  if (scenario.fixtureKind === "history-second-session" || scenario.fixtureKind === "history-new-problem") {
    const historicalStartedAt = new Date(Date.parse(seed.savedAt) - 24 * 60 * 60 * 1000).toISOString();
    const historicalLocation = "膝关节前侧";
    const historicalThread: ProblemThreadRecord = {
      problemThreadId: seed.historicalProblemThreadId,
      caseId: seed.localCaseId,
      status: scenario.fixtureKind === "history-new-problem" ? "archived" : "active",
      createdAt: historicalStartedAt,
      lastActiveAt: historicalStartedAt,
      ...(scenario.fixtureKind === "history-new-problem" ? { closedAt: seed.savedAt } : {}),
      regionId: "knee",
      location: historicalLocation,
      title: "原右膝下楼疼痛",
    };
    const currentHistoryThread: ProblemThreadRecord = scenario.fixtureKind === "history-new-problem"
      ? {
        ...currentThread,
        supersedesProblemThreadId: seed.historicalProblemThreadId,
        regionId: snapshot.intake.regionId,
        location: snapshot.intake.location,
        title: "新右踝外侧不适",
      }
      : currentThread;
    const firstSummary = fixtureSummary({
      sessionId: seed.historicalSessionId,
      problemThreadId: seed.historicalProblemThreadId,
      sessionNumber: 1,
      startedAt: historicalStartedAt,
      status: "completed",
      location: historicalLocation,
      endingScore: 3,
    });
    const currentSummary = fixtureSummary({
      sessionId: seed.sessionId,
      problemThreadId: scenario.fixtureKind === "history-new-problem" ? seed.problemThreadId : seed.historicalProblemThreadId,
      sessionNumber: 2,
      startedAt: seed.savedAt,
      status: "draft",
      location: snapshot.intake.location,
    });
    seededIdentity.problemThreads = scenario.fixtureKind === "history-new-problem"
      ? [historicalThread, currentHistoryThread]
      : [historicalThread];
    if (scenario.fixtureKind === "history-second-session") {
      seededIdentity.problemThreadId = seed.historicalProblemThreadId;
    }
    seededIdentity.sessionIndex = [
      sessionIndexForSeed({ ...seed, problemThreadId: seed.historicalProblemThreadId, sessionId: seed.historicalSessionId }, 1, seed.historicalProblemThreadId, seed.historicalSessionId, "completed", historicalStartedAt),
      sessionIndexForSeed(seed, 2, currentSummary.problemThreadId, seed.sessionId),
    ];
    seededIdentity.sessionHistory = [firstSummary, currentSummary];
    seededIdentity.sessionNumber = 2;
    seededIdentity.followupMode = true;
    seededIdentity.followupStage = "review";
    seededIdentity.followupScoreHistory = [5];
    seededIdentity.hasNewSymptom = scenario.fixtureKind === "history-new-problem";
  }

  if (scenario.fixtureKind === "bilateral-training-gate") {
    seededIdentity.assessmentResults = {
      ...snapshot.assessmentResults,
      "motion:knee-extension": { active: "right-limited", discomfort: "yes", pairedStrength: "normal" },
    };
    seededIdentity.bilateralTreatmentSides = { "target:chief": ["右侧"] };
    seededIdentity.bilateralRetestResponses = {};
  }

  if (scenario.fixtureKind === "bilateral-longitudinal") {
    seededIdentity.assessmentResults = {
      // 双侧功能/力量/专项检查即使结果正常，也必须明确记录“两侧接近”才算
      // 完成；把这些合法前置补齐，避免恢复时落到并非本夹具目标的检查卡。
      ...withCompletedBilateralComparisons(snapshot.assessmentResults),
      // 其余项目保持已记录，只把膝伸直活动度留作真实逐侧操作入口。
      // 双侧受限会形成可即时处理和逐侧复测的活动度发现；不能用只进入
      // 训练的功能代偿结果冒充处理链。右侧虽是优先侧，左右都完成前仍
      // 不会生成汇总结论或开放处理。
      "motion:knee-extension": { bilateralSideResults: {} },
    };
    seededIdentity.bilateralTreatmentSides = {};
    seededIdentity.bilateralRetestResponses = {};
    seededIdentity.midpointDecisionDone = false;
  }

  return {
    ...snapshot,
    ...seededIdentity,
    intake: {
      ...snapshot.intake,
    },
  };
}

export const PILOT_TEST_SCENARIOS: readonly PilotTestScenario[] = [
  {
    id: "knee-unilateral-motion-pain",
    title: "单侧膝关节动作疼痛",
    description: "从问题描述开始，检查膝关节动作疼痛的完整流程。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "右膝下楼梯和下蹲时前侧疼痛，已经三周，希望恢复正常上下楼。",
  },
  {
    id: "ankle-sprain",
    title: "单侧踝扭伤",
    description: "从新鲜扭伤描述开始，检查安全确认和踝关节路径。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "昨天打球时右脚踝向内崴伤，外踝肿痛，走路疼，希望恢复正常走路。",
  },
  {
    id: "bilateral-priority",
    title: "双侧问题与优先侧",
    description: "检查双侧信息、优先侧与后续记录是否保持一致。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "两侧膝盖下蹲都不舒服，右侧更明显，右侧约5分，想先改善右侧。",
  },
  {
    id: "visible-swelling",
    title: "明显肿胀",
    description: "检查肿胀定位、安全分支和后续队列。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "右膝扭伤后明显肿胀，弯曲受限，走路疼痛，希望先消肿并恢复走路。",
  },
  {
    id: "sensory-strength-change",
    title: "麻木或力量变化",
    description: "检查感觉和力量变化是否进入对应安全路径。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "右小腿外侧偶尔发麻，脚踝抬起感觉无力，最近一周更明显。",
  },
  {
    id: "high-discomfort-stop",
    title: "高不适停止",
    description: "检查高不适时能否停止并保留当前进度。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "右膝活动时疼痛达到9分，无法继续做下蹲，希望先判断是否适合继续。",
  },
  {
    id: "action-unable",
    title: "动作无法完成",
    description: "检查动作不能完成时是否记录能力状态并进入对应复测。",
    mode: "full_flow",
    target: "完整流程",
    initialProblem: "右膝疼痛导致下蹲动作无法完成，希望能重新完成下蹲。",
  },
  {
    id: "snapshot-fresh-under-24h",
    title: "快照未满24小时",
    description: "真实加载一份23小时前的保存记录，确认不出现陈旧提醒且原答案不变。",
    mode: "page_boundary",
    target: "陈旧恢复边界",
    initialProblem: "右膝下楼时疼痛，昨天刚保存过记录。",
    step: 2,
    restoreAgeMs: 23 * 60 * 60 * 1000,
    snapshotOverrides: { intake: { onset: "今天或昨天" } },
    fixtureNote: "预期：没有“恢复记录提醒”。",
  },
  {
    id: "snapshot-stale-24h-acute",
    title: "快照超过24小时（急性）",
    description: "真实加载一份恰好超过24小时的急性记录，提醒可以继续但不阻断。",
    mode: "page_boundary",
    target: "陈旧恢复边界",
    initialProblem: "右脚踝昨天扭伤，外踝肿痛，昨天保存过记录。",
    step: 2,
    restoreAgeMs: 24 * 60 * 60 * 1000,
    snapshotOverrides: { intake: { onset: "今天或昨天" } },
    fixtureNote: "预期：显示“恢复记录提醒”，只有“回看当前情况”，不要求三项确认。",
  },
  {
    id: "snapshot-stale-7d-acute",
    title: "快照超过7天（急性）",
    description: "真实加载一份7天前的急性/时间敏感记录，必须先重新确认三类信息。",
    mode: "page_boundary",
    target: "陈旧恢复边界",
    initialProblem: "右脚踝扭伤后外踝肿痛，7天前保存过记录。",
    step: 2,
    restoreAgeMs: 7 * 24 * 60 * 60 * 1000,
    snapshotOverrides: { intake: { onset: "今天或昨天" } },
    fixtureNote: "预期：回到症状信息并显示“重新确认后继续”，原答案仍保留。",
  },
  {
    id: "snapshot-stale-7d-chronic",
    title: "快照超过7天（慢性）",
    description: "真实加载一份7天前的慢性记录，只提醒、不阻断继续。",
    mode: "page_boundary",
    target: "陈旧恢复边界",
    initialProblem: "右膝下楼时疼痛已经超过6周，7天前保存过记录。",
    step: 2,
    restoreAgeMs: 7 * 24 * 60 * 60 * 1000,
    snapshotOverrides: { intake: { onset: "超过6周" } },
    fixtureNote: "预期：显示超过7天提醒，但不要求急性三项确认。",
  },
  {
    id: "bilateral-longitudinal",
    title: "双侧完整纵向流程",
    description: "从左右分别评估开始，完成优先侧处理、另一侧处理、左右分别复测和训练门检查。",
    mode: "page_boundary",
    target: "双侧纵向流程",
    initialProblem: "两侧膝盖下蹲都不舒服，右侧更明显，想先改善右侧。",
    step: 2,
    fixtureKind: "bilateral-longitudinal",
    fixtureNote: "先记录右侧，再记录左侧；只完成一侧时保持未完成。两侧均选受限后进入处理，页面应先处理右侧并分别复测左右。",
  },
  {
    id: "bilateral-training-gate",
    title: "双侧未完成时的训练门",
    description: "直接进入带左右标记、右侧优先但另一侧未完成评估的训练页。",
    mode: "page_boundary",
    target: "双侧流程边界",
    initialProblem: "两侧膝盖下蹲都不舒服，右侧更明显，想先改善右侧。",
    step: 4,
    fixtureKind: "bilateral-training-gate",
    fixtureNote: "预期：页面显示“当前只开放低负荷基础活动”，进阶按钮不可用。",
  },
  {
    id: "treatment-improved",
    title: "后续康复后改善",
    description: "直接检查后续康复与改善复测页面的接线。",
    mode: "page_boundary",
    target: "后续康复边界",
    initialProblem: "右膝下楼时疼痛，处理后症状改善。",
    step: 3,
    snapshotOverrides: { postScore: 2, postScoreConfirmed: true, postDiscomfort: "yes" },
  },
  {
    id: "treatment-same",
    title: "后续康复后无变化",
    description: "直接检查无变化结果、继续方向和文案。",
    mode: "page_boundary",
    target: "后续康复边界",
    initialProblem: "右膝下楼时疼痛，处理后没有明显变化。",
    step: 3,
    snapshotOverrides: { postScore: 5, postScoreConfirmed: true, postDiscomfort: "yes" },
  },
  {
    id: "treatment-worse",
    title: "后续康复后加重",
    description: "直接检查加重后的停止、重新评估和状态保留。",
    mode: "page_boundary",
    target: "后续康复边界",
    initialProblem: "右膝下楼时疼痛，处理后疼痛加重。",
    step: 3,
    snapshotOverrides: { postScore: 7, postScoreConfirmed: true, postDiscomfort: "yes" },
  },
  {
    id: "training-worse",
    title: "训练后加重",
    description: "检查训练反馈为加重时的停止和重新评估入口。",
    mode: "page_boundary",
    target: "训练边界",
    initialProblem: "右膝下楼疼痛，进入训练后症状加重。",
    step: 4,
  },
  {
    id: "network-save-failure",
    title: "网络保存失败",
    description: "真实页面本机保存照常执行，只注入同步网络失败，检查离线提示和稍后重试语义。",
    mode: "page_boundary",
    target: "异常保存边界",
    initialProblem: "右膝下楼疼痛，保存时网络暂时不可用。",
    step: 3,
    faultMode: "network",
    fixtureNote: "预期：页面显示“网络断开，正在本机保存”，服务器不应被伪造为已同步。",
  },
  {
    id: "timeout-save-failure",
    title: "网络保存超时",
    description: "真实页面本机保存照常执行，只注入同步超时，检查超时也不会丢本地内容。",
    mode: "page_boundary",
    target: "异常保存边界",
    initialProblem: "右膝下楼疼痛，保存请求超时。",
    step: 3,
    faultMode: "timeout",
    fixtureNote: "预期：页面显示“网络断开，正在本机保存”，记录仍留在本机。",
  },
  {
    id: "storage-unavailable",
    title: "本机存储不可用",
    description: "真实页面读取种子后禁止后续本机写入，检查保存失败文案和数据不被假报成功。",
    mode: "page_boundary",
    target: "异常保存边界",
    initialProblem: "右膝下楼疼痛，本机存储空间或权限不可用。",
    step: 3,
    faultMode: "storage",
    fixtureNote: "预期：页面显示“本机保存失败”，不会显示“已保存到本机”。",
  },
  {
    id: "second-session",
    title: "第二次康复",
    description: "检查历史摘要、复查入口和第二次康复状态。",
    mode: "page_boundary",
    target: "复查边界",
    initialProblem: "右膝下楼疼痛，正在进行第二次康复复查。",
    step: 5,
    fixtureKind: "history-second-session",
    snapshotOverrides: { followupMode: true, sessionNumber: 2, followupStage: "review", followupScoreHistory: [5] },
  },
  {
    id: "new-problem",
    title: "出现新问题",
    description: "检查后续康复中新问题的分流和历史保留。",
    mode: "page_boundary",
    target: "复查边界",
    initialProblem: "原右膝问题复查时，又出现新的右踝不适。",
    step: 5,
    fixtureKind: "history-new-problem",
    snapshotOverrides: { followupMode: true, sessionNumber: 2, followupStage: "review", hasNewSymptom: "yes", followupScoreHistory: [5] },
  },
  {
    id: "revise-old-answer",
    title: "返回修改旧答案",
    description: "检查回看修改是否只在答案变化后使下游失效。",
    mode: "page_boundary",
    target: "历史修改边界",
    initialProblem: "右膝下楼疼痛，已完成信息确认，准备返回修改旧答案。",
    step: 2,
    snapshotOverrides: { assessmentRevision: 1, treatmentPlanRevision: 1 },
  },
] as const;

export function findPilotTestScenario(scenarioId: string) {
  return PILOT_TEST_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? null;
}
