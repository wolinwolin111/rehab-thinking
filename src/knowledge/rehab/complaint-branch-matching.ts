/**
 * 膝部主诉分支匹配。
 *
 * 来源是已审核的膝部知识分支（knee-review-package 的 complaintBranches）。
 * 这里把每个分支的主诉特征整理成结构化匹配条件，并声明该分支首轮评估
 * 与产品评估项的对应关系；产品暂时没有对应实现的评估项显式留空，不再
 * 依靠决策代码里的散落正则猜测主诉意图。
 */

import { KNEE_KNOWLEDGE_REVIEW_PACKAGE } from "./knee-review-package";

export type ComplaintBranchIntakeInput = {
  locations?: string[];
  symptomType?: string;
  symptoms?: string[];
  currentTask?: string;
  reportedActions?: Array<{ raw?: string; label?: string }>;
  customAction?: string;
  provocationTypes?: string[];
  description?: string;
};

export type KneeBranchMatchCondition = {
  branchId: string;
  locations: string[];
  feelings: string[];
  actions: string[];
  /** "all" 表示位置与感受必须同时出现（承重发胀这类组合条件）。 */
  clueMode?: "any" | "all";
};

export const KNEE_BRANCH_MATCHES: KneeBranchMatchCondition[] = [
  {
    branchId: "knee-squat-pain-or-scraping",
    locations: ["膝"],
    feelings: ["弹响", "刮擦", "摩擦", "响"],
    actions: ["下蹲", "蹲起", "起身", "单腿下蹲"],
  },
  {
    branchId: "knee-terminal-flexion-discomfort",
    locations: ["膝后", "腘窝", "腓骨头", "膝外侧", "膝内侧", "关节线"],
    feelings: ["末端痛", "弯曲痛", "屈膝痛", "紧"],
    actions: ["弯膝", "屈膝"],
  },
  {
    branchId: "knee-step-down-posterior-discomfort",
    locations: ["膝后", "腘窝"],
    feelings: [],
    actions: ["下楼", "下台阶"],
  },
  {
    branchId: "knee-patella-pressure-pain",
    locations: ["膝前", "髌骨", "髌骨下"],
    feelings: ["按压痛"],
    actions: [],
  },
  {
    branchId: "knee-extension-medial-discomfort",
    locations: ["膝内侧", "内侧关节线", "鹅足"],
    feelings: [],
    actions: ["绷直膝盖", "伸膝"],
  },
  {
    branchId: "knee-weight-bearing-fullness",
    locations: ["膝"],
    feelings: ["胀", "发胀", "胀痛"],
    actions: ["承重", "站立", "走路"],
    clueMode: "all",
  },
  {
    branchId: "knee-support-contact-pain",
    locations: ["膝"],
    feelings: ["疼"],
    actions: ["跪", "支撑", "鸟狗"],
  },
];

/** 合同首轮评估 → 产品评估项。空数组表示产品还没有对应实现。 */
const BRANCH_ASSESSMENT_TO_PRODUCT_IDS: Record<string, string[]> = {
  "squat-symptom-reproduction": ["function:knee-squat"],
  "knee-passive-flexion-end-range": ["motion:knee-flexion"],
  "knee-active-extension": ["motion:knee-extension"],
  "popliteus-response": [],
  "step-down-symptom-reproduction": ["function:knee-step-down"],
  "patella-glide-and-pressure": ["motion:knee-patella-medial", "motion:knee-patella-lateral", "motion:knee-patella-inferior"],
  "lateral-thigh-response": [],
  "knee-extension-press-symptom": ["motion:knee-extension"],
  "standing-knee-extension-symptom": ["motion:knee-extension"],
  "knee-weight-bearing-symptom": ["function:knee-gait"],
  "bird-dog-support-symptom": [],
};

function branchSources(input: ComplaintBranchIntakeInput) {
  const actions = [
    input.currentTask ?? "",
    ...(input.reportedActions ?? []).flatMap((action) => [action.raw ?? "", action.label ?? ""]),
    input.customAction ?? "",
    ...(input.provocationTypes ?? []),
    input.description ?? "",
  ].join(" ");
  return {
    locationText: (input.locations ?? []).join(" "),
    feelingText: [input.symptomType ?? "", ...(input.symptoms ?? [])].join(" "),
    actionText: actions,
  };
}

export type ComplaintBranchMatch = {
  branchId: string;
  score: number;
  /** 该分支首轮评估映射到产品后的评估 id，按分支首轮顺序去重；由调用方按运行时可用性过滤。 */
  assessmentIds: string[];
};

const initialAssessmentsByBranch = new Map(
  KNEE_KNOWLEDGE_REVIEW_PACKAGE.complaintBranches.map((branch) => [branch.id, branch.initialAssessmentIds]),
);

function productAssessmentIdsForBranch(branchId: string) {
  const ids: string[] = [];
  for (const assessmentId of initialAssessmentsByBranch.get(branchId) ?? []) {
    for (const productId of BRANCH_ASSESSMENT_TO_PRODUCT_IDS[assessmentId] ?? []) {
      if (!ids.includes(productId)) ids.push(productId);
    }
  }
  return ids;
}

export function matchKneeComplaintBranches(input: ComplaintBranchIntakeInput): ComplaintBranchMatch[] {
  const sources = branchSources(input);
  return KNEE_BRANCH_MATCHES.flatMap((branch) => {
    const locationMatch = branch.locations.some((token) => sources.locationText.includes(token));
    const feelingMatch = branch.feelings.some((token) => sources.feelingText.includes(token));
    const actionMatch = branch.actions.some((token) => sources.actionText.includes(token));
    if (branch.clueMode === "all") {
      if (!locationMatch || !feelingMatch) return [];
    } else if (!locationMatch && !actionMatch) {
      return [];
    }
    return [{
      branchId: branch.branchId,
      score: (locationMatch ? 5 : 0) + (feelingMatch ? 3 : 0) + (actionMatch ? 4 : 0),
      assessmentIds: productAssessmentIdsForBranch(branch.branchId),
    }];
  }).sort((left, right) => right.score - left.score || left.branchId.localeCompare(right.branchId));
}
