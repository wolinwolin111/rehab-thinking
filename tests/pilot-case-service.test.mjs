import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

async function loadService() {
  const contractSource = await readFile(new URL("../app/pilot-case-contracts.ts", import.meta.url), "utf8");
  const timelineSource = await readFile(new URL("../app/pilot-timeline.ts", import.meta.url), "utf8");
  const viewSource = await readFile(new URL("../app/pilot-case-view.ts", import.meta.url), "utf8");
  const serviceSource = await readFile(new URL("../app/pilot-case-service.ts", import.meta.url), "utf8");
  const contract = ts.transpileModule(contractSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/export\s+/g, "");
  const timeline = ts.transpileModule(timelineSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import \{[\s\S]*?\} from "\.\/pilot-case-contracts";\s*/gs, "")
    .replace(/export\s+/g, "");
  const view = ts.transpileModule(viewSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import \{[\s\S]*?\} from \"\.\/pilot-case-contracts\";\s*/s, "")
    .replace(/import \{[\s\S]*?\} from \"\.\/pilot-timeline\";\s*/s, "")
    .replace(/export\s+/g, "");
  const service = ts.transpileModule(serviceSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import \{[\s\S]*?\} from "\.\/pilot-case-contracts";\s*/gs, "")
    .replace(/import \{[\s\S]*?\} from "\.\/pilot-case-view";\s*/s, "")
    .replace(/import \{[\s\S]*?\} from "\.\/pilot-snapshot-schema";\s*/s, "")
    .replace(/export\s+/g, "");
  const schemaSource = await readFile(new URL("../app/pilot-snapshot-schema.ts", import.meta.url), "utf8");
  const schema = ts.transpileModule(schemaSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import \{[\s\S]*?\} from "\.\/pilot-case-contracts";\s*/gs, "")
    .replace(/export\s+/g, "");
  const bundle = `${contract}\n${timeline}\n${view}\n${schema}\n${service}\nexport { PilotCaseService, PilotCaseConflictError, PilotCasePayloadTooLargeError, PilotCaseValidationError };`;
  const bundleUrl = `data:text/javascript;base64,${Buffer.from(bundle).toString("base64")}`;
  return import(bundleUrl);
}

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

const { PilotCaseService, PilotCaseConflictError, PilotCasePayloadTooLargeError, PilotCaseValidationError } = await loadService();

function makeService() {
  const repository = new MemoryRepository();
  repository.errors = { PilotCaseConflictError };
  let id = 0;
  return {
    repository,
    service: new PilotCaseService({
      repository,
      versions: { appVersion: "app-test", knowledgeVersion: "knowledge-test", decisionVersion: "decision-test" },
      now: (() => { let tick = 0; return () => `2026-08-21T00:00:0${tick++}Z`; })(),
      createId: () => `id-${++id}`,
      createPublicCode: () => `CODE-${++id}`,
      createAccessToken: () => `token-${++id}`,
      hashAccessToken: async (token) => `hash:${token}`,
    }),
  };
}

test("createCase stores an anonymous case, snapshot, initial event, and only returns the raw token", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: { step: "症状信息" } });
  const record = repository.cases.get(access.caseId);
  assert.equal(access.publicCode.startsWith("CODE-"), true);
  assert.equal(record.accessTokenHash, `hash:${access.accessToken}`);
  assert.equal(record.accessToken, undefined);
  const storedFirstPayload = JSON.parse(repository.snapshots.get(access.caseId).payload);
  assert.equal(storedFirstPayload.step, "症状信息");
  assert.equal(storedFirstPayload.schemaVersion, 1);
  assert.equal([...repository.events.values()][0].type, "case_created");
  // REL-01：入库载荷补烙显式 schema 版本（缺失视为 v1）。
  const storedPayload = JSON.parse(repository.snapshots.get(access.caseId).payload);
  assert.equal(storedPayload.schemaVersion, 1);
  assert.deepEqual({ ...storedPayload, schemaVersion: undefined }, { step: "症状信息", schemaVersion: undefined });
});

test("replaying one client creation id returns the same case instead of creating a duplicate", async () => {
  const { service, repository } = makeService();
  const first = await service.createCase({ clientCreationId: "creation-001", accessToken: "persisted-token", initialSnapshot: { step: "症状信息" } });
  const replay = await service.createCase({ clientCreationId: "creation-001", accessToken: "persisted-token", initialSnapshot: { step: "changed" } });
  assert.equal(replay.caseId, first.caseId);
  assert.equal(replay.accessToken, first.accessToken);
  assert.equal(replay.replayed, true);
  assert.equal(repository.cases.size, 1);
  assert.equal(repository.events.size, 1);
});

test("a concurrent create race re-reads the winning case after the unique constraint", async () => {
  const { service, repository } = makeService();
  const input = { clientCreationId: "creation-race", accessToken: "persisted-token", initialSnapshot: { step: "症状信息" } };
  const [first, second] = await Promise.all([service.createCase(input), service.createCase(input)]);
  assert.equal(first.caseId, second.caseId);
  assert.equal(second.replayed, true);
  assert.equal(repository.cases.size, 1);
  assert.equal(repository.events.size, 1);
});

test("saveProgress advances the snapshot revision, appends a versioned event, and patches case state", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase();
  const result = await service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: { step: "关键确认", rawComplaint: "膝前方不适" },
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
  const access = await service.createCase();
  await service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: { step: "关键确认" },
    eventType: "intake_saved",
    eventPayload: { sourceAttempt: "admin" },
    source: "admin",
  });
  const event = [...repository.events.values()].find((item) => item.type === "intake_saved");
  assert.equal(event?.source, "user");
});

test("repeating the same event is idempotent and an old revision cannot overwrite the new snapshot", async () => {
  const { service } = makeService();
  const access = await service.createCase();
  const input = {
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: { step: "评估检查" },
    eventType: "assessment_answered",
    eventPayload: { assessmentId: "a1", answer: "yes" },
    eventId: "stable-event-2",
  };
  const first = await service.saveProgress(input);
  const repeated = await service.saveProgress(input);
  assert.equal(repeated.snapshot.revision, first.snapshot.revision);
  assert.equal(repeated.event.id, first.event.id);
  await assert.rejects(
    service.saveProgress({ ...input, eventId: "stable-event-3", snapshot: { step: "旧页面" } }),
    (error) => error instanceof PilotCaseConflictError,
  );
});

test("feedback must reference an event from the same case", async () => {
  const first = makeService();
  const second = makeService();
  const firstCase = await first.service.createCase();
  const secondCase = await second.service.createCase();
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
  const access = await service.createCase();
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
  const access = await service.createCase();
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
  const access = await service.createCase();
  await assert.rejects(service.saveProgress({
    caseId: access.caseId,
    accessToken: "wrong-token",
    expectedRevision: 0,
    snapshot: { step: "症状信息" },
    eventType: "intake_saved",
    eventPayload: {},
  }));
  await assert.rejects(service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: { step: "症状信息" },
    eventType: "not-an-event",
    eventPayload: {},
  }));
  assert.equal(repository.events.size, 1);
});

test("oversized snapshot payloads are rejected before they reach the repository", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase();
  await assert.rejects(service.saveProgress({
    caseId: access.caseId,
    accessToken: access.accessToken,
    expectedRevision: 0,
    snapshot: { step: "症状信息", oversized: "x".repeat(1_100_000) },
    eventType: "session_saved",
    eventPayload: {},
  }), (error) => error instanceof PilotCasePayloadTooLargeError);
  assert.equal(repository.events.size, 1);
});

test("deleteCase marks the case inactive and appends a deletion event", async () => {
  const { service, repository } = makeService();
  const access = await service.createCase({ initialSnapshot: { step: "症状信息" } });
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
  const access = await service.createCase({ initialSnapshot: { step: "症状信息" } });
  await assert.rejects(
    service.saveProgress({
      caseId: access.caseId,
      accessToken: access.accessToken,
      expectedRevision: 0,
      snapshot: { schemaVersion: 999, step: "评估检查" },
      eventType: "assessment_answered",
      eventPayload: {},
    }),
    (error) => error instanceof PilotCaseValidationError && /schema version 999/.test(error.message),
  );
  assert.equal(repository.snapshots.size, 1);
});

test("REL-01: pilot app version stays in lockstep with package.json", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const releaseSource = await readFile(new URL("../app/pilot-release.ts", import.meta.url), "utf8");
  const expected = `rehabmind-pilot-app-${pkg.version}`;
  assert.match(releaseSource, new RegExp(`appVersion:\\s*"${expected}"`));
});