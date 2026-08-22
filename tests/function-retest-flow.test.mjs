import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const assessmentSource = await readFile(new URL("../app/function-assessment-core.ts", import.meta.url), "utf8");
const evidenceSource = await readFile(new URL("../app/function-evidence-core.ts", import.meta.url), "utf8");
const eligibilitySource = await readFile(new URL("../app/retest-eligibility-core.ts", import.meta.url), "utf8");
const transitionSource = await readFile(new URL("../app/function-retest-transition-core.ts", import.meta.url), "utf8");

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

async function load(source) {
  return import(`data:text/javascript;base64,${Buffer.from(transpile(source)).toString("base64")}`);
}

const assessmentUrl = `data:text/javascript;base64,${Buffer.from(transpile(assessmentSource)).toString("base64")}`;
const evidence = await load(evidenceSource.replace('from "./function-assessment-core"', `from "${assessmentUrl}"`));
const eligibility = await load(eligibilitySource);
const transition = await load(transitionSource);

function runFlow(record, completion, scoreConfirmed) {
  const initialEvidence = evidence.functionEvidenceFromRecord("function:knee-squat", record);
  const baselineMode = eligibility.retestBaselineModeFromEvidence([{ mode: initialEvidence.retestMode }]);
  const retestEligibility = eligibility.retestEligibility({
    hasReportedChiefAction: true,
    hasPerformedBaseline: initialEvidence.performed,
    baselineMode,
    treatmentOrTrainingCompleted: true,
  });
  const gate = transition.resolveTreatmentRetestGate({
    isFunctionTarget: true,
    mode: baselineMode,
    completion,
    unableReason: record.functionUnableReason ?? "",
    scoreConfirmed,
    targetId: "target:chief",
    chiefScoreComparable: baselineMode === "ordinary" && scoreConfirmed,
  });
  return { initialEvidence, baselineMode, retestEligibility, gate };
}

test("疼痛导致动作未完成时，跨模块保留能力复测而不伪造分数基线", () => {
  const result = runFlow({
    functionCompletion: "unable",
    functionUnableReason: "pain",
  }, "complete", false);

  assert.equal(result.initialEvidence.performed, true);
  assert.equal(result.initialEvidence.retestMode, "completion-status");
  assert.equal(result.baselineMode, "completion-status");
  assert.equal(result.retestEligibility, "completion-status");
  assert.equal(result.gate.chiefScoreRetestBlocked, false);
  assert.equal(result.gate.retestReady, true);
  assert.equal(result.gate.evidenceCaptured, true);
  assert.equal(result.gate.automaticResult, "partial");
});

test("动作已完成但普通分数未确认时，跨模块链路保持未完成", () => {
  const result = runFlow({
    functionCompletion: "complete",
    functionDiscomfort: "yes",
  }, "complete", false);

  assert.equal(result.initialEvidence.retestMode, "ordinary");
  assert.equal(result.baselineMode, "ordinary");
  assert.equal(result.retestEligibility, "after-training");
  assert.equal(result.gate.chiefScoreRetestBlocked, true);
  assert.equal(result.gate.retestReady, true);
  assert.equal(result.gate.evidenceCaptured, false);
});

test("说明不清或害怕时，不形成处理后复测基线", () => {
  for (const reason of ["fear", "instruction"]) {
    const result = runFlow({
      functionCompletion: "unable",
      functionUnableReason: reason,
    }, "unable", false);

    assert.equal(result.initialEvidence.performed, false);
    assert.equal(result.initialEvidence.retestMode, "none");
    assert.equal(result.baselineMode, "none");
    assert.equal(result.retestEligibility, "not-comparable");
    assert.equal(result.gate.chiefScoreRetestBlocked, true);
    assert.equal(result.gate.evidenceCaptured, false);
  }
});

test("完成状态复测仍未完成时，跨模块链路保留同值自动结果", () => {
  const result = runFlow({
    functionCompletion: "unable",
    functionUnableReason: "pain",
  }, "unable", false);

  assert.equal(result.gate.retestReady, true);
  assert.equal(result.gate.evidenceCaptured, true);
  assert.equal(result.gate.automaticResult, "same");
});
