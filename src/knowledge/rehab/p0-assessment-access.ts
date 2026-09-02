import type { WorkflowProfile } from "@/src/domain/rehab/intake/workflow-profile-core";

export type P0AccessProfile = Pick<WorkflowProfile,
  | "operationTarget"
  | "isStudy"
  | "canAssessPassive"
  | "canAssessEndFeel"
  | "palpationMode"
  | "canMobilizeJoint"
>;

type P0CheckKind = "active" | "passive" | "end-feel" | "muscle-comparison" | "joint-check";
type ProfessionalCapability = "none" | "passiveRange" | "endFeel" | "palpation" | "jointMobilization";

type P0AssessmentAccessRule = {
  reviewId: string;
  assessmentIds: string[];
  kind: P0CheckKind;
  ordinary: "self" | "self-light" | "hidden";
  professionalCapability: ProfessionalCapability;
};

/** Owner-confirmed 2026-08-30. This is the complete knee/ankle P0 access list. */
export const P0_ASSESSMENT_ACCESS_RULES: P0AssessmentAccessRule[] = [
  { reviewId: "K-P0-01", assessmentIds: ["motion:knee-extension"], kind: "active", ordinary: "self", professionalCapability: "none" },
  { reviewId: "K-P0-02", assessmentIds: ["motion:knee-flexion"], kind: "active", ordinary: "self", professionalCapability: "none" },
  { reviewId: "K-P0-03", assessmentIds: ["motion:knee-extension"], kind: "passive", ordinary: "hidden", professionalCapability: "passiveRange" },
  { reviewId: "K-P0-04", assessmentIds: ["motion:knee-extension"], kind: "end-feel", ordinary: "hidden", professionalCapability: "endFeel" },
  { reviewId: "K-P0-05", assessmentIds: ["motion:knee-extension"], kind: "muscle-comparison", ordinary: "self-light", professionalCapability: "palpation" },
  // K-P0-06 = 膝后与小腿后侧区域比较（区别于 K-P0-05 大腿前侧与外侧），来源：
  // outputs/.../RehabMind-膝踝P0检查权限审核表.xlsx。本表按评估项粒度，无法表达同一
  // 评估内"前侧 vs 后侧"两区域项，故两条都挂到 motion:knee-extension（授权相同：
  // 普通用户 self-light 轻按比较，专业需触诊能力）。后侧深压的"避开腘窝"约束由
  // knee-posterior-calf-muscle 处理卡文案兜住。勿删此行——它是独立评审覆盖。
  { reviewId: "K-P0-06", assessmentIds: ["motion:knee-extension"], kind: "muscle-comparison", ordinary: "self-light", professionalCapability: "palpation" },
  { reviewId: "K-P0-07", assessmentIds: ["response:knee-proximal-fibula"], kind: "joint-check", ordinary: "hidden", professionalCapability: "jointMobilization" },
  { reviewId: "A-P0-01", assessmentIds: ["motion:ankle-dorsiflexion"], kind: "active", ordinary: "self", professionalCapability: "none" },
  { reviewId: "A-P0-02", assessmentIds: ["motion:ankle-dorsiflexion"], kind: "passive", ordinary: "hidden", professionalCapability: "passiveRange" },
  { reviewId: "A-P0-03", assessmentIds: ["motion:ankle-dorsiflexion-knee-flexed"], kind: "active", ordinary: "self", professionalCapability: "none" },
  { reviewId: "A-P0-04", assessmentIds: ["motion:ankle-dorsiflexion-knee-flexed"], kind: "passive", ordinary: "hidden", professionalCapability: "passiveRange" },
  { reviewId: "A-P0-05", assessmentIds: ["motion:ankle-eversion"], kind: "active", ordinary: "self", professionalCapability: "none" },
  { reviewId: "A-P0-06", assessmentIds: ["motion:ankle-eversion"], kind: "passive", ordinary: "hidden", professionalCapability: "passiveRange" },
  { reviewId: "A-P0-07", assessmentIds: ["motion:ankle-cuboid-mobility"], kind: "joint-check", ordinary: "hidden", professionalCapability: "passiveRange" },
  { reviewId: "A-P0-08", assessmentIds: ["motion:ankle-toe-flexion"], kind: "active", ordinary: "self", professionalCapability: "none" },
  { reviewId: "A-P0-09", assessmentIds: ["motion:ankle-dorsiflexion", "motion:ankle-dorsiflexion-knee-flexed", "motion:ankle-eversion"], kind: "muscle-comparison", ordinary: "self-light", professionalCapability: "palpation" },
];

function professionalCapabilityAllowed(capability: ProfessionalCapability, profile: P0AccessProfile) {
  if (profile.operationTarget !== "other") return false;
  if (capability === "none") return true;
  if (capability === "passiveRange") return profile.canAssessPassive;
  if (capability === "endFeel") return profile.canAssessEndFeel;
  if (capability === "palpation") return profile.palpationMode === "professional-basic";
  return profile.canMobilizeJoint;
}

function ruleAllowed(rule: P0AssessmentAccessRule, profile: P0AccessProfile) {
  if (profile.isStudy) return false;
  if (profile.operationTarget === "other") return professionalCapabilityAllowed(rule.professionalCapability, profile);
  if (rule.ordinary === "self") return true;
  return rule.ordinary === "self-light" && profile.palpationMode === "self-light";
}

export type P0AssessmentAccess = {
  visible: boolean;
  passive: boolean;
  endFeel: boolean;
  muscleComparison: boolean;
};

/** Undefined means the assessment is outside the reviewed knee/ankle P0 set. */
export function p0AssessmentAccess(assessmentId: string, profile: P0AccessProfile): P0AssessmentAccess | undefined {
  const rules = P0_ASSESSMENT_ACCESS_RULES.filter((rule) => rule.assessmentIds.includes(assessmentId));
  if (!rules.length) return undefined;
  const allowed = rules.filter((rule) => ruleAllowed(rule, profile));
  return {
    visible: allowed.some((rule) => ["active", "passive", "joint-check"].includes(rule.kind)),
    passive: allowed.some((rule) => ["passive", "joint-check"].includes(rule.kind)),
    endFeel: allowed.some((rule) => rule.kind === "end-feel"),
    muscleComparison: allowed.some((rule) => rule.kind === "muscle-comparison"),
  };
}

export function p0JointCheckAllowed(reviewId: "K-P0-07", profile: P0AccessProfile) {
  const rule = P0_ASSESSMENT_ACCESS_RULES.find((entry) => entry.reviewId === reviewId);
  return Boolean(rule && ruleAllowed(rule, profile));
}

type P0AssessmentEvidence = {
  passive?: unknown;
  passiveEndFeel?: unknown;
  tensionLocations?: string[];
  tensionChecked?: boolean;
};

/** Keep stored history intact while excluding evidence not allowed by the current reviewed P0 contract. */
export function p0AssessmentEvidenceForDecision<T extends P0AssessmentEvidence>(
  assessmentId: string,
  record: T | undefined,
  profile: P0AccessProfile,
): T | undefined {
  if (!record) return record;
  const access = p0AssessmentAccess(assessmentId, profile);
  if (!access) return record;
  return {
    ...record,
    ...(access.passive ? {} : { passive: undefined, passiveEndFeel: undefined }),
    ...(access.muscleComparison ? {} : { tensionLocations: [], tensionChecked: false }),
  } as T;
}
