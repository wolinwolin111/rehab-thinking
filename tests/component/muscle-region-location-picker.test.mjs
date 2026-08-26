import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readRehabMindUiSource } from "../support/read-rehabmind-ui-source.mjs";
import { expectSourceContains } from "../support/source-contract-assert.mjs";

const [picker, demo, styles, walkthrough] = await Promise.all([
  readFile(new URL("../../src/features/rehabmind/components/assessment/muscle-region-location-picker.tsx", import.meta.url), "utf8"),
  readRehabMindUiSource(),
  readFile(new URL("../../src/features/rehabmind/styles/rm-visual-theme.css", import.meta.url), "utf8"),
  readFile(new URL("../../scripts/legacy-browser/real-browser-walkthrough.mjs", import.meta.url), "utf8"),
]);

test("肌肉区域选项使用范围高亮和移动端卡片布局", () => {
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: "髋前方到膝盖上缘之间的肌肉区" }, "肌肉区域文案表");
  // RQ-S1 定性答复（2026-08-26）：合并后实现为「照片像素坐标 MUSCLE_ZONE_RECTS」单层方案，
  // 手绘路径 MUSCLE_ZONE_PATHS 已移除；atlas-v2 为现行素材，禁令解除，
  // 改为正向校验——picker 引用的每一张区域图必须真实存在于 public/。
  assert.match(picker, /MUSCLE_ZONE_RECTS/);
  assert.match(picker, /MuscleAnatomyMap/);
  // RQ-3 + RQ-S1 定性答复（2026-08-26）：atlas-v2 为现行素材，肌肉示意图重构为
  // 「手绘分区路径 + 照片像素坐标」双层方案（照片层钩子 __photo），禁令全部解除；
  // 改为正向校验——picker 引用的每一张区域图必须真实存在于 public/。
  const referencedImages = [...picker.matchAll(/\/rehabmind-region-[a-z0-9-]+\.png/g)].map((m) => m[0]);
  assert.ok(referencedImages.length >= 1, "区域图引用不应为空");
  for (const ref of referencedImages) {
    assert.ok(
      existsSync(new URL(`.${ref}`, new URL("../../public/", import.meta.url))),
      `picker 引用的图片不存在于 public/：${ref}`,
    );
  }
  // 注：__photo 类为 v2 图（<image href={photo}>）的展示钩子，随 RQ-3/RQ-S1 解禁改为正向断言。
  assert.match(picker, /rm-muscle-location-figure__photo/);
  assert.match(picker, /rm-muscle-location-figure__highlight/);
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: "按图示肌肉区域比较两侧的张力或按压阻力" }, "肌肉区域文案表");
  assert.match(picker, /MuscleRegionTreatmentMap/);
  assert.doesNotMatch(picker, /maxSelections = 2/);
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: "暂不判断" }, "肌肉区域文案表");
  assert.match(picker, /bilateral\?: boolean/);
  assert.match(picker, /const encoded = \(side: "左侧" \| "右侧"\)/);
  assert.match(picker, /sideLocation/);
  assert.match(styles, /\.rm-muscle-location-card\s*\{/);
  assert.match(styles, /rgba\(91, 170, 146, \.24\)/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.rm-muscle-location-grid \{ grid-template-columns: 1fr; /);
});

test("首次评估、后续复查和真实走读共用定位选项", () => {
  assert.equal((demo.match(/<MuscleRegionLocationPicker/g) ?? []).length, 2);
  assert.match(demo, /toggleSharedTensionLocation/);
  assert.match(demo, /toggleFollowupTensionLocation/);
  assert.match(demo, /title="肌肉紧张度对比"/);
  assert.match(demo, /professional=\{isThinkingMode\}/);
  assert.match(demo, /bilateral=\{intake\.side === "双侧\/中间"\}/);
  assert.match(demo, /professional=\{intake\.userRole !== "general"\}/);
  assert.match(demo, /MuscleRegionTreatmentMap locations=\{\[normalizedRegion\.label\]\}/);
  assert.doesNotMatch(demo, /treatmentActionVisuals/);
  assert.match(walkthrough, /\.rm-muscle-location-card/);
});
