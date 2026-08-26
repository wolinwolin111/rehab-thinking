import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/training/training-feedback-core.ts", import.meta.url), "utf8");
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

test("T-10: 把已记录加重的动作改为其它反馈时要求确认", () => {
  const previous = { symptom: "worse" };
  assert.deepEqual(core.planQuickFeedbackRecord(previous, "hold", 10), { requiresConfirmation: true });
  assert.deepEqual(core.planQuickFeedbackRecord(previous, "reduce", 10), { requiresConfirmation: true });
});

test("T-10: 无加重记录或继续记录加重时不需要确认并直接给出反馈", () => {
  const first = core.planQuickFeedbackRecord(undefined, "worse", 10);
  assert.equal(first.requiresConfirmation, false);
  assert.equal(first.feedback.symptom, "worse");
  assert.deepEqual(first.feedback.symptomHistory, []);
  const mild = core.planQuickFeedbackRecord({ symptom: "same" }, "hold", 10);
  assert.equal(mild.requiresConfirmation, false);
  assert.deepEqual(mild.feedback.symptomHistory, []);
});

test("T-10: 确认改口后加重事实进入历史，再次改回加重时历史保留", () => {
  const confirmed = core.planQuickFeedbackRecord({ symptom: "worse" }, "hold", 10, { confirmed: true });
  assert.equal(confirmed.requiresConfirmation, false);
  assert.equal(confirmed.feedback.symptom, "same");
  assert.deepEqual(confirmed.feedback.symptomHistory, ["worse"]);
  const backToWorse = core.planQuickFeedbackRecord(
    { symptom: "same", symptomHistory: ["worse"] },
    "worse",
    10,
  );
  assert.equal(backToWorse.requiresConfirmation, false);
  assert.equal(backToWorse.feedback.symptom, "worse");
  assert.deepEqual(backToWorse.feedback.symptomHistory, ["worse", "same"]);
  const washedAgain = core.planQuickFeedbackRecord(
    { symptom: "worse", symptomHistory: ["worse", "same"] },
    "hold",
    10,
    { confirmed: true },
  );
  assert.deepEqual(washedAgain.feedback.symptomHistory, ["worse", "same", "worse"]);
});

test("T-10: 各快速模式生成的反馈数值保持既有约定", () => {
  assert.deepEqual(
    { ...core.planQuickFeedbackRecord(undefined, "reduce", 10).feedback, symptomHistory: [] },
    { completed: 7, formChanged: true, symptom: "same", reserve: 0, symptomHistory: [] },
  );
  assert.deepEqual(
    { ...core.planQuickFeedbackRecord(undefined, "progress", 10).feedback, symptomHistory: [] },
    { completed: 10, formChanged: false, symptom: "same", reserve: 5, symptomHistory: [] },
  );
  assert.deepEqual(
    { ...core.planQuickFeedbackRecord(undefined, "hold", 10).feedback, symptomHistory: [] },
    { completed: 10, formChanged: false, symptom: "same", reserve: 3, symptomHistory: [] },
  );
  assert.equal(core.planQuickFeedbackRecord(undefined, "worse", 10).feedback.completed, 10);
});
