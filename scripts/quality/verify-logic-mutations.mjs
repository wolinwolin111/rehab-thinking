import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { loadTypeScriptModule } from "../../tests/support/load-typescript-module.mjs";

const source = await readFile(new URL("../../src/domain/rehab/retest/function-retest-transition-core.ts", import.meta.url), "utf8");

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowEntry = path.join(repositoryRoot, "src", "features", "rehabmind", "workflow", "workflow-orchestrator.ts");
const workflowSource = await readFile(workflowEntry, "utf8");
const originalWorkflow = await loadTypeScriptModule(workflowEntry, { rootDir: repositoryRoot });

async function mutatedWorkflow(needle, replacement) {
  assert.ok(workflowSource.includes(needle), `workflow mutation target disappeared: ${needle}`);
  return loadTypeScriptModule(workflowEntry, {
    rootDir: repositoryRoot,
    transformSource: (file, sourceText) => file === workflowEntry ? sourceText.replace(needle, replacement) : sourceText,
  });
}

const workflowProjectionInput = {
  intakeComplete: true,
  safetyComplete: true,
  adverseResponse: false,
  planIsCurrent: true,
  assessmentReadyForTreatment: true,
  assessmentNeedsReferral: false,
  queueRefreshing: false,
  pendingAssessmentCheck: false,
  queueLength: 0,
  queueIndex: 0,
  bilateral: false,
  assessmentComplete: true,
  safetySignal: false,
  treatmentWorsened: false,
  trainingComplete: false,
  trainingPlanSaved: false,
};

const queueMutation = await mutatedWorkflow(
  "const treatmentComplete = !input.queueRefreshing",
  "const treatmentComplete = input.queueRefreshing",
);
assert.notDeepEqual(
  queueMutation.projectWorkflowState(workflowProjectionInput),
  originalWorkflow.projectWorkflowState(workflowProjectionInput),
  "MUT-WF-01 was not detected",
);
console.log("MUT-WF-01-queue-refresh-gate-inverted: killed");

const trainingMutation = await mutatedWorkflow(
  "const canEnterTraining = treatmentComplete && !trainingStageGate.blocked;",
  "const canEnterTraining = treatmentComplete;",
);
assert.notEqual(
  trainingMutation.projectWorkflowState({ ...workflowProjectionInput, treatmentWorsened: true }).canEnterTraining,
  originalWorkflow.projectWorkflowState({ ...workflowProjectionInput, treatmentWorsened: true }).canEnterTraining,
  "MUT-WF-02 was not detected",
);
console.log("MUT-WF-02-training-block-bypassed: killed");

const navigationMutation = await mutatedWorkflow(
  "allowed = input.event.targetStep <= input.maxUnlocked || input.event.targetStep <= input.currentStep;",
  "allowed = true;",
);
assert.notEqual(
  navigationMutation.orchestrateWorkflowNavigation({ currentStep: 2, maxUnlocked: 2, event: { type: "navigate-requested", targetStep: 5 } }).allowed,
  originalWorkflow.orchestrateWorkflowNavigation({ currentStep: 2, maxUnlocked: 2, event: { type: "navigate-requested", targetStep: 5 } }).allowed,
  "MUT-WF-03 was not detected",
);
console.log("MUT-WF-03-stage-lock-bypassed: killed");

const safetyMutation = await mutatedWorkflow(
  "&& (!input.safetySignal || input.medicalClearance)",
  "&& true",
);
assert.notEqual(
  safetyMutation.resolveWorkflowSafetyGate({
    answersComplete: true,
    imagingSelected: true,
    safetySignal: true,
    structuralSignal: false,
    medicalClearance: false,
  }).canContinue,
  originalWorkflow.resolveWorkflowSafetyGate({
    answersComplete: true,
    imagingSelected: true,
    safetySignal: true,
    structuralSignal: false,
    medicalClearance: false,
  }).canContinue,
  "MUT-WF-04 was not detected",
);
console.log("MUT-WF-04-medical-clearance-bypassed: killed");

const editMutation = await mutatedWorkflow(
  "if (!input.editExplicitlyEnabled) return \"read-only-review\" as const;",
  "if (false) return \"read-only-review\" as const;",
);
assert.notEqual(
  editMutation.resolveReturnEditGate({ targetIsCompleted: true, editExplicitlyEnabled: false, answersChanged: false }),
  originalWorkflow.resolveReturnEditGate({ targetIsCompleted: true, editExplicitlyEnabled: false, answersChanged: false }),
  "MUT-WF-05 was not detected",
);
console.log("MUT-WF-05-explicit-edit-bypassed: killed");

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
  {
    id: "MUT-FRET-05-completion-worsening-ignored",
    needle: "&& input.completion === \"unable\";",
    replacement: "&& false;",
    input: {
      isFunctionTarget: true,
      mode: "ordinary",
      completion: "unable",
      unableReason: "pain",
      scoreConfirmed: true,
      initialCompletion: "complete",
    },
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

// H 批 S-01/S-05：膝决策输入的侧别保真定向变异。
// 适配器依赖 knee-decision-core（@/ 别名），data-URL 无法解析——按场景测试
// 的方式把核心与适配器拼成单包（核心去导出、适配器去导入）后再做变异对照。
function stripKneeImports(text) {
  return text
    .replace(/import\s+(?:type\s+)?\{[^}]*\}\s*from\s*"[^"]*";?/g, "")
    .replace(/import\s+[^"'\n]+\s+from\s*"[^"]*";?/g, "");
}
const kneeCoreSource = await readFile(new URL("../../src/domain/rehab/shared/knee-decision-core.ts", import.meta.url), "utf8");
const kneeAdapterSource = await readFile(new URL("../../src/domain/rehab/shared/knee-workflow-adapter.ts", import.meta.url), "utf8");
const kneeBundleSource = [stripKneeImports(kneeCoreSource).replace(/export\s+/g, ""), stripKneeImports(kneeAdapterSource)].join("\n");
const kneeAdapterOriginal = await load(kneeBundleSource);
const kneeMutationCases = [
  {
    id: "MUT-KNEE-01-finding-side-flattened",
    needle: "const itemSide: KneeSide = item.side ? toSide(item.side) : side;",
    replacement: "const itemSide: KneeSide = side;",
    snapshot: {
      role: "general",
      side: "右侧",
      location: "膝前",
      action: "膝盖绷直",
      baselineScore: 5,
      assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "skip", side: "左侧" }],
    },
  },
  {
    id: "MUT-KNEE-02-dedup-side-ignored",
    needle: "return fromKey ? toSide(fromKey) : fallback;",
    replacement: "return fallback;",
    snapshot: {
      role: "general",
      side: "双侧/中间",
      location: "膝前",
      action: "膝盖绷直",
      baselineScore: 5,
      assessments: [],
      treatmentRecords: [
        { candidateId: "knee-lateral-chain", treatmentKey: "左侧:muscle:lateral-chain" },
        { candidateId: "knee-lateral-chain", treatmentKey: "右侧:muscle:lateral-chain" },
      ],
    },
  },
];
for (const mutation of kneeMutationCases) {
  assert.ok(kneeAdapterSource.includes(mutation.needle), `${mutation.id} mutation target disappeared`);
  const expected = kneeAdapterOriginal.kneeDecisionInputFromWorkflow(mutation.snapshot);
  const mutated = await load(kneeBundleSource.replace(mutation.needle, mutation.replacement));
  const mutatedResult = mutated.kneeDecisionInputFromWorkflow(mutation.snapshot);
  assert.notDeepEqual(mutatedResult, expected, `${mutation.id} was not detected`);
  console.log(`${mutation.id}: killed`);
}

const ledgerSource = await readFile(new URL("../../src/domain/rehab/treatment/treatment-ledger-core.ts", import.meta.url), "utf8");
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

const directionSource = await readFile(new URL("../../src/domain/rehab/treatment/treatment-queue-direction-core.ts", import.meta.url), "utf8");
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

const invalidationSource = await readFile(new URL("../../src/domain/rehab/shared/downstream-invalidation-core.ts", import.meta.url), "utf8");
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

const identitySource = await readFile(new URL("../../src/infrastructure/pilot/persistence/local-case-identity.ts", import.meta.url), "utf8");
const originalIdentity = await load(identitySource);
const identityNeedle = "savedRecordIdentity(record) === identity";
assert.ok(identitySource.includes(identityNeedle), "MUT-CASE-01 mutation target disappeared");
const mutatedIdentity = await load(identitySource.replace(identityNeedle, "savedRecordIdentity(record) !== identity"));
const identityRecords = [{ localCaseId: "case-a" }, { localCaseId: "case-b" }];
assert.notDeepEqual(
  mutatedIdentity.findLocalCaseRecord(identityRecords, "case-a"),
  originalIdentity.findLocalCaseRecord(identityRecords, "case-a"),
  "MUT-CASE-01 was not detected",
);
console.log("MUT-CASE-01-active-identity-inverted: killed");

const stageSource = await readFile(new URL("../../src/features/rehabmind/workflow/stage-events.ts", import.meta.url), "utf8");
const originalStage = await load(stageSource);
const stageNeedle = "stageCompletionEvent(input.prev)";
assert.ok(stageSource.includes(stageNeedle), "MUT-AUDIT-03 mutation target disappeared");
const nextStageMutation = await load(stageSource.replace(stageNeedle, "stageCompletionEvent(input.next)"));
assert.notEqual(
  nextStageMutation.pickStageAdvanceEvent({ prev: 0, next: 1, seen: [] }),
  originalStage.pickStageAdvanceEvent({ prev: 0, next: 1, seen: [] }),
  "MUT-AUDIT-03 was not detected",
);
console.log("MUT-AUDIT-03-next-stage-event: killed");

const eventIdNeedle = "return `case-event:${caseId}:${eventType}:${snapshotFingerprint}`;";
assert.ok(stageSource.includes(eventIdNeedle), "MUT-AUDIT-04 mutation target disappeared");
const eventIdMutation = await load(stageSource.replace(eventIdNeedle, "return `case-event:${caseId}:${snapshotFingerprint}`;"));
assert.equal(
  eventIdMutation.pilotProgressEventId("case-a", "intake_saved", "abc"),
  eventIdMutation.pilotProgressEventId("case-a", "session_saved", "abc"),
  "mutation setup must create the cross-type collision",
);
assert.notEqual(
  originalStage.pilotProgressEventId("case-a", "intake_saved", "abc"),
  originalStage.pilotProgressEventId("case-a", "session_saved", "abc"),
  "MUT-AUDIT-04 was not detected",
);
console.log("MUT-AUDIT-04-event-type-removed-from-id: killed");

const feedbackSource = await readFile(new URL("../../src/infrastructure/pilot/feedback/feedback-context.ts", import.meta.url), "utf8");
const originalFeedback = await load(feedbackSource);
const feedbackNeedle = "caseIdentity: input.caseIdentity,";
assert.ok(feedbackSource.includes(feedbackNeedle), "MUT-FEED-02 mutation target disappeared");
const feedbackMutation = await load(feedbackSource.replace(feedbackNeedle, 'caseIdentity: "wrong-case",'));
const feedbackInput = { caseIdentity: "case-a", sessionNumber: 1, stage: "评估检查", eventId: "event-a" };
assert.notDeepEqual(
  feedbackMutation.capturePilotFeedbackSourceContext(feedbackInput),
  originalFeedback.capturePilotFeedbackSourceContext(feedbackInput),
  "MUT-FEED-02 was not detected",
);
console.log("MUT-FEED-02-source-case-replaced: killed");

async function stateAfterOldSave(module) {
  const writes = [];
  const states = [];
  const controller = module.createPilotDraftPersistenceController({
    delayMs: 60_000,
    save: (value) => new Promise((resolve) => writes.push({ value, resolve })),
    onState: (state) => states.push(state),
  });
  controller.schedule({ caseId: "case-a" });
  const first = controller.flush();
  await new Promise((resolve) => setImmediate(resolve));
  controller.schedule({ caseId: "case-b" });
  writes[0].resolve();
  await first;
  const state = states.at(-1);
  const second = controller.flush();
  await new Promise((resolve) => setImmediate(resolve));
  writes[1].resolve();
  await second;
  controller.dispose();
  return state;
}

const persistenceSource = await readFile(new URL("../../src/infrastructure/pilot/persistence/persistence-controller.ts", import.meta.url), "utf8");
const persistenceNeedle = "operation.generation === generation && pending === undefined";
assert.ok(persistenceSource.includes(persistenceNeedle), "MUT-SYNC-01 mutation target disappeared");
const originalPersistence = await load(persistenceSource);
const persistenceMutation = await load(persistenceSource.replace(persistenceNeedle, "pending !== undefined"));
assert.notEqual(await stateAfterOldSave(persistenceMutation), await stateAfterOldSave(originalPersistence), "MUT-SYNC-01 was not detected");
console.log("MUT-SYNC-01-stale-save-completion-accepted: killed");

const syncSource = await readFile(new URL("../../src/infrastructure/pilot/persistence/sync-core.ts", import.meta.url), "utf8");
const revisionNeedle = "remote.revision < local.serverRevision";
assert.ok(syncSource.includes(revisionNeedle), "MUT-SYNC-02 mutation target disappeared");
const originalSync = await load(syncSource);
const revisionMutation = await load(syncSource.replace(revisionNeedle, "remote.revision <= local.serverRevision"));
const equalRevisionInput = [{ serverRevision: 3, dirty: true }, { revision: 3, contentFingerprint: "different" }];
assert.notEqual(
  revisionMutation.decidePilotRestoreSource(...equalRevisionInput),
  originalSync.decidePilotRestoreSource(...equalRevisionInput),
  "MUT-SYNC-02 was not detected",
);
console.log("MUT-SYNC-02-equal-revision-treated-as-old: killed");

const lateSaveNeedle = "if (!sameOperation(state.activeOperation, event.operation)) return state;";
assert.ok(syncSource.includes(lateSaveNeedle), "MUT-A5-SYNC-03 mutation target disappeared");
const lateSaveMutation = await load(syncSource.replace(lateSaveNeedle, "if (false) return state;"));
const activeOperation = { caseId: "case-a", sessionId: "session-2", requestId: "current", baseRevision: 4 };
const staleOperation = { ...activeOperation, requestId: "stale", baseRevision: 3 };
const syncingState = {
  caseId: "case-a", status: "syncing", serverRevision: 4, activeOperation,
  deleteRequestId: null, errorCode: null,
};
assert.notDeepEqual(
  lateSaveMutation.reducePilotSyncState(syncingState, { type: "remote-save-succeeded", operation: staleOperation, revision: 4 }),
  originalSync.reducePilotSyncState(syncingState, { type: "remote-save-succeeded", operation: staleOperation, revision: 4 }),
  "MUT-A5-SYNC-03 was not detected",
);
console.log("MUT-A5-SYNC-03-late-response-accepted: killed");

function stripModule(code, keepExports = false) {
  let output = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]*";?/g, "");
  if (!keepExports) output = output.replace(/export\s+/g, "");
  return output;
}

const contractsSource = await readFile(new URL("../../src/infrastructure/pilot/api/case-contracts.ts", import.meta.url), "utf8");
const consentSource = await readFile(new URL("../../src/infrastructure/pilot/consent/consent-core.ts", import.meta.url), "utf8");
const snapshotSource = await readFile(new URL("../../src/infrastructure/pilot/persistence/snapshot-schema.ts", import.meta.url), "utf8");
async function loadSnapshot(sourceText) {
  const bundle = `${stripModule(contractsSource)}\n${stripModule(consentSource)}\n${stripModule(sourceText, true)}`;
  return import(`data:text/javascript;base64,${Buffer.from(bundle).toString("base64")}`);
}
const validSnapshot = {
  schemaVersion: 1,
  consent: { version: "pilot-consent-v1", confirmedAt: "2026-08-23T00:00:00.000Z" },
  step: 0,
  intake: { regionId: "knee" }, safety: {}, imaging: [], assessmentIndex: 0, assessmentResults: {},
  trialTargetIndex: 0, candidateIndex: 0, trialRecords: [], postScore: 0, movementResponse: "",
  exerciseFeedback: {}, trainingComplete: false, followupMode: false, sessionNumber: 1,
  followupScore: 0, followupScoreHistory: [], followupStage: "review", followupPostScore: 0,
  followupCandidateId: "", followupTrialRecords: [], followupExerciseChoices: {}, followupTrends: {},
};
const originalSnapshot = await loadSnapshot(snapshotSource);
assert.throws(() => originalSnapshot.assertAndStampPilotSnapshotSchemaVersion({ schemaVersion: 1, step: 0 }, "snapshot"));
const schemaNeedle = "const migrated = migratePilotSnapshot(value);";
assert.ok(snapshotSource.includes(schemaNeedle), "MUT-SCHEMA-01 mutation target disappeared");
const schemaMutation = await loadSnapshot(snapshotSource.replace(schemaNeedle, "const migrated = { ok: true, snapshot: value };"));
assert.doesNotThrow(() => schemaMutation.assertAndStampPilotSnapshotSchemaVersion({ schemaVersion: 1, step: 0 }, "snapshot"));
console.log("MUT-SCHEMA-01-deep-validation-bypassed: killed");

const nestedSchemaNeedle = "const optionalError = validateOptionalWorkflowFields(value);";
assert.ok(snapshotSource.includes(nestedSchemaNeedle), "MUT-A5-SCHEMA-02 mutation target disappeared");
const nestedSchemaMutation = await loadSnapshot(snapshotSource.replace(nestedSchemaNeedle, "const optionalError = null;"));
assert.equal(originalSnapshot.migratePilotSnapshot({ ...validSnapshot, movementScores: { flexion: 11 } }).ok, false);
assert.equal(nestedSchemaMutation.migratePilotSnapshot({ ...validSnapshot, movementScores: { flexion: 11 } }).ok, true);
console.log("MUT-A5-SCHEMA-02-nested-validation-bypassed: killed");

const consentNeedle = "consent.version === PILOT_CONSENT_VERSION";
assert.ok(snapshotSource.includes(consentNeedle), "MUT-CONSENT-01 mutation target disappeared");
const consentMutation = await loadSnapshot(snapshotSource.replace(consentNeedle, 'consent.version === "wrong-version"'));
assert.throws(() => originalSnapshot.assertAndStampPilotSnapshotSchemaVersion({ ...validSnapshot, consent: { ...validSnapshot.consent, version: "wrong-version" } }, "snapshot", { requireConsent: true }));
assert.doesNotThrow(() => consentMutation.assertAndStampPilotSnapshotSchemaVersion({ ...validSnapshot, consent: { ...validSnapshot.consent, version: "wrong-version" } }, "snapshot", { requireConsent: true }));
console.log("MUT-CONSENT-01-version-check-relaxed: killed");

const sharedSource = await readFile(new URL("../../app/api/pilot/_shared.ts", import.meta.url), "utf8");
async function loadShared(sourceText) {
  const withoutImports = sourceText.replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, "");
  const output = ts.transpileModule(withoutImports, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const prefix = "const createRateLimiter = () => () => ({ allowed: true, retryAfterSec: 0 });\n";
  return import(`data:text/javascript;base64,${Buffer.from(prefix + output).toString("base64")}`);
}
const proxyNeedle = 'request.headers.get("x-real-ip")';
assert.ok(sharedSource.includes(proxyNeedle), "MUT-SEC-02 mutation target disappeared");
const originalShared = await loadShared(sharedSource);
const proxyMutation = await loadShared(sharedSource.replace(proxyNeedle, 'request.headers.get("x-forwarded-for")'));
const proxyRequest = new Request("https://example.test", { headers: { "x-real-ip": "198.51.100.2", "x-forwarded-for": "203.0.113.4" } });
assert.notEqual(proxyMutation.clientIpKey(proxyRequest, "nginx"), originalShared.clientIpKey(proxyRequest, "nginx"), "MUT-SEC-02 was not detected");
console.log("MUT-SEC-02-forwarded-address-trusted: killed");

const sourceChannelEntry = path.join(repositoryRoot, "src", "infrastructure", "pilot", "onboarding", "source-channel.ts");
const sourceChannelSource = await readFile(sourceChannelEntry, "utf8");
const sourceChannelNeedle = 'const isPublic = typeof candidate.channel === "string" && PILOT_SOURCE_CHANNELS.includes(candidate.channel as PilotSourceChannel);';
assert.ok(sourceChannelSource.includes(sourceChannelNeedle), "MUT-ONBOARD-01 mutation target disappeared");
const originalSourceChannel = await loadTypeScriptModule(sourceChannelEntry, { rootDir: repositoryRoot });
const sourceChannelMutation = await loadTypeScriptModule(sourceChannelEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === sourceChannelEntry ? sourceText.replace(sourceChannelNeedle, "const isPublic = true;") : sourceText,
});
assert.throws(() => originalSourceChannel.parsePilotSourceRecord({ channel: "forged" }));
assert.doesNotThrow(() => sourceChannelMutation.parsePilotSourceRecord({ channel: "forged" }));
console.log("MUT-ONBOARD-01-source-allowlist-bypassed: killed");

const clientEntry = path.join(repositoryRoot, "src", "infrastructure", "pilot", "api", "case-client.ts");
const clientSource = await readFile(clientEntry, "utf8");
const requestIdentityNeedle = "requestId: input.requestId,";
assert.ok(clientSource.includes(requestIdentityNeedle), "MUT-A5-SYNC-04 mutation target disappeared");
const originalClient = await loadTypeScriptModule(clientEntry, { rootDir: repositoryRoot });
const clientMutation = await loadTypeScriptModule(clientEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === clientEntry ? sourceText.replace(requestIdentityNeedle, "") : sourceText,
});
async function saveRequestBody(module) {
  const originalFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (_input, init) => {
    body = JSON.parse(String(init.body));
    return Response.json({ progress: {} });
  };
  try {
    await module.savePilotCaseProgress({
      access: {
        caseId: "case-a", publicCode: "PUBLIC01", accessToken: "secret", revision: 4,
        versions: { appVersion: "app", knowledgeVersion: "knowledge", decisionVersion: "decision" },
      },
      requestId: "request-a", sessionId: "session-2", snapshot: {}, eventId: "event-a",
      eventType: "session_saved", eventPayload: {}, currentStage: "康复总结",
      isBilateral: false, hasSafetyStop: false, sessionCount: 2,
    });
    return body;
  } finally {
    globalThis.fetch = originalFetch;
  }
}
assert.notDeepEqual(await saveRequestBody(clientMutation), await saveRequestBody(originalClient), "MUT-A5-SYNC-04 was not detected");
console.log("MUT-A5-SYNC-04-request-identity-removed: killed");

const firstUseEntry = path.join(repositoryRoot, "src", "infrastructure", "pilot", "telemetry", "first-use-core.ts");
const firstUseSource = await readFile(firstUseEntry, "utf8");
const firstUseNeedle = 'if (!input.tutorialSeen) return "tutorial";';
assert.ok(firstUseSource.includes(firstUseNeedle), "MUT-A6-FIRST-01 mutation target disappeared");
const originalFirstUse = await loadTypeScriptModule(firstUseEntry, { rootDir: repositoryRoot });
const firstUseMutation = await loadTypeScriptModule(firstUseEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === firstUseEntry ? sourceText.replace(firstUseNeedle, 'if (!input.tutorialSeen) return "consent";') : sourceText,
});
assert.notEqual(
  firstUseMutation.resolvePilotFirstUseOverlay({ tutorialSeen: false, consent: "missing" }),
  originalFirstUse.resolvePilotFirstUseOverlay({ tutorialSeen: false, consent: "missing" }),
  "MUT-A6-FIRST-01 was not detected",
);
console.log("MUT-A6-FIRST-01-tutorial-order-bypassed: killed");

const invariantEntry = path.join(repositoryRoot, "src", "features", "rehabmind", "workflow", "workflow-invariants.ts");
const invariantSource = await readFile(invariantEntry, "utf8");
const invariantNeedle = 'if (snapshotStep >= 4 && !projection.treatmentComplete) codes.push("INV-RETEST-SKIPPED");';
assert.ok(invariantSource.includes(invariantNeedle), "MUT-A6-OPS-03 mutation target disappeared");
const originalInvariant = await loadTypeScriptModule(invariantEntry, { rootDir: repositoryRoot });
const invariantMutation = await loadTypeScriptModule(invariantEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === invariantEntry ? sourceText.replace(invariantNeedle, "if (false) codes.push(\"INV-RETEST-SKIPPED\");") : sourceText,
});
const invariantInput = { snapshotStep: 4, projection: originalWorkflow.projectWorkflowState({ ...workflowProjectionInput, queueLength: 1, queueIndex: 0 }) };
assert.notDeepEqual(
  invariantMutation.inspectWorkflowProjectionInvariants(invariantInput),
  originalInvariant.inspectWorkflowProjectionInvariants(invariantInput),
  "MUT-A6-OPS-03 was not detected",
);
console.log("MUT-A6-OPS-03-retest-alert-suppressed: killed");

const knowledgeEntry = path.join(repositoryRoot, "src", "knowledge", "pilot", "knowledge-consistency.ts");
const knowledgeSource = await readFile(knowledgeEntry, "utf8");
const knowledgeNeedle = 'if (!trainingIds.has(reference)) issues.push({ code: "KNOW-MISSING-TRAINING", relationId: relation.id, reference });';
assert.ok(knowledgeSource.includes(knowledgeNeedle), "MUT-A6-KNOW-01 mutation target disappeared");
const originalKnowledge = await loadTypeScriptModule(knowledgeEntry, { rootDir: repositoryRoot });
const knowledgeMutation = await loadTypeScriptModule(knowledgeEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === knowledgeEntry ? sourceText.replace(knowledgeNeedle, "if (false) issues.push({ code: \"KNOW-MISSING-TRAINING\", relationId: relation.id, reference });") : sourceText,
});
const knowledgeInput = {
  relations: [{ id: "R1", regionId: "knee", assessmentIds: [], treatmentCandidates: [], trainingIds: ["missing"], evidence: "P1", status: "reviewed-source", sourceCases: ["fixture"] }],
  regions: [{ id: "knee", directions: [], strengths: [], functions: [], specialTests: [], exercises: [] }],
  motionKnowledge: {},
  muscleRegions: [],
};
assert.notDeepEqual(
  knowledgeMutation.validatePilotKnowledgeConsistency(knowledgeInput),
  originalKnowledge.validatePilotKnowledgeConsistency(knowledgeInput),
  "MUT-A6-KNOW-01 was not detected",
);
console.log("MUT-A6-KNOW-01-missing-training-suppressed: killed");

const adminSessionEntry = path.join(repositoryRoot, "src", "infrastructure", "pilot", "admin", "admin-session.ts");
const adminSessionSource = await readFile(adminSessionEntry, "utf8");
const adminExpiryNeedle = "expiresSeconds * 1000 <= nowMs";
assert.ok(adminSessionSource.includes(adminExpiryNeedle), "MUT-A6-ADMIN-01 mutation target disappeared");
const originalAdminSession = await loadTypeScriptModule(adminSessionEntry, { rootDir: repositoryRoot });
const adminSessionMutation = await loadTypeScriptModule(adminSessionEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === adminSessionEntry ? sourceText.replace(adminExpiryNeedle, "false") : sourceText,
});
const adminSession = await originalAdminSession.issuePilotAdminSession({ providedKey: "key", configuredKey: "key", nowMs: 1_000_000, ttlSeconds: 60, nonce: "nonce" });
assert.notEqual(
  await adminSessionMutation.validatePilotAdminSession(adminSession.token, "key", 1_060_000),
  await originalAdminSession.validatePilotAdminSession(adminSession.token, "key", 1_060_000),
  "MUT-A6-ADMIN-01 was not detected",
);
console.log("MUT-A6-ADMIN-01-expired-session-accepted: killed");

const sourceDetailNeedle = "rawDetail.length > PILOT_SOURCE_DETAIL_MAX_LENGTH";
assert.ok(sourceChannelSource.includes(sourceDetailNeedle), "MUT-ONBOARD-02 mutation target disappeared");
const sourceDetailMutation = await loadTypeScriptModule(sourceChannelEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === sourceChannelEntry ? sourceText.replace(sourceDetailNeedle, "false") : sourceText,
});
assert.throws(() => originalSourceChannel.parsePilotSourceRecord({ channel: "other", detail: "x".repeat(41) }));
assert.doesNotThrow(() => sourceDetailMutation.parsePilotSourceRecord({ channel: "other", detail: "x".repeat(41) }));
console.log("MUT-ONBOARD-02-source-detail-limit-bypassed: killed");

const feedbackSessionNeedle = "item.sessionNumber > maximumSession";
assert.ok(invariantSource.includes(feedbackSessionNeedle), "MUT-A6-OPS-04 mutation target disappeared");
const feedbackSessionMutation = await loadTypeScriptModule(invariantEntry, {
  rootDir: repositoryRoot,
  transformSource: (file, sourceText) => file === invariantEntry ? sourceText.replace(feedbackSessionNeedle, "false") : sourceText,
});
const feedbackSessionInput = {
  caseStatus: "active",
  snapshotRevision: 0,
  caseSessionCount: 1,
  events: [],
  feedback: [{ sessionNumber: 2 }],
};
assert.notDeepEqual(
  feedbackSessionMutation.inspectPilotTimelineInvariants(feedbackSessionInput),
  originalInvariant.inspectPilotTimelineInvariants(feedbackSessionInput),
  "MUT-A6-OPS-04 was not detected",
);
console.log("MUT-A6-OPS-04-feedback-session-boundary-bypassed: killed");
