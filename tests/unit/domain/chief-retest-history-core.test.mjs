import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/chief-retest-history-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("主诉复测历史排除残余复查项", () => {
  const records = [
    { chiefRetested: true, afterScore: 2 },
    { chiefRetested: true, reviewOnly: true, afterScore: 0 },
  ];
  assert.equal(core.hasRecordedChiefRetest(records), true);
  assert.deepEqual(core.recordedChiefRetestRecords(records), [records[0]]);
  assert.equal(core.latestRecordedChiefScore(records, 5), 2);
});

test("主诉没有真实复测时保留基线分数", () => {
  assert.equal(core.hasRecordedChiefRetest([{ afterScore: 0 }, { chiefRetested: false, afterScore: 1 }]), false);
  assert.equal(core.latestRecordedChiefScore([{ afterScore: 0 }], 5), 5);
});

test("同一处理阶段取最后一条真实主诉复测分数", () => {
  assert.equal(core.latestRecordedChiefScore([
    { chiefRetested: true, afterScore: 4 },
    { chiefRetested: true, afterScore: 1 },
  ], 5), 1);
});
