import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/function-retest-transition-core.ts", import.meta.url), "utf8");

async function load(sourceText) {
  const code = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const cases = [
  {
    id: "MUT-FRET-01-no-function-ready",
    needle: "const functionReady = input.isFunctionTarget",
    replacement: "const functionReady = false && input.isFunctionTarget",
    input: { isFunctionTarget: true, mode: "completion-status", completion: "complete", scoreConfirmed: false },
  },
  {
    id: "MUT-FRET-02-no-completion-only",
    needle: "const completionOnly = input.isFunctionTarget && input.mode === \"completion-status\"",
    replacement: "const completionOnly = false",
    input: { isFunctionTarget: true, mode: "completion-status", completion: "complete", scoreConfirmed: false },
  },
  {
    id: "MUT-FRET-03-no-unable-reason-check",
    needle: "const answerComplete = input.completion === \"complete\"",
    replacement: "const answerComplete = false",
    input: { isFunctionTarget: true, mode: "completion-status", completion: "complete", scoreConfirmed: false },
  },
  {
    id: "MUT-FRET-04-chief-completion-exception",
    needle: "&& !initial.completionOnly",
    replacement: "&& true",
    input: {
      isFunctionTarget: true,
      mode: "completion-status",
      completion: "complete",
      scoreConfirmed: false,
      targetId: "target:chief",
      chiefScoreComparable: false,
    },
    functionName: "resolveTreatmentRetestGate",
  },
];

const original = await load(source);
for (const mutation of cases) {
  assert.ok(source.includes(mutation.needle), `${mutation.id} mutation target disappeared`);
  const functionName = mutation.functionName ?? "resolveFunctionRetestTransition";
  const expected = original[functionName](mutation.input);
  const mutated = await load(source.replace(mutation.needle, mutation.replacement));
  const mutatedResult = mutated[functionName](mutation.input);
  assert.notDeepEqual(mutatedResult, expected, `${mutation.id} was not detected`);
  console.log(`${mutation.id}: killed`);
}

const ledgerSource = await readFile(new URL("../app/treatment-ledger-core.ts", import.meta.url), "utf8");
const ledgerCases = [
  {
    id: "MUT-LEDGER-01-chief-zero-threshold",
    needle: "record.afterScore === 0",
    replacement: "record.afterScore > 0",
    input: {
      records: [{ targetId: "target:chief", result: "better", afterScore: 0, chiefRetested: true }],
      latestRangeOutcomes: {},
    },
  },
  {
    id: "MUT-LEDGER-02-latest-record-overwrite",
    needle: "latestProblemRecords.set(record.targetId, record);",
    replacement: "latestProblemRecords.set(record.targetId, records[0]);",
    input: {
      records: [
        { targetId: "target:chief", result: "better", afterScore: 0, chiefRetested: true },
        { targetId: "target:chief", result: "worse", afterScore: 4, chiefRetested: true },
      ],
      latestRangeOutcomes: {},
    },
  },
];

const originalLedger = await load(ledgerSource);
for (const mutation of ledgerCases) {
  assert.ok(ledgerSource.includes(mutation.needle), `${mutation.id} mutation target disappeared`);
  const expected = originalLedger.completedProblemIdsFromTreatmentRecords(
    mutation.input.records,
    mutation.input.latestRangeOutcomes,
  );
  const mutated = await load(ledgerSource.replace(mutation.needle, mutation.replacement));
  const mutatedResult = mutated.completedProblemIdsFromTreatmentRecords(
    mutation.input.records,
    mutation.input.latestRangeOutcomes,
  );
  assert.notDeepEqual([...mutatedResult], [...expected], `${mutation.id} was not detected`);
  console.log(`${mutation.id}: killed`);
}

const directionSource = await readFile(new URL("../app/treatment-queue-direction-core.ts", import.meta.url), "utf8");
const directionCases = [
  {
    id: "MUT-TQDIR-01-muscle-candidate-closed",
    needle: "return !input.currentOutcome || ![\"both-match\", \"worse\"].includes(input.currentOutcome);",
    replacement: "return false;",
    input: {
      candidateType: "muscle",
      currentOutcome: "better",
      hasRetestForDirection: true,
      motionAnswerIsLimited: false,
      canMobilizeJoint: true,
      directionAllowsPassive: true,
    },
  },
  {
    id: "MUT-TQDIR-02-joint-capability-bypass",
    needle: "if (!input.canMobilizeJoint || !input.directionAllowsPassive) return false;",
    replacement: "if (false) return false;",
    input: {
      candidateType: "joint",
      currentOutcome: "passive-limited",
      hasRetestForDirection: true,
      motionAnswerIsLimited: false,
      canMobilizeJoint: false,
      directionAllowsPassive: true,
    },
  },
  {
    id: "MUT-TQDIR-03-control-passive-active-route",
    needle: "return input.currentOutcome === \"passive-match-active-limited\"",
    replacement: "return false",
    input: {
      candidateType: "control",
      currentOutcome: "passive-match-active-limited",
      hasRetestForDirection: true,
      motionAnswerIsLimited: false,
      canMobilizeJoint: true,
      directionAllowsPassive: true,
    },
  },
];

const originalDirection = await load(directionSource);
for (const mutation of directionCases) {
  assert.ok(directionSource.includes(mutation.needle), `${mutation.id} mutation target disappeared`);
  const expected = originalDirection.isTreatmentQueueDirectionCandidateNeeded(mutation.input);
  const mutated = await load(directionSource.replace(mutation.needle, mutation.replacement));
  const mutatedResult = mutated.isTreatmentQueueDirectionCandidateNeeded(mutation.input);
  assert.notDeepEqual(mutatedResult, expected, `${mutation.id} was not detected`);
  console.log(`${mutation.id}: killed`);
}

const invalidationSource = await readFile(new URL("../app/downstream-invalidation-core.ts", import.meta.url), "utf8");
const invalidationCases = [
  {
    id: "MUT-INV-01-followup-guard-inverted",
    needle: "return !input.confirmed || input.current !== input.next;",
    replacement: "return input.confirmed && input.current === input.next;",
    functionName: "shouldInvalidateFollowupWork",
    input: { confirmed: true, current: 3, next: 3 },
  },
  {
    id: "MUT-INV-02-invalidations-drop-history",
    needle: "return records.filter((record) => record.sessionNumber !== sessionNumber);",
    replacement: "return records.filter((record) => record.sessionNumber === sessionNumber);",
    functionName: "keepOtherSessionRecords",
    input: [
      [
        { sessionNumber: 1, candidateId: "history" },
        { sessionNumber: 2, candidateId: "current" },
      ],
      2,
    ],
  },
  {
    id: "MUT-INV-03-followup-clear-widened-to-full-reset",
    needle: '"followup-review-answer": ["followup-current-session"],',
    replacement: '"followup-review-answer": DOWNSTREAM_SCOPE_GROUPS,',
    functionName: "resolveDownstreamInvalidation",
    input: "followup-review-answer",
  },
];

const originalInvalidation = await load(invalidationSource);
for (const mutation of invalidationCases) {
  assert.ok(invalidationSource.includes(mutation.needle), `${mutation.id} mutation target disappeared`);
  const args = Array.isArray(mutation.input) ? mutation.input : [mutation.input];
  const expected = originalInvalidation[mutation.functionName](...args);
  const mutated = await load(invalidationSource.replace(mutation.needle, mutation.replacement));
  const mutatedResult = mutated[mutation.functionName](...args);
  assert.notDeepEqual(mutatedResult, expected, `${mutation.id} was not detected`);
  console.log(`${mutation.id}: killed`);
}
