import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [demo, walkthrough] = await Promise.all([
  readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8"),
  readFile(new URL("../scripts/real-browser-walkthrough.mjs", import.meta.url), "utf8"),
]);

test("首诊和后续训练都必须留下每个动作的反馈", () => {
  assert.match(demo, /完成训练前，还需要记录每个动作的第一组反馈/);
  assert.match(demo, /disabled=\{!hasCompleteTrainingFeedback\}/);
  assert.match(demo, /const pendingFollowupFeedbackExercises = pendingTrainingFeedback\(exercises, followupExerciseChoices\)/);
  assert.match(demo, /const followupTrainingFeedbackComplete = trainingFeedbackComplete\(exercises, followupExerciseChoices\)/);
  assert.match(demo, /完成本次训练前，还需要记录每个动作的反馈/);
  assert.match(demo, /disabled=\{!followupTrainingFeedbackComplete\}/);
  assert.match(demo, /followupStage === "training" && followupTrainingReadyForRetest && followupTrainingFeedbackComplete/);
});

test("真实浏览器走读必须明确到达总结页并检查运行时错误", () => {
  assert.match(walkthrough, /assert\.match\(h1, \/本次康复总结\//);
  assert.match(walkthrough, /assert\.equal\(runtimeErrors\.length, 0/);
});

