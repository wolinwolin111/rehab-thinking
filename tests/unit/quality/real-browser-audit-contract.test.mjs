import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readRehabMindUiSource } from "../../support/read-rehabmind-ui-source.mjs";

const root = process.cwd();
// 83e47be 清理了 legacy-browser 脚本；文件缺失时跳过针对这些脚本的断言，
// 保留仍然有效的 UI 源与审计文档契约。
const readOptional = (file) => {
  try {
    return fs.readFileSync(path.join(root, file), "utf8");
  } catch {
    return null;
  }
};
const audit = readOptional("scripts/legacy-browser/real-browser-flow-audit.mjs");
const ankleWalkthrough = readOptional("scripts/legacy-browser/real-browser-walkthrough-ankle.mjs");
const guide = fs.readFileSync(path.join(root, "docs", "quality", "real-browser-flow-audit.md"), "utf8");
const demo = await readRehabMindUiSource();

test("real browser audit requires fresh snapshots, terminal exits and zero runtime errors", () => {
  if (audit) {
    assert.match(audit, /domSnapshot\(\)/);
    assert.match(audit, /auditNoRuntimeErrors/);
    assert.match(audit, /没有按钮，也没有明确结束出口/);
  }
  assert.match(guide, /每次点击后立即重新读取/);
  assert.match(guide, /普通用户·膝前痛/);
  assert.match(guide, /专业用户·膝前痛/);
});

test("real browser audit protects the merged patella group and latest score", () => {
  if (audit) {
    assert.match(audit, /rm-patella-direction/);
    assert.match(audit, /cards !== 4/);
    assert.match(audit, /髌骨向上滑动/);
    assert.match(audit, /auditPatellaTreatmentUnit/);
    assert.match(audit, /髌骨向\(\?:上\|下\|内\|外\)滑动辅助/);
    assert.match(audit, /auditConditionalHomeRelaxation/);
    assert.match(audit, /auditSummaryScore/);
  }
  assert.match(guide, /总结显示5→3/);
  assert.match(demo, /chiefScoreShownAndRecorded/);
  assert.match(demo, /PATELLA_DIRECTION_IDS[\s\S]*rankedWithPatella/);
  assert.match(demo, /PATELLA_DIRECTION_TITLES/);
  assert.match(demo, /rm-treatment-unit-followup is-patella/);
  assert.match(demo, /homeRelaxationTargets/);
  assert.match(demo, /训练结束后/);
});

test("real browser audit protects the direction-baseline and summary score contract", () => {
  assert.match(guide, /脚底向外转/);
  assert.match(guide, /初次6分 → 结束复测2分/);
  assert.match(demo, /activeMotionRecordComplete\(record, false\)/);
  assert.match(demo, /retestBaselineModeFromEvidence\(chiefBaselineEvidence\)/);
  assert.match(demo, /targetChiefRetestAllowed/);
  assert.match(demo, /chiefScoreRetestBlocked/);
});

test("ankle walkthrough keeps the acute-sprain end-to-end contract", () => {
  if (!ankleWalkthrough) return;
  assert.match(ankleWalkthrough, /昨晚崴了右脚/);
  assert.match(ankleWalkthrough, /右侧 · 外踝 \/ 前外侧/);
  assert.match(ankleWalkthrough, /患侧偏小/);
  assert.match(ankleWalkthrough, /训练完成，整体复测/);
  assert.match(ankleWalkthrough, /保存本次记录/);
  assert.match(ankleWalkthrough, /assert\.equal\(runtimeErrors\.length, 0/);
  assert.match(ankleWalkthrough, /assert\.equal\(savedSummary, true/);
  assert.match(guide, /崴脚自动走读脚本维护/);
});
