export type SessionTreatmentRecord = {
  result: "better" | "partial" | "same" | "worse";
  chiefRetested?: boolean;
  reviewOnly?: boolean;
  retestOnly?: boolean;
  timeBased?: boolean;
};

function isActualTreatment(record: SessionTreatmentRecord) {
  return !record.reviewOnly && !record.retestOnly && !record.timeBased;
}

export function treatmentMustStop(records: SessionTreatmentRecord[]) {
  return records.some((record) => isActualTreatment(record) && record.result === "worse");
}

export function needsTreatmentFinalChiefRetest(records: SessionTreatmentRecord[], comparableChief: boolean) {
  if (!comparableChief) return false;
  const lastChiefRetest = records.findLastIndex((record) => record.chiefRetested && !record.reviewOnly);
  if (lastChiefRetest < 0) return records.some(isActualTreatment);
  return records.some((record, index) => index > lastChiefRetest && isActualTreatment(record));
}

export function needsTrainingToleranceRetest(input: {
  comparableChief: boolean;
  immediateTiming: boolean;
  answeredExerciseCount: number;
}) {
  return input.comparableChief && input.immediateTiming && input.answeredExerciseCount > 0;
}
