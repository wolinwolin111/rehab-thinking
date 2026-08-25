export type PilotFeedbackLocation = {
  sessionNumber: number | null;
  stage: string;
};

export type PilotFeedbackStageOption = {
  key: string;
  label: string;
};

export type PilotFeedbackDraft = PilotFeedbackLocation & {
  kind: string;
  message: string;
  eventId: string | null;
};

export type PilotFeedbackSourceContext = PilotFeedbackLocation & {
  caseIdentity: string;
  eventId: string | null;
};

export const PILOT_FEEDBACK_UNLOCATED = "未定位";

export class PilotFeedbackSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PilotFeedbackSubmissionError";
  }
}

export function feedbackSubmissionErrorMessage(error: unknown) {
  return error instanceof PilotFeedbackSubmissionError
    ? error.message
    : "反馈暂时没有提交成功，请稍后再试";
}

export const PILOT_FEEDBACK_KINDS = [
  "流程不合理",
  "内容看不懂",
  "结果不符合实际",
  "页面或按钮问题",
  "其他",
] as const;

export function buildPilotFeedbackLocations(input: {
  currentSessionNumber: number;
  currentStage: string;
  sessions: number[];
  stages: PilotFeedbackStageOption[];
}): PilotFeedbackLocation[] {
  const sessionNumbers = Array.from(new Set([
    input.currentSessionNumber,
    ...input.sessions.filter((value) => Number.isInteger(value) && value > 0),
  ])).sort((left, right) => right - left);
  const stages = input.stages.filter((item, index, items) => items.findIndex((candidate) => candidate.key === item.key) === index);
  return [
    { sessionNumber: null, stage: PILOT_FEEDBACK_UNLOCATED },
    ...sessionNumbers.flatMap((sessionNumber) => stages.map((stage) => ({ sessionNumber, stage: stage.key }))),
  ];
}

export function feedbackLocationKey(location: PilotFeedbackLocation) {
  return `${location.sessionNumber}:${location.stage}`;
}

export function isCurrentPilotFeedbackLocation(
  location: PilotFeedbackLocation,
  current: PilotFeedbackLocation,
) {
  return location.sessionNumber === current.sessionNumber && location.stage === current.stage;
}

export function capturePilotFeedbackSourceContext(input: PilotFeedbackSourceContext): Readonly<PilotFeedbackSourceContext> {
  return Object.freeze({
    caseIdentity: input.caseIdentity,
    sessionNumber: input.sessionNumber,
    stage: input.stage,
    eventId: input.eventId,
  });
}
