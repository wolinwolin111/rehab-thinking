import { type TreatmentResponseRole } from "./treatment-response-core";

export type YesNo = "yes" | "no";

export type TrialResult = "better" | "partial" | "same" | "worse";

export type RangeRetestAnswer = "" | "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";

export type CompletedRangeRetestAnswer = Exclude<RangeRetestAnswer, "">;

export type TrialRecord = {
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

/** buildTrialRecords 的候选输入：主组件预先算好每个候选的展示字段。 */
export type TrialRecordCandidateInput = {
  id: string;
  candidateTitle: string;
  treatmentName: string;
  treatmentKey: string;
  action: string;
};

/** buildTrialRecords 的完整输入。 */
export type TrialRecordBuildInput = {
  candidates: TrialRecordCandidateInput[];
  carryoverOnly: boolean;
  beforeScore: number;
  recordedAfterScore: number;
  result: TrialResult;
  timeBased: boolean;
  deferredRetest: boolean;
  hasSingleRangeEvidence: boolean;
  singleRangeDirectionId?: string;
  singleRangeDiscomfort?: YesNo;
  singleRangeScore?: number;
  movementResponse: RangeRetestAnswer;
  chiefWasActuallyRetested: boolean;
  responseRole: TreatmentResponseRole;
  priorTreatmentTitle?: string;
  retestActionKey?: string;
  treatmentSide: string;
  targetId: string;
  targetTitle: string;
  residualReviewId: string;
};