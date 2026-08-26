import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/domain/rehab/intake/trauma-mechanism-consistency-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("描述提到受伤但起病方式选了没有明确受伤时产生温和确认提示", () => {
  const hint = core.traumaMechanismMismatchHint({ description: "昨天下楼梯崴了一下", mechanism: "没有明确受伤" });
  assert.ok(hint);
  assert.match(hint, /没有明确受伤/);
  assert.match(hint, /急性保护/);
});

test("起病方式选了受伤类机制时不提示", () => {
  assert.equal(core.traumaMechanismMismatchHint({ description: "昨天下楼梯崴了一下", mechanism: "扭转或崴伤" }), null);
  assert.equal(core.traumaMechanismMismatchHint({ description: "昨天下楼梯崴了一下", mechanism: "跌倒或碰撞" }), null);
});

test("起病方式尚未选择时不提示（未选不构成矛盾）", () => {
  assert.equal(core.traumaMechanismMismatchHint({ description: "昨天下楼梯崴了一下", mechanism: "" }), null);
});

test("描述没有外伤词时不提示（反向矛盾只偏保守，不打扰）", () => {
  assert.equal(core.traumaMechanismMismatchHint({ description: "慢慢开始疼，说不清原因", mechanism: "没有明确受伤" }), null);
});

test("外伤词识别覆盖既有关键词表", () => {
  for (const word of ["崴", "扭伤", "拉伤", "摔", "跌", "撞", "落地", "外伤"]) {
    assert.equal(core.descriptionSuggestsTraumaText(`描述包含${word}一词`), true, word);
  }
  assert.equal(core.descriptionSuggestsTraumaText("慢慢开始疼"), false);
  assert.equal(core.descriptionSuggestsTraumaText(""), false);
});
