import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [picker, demo, styles, walkthrough] = await Promise.all([
  readFile(new URL("../app/muscle-region-location-picker.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/rm-visual-theme.css", import.meta.url), "utf8"),
  readFile(new URL("../scripts/real-browser-walkthrough.mjs", import.meta.url), "utf8"),
]);

test("肌肉区域选项使用范围高亮和移动端卡片布局", () => {
  assert.match(picker, /髋前方到膝盖上缘之间的肌肉区/);
  assert.match(picker, /MUSCLE_ZONE_PATHS/);
  assert.match(picker, /MuscleAnatomyMap/);
  assert.doesNotMatch(picker, /rehabmind-region-.*atlas-v2\.png/);
  assert.doesNotMatch(picker, /rm-muscle-location-figure__photo/);
  assert.match(picker, /rm-muscle-location-figure__highlight/);
  assert.match(picker, /按图示肌肉区域比较两侧的张力或按压阻力/);
  assert.match(picker, /MuscleRegionTreatmentMap/);
  assert.doesNotMatch(picker, /maxSelections = 2/);
  assert.match(picker, /暂不判断/);
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
