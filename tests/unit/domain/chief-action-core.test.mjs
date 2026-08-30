import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/intake/chief-action-core.ts", import.meta.url), "utf8");
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

test("chiefMotionDirectionIds returns all directions for multi-action chief", () => {
  const multi = { ...kneeSquat, reportedActions: [{ raw: "勾脚" }, { raw: "内翻" }], actionAnalysis: { task: "勾脚" } };
  assert.deepEqual(core.chiefMotionDirectionIds(multi, "ankle-foot"), ["ankle-dorsiflexion", "ankle-inversion"]);
  assert.deepEqual(core.chiefMotionDirectionIds(kneeSquat, "unknown-region"), []);
});

test("ankle eversion user-facing aliases map to the same physical direction", () => {
  const intake = { ...kneeSquat, reportedActions: [{ raw: "脚底向外转" }], actionAnalysis: { task: "脚底向外转" } };
  assert.deepEqual(core.chiefMotionDirectionIds(intake, "ankle-foot"), ["ankle-eversion"]);
  assert.deepEqual(core.chiefMotionDirectionIds(intake, "calf-local"), ["calf-eversion"]);
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

test("isAcuteTrauma treats a recent flare of a recurrent complaint with trauma mechanism as acute", () => {
  assert.equal(core.isAcuteTrauma({ onset: "今天或昨天", mechanism: "扭转或崴伤" }), true);
  assert.equal(core.isAcuteTrauma({ onset: "反复出现", lastEpisodeOnset: "今天内", mechanism: "扭转或崴伤" }), true);
  assert.equal(core.isAcuteTrauma({ onset: "反复出现", lastEpisodeOnset: "1～3天前", mechanism: "跌倒或碰撞" }), true);
  assert.equal(core.isAcuteTrauma({ onset: "反复出现", lastEpisodeOnset: "4～7天前", mechanism: "扭转或崴伤" }), false);
  assert.equal(core.isAcuteTrauma({ onset: "反复出现", lastEpisodeOnset: "说不清", mechanism: "扭转或崴伤" }), false);
  assert.equal(core.isAcuteTrauma({ onset: "反复出现", lastEpisodeOnset: "今天内", mechanism: "逐渐出现" }), false);
  assert.equal(core.isAcuteTrauma({ onset: "反复出现", mechanism: "扭转或崴伤" }), false);
  assert.equal(core.isAcuteTrauma({ onset: "超过6周", lastEpisodeOnset: "今天内", mechanism: "扭转或崴伤" }), false);
});

test("short actions like 转头/举手/抬腿 are not filtered out by function action detection", () => {
  // "转头" should not be excluded just because "向左转头" is a direction word in neck
  const neck = { ...kneeSquat, reportedActions: [{ raw: "转头" }], actionAnalysis: { task: "转头" } };
  assert.deepEqual(core.chiefFunctionActionLabels(neck, "neck"), ["转头"]);
  // "举手" should not be excluded by "向前举手" in shoulder
  const shoulder = { ...kneeSquat, reportedActions: [{ raw: "举手" }], actionAnalysis: { task: "举手" } };
  assert.deepEqual(core.chiefFunctionActionLabels(shoulder, "shoulder"), ["举手"]);
  // "抬腿" should not be excluded by "抬腿伸膝" in thigh-local
  const thigh = { ...kneeSquat, reportedActions: [{ raw: "抬腿" }], actionAnalysis: { task: "抬腿" } };
  assert.deepEqual(core.chiefFunctionActionLabels(thigh, "thigh-local"), ["抬腿"]);
});
