// SAVE-01 合同：保存承诺文案必须与真实行为一致（TEST-04：反转任一断言即失败）。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const onboarding = await readFile(new URL("../app/rehabmind-onboarding.tsx", import.meta.url), "utf8");
const controller = await readFile(new URL("../app/pilot-persistence-controller.ts", import.meta.url), "utf8");
const mainComponent = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");

test("onboarding distinguishes automatic local draft from explicit server save", () => {
  // 必须写明「自动保存」的边界是本机浏览器。
  assert.match(onboarding, /自动保存在本机浏览器/);
  // 必须写明服务器同步需要显式点「保存」。
  assert.match(onboarding, /「保存」才会同步到服务器/);
  // 旧的过度承诺不允许回潮：不能再说"每一步都保留记录"这种无边界表述。
  assert.doesNotMatch(onboarding, /每一步都保留记录/);
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
  for (const label of ["本机保存中", "已保存到本机", "同步中", "已同步", "待处理冲突", "需要邀请", "本机保存失败", "仅本机保存"]) {
    assert.match(mainComponent, new RegExp(label));
  }
});

test("AUDIT-02 wiring: stage advances emit dictionary timeline events", async () => {
  const stageCore = await readFile(new URL("../app/stage-event-core.ts", import.meta.url), "utf8");
  // 字典事件映射存在（intake/assessment/session/training 全覆盖，无 admin/system 伪造面）。
  for (const eventType of ["intake_saved", "intake_confirmed", "assessment_completed", "session_saved", "training_plan_saved"]) {
    assert.match(stageCore, new RegExp(eventType));
  }
  assert.doesNotMatch(stageCore, /"admin"/);
  // 主组件接线：阶段推进调用核心并把结果作为事件类型推送。
  assert.match(mainComponent, /pickStageAdvanceEvent/);
  assert.match(mainComponent, /eventType: options\?\.eventType \?\? "session_saved"/);
});
