import { type TreatmentResponseRole } from "@/src/domain/rehab/treatment/treatment-response-core";

export type YesNo = "yes" | "no";

export type TrialResult = "better" | "partial" | "same" | "worse";

export type RangeRetestAnswer = "" | "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";

export type CompletedRangeRetestAnswer = Exclude<RangeRetestAnswer, "">;

export type FunctionRetestCompletion = "complete" | "unable";
export type FunctionRetestMode = "ordinary" | "completion-status";
export type FunctionUnableReason = "pain" | "weak" | "fear" | "instruction";

/** 一次处理后仍需逐项复查的真实功能动作；处理可以合并，复测义务不能丢失。 */
export type FunctionRetestObligation = {
  assessmentId: string;
  label: string;
  baselineCompletion: FunctionRetestCompletion;
  mode: FunctionRetestMode;
  baselineScore?: number;
  /** 双侧问题必须分别回答；缺省表示单侧或整体动作。 */
  sides?: Array<"左侧" | "右侧">;
  /** 台账投影提供的展示时机提示；不参与义务身份与完成判断。 */
  candidateIds?: string[];
};

export type FunctionRetestRecord = FunctionRetestObligation & {
  afterCompletion: FunctionRetestCompletion;
  unableReason?: FunctionUnableReason;
  afterScore?: number;
  sideResults?: Partial<Record<"左侧" | "右侧", {
    afterCompletion: FunctionRetestCompletion;
    unableReason?: FunctionUnableReason;
    afterScore?: number;
  }>>;
};

export type TrialRecord = {
  caseId?: string;
  problemThreadId?: string;
  /** 一次真实处理/复查的稳定身份；创建后不随队列排序改变。 */
  treatmentRecordId?: string;
  sessionId?: string;
  assessmentRevision?: number;
  recordedAt?: string;
  /** 评估改版后保留旧事实，但不再参与当前方案或结果计算。 */
  supersededAt?: string;
  supersededByAssessmentRevision?: number;
  invalidationReason?: "assessment-updated" | "adverse-reassessment";
  candidateId: string;
  treatmentKey?: string;
  treatmentSide?: string;
  /** 双侧同一处理单元的实际执行侧别；结果仍按侧别另存。 */
  treatmentSides?: string[];
  sideResults?: Record<string, "better" | "same" | "worse">;
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
  /** 活动表现单独变差；可与主诉分数下降同时存在，不能被压成单一趋势。 */
  activityWorsened?: boolean;
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
  /** 功能动作首次状态与处理后状态；能力复核不能伪装成分数前后比较。 */
  functionBaselineCompletion?: FunctionRetestCompletion;
  functionAfterCompletion?: FunctionRetestCompletion;
  functionRetestMode?: FunctionRetestMode;
  /** 多动作场景按 assessmentId 分别保存；旧的单项字段继续兼容读取。 */
  functionRetests?: Record<string, FunctionRetestRecord>;
  /** 区分部分贡献、关键完成和组合解决，不能只按下降分数排名。 */
  responseRole?: TreatmentResponseRole;
  /** 处理发生时的知识来源快照；旧记录缺失时保持 undefined。 */
  sourceCaseIds?: string[];
  /** 处理对应的只读决策追踪；不参与当前排序。 */
  decisionTraceId?: string;
  /** 可回指同一上下文的前后评分；找不到严格可比记录时保持为空。 */
  beforeScoreRecordId?: string;
  afterScoreRecordId?: string;
};

/** buildTrialRecords 的候选输入：主组件预先算好每个候选的展示字段。 */
export type TrialRecordCandidateInput = {
  id: string;
  candidateTitle: string;
  treatmentName: string;
  treatmentKey: string;
  action: string;
  sourceCaseIds?: string[];
};

/** buildTrialRecords 的完整输入。 */
export type TrialRecordBuildInput = {
  candidates: TrialRecordCandidateInput[];
  carryoverOnly: boolean;
  beforeScore: number;
  recordedAfterScore: number;
  result: TrialResult;
  activityWorsened?: boolean;
  timeBased: boolean;
  deferredRetest: boolean;
  hasSingleRangeEvidence: boolean;
  singleRangeDirectionId?: string;
  singleRangeDiscomfort?: YesNo;
  singleRangeScore?: number;
  movementResponse: RangeRetestAnswer;
  chiefWasActuallyRetested: boolean;
  functionBaselineCompletion?: FunctionRetestCompletion;
  functionAfterCompletion?: FunctionRetestCompletion;
  functionRetestMode?: FunctionRetestMode;
  functionRetests?: Record<string, FunctionRetestRecord>;
  responseRole: TreatmentResponseRole;
  priorTreatmentTitle?: string;
  retestActionKey?: string;
  treatmentSide: string;
  treatmentSides?: string[];
  sideResults?: Record<string, "better" | "same" | "worse">;
  targetId: string;
  targetTitle: string;
  residualReviewId: string;
};
