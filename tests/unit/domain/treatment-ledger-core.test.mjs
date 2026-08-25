import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/treatment/treatment-ledger-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("主诉只有在实际复测到零分时才标记完成", () => {
  const completed = core.completedProblemIdsFromTreatmentRecords([
    { targetId: "target:chief", result: "better", afterScore: 0, chiefRetested: true },
  ]);
  assert.deepEqual([...completed], ["chief"]);

  const unresolved = core.completedProblemIdsFromTreatmentRecords([
    { targetId: "target:chief", result: "better", afterScore: 2, chiefRetested: true },
  ]);
  assert.equal(unresolved.has("chief"), false);
});

test("同一问题后来的加重记录可以重新打开旧的完成状态", () => {
  const completed = core.completedProblemIdsFromTreatmentRecords([
    { targetId: "target:chief", result: "better", afterScore: 0, chiefRetested: true },
    { targetId: "target:chief", result: "worse", afterScore: 4, chiefRetested: true },
  ]);
  assert.equal(completed.has("chief"), false);
});

test("范围方向全部达到对侧时才标记该活动度问题完成", () => {
  const completed = core.completedProblemIdsFromTreatmentRecords([
    {
      targetId: "target:motion:knee-extension",
      result: "partial",
      afterScore: 5,
      rangeOutcomes: {
        "knee-extension": "both-match",
        "knee-flexion": "better-passive-limited",
      },
    },
  ]);
  assert.equal(completed.has("motion:knee-extension"), false);

  const resolved = core.completedProblemIdsFromTreatmentRecords([
    {
      targetId: "target:motion:knee-extension",
      result: "better",
      afterScore: 5,
      rangeOutcomes: {
        "knee-extension": "both-match",
      },
    },
  ]);
  assert.equal(resolved.has("motion:knee-extension"), true);
});

test("复测沿用和残余复查不会伪造问题已解决", () => {
  const completed = core.completedProblemIdsFromTreatmentRecords([
    { targetId: "target:chief", result: "better", afterScore: 0, chiefRetested: true, retestOnly: true },
    { targetId: "target:motion:knee-extension", result: "better", afterScore: 0, reviewOnly: true },
  ], {
    "knee-extension": "limited",
  });
  assert.deepEqual([...completed], []);
});

test("独立范围最新结果可以写入方向完成集合", () => {
  const completed = core.completedProblemIdsFromTreatmentRecords([], {
    "ankle-dorsiflexion": "both-match",
  });
  assert.deepEqual([...completed], ["motion:ankle-dorsiflexion"]);
});
