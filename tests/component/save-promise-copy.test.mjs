// SAVE-01 合同：保存承诺文案必须与真实行为一致（TEST-04：反转任一断言即失败）。
// 文案断言使用 source-contract-assert 输出精准差异（批次 4）。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { expectSourceContains, expectSourceNotContains } from "../support/source-contract-assert.mjs";

const onboarding = await readFile(new URL("../../src/features/rehabmind/components/onboarding/rehabmind-onboarding.tsx", import.meta.url), "utf8");
const controller = await readFile(new URL("../../src/infrastructure/pilot/persistence/persistence-controller.ts", import.meta.url), "utf8");
const mainComponent = await readFile(new URL("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx", import.meta.url), "utf8");

test("the first value page stays focused on patient value rather than storage internals", () => {
  expectSourceContains(onboarding, { file: "rehabmind-onboarding.tsx", snippet: "你的线上康复助手" }, "SAVE-01 首屏价值承诺");
  // RQ-1 定性答复（2026-08-26）：价值承诺句 = 欢迎页三行 grid 首行，旧长句废弃。
  assert.match(
    onboarding,
    /rm-welcome-lines"><span>把线下康复经验带到这里<\/span>/,
    "价值承诺句必须是欢迎页三行 grid 的第一行",
  );
  for (const internalCopy of ["自动保存在本机浏览器", "同步到服务器", "规则引擎", "五步教程"]) {
    if (onboarding.includes(internalCopy)) {
      assert.fail(`[源码合同] rehabmind-onboarding.tsx 出现内部存储口吻文案（SAVE-01）：${JSON.stringify(internalCopy)}`);
    }
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
  // RQ-2 定性答复（2026-08-26）：桌面顶栏降噪——正常流转态静默，仅异常态显示文字。
  // 新验收文案表：offline=网络断开正在本机保存 / conflict=待处理冲突 / error=本机保存失败 / 其余异常兜底=仅本机保存。
  const abnormalLabels = ["待处理冲突", "本机保存失败", "网络断开，正在本机保存", "仅本机保存"];
  for (const label of abnormalLabels) {
    expectSourceContains(mainComponent, { file: "rehabmind-workbench.tsx", snippet: label }, "SAVE-01 降噪后异常态文案表");
  }
  // 正常态静默：以下旧常驻标签不得回归顶栏（已保存到本机 例外：存在于保存浮动卡片，不在顶栏断言范围）。
  for (const silentLabel of ["本机保存中", "同步中", "已同步"]) {
    expectSourceNotContains(mainComponent, { file: "rehabmind-workbench.tsx", snippet: silentLabel }, "SAVE-01 降噪设计");
  }
});
