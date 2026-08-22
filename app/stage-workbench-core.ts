/**
 * 康复思路模式阶段工作台的阶段状态推导核心。
 *
 * 工作台顶部六个阶段（症状与安全、评估、问题台账、处理与复测、训练、总结）
 * 各自显示一个状态字符串；本核心只负责从已确认的计数与完成标志推导这些状态，
 * 展示文案仍由页面层拼接。抽出后状态推导可单测，不再与页面编排耦合。
 */

export type WorkbenchStageInput = {
  /** 安全确认是否允许继续评估。 */
  canContinueSafety: boolean;
  /** 评估流程是否已完成。 */
  assessmentFlowComplete: boolean;
  /** 已完成的评估项目数。 */
  completedAssessmentCount: number;
  /** 评估项目总数。 */
  totalAssessmentCount: number;
  /** 尚未解决的问题台账数。 */
  unresolvedProblemCount: number;
  /** 处理与复测记录条数。 */
  trialRecordCount: number;
  /** 训练是否已完成。 */
  trainingComplete: boolean;
  /** 训练方案已保存但本次未执行。 */
  trainingPlanSaved?: boolean;
  /** 已安排训练动作数。 */
  exerciseCount: number;
  /** 当前是否处于总结阶段。 */
  isSummaryStep: boolean;
};

/**
 * 按工作台固定顺序返回六个阶段的状态字符串：
 * 症状与安全、评估、问题台账、处理与复测、训练、总结。
 */
export function workbenchStageStates(input: WorkbenchStageInput): string[] {
  return [
    input.canContinueSafety ? "已完成" : "待完成",
    input.assessmentFlowComplete ? "已完成" : `${input.completedAssessmentCount}/${input.totalAssessmentCount}`,
    input.unresolvedProblemCount > 0 ? `${input.unresolvedProblemCount}项` : "待评估",
    input.trialRecordCount > 0 ? `${input.trialRecordCount}条记录` : "待开始",
    input.trainingComplete ? "已完成" : input.trainingPlanSaved ? "已保存，未执行" : input.exerciseCount > 0 ? `${input.exerciseCount}项` : "待安排",
    input.isSummaryStep ? "已完成" : "待完成",
  ];
}
