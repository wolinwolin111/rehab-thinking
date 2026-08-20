import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/training-feedback-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const exercises = [{ id: "a", title: "动作A" }, { id: "b", title: "动作B" }];

test("training is incomplete until every action has immediate feedback", () => {
  assert.deepEqual(core.pendingTrainingFeedback(exercises, { a: { symptom: "same" } }).map((item) => item.id), ["b"]);
  assert.equal(core.trainingFeedbackComplete(exercises, { a: { symptom: "same" } }), false);
  assert.equal(core.trainingWasExecuted(exercises, { a: { symptom: "same" } }), false);
});

test("a feedback record for every action closes execution without inferring improvement", () => {
  const feedback = { a: { symptom: "worse" }, b: { symptom: "same" } };
  assert.deepEqual(core.pendingTrainingFeedback(exercises, feedback), []);
  assert.equal(core.trainingFeedbackComplete(exercises, feedback), true);
  assert.equal(core.trainingWasExecuted(exercises, feedback), true);
});

test("an empty plan can be closed without pretending that training was executed", () => {
  assert.equal(core.trainingFeedbackComplete([], {}), true);
  assert.equal(core.trainingWasExecuted([], {}), false);
});
