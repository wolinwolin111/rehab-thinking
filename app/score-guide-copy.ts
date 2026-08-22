/**
 * 0～10 分滑块的普通用户辅助文案。
 * 这里只解释当前分数所属的感受档位，不参与任何评估、处理或复测决策。
 */
export function scoreGuideLabel(score: number): string {
  const normalized = Math.min(10, Math.max(0, Math.round(score)));
  const labels = [
    "没有疼痛或不适",
    "几乎没有感觉",
    "很轻微",
    "轻微不适",
    "有些明显",
    "中等程度",
    "比较明显",
    "明显难受",
    "很痛",
    "接近最严重",
    "能想象到的最严重",
  ];
  return labels[normalized];
}
