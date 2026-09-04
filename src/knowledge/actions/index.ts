import { ASSESSMENT_BY_ID } from "./assessment.ts";
import { OPTION_BASES } from "./option-sets.ts";
import { renderHow } from "./resolve.ts";
import type { Register } from "./types.ts";

/** 一层作答按钮：条目 labels 覆盖 → base 默认标签。值契约来自 base，条目不可改值。 */
export function renderOptions<T extends string = string>(
  id: string,
  baseName: string,
  mode: "guided" | "thinking",
): Array<{ value: T; label: string }> {
  const base = OPTION_BASES[baseName];
  if (!base) throw new Error(`unknown option base: ${baseName}`);
  const entry = ASSESSMENT_BY_ID.get(id);
  const overrides = entry?.options && entry.options.base === baseName ? entry.options.labels : undefined;
  const register: Register = mode === "guided" ? "plain" : "pro";
  return base.values.map((value) => ({
    value: value as T,
    label: overrides?.[value]?.[register] ?? base.labels[value] ?? value,
  }));
}

/** 标题双轨：自助用 friendly 标题（目录），专业用 professionalAssessmentTitle 同源的 pro 名。 */
export function assessmentTitle(id: string, mode: "guided" | "thinking"): string | undefined {
  const entry = ASSESSMENT_BY_ID.get(id);
  if (!entry) return undefined;
  return mode === "guided" ? entry.title.plain : entry.title.pro;
}

export type UnableReasonButton = { value: string; label: string };
export type UnableGuidance = { action: string; fallback: string };

/** 二层追问包整包：原因按钮、提示句、按原因引导（仅 no-helper 会有）。 */
export function unableFollowUp(
  kind: "motion" | "function" | "strength" | "special",
  mode: "guided" | "thinking",
  how?: string,
): { hint?: string; reasons: UnableReasonButton[]; guidanceFor: (reason: string) => UnableGuidance | undefined } {
  const base = OPTION_BASES[`unable-reason-${kind}`];
  if (!base) throw new Error(`unknown unable-reason base: ${kind}`);
  const register: Register = mode === "guided" ? "plain" : "pro";
  const guidanceFor = (reason: string): UnableGuidance | undefined => {
    const g = base.guidance?.[reason];
    if (!g) return undefined;
    return {
      action: how ? g.action.replace("{how}", how) : g.action.replace("：{how}", "。"),
      fallback: g.fallback,
    };
  };
  return {
    hint: base.hint,
    reasons: base.values.map((value) => ({ value, label: base.labels[value] ?? value })),
    guidanceFor,
  };
}
