import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { readRehabMindUiSource } from "../support/read-rehabmind-ui-source.mjs";

const demo = await readRehabMindUiSource();
const styles = await readFile(new URL("../../src/features/rehabmind/styles/complete-demo.css", import.meta.url), "utf8");
const profileSource = await readFile(new URL("../../src/domain/rehab/intake/workflow-profile-core.ts", import.meta.url), "utf8");
const profileCode = ts.transpileModule(profileSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const profile = await import(`data:text/javascript;base64,${Buffer.from(profileCode).toString("base64")}`);

test("ordinary and professional intake use different page structures while sharing state fields", () => {
  const professionalBranchStart = demo.indexOf('if (professionalIntake && intake.parsed)');
  const ordinaryBranchStart = demo.indexOf('return <section className="rm-page">', professionalBranchStart);
  assert.ok(professionalBranchStart >= 0, "professional intake branch is present");
  assert.ok(ordinaryBranchStart > professionalBranchStart, "ordinary branch remains after professional branch");
  const professionalBranch = demo.slice(professionalBranchStart, ordinaryBranchStart);
  assert.match(professionalBranch, /rm-professional-intake/);
  assert.match(professionalBranch, /患者原话/);
  assert.match(professionalBranch, /病程与发生机制/);
  assert.match(professionalBranch, /症状性质与伴随表现/);
  assert.match(professionalBranch, /诱发动作与负荷/);
  assert.match(professionalBranch, /本次检查条件/);
  assert.match(professionalBranch, /脊柱活动度记录方式/);
  assert.match(professionalBranch, /专业备注/);
  assert.match(professionalBranch, /professionalNotes/);
  assert.doesNotMatch(professionalBranch, /rm-guided-nav/);

  const ordinaryBranch = demo.slice(ordinaryBranchStart);
  assert.match(ordinaryBranch, /rm-guided-nav/);
  assert.match(ordinaryBranch, /showAllIntakeFields/);
  assert.match(demo, /reportedActions/);
  assert.match(demo, /customAction/);
  assert.match(demo, /actionSelectionConfirmed/);
});

test("professional intake has an explicit destination for every missing-data class", () => {
  assert.match(demo, /professionalComplete = keyConfirmationReady/);
  assert.match(demo, /还需补充：\$\{intakeMissingFields\.join/);
  assert.match(demo, /disabled=\{!professionalComplete\}/);
  assert.match(demo, /进入关键确认/);
  assert.match(demo, /保存本次信息/);
  assert.match(demo, /位置不清楚/);
  assert.match(demo, /范围不清楚/);
  assert.match(demo, /说不清或没有固定动作/);
  assert.match(demo, /没有标准关键词也不影响后续记录/);
  assert.match(demo, /不直接等同于已确认的查体结果/);
});

test("professional mode, operation target and all 64 capability combinations stay closed", () => {
  const modes = ["guided", "thinking"];
  const targets = ["self", "other", "study"];
  for (const productMode of modes) {
    for (const operationTarget of targets) {
      for (let mask = 0; mask < 64; mask += 1) {
        const capabilities = Object.fromEntries(profile.CAPABILITY_KEYS.map((key, index) => [key, Boolean(mask & (1 << index))]));
        const result = profile.normalizeWorkflowProfile({ productMode, operationTarget, capabilities });
        assert.ok(result.productMode === "guided" || result.productMode === "thinking");
        assert.ok(["self", "other", "study"].includes(result.operationTarget));
        assert.equal(typeof result.canAssessPassive, "boolean");
        assert.equal(typeof result.canAssessResistance, "boolean");
        assert.equal(typeof result.canAssessEndFeel, "boolean");
        assert.equal(typeof result.canPalpate, "boolean");
        assert.equal(typeof result.canRunSpecialTest, "boolean");
        assert.equal(typeof result.canMobilizeJoint, "boolean");
        if (result.isGuided || result.operationTarget !== "other") {
          assert.equal(result.canAssessPassive, false);
          assert.equal(result.canAssessResistance, false);
          assert.equal(result.canAssessEndFeel, false);
          assert.equal(result.canRunSpecialTest, false);
          assert.equal(result.canMobilizeJoint, false);
        }
        if (result.isStudy) assert.equal(result.canRecord, false);
        if (result.canMobilizeJoint) {
          assert.equal(result.canAssessPassive, true);
          assert.equal(result.capabilities.jointMobilization, true);
        }
      }
    }
  }
});

test("professional intake styling keeps batch sections usable on desktop and narrow screens", () => {
  for (const selector of [
    ".rm-professional-intake",
    ".rm-professional-banner",
    ".rm-professional-section",
    ".rm-professional-source",
    ".rm-professional-location-tabs",
    ".rm-atlas-picker.is-professional",
    ".rm-professional-footer",
  ]) assert.match(styles, new RegExp(selector.replace(/\./g, "\\.")));
  assert.match(styles, /\.rm-professional-fields \{ grid-template-columns: 1fr; \}/);
});
