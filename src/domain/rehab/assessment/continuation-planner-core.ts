import { rankPilotAssessmentIds, type PilotIntakeInput } from "@/src/domain/rehab/shared/pilot-decision-engine";

export type ContinuationPlannerInput = {
  pilotInput: PilotIntakeInput;
  /** 主诉是否有明确的加重动作。 */
  hasChiefAction: boolean;
  /** 主诉在处理与复查后仍未解决（分数未下降或主诉动作仍异常）。 */
  chiefStillSymptomatic: boolean;
  /** 处理队列与复查义务都已完成（workflow 投影）。 */
  treatmentComplete: boolean;
  /** 本次已有记录的评估项。 */
  completedAssessmentIds: string[];
  /** 当前区域可供检查的评估项池。 */
  candidatePool: Array<{ id: string; title: string }>;
  maxSuggestions?: number;
};

export type ContinuationPlan = {
  active: boolean;
  suggested: Array<{ id: string; title: string }>;
};

/**
 * 继续排查评估计划（owner 确认的决策链缺口）：
 * 处理与复查全部完成、主诉仍未解决时，从该区域尚未检查的评估项中
 * 按既有规则引擎排序生成下一组建议；没有可查项时不阻断进入训练。
 * 这里只产出建议投影，不产生事实，也不改变阶段门槛。
 */
export function planContinuationAssessments(input: ContinuationPlannerInput): ContinuationPlan {
  if (!input.hasChiefAction || !input.chiefStillSymptomatic) return { active: false, suggested: [] };
  if (!input.treatmentComplete) return { active: false, suggested: [] };
  const completed = new Set(input.completedAssessmentIds);
  const remaining = input.candidatePool.filter((item) => !completed.has(item.id));
  if (!remaining.length) return { active: false, suggested: [] };
  const ranked = rankPilotAssessmentIds(input.pilotInput, remaining.map((item) => item.id));
  const byId = new Map(remaining.map((item) => [item.id, item]));
  const suggested = ranked
    .map((id) => byId.get(id))
    .filter((item): item is { id: string; title: string } => Boolean(item))
    .slice(0, input.maxSuggestions ?? 3);
  return { active: suggested.length > 0, suggested };
}
