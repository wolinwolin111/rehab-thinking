import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/chief-action-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const kneeSquat = { reportedActions: [{ raw: "下蹲", label: "下蹲" }], location: "膝前", symptomType: "酸痛", mechanism: "逐渐出现", reproduction: "", forceDirection: "", actionAnalysis: { task: "下蹲" } };

test("reported action summary dedups and drops unclear values", () => {
  assert.deepEqual(core.reportedActionSummary({ reportedActions: [{ raw: "下蹲" }, { label: "下蹲" }], customAction: "", reproduction: "" }), ["下蹲"]);
  assert.deepEqual(core.reportedActionSummary({ reportedActions: [{ label: "说不清" }], customAction: "", reproduction: "" }), []);
});

test("hasClearChiefAction requires a confirmed action", () => {
  assert.equal(core.hasClearChiefAction(kneeSquat), true);
  assert.equal(core.hasClearChiefAction({ ...kneeSquat, reportedActions: [{ label: "说不清" }] }), false);
});

test("chiefMotionDirectionId maps a single knee motion to its direction", () => {
  assert.equal(core.chiefMotionDirectionId({ ...kneeSquat, reportedActions: [{ raw: "弯膝" }], actionAnalysis: { task: "弯膝" } }, "knee"), "knee-flexion");
  assert.equal(core.chiefMotionDirectionId({ ...kneeSquat, reportedActions: [{ raw: "勾脚" }], actionAnalysis: { task: "勾脚" } }, "ankle-foot"), "ankle-dorsiflexion");
  assert.equal(core.chiefMotionDirectionId(kneeSquat, "unknown-region"), undefined);
});

test("chiefActionLabel joins multiple actions", () => {
  assert.equal(core.chiefActionLabel({ ...kneeSquat, reportedActions: [{ raw: "下蹲" }, { raw: "上楼" }] }), "下蹲、上楼");
  assert.equal(core.chiefActionLabel({ reportedActions: [] }), "尚未确认");
});

test("assessmentSymptomCanDriveRetest requires a chief action or familiar symptom", () => {
  assert.equal(core.assessmentSymptomCanDriveRetest({ familiarSymptom: "yes" }, kneeSquat), true);
  assert.equal(core.assessmentSymptomCanDriveRetest({ familiarSymptom: "yes" }, { reportedActions: [] }), true);
  assert.equal(core.assessmentSymptomCanDriveRetest({ familiarSymptom: "no" }, { reportedActions: [] }), false);
  assert.equal(core.assessmentSymptomCanDriveRetest(undefined, kneeSquat), false);
});
