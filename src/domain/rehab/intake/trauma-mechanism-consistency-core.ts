/**
 * 外伤描述与起病方式的一致性提示核心（M-03，方案A：温和确认提示）。
 *
 * 规则来源：整改登记 M-03——描述中出现外伤词（自动识别机制），但用户在起病方式
 * 手选了「没有明确受伤」时，isAcuteTrauma 失效会连锁跳过 Ottawa 骨性三问并解除
 * 急性负荷限制。本函数只产出非阻断提示文案，让用户在入口处发现矛盾；
 * 不改写任何数据，确认后按所选机制执行（提示只告知后果）。
 *
 * 反向矛盾（描述无外伤词但手选了受伤机制）只会让系统更保守，不提示、不打扰。
 */

/** 与工作台既有外伤词表保持一致（原 includesAny 关键词，单一事实来源收敛到此处）。 */
const TRAUMA_WORDS = ["崴", "扭伤", "拉伤", "摔", "跌", "撞", "落地", "外伤"];

const NO_TRAUMA_MECHANISM = "没有明确受伤";

export function descriptionSuggestsTraumaText(description: string): boolean {
  const text = typeof description === "string" ? description : "";
  return TRAUMA_WORDS.some((word) => text.includes(word));
}

export type TraumaMechanismMismatchInput = {
  /** 用户输入的主诉原话。 */
  description: string;
  /** 起病方式（MECHANISMS 之一；空串表示尚未选择）。 */
  mechanism: string;
};

export function traumaMechanismMismatchHint(input: TraumaMechanismMismatchInput): string | null {
  if (!descriptionSuggestsTraumaText(input.description)) return null;
  const mechanism = typeof input.mechanism === "string" ? input.mechanism.trim() : "";
  if (mechanism !== NO_TRAUMA_MECHANISM) return null;
  return "你的描述里提到了受伤，但起病方式选了「没有明确受伤」。确实没有受伤可以继续；如果是记错了，建议改回起病方式，系统会补上急性保护。";
}
