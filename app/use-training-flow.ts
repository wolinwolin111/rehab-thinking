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
  const [trainingReadyForFinalRetest, setTrainingReadyForFinalRetest] = useState(false);
  const [finalRetestScore, setFinalRetestScore] = useState(0);
  const [finalRetestConfirmed, setFinalRetestConfirmed] = useState(false);
  return {
    exerciseFeedback, setExerciseFeedback,
    openExercise, setOpenExercise,
    trainingComplete, setTrainingComplete,
    trainingReadyForFinalRetest, setTrainingReadyForFinalRetest,
    finalRetestScore, setFinalRetestScore,
    finalRetestConfirmed, setFinalRetestConfirmed,
  };
}