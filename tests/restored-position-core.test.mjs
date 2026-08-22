import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/restored-position-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("SAVE-02: fully answered assessment restores as complete", () => {
  const progress = core.resolveRestoredAssessmentProgress([true, true, true]);
  assert.equal(progress.complete, true);
  assert.equal(progress.firstIncompleteIndex, 3);
});

test("SAVE-02: partial progress locates the first unanswered item", () => {
  const progress = core.resolveRestoredAssessmentProgress([true, true, false, true]);
  assert.equal(progress.complete, false);
  assert.equal(progress.firstIncompleteIndex, 2);
  assert.equal(progress.answeredCount, 3);
});

test("empty assessment list never reports complete", () => {
  const progress = core.resolveRestoredAssessmentProgress([]);
  assert.equal(progress.complete, false);
  assert.equal(progress.total, 0);
  assert.equal(core.restoredAssessmentNotice(progress), null);
});

test("notice copy reports numbers and next step for complete case", () => {
  const text = core.restoredAssessmentNotice(core.resolveRestoredAssessmentProgress([true, true]));
  assert.match(text, /已恢复上次的进度/);
  assert.match(text, /2 项评估都已完成/);
  assert.match(text, /处理复测/);
});

test("notice copy reports position for partial case", () => {
  const text = core.restoredAssessmentNotice(core.resolveRestoredAssessmentProgress([true, false, false]));
  assert.match(text, /第 2\/3 题/);
});
