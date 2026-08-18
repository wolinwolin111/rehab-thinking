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
  return { exerciseFeedback, setExerciseFeedback, openExercise, setOpenExercise };
}