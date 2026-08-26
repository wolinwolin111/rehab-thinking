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

/**
 * T-10：快速反馈规划器。
 *
 * 把「已记录加重的动作改选为其它反馈」标记为需要用户确认；确认后生成新反馈，
 * 并把历史 symptom 值追加进 symptomHistory——加重事实一旦记录，改口不可抹除，
 * 只能以“历史 + 当前值”的形式共存。window.confirm 由页面层负责，本函数保持纯函数。
 */
export type QuickFeedbackSymptom = "better" | "same" | "worse";
export type QuickFeedbackMode = "reduce" | "hold" | "progress" | "worse";

export type PlannedQuickFeedback = {
  completed: number;
  formChanged: boolean;
  symptom: QuickFeedbackSymptom;
  reserve: number;
  symptomHistory: QuickFeedbackSymptom[];
};

export type QuickFeedbackPlan = {
  requiresConfirmation: boolean;
  feedback?: PlannedQuickFeedback;
};

export function planQuickFeedbackRecord(
  previous: { symptom: QuickFeedbackSymptom; symptomHistory?: QuickFeedbackSymptom[] } | undefined,
  mode: QuickFeedbackMode,
  targetReps: number,
  options: { confirmed?: boolean } = {},
): QuickFeedbackPlan {
  const nextSymptom: QuickFeedbackSymptom = mode === "worse" ? "worse" : "same";
  const changingAwayFromWorse = previous?.symptom === "worse" && nextSymptom !== "worse";
  if (changingAwayFromWorse && options.confirmed !== true) {
    return { requiresConfirmation: true };
  }
  const symptomHistory: QuickFeedbackSymptom[] = previous
    ? (previous.symptom !== nextSymptom
      ? (previous.symptomHistory ? [...previous.symptomHistory, previous.symptom] : [previous.symptom])
      : previous.symptomHistory ?? [])
    : [];
  const feedback: PlannedQuickFeedback = mode === "worse"
    ? { completed: targetReps, formChanged: false, symptom: "worse", reserve: 3, symptomHistory }
    : mode === "reduce"
      ? { completed: Math.max(1, targetReps - 3), formChanged: true, symptom: "same", reserve: 0, symptomHistory }
      : mode === "progress"
        ? { completed: targetReps, formChanged: false, symptom: "same", reserve: 5, symptomHistory }
        : { completed: targetReps, formChanged: false, symptom: "same", reserve: 3, symptomHistory };
  return { requiresConfirmation: false, feedback };
}
