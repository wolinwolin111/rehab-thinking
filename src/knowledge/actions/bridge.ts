import { ASSESSMENT_BY_ID } from "./assessment.ts";
import { TREATMENT_BY_ID } from "./treatment.ts";
import { TRAINING_BY_ID } from "./training.ts";
import { fillTemplate, renderHow } from "./resolve.ts";

export function assessmentPro(id: string) {
  const entry = ASSESSMENT_BY_ID.get(id);
  if (!entry) throw new Error(`unknown assessment id: ${id}`);
  return {
    title: entry.title.pro,
    how: fillTemplate(renderHow(entry.actions, entry.how.pro, "pro"), entry.dose.pro),
    observe: entry.observe.pro,
  };
}

export function assessmentFriendly(id: string) {
  const entry = ASSESSMENT_BY_ID.get(id);
  if (!entry) throw new Error(`unknown assessment id: ${id}`);
  return {
    title: entry.title.plain,
    how: fillTemplate(renderHow(entry.actions, entry.how.plain, "plain"), entry.dose.plain),
    observe: entry.observe.plain,
  };
}

export function treatmentDo(id: string) {
  const entry = TREATMENT_BY_ID.get(id);
  if (!entry) throw new Error(`unknown treatment id: ${id}`);
  return fillTemplate(renderHow(entry.actions, entry.doText, "plain"), entry.dose);
}

export function trainingCopy(id: string) {
  const entry = TRAINING_BY_ID.get(id);
  if (!entry) throw new Error(`unknown training id: ${id}`);
  return {
    how: fillTemplate(renderHow(entry.actions, entry.how, "plain"), entry.dose),
    purpose: entry.purpose,
    observe: entry.observe,
    easier: entry.easier,
    harder: entry.harder,
    sets: entry.dose.sets,
    reps: entry.dose.reps,
    startPosition: entry.startPosition,
  };
}

export function goldenOutputs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ASSESSMENT_BY_ID.keys()) {
    out[`assessment.how:${id}`] = assessmentFriendly(id).how;
    out[`assessment.pro:${id}`] = assessmentPro(id).how;
  }
  for (const id of TREATMENT_BY_ID.keys()) out[`treatment.do:${id}`] = treatmentDo(id);
  for (const id of TRAINING_BY_ID.keys()) out[`training.how:${id}`] = trainingCopy(id).how;
  return out;
}
