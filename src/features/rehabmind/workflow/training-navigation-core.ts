export function nextTrainingExerciseId(
  exerciseIds: readonly string[],
  currentExerciseId: string,
  input: { hadFeedback: boolean; worsened: boolean },
) {
  if (input.hadFeedback || input.worsened) return null;
  const currentIndex = exerciseIds.indexOf(currentExerciseId);
  if (currentIndex < 0) return null;
  return exerciseIds[currentIndex + 1] ?? null;
}
