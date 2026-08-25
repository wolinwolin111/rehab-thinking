/**
 * 标记侧别与主诉侧别的一致性提示核心（M-01，方案A：温和确认提示）。
 *
 * 规则来源：交接文档 2026-08-26 §5「肿胀/按压痛侧别与主诉不一致」候选方案 A——
 * 允许标记另一侧（临床上有意义：代偿、双侧问题），但选了与主诉不同侧时给出
 * 非阻断的温和确认提示。本函数只产出提示文案，不改变任何决策输入；
 * 决策层现状行为（knee-workflow-adapter 的侧别处理）不在本函数职责内。
 */

export type MarkingSideMismatchInput = {
  /** 主诉侧别，如 "左侧" | "右侧" | "双侧/中间"；空值视为未知，不提示。 */
  complaintSide: string;
  /** 标记点携带的侧别列表（可含重复与空值）。 */
  markedSides: string[];
  /** 提示名词，默认 "肿胀位置"；可传 "按压痛位置" 等复用同一条规则。 */
  noun?: string;
};

/** 有明确单侧语义的合法侧别；"双侧/中间" 与空值不参与矛盾判定。 */
const DEFINITE_SIDES = ["左侧", "右侧"];

export function markingSideMismatchHint(input: MarkingSideMismatchInput): string | null {
  const noun = input.noun ?? "肿胀位置";
  const complaintSide = typeof input.complaintSide === "string" ? input.complaintSide.trim() : "";
  if (!complaintSide || complaintSide === "双侧/中间") return null;
  const differing = [...new Set(
    (Array.isArray(input.markedSides) ? input.markedSides : [])
      .filter((side) => DEFINITE_SIDES.includes(side) && side !== complaintSide),
  )];
  if (!differing.length) return null;
  return `${noun}在${differing.join("、")}，与主诉${complaintSide}不同，如无误点请继续`;
}
