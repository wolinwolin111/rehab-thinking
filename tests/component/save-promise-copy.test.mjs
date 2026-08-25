// SAVE-01 合同：保存承诺文案必须与真实行为一致（TEST-04：反转任一断言即失败）。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const onboarding = await readFile(new URL("../../src/features/rehabmind/components/onboarding/rehabmind-onboarding.tsx", import.meta.url), "utf8");
const controller = await readFile(new URL("../../src/infrastructure/pilot/persistence/persistence-controller.ts", import.meta.url), "utf8");
const mainComponent = await readFile(new URL("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx", import.meta.url), "utf8");

test("the first value page stays focused on patient value rather than storage internals", () => {
  assert.match(onboarding, /你的线上康复助手/);
  assert.match(onboarding, /把悦舒运动康复的线下经验带到你身边/);
  for (const internalCopy of ["自动保存在本机浏览器", "同步到服务器", "规则引擎", "五步教程"]) {
    assert.doesNotMatch(onboarding, new RegExp(internalCopy));
  }
});

test("local draft autosave is debounced and surfaces honest sync states", () => {
  // 自动保存确实存在：防抖控制器。
  assert.match(controller, /delayMs = 800/);
  assert.match(controller, /setTimeout/);
  // 状态机包含失败与仅本机态，UI 才能如实展示。
  for (const state of ["local-saving", "local-saved", "error"]) {
    assert.match(controller, new RegExp(`"${state}"`));
  }
});

test("topbar renders every sync state including failure and local-only", () => {
  // 每个状态都有用户可见文案；error/offline 不能缺失（SAVE-01 验收核心）。
  for (const label of ["本机保存中", "已保存到本机", "同步中", "已同步", "待处理冲突", "本机保存失败", "仅本机保存"]) {
    assert.match(mainComponent, new RegExp(label));
  }
});
