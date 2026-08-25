/**
 * 功能动作知识库与评估计划核心。
 *
 * 这里回答的是“本次是否需要做这项实际评估”，不是“用户有没有提到这个动作”。
 * 主诉只作为排序和筛选事实；只有页面真正记录了功能评估结果，才会进入后续 finding、
 * 处理、训练或复测路由。
 */

import {
  chiefActionSource,
  chiefFunctionActionLabels,
  hasClearChiefAction,
  isAcuteTrauma,
  type ChiefActionIntake,
} from "@/src/domain/rehab/intake/chief-action-core";
import { canonicalActionIdFromAssessmentId } from "@/src/domain/rehab/intake/action-identity-core";

export type FunctionalActionKind =
  | "task-performance"
  | "balance-control"
  | "functional-rom"
  | "strength-endurance"
  | "return-to-sport";

export type FunctionalActionStage = "baseline" | "progression" | "return-to-sport";

export type FunctionalActionMeta = {
  kind: FunctionalActionKind;
  stage: FunctionalActionStage;
  /** 是否允许作为没有明确主诉时的低负荷基础动作。 */
  baseline?: boolean;
};

export type FunctionPlanReason = "chief-context" | "baseline" | "progression";

export type FunctionPlanCandidate = {
  id: string;
  title?: string;
  tags?: string[];
};

export type FunctionAssessmentPlanItem = {
  id: string;
  reason: FunctionPlanReason;
  load: number;
};

export type FunctionAssessmentPlanInput = ChiefActionIntake & {
  regionId: string;
  goal: number;
  isGuided: boolean;
  candidates: FunctionPlanCandidate[];
  firstResults?: Record<string, string | undefined>;
};

type FunctionActionIntake = ChiefActionIntake & {
  goal?: number;
  symptoms?: string[];
};

/** 功能动作的负荷顺序：只用于同一批动作的渐进排序，不代表临床严重程度。 */
export const FUNCTION_LOAD_ORDER: Record<string, number> = {
  "ankle-weight-bearing": 1,
  "thigh-walk": 1,
  "calf-walk": 1,
  "knee-gait": 1,
  "knee-step-down": 2,
  "knee-step-up": 2,
  "knee-squat": 2,
  "thigh-sit-stand": 2,
  "ankle-knee-wall": 2,
  "ankle-squat": 2,
  "ankle-heel-raise": 3,
  "calf-heel-raise": 3,
  "thigh-bridge-check": 3,
  "knee-heel-raise": 3,
  "ankle-single-leg": 4,
  "knee-single-leg": 4,
  "knee-single-leg-squat": 4,
  "thigh-single-leg": 4,
  "calf-single-leg": 4,
  "ankle-hop": 5,
  "thigh-jog": 5,
  "calf-jog": 5,
  "knee-hop-landing": 5,
};

const FUNCTION_ACTION_META: Record<string, FunctionalActionMeta> = {
  "thigh-walk": { kind: "task-performance", stage: "baseline", baseline: true },
  "thigh-sit-stand": { kind: "task-performance", stage: "baseline" },
  "thigh-bridge-check": { kind: "balance-control", stage: "progression" },
  "thigh-single-leg": { kind: "balance-control", stage: "progression" },
  "thigh-jog": { kind: "return-to-sport", stage: "return-to-sport" },
  "calf-walk": { kind: "task-performance", stage: "baseline", baseline: true },
  "calf-heel-raise": { kind: "strength-endurance", stage: "progression" },
  "calf-single-leg": { kind: "balance-control", stage: "progression" },
  "calf-jog": { kind: "return-to-sport", stage: "return-to-sport" },
  "knee-gait": { kind: "task-performance", stage: "baseline" },
  "knee-squat": { kind: "task-performance", stage: "baseline", baseline: true },
  "knee-heel-raise": { kind: "strength-endurance", stage: "progression" },
  "knee-step-up": { kind: "task-performance", stage: "progression" },
  "knee-step-down": { kind: "task-performance", stage: "progression" },
  "knee-single-leg": { kind: "balance-control", stage: "progression" },
  "knee-single-leg-squat": { kind: "balance-control", stage: "progression" },
  "knee-hop-landing": { kind: "return-to-sport", stage: "return-to-sport" },
  "ankle-squat": { kind: "task-performance", stage: "baseline" },
  "ankle-weight-bearing": { kind: "task-performance", stage: "baseline", baseline: true },
  "ankle-knee-wall": { kind: "functional-rom", stage: "baseline" },
  "ankle-heel-raise": { kind: "strength-endurance", stage: "progression" },
  "ankle-single-leg": { kind: "balance-control", stage: "progression" },
  "ankle-hop": { kind: "return-to-sport", stage: "return-to-sport" },
};

export function functionalActionMeta(id: string): FunctionalActionMeta {
  return FUNCTION_ACTION_META[id] ?? { kind: "task-performance", stage: "baseline" };
}

function progressionIdsForRegion(regionId: string) {
  return regionId === "thigh-local"
    ? ["thigh-walk", "thigh-sit-stand", "thigh-jog"]
    : regionId === "calf-local"
      ? ["calf-walk", "calf-heel-raise", "calf-jog"]
      : regionId === "knee"
        ? ["knee-squat", "knee-single-leg", "knee-single-leg-squat"]
        : regionId === "ankle-foot"
          ? ["ankle-weight-bearing", "ankle-squat", "ankle-single-leg"]
          : [];
}

/** 返回可作为“明确主诉动作”的标准功能评估项目。未知自定义动作不会被伪装成已评估项目。 */
export function chiefFunctionAssessmentIds(intake: FunctionActionIntake, regionId: string): string[] {
  if (!hasClearChiefAction(intake)) return [];
  const source = [intake.actionAnalysis?.task, ...reportedActionValues(intake), intake.forceDirection].filter(Boolean).join(" ");
  const ids: string[] = [];
  if (regionId === "knee") {
    if (includesAny(source, ["走路", "步行", "承重"])) ids.push("function:knee-gait");
    if (includesAny(source, ["下楼", "下台阶"])) ids.push("function:knee-step-down");
    if (includesAny(source, ["上楼", "上台阶"])) ids.push("function:knee-step-up");
    if (includesAny(source, ["下蹲", "蹲起", "深蹲"])) ids.push("function:knee-squat");
    if (includesAny(source, ["单腿", "单脚站", "站稳"])) ids.push("function:knee-single-leg");
    if (includesAny(source, ["单腿蹲", "单脚蹲"])) ids.push("function:knee-single-leg-squat");
    if (includesAny(source, ["提踵", "踮脚", "蹬地"])) ids.push("function:knee-heel-raise");
    if (includesAny(source, ["跑", "跳", "落地"])) ids.push("function:knee-hop-landing");
  }
  if (regionId === "ankle-foot") {
    if (includesAny(source, ["走路", "步行", "承重"])) ids.push("function:ankle-weight-bearing");
    if (includesAny(source, ["下蹲", "蹲起", "深蹲"])) ids.push("function:ankle-squat");
    if (includesAny(source, ["膝碰墙", "背屈", "踝前卡", "下楼"])) ids.push("function:ankle-knee-wall");
    if (includesAny(source, ["提踵", "踮脚", "蹬地"])) ids.push("function:ankle-heel-raise");
    if (includesAny(source, ["单腿", "单脚站"])) ids.push("function:ankle-single-leg");
    if (includesAny(source, ["跑", "跳", "落地"])) ids.push("function:ankle-hop");
  }
  if (regionId === "thigh-local") {
    if (includesAny(source, ["走路", "步行", "迈步"])) ids.push("function:thigh-walk");
    if (includesAny(source, ["坐下", "起身", "坐站"])) ids.push("function:thigh-sit-stand");
    if (includesAny(source, ["臀桥", "后侧链"])) ids.push("function:thigh-bridge-check");
    if (includesAny(source, ["单腿", "侧移", "变向"])) ids.push("function:thigh-single-leg");
    if (includesAny(source, ["跑", "冲刺", "运动"])) ids.push("function:thigh-jog");
  }
  if (regionId === "calf-local") {
    if (includesAny(source, ["走路", "步行", "迈步"])) ids.push("function:calf-walk");
    if (includesAny(source, ["提踵", "踮脚", "蹬地"])) ids.push("function:calf-heel-raise");
    if (includesAny(source, ["单腿", "足弓", "不稳"])) ids.push("function:calf-single-leg");
    if (includesAny(source, ["跑", "跳", "运动"])) ids.push("function:calf-jog");
  }
  return [...new Set(ids)];
}

/** 只取主诉字段，不把活动度方向或自定义句子自动变成“已完成功能检查”。 */
function reportedActionValues(intake: ChiefActionIntake) {
  return [...(intake.reportedActions?.map((item) => item.raw || item.label) ?? []), intake.customAction, intake.reproduction]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()) && !/^说不清|没有固定动作|待确认|不确定/.test(value.trim()));
}

function includesAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

function sourceFor(intake: ChiefActionIntake) {
  return chiefActionSource(intake);
}

/** 功能动作相关性只决定“是否进入候选池”，不决定它是否已经被评估。 */
export function functionActionIsRelevant(regionId: string, itemId: string, intake: FunctionActionIntake) {
  const source = sourceFor(intake);
  if (regionId === "thigh-local") {
    if (itemId === "thigh-jog") return (intake.goal ?? 0) >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跑", "冲刺", "运动"]);
    if (itemId === "thigh-sit-stand") return includesAny(source, ["坐下", "起身", "坐站"]);
    if (itemId === "thigh-bridge-check") return includesAny(`${intake.location} ${source}`, ["大腿后", "臀桥", "后侧链", "冲刺"]);
    if (itemId === "thigh-single-leg") return includesAny(`${intake.location} ${source}`, ["大腿内", "大腿外", "单腿", "侧移", "变向", "不稳"]);
    return itemId === "thigh-walk" && (!hasClearChiefAction(intake) || includesAny(source, ["走路", "步行", "迈步"]));
  }
  if (regionId === "calf-local") {
    if (itemId === "calf-jog") return (intake.goal ?? 0) >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跑", "跳", "运动"]);
    if (itemId === "calf-heel-raise") return includesAny(source, ["提踵", "蹬地", "跑", "跳", "小腿后"]);
    if (itemId === "calf-single-leg") return includesAny(`${intake.location} ${source}`, ["小腿内", "小腿外", "单腿", "足弓", "不稳"]);
    return itemId === "calf-walk" && (!hasClearChiefAction(intake) || includesAny(source, ["走路", "步行", "迈步"]));
  }
  if (regionId === "knee") {
    if (itemId === "knee-hop-landing") return (intake.goal ?? 0) >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跳", "落地", "跑", "运动"]);
    if (itemId === "knee-heel-raise") return includesAny(source, ["提踵", "踮脚", "蹬地"]);
    if (itemId === "knee-single-leg-squat") return includesAny(source, ["单腿蹲", "单脚蹲"]);
    if (itemId === "knee-single-leg") return includesAny(source, ["单腿", "单脚站", "平衡", "不稳"]);
    if (itemId === "knee-step-up") return includesAny(source, ["上楼", "上台阶"]);
    if (itemId === "knee-step-down") return includesAny(source, ["下楼", "下台阶"]);
    if (itemId === "knee-gait") return includesAny(source, ["走路", "步行", "承重"]);
    return itemId === "knee-squat" && (!hasClearChiefAction(intake) || includesAny(source, ["下蹲", "蹲起", "深蹲"]));
  }
  if (regionId === "ankle-foot") {
    if (itemId === "ankle-hop") return (intake.goal ?? 0) >= 4 && !isAcuteTrauma(intake) && includesAny(source, ["跳", "跑", "运动", "球"]);
    if (itemId === "ankle-heel-raise") return !isAcuteTrauma(intake) || includesAny(source, ["提踵", "蹬地", "跑", "跟腱"]);
    if (itemId === "ankle-single-leg") return !isAcuteTrauma(intake) || includesAny(source, ["单脚", "不稳", "平衡"]);
    if (itemId === "ankle-knee-wall") return !intake.symptoms?.includes("肿胀或淤青") && includesAny(source, ["蹲", "楼", "踝前", "活动受限", "走"]);
    if (itemId === "ankle-squat") return includesAny(source, ["蹲", "下楼", "下台阶"]);
    return itemId === "ankle-weight-bearing" && (!hasClearChiefAction(intake) || includesAny(source, ["走路", "步行", "承重"]));
  }
  return false;
}

function relevanceFor(item: FunctionPlanCandidate, intake: ChiefActionIntake) {
  const source = sourceFor(intake);
  const text = `${item.title ?? ""} ${(item.tags ?? []).join(" ")} ${item.id}`;
  let relevance = 0;
  if (includesAny(source, ["下楼", "下台阶"]) && /下楼|下台阶|step-down|eccentric/.test(text)) relevance += 20;
  else if (includesAny(source, ["台阶"]) && /台阶|stairs/.test(text)) relevance += 10;
  if (includesAny(source, ["上楼", "上台阶"]) && /上楼|上台阶|step-up/.test(text)) relevance += 20;
  if (includesAny(source, ["蹲", "起身", "坐站"]) && /蹲|squat|sit-to-stand/.test(text)) relevance += 10;
  if (includesAny(source, ["跑", "跑步"]) && /跑步|跑|jump|run|单腿/.test(text)) relevance += 10;
  if (includesAny(source, ["走路", "步行", "走"]) && /走路|步行|gait|walk/.test(text)) relevance += 8;
  if (includesAny(source, ["单腿", "单脚"]) && /单腿|单脚|single-leg|balance/.test(text)) relevance += 8;
  return relevance;
}

export function selectFunctionAssessmentPlan(input: FunctionAssessmentPlanInput): FunctionAssessmentPlanItem[] {
  const progressionIds = progressionIdsForRegion(input.regionId);
  const candidates = input.candidates
    .filter((item) => functionActionIsRelevant(input.regionId, item.id, input)
      || input.isGuided && progressionIds.includes(item.id))
    .filter(() => !(input.regionId === "ankle-foot" && isAcuteTrauma(input) && input.goal <= 1))
    .map((item, index) => ({ item, relevance: relevanceFor(item, input), index }))
    .sort((a, b) => b.relevance - a.relevance || a.index - b.index);
  const byId = new Map(candidates.map((entry) => [entry.item.id, entry]));
  const selected: FunctionAssessmentPlanItem[] = [];
  const add = (id: string, reason: FunctionPlanReason) => {
    const entry = byId.get(id);
    if (!entry) return;
    const load = FUNCTION_LOAD_ORDER[id] ?? 99;
    const actionKey = canonicalActionIdFromAssessmentId(id);
    const existingIndex = selected.findIndex((item) => canonicalActionIdFromAssessmentId(item.id) === actionKey);
    if (existingIndex >= 0) {
      // 主诉动作和基础功能映射到同一物理动作时，只保留负荷更低的实际检查。
      // 高阶来源仍然保留在上游上下文中，但不增加一次现场动作。
      if (load < selected[existingIndex].load) selected[existingIndex] = { id, reason, load };
      return;
    }
    selected.push({ id, reason, load });
  };

  if (!input.isGuided) {
    const maxCount = input.goal >= 4 ? 3 : 2;
    chiefFunctionAssessmentIds(input, input.regionId)
      .map((id) => id.replace(/^function:/, ""))
      .sort((a, b) => (FUNCTION_LOAD_ORDER[a] ?? 99) - (FUNCTION_LOAD_ORDER[b] ?? 99))
      .forEach((id) => { if (selected.length < maxCount) add(id, "chief-context"); });
    candidates.forEach(({ item }) => { if (selected.length < maxCount) add(item.id, "baseline"); });
    return selected;
  }

  const chiefMatch = candidates.find((entry) => entry.relevance > 0);
  if (chiefMatch) {
    add(chiefMatch.item.id, "chief-context");
    if (input.firstResults?.[`function:${chiefMatch.item.id}`] === "normal") {
      const chiefLoad = FUNCTION_LOAD_ORDER[chiefMatch.item.id] ?? 99;
      const chiefProgressionIndex = progressionIds.indexOf(chiefMatch.item.id);
      const next = chiefProgressionIndex >= 0
        ? progressionIds.slice(chiefProgressionIndex + 1).find((id) => byId.has(id))
        : progressionIds.find((id) => byId.has(id) && (FUNCTION_LOAD_ORDER[id] ?? 99) >= chiefLoad);
      if (next) add(next, "progression");
    }
    return selected;
  }
  const first = progressionIds.find((id) => byId.has(id));
  if (!first) {
    if (candidates[0]) add(candidates[0].item.id, "baseline");
    return selected;
  }
  add(first, "baseline");
  if (input.firstResults?.[`function:${first}`] === "normal") {
    const second = progressionIds.find((id) => id !== first && byId.has(id));
    if (second) add(second, "progression");
  }
  return selected;
}

/** 主诉标签只用于展示或评估上下文；它不是已完成的功能评估标签。 */
export function reportedChiefFunctionLabels(intake: ChiefActionIntake, regionId: string) {
  return chiefFunctionActionLabels(intake, regionId);
}
