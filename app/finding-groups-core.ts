/**
 * 问题台账分组核心。
 *
 * 把 finding 按「活动受限 / 肌肉紧张 / 力量与控制 / 动作不适 / 后续跟踪」五类分组，
 * 供专业工作台、评估结果与总结页共用。只依赖 finding 的 id/title/priority，
 * 与页面 Finding 类型解耦，可独立单测。
 */

export type FindingGroupKey = "mobility" | "tension" | "control" | "symptom" | "tracking";

export type FindingGroupInput = {
  id: string;
  title: string;
  priority?: string;
};

export const FINDING_GROUP_META: Array<{ key: FindingGroupKey; label: string; short: string }> = [
  { key: "mobility", label: "活动受限", short: "活动" },
  { key: "tension", label: "肌肉紧张", short: "肌肉" },
  { key: "control", label: "力量与控制", short: "控制" },
  { key: "symptom", label: "动作不适", short: "动作" },
  { key: "tracking", label: "后续跟踪", short: "跟踪" },
];

/** 按 finding 标识与标题归类到固定五类之一。 */
export function findingGroupKey(finding: FindingGroupInput): FindingGroupKey {
  if (finding.priority === "track" || finding.id.startsWith("track:")) return "tracking";
  if (finding.id.startsWith("tension:")) return "tension";
  if (finding.id.startsWith("strength:") || finding.id.startsWith("control:") || finding.title.includes("控制需要改善") || finding.title.includes("不稳定")) return "control";
  if (finding.id.startsWith("motion:")) return "mobility";
  return "symptom";
}

/** 按固定顺序返回非空分组（保留传入项类型，页面 Finding 传进仍得 Finding）；空输入返回空数组。 */
export function buildFindingGroups<T extends FindingGroupInput>(items: T[]): Array<{ key: FindingGroupKey; label: string; short: string; items: T[] }> {
  const safeItems = Array.isArray(items) ? items : [];
  return FINDING_GROUP_META
    .map((meta) => ({ ...meta, items: safeItems.filter((finding) => findingGroupKey(finding) === meta.key) }))
    .filter((group) => group.items.length > 0);
}
