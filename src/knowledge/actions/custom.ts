/**
 * 自定义动作模板与通用空态文案（owner 裁定：自定义动作不入库，用户原话＋通用模板）。
 * 「承重/负重/小负荷/复测」等提示语为 owner 明确保留原文的批次（28fd9ca 审核口径），
 * 迁移只换来源不改措辞。
 */

export function customActionHint(kind: "no-finding"): { title: string; detail: string; action: string };
export function customActionHint(kind: string): { title?: string; detail?: string; action?: string };
export function customActionHint(kind: string): { title?: string; detail?: string; action?: string } {
  if (kind === "no-finding") {
    return {
      title: "本次没有发现明确异常",
      detail: "保持舒适活动；症状仍存在时返回补充描述或检查。",
      action: "查看低强度活动",
    };
  }
  return {};
}
