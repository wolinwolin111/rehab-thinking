export type TrainingAdjustment = "reduce" | "hold" | "progress";

export type TrainingHistoryItem = {
  id: string;
  adjustment: TrainingAdjustment;
};

const TRAINING_CHAINS = [
  [
    "knee-heel-slide-quad-set",
    "knee-sit-stand-squat",
    "knee-step",
    "knee-single-leg-strength",
    "knee-jump-decelerate",
  ],
  [
    "knee-bridge",
    "knee-single-leg-bridge",
    "knee-standing-hip-flexion",
    "knee-sit-stand-squat",
    "knee-step",
    "knee-single-leg-strength",
    "knee-jump-decelerate",
  ],
  [
    "ankle-dorsiflexion-control",
    "ankle-gait-weightshift",
    "ankle-single-leg-step",
    "ankle-split-squat-deceleration",
    "ankle-hop-change-direction",
  ],
  [
    "ankle-eversion-control",
    "ankle-band-heelraise",
    "ankle-single-leg-step",
    "ankle-split-squat-deceleration",
    "ankle-hop-change-direction",
  ],
  [
    "ankle-bridge",
    "ankle-single-leg-bridge",
    "ankle-standing-hip-flexion",
    "ankle-gait-weightshift",
    "ankle-single-leg-step",
    "ankle-hop-change-direction",
  ],
] as const;

function chainForExercise(id: string) {
  return TRAINING_CHAINS.find((chain) => chain.some((item) => item === id));
}

export function adjustedTrainingExerciseId(item: TrainingHistoryItem) {
  const chain = chainForExercise(item.id);
  if (!chain || item.adjustment === "hold") return item.id;
  const currentIndex = chain.findIndex((id) => id === item.id);
  const offset = item.adjustment === "progress" ? 1 : -1;
  return chain[Math.max(0, Math.min(chain.length - 1, currentIndex + offset))];
}

export function nextSessionTrainingIds(items: TrainingHistoryItem[], availableIds: Iterable<string>) {
  const available = new Set(availableIds);
  return items
    .map(adjustedTrainingExerciseId)
    .filter((id) => available.has(id))
    .filter((id, index, list) => list.indexOf(id) === index);
}

export const INITIAL_TRAINING_PRIORITY = {
  knee: ["knee-heel-slide-quad-set", "knee-bridge"],
  "ankle-foot": ["ankle-dorsiflexion-control", "ankle-eversion-control"],
} as const;
