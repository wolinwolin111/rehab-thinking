import type { PilotSyncDisplayState, Step } from "@/src/features/rehabmind/components/workbench/workbench-support";

export function mobileSaveStatus(state: PilotSyncDisplayState) {
  // 2026-08-26 产品决策：正常流转全面静默（与桌面口径一致），仅异常态显示文字。
  if (state === "idle" || state === "local-saving" || state === "local-saved" || state === "syncing" || state === "synced") return "";
  if (state === "offline") return "仅保存在本机";
  if (state === "conflict") return "保存待处理";
  return "保存失败";
}

export function mobileStageAvailable(input: {
  targetStep: Step;
  railStep: Step;
  currentStep: Step;
  maxUnlocked: Step;
  followupMode: boolean;
}) {
  if (input.followupMode) return input.targetStep <= input.railStep;
  return input.targetStep <= input.maxUnlocked || input.targetStep <= input.currentStep;
}
