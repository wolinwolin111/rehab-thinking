export type ProductMode = "guided" | "thinking";
export type OperationTarget = "self" | "other" | "study";

export type CapabilityKey =
  | "passiveRange"
  | "resistedStrength"
  | "endFeel"
  | "palpation"
  | "specialTest"
  | "jointMobilization";

export type CapabilitySet = Record<CapabilityKey, boolean>;
export type PalpationMode = "none" | "self-light" | "professional-basic";

export type WorkflowProfileInput = {
  productMode?: ProductMode | "";
  operationTarget?: OperationTarget | "";
  capabilities?: Partial<CapabilitySet>;
  learningExplanation?: boolean;
};

export type WorkflowProfile = {
  productMode: ProductMode;
  operationTarget: OperationTarget;
  capabilities: CapabilitySet;
  learningExplanation: boolean;
  isGuided: boolean;
  isStudy: boolean;
  canRecord: boolean;
  canAssessPassive: boolean;
  canAssessResistance: boolean;
  canAssessEndFeel: boolean;
  canPalpate: boolean;
  /** 兼容旧 canPalpate；新流程按风险区分自我轻按和专业触诊。 */
  palpationMode: PalpationMode;
  canRunSpecialTest: boolean;
  canMobilizeJoint: boolean;
};

export const CAPABILITY_KEYS: CapabilityKey[] = [
  "passiveRange",
  "resistedStrength",
  "endFeel",
  "palpation",
  "specialTest",
  "jointMobilization",
];

export function emptyCapabilities(): CapabilitySet {
  return {
    passiveRange: false,
    resistedStrength: false,
    endFeel: false,
    palpation: false,
    specialTest: false,
    jointMobilization: false,
  };
}

export type CapabilityToggleResult = {
  capabilities: CapabilitySet;
  accepted: boolean;
  message?: string;
};

/**
 * Keep capability dependencies in one place so the intake UI cannot show a
 * procedure as selected when its evidence prerequisite is absent.
 */
export function toggleCapability(capabilities: CapabilitySet, key: CapabilityKey): CapabilityToggleResult {
  if (key === "jointMobilization" && !capabilities.passiveRange && !capabilities.jointMobilization) {
    return {
      capabilities,
      accepted: false,
      message: "先选择“被动活动度”，才能开放“关节处理”。",
    };
  }
  const next = { ...capabilities, [key]: !capabilities[key] };
  if (key === "passiveRange" && !next.passiveRange && next.jointMobilization) {
    next.jointMobilization = false;
    return {
      capabilities: next,
      accepted: true,
      message: "已取消“关节处理”：需要保留“被动活动度”能力。",
    };
  }
  return { capabilities: next, accepted: true };
}

function normalizedCapabilities(input?: Partial<CapabilitySet>): CapabilitySet {
  const next = emptyCapabilities();
  for (const key of CAPABILITY_KEYS) next[key] = input?.[key] === true;
  return next;
}

export function normalizeWorkflowProfile(input: WorkflowProfileInput = {}): WorkflowProfile {
  const productMode: ProductMode = input.productMode === "thinking" ? "thinking" : "guided";
  const operationTarget: OperationTarget = productMode === "guided"
    ? "self"
    : input.operationTarget === "other" || input.operationTarget === "study" ? input.operationTarget : "self";
  const isGuided = productMode === "guided";
  const isStudy = operationTarget === "study";
  const capabilities = normalizedCapabilities(input.capabilities);

  // Self-use cannot create reliable passive, manual resistance, end-feel or joint-mobilization evidence.
  // Study mode is a simulation and never writes a real rehabilitation record.
  const canAssessPassive = !isGuided && operationTarget === "other" && capabilities.passiveRange;
  const canAssessResistance = !isGuided && operationTarget === "other" && capabilities.resistedStrength;
  const canAssessEndFeel = !isGuided && operationTarget === "other" && capabilities.endFeel;
  const palpationMode: PalpationMode = isStudy
    ? "none"
    : isGuided || operationTarget === "self"
      ? "self-light"
      : capabilities.palpation ? "professional-basic" : "none";
  const canPalpate = palpationMode !== "none";
  const canRunSpecialTest = !isGuided && operationTarget === "other" && capabilities.specialTest;
  const canMobilizeJoint = !isGuided
    && operationTarget === "other"
    && capabilities.jointMobilization
    // 关节处理的前置证据是专业被动活动检查；终末感只是辅助记录，
    // 不能因为不同人员对终末感的命名理解不同，就把关节路径锁死。
    && canAssessPassive;

  return {
    productMode,
    operationTarget,
    capabilities,
    learningExplanation: input.learningExplanation === true || isStudy,
    isGuided,
    isStudy,
    canRecord: !isStudy,
    canAssessPassive,
    canAssessResistance,
    canAssessEndFeel,
    canPalpate,
    palpationMode,
    canRunSpecialTest,
    canMobilizeJoint,
  };
}

/**
 * 给一次检查能力配置生成可追踪的快照编号。
 *
 * 能力发生变化时，旧检查结果仍然是历史事实，不能被新能力配置覆盖；
 * 因此记录只引用当时的 snapshot id，而不是在读取时重新推断。
 */
export function buildCapabilitySnapshotId(
  sessionId: string,
  assessmentRevision: number,
  operationTarget: OperationTarget,
  capabilities: Partial<CapabilitySet> = {},
) {
  const enabled = CAPABILITY_KEYS.filter((key) => capabilities[key] === true).join(",") || "none";
  return `capability:${sessionId}:${operationTarget}:${assessmentRevision}:${enabled}`;
}

export function workflowProfileFromLegacy(userRole: "" | "general" | "coach" | "rehab", examSetup: "" | "self" | "professional-other"): WorkflowProfile {
  if (userRole === "general" || !userRole) return normalizeWorkflowProfile({ productMode: "guided" });
  return normalizeWorkflowProfile({
    productMode: "thinking",
    operationTarget: examSetup === "professional-other" ? "other" : "self",
    capabilities: examSetup === "professional-other"
      ? {
        passiveRange: true,
        resistedStrength: true,
        endFeel: userRole === "rehab",
        palpation: true,
        specialTest: userRole === "rehab",
        jointMobilization: userRole === "rehab",
      }
      : { palpation: true },
  });
}

export function profileLabel(profile: WorkflowProfile): string {
  if (profile.isGuided) return "自助康复";
  // study 只为读取旧快照保留，生产入口已关闭，不能再被当成可用模式展示。
  if (profile.isStudy) return "旧版案例学习（已关闭）";
  return profile.operationTarget === "other" ? "康复思路·给别人" : "康复思路·给自己";
}

export function profileEquivalent(a: WorkflowProfile, b: WorkflowProfile): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
