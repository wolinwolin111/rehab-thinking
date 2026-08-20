/**
 * 训练执行状态核心。
 *
 * 训练方案可以先保存，但只有每个动作都留下即时反馈，才算本次实际完成。
 * 这里不判断动作是否有效，也不负责进阶，只负责“是否形成完整执行记录”。
 */

export type TrainingExerciseRef = { id: string; title?: string };

export function pendingTrainingFeedback<T extends TrainingExerciseRef>(
  exercises: T[],
  feedback: Record<string, unknown> = {},
) {
  return exercises.filter((exercise) => !feedback[exercise.id]);
}

export function trainingFeedbackComplete<T extends TrainingExerciseRef>(
  exercises: T[],
  feedback: Record<string, unknown> = {},
) {
  return pendingTrainingFeedback(exercises, feedback).length === 0;
}

export function trainingWasExecuted<T extends TrainingExerciseRef>(
  exercises: T[],
  feedback: Record<string, unknown> = {},
) {
  return exercises.length > 0 && trainingFeedbackComplete(exercises, feedback);
}
