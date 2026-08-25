import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/domain/rehab/retest/chief-change-explanation-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function ctx(overrides = {}) {
  return { comparable: true, baseline: 4, latest: 4, hasRangeImprovement: false, noImmediateResponse: false, ...overrides };
}

test("not comparable yields no explanation", () => {
  assert.equal(core.chiefChangeExplanation(ctx({ comparable: false })), null);
});

test("clear improvement is affirmed and consolidated", () => {
  const text = core.chiefChangeExplanation(ctx({ baseline: 6, latest: 2 }));
  assert.match(text, /疼痛明显下降/);
});

test("small improvement explains the 1-2 day lag", () => {
  const text = core.chiefChangeExplanation(ctx({ baseline: 4, latest: 3 }));
  assert.match(text, /幅度还不大/);
  assert.match(text, /1～2天/);
});

test("zero change with range improvement shifts attention to function trend", () => {
  const text = core.chiefChangeExplanation(ctx({ hasRangeImprovement: true }));
  assert.match(text, /活动范围在改善/);
});

test("zero change after exhausting candidates explains delayed pain response", () => {
  const text = core.chiefChangeExplanation(ctx({ noImmediateResponse: true }));
  assert.match(text, /即时止痛效果不明显/);
  assert.match(text, /不代表方向错误/);
});

test("generic zero change still gives a next step", () => {
  const text = core.chiefChangeExplanation(ctx());
  assert.match(text, /暂时没有变化/);
  assert.match(text, /下次康复会优先复查/);
});

test("negative delta carries a safety-first fallback", () => {
  const text = core.chiefChangeExplanation(ctx({ baseline: 3, latest: 5 }));
  assert.match(text, /不要叠加练习/);
  assert.match(text, /线下专业评估/);
});
