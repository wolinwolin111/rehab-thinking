import {
  DEFAULT_INTAKE,
  SHARED_TENSION_ASSESSMENT_ID,
  type AssessmentRecord,
  type IntakeState,
  type SavedDemoSnapshot,
  type Step,
} from "@/src/features/rehabmind/components/workbench/workbench-support";
import { PILOT_SNAPSHOT_SCHEMA_VERSION } from "@/src/infrastructure/pilot/api/case-contracts";

export type PilotTestMode = "full_flow" | "page_boundary";

export type PilotTestScenario = Readonly<{
  id: string;
  title: string;
  description: string;
  mode: PilotTestMode;
  target: string;
  initialProblem: string;
  step?: Step;
  snapshotOverrides?: Partial<SavedDemoSnapshot>;
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

export function createPilotScenarioSnapshot(scenario: PilotTestScenario): SavedDemoSnapshot {
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
    safety: {},
    boneRisk: {},
    imaging: [],
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

  return {
    ...base,
    ...scenario.snapshotOverrides,
    intake: {
      ...base.intake,
      ...(scenario.snapshotOverrides?.intake ?? {}),
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
    id: "second-session",
    title: "第二次康复",
    description: "检查历史摘要、复查入口和第二次康复状态。",
    mode: "page_boundary",
    target: "复查边界",
    initialProblem: "右膝下楼疼痛，正在进行第二次康复复查。",
    step: 5,
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
