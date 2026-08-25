import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/training/training-progression-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const { adjustedTrainingExerciseId, nextSessionTrainingIds, INITIAL_TRAINING_PRIORITY } = await import(moduleUrl);

test("knee posterior-chain progression advances bridge before standing work", () => {
  assert.equal(adjustedTrainingExerciseId({ id: "knee-bridge", adjustment: "progress" }), "knee-single-leg-bridge");
  assert.equal(adjustedTrainingExerciseId({ id: "knee-single-leg-bridge", adjustment: "progress" }), "knee-standing-hip-flexion");
});

test("ankle directional progression prioritises function after dorsiflexion and eversion control", () => {
  const ids = nextSessionTrainingIds([
    { id: "ankle-dorsiflexion-control", adjustment: "progress" },
    { id: "ankle-eversion-control", adjustment: "progress" },
  ], ["ankle-gait-weightshift", "ankle-band-heelraise"]);
  assert.deepEqual(ids, ["ankle-gait-weightshift", "ankle-band-heelraise"]);
  assert.deepEqual(INITIAL_TRAINING_PRIORITY["ankle-foot"], ["ankle-dorsiflexion-control", "ankle-eversion-control"]);
});

test("reduce steps back within the same ability chain", () => {
  assert.equal(adjustedTrainingExerciseId({ id: "knee-standing-hip-flexion", adjustment: "reduce" }), "knee-single-leg-bridge");
  assert.equal(adjustedTrainingExerciseId({ id: "knee-bridge", adjustment: "reduce" }), "knee-bridge");
});
