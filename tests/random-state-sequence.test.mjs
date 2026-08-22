import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadSource(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

async function moduleUrl(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

const assessmentUrl = await moduleUrl("../app/function-assessment-core.ts");
const workflowUrl = await moduleUrl("../app/workflow-state-core.ts");
const bilateralUrl = await moduleUrl("../app/bilateral-flow-core.ts");
const [evidence, retest, queue, ledger, training, eligibility] = await Promise.all([
  loadSource("../app/function-evidence-core.ts", { "./function-assessment-core": assessmentUrl }),
  loadSource("../app/function-retest-transition-core.ts"),
  loadSource("../app/treatment-queue-core.ts", { "./workflow-state-core": workflowUrl }),
  loadSource("../app/treatment-ledger-core.ts"),
  loadSource("../app/training-stage-gate-core.ts", { "./bilateral-flow-core": bilateralUrl }),
  loadSource("../app/retest-eligibility-core.ts"),
]);

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function randomScore(random) {
  return Math.floor(random() * 11);
}

function checkFunctionCore(random) {
  const isFunctionTarget = random() > 0.2;
  const mode = isFunctionTarget ? pick(random, ["ordinary", "completion-status", "none"]) : "none";
  const completion = isFunctionTarget ? pick(random, ["", "complete", "unable"]) : "";
  const unableReason = completion === "unable" ? pick(random, ["", "pain", "weak", "fear", "instruction"]) : "";
  const result = retest.resolveFunctionRetestTransition({
    isFunctionTarget,
    mode,
    completion,
    unableReason,
    scoreConfirmed: random() > 0.5,
    chiefScoreRetestBlocked: random() > 0.8,
  });
  assert.equal(result.completionOnly, isFunctionTarget && mode === "completion-status");
  assert.equal(result.requiresScore, isFunctionTarget ? !result.completionOnly : true);
  if (result.evidenceCaptured) assert.equal(result.functionReady, true);
  if (result.completionOnly) assert.equal(result.requiresScore, false);
}

function checkQueueCore(random) {
  const types = ["muscle", "control", "joint", "neural"];
  const candidates = Array.from({ length: 1 + Math.floor(random() * 6) }, (_, index) => ({
    id: `candidate-${index}`,
    type: pick(random, types),
  }));
  const preferredTypes = random() > 0.35 ? [pick(random, types)] : [];
  const startIndex = Math.floor(random() * candidates.length);
  const result = pick(random, ["better", "partial", "same", "worse"]);
  const activityWorsened = random() > 0.85;
  const advance = queue.resolveTreatmentQueueAdvance({
    candidates,
    startIndex,
    preferredTypes,
    getType: (candidate) => candidate.type,
    result,
    activityWorsened,
  });
  assert.ok(advance.nextCandidateIndex >= -1 && advance.nextCandidateIndex < candidates.length);
  if (advance.stopped) {
    assert.equal(advance.nextCandidateIndex, -1);
    assert.equal(advance.nextTargetPosition, undefined);
  }
  if (advance.nextCandidateIndex >= 0) {
    assert.ok(advance.nextCandidateIndex > startIndex);
    if (preferredTypes.length) assert.ok(preferredTypes.includes(candidates[advance.nextCandidateIndex].type));
  }
  if (advance.advanceToNextTarget) assert.equal(advance.nextCandidateIndex, -1);
}

function checkLedgerCore(random) {
  const targetId = pick(random, ["target:chief", "target:motion:knee-extension", "target:swelling", "target:local-limb"]);
  const record = {
    targetId,
    result: pick(random, ["better", "partial", "same", "worse"]),
    afterScore: randomScore(random),
    chiefRetested: random() > 0.4,
    rangeOutcomes: targetId.startsWith("target:motion:")
      ? { "knee-extension": pick(random, ["both-match", "better-passive-limited", "passive-limited", "worse"]) }
      : undefined,
  };
  const completed = ledger.completedProblemIdsFromTreatmentRecords([record], {
    "ankle-dorsiflexion": pick(random, ["both-match", "passive-limited"]),
  });
  assert.ok(completed instanceof Set);
  for (const id of completed) assert.match(id, /^(chief|motion:|swelling|local-limb)/);
  if (targetId === "target:chief" && record.afterScore > 0) assert.equal(completed.has("chief"), false);
}

function checkTrainingCore(random) {
  const trainingComplete = random() > 0.8;
  const trainingPlanSaved = random() > 0.8;
  const safetySignal = random() > 0.9;
  const treatmentWorsened = random() > 0.9;
  const result = training.resolveTrainingStageGate({
    bilateral: random() > 0.45,
    assessmentComplete: random() > 0.4,
    safetySignal,
    treatmentWorsened,
    trainingComplete,
    trainingPlanSaved,
  });
  assert.equal(result.closed, trainingComplete || trainingPlanSaved);
  assert.equal(result.blocked, result.bilateralGate === "blocked");
  assert.equal(result.lowLoadOnly, result.bilateralGate === "low-load");
  if (safetySignal || treatmentWorsened) assert.equal(result.bilateralGate, "blocked");
}

function checkEvidenceEligibilityCore(random) {
  const completion = pick(random, ["complete", "unable"]);
  const unableReason = completion === "unable" ? pick(random, ["pain", "weak", "fear", "instruction"]) : "";
  const record = { functionCompletion: completion, functionUnableReason: unableReason };
  const actual = evidence.functionEvidenceFromRecord("function:knee-squat", record);
  const mode = eligibility.retestBaselineModeFromEvidence([{ mode: actual.retestMode }]);
  const route = eligibility.retestEligibility({
    hasReportedChiefAction: true,
    hasPerformedBaseline: actual.performed,
    baselineMode: mode,
    treatmentOrTrainingCompleted: random() > 0.5,
  });
  assert.equal(mode, actual.retestMode);
  if (!actual.performed) assert.equal(route, "not-comparable");
  if (actual.retestMode === "completion-status") assert.equal(route, "completion-status");
}

test("生产逻辑核心随机组合始终满足复测、队列、台账和训练门禁不变量", () => {
  let operationCount = 0;
  for (let seed = 1; seed <= 500; seed += 1) {
    const random = rng(seed);
    for (let step = 0; step < 100; step += 1) {
      switch (Math.floor(random() * 5)) {
        case 0: checkFunctionCore(random); break;
        case 1: checkQueueCore(random); break;
        case 2: checkLedgerCore(random); break;
        case 3: checkTrainingCore(random); break;
        default: checkEvidenceEligibilityCore(random); break;
      }
      operationCount += 1;
    }
  }
  assert.equal(operationCount, 50000);
  console.log(`production-core-random-combinations=${operationCount}`);
});
