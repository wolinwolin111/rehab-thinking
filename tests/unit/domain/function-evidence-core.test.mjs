import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/retest/function-evidence-core.ts");

test("pain without a control deficit goes to treatment, not training", () => {
  const evidence = core.functionEvidenceFromRecord("function:knee-squat", {
    functionCompletion: "complete",
    functionControl: "stable",
    functionDiscomfort: "yes",
  });
  assert.equal(evidence.channels.treatment, true);
  assert.equal(evidence.channels.training, false);
  assert.equal(evidence.channels.retest, true);
  assert.equal(evidence.retestMode, "ordinary");
  assert.equal(evidence.channels.ordinaryRetest, true);
  assert.deepEqual(core.functionEvidenceDecisionTags(evidence), ["function-symptom"]);
});

test("explicit compensation enters the control-training channel", () => {
  const evidence = core.functionEvidenceFromRecord("function:knee-step-down", {
    functionCompletion: "complete",
    functionControl: "compensated",
    functionDiscomfort: "no",
  });
  assert.equal(evidence.channels.treatment, false);
  assert.equal(evidence.channels.training, true);
  assert.equal(evidence.channels.retest, true);
  assert.equal(evidence.retestMode, "ordinary");
  assert.ok(core.functionEvidenceDecisionTags(evidence).includes("function-control"));
});

test("weakness that stops an attempted task enters training and can be retested", () => {
  const evidence = core.functionEvidenceFromRecord("function:calf-heel-raise", {
    functionCompletion: "unable",
    functionUnableReason: "weak",
  });
  assert.equal(evidence.channels.training, true);
  assert.equal(evidence.channels.retest, true);
  assert.equal(evidence.retestMode, "completion-status");
  assert.equal(evidence.channels.ordinaryRetest, false);
  assert.equal(evidence.channels.completionStatusRetest, true);
  assert.ok(core.functionEvidenceDecisionTags(evidence).includes("function-capacity"));
});

test("pain that stops an attempted task creates a completion-status retest, not a score baseline", () => {
  const evidence = core.functionEvidenceFromRecord("function:knee-step-down", {
    functionCompletion: "unable",
    functionUnableReason: "pain",
  });
  assert.equal(evidence.performed, true);
  assert.equal(evidence.retestMode, "completion-status");
  assert.equal(evidence.channels.ordinaryRetest, false);
});

test("fear or unclear instructions do not create a training or retest baseline", () => {
  for (const reason of ["fear", "instruction"]) {
    const evidence = core.functionEvidenceFromRecord("function:knee-squat", {
      functionCompletion: "unable",
      functionUnableReason: reason,
    });
    assert.equal(evidence.channels.treatment, false);
    assert.equal(evidence.channels.training, false);
    assert.equal(evidence.channels.retest, false);
  }
});
