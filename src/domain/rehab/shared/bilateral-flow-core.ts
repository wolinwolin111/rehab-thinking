/**
 * 双侧流程的纯决策核心。
 *
 * 页面只负责收集答案和展示出口；优先侧、冲突提醒和训练门控集中在这里，
 * 避免把双侧规则继续散落到症状、评估、处理和训练组件中。
 */

export type BilateralSide = "左侧" | "右侧";
export type BilateralAssessmentSide = BilateralSide | "两侧接近" | "两侧异常";
export type BilateralComparison = "左侧更差" | "右侧更差" | "两侧异常" | "两侧接近" | "暂不判断";

export type BilateralPrioritySource = "主诉" | "评估" | "安全" | "待选择";

export type BilateralPriorityResolution = {
  prioritySide?: BilateralSide;
  source: BilateralPrioritySource;
  needsConfirmation: boolean;
  conflictSide?: BilateralSide;
};

/**
 * 主诉明确的优先侧始终保留。评估更差侧只能产生提醒，不能静默替换主诉。
 * 安全侧属于例外：安全风险覆盖处理顺序，并要求用户确认该调整。
 */
export function resolveBilateralPriority(input: {
  complaintPrioritySide?: BilateralSide;
  assessmentWorseSide?: BilateralSide;
  safetySide?: BilateralSide;
}): BilateralPriorityResolution {
  if (input.safetySide) {
    return {
      prioritySide: input.safetySide,
      source: "安全",
      needsConfirmation: input.complaintPrioritySide !== input.safetySide,
      conflictSide: input.complaintPrioritySide && input.complaintPrioritySide !== input.safetySide
        ? input.complaintPrioritySide
        : undefined,
    };
  }
  if (input.complaintPrioritySide) {
    return {
      prioritySide: input.complaintPrioritySide,
      source: "主诉",
      needsConfirmation: Boolean(input.assessmentWorseSide && input.assessmentWorseSide !== input.complaintPrioritySide),
      conflictSide: input.assessmentWorseSide && input.assessmentWorseSide !== input.complaintPrioritySide
        ? input.assessmentWorseSide
        : undefined,
    };
  }
  if (input.assessmentWorseSide) {
    return { prioritySide: input.assessmentWorseSide, source: "评估", needsConfirmation: false };
  }
  return { source: "待选择", needsConfirmation: true };
}

export type BilateralAssessmentGate = {
  complete: boolean;
  missing: string[];
  reason: "not-bilateral" | "priority-missing" | "assessment-pending" | "complete";
};

export function bilateralAssessmentGate(input: {
  bilateral: boolean;
  prioritySide?: BilateralSide;
  requiredAssessmentIds: string[];
  completedAssessmentIds: string[];
}): BilateralAssessmentGate {
  if (!input.bilateral) return { complete: true, missing: [], reason: "not-bilateral" };
  if (!input.prioritySide) return { complete: false, missing: [], reason: "priority-missing" };
  const completed = new Set(input.completedAssessmentIds);
  const missing = input.requiredAssessmentIds.filter((id) => !completed.has(id));
  return missing.length
    ? { complete: false, missing, reason: "assessment-pending" }
    : { complete: true, missing: [], reason: "complete" };
}

export type BilateralTrainingGate = "normal" | "low-load" | "blocked";

/**
 * 双侧针对性评估未完成时，不允许正常训练；安全信号或处理加重时连低负荷
 * 也不自动开放，由页面进入停止/复评出口。
 */
export function bilateralTrainingGate(input: {
  bilateral: boolean;
  assessmentComplete: boolean;
  safetySignal?: boolean;
  treatmentWorsened?: boolean;
}): BilateralTrainingGate {
  if (input.safetySignal || input.treatmentWorsened) return "blocked";
  if (input.bilateral && !input.assessmentComplete) return "low-load";
  return "normal";
}

export type BilateralCheckpointOption =
  | "return-other-side-assessment"
  | "continue-other-side-treatment"
  | "low-load-activity"
  | "normal-training"
  | "save-and-continue";

/**
 * 单侧处理完成后的出口只由状态决定。系统不自动跳到另一侧，页面必须让用户
 * 明确选择下一步。
 */
export function bilateralCheckpointOptions(input: {
  bilateral: boolean;
  assessmentComplete: boolean;
  otherSideHasPendingTreatment: boolean;
  safetySignal?: boolean;
  treatmentWorsened?: boolean;
}): BilateralCheckpointOption[] {
  if (!input.bilateral) return ["normal-training"];
  if (input.safetySignal || input.treatmentWorsened) return ["return-other-side-assessment", "save-and-continue"];
  const options: BilateralCheckpointOption[] = [];
  if (!input.assessmentComplete) options.push("return-other-side-assessment", "low-load-activity");
  if (input.otherSideHasPendingTreatment) options.push("continue-other-side-treatment");
  if (input.assessmentComplete) options.push("normal-training");
  options.push("save-and-continue");
  return Array.from(new Set(options));
}

export function orderBilateralSides<T>(
  items: T[],
  prioritySide: BilateralSide | undefined,
  getSide: (item: T) => BilateralAssessmentSide | undefined = (item) => (item as { side?: BilateralAssessmentSide }).side,
) {
  if (!prioritySide) return items;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const rank = (entry: T) => getSide(entry) === prioritySide ? 0 : ["两侧接近", "两侧异常"].includes(getSide(entry) ?? "") ? 2 : 1;
      return rank(a.item) - rank(b.item) || a.index - b.index;
    })
    .map(({ item }) => item);
}

export type BilateralFindingSideHint = { priority?: string; side?: string };

/**
 * M-07：从评估发现推断「整体更差侧」。不用数量强行制造伪共识——只有当
 * support / track 级异常明确只出现在一侧时才产出；track 级（主诉动作）的
 * 单侧信号同样计入，避免被忽略。结果只用于提醒与排序展示。
 */
export function inferBilateralAssessmentWorseSide(items: BilateralFindingSideHint[]): BilateralSide | undefined {
  const counts: Record<BilateralSide, number> = { "左侧": 0, "右侧": 0 };
  items.forEach((item) => {
    if ((item.priority === "support" || item.priority === "track") && (item.side === "左侧" || item.side === "右侧")) counts[item.side] += 1;
  });
  if (counts["左侧"] > 0 && counts["右侧"] === 0) return "左侧";
  if (counts["右侧"] > 0 && counts["左侧"] === 0) return "右侧";
  return undefined;
}
