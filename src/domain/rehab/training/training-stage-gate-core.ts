import { bilateralTrainingGate, type BilateralTrainingGate } from "./bilateral-flow-core";

export type TrainingStageGateInput = {
  bilateral: boolean;
  assessmentComplete: boolean;
  safetySignal?: boolean;
  treatmentWorsened?: boolean;
  trainingComplete: boolean;
  trainingPlanSaved: boolean;
};

export type TrainingStageGate = {
  bilateralGate: BilateralTrainingGate;
  lowLoadOnly: boolean;
  blocked: boolean;
  closed: boolean;
};

/**
 * 组合训练阶段的进入和关闭条件。
 * 双侧安全门禁仍由 bilateral-flow-core 负责；这里不推导训练是否有效，
 * 只负责把页面需要的阶段状态集中成一个不可互相矛盾的结果。
 */
export function resolveTrainingStageGate(input: TrainingStageGateInput): TrainingStageGate {
  const bilateralGate = bilateralTrainingGate({
    bilateral: input.bilateral,
    assessmentComplete: input.assessmentComplete,
    safetySignal: input.safetySignal,
    treatmentWorsened: input.treatmentWorsened,
  });
  return {
    bilateralGate,
    lowLoadOnly: bilateralGate === "low-load",
    blocked: bilateralGate === "blocked",
    closed: input.trainingComplete || input.trainingPlanSaved,
  };
}
