import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const identity = await loadTypeScriptModule("./src/domain/rehab/history/session-identity-core.ts");

test("RMD-HIST-02: new technical identities are namespaced and distinct", () => {
  const thread = identity.createProblemThreadId();
  const session = identity.createSessionId();
  assert.match(thread, /^thread-/);
  assert.match(session, /^session-/);
  assert.notEqual(thread, session);
});

test("RMD-HIST-02/03: legacy identity is stable and normalizes invalid session numbers", () => {
  const first = identity.legacySessionIdentity("case/001", 0);
  const second = identity.legacySessionIdentity("case/001", 0);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    problemThreadId: "thread-legacy-case/001",
    sessionId: "session-legacy-case/001-1",
  });
});

test("RMD-HIST-01: saving a draft clears completion metadata without mutating the prior identity", () => {
  const original = {
    sessionId: "session-1",
    problemThreadId: "thread-1",
    sessionNumber: 1,
    status: "completed",
    startedAt: "2026-08-20T08:00:00.000Z",
    lastDraftSavedAt: "2026-08-20T08:30:00.000Z",
    completedAt: "2026-08-20T09:00:00.000Z",
    completionReason: "workflow_completed",
  };
  const draft = identity.markSessionDraft(original, "2026-08-21T08:00:00.000Z");
  assert.equal(draft.status, "draft");
  assert.equal(draft.lastDraftSavedAt, "2026-08-21T08:00:00.000Z");
  assert.equal(draft.completedAt, undefined);
  assert.equal(draft.completionReason, undefined);
  assert.equal(original.status, "completed");
  assert.equal(original.completedAt, "2026-08-20T09:00:00.000Z");
});

test("RMD-HIST-01: completion is explicit and preserves session identity", () => {
  const result = identity.markSessionCompleted({
    sessionId: "session-2",
    problemThreadId: "thread-1",
    sessionNumber: 2,
    status: "draft",
    startedAt: "2026-08-21T08:00:00.000Z",
  }, "2026-08-21T09:00:00.000Z", "referred");
  assert.equal(result.sessionId, "session-2");
  assert.equal(result.problemThreadId, "thread-1");
  assert.equal(result.status, "completed");
  assert.equal(result.completedAt, "2026-08-21T09:00:00.000Z");
  assert.equal(result.completionReason, "referred");
});
