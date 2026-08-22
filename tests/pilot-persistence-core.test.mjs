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

const syncCore = await load("../app/pilot-sync-core.ts");
const identityCore = await load("../app/local-case-identity.ts");

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
