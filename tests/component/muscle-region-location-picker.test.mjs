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
  // 83e47be 清理了 legacy-browser 走读脚本；文件缺失时跳过相关走读断言。
  readFile(new URL("../../scripts/legacy-browser/real-browser-walkthrough.mjs", import.meta.url), "utf8").catch(() => null),
]);

test("肌肉区域选项使用范围高亮和移动端卡片布局", () => {
  // v3（对照表 #9）：肌群文案表改为「标签 + 四视角解剖底图」结构，不再使用长文范围描述。
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: 'label: "大腿前侧"' }, "肌肉区域文案表");
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: 'label: "小腿后内侧"' }, "肌肉区域文案表");
  // v3（对照表 #9）：肌肉示意图重构为「手绘 SVG 分区路径 + 四视角解剖底图」；
  // MUSCLE_ZONE_RECTS 像素坐标方案已退役，改为 MUSCLE_ZONE_PATHS 单层路径方案。
  assert.match(picker, /MUSCLE_ZONE_PATHS/);
  assert.match(picker, /PLANTAR_ZONE_PATH/);
  assert.match(picker, /MuscleAnatomyMap/);
  // v3（对照表 #9）：四视角独立底图（front/back/lateral/medial），正向校验——
  // picker 引用的每一张底图必须真实存在于 public/。
  const referencedImages = [...picker.matchAll(/\/rehabmind-lower-limb-[a-z0-9-]+\.png/g)].map((m) => m[0]);
  assert.ok(referencedImages.length >= 4, "四视角底图引用不应为空");
  for (const ref of referencedImages) {
    assert.ok(
      existsSync(new URL(`.${ref}`, new URL("../../public/", import.meta.url))),
      `picker 引用的图片不存在于 public/：${ref}`,
    );
  }
  // 注：__photo 类为 v2 图（<image href={photo}>）的展示钩子，随 RQ-3/RQ-S1 解禁改为正向断言。
  assert.match(picker, /rm-muscle-location-figure__photo/);
  assert.match(picker, /rm-muscle-location-figure__highlight/);
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: "左右各轻按一次，选择张力或按压阻力更明显的区域。" }, "肌肉区域文案表");
  assert.match(picker, /MuscleRegionTreatmentMap/);
  assert.doesNotMatch(picker, /maxSelections = 2/);
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: "暂不判断" }, "肌肉区域文案表");
  assert.match(picker, /bilateral\?: boolean/);
  assert.match(picker, /const encoded = \(selectionSide: "左侧" \| "右侧"\)/);
  assert.match(picker, /sideLocation/);
  assert.match(styles, /\.rm-muscle-location-card\s*\{/);
  assert.match(styles, /rgba\(130, 178, 168, \.16\)/);
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
  if (walkthrough) assert.match(walkthrough, /\.rm-muscle-location-card/);
});

test("C-3 小腿四圈解剖复核签署 reviewed（data-overlay-review 透出 overlayReviewStatus）", () => {
  // b67ee5e/228a9aa：纯视觉叠加（MUSCLE_ZONE_PATHS path 几何），不改选择逻辑/选项文案/数据字段。
  // 唯一机器可校验契约：figure 把 overlayReviewStatus 透出到 data-overlay-review（选择/文案不变）。
  expectSourceContains(picker, { file: "muscle-region-location-picker.tsx", snippet: "data-overlay-review={spec.overlayReviewStatus}" }, "overlay 复核状态透出");
  // C-3 解剖复核签署：四个小腿圈肌腹范围 reviewed（前侧嵴外移+下收 59%、后侧止跟腱上方、外侧 63%、后内侧窄带）。
  // 只锁 calf（本批交付），不锁 thigh=pending（下批复核大腿会翻转，避免迁移税）。path 几何不做像素断言（§8）。
  // 搜索域限定到 MUSCLE_ZONE_PATHS 对象内（"calf-anterior" 等键在别处 map 也出现，跨块会误抓 thigh 的 pending）。
  const zoneStart = picker.indexOf("const MUSCLE_ZONE_PATHS");
  assert.ok(zoneStart >= 0, "MUSCLE_ZONE_PATHS 常量必须存在");
  const zoneSrc = picker.slice(zoneStart, picker.indexOf("\n};", zoneStart));
  for (const region of ["calf-anterior", "calf-posterior", "calf-lateral", "calf-medial"]) {
    const m = zoneSrc.match(new RegExp(`"${region}"[\\s\\S]*?overlayReviewStatus:\\s*"([a-z]+)"`));
    assert.equal(m?.[1], "reviewed", `${region} overlayReviewStatus 应为 reviewed（C-3 解剖复核签署）`);
  }
});
