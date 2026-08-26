import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("ordinary workflow progressively reveals secondary detail", async () => {
  const [symptom, confirmation, assessment, treatmentRoadmap, training, summary] = await Promise.all([
    read("../../src/features/rehabmind/components/stages/symptom-stage.tsx"),
    read("../../src/features/rehabmind/components/stages/confirmation-stage.tsx"),
    read("../../src/features/rehabmind/components/stages/assessment-stage.tsx"),
    read("../../src/features/rehabmind/components/shared/ui-primitives.tsx"),
    read("../../src/features/rehabmind/components/stages/training-stage.tsx"),
    read("../../src/features/rehabmind/components/stages/summary-stage.tsx"),
  ]);

  assert.match(symptom, /<details className="rm-collected">/);
  assert.match(symptom, /查看已收集信息/);
  // RQ-S3 定性答复（2026-08-26）：安全确认/骨性风险由「一次一项」改为全量同屏渲染（产品验收后的人体工学决定）。
  assert.match(confirmation, /activeSafetyItems\.map/);
  assert.match(confirmation, /boneQuestions\.map/);
  assert.match(assessment, /<details className="rm-assessment-progress">/);
  assert.match(assessment, /<details className="rm-check-help"><summary>怎么做和观察重点<\/summary>/);
  assert.match(treatmentRoadmap, /<header><span>现在做<\/span><strong>\{current\}<\/strong><\/header>/);
  assert.match(treatmentRoadmap, /<summary><span>查看本轮进度<\/span>/);
  assert.match(training, /<details className="rm-training-path">/);
  assert.match(training, /<details className="rm-training-basis">/);
  assert.match(training, /<details className="rm-home-relaxation"/);
  assert.match(training, /const visibleExercise = exercises\[visibleExerciseIndex\]/);
  assert.match(training, /训练动作 \{visibleExerciseIndex \+ 1\}\/\{exercises\.length\}/);
  assert.match(training, /recordQuickFeedback\(exercise, mode\)/);
  assert.doesNotMatch(training, /\{exercises\.map\(\(exercise/);
  assert.doesNotMatch(training, /左右滑动查看后续目标/);
  assert.equal(summary.match(/<details className="rm-summary-details"><summary>查看本次详细记录<\/summary>/g)?.length, 2);
});

test("mobile training progress is vertical rather than horizontally scrollable", async () => {
  const styles = await read("../../src/features/rehabmind/styles/complete-demo.css");
  const mobileDisclosure = styles.slice(styles.indexOf("@media (max-width: 720px)"));
  assert.match(mobileDisclosure, /\.rm-training-path \.rm-stage-line \{[^}]*grid-template-columns: 1fr/s);
  assert.doesNotMatch(styles, /rm-stage-scroll-hint/);
  assert.doesNotMatch(styles, /\.rm-stage-line \{[^}]*overflow-x: auto/s);
});
