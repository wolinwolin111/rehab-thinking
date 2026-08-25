/**
 * 主诉分数变化的一句话解释。
 *
 * 总结与本阶段成果都会展示“起点→终点，下降 X 分”。当变化为 0 或为负时，
 * 只给数字会让用户误以为“白做了”或“更严重了”；这里按上下文补一句原因与下一步，
 * 语气遵循产品规范：先说当前发现，再说下一步；不诊断，不虚假承诺。
 */

export type ChiefChangeContext = {
  /** 是否存在可比较的前后分数 */
  comparable: boolean;
  /** 首次评估基线分 */
  baseline: number;
  /** 最近一次主诉分 */
  latest: number;
  /** 本轮处理/复测中活动范围有改善 */
  hasRangeImprovement: boolean;
  /** 处理候选已完成但主诉无即时反应 */
  noImmediateResponse: boolean;
};

export function chiefChangeExplanation(ctx: ChiefChangeContext): string | null {
  if (!ctx.comparable) return null;
  const delta = ctx.baseline - ctx.latest;

  if (delta > 0) {
    return delta >= 3
      ? "疼痛明显下降。保留有效的处理方向，按今天的训练继续巩固。"
      : "疼痛有下降但幅度还不大：这类变化常需要1～2天才稳定，先按训练观察，下次康复会优先复查这个动作。";
  }

  if (delta === 0) {
    if (ctx.hasRangeImprovement) {
      return "疼痛暂时没有变化，但活动范围在改善：先看功能趋势，疼痛常滞后1～2天，下次优先复查这个动作。";
    }
    if (ctx.noImmediateResponse) {
      return "本轮处理的即时止痛效果不明显：这不代表方向错误，先按训练观察1～2天；下次康复会优先复查这个动作，再决定是否换方向。";
    }
    return "这次处理后疼痛暂时没有变化：先按今天的训练观察，下次康复会优先复查这个动作。";
  }

  // delta < 0：加重通常走停止/复查出口，到不了总结；这里兜底给出安全提示。
  return "处理后疼痛比开始时更高：不要叠加练习，先休息观察；如果持续加重或出现新位置疼痛，请线下专业评估。";
}
