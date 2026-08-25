import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { readRehabMindUiSource } from "../../support/read-rehabmind-ui-source.mjs";

const source = await readFile(new URL("../../../src/knowledge/pilot/pilot-motion-muscle-knowledge.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const {
  PILOT_MOTION_KNOWLEDGE,
  controlPlansForMotions,
  normalizePilotMuscleRegion,
  primaryRetestMotionIdsForRegion,
  professionalAssessmentTitle,
} = await import(moduleUrl);

const roleRegions = (motionId, role) => PILOT_MOTION_KNOWLEDGE[motionId].relations
  .filter((relation) => relation.role === role)
  .map((relation) => relation.regionId);

test("ankle dorsiflexion includes the anterior agonist and posterior antagonist", () => {
  assert.ok(roleRegions("ankle-dorsiflexion", "agonist").includes("calf-anterior"));
  assert.ok(roleRegions("ankle-dorsiflexion", "antagonist").includes("calf-posterior"));
});

test("ankle eversion includes lateral agonists and medial/anterior antagonists", () => {
  assert.ok(roleRegions("ankle-eversion", "agonist").includes("calf-lateral"));
  assert.deepEqual(new Set(roleRegions("ankle-eversion", "antagonist")), new Set(["calf-medial", "calf-anterior"]));
});

test("knee extension includes anterior agonists and posterior antagonists", () => {
  assert.ok(roleRegions("knee-extension", "agonist").includes("thigh-anterior"));
  assert.ok(roleRegions("knee-extension", "antagonist").includes("thigh-posterior"));
  assert.ok(roleRegions("knee-extension", "antagonist").includes("calf-posterior"));
});

test("posterior calf aliases share one standard region", () => {
  assert.equal(normalizePilotMuscleRegion("小腿肚紧")?.id, "calf-posterior");
  assert.equal(normalizePilotMuscleRegion("小腿后侧下段酸")?.id, "calf-posterior");
});

test("ambiguous anterolateral calf text is split only with direction evidence", () => {
  assert.equal(normalizePilotMuscleRegion("小腿前外侧 胫骨前肌 勾脚")?.id, "calf-anterior");
  assert.equal(normalizePilotMuscleRegion("小腿前外侧 腓骨肌 外翻")?.id, "calf-lateral");
  assert.equal(normalizePilotMuscleRegion("小腿前外侧不舒服"), undefined);
});

test("professional titles and plain control instructions exist for every pilot motion", () => {
  for (const motion of Object.values(PILOT_MOTION_KNOWLEDGE)) {
    assert.ok(motion.professionalTitle.length > 4);
    assert.ok(motion.userAction.length > 2);
    assert.match(motion.controlRepetitions, /5～8次/);
    assert.equal(professionalAssessmentTitle(`motion:${motion.id}`), motion.professionalTitle);
  }
});

test("control plans preserve only the requested directions and remove duplicates", () => {
  const plans = controlPlansForMotions(["ankle-dorsiflexion", "ankle-dorsiflexion", "ankle-plantarflexion", "unknown"]);
  assert.deepEqual(plans.map((plan) => plan.id), ["ankle-dorsiflexion", "ankle-plantarflexion"]);
});

test("a treated ankle muscle region retests only its primary motion plane", () => {
  assert.deepEqual(primaryRetestMotionIdsForRegion("calf-anterior"), ["ankle-dorsiflexion", "ankle-plantarflexion"]);
  assert.deepEqual(primaryRetestMotionIdsForRegion("calf-lateral"), ["ankle-inversion", "ankle-eversion"]);
  assert.equal(primaryRetestMotionIdsForRegion("calf-anterior").includes("ankle-eversion"), false);
});

test("the treatment page renders release, control and one unified retest hierarchy", async () => {
  const demo = await readRehabMindUiSource();
  assert.match(demo, /轻柔松解/);
  assert.match(demo, /主动控制/);
  assert.match(demo, /完成后统一复测/);
  assert.match(demo, /controlMotionIds=\{activeControlMotionIds\}/);
  assert.match(demo, /controlMotionIds=\{followupControlMotionIds\}/);
});

test("assessment uses professional page titles and one shared tension screen", async () => {
  const demo = await readRehabMindUiSource();
  assert.match(demo, /professionalAssessmentTitle\(item\.id, item\.title\)/);
  assert.match(demo, /SHARED_TENSION_ASSESSMENT_ID/);
  assert.match(demo, /肌肉紧张度对比/);
  assert.match(demo, /相关区域只检查一次/);
  assert.match(demo, /记录被动活动的终末感/);
  assert.match(demo, /PASSIVE_END_FEEL_OPTIONS/);
  assert.match(demo, /assessment-record-complete-core/);
  assert.doesNotMatch(demo, /title=\{`现在做：\$\{item\.title\}`\}/);
});

test("functional checks use action-specific observations and guided intake separates scenario from action", async () => {
  const demo = await readRehabMindUiSource();
  const content = await readFile(new URL("../../../src/knowledge/pilot/full-demo-content.ts", import.meta.url), "utf8");
  assert.match(demo, /function:calf-walk/);
  assert.match(demo, /function:shoulder-overhead-task/);
  assert.match(demo, /showIntakeQuestion\("具体动作"\)/);
  assert.match(demo, /\[needsChiefActionConfirmation, "具体动作"\]/);
  assert.match(content, /testMode\?: "active" \| "passive" \| "combined"/);
  assert.match(content, /knee-patella-lateral[\s\S]*testMode: "passive"/);
});

test("pure passive checks are rendered from an explicit assessment mode", async () => {
  const demo = await readRehabMindUiSource();
  assert.match(demo, /item\.testMode !== "passive" \|\| canAssessPassive/);
  assert.match(demo, /testMode: item\.testMode \?\? "combined"/);
  assert.match(demo, /if \(item\.testMode === "passive"\) return item\.professionalHow/);
  assert.doesNotMatch(demo, /item\.id\.startsWith\("knee-patella-"\) \? "passive"/);
});

test("time-based treatment rebuilds the dynamic queue before selecting the next target", async () => {
  const demo = await readRehabMindUiSource();
  assert.match(demo, /function advanceToNextTrialTarget\(rebuildFromQueue = false\)/);
  assert.match(demo, /setTrialTargetIndex\(\(current\) => rebuildFromQueue \? 0 : current \+ 1\)/);
  assert.match(demo, /advanceToNextTrialTarget\(timeBased\)/);
});

test("retest freezes its direction list and reads the latest recorded direction score", async () => {
  const demo = await readRehabMindUiSource();
  assert.match(demo, /type RetestPlan/);
  assert.match(demo, /setRetestPlan\(\{ targetId: activeTarget\.id/);
  assert.match(demo, /latestRangeScores\[directionId\]/);
  assert.match(demo, /setFollowupRetestPlan\(\{ targetId: "target:followup"/);
});

test("training preparation stays inside training and follow-up can use current tension evidence", async () => {
  const demo = await readRehabMindUiSource();
  assert.match(demo, /训练前准备/);
  assert.doesNotMatch(demo, /trainingPreparationLabels/);
  assert.match(demo, /followupTensionLocations/);
  assert.match(demo, /hasCurrentTensionEvidence/);
  assert.match(demo, /wasRetained\(candidate\) \|\| hasCurrentTensionEvidence\(candidate\)/);
});
