import { useState } from "react";

export type ExerciseFeedback = {
  completed: number;
  formChanged: boolean;
  symptom: "better" | "same" | "worse";
  reserve: number;
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
