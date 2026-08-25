import type { KneeFindingFact, KneeSide } from "./knee-decision-core.ts";

export type PoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

export type KneePoseFrame = {
  timestampMs: number;
  hip?: PoseLandmark;
  knee?: PoseLandmark;
  ankle?: PoseLandmark;
};

export type KneeVisionProtocolId =
  | "active-extension-side"
  | "active-flexion-side"
  | "squat-side"
  | "squat-front"
  | "step-down-side"
  | "step-down-front";

export type KneeCaptureSetup = {
  protocolId: KneeVisionProtocolId;
  side: KneeSide;
  cameraViewConfirmed: boolean;
  wholeBodyVisible: boolean;
  cameraStable: boolean;
  lightingAdequate: boolean;
};

export type KneeCaptureQuality = {
  accepted: boolean;
  validFrameRatio: number;
  medianConfidence: number;
  issues: string[];
};

export type KneeVisionSummary = {
  protocolId: KneeVisionProtocolId;
  side: KneeSide;
  quality: KneeCaptureQuality;
  validFrames: number;
  totalFrames: number;
  minimumAngle?: number;
  maximumAngle?: number;
  excursion?: number;
  repeatabilitySpread?: number;
};

export type KneeVisualComparison = {
  status: "not-usable" | "close" | "repeat-needed" | "clear-difference";
  differenceDegrees?: number;
  message: string;
};

export const KNEE_VISION_PILOT_THRESHOLDS = {
  minimumLandmarkConfidence: 0.75,
  minimumValidFrameRatio: 0.85,
  minimumValidFrames: 12,
  closeDifferenceDegrees: 5,
  clearDifferenceDegrees: 10,
  maximumRepeatabilitySpreadDegrees: 5,
  meaningfulWithinSessionChangeDegrees: 10,
} as const;

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function landmarkConfidence(landmark?: PoseLandmark) {
  if (!landmark) return 0;
  return Math.min(landmark.visibility ?? 1, landmark.presence ?? 1);
}

export function calculateKneeAngle(hip: PoseLandmark, knee: PoseLandmark, ankle: PoseLandmark) {
  const thigh = { x: hip.x - knee.x, y: hip.y - knee.y };
  const shank = { x: ankle.x - knee.x, y: ankle.y - knee.y };
  const dot = thigh.x * shank.x + thigh.y * shank.y;
  const magnitude = Math.hypot(thigh.x, thigh.y) * Math.hypot(shank.x, shank.y);
  if (!magnitude) return undefined;
  return Math.acos(Math.max(-1, Math.min(1, dot / magnitude))) * 180 / Math.PI;
}

export function assessKneeCaptureQuality(setup: KneeCaptureSetup, frames: KneePoseFrame[]): KneeCaptureQuality {
  const issues: string[] = [];
  if (!setup.cameraViewConfirmed) issues.push("机位与动作要求不一致");
  if (!setup.wholeBodyVisible) issues.push("身体关键部位没有完整入镜");
  if (!setup.cameraStable) issues.push("拍摄过程中机位发生移动");
  if (!setup.lightingAdequate) issues.push("光线不足或人体轮廓不清");
  const confidences = frames.map((frame) => Math.min(
    landmarkConfidence(frame.hip),
    landmarkConfidence(frame.knee),
    landmarkConfidence(frame.ankle),
  ));
  const validFrames = confidences.filter((confidence) => confidence >= KNEE_VISION_PILOT_THRESHOLDS.minimumLandmarkConfidence).length;
  const validFrameRatio = frames.length ? validFrames / frames.length : 0;
  const medianConfidence = median(confidences);
  if (frames.length < KNEE_VISION_PILOT_THRESHOLDS.minimumValidFrames) issues.push("有效画面太短");
  if (validFrameRatio < KNEE_VISION_PILOT_THRESHOLDS.minimumValidFrameRatio) issues.push("髋、膝或踝关键点识别不稳定");
  return {
    accepted: issues.length === 0,
    validFrameRatio,
    medianConfidence,
    issues,
  };
}

export function summarizeKneeCapture(setup: KneeCaptureSetup, frames: KneePoseFrame[], repetitionPeaks: number[] = []): KneeVisionSummary {
  const quality = assessKneeCaptureQuality(setup, frames);
  const angles = frames.flatMap((frame) => {
    if (!frame.hip || !frame.knee || !frame.ankle) return [];
    const confidence = Math.min(landmarkConfidence(frame.hip), landmarkConfidence(frame.knee), landmarkConfidence(frame.ankle));
    if (confidence < KNEE_VISION_PILOT_THRESHOLDS.minimumLandmarkConfidence) return [];
    const angle = calculateKneeAngle(frame.hip, frame.knee, frame.ankle);
    return angle === undefined ? [] : [angle];
  });
  return {
    protocolId: setup.protocolId,
    side: setup.side,
    quality,
    validFrames: angles.length,
    totalFrames: frames.length,
    minimumAngle: angles.length ? Math.min(...angles) : undefined,
    maximumAngle: angles.length ? Math.max(...angles) : undefined,
    excursion: angles.length ? Math.max(...angles) - Math.min(...angles) : undefined,
    repeatabilitySpread: repetitionPeaks.length >= 2 ? Math.max(...repetitionPeaks) - Math.min(...repetitionPeaks) : undefined,
  };
}

function protocolRangeValue(summary: KneeVisionSummary) {
  if (summary.protocolId === "active-extension-side") return summary.maximumAngle;
  return summary.minimumAngle;
}

export function compareKneeVisionSummaries(target: KneeVisionSummary, reference: KneeVisionSummary): KneeVisualComparison {
  if (!target.quality.accepted || !reference.quality.accepted || target.protocolId !== reference.protocolId) {
    return { status: "not-usable", message: "画面质量或动作条件不一致，不能比较" };
  }
  if ((target.repeatabilitySpread ?? 0) > KNEE_VISION_PILOT_THRESHOLDS.maximumRepeatabilitySpreadDegrees
    || (reference.repeatabilitySpread ?? 0) > KNEE_VISION_PILOT_THRESHOLDS.maximumRepeatabilitySpreadDegrees) {
    return { status: "repeat-needed", message: "重复动作之间差异较大，请重新录制" };
  }
  const targetValue = protocolRangeValue(target);
  const referenceValue = protocolRangeValue(reference);
  if (targetValue === undefined || referenceValue === undefined) return { status: "not-usable", message: "没有获得可用角度" };
  const differenceDegrees = target.protocolId === "active-extension-side" ? referenceValue - targetValue : targetValue - referenceValue;
  const absoluteDifference = Math.abs(differenceDegrees);
  if (absoluteDifference <= KNEE_VISION_PILOT_THRESHOLDS.closeDifferenceDegrees) {
    return { status: "close", differenceDegrees, message: "两侧本次测量结果接近" };
  }
  if (absoluteDifference < KNEE_VISION_PILOT_THRESHOLDS.clearDifferenceDegrees) {
    return { status: "repeat-needed", differenceDegrees, message: "可能存在差异，请再做一组确认" };
  }
  return { status: "clear-difference", differenceDegrees, message: "两侧重复测量显示出明显差异" };
}

export function visualComparisonToKneeFinding(
  id: string,
  side: KneeSide,
  protocolId: KneeVisionProtocolId,
  comparison: KneeVisualComparison,
): KneeFindingFact {
  const extension = protocolId === "active-extension-side";
  const flexion = protocolId === "active-flexion-side";
  return {
    id,
    kind: protocolId.includes("squat") || protocolId.includes("step-down") ? "function-control" : "motion-range",
    side,
    action: extension ? "膝盖绷直" : flexion ? "屈膝" : protocolId.includes("step-down") ? "下台阶" : "下蹲",
    direction: extension ? "extension" : flexion ? "flexion" : undefined,
    result: comparison.status === "clear-difference" ? "limited" : comparison.status === "close" ? "normal" : "unknown",
    activeRange: comparison.status === "clear-difference" ? "limited" : comparison.status === "close" ? "matches" : "unknown",
    passiveRange: "not-checked",
  };
}

