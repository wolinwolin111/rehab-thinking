/**
 * 结果选项：base 组提供**值契约**（决策层输入，禁止增删改值）＋默认标签。
 * 条目级 labels 覆盖标签文案（值不可覆盖，validate 校验）。
 *
 * 定制分层（owner 2026-09-04）：
 *  - 动作特异：评估作答（function 完成/无法/暂不做）、复测结论——在条目上写 labels；
 *  - 族级：strength/special 作答、双侧活动度——按类别用 base；
 *  - 有意通用：GENERIC_REGISTRY 里登记"判断维度与动作无关"的组及理由，防止误定制/误报漏项。
 */

export type OptionBase = {
  /** 值契约，有序（决定按钮顺序）。 */
  values: readonly string[];
  /** 默认标签（名称｜解释）。 */
  labels: Record<string, string>;
};

export const OPTION_BASES: Record<string, OptionBase> = {
  "function-completion": {
    values: ["complete", "unable", "skip"],
    labels: {
      complete: "可以做完",
      unable: "做不完或不敢继续",
      skip: "暂时不做",
    },
  },
  "retest-outcome": {
    values: ["better", "same", "worse", "unknown", "unable"],
    labels: {
      better: "有改善",
      same: "跟上次差不多",
      worse: "比上次更差",
      unknown: "看不出来",
      unable: "这次做不了",
    },
  },
  "strength-answer": {
    values: ["normal", "weak", "painful", "unable", "skip"],
    labels: {
      normal: "力量接近",
      weak: "患侧偏弱",
      painful: "发力不适",
      unable: "无法完成",
      skip: "暂不检查",
    },
  },
};

/** 有意不按动作定制的选项组及理由（防止将来被当漏项）。 */
export const GENERIC_REGISTRY: Record<string, string> = {
  "red-flag": "安全判断（有/没有），语义与动作无关",
  "bilateral-comparison": "两侧对比结论（哪侧更差），语义只关于侧别",
  "worsening-triage": "加重处置问句（是否回落/位置/性质变化），症状语义通用",
  "imaging-conclusion": "影像与医嘱事实选项，来自报告用词",
  "custom-load-tier": "自定义动作的模仿方式（承重档位），与具体动作无关的负荷维度",
  "training-feedback": "第一组反馈（做不了/合适/轻松/加重），反馈维度按类别一致",
  "training-advance": "训练进退档选择（降低一档/保持/进阶），剂量语义通用",
};
