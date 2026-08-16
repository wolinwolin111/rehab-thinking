import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/assessment-answer-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("an uncompleted strength check is never silently treated as normal", () => {
  assert.equal(core.strengthAnswerResult("unable"), "unknown");
  assert.equal(core.strengthAnswerResult("unable", "instruction"), "not-testable");
  assert.equal(core.strengthAnswerResult("unable", "no-helper"), "not-testable");
  assert.equal(core.strengthAnswerResult("skip"), "unknown");
});

test("strength unable reasons route pain and control deficits correctly", () => {
  assert.equal(core.strengthAnswerResult("unable", "pain"), "painful");
  assert.equal(core.strengthAnswerResult("unable", "weak"), "weak");
  assert.equal(core.strengthAnswerResult("unable", "control"), "weak");
  assert.equal(core.strengthAnswerForWorkflow("unable", "pain"), "painful");
  assert.equal(core.strengthAnswerForWorkflow("unable", "control"), "weak");
});

test("an uncompleted motion skips questions that require a completed movement", () => {
  assert.equal(core.shouldAskMotionDiscomfort("unable"), false);
  assert.equal(core.shouldAskPairedStrength("unable"), false);
  assert.equal(core.shouldCaptureUnableMotionSymptom("unable", "pain"), true);
  assert.equal(core.shouldCaptureUnableMotionSymptom("unable", "instruction"), false);
  assert.equal(core.shouldAskMotionDiscomfort("limited"), true);
});
