import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/domain/rehab/shared/downstream-invalidation-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: es2022Target() },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function es2022Target() {
  return ts.ScriptTarget.ES2022;
}

test("intake change invalidates every downstream scope group", () => {
  const groups = core.resolveDownstreamInvalidation("intake-change");
  assert.deepEqual(groups, core.DOWNSTREAM_SCOPE_GROUPS);
  assert.ok(groups.includes("safety"));
  assert.ok(groups.includes("assessment"));
  assert.ok(groups.includes("treatment-queue"));
  assert.ok(groups.includes("session-history"));
});

test("followup review answer change only clears the current followup session", () => {
  const groups = core.resolveDownstreamInvalidation("followup-review-answer");
  assert.deepEqual(groups, ["followup-current-session"]);
  assert.equal(groups.includes("session-history"), false);
  assert.equal(groups.includes("followup-review-inputs"), false);
});

test("followup work is invalidated when the score was never confirmed", () => {
  // 首次输入分数也作废：之前的工作建立在未确认状态上。
  assert.equal(core.shouldInvalidateFollowupWork({ confirmed: false, current: 0, next: 0 }), true);
  assert.equal(core.shouldInvalidateFollowupWork({ confirmed: false, current: 3, next: 3 }), true);
});

test("confirmed identical score keeps followup work; a different score invalidates it", () => {
  assert.equal(core.shouldInvalidateFollowupWork({ confirmed: true, current: 3, next: 3 }), false);
  assert.equal(core.shouldInvalidateFollowupWork({ confirmed: true, current: 3, next: 2 }), true);
});

test("trend answers invalidate on any value change and keep work when unchanged", () => {
  // 趋势场景以 confirmed=true 传入，退化为纯值比较。
  assert.equal(core.shouldInvalidateFollowupWork({ confirmed: true, current: "better", next: "worse" }), true);
  assert.equal(core.shouldInvalidateFollowupWork({ confirmed: true, current: "same", next: "same" }), false);
});

test("invalidating current followup work keeps records from other sessions", () => {
  const records = [
    { sessionNumber: 1, candidateId: "a" },
    { sessionNumber: 2, candidateId: "b" },
    { sessionNumber: 2, candidateId: "c" },
    { sessionNumber: 3, candidateId: "d" },
  ];
  const kept = core.keepOtherSessionRecords(records, 2);
  assert.deepEqual(kept.map((item) => item.candidateId), ["a", "d"]);
  assert.equal(core.keepOtherSessionRecords([], 2).length, 0);
});
