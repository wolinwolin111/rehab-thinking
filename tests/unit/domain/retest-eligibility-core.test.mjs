import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/retest-eligibility-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("reported action without a performed baseline is not comparable", () => {
  assert.equal(core.retestEligibility({ hasReportedChiefAction: true, hasPerformedBaseline: false }), "not-comparable");
});

test("a performed baseline is same-session comparable before treatment", () => {
  assert.equal(core.retestEligibility({ hasReportedChiefAction: true, hasPerformedBaseline: true }), "same-session");
});

test("an attempted but incomplete task only creates a completion-status review", () => {
  assert.equal(core.retestEligibility({
    hasReportedChiefAction: true,
    hasPerformedBaseline: true,
    baselineMode: "completion-status",
    treatmentOrTrainingCompleted: true,
  }), "completion-status");
});

test("an unknown or skipped task cannot create any retest eligibility", () => {
  assert.equal(core.retestEligibility({ hasReportedChiefAction: true, hasPerformedBaseline: false, baselineMode: "none" }), "not-comparable");
});

test("an unavailable baseline can be reviewed next session after treatment", () => {
  assert.equal(core.retestEligibility({ hasReportedChiefAction: true, hasPerformedBaseline: false, isComparableNow: false, treatmentOrTrainingCompleted: true }), "next-session");
});

test("no reported action never creates a forced retest", () => {
  assert.equal(core.retestEligibility({ hasReportedChiefAction: false, hasPerformedBaseline: true }), "not-comparable");
});

test("an ordinary performed action outranks a completion-only function baseline", () => {
  assert.equal(core.retestBaselineModeFromEvidence([
    { mode: "completion-status" },
    { mode: "ordinary" },
  ]), "ordinary");
});

test("no actual assessment evidence keeps the chief action non-comparable", () => {
  assert.equal(core.retestBaselineModeFromEvidence([]), "none");
  assert.equal(core.retestBaselineModeFromEvidence([{ mode: "none" }]), "none");
});
