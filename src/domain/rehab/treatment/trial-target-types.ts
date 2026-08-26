/**
 * 处理目标编排（buildTrialTargets）的结构类型与决策上下文。
 *
 * 纯 core 不能 import 组件本地类型，但 pilot / 膝 / 局部决策的类型已经在各自的
 * core 里，这里直接复用；只有组件私有的 Finding / AssessmentRecord / TrialRecord /
 * FullRegion / IntakeState 等才声明最小结构类型。组件本地辅助函数以函数引用
 * 形式放进上下文（参数用 any 承接组件私有类型，调用侧仍由组件保证类型安全）。
 */

import { type CandidateTreatmentInput } from "@/src/domain/rehab/treatment/candidate-treatment-core";
import { type ChiefActionIntake } from "@/src/domain/rehab/intake/chief-action-core";
import { type PilotRelation } from "@/src/knowledge/pilot/pilot-knowledge";
import { type PilotTreatmentUnit } from "@/src/domain/rehab/shared/pilot-decision-engine";
import { type KneeDecisionOutput } from "@/src/domain/rehab/shared/knee-decision-core";
import { type LocalLimbDecision } from "@/src/domain/rehab/shared/local-limb-decision-core";

export type FullCandidateInput = CandidateTreatmentInput & {
  access: string;
  observe: string;
  retest: string;
  retestIds?: string[];
};

export type FindingInput = {
  id: string;
  priority: string;
  title: string;
  side?: string;
  tags: string[];
  relatedMotionId?: string;
  detail?: string;
};

export type AssessmentRecordInput = {
  simple?: string;
  passive?: string;
  active?: string;
  discomfort?: string;
  familiarSymptom?: string;
  unableReason?: string;
  tensionLocations?: string[];
  tensionChecked?: boolean;
};

export type TrialRecordInput = {
  candidateId: string;
  reviewOnly?: boolean;
  retestOnly?: boolean;
  timeBased?: boolean;
  targetId: string;
  rangeOutcomes?: Record<string, string>;
  rangeOutcome?: string;
  chiefRetested?: boolean;
  treatmentSide?: string;
  treatmentKey?: string;
  result?: string;
  action?: string;
  candidateTitle?: string;
  treatmentName?: string;
};

export type AssessmentItemInput = {
  id: string;
  title: string;
  testMode?: string;
  comparison?: string;
  pairedStrengthId?: string;
  spinal?: boolean;
  kind: string;
};

export type FullRegionInput = {
  id: string;
  shortName: string;
  mobilityInterventions?: FullCandidateInput[];
  candidateGroups: Array<{ candidates: FullCandidateInput[] }>;
};

export type TissuePathwayInput = { id: string };

export type KneeDecisionInput = KneeDecisionOutput | null;

export type LocalLimbDecisionInput = LocalLimbDecision | null;

export type PilotRelationEntryInput = { relation: PilotRelation; score: number };

export type PilotTreatmentUnitInput = PilotTreatmentUnit;

export type IntakeInput = ChiefActionIntake & {
  symptomType: string;
  userRole: string;
  provocationTypes: string[];
  symptoms: string[];
  stabbingPalpation: string;
  goal: number;
  description: string;
  baselineScore: number;
  baselineScoreConfirmed: boolean;
  /** S-06：双侧场景下用户明确选择的优先处理侧；单侧或未选时缺省。 */
  prioritySide?: string;
};

export type TrialTargetOutput = {
  id: string;
  finding: FindingInput;
  candidates: FullCandidateInput[];
  optionalCandidates?: FullCandidateInput[];
  retestFindings?: FindingInput[];
  chain?: string;
  retestLabel?: string;
  sourceCaseIds?: string[];
};

export type DecisionContext = {
  region: FullRegionInput;
  findings: FindingInput[];
  assessmentResults: Record<string, AssessmentRecordInput | undefined>;
  intake: IntakeInput;
  trialRecords: TrialRecordInput[];
  tissuePathway: TissuePathwayInput;
  kneeDecision: KneeDecisionInput;
  localLimbDecision: LocalLimbDecisionInput;
  matchedPilotRelations: PilotRelationEntryInput[];
  pilotRelationsByAssessmentId: Map<string, PilotRelationEntryInput[]>;
  pilotTreatmentUnits: PilotTreatmentUnitInput[];
  matchedCandidateGroups: Array<{ candidates: FullCandidateInput[] }>;
  canAssessPassive: boolean;
  canMobilizeJoint: boolean;
  swellingGuidance: FullCandidateInput | undefined;
  assessments: AssessmentItemInput[];
  sharedTensionId: string;
  assessmentTitle: (id: string, title: string) => string;
  sharedTensionLocationsForMotion: (itemId: string, record: { tensionLocations?: string[] }, sharedRecord?: { tensionLocations?: string[] }) => string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 组件私有 IntakeState 无法在纯 core 里声明，只能以 any 承接
  chiefFunctionAssessmentId: (intake: any, regionId: string) => string;
};
