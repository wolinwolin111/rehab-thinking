import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeTsxLoader, loadTsxModule } from "../../support/load-tsx-module.mjs";

const support = await loadTsxModule("/src/features/rehabmind/components/workbench/workbench-support.tsx");

after(async () => {
  await closeTsxLoader();
});

test("显式的 baselineScoreConfirmed 一律尊重原值", () => {
  assert.equal(support.restoredBaselineScoreConfirmed({ baselineScoreConfirmed: true, baselineScore: 0 }), true);
  assert.equal(support.restoredBaselineScoreConfirmed({ baselineScoreConfirmed: false, baselineScore: 7 }), false);
});

test("字段缺失时按内容感知推断：有正分数视为已确认，零分或缺失视为未确认", () => {
  assert.equal(support.restoredBaselineScoreConfirmed({ baselineScore: 5 }), true);
  assert.equal(support.restoredBaselineScoreConfirmed({ baselineScore: 0 }), false);
  assert.equal(support.restoredBaselineScoreConfirmed({}), false);
  assert.equal(support.restoredBaselineScoreConfirmed({ baselineScore: undefined }), false);
});
