import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const sync = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/sync-core.ts");

test("A5 SYNC-01: a late save response cannot overwrite the active operation", () => {
  let state = sync.createPilotSyncMachineState("case-a");
  state = sync.reducePilotSyncState(state, {
    type: "remote-save-started",
    operation: { caseId: "case-a", sessionId: "session-1", requestId: "request-old", baseRevision: 2 },
  });
  state = sync.reducePilotSyncState(state, {
    type: "remote-save-started",
    operation: { caseId: "case-a", sessionId: "session-1", requestId: "request-new", baseRevision: 2 },
  });
  const afterLateResponse = sync.reducePilotSyncState(state, {
    type: "remote-save-succeeded",
    operation: { caseId: "case-a", sessionId: "session-1", requestId: "request-old", baseRevision: 2 },
    revision: 3,
  });

  assert.deepEqual(afterLateResponse, state);
  const settled = sync.reducePilotSyncState(state, {
    type: "remote-save-succeeded",
    operation: { caseId: "case-a", sessionId: "session-1", requestId: "request-new", baseRevision: 2 },
    revision: 3,
  });
  assert.equal(settled.status, "synced");
  assert.equal(settled.serverRevision, 3);
  assert.equal(settled.activeOperation, null);
});

test("A5 SYNC-01: switching or deleting a case invalidates its pending response", () => {
  const operation = { caseId: "case-a", sessionId: "session-1", requestId: "request-a", baseRevision: 1 };
  let state = sync.createPilotSyncMachineState("case-a");
  state = sync.reducePilotSyncState(state, { type: "remote-save-started", operation });
  state = sync.reducePilotSyncState(state, { type: "case-selected", caseId: "case-b", serverRevision: 0 });
  assert.equal(sync.reducePilotSyncState(state, { type: "remote-save-succeeded", operation, revision: 2 }).caseId, "case-b");

  state = sync.reducePilotSyncState(state, { type: "delete-started", caseId: "case-b", requestId: "delete-b" });
  const deleted = sync.reducePilotSyncState(state, { type: "delete-succeeded", caseId: "case-b", requestId: "delete-b" });
  assert.equal(deleted.status, "deleted");
  assert.equal(deleted.activeOperation, null);
});

test("A5 SYNC-01: restore outcomes use the same state machine as writes", () => {
  let state = sync.createPilotSyncMachineState("case-a", 2);
  state = sync.reducePilotSyncState(state, { type: "restore-started", caseId: "case-a" });
  assert.equal(state.status, "syncing");
  state = sync.reducePilotSyncState(state, { type: "restore-conflict", caseId: "case-a" });
  assert.equal(state.status, "conflict");
  state = sync.reducePilotSyncState(state, { type: "restore-succeeded", caseId: "case-a", revision: 4 });
  assert.equal(state.status, "synced");
  assert.equal(state.serverRevision, 4);
});
