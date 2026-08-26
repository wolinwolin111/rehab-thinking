import { strengthAnswerResult, type StrengthAnswer, type StrengthUnableReason } from "@/src/domain/rehab/assessment/assessment-answer-core";

export type PairedStrengthFindingProjectionInput = {
  answer: StrengthAnswer;
  unableReason?: StrengthUnableReason;
  title: string;
  professional: boolean;
  selfKneeExtensionControl: boolean;
  location?: string;
  type?: string;
  score?: number;
  tags?: string[];
  discomfortTags?: string[];
};

/**
 * 配对力量是活动度卡片下的独立证据。
 * 该 builder 明确只读取 pairedStrength* 字段，防止误把同一张卡的活动不适
 * 当成保持/抗阻时的不适写入 finding。
 */
export function pairedStrengthFindingProjection(input: PairedStrengthFindingProjectionInput) {
  const result = strengthAnswerResult(input.answer, input.unableReason);
  if (result !== "weak" && result !== "painful") return null;
  const title = result === "weak"
    ? input.selfKneeExtensionControl
      ? "膝盖绷直后保持能力不足"
      : `${input.title}：${input.professional ? "抗阻力量偏弱" : "主动保持较差"}`
    : `${input.title}：${input.professional ? "抗阻时会引起不适" : "保持时会引起不适"}`;
  const detail = result === "weak"
    ? input.professional
      ? "检查者施加轻度抗阻时，这侧力量小于另一侧"
      : input.selfKneeExtensionControl
        ? "抬起整条腿后，膝盖会弯、明显抖动或很快落下"
        : "两侧主动保持时，这侧更容易掉下、抖动或提前结束"
    : [input.location, input.type, typeof input.score === "number" ? `${input.score}/10` : ""].filter(Boolean).join(" · ")
      || (input.professional ? "抗阻时出现不适" : "主动保持时出现不适");
  return {
    title,
    detail,
    score: input.score,
    tags: [...(input.tags ?? []), ...(input.discomfortTags ?? [])],
  };
}
