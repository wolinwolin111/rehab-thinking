import assert from "node:assert/strict";
import test from "node:test";

import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const { mobileSaveStatus, mobileStageAvailable } = await loadTypeScriptModule(
  "./src/features/rehabmind/components/navigation/mobile-navigation-core.ts",
);

test("mobile save status never reports an untouched case as saved", () => {
  assert.equal(mobileSaveStatus("idle"), "未保存");
  assert.equal(mobileSaveStatus("local-saving"), "··");
  assert.equal(mobileSaveStatus("syncing"), "··");
  assert.equal(mobileSaveStatus("local-saved"), "✓");
  assert.equal(mobileSaveStatus("synced"), "✓");
  assert.equal(mobileSaveStatus("offline"), "仅保存在本机");
  assert.equal(mobileSaveStatus("conflict"), "保存待处理");
  assert.equal(mobileSaveStatus("error"), "保存失败");
});

test("mobile stage drawer follows the same unlocked-stage boundary", () => {
  const base = { railStep: 2, currentStep: 2, maxUnlocked: 3, followupMode: false };
  assert.equal(mobileStageAvailable({ ...base, targetStep: 0 }), true);
  assert.equal(mobileStageAvailable({ ...base, targetStep: 2 }), true);
  assert.equal(mobileStageAvailable({ ...base, targetStep: 3 }), true);
  assert.equal(mobileStageAvailable({ ...base, targetStep: 4 }), false);
});

test("follow-up navigation cannot jump beyond its current stage", () => {
  const base = { railStep: 3, currentStep: 5, maxUnlocked: 5, followupMode: true };
  assert.equal(mobileStageAvailable({ ...base, targetStep: 3 }), true);
  assert.equal(mobileStageAvailable({ ...base, targetStep: 4 }), false);
});
