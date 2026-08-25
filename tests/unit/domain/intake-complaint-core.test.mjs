import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/intake/intake-complaint-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("historical ankle facts do not replace the current knee complaint", () => {
  const text = core.currentComplaintText("以前右脚踝崴过，但现在脚踝不疼也不肿；这次只是左膝下楼时内侧疼。");
  assert.doesNotMatch(text, /右脚踝崴过|脚踝不疼/);
  assert.match(text, /左膝下楼时内侧疼/);
});

test("persistent old injury remains a current complaint", () => {
  const text = core.currentComplaintText("三个月前右脚踝崴伤一直没好，走路外踝仍疼。");
  assert.match(text, /一直没好/);
  assert.match(text, /外踝仍疼/);
});

test("multiple current locations remain separate clauses", () => {
  const segments = core.currentComplaintSegments("右脚踝走路疼；左膝下楼也疼；右小腿偶尔发麻。");
  assert.equal(segments.length, 3);
});

test("explicit current comparison extracts the priority side", () => {
  assert.equal(core.extractComplaintPrioritySide("两个膝盖都疼，下楼时右侧更明显。"), "右侧");
  assert.equal(core.extractComplaintPrioritySide("左右两侧都有不适，左边厉害一些。"), "左侧");
  assert.equal(core.extractComplaintPrioritySide("上下楼都难受，右膝症状更重。"), "右侧");
});

test("comparison against the other side keeps the first side as priority", () => {
  assert.equal(core.extractComplaintPrioritySide("右侧比左侧更明显。"), "右侧");
  assert.equal(core.extractComplaintPrioritySide("左侧比右侧更明显。"), "左侧");
});

test("historical side complaints do not win over the current one", () => {
  assert.equal(core.extractComplaintPrioritySide("以前右侧疼过，现在左侧更明显。"), "左侧");
});

test("no comparative wording yields no prefill", () => {
  assert.equal(core.extractComplaintPrioritySide("两个膝盖都疼。"), undefined);
  assert.equal(core.extractComplaintPrioritySide("两侧没有哪侧更明显。"), undefined);
});
