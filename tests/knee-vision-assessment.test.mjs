import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const coreSource = await readFile(new URL("../app/knee-decision-core.ts", import.meta.url), "utf8");
const coreCode = ts.transpileModule(coreSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const coreUrl = `data:text/javascript;base64,${Buffer.from(coreCode).toString("base64")}`;
const visionSource = await readFile(new URL("../app/knee-vision-assessment.ts", import.meta.url), "utf8");
const visionCode = ts.transpileModule(visionSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("./knee-decision-core.ts", coreUrl);
const visionUrl = `data:text/javascript;base64,${Buffer.from(visionCode).toString("base64")}`;
const {
  assessKneeCaptureQuality,
  calculateKneeAngle,
  compareKneeVisionSummaries,
  summarizeKneeCapture,
  visualComparisonToKneeFinding,
} = await import(visionUrl);

const setup = {
  protocolId: "active-extension-side",
  side: "right",
  cameraViewConfirmed: true,
  wholeBodyVisible: true,
  cameraStable: true,
  lightingAdequate: true,
};

function frameAt(angle, index, confidence = 0.95) {
  const radians = (-90 + angle) * Math.PI / 180;
  return {
    timestampMs: index * 33,
    hip: { x: 0.5, y: 0.2, visibility: confidence, presence: confidence },
    knee: { x: 0.5, y: 0.5, visibility: confidence, presence: confidence },
    ankle: { x: 0.5 + 0.3 * Math.cos(radians), y: 0.5 + 0.3 * Math.sin(radians), visibility: confidence, presence: confidence },
  };
}

const framesAt = (angle, count = 20, confidence = 0.95) => Array.from({ length: count }, (_, index) => frameAt(angle, index, confidence));

test("calculates a sagittal knee angle from hip-knee-ankle points", () => {
  assert.ok(Math.abs(calculateKneeAngle(frameAt(180, 0).hip, frameAt(180, 0).knee, frameAt(180, 0).ankle) - 180) < 0.01);
  assert.ok(Math.abs(calculateKneeAngle(frameAt(90, 0).hip, frameAt(90, 0).knee, frameAt(90, 0).ankle) - 90) < 0.01);
});

test("rejects a capture with low landmark confidence", () => {
  const quality = assessKneeCaptureQuality(setup, framesAt(175, 20, 0.5));
  assert.equal(quality.accepted, false);
  assert.ok(quality.issues.some((issue) => issue.includes("关键点")));
});

test("rejects a capture when camera setup is not confirmed", () => {
  const quality = assessKneeCaptureQuality({ ...setup, cameraStable: false }, framesAt(175));
  assert.equal(quality.accepted, false);
  assert.ok(quality.issues.some((issue) => issue.includes("机位")));
});

test("summarizes usable angle and repetition spread", () => {
  const summary = summarizeKneeCapture(setup, framesAt(172), [171, 173, 172]);
  assert.equal(summary.quality.accepted, true);
  assert.ok(Math.abs(summary.maximumAngle - 172) < 0.01);
  assert.equal(summary.repeatabilitySpread, 2);
});

test("classifies close, uncertain and clear side differences", () => {
  const reference = summarizeKneeCapture(setup, framesAt(180), [180, 179, 180]);
  const close = summarizeKneeCapture(setup, framesAt(176), [176, 177, 176]);
  const uncertain = summarizeKneeCapture(setup, framesAt(173), [173, 174, 173]);
  const limited = summarizeKneeCapture(setup, framesAt(165), [165, 166, 165]);
  assert.equal(compareKneeVisionSummaries(close, reference).status, "close");
  assert.equal(compareKneeVisionSummaries(uncertain, reference).status, "repeat-needed");
  assert.equal(compareKneeVisionSummaries(limited, reference).status, "clear-difference");
});

test("requires another recording when repeated peaks are inconsistent", () => {
  const reference = summarizeKneeCapture(setup, framesAt(180), [180, 179, 180]);
  const inconsistent = summarizeKneeCapture(setup, framesAt(165), [155, 165, 175]);
  assert.equal(compareKneeVisionSummaries(inconsistent, reference).status, "repeat-needed");
});

test("converts only a clear visual difference into a limited finding", () => {
  const finding = visualComparisonToKneeFinding("vision:extension", "right", "active-extension-side", {
    status: "clear-difference",
    differenceDegrees: 12,
    message: "明显差异",
  });
  assert.equal(finding.kind, "motion-range");
  assert.equal(finding.direction, "extension");
  assert.equal(finding.result, "limited");
  assert.equal(finding.passiveRange, "not-checked");
});

test("does not turn an uncertain visual result into an abnormal finding", () => {
  const finding = visualComparisonToKneeFinding("vision:extension", "right", "active-extension-side", {
    status: "repeat-needed",
    differenceDegrees: 7,
    message: "请重测",
  });
  assert.equal(finding.result, "unknown");
  assert.equal(finding.activeRange, "unknown");
});

