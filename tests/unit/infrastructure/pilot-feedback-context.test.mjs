import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/infrastructure/pilot/feedback/feedback-context.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const context = await import(moduleUrl);

test("feedback locations include current and prior sessions without exposing event ids", () => {
  const locations = context.buildPilotFeedbackLocations({
    currentSessionNumber: 2,
    currentStage: "训练居家",
    sessions: [1, 2, 2, 0],
    stages: [
      { key: "症状信息", label: "症状信息" },
      { key: "处理复测", label: "处理复测" },
      { key: "处理复测", label: "重复项" },
    ],
  });
  assert.deepEqual(locations, [
    { sessionNumber: null, stage: "未定位" },
    { sessionNumber: 2, stage: "症状信息" },
    { sessionNumber: 2, stage: "处理复测" },
    { sessionNumber: 1, stage: "症状信息" },
    { sessionNumber: 1, stage: "处理复测" },
  ]);
  assert.equal(context.feedbackLocationKey({ sessionNumber: 2, stage: "处理复测" }), "2:处理复测");
  assert.equal(context.feedbackLocationKey({ sessionNumber: null, stage: "未定位" }), "null:未定位");
  assert.equal(context.isCurrentPilotFeedbackLocation({ sessionNumber: 2, stage: "处理复测" }, { sessionNumber: 2, stage: "处理复测" }), true);
});

test("FEED-02: feedback source context is an immutable snapshot of case, session, stage, and event", () => {
  const mutable = { caseIdentity: "case-a", sessionNumber: 2, stage: "处理复测", eventId: "event-a" };
  const captured = context.capturePilotFeedbackSourceContext(mutable);
  mutable.caseIdentity = "case-b";
  mutable.sessionNumber = 3;
  mutable.stage = "训练居家";
  mutable.eventId = "event-b";
  assert.deepEqual(captured, { caseIdentity: "case-a", sessionNumber: 2, stage: "处理复测", eventId: "event-a" });
  assert.equal(Object.isFrozen(captured), true);
});

test("A7 feedback shows approved guidance without leaking unknown exception text", () => {
  const approved = new context.PilotFeedbackSubmissionError("请先保存当前案例");
  assert.equal(context.feedbackSubmissionErrorMessage(approved), "请先保存当前案例");
  assert.equal(context.feedbackSubmissionErrorMessage(new Error("database path and secret")), "反馈暂时没有提交成功，请稍后再试");
});
