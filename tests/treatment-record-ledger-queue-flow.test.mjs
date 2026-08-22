import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadSource(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const identitySource = await readFile(new URL("../app/action-identity-core.ts", import.meta.url), "utf8");
const identityUrl = `data:text/javascript;base64,${Buffer.from(ts.transpileModule(identitySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString("base64")}`;

// The loader keeps each test on the same production modules used by the app;
// the data URLs only replace TypeScript imports for Node's native test runner.
const routingSource = await readFile(new URL("../app/retest-routing-core.ts", import.meta.url), "utf8");
const routingCode = ts.transpileModule(routingSource.replace('from "./action-identity-core"', `from "${identityUrl}"`), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const routingModuleUrl = `data:text/javascript;base64,${Buffer.from(routingCode).toString("base64")}`;
const builderSource = await readFile(new URL("../app/trial-record-builder.ts", import.meta.url), "utf8");
const builderCode = ts.transpileModule(builderSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const builderUrl = `data:text/javascript;base64,${Buffer.from(builderCode).toString("base64")}`;
const recordFlowSource = await readFile(new URL("../app/treatment-record-flow-core.ts", import.meta.url), "utf8");
const recordFlowCode = ts.transpileModule(recordFlowSource
  .replace('from "./retest-routing-core"', `from "${routingModuleUrl}"`)
  .replace('from "./trial-record-builder"', `from "${builderUrl}"`), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const recordFlowUrl = `data:text/javascript;base64,${Buffer.from(recordFlowCode).toString("base64")}`;
const ledger = await loadSource("../app/treatment-ledger-core.ts");
const workflowSource = await readFile(new URL("../app/workflow-state-core.ts", import.meta.url), "utf8");
const workflowCode = ts.transpileModule(workflowSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const workflowUrl = `data:text/javascript;base64,${Buffer.from(workflowCode).toString("base64")}`;
const queueSource = await readFile(new URL("../app/treatment-queue-core.ts", import.meta.url), "utf8");
const queueCode = ts.transpileModule(queueSource.replace('from "./workflow-state-core"', `from "${workflowUrl}"`), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const queueUrl = `data:text/javascript;base64,${Buffer.from(queueCode).toString("base64")}`;
const [recordFlow, ledgerCore, queue] = await Promise.all([
  import(recordFlowUrl),
  Promise.resolve(ledger),
  import(queueUrl),
]);
const workflow = await import(workflowUrl);

function scoreRecord(overrides = {}) {
  return recordFlow.resolveTreatmentRecordFlow({
    recordInput: {
      candidates: [{
        id: "candidate:chief",
        candidateTitle: "主诉处理",
        treatmentName: "主诉处理",
        treatmentKey: "chief:right",
        action: "下楼梯",
      }],
      carryoverOnly: false,
      beforeScore: 4,
      recordedAfterScore: 0,
      result: "better",
      activityWorsened: false,
      timeBased: false,
      deferredRetest: false,
      hasSingleRangeEvidence: false,
      movementResponse: "",
      functionBaselineCompletion: undefined,
      functionAfterCompletion: undefined,
      functionRetestMode: undefined,
      responseRole: "independent-completion",
      priorTreatmentTitle: undefined,
      treatmentSide: "右侧",
      treatmentSides: undefined,
      sideResults: undefined,
      targetId: "target:chief",
      targetTitle: "下楼梯",
      residualReviewId: "residual-review",
      ...overrides.recordInput,
    },
    retestActionKey: "下楼梯",
    retest: {
      timeBased: false,
      deferredRetest: false,
      evidenceCaptured: true,
      targetId: "target:chief",
      targetChiefRetestAllowed: true,
      chiefScoreComparable: true,
      activeDirectionId: undefined,
      chiefDirectionId: undefined,
      chiefImprovedDuringTreatment: false,
      chiefRetestCompletedDuringTreatment: false,
      ...overrides.retest,
    },
  });
}

test("处理记录完成主诉后，台账完成状态和同目标下一项保持一致", () => {
  const flow = scoreRecord();
  const completed = ledgerCore.completedProblemIdsFromTreatmentRecords(flow.records);
  const queueResult = queue.resolveTreatmentQueueAdvance({
    candidates: [{ id: "chief", type: "muscle" }, { id: "control", type: "control" }],
    startIndex: 0,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
    result: flow.records[0].result,
    activityWorsened: Boolean(flow.records[0].activityWorsened),
  });

  assert.equal(flow.records[0].chiefRetested, true);
  assert.equal(flow.records[0].retestActionKey, "下楼梯");
  assert.equal(completed.has("chief"), true);
  assert.equal(queueResult.stopped, false);
  assert.equal(queueResult.nextCandidateIndex, 1);
});

test("未完成主诉不能由台账提前关闭，队列仍可继续定位后续候选", () => {
  const flow = scoreRecord({
    recordInput: { recordedAfterScore: 2, result: "better", responseRole: "partial-contribution" },
  });
  const completed = ledgerCore.completedProblemIdsFromTreatmentRecords(flow.records);
  const queueResult = queue.resolveTreatmentQueueAdvance({
    candidates: [{ id: "chief", type: "muscle" }, { id: "joint", type: "joint" }],
    startIndex: 0,
    preferredTypes: ["joint"],
    getType: (candidate) => candidate.type,
    result: flow.records[0].result,
    activityWorsened: false,
  });

  assert.equal(completed.has("chief"), false);
  assert.equal(queueResult.nextCandidateIndex, 1);
  assert.equal(queueResult.advanceToNextTarget, false);
});

test("活动表现加重时记录保留证据但队列必须停止", () => {
  const flow = scoreRecord({
    recordInput: { recordedAfterScore: 2, result: "better", activityWorsened: true, responseRole: "worsened" },
  });
  const completed = ledgerCore.completedProblemIdsFromTreatmentRecords(flow.records);
  const queueResult = queue.resolveTreatmentQueueAdvance({
    candidates: [{ id: "chief", type: "muscle" }, { id: "control", type: "control" }],
    startIndex: 0,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
    result: flow.records[0].result,
    activityWorsened: Boolean(flow.records[0].activityWorsened),
  });

  assert.equal(flow.records[0].activityWorsened, true);
  assert.equal(completed.has("chief"), false);
  assert.equal(queueResult.stopped, true);
  assert.equal(queueResult.nextCandidateIndex, -1);
});

test("记录完成后动态队列按稳定目标身份定位，不依赖旧的候选下标", () => {
  const flow = scoreRecord();
  const completedRecord = flow.records[0];
  const resolvedIndex = workflow.resolveDynamicQueueAdvance(1, [
    "target:motion:knee-extension:joint",
  ], {
    completedKey: `${completedRecord.targetId}:${completedRecord.candidateId}`,
    nextKey: "target:motion:knee-extension:old-candidate",
    nextTargetId: "target:motion:knee-extension",
    completedTargetId: completedRecord.targetId,
  });

  assert.equal(completedRecord.targetId, "target:chief");
  assert.equal(resolvedIndex, 0);
});
