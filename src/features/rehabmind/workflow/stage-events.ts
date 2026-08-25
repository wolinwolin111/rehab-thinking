/**
 * AUDIT-02：阶段推进 → 关键事件字典映射。
 *
 * 服务端时间线要能按序复原「输入、确认、评估、处理、训练」的推进轨迹，
 * 但逐键/逐答案发事件会产生噪声。这里取阶段完成粒度：
 * 每个阶段第一次被完成时发一次字典事件；回看旧阶段不重复发射。
 */

/** 六阶段下标 → 完成时写入时间线的事件类型（与 pilot-case-contracts 字典一致）。 */
const STAGE_COMPLETION_EVENTS = [
  "intake_saved", // 0 症状信息
  "intake_confirmed", // 1 关键确认
  "assessment_completed", // 2 评估检查
  "session_saved", // 3 处理复测
  "training_plan_saved", // 4 训练居家
] as const;

export type PilotStageEventType = (typeof STAGE_COMPLETION_EVENTS)[number];

export function stageCompletionEvent(stageIndex: number): PilotStageEventType | null {
  return (STAGE_COMPLETION_EVENTS as readonly unknown[])[stageIndex] as PilotStageEventType | undefined ?? null;
}

/**
 * 给出「上一阶段 → 当前阶段」与已发事件集合，返回本次应发射的事件类型。
 * - 只在向前进入更高阶段时发射；
 * - 同一事件整个生命周期只发一次（seen 由调用方按案例维度保存）。
 */
export function pickStageAdvanceEvent(input: { prev: number; next: number; seen: string[] }): PilotStageEventType | null {
  if (input.next <= input.prev) return null;
  const eventType = stageCompletionEvent(input.next);
  if (!eventType) return null;
  if (input.seen.includes(eventType)) return null;
  return eventType;
}
