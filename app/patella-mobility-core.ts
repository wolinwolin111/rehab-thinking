/**
 * 髌骨多方向活动单元核心。
 *
 * 髌骨向上/向下/向内/向外四个方向属于同一项被动筛查：页面合并为一张评估卡，
 * 处理时也必须合并为一个稳定单元——一张处理卡列出所有受限方向，一张复测卡
 * 统一记录这些方向；后台仍按方向保存结果，已经达到比较目标的方向退出后续队列。
 */

export type PatellaDirectionId =
  | "knee-patella-superior"
  | "knee-patella-inferior"
  | "knee-patella-medial"
  | "knee-patella-lateral";

export const PATELLA_DIRECTION_IDS: readonly PatellaDirectionId[] = [
  "knee-patella-superior",
  "knee-patella-inferior",
  "knee-patella-medial",
  "knee-patella-lateral",
];

export const PATELLA_DIRECTION_LABELS: Record<PatellaDirectionId, string> = {
  "knee-patella-superior": "向上",
  "knee-patella-inferior": "向下",
  "knee-patella-medial": "向内",
  "knee-patella-lateral": "向外",
};

export type PatellaPassiveRecord = { passive?: string };

/** 提取被动活动受限（与对侧相比更少）的髌骨方向，按固定顺序返回。 */
export function limitedPatellaDirections(results: Record<string, PatellaPassiveRecord | undefined>): PatellaDirectionId[] {
  return PATELLA_DIRECTION_IDS.filter((id) => results[`motion:${id}`]?.passive === "limited");
}

/** 是否髌骨四方向之一。 */
export function isPatellaDirectionId(id: string) {
  return (PATELLA_DIRECTION_IDS as readonly string[]).includes(id);
}

/** 面向用户的处理标题：把受限方向拼成「髌骨向上、向内滑动辅助」。 */
export function patellaMobilityUnitTitle(directionIds: readonly PatellaDirectionId[]): string {
  return `髌骨${directionIds.map((id) => PATELLA_DIRECTION_LABELS[id]).join("、")}滑动辅助`;
}

/** 复测后仍保留在单元里的方向：达到比较目标（both-match）的方向退出。 */
export function remainingPatellaDirections(
  directionIds: readonly PatellaDirectionId[],
  outcomes: Record<string, string | undefined>,
): PatellaDirectionId[] {
  return directionIds.filter((id) => outcomes[`motion:${id}`] !== "both-match");
}

/** 只保留受限方向的 finding，用于复测清单：复测卡只列受限方向，不列全部四方向。 */
export function filterPatellaFindingsToLimited<T extends { id: string }>(
  findings: readonly T[],
  limitedIds: readonly PatellaDirectionId[],
): T[] {
  const limited = new Set<string>(limitedIds);
  return findings.filter((finding) => limited.has(finding.id.replace(/^motion:/, "")));
}
