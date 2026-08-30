import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { completePilotSnapshot as makeSnapshot } from "../../integration/sqlite-api/support.mjs";

class MemoryRepository {
  cases = new Map();
  snapshots = new Map();
  events = new Map();
  feedback = [];

  async createCaseBundle(input) {
    if ([...this.cases.values()].some((record) => record.clientCreationId === input.caseRecord.clientCreationId)) {
      throw new Error("unique client creation id");
    }
    this.cases.set(input.caseRecord.id, structuredClone(input.caseRecord));
    this.snapshots.set(input.caseRecord.id, structuredClone(input.snapshot));
    this.events.set(input.event.id, structuredClone(input.event));
    return structuredClone(input);
  }

  async getCaseById(caseId) {
    return structuredClone(this.cases.get(caseId) ?? null);
  }

  async getCaseByClientCreationId(clientCreationId) {
    return structuredClone([...this.cases.values()].find((record) => record.clientCreationId === clientCreationId) ?? null);
  }

  async getSnapshot(caseId) {
    return structuredClone(this.snapshots.get(caseId) ?? null);
  }

  async getEventById(eventId) {
    return structuredClone(this.events.get(eventId) ?? null);
  }

  async saveProgress(input) {
    const existingEvent = this.events.get(input.event.id);
    if (existingEvent) {
      if (existingEvent.caseId !== input.caseId || existingEvent.payload !== input.event.payload || existingEvent.type !== input.event.type) {
        throw new this.errors.PilotCaseConflictError("Event id has already been used for different content");
      }
      return { caseRecord: structuredClone(this.cases.get(input.caseId)), snapshot: structuredClone(this.snapshots.get(input.caseId)), event: structuredClone(existingEvent) };
    }
    const current = this.snapshots.get(input.caseId);
    if (!current) throw new this.errors.PilotCaseNotFoundError();
    if (current.revision !== input.expectedRevision) throw new this.errors.PilotCaseConflictError();
    const nextSnapshot = { ...structuredClone(input.snapshot), caseId: input.caseId, revision: current.revision + 1 };
    const nextEvent = { ...structuredClone(input.event), caseId: input.caseId, sequence: [...this.events.values()].filter((event) => event.caseId === input.caseId).length + 1 };
    const nextCase = { ...structuredClone(this.cases.get(input.caseId)), ...input.patch, updatedAt: input.snapshot.updatedAt };
    this.snapshots.set(input.caseId, nextSnapshot);
    this.events.set(nextEvent.id, nextEvent);
    this.cases.set(input.caseId, nextCase);
    return { caseRecord: structuredClone(nextCase), snapshot: structuredClone(nextSnapshot), event: structuredClone(nextEvent) };
  }

  async saveFeedback(input) {
    const { timelineEvent, ...feedback } = input;
    this.feedback.push(structuredClone(feedback));
    if (timelineEvent) {
      const sequence = [...this.events.values()].filter((event) => event.caseId === input.caseId).length + 1;
      this.events.set(timelineEvent.id, { ...structuredClone(timelineEvent), caseId: input.caseId, sequence });
    }
    return structuredClone(feedback);
  }

  async deleteCase(input) {
    const record = this.cases.get(input.caseId);
    if (!record || record.status === "deleted") throw new Error("Case not active");
    const next = { ...structuredClone(record), status: "deleted", deletedAt: input.deletedAt, updatedAt: input.deletedAt };
    const sequence = [...this.events.values()].filter((event) => event.caseId === input.caseId).length + 1;
    this.cases.set(input.caseId, next);
    this.events.set(input.event.id, { ...structuredClone(input.event), caseId: input.caseId, sequence });
    return structuredClone(next);
  }
}

const { PilotCaseService } = await loadTypeScriptModule("./src/infrastructure/pilot/services/case-service.ts");
const { PilotCaseConflictError, PilotCasePayloadTooLargeError, PilotCaseValidationError } = await loadTypeScriptModule("./src/infrastructure/pilot/api/case-contracts.ts");
const TEST_SOURCE = { channel: "douyin_fan_group", detail: null };
const TEST_CONSENT = { version: "pilot-consent-v1", confirmedAt: "2026-08-21T00:00:00.000Z" };

function makeService() {
  const repository = new MemoryRepository();
  repository.errors = { PilotCaseConflictError };
  let id = 0;
  const service = new PilotCaseService({
    repository,
    versions: { appVersion: "app-test", knowledgeVersion: "knowledge-test", decisionVersion: "decision-test" },
    now: (() => { let tick = 0; return () => `2026-08-21T00:00:0${tick++}Z`; })(),
    createId: () => `id-${++id}`,
    createPublicCode: () => `CODE-${++id}`,
    createAccessToken: () => `token-${++id}`,
    hashAccessToken: async (token) => `hash:${token}`,
  });
  const createCase = service.createCase.bind(service);
  service.createCase = (input = {}) => createCase({ source: TEST_SOURCE, consent: TEST_CONSENT, ...input });
  return {
    repository,
    service,
  };
}

test("createCase stores an anonymous case, snapshot, initial event, and only returns the raw token", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  const record = repository.cases.get(access.caseId);
  assert.equal(access.publicCode.startsWith("CODE-"), true);
  assert.equal(record.accessTokenHash, `hash:${access.accessToken}`);
  assert.equal(record.sourceChannel, "douyin_fan_group");
  assert.equal(record.consentVersion, "pilot-consent-v1");
  assert.equal(record.accessToken, undefined);
  const storedPayload = JSON.parse(repository.snapshots.get(access.caseId).payload);
  assert.equal(storedPayload.workflow.stage, 5);
  assert.equal(storedPayload.schemaVersion, 3);
  assert.equal([...repository.events.values()][0].type, "case_created");
  // v3 干净切换：服务端只校验不改写，入库载荷与提交载荷一致（仅 consent 注入 domain）。
  const expectedSnapshot = makeSnapshot();
  expectedSnapshot.domain.consent = TEST_CONSENT;
  assert.deepEqual(storedPayload, expectedSnapshot);
});

test("replaying one client creation id returns the same case instead of creating a duplicate", async () => {
  const { service, repository } = makeService();
  const first = await service.createCase({ clientCreationId: "creation-001", accessToken: "persisted-token", initialSnapshot: makeSnapshot() });
  const replay = await service.createCase({ clientCreationId: "creation-001", accessToken: "persisted-token", initialSnapshot: makeSnapshot({ workflow: { stage: 1, phase: "safety" } }) });
  assert.equal(replay.caseId, first.caseId);
  assert.equal(replay.accessToken, first.accessToken);
  assert.equal(replay.replayed, true);
  assert.equal(repository.cases.size, 1);
  assert.equal(repository.events.size, 1);
});

test("a concurrent create race re-reads the winning case after the unique constraint", async () => {
  const { service, repository } = makeService();
  const input = { clientCreationId: "creation-race", accessToken: "persisted-token", initialSnapshot: makeSnapshot() };
  const [first, second] = await Promise.all([service.createCase(input), service.createCase(input)]);
  assert.equal(first.caseId, second.caseId);
  assert.equal(second.replayed, true);
  assert.equal(repository.cases.size, 1);
  assert.equal(repository.events.size, 1);
});

test("saveProgress advances the snapshot revision, appends a versioned event, and patches case state", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  const result = await service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: makeSnapshot({ workflow: { stage: 1, phase: "safety" }, rawComplaint: "膝前方不适" }),
    eventType: "intake_saved",
    eventPayload: { raw: "膝前方不适", parsed: { region: "knee" }, confirmed: false },
    eventId: "stable-event-1",
    currentStage: "症状信息",
    sessionCount: 1,
  });
  assert.equal(result.snapshot.revision, 1);
  assert.equal(result.event.sequence, 2);
  assert.equal(result.event.appVersion, "app-test");
  assert.equal(result.caseRecord.currentStage, "症状信息");
  assert.equal(repository.events.size, 2);
});

test("a case token cannot forge an administrator event source", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  await service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: makeSnapshot({ workflow: { stage: 1, phase: "safety" } }),
    eventType: "intake_saved",
    eventPayload: { sourceAttempt: "admin" },
    source: "admin",
  });
  const event = [...repository.events.values()].find((item) => item.type === "intake_saved");
  assert.equal(event?.source, "user");
});

test("repeating the same event is idempotent and an old revision cannot overwrite the new snapshot", async () => {
  const { service } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  const input = {
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: makeSnapshot({ workflow: { stage: 2, phase: "assessment" } }),
    eventType: "assessment_answered",
    eventPayload: { assessmentId: "a1", answer: "yes" },
    eventId: "stable-event-2",
  };
  const first = await service.saveProgress(input);
  const repeated = await service.saveProgress(input);
  assert.equal(repeated.snapshot.revision, first.snapshot.revision);
  assert.equal(repeated.event.id, first.event.id);
  await assert.rejects(
    service.saveProgress({ ...input, eventId: "stable-event-3", snapshot: makeSnapshot({ workflow: { stage: 1, phase: "safety" } }) }),
    (error) => error instanceof PilotCaseConflictError,
  );
});

test("feedback must reference an event from the same case", async () => {
  const first = makeService();
  const second = makeService();
  const firstCase = await first.service.createCase({ initialSnapshot: makeSnapshot() });
  const secondCase = await second.service.createCase({ initialSnapshot: makeSnapshot() });
  await assert.rejects(
    first.service.submitFeedback({ caseId: firstCase.caseId, accessToken: firstCase.accessToken, eventId: "id-2", stage: "评估", kind: "不相关" }),
  );
  const feedback = await second.service.submitFeedback({ caseId: secondCase.caseId, accessToken: secondCase.accessToken, stage: "评估", kind: "有帮助", message: "步骤清楚" });
  assert.equal(feedback.caseId, secondCase.caseId);
  assert.equal(feedback.eventId, null);
  assert.equal(feedback.sessionNumber, null);
  assert.equal(feedback.source, "in_app");
  assert.equal([...second.repository.events.values()].some((event) => event.type === "feedback_submitted" && event.source === "user"), true);
});

test("feedback keeps target and submission contexts separate", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  repository.cases.set(access.caseId, {
    ...repository.cases.get(access.caseId),
    sessionCount: 2,
  });
  const sourceEventId = [...repository.events.values()][0].id;
  const feedback = await service.submitFeedback({
    caseId: access.caseId,
    accessToken: access.accessToken,
    eventId: sourceEventId,
    sessionNumber: 1,
    stage: "处理复测",
    kind: "结果不符合实际",
    message: "后来在训练阶段才发现前面的复测结果不对",
    source: "admin",
    sourceSessionNumber: 2,
    sourceStage: "训练居家",
    sourceEventId,
  });
  assert.equal(feedback.sessionNumber, 1);
  assert.equal(feedback.stage, "处理复测");
  assert.equal(feedback.source, "in_app");
  assert.equal(feedback.sourceSessionNumber, 2);
  assert.equal(feedback.sourceStage, "训练居家");
  assert.equal(feedback.sourceEventId, sourceEventId);
});

test("feedback rejects invalid session context and oversized messages", async () => {
  const { service } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  await assert.rejects(service.submitFeedback({
    caseId: access.caseId,
    accessToken: access.accessToken,
    sessionNumber: 0,
    stage: "评估",
    kind: "其他",
  }));
  await assert.rejects(service.submitFeedback({
    caseId: access.caseId,
    accessToken: access.accessToken,
    stage: "评估",
    kind: "其他",
    message: "x".repeat(2001),
  }));
});

test("invalid credentials and unsupported event types are rejected before persistence", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  await assert.rejects(service.saveProgress({
    caseId: access.caseId,
    accessToken: "wrong-token",
    expectedRevision: 0,
    snapshot: makeSnapshot(),
    eventType: "intake_saved",
    eventPayload: {},
  }));
  await assert.rejects(service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: makeSnapshot(),
    eventType: "not-an-event",
    eventPayload: {},
  }));
  assert.equal(repository.events.size, 1);
});

test("oversized snapshot payloads are rejected before they reach the repository", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  await assert.rejects(service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: makeSnapshot({ oversized: "x".repeat(1_100_000) }),
    eventType: "session_saved",
    eventPayload: {},
  }), (error) => error instanceof PilotCasePayloadTooLargeError);
  assert.equal(repository.events.size, 1);
});

test("deleteCase marks the case inactive and appends a deletion event", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  const deleted = await service.deleteCase({ caseId: access.caseId, accessToken: access.accessToken });
  assert.equal(deleted.status, "deleted");
  assert.match(deleted.deletedAt, /^2026-08-21T00:00:/);
  const deletion = [...repository.events.values()].find((event) => event.type === "case_deleted");
  assert.equal(deletion?.source, "user");
  await assert.rejects(service.readCase({ caseId: access.caseId, accessToken: access.accessToken }));
  await assert.rejects(service.deleteCase({ caseId: access.caseId, accessToken: access.accessToken }));
});

test("REL-01: future snapshot schema versions are rejected before storage", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: makeSnapshot() });
  await assert.rejects(
    service.saveProgress({
      caseId: access.caseId,
      accessToken: access.accessToken,
      expectedRevision: 0,
      snapshot: makeSnapshot({ schemaVersion: 999, workflow: { stage: 2, phase: "assessment" } }),
      eventType: "assessment_answered",
      eventPayload: {},
    }),
    (error) => error instanceof PilotCaseValidationError && /unsupported snapshot schema version/.test(error.message),
  );
  assert.equal(repository.snapshots.size, 1);
});

test("SCHEMA-01: incomplete snapshots and invalid creation consent never reach storage", async () => {
  const first = makeService();
  await assert.rejects(
    first.service.createCase({ initialSnapshot: { schemaVersion: 3, contractRevision: 3 } }),
    (error) => error instanceof PilotCaseValidationError && /snapshot v3 sections are incomplete/.test(error.message),
  );
  assert.equal(first.repository.cases.size, 0);

  const second = makeService();
  await assert.rejects(
    second.service.createCase({ initialSnapshot: makeSnapshot(), consent: null }),
    (error) => error instanceof PilotCaseValidationError && /consent is required/.test(error.message),
  );
  assert.equal(second.repository.cases.size, 0);

  const third = makeService();
  await assert.rejects(
    third.service.createCase({ initialSnapshot: makeSnapshot(), source: { channel: "forged" } }),
    (error) => error instanceof PilotCaseValidationError && /source channel is invalid/.test(error.message),
  );
  assert.equal(third.repository.cases.size, 0);
});

test("REL-01: pilot app version stays in lockstep with package.json", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
  const releaseSource = await readFile(new URL("../../../src/infrastructure/pilot/release/release-version.ts", import.meta.url), "utf8");
  const expected = `rehabmind-pilot-app-${pkg.version}`;
  assert.match(releaseSource, /PILOT_RELEASE_MANIFEST\.appVersion/);
  const generatedSource = await readFile(new URL("../../../src/infrastructure/pilot/release/release.generated.ts", import.meta.url), "utf8");
  assert.match(generatedSource, new RegExp(`${expected.replaceAll(".", "\\.")}\\+`));
});
