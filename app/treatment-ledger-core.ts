export type TreatmentLedgerRecord = {
  targetId: string;
  result: string;
  afterScore: number;
  reviewOnly?: boolean;
  retestOnly?: boolean;
  chiefRetested?: boolean;
  rangeOutcomes?: Record<string, string>;
};

/**
 * 从本次处理记录计算已经达到终点的问题。
 *
 * 这里只消费“最新的实际处理记录”：复测沿用和残余复查不能覆盖问题台账；
 * 同一 target 后来的记录会替换早先记录，因此后续加重可以重新打开问题。
 */
export function completedProblemIdsFromTreatmentRecords(
  records: TreatmentLedgerRecord[],
  latestRangeOutcomes: Record<string, string> = {},
) {
  const latestProblemRecords = new Map<string, TreatmentLedgerRecord>();
  for (const record of records) {
    if (record.reviewOnly || record.retestOnly) continue;
    latestProblemRecords.set(record.targetId, record);
  }

  const completedProblemIds = new Set<string>();
  for (const [directionId, outcome] of Object.entries(latestRangeOutcomes)) {
    if (outcome === "both-match") completedProblemIds.add(`motion:${directionId}`);
  }

  for (const [targetId, record] of latestProblemRecords) {
    const problemKey = targetId.replace(/^target:/, "");
    const rangeEntries = Object.entries(record.rangeOutcomes ?? {});
    if (problemKey === "chief" && record.chiefRetested && record.afterScore === 0) {
      completedProblemIds.add("chief");
    }
    if (problemKey.startsWith("motion:") && rangeEntries.length > 0 && rangeEntries.every(([, outcome]) => outcome === "both-match")) {
      completedProblemIds.add(problemKey);
    }
    // 主诉即使改善也不能在仍有分数时从问题台账消失；它的完成条件
    // 已在上面的 chiefRetested + afterScore === 0 分支中明确处理。
    if (!rangeEntries.length && (targetId === "target:swelling" || record.result === "better" && targetId !== "target:chief")) {
      completedProblemIds.add(problemKey);
    }
  }

  return completedProblemIds;
}
