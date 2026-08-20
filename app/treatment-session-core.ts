export type SessionTreatmentRecord = {
  result: "better" | "partial" | "same" | "worse";
  chiefRetested?: boolean;
  reviewOnly?: boolean;
  retestOnly?: boolean;
  timeBased?: boolean;
  activityWorsened?: boolean;
};

function isActualTreatment(record: SessionTreatmentRecord) {
  return !record.reviewOnly && !record.retestOnly && !record.timeBased;
}

export function treatmentMustStop(records: SessionTreatmentRecord[]) {
  return records.some((record) => isActualTreatment(record) && (record.result === "worse" || record.activityWorsened));
}

export function needsTreatmentFinalChiefRetest(records: SessionTreatmentRecord[], comparableChief: boolean) {
  if (!comparableChief) return false;
  const lastChiefRetest = records.findLastIndex((record) => record.chiefRetested && !record.reviewOnly);
  if (lastChiefRetest < 0) return records.some(isActualTreatment);
  return records.some((record, index) => index > lastChiefRetest && isActualTreatment(record));
}

export function needsTrainingToleranceRetest(input: {
  comparableChief: boolean;
  completionStatusChief?: boolean;
  immediateTiming: boolean;
}) {
  // 普通主诉做同条件复测；首次只尝试过但没完成的功能动作，做能力状态复核。
  // 两者都不要求伪造一个不存在的疼痛分数。
  return Boolean((input.comparableChief || input.completionStatusChief) && input.immediateTiming);
}
