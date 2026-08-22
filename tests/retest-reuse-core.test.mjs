import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/retest-reuse-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const base = {
  carryoverOnly: true,
  hasLatestTrialRecord: true,
  latestMatchingRangeRecordIndex: -1,
  latestTreatmentRecordIndex: 2,
  reusableDirectionCount: 0,
};

test("a chief retest cannot be reused for a different function action", () => {
  assert.equal(core.canReuseLatestRetest({
    ...base,
    latestRetestActionKey: "下楼梯",
    plannedRetestActionKey: "下蹲",
  }), false);
});

test("the same retest action can still consume the latest result", () => {
  assert.equal(core.canReuseLatestRetest({
    ...base,
    latestRetestActionKey: "下楼梯",
    plannedRetestActionKey: "下楼梯",
  }), true);
});

test("a matching range direction can still consume the latest result", () => {
  assert.equal(core.canReuseLatestRetest({
    ...base,
    latestMatchingRangeRecordIndex: 2,
    latestRetestActionKey: "下楼梯",
    plannedRetestActionKey: "膝伸直",
    reusableDirectionCount: 1,
  }), true);
});
