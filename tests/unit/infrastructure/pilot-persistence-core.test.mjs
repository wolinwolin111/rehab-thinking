import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

async function load(sourcePath) {
  const source = await readFile(new URL(sourcePath, import.meta.url.replace(/tests\\.*$/, "tests/")), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const syncCore = await load("../../../src/infrastructure/pilot/persistence/sync-core.ts");
const identityCore = await load("../../../src/infrastructure/pilot/persistence/local-case-identity.ts");
const persistenceCore = await load("../../../src/infrastructure/pilot/persistence/persistence-controller.ts");

test("equal server revision with dirty local data enters an explicit conflict", () => {
  assert.equal(syncCore.decidePilotRestoreSource(
    { serverRevision: 3, dirty: true },
    { revision: 3 },
  ), "conflict");
});

test("a dirty local snapshot is preserved when the remote revision has not advanced", () => {
  assert.equal(syncCore.decidePilotRestoreSource(
    { serverRevision: 3, dirty: true },
    { revision: 2 },
  ), "use-local");
});

test("a clean local snapshot accepts a newer remote revision", () => {
  assert.equal(syncCore.decidePilotRestoreSource(
    { serverRevision: 3, dirty: false },
    { revision: 4 },
  ), "use-remote");
});

test("same content can reconcile metadata without creating a false conflict", () => {
  const fingerprint = syncCore.contentFingerprint({ step: 2, intake: { regionId: "knee" } });
  assert.equal(syncCore.decidePilotRestoreSource(
    { serverRevision: 3, dirty: true, localContentFingerprint: fingerprint },
    { revision: 4, contentFingerprint: fingerprint },
  ), "use-remote");
});

test("new local case identities stay independent even when complaint text matches", () => {
  const first = identityCore.createLocalCaseId();
  const second = identityCore.createLocalCaseId();
  assert.notEqual(first, second);
  assert.equal(identityCore.savedRecordIdentity({ localCaseId: first, caseKey: "same complaint" }), first);
  assert.equal(identityCore.savedRecordIdentity({ caseKey: "legacy complaint", id: "case-1" }), "legacy complaint");
});

test("SYNC-01: a delayed save completion cannot mark a newer pending generation as saved", async () => {
  const writes = [];
  const states = [];
  const controller = persistenceCore.createPilotDraftPersistenceController({
    delayMs: 60_000,
    save(value) {
      return new Promise((resolve) => writes.push({ value, resolve }));
    },
    onState: (state) => states.push(state),
  });

  controller.schedule({ caseId: "case-a", step: 1 });
  const first = controller.flush();
  await new Promise((resolve) => setImmediate(resolve));
  controller.schedule({ caseId: "case-b", step: 2 });
  writes[0].resolve();
  await first;
  const stateAfterOldSave = states.at(-1);

  const second = controller.flush();
  await new Promise((resolve) => setImmediate(resolve));
  writes[1].resolve();
  await second;
  controller.dispose();

  assert.equal(stateAfterOldSave, "local-saving");
  assert.equal(states.at(-1), "local-saved");
});

test("SYNC-01: record-list writes stay ordered so deletion cannot be overwritten by an older save", async () => {
  const pending = [];
  const started = [];
  const queue = persistenceCore.createPilotSerialPersistenceQueue((records) => new Promise((resolve) => {
    started.push(records.map((item) => item.id));
    pending.push(resolve);
  }));
  const oldWrite = queue.enqueue([{ id: "case-a" }]);
  const deleteWrite = queue.enqueue([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [["case-a"]]);
  pending.shift()();
  await oldWrite;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [["case-a"], []]);
  pending.shift()();
  await deleteWrite;
  await queue.drain();
});
