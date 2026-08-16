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
  const canPalpate = !isGuided && !isStudy && capabilities.palpation;
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
    canRunSpecialTest,
    canMobilizeJoint,
  };
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
  if (profile.isStudy) return "案例学习";
  return profile.operationTarget === "other" ? "康复思路·给别人" : "康复思路·给自己";
}

export function profileEquivalent(a: WorkflowProfile, b: WorkflowProfile): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
