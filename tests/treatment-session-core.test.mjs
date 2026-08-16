import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/treatment-session-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("a worsening treatment stops both first and follow-up session executors", () => {
  assert.equal(core.treatmentMustStop([{ result: "worse" }]), true);
  assert.equal(core.treatmentMustStop([{ result: "worse", reviewOnly: true }]), false);
});

test("a final chief retest is required only when treatment followed the latest chief score", () => {
  assert.equal(core.needsTreatmentFinalChiefRetest([{ result: "partial", chiefRetested: true }], true), false);
  assert.equal(core.needsTreatmentFinalChiefRetest([
    { result: "partial", chiefRetested: true },
    { result: "same" },
  ], true), true);
  assert.equal(core.needsTreatmentFinalChiefRetest([{ result: "same" }], false), false);
});

test("training retest appears only after an exercise answer in an immediate path", () => {
  assert.equal(core.needsTrainingToleranceRetest({ comparableChief: true, immediateTiming: true, answeredExerciseCount: 0 }), false);
  assert.equal(core.needsTrainingToleranceRetest({ comparableChief: true, immediateTiming: true, answeredExerciseCount: 1 }), true);
  assert.equal(core.needsTrainingToleranceRetest({ comparableChief: true, immediateTiming: false, answeredExerciseCount: 2 }), false);
});
