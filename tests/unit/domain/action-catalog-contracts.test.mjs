import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

// 动作库批次 0–7 行为契约（值锁定，不钉标签字面）。
// 来源：docs/handover/test-notice-2026-09-01-batch-sha-bindings.md 第 15–21 轮 + master §10/§13。
// 原则：值契约永久锁死（same/limited/unable/… 为决策层输入），标签文案按动作可改——
// 断言一律走「值」与「值→行为」，标签仅做前缀存在性弱检查。

const index = await loadTypeScriptModule("./src/knowledge/actions/index.ts");
// OPTION_BASES 未从 index 转发，直接加载纯数据模块（值契约的事实源）。
const optionSets = await loadTypeScriptModule("./src/knowledge/actions/option-sets.ts");
const BASES = () => optionSets.OPTION_BASES;

test("选项值契约锁死：function-completion 三联（值不变，标签可按动作定制）", () => {
  // base 值顺序决定按钮顺序：complete → unable → skip。
  assert.deepEqual(BASES()["function-completion"].values, ["complete", "unable", "skip"]);
  // 定制条目（knee-squat）：值不变，标签换。
  const squat = index.renderOptions("knee-squat", "function-completion", "guided");
  assert.deepEqual(squat.map((o) => o.value), ["complete", "unable", "skip"]);
  // 未定制条目回落 base 默认标签（通用三联仍存在于兜底层）。
  const generic = index.renderOptions("nonexistent-entry-xyz", "function-completion", "guided");
  assert.deepEqual(generic.map((o) => o.value), ["complete", "unable", "skip"]);
  assert.equal(generic[0].label, "可以做完");
  // guided/thinking 双轨：条目可用不同语域覆盖标签，值仍一致。
  const pro = index.renderOptions("knee-squat", "function-completion", "thinking");
  assert.deepEqual(pro.map((o) => o.value), squat.map((o) => o.value));
});

test("选项值契约锁死：unable-reason 四套", () => {
  assert.deepEqual(BASES()["unable-reason-motion"].values, ["pain", "fear", "instruction"]);
  assert.deepEqual(BASES()["unable-reason-function"].values, ["pain", "weak", "fear", "instruction"]);
  assert.deepEqual(BASES()["unable-reason-strength"].values, ["pain", "weak", "fear", "instruction"]);
  assert.deepEqual(BASES()["unable-reason-special"].values, ["pain", "fear", "safety-signal", "cannot-perform"]);
  // strength 收敛为界面真实 4 值（no-helper/control 为 UI 无入口遗留，不得回潜）。
  assert.equal(BASES()["unable-reason-strength"].values.includes("no-helper"), false);
  assert.equal(BASES()["unable-reason-strength"].values.includes("control"), false);
  // unableFollowUp 输出与 base 同源：值一致、按值可查。
  const fn = index.unableFollowUp("function", "guided");
  assert.deepEqual(fn.reasons.map((r) => r.value), ["pain", "weak", "fear", "instruction"]);
  // guidance 已按裁定全删（纯展示零消费）：motion/function 的 guidanceFor 不再返回引导。
  for (const kind of ["motion", "function", "strength", "special"]) {
    const pack = index.unableFollowUp(kind, "guided");
    for (const r of pack.reasons) {
      assert.equal(pack.guidanceFor(r.value), undefined, `${kind}:${r.value} 不应再有引导`);
    }
  }
});

test("选项值契约锁死：range-function 四联与 retest-outcome 五值", () => {
  assert.deepEqual(BASES()["range-function"].values, ["complete-stable", "complete-compensated", "unable", "skip"]);
  assert.deepEqual(BASES()["retest-outcome"].values, ["better", "same", "worse", "unknown", "unable"]);
  assert.deepEqual(BASES()["strength-answer"].values, ["normal", "weak", "painful", "unable", "skip"]);
});

test("ankle-intrinsic 临床变更：缩短脚掌 → 踮脚尖（可执行动作）", async () => {
  // 批次 4（5c04c3a，临床动作变更非纯文案）：原「尝试缩短脚掌、轻抬足弓」不可执行，
  // 改「轻轻踮起脚尖再放下」（heel-raise-standing）；作答/记录链路走 strength optionSet 不变。
  const { ASSESSMENT_BY_ID } = await loadTypeScriptModule("./src/knowledge/actions/assessment.ts");
  const entry = ASSESSMENT_BY_ID.get("ankle-intrinsic");
  assert.ok(entry, "ankle-intrinsic 目录条目必须存在");
  assert.equal(entry.kind, "strength");
  assert.ok(entry.actions.includes("heel-raise-standing"), "动作应为踮脚尖（heel-raise-standing）");
  for (const mode of ["plain", "pro"]) {
    assert.ok(entry.how[mode].includes("踮起脚尖"), `${mode} how 应含踮脚尖动作`);
    assert.equal(entry.how[mode].includes("缩短脚掌"), false, `${mode} how 不应残留旧动作`);
  }
  assert.equal(entry.title.plain, "踮脚尖力量");
  // 旧标题兜底已删（d27c4d7 R-1~R-3）：assessmentTitle 只出目录新标题。
  assert.equal(index.assessmentTitle("ankle-intrinsic", "guided"), "踮脚尖力量");
  assert.equal(index.assessmentTitle("ankle-intrinsic", "thinking"), "踮脚尖力量");
});

test("力量族标题 owner 裁定四条（批次 6 f523005..c004ef3）", () => {
  assert.equal(index.assessmentTitle("knee-quadriceps", "guided"), "膝盖伸直力量");
  assert.equal(index.assessmentTitle("ankle-evertor", "guided"), "外翻力量（腓骨肌）");
  assert.equal(index.assessmentTitle("ankle-invertor", "guided"), "内翻力量（胫骨后肌）");
  assert.equal(index.assessmentTitle("ankle-intrinsic", "guided"), "踮脚尖力量");
});

test("boundaries 新规则在案：catalog 禁 import 消费方 + domain 仅白名单（批次 7 8e6ece5，防静默移除）", async () => {
  // 行为由 check:boundaries 执行（fast 已含）；此处锁护栏实现存在，防止检查被删后规则失效。
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../../../scripts/quality/check-architecture-boundaries.mjs", import.meta.url), "utf8");
  assert.match(src, /actionCatalogRules\.catalogForbiddenProjectRoots/, "catalog 反向 import 护栏必须存在");
  assert.match(src, /domain-non-index-actions-import/, "domain 白名单护栏必须存在");
  assert.match(src, /allowedExternalImportsFor/, "domain 白名单数据键必须存在");
});
