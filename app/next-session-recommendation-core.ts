export type NextSessionRecommendation = {
  mode: "scheduled" | "medical-clearance";
  earliestDays?: number;
  latestDays?: number;
  label: string;
  interimChecks: string[];
  startCondition: string;
  earlyReviewTriggers: string[];
};

export type NextSessionRecommendationInput = {
  acute: boolean;
  hasSwelling: boolean;
  hasImmediateTreatment: boolean;
  hasUnresolvedMobility: boolean;
  hasTraining: boolean;
  trainingStage: number;
  waitingForMedicalClearance: boolean;
  worsened: boolean;
};

/**
 * This is a scheduling prompt, not a diagnosis. It separates short reaction
 * checks from a formal rehabilitation session so an observation does not
 * accidentally increase the session count.
 */
export function recommendNextSession(input: NextSessionRecommendationInput): NextSessionRecommendation {
  const commonTriggers = ["症状明显加重", "出现新的麻、电感或无力", "承重或走路能力明显下降"];
  if (input.waitingForMedicalClearance || input.worsened) return {
    mode: "medical-clearance",
    label: input.worsened ? "先重新评估，再决定下一次康复" : "获得医生允许后再开始",
    interimChecks: ["记录当天晚些时候和第二天的变化"],
    startCondition: input.worsened ? "重新确认加重原因和可安全进行的范围" : "已经明确允许的负重、活动和训练范围",
    earlyReviewTriggers: commonTriggers,
  };

  if (input.acute || input.hasSwelling) return {
    mode: "scheduled",
    earliestDays: 2,
    latestDays: 3,
    label: "建议2～3天后复查",
    interimChecks: ["当天晚些时候记录一次反应", "第二天比较肿胀、承重和活动情况"],
    startCondition: "急性反应没有持续加重，可以完成轻柔活动",
    earlyReviewTriggers: commonTriggers,
  };

  if (input.hasImmediateTreatment || input.hasUnresolvedMobility) return {
    mode: "scheduled",
    earliestDays: 3,
    latestDays: 7,
    label: "建议3～7天后复查",
    interimChecks: ["按本次安排完成居家练习", "记录训练后和第二天的反应"],
    startCondition: "能再次比较主诉动作和仍受限的活动",
    earlyReviewTriggers: commonTriggers,
  };

  if (input.hasTraining && input.trainingStage >= 4) return {
    mode: "scheduled",
    earliestDays: 7,
    latestDays: 14,
    label: "建议7～14天后复查",
    interimChecks: ["完成当前训练并记录动作质量", "确认第二天没有持续加重"],
    startCondition: "当前训练稳定完成，再决定是否进阶",
    earlyReviewTriggers: commonTriggers,
  };

  return {
    mode: "scheduled",
    earliestDays: 7,
    latestDays: 7,
    label: "建议约7天后复查",
    interimChecks: ["完成当前基础训练", "记录第二天的疼痛和活动反应"],
    startCondition: "当前组数和个数能够稳定完成",
    earlyReviewTriggers: commonTriggers,
  };
}

export function formatRecommendedDateRange(base: Date, recommendation: NextSessionRecommendation, locale = "zh-CN") {
  if (recommendation.mode !== "scheduled" || recommendation.earliestDays === undefined) return recommendation.label;
  const format = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" });
  const earliest = new Date(base);
  earliest.setDate(earliest.getDate() + recommendation.earliestDays);
  const latest = new Date(base);
  latest.setDate(latest.getDate() + (recommendation.latestDays ?? recommendation.earliestDays));
  if (earliest.toDateString() === latest.toDateString()) return `${format.format(earliest)}左右`;
  return `${format.format(earliest)}～${format.format(latest)}`;
}
