export type FocusStep = {
  eyebrow: string;
  title: string;
  description: string;
  targetLabel: string;
  targetKeys: string[];
  placement: "top" | "right" | "bottom" | "left";
};

export const FOCUS_STEPS: readonly FocusStep[] = [
  {
    eyebrow: "第 1 步 · 症状信息",
    title: "描述你的不适",
    description: "哪边哪里、什么时候开始、什么动作不舒服。不确定的可以直接写“不清楚”。",
    targetLabel: "症状输入框",
    targetKeys: ["symptom-input", "symptom-block"],
    placement: "right",
  },
  {
    eyebrow: "提交这一段原话",
    title: "写完点这里",
    description: "系统把你的原话整理成待确认信息，后续由你确认。",
    targetLabel: "帮我整理",
    targetKeys: ["organize", "symptom-block"],
    placement: "top",
  },
  {
    eyebrow: "按顺序推进",
    title: "完成一次完整的康复",
    description: "跟着提示完成评估、复测和训练。",
    targetLabel: "康复流程",
    targetKeys: ["flow-mobile", "flow-current", "flow"],
    placement: "bottom",
  },
  {
    eyebrow: "开始使用",
    title: "有问题随时反馈",
    description: "准备好了就开始吧。",
    targetLabel: "问题反馈",
    targetKeys: ["feedback", "top-actions"],
    placement: "bottom",
  },
] as const satisfies readonly FocusStep[];
