/**
 * SAVE-02：恢复草稿时的评估阶段落点推导。
 *
 * 刷新前用户可能已完成全部评估——仅凭快照里的 step/index 恢复会把人
 * 拉回第一项重新作答。这里根据各评估项是否已有记录，推导出应当落在哪里：
 * 全部完成 → 直接进入下一阶段；部分完成 → 定位到第一个未答项。
 */

export type RestoredAssessmentProgress = {
  complete: boolean;
  firstIncompleteIndex: number;
  answeredCount: number;
  total: number;
};

export function resolveRestoredAssessmentProgress(answered: readonly boolean[]): RestoredAssessmentProgress {
  const answeredCount = answered.filter(Boolean).length;
  const firstIncomplete = answered.findIndex((item) => !item);
  return {
    complete: answered.length > 0 && firstIncomplete === -1,
    firstIncompleteIndex: firstIncomplete === -1 ? answered.length : firstIncomplete,
    answeredCount,
    total: answered.length,
  };
}

/** 恢复确认卡文案：报数字、报位置、给下一步。无内容时不展示。 */
export function restoredAssessmentNotice(progress: RestoredAssessmentProgress): string | null {
  if (!progress.total) return null;
  if (progress.complete) {
    return `已恢复上次的进度：${progress.total} 项评估都已完成，从「处理复测」继续`;
  }
  return `已恢复：评估进行到第 ${progress.firstIncompleteIndex + 1}/${progress.total} 题，接着答就行`;
}
