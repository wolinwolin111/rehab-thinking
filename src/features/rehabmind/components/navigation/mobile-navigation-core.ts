import type { PilotSyncDisplayState, Step } from "@/src/features/rehabmind/components/workbench/workbench-support";

export function mobileSaveStatus(state: PilotSyncDisplayState) {
  if (state === "idle") return "未保存";
  if (state === "local-saving" || state === "syncing") return "··";
  if (state === "local-saved" || state === "synced") return "✓";
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
