// 快照 schema 合同测试（v3 干净切换版）。
// 合同（SCHEMA-01/REL-01/DATA-05）：
// 1. 合法 v3 快照（schemaVersion/contractRevision/identity/domain/workflow/draft）被接受；
// 2. v3 是干净切换：v1/v2 旧快照不再迁移，直接拒绝；
// 3. 缺段、未来版本、嵌套字段畸形在存储/恢复前被拒绝；
// 4. 服务侧边界 assertAndStampPilotSnapshotSchemaVersion 抛 PilotCaseValidationError；
// 5. 循环引用与超深嵌套不得栈溢出。
import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { completePilotSnapshot } from "../../integration/sqlite-api/support.mjs";

const schema = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/snapshot-schema.ts");
const { PILOT_SNAPSHOT_SCHEMA_VERSION } = await loadTypeScriptModule("./src/infrastructure/pilot/api/case-contracts.ts");

function withoutSections(snapshot, keys) {
  const copy = structuredClone(snapshot);
  for (const key of keys) delete copy[key];
  return copy;
}

test("valid v3 snapshots are accepted and carry the current schema version and contract revision", () => {
  const result = schema.validatePilotSnapshotV3(completePilotSnapshot());
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.schemaVersion, PILOT_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(result.snapshot.schemaVersion, 3);
  assert.equal(result.snapshot.contractRevision, 3);
  assert.equal(result.snapshot.identity.sessionNumber, 1);
  // v3 校验是纯函数：不得改写输入
  const input = completePilotSnapshot();
  const frozen = structuredClone(input);
  schema.validatePilotSnapshotV3(input);
  assert.deepEqual(input, frozen);
});

test("v3 is a clean switch: legacy v1/v2 flat snapshots are rejected without migration", () => {
  const legacyV2 = {
    schemaVersion: 2,
    consent: { version: "pilot-consent-v1", confirmedAt: "2026-08-24T00:00:00.000Z" },
    step: 0,
    intake: { regionId: "knee" },
    safety: {},
    imaging: [],
    sessionNumber: 1,
  };
  const result = schema.validatePilotSnapshotV3(structuredClone(legacyV2));
  assert.equal(result.ok, false);
  assert.match(result.reason, /unsupported snapshot schema version/);
  // 拒绝路径不得补写或迁移任何字段
  assert.equal("contractRevision" in legacyV2, false);
  assert.equal("identity" in legacyV2, false);
});

test("missing required sections are rejected before page restoration", () => {
  const base = completePilotSnapshot();
  for (const key of ["identity", "domain", "workflow", "draft"]) {
    const result = schema.validatePilotSnapshotV3(withoutSections(base, [key]));
    assert.equal(result.ok, false, key);
    assert.match(result.reason, /sections are incomplete/, key);
  }
});

test("future snapshot versions and foreign contract revisions are rejected instead of partially restored", () => {
  const future = schema.validatePilotSnapshotV3(completePilotSnapshot({ schemaVersion: 99 }));
  assert.equal(future.ok, false);
  assert.match(future.reason, /unsupported snapshot schema version/);

  const foreign = schema.validatePilotSnapshotV3(completePilotSnapshot({ contractRevision: 2 }));
  assert.equal(foreign.ok, false);
  assert.match(foreign.reason, /unsupported v3 contract revision/);
});

test("SCHEMA-01: the service-side schema boundary rejects a partial snapshot with a labelled error", () => {
  assert.throws(
    () => schema.assertAndStampPilotSnapshotSchemaVersion({ schemaVersion: 2, step: 4 }, "snapshot"),
    (error) => error instanceof Error && error.name === "PilotCaseValidationError"
      && /snapshot unsupported snapshot schema version/.test(error.message),
  );
  assert.throws(
    () => schema.assertAndStampPilotSnapshotSchemaVersion(
      withoutSections(completePilotSnapshot(), ["workflow"]),
      "initialSnapshot",
      { requireConsent: true },
    ),
    (error) => error instanceof Error && /initialSnapshot snapshot v3 sections are incomplete/.test(error.message),
  );
});

test("A5 SCHEMA-01: nested identity/domain/workflow/draft fields are validated before storage or restore", () => {
  const invalidSnapshots = [
    completePilotSnapshot({ identity: { sessionId: "" } }),
    completePilotSnapshot({ identity: { sessionNumber: 0 } }),
    completePilotSnapshot({ identity: { sessionStatus: "invented" } }),
    completePilotSnapshot({ identity: { problemThreads: [{ problemThreadId: "t", caseId: "c" }] } }),
    completePilotSnapshot({ domain: { consent: { version: "pilot-consent-v0", confirmedAt: "2026-08-24T00:00:00.000Z" } } }),
    completePilotSnapshot({ domain: { intake: { regionId: 42 } } }),
    completePilotSnapshot({ domain: { intake: { baselineScore: 11 } } }),
    completePilotSnapshot({ domain: { safety: { answers: { q1: "maybe" } } } }),
    completePilotSnapshot({ domain: { assessments: [] } }),
    completePilotSnapshot({ domain: { treatments: [{ caseId: "c" }] } }),
    completePilotSnapshot({ workflow: { stage: 6 } }),
    completePilotSnapshot({ workflow: { phase: "invented" } }),
    completePilotSnapshot({ workflow: { pendingRetestCount: -1 } }),
    completePilotSnapshot({ draft: { currentSession: { phase: "intake" } } }),
    completePilotSnapshot({ draft: { treatmentCursor: { target: -1, candidate: 0 } } }),
    completePilotSnapshot({ draft: { bilateralRetestResponses: { left: "unknown" } } }),
    // 跨段不变式：当前评估集合必须属于评估所有者会话与当前修订
    completePilotSnapshot({ workflow: { assessmentOwnerSessionId: "fixture-case-1:session-x" } }),
    completePilotSnapshot({ workflow: { assessmentRevision: 3 } }),
    // 跨段不变式：pendingRetestCount 必须与 domain.retests 一致
    completePilotSnapshot({
      domain: {
        retests: {
          obligations: [{
            obligationId: "ob-1", caseId: "fixture-case-1", problemThreadId: "fixture-case-1:thread-1",
            sessionId: "fixture-case-1:session-1", kind: "range", targetId: "target-1", label: "复测",
            status: "pending", createdAt: "2026-08-29T08:00:00.000Z", required: true,
            sourceAssessmentRevision: 0, treatmentRecordIds: [],
          }],
          records: [],
        },
      },
    }),
  ];

  for (const snapshot of invalidSnapshots) {
    const result = schema.validatePilotSnapshotV3(snapshot);
    assert.equal(result.ok, false, JSON.stringify(result.reason));
  }
});

test("A5 SCHEMA-01: a complete treatment record with retest lineage remains valid", () => {
  const result = schema.validatePilotSnapshotV3(completePilotSnapshot({
    domain: {
      treatments: [{
        caseId: "fixture-case-1",
        problemThreadId: "fixture-case-1:thread-1",
        sessionId: "fixture-case-1:session-1",
        sessionNumber: 1,
        record: {
          treatmentRecordId: "tr-1",
          caseId: "fixture-case-1",
          problemThreadId: "fixture-case-1:thread-1",
          sessionId: "fixture-case-1:session-1",
          recordedAt: "2026-08-29T08:00:00.000Z",
          candidateId: "muscle:quadriceps",
          candidateTitle: "股四头肌轻柔松解",
          assessmentRevision: 0,
          beforeScore: 4,
          afterScore: 2,
          result: "better",
          knowledgeBranchId: "branch-1",
          relationIds: ["rel-1"],
          findingIds: ["motion:knee-extension"],
        },
      }],
      retests: {
        obligations: [{
          obligationId: "ob-1",
          caseId: "fixture-case-1",
          problemThreadId: "fixture-case-1:thread-1",
          sessionId: "fixture-case-1:session-1",
          kind: "range",
          targetId: "target-1",
          label: "膝伸直复测",
          status: "completed",
          createdAt: "2026-08-29T08:00:00.000Z",
          required: true,
          treatmentRecordIds: ["tr-1"],
        }],
        records: [{
          retestRecordId: "rr-1",
          obligationId: "ob-1",
          caseId: "fixture-case-1",
          problemThreadId: "fixture-case-1:thread-1",
          sessionId: "fixture-case-1:session-1",
          recordedAt: "2026-08-29T08:30:00.000Z",
          result: "better",
          status: "active",
          treatmentRecordId: "tr-1",
          score: 2,
        }],
      },
    },
  }));
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
});

test("A5 SCHEMA-01: cyclic and excessively deep snapshots are rejected during local restoration", () => {
  const cyclic = completePilotSnapshot();
  cyclic.self = cyclic;
  const cycleResult = schema.validatePilotSnapshotV3(cyclic);
  assert.equal(cycleResult.ok, false);
  let nested = {};
  for (let index = 0; index < 30; index += 1) nested = { nested };
  const deepResult = schema.validatePilotSnapshotV3(completePilotSnapshot({ draft: { extra: nested } }));
  assert.equal(deepResult.ok, false);
});
