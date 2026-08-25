import { useState } from "react";

export type FunctionUnableReason = "pain" | "weak" | "fear" | "instruction";

export type FinalFunctionRetest = {
  completion: "" | "complete" | "unable";
  unableReason?: FunctionUnableReason;
  control?: "stable" | "compensated" | "unsure";
  score?: number;
};

/**
 * 功能动作复测的状态：处理阶段单个功能动作的「能否完成 + 原因」，
 * 以及训练后整体复测里每个功能主诉动作各自的复测结果。
 */
export function useFunctionRetestState() {
  const [functionRetestCompletion, setFunctionRetestCompletion] = useState<"complete" | "unable" | "">("");
  const [functionRetestUnableReason, setFunctionRetestUnableReason] = useState<FunctionUnableReason | "">("");
  const [finalFunctionRetests, setFinalFunctionRetests] = useState<Record<string, FinalFunctionRetest>>({});
  return {
    functionRetestCompletion,
    setFunctionRetestCompletion,
    functionRetestUnableReason,
    setFunctionRetestUnableReason,
    finalFunctionRetests,
    setFinalFunctionRetests,
  };
}