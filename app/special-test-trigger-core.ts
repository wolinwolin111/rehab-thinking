/**
 * 专项检查触发核心。
 *
 * 专项检查（special test）必须由用户明确描述的部位/症状触发，不能只因为系统
 * 把「走路」派生成「脚尖蹬地」就给普通外踝崴伤加入足底检查。这里集中了触发词
 * 与主诉来源的匹配规则，只依赖 intake 的结构化字段，可独立单测。
 */

export type SpecialTestIntakeInput = {
  description: string;
  location: string;
  sensoryLocation: string;
  symptomType: string;
  mechanism: string;
  provocationTypes: string[];
  forceDirection: string;
};

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

/** 触发词是否命中已确认的主诉来源（位置、感觉、机制、诱发方式）。 */
export function specialIsRelevant(trigger: string | undefined, intake: SpecialTestIntakeInput) {
  if (!trigger) return false;
  const explicitSymptomSource = `${intake.description} ${intake.location} ${intake.sensoryLocation}`;
  // 足底/足跟触发词只有在用户明确提到足底相关位置时才成立，不能被系统派生词带出。
  if (includesAny(trigger, ["足底", "足跟"]) && !includesAny(explicitSymptomSource, ["足底", "脚底", "足跟", "脚跟", "足弓", "晨起第一步"])) return false;
  const source = `${intake.description} ${intake.location} ${intake.symptomType} ${intake.mechanism} ${intake.provocationTypes.join(" ")} ${intake.forceDirection} ${intake.sensoryLocation}`;
  if (["麻", "电", "放射"].some((word) => trigger.includes(word) && source.includes(word))) return true;
  if (["急性", "外伤", "扭", "跌", "撞", "崴", "拉伤"].some((word) => trigger.includes(word)) && !["没有明确受伤", "逐渐出现"].includes(intake.mechanism)) return true;
  if (["不稳", "打软", "无力"].some((word) => trigger.includes(word) && source.includes(word))) return true;
  if (source.includes(trigger.trim())) return true;
  return trigger.split(/[、，；。或与时后伴]/).some((part) => part.trim().length >= 2 && source.includes(part.trim()));
}
