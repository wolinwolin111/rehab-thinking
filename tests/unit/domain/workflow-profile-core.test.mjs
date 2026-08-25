import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/intake/workflow-profile-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("guided mode always stays self-guided and blocks professional evidence", () => {
  const profile = core.normalizeWorkflowProfile({
    productMode: "guided",
    operationTarget: "other",
    capabilities: Object.fromEntries(core.CAPABILITY_KEYS.map((key) => [key, true])),
  });
  assert.equal(profile.operationTarget, "self");
  assert.equal(profile.canAssessPassive, false);
  assert.equal(profile.canAssessResistance, false);
  assert.equal(profile.canMobilizeJoint, false);
});

test("thinking self mode allows self-observation but not passive or manual procedures", () => {
  const profile = core.normalizeWorkflowProfile({
    productMode: "thinking",
    operationTarget: "self",
    capabilities: Object.fromEntries(core.CAPABILITY_KEYS.map((key) => [key, true])),
  });
  assert.equal(profile.canRecord, true);
  assert.equal(profile.canPalpate, true);
  assert.equal(profile.canAssessPassive, false);
  assert.equal(profile.canAssessEndFeel, false);
  assert.equal(profile.canMobilizeJoint, false);
});

test("other mode only exposes the declared capabilities and uses passive evidence for joints", () => {
  const profile = core.normalizeWorkflowProfile({
    productMode: "thinking",
    operationTarget: "other",
    capabilities: { passiveRange: true, jointMobilization: true },
  });
  assert.equal(profile.canAssessPassive, true);
  assert.equal(profile.canMobilizeJoint, true);
  const complete = core.normalizeWorkflowProfile({
    productMode: "thinking",
    operationTarget: "other",
    capabilities: { passiveRange: true, endFeel: true, jointMobilization: true },
  });
  assert.equal(complete.canMobilizeJoint, true);
});

test("study mode is readable but never records a real case", () => {
  const profile = core.normalizeWorkflowProfile({ productMode: "thinking", operationTarget: "study" });
  assert.equal(profile.isStudy, true);
  assert.equal(profile.canRecord, false);
  assert.equal(profile.learningExplanation, true);
});

test("legacy role and setup map to the new profile without changing current behavior", () => {
  assert.equal(core.profileLabel(core.workflowProfileFromLegacy("general", "self")), "自助康复");
  const coachOther = core.workflowProfileFromLegacy("coach", "professional-other");
  assert.equal(core.profileLabel(coachOther), "康复思路·给别人");
  assert.equal(coachOther.canAssessPassive, true);
  assert.equal(coachOther.canMobilizeJoint, false);
  const rehabOther = core.workflowProfileFromLegacy("rehab", "professional-other");
  assert.equal(rehabOther.canMobilizeJoint, true);
});

test("all six capability bits are normalized across all 64 combinations", () => {
  for (let mask = 0; mask < 64; mask += 1) {
    const caps = Object.fromEntries(core.CAPABILITY_KEYS.map((key, index) => [key, Boolean(mask & (1 << index))]));
    const profile = core.normalizeWorkflowProfile({ productMode: "thinking", operationTarget: "other", capabilities: caps });
    assert.equal(typeof profile.canAssessPassive, "boolean");
    assert.equal(typeof profile.canMobilizeJoint, "boolean");
    if (!caps.passiveRange || !caps.jointMobilization) assert.equal(profile.canMobilizeJoint, false);
  }
});

test("joint mobilization capability requires passive range and clears when passive is removed", () => {
  const blocked = core.toggleCapability(core.emptyCapabilities(), "jointMobilization");
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.capabilities.jointMobilization, false);
  const withPassive = core.toggleCapability(core.emptyCapabilities(), "passiveRange");
  const enabled = core.toggleCapability(withPassive.capabilities, "jointMobilization");
  assert.equal(enabled.accepted, true);
  assert.equal(enabled.capabilities.jointMobilization, true);
  const cleared = core.toggleCapability(enabled.capabilities, "passiveRange");
  assert.equal(cleared.capabilities.passiveRange, false);
  assert.equal(cleared.capabilities.jointMobilization, false);
  assert.match(cleared.message ?? "", /被动活动度/);
});
