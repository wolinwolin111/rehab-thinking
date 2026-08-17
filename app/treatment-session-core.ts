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
}) {
  // 训练结束后的整体主诉复测：只要有可比的主诉分且本场同条件复测，
  // 就触发一次，不再要求「答了训练反馈」——普通用户可能只做动作没点反馈。
  return input.comparableChief && input.immediateTiming;
}
