/**
 * 处理复用后的复测资格判断。
 *
 * 复用的是处理，不是任意一个最近结果。只有当前复测动作本身已经记录过，
 * 或当前关联的活动方向已经在最近处理后记录过，才能直接消费历史结果。
 */

export type RetestReuseInput = {
  carryoverOnly: boolean;
  hasLatestTrialRecord: boolean;
  latestMatchingRangeRecordIndex: number;
  latestTreatmentRecordIndex: number;
  latestRetestActionKey?: string;
  plannedRetestActionKey: string;
  reusableDirectionCount: number;
};

export function canReuseLatestRetest(input: RetestReuseInput) {
  if (!input.carryoverOnly || !input.hasLatestTrialRecord && input.latestMatchingRangeRecordIndex < 0) return false;
  return input.latestRetestActionKey === input.plannedRetestActionKey
    || input.reusableDirectionCount > 0 && input.latestMatchingRangeRecordIndex >= input.latestTreatmentRecordIndex;
}
