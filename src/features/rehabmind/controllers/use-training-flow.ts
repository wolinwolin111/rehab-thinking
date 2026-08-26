import { useState } from "react";
import { type QuickFeedbackSymptom } from "@/src/domain/rehab/training/training-feedback-core";

export type ExerciseFeedback = {
  completed: number;
  formChanged: boolean;
  symptom: QuickFeedbackSymptom;
  reserve: number;
  /** T-10：既往 symptom 轨迹。一旦记录过 worse，改口后仍保留在历史里。 */
  symptomHistory?: QuickFeedbackSymptom[];
  /** T-11：加重后用户确认采用退阶版本继续——原始 worse 保留，仅叠加处置标记。 */
  followUpAction?: "regress-training";
};

export function useTrainingFlow() {
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, ExerciseFeedback>>({});
  const [openExercise, setOpenExercise] = useState<string>("");
  const [trainingComplete, setTrainingComplete] = useState(false);
  /** 方案已保存但本次没有实际执行训练，不产生训练改善或进阶结论。 */
  const [trainingPlanSaved, setTrainingPlanSaved] = useState(false);
  const [trainingReadyForFinalRetest, setTrainingReadyForFinalRetest] = useState(false);
  const [finalRetestScore, setFinalRetestScore] = useState(0);
  const [finalRetestConfirmed, setFinalRetestConfirmed] = useState(false);
  return {
    exerciseFeedback, setExerciseFeedback,
    openExercise, setOpenExercise,
    trainingComplete, setTrainingComplete,
    trainingPlanSaved, setTrainingPlanSaved,
    trainingReadyForFinalRetest, setTrainingReadyForFinalRetest,
    finalRetestScore, setFinalRetestScore,
    finalRetestConfirmed, setFinalRetestConfirmed,
  };
}
