/**
 * 0～10 分滑块的普通用户辅助文案。
 * 这里只解释当前分数所属的感受档位，不参与任何评估、处理或复测决策。
 */
export function scoreGuideLabel(score: number): string {
  const normalized = Math.min(10, Math.max(0, Math.round(score)));
  if (normalized === 0) return "没有疼痛或不适";
  if (normalized <= 2) return "刚有一点感觉";
  if (normalized <= 4) return "轻微痛感";
  if (normalized <= 6) return "明显难受";
  if (normalized <= 8) return "很痛";
  if (normalized === 9) return "接近最严重";
  return "能想象到的最严重";
}
