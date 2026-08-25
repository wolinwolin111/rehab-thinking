import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/infrastructure/pilot/persistence/local-case-store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const store = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const values = new Map();
globalThis.window = {
  localStorage: {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  },
};

test("restricted browsers retain all local cases instead of silently truncating the list", async () => {
  const records = Array.from({ length: 100 }, (_, index) => ({ localCaseId: `local-${index}`, snapshot: { step: index % 6 } }));
  assert.equal(await store.saveLocalCaseRecords(records), "localStorage");
  const loaded = await store.loadLocalCaseRecords();
  assert.equal(loaded.records.length, 100);
  assert.deepEqual(loaded.records[0], records[0]);
  assert.deepEqual(loaded.records.at(-1), records.at(-1));
});

test("clearing the local repository removes the complete fallback copy", async () => {
  await store.clearLocalCaseRecords();
  const loaded = await store.loadLocalCaseRecords();
  assert.deepEqual(loaded.records, []);
});

test("active drafts survive the fallback backend and clear independently from saved cases", async () => {
  const draft = { localCaseId: "local-draft-1", snapshot: { step: 0, intake: { description: "草稿" } } };
  assert.equal(await store.saveLocalDraft(draft), "localStorage");
  assert.deepEqual(await store.loadLocalDraft(), draft);
  assert.deepEqual((await store.loadLocalCaseRecords()).records, []);
  await store.clearLocalDraft();
  assert.equal(await store.loadLocalDraft(), null);
});

test("test workbench storage is isolated from user records and drafts", async () => {
  await store.saveLocalCaseRecords([{ localCaseId: "user-case" }], "user");
  await store.saveLocalCaseRecords([{ localCaseId: "test-case" }], "test");
  await store.saveLocalDraft({ localCaseId: "user-draft" }, "user");
  await store.saveLocalDraft({ localCaseId: "test-draft" }, "test");
  assert.equal((await store.loadLocalCaseRecords("user")).records[0].localCaseId, "user-case");
  assert.equal((await store.loadLocalCaseRecords("test")).records[0].localCaseId, "test-case");
  await store.clearLocalCaseRecords("test");
  await store.clearLocalDraft("test");
  assert.equal((await store.loadLocalCaseRecords("test")).records.length, 0);
  assert.equal((await store.loadLocalCaseRecords("user")).records[0].localCaseId, "user-case");
  assert.equal((await store.loadLocalDraft("user")).localCaseId, "user-draft");
  values.clear();
});

test("A5 damaged fallback JSON is retained and reported without exposing its contents", async () => {
  values.set(store.LEGACY_LOCAL_CASES_KEY, "{not-json");
  values.set(store.LOCAL_DRAFT_KEY, "[also-not-json");
  const records = await store.loadLocalCaseRecords();
  const draft = await store.loadLocalDraftWithDiagnostics();

  assert.deepEqual(records.records, []);
  assert.deepEqual(records.diagnostic, {
    code: "corrupt-local-records",
    storageKey: store.LEGACY_LOCAL_CASES_KEY,
    byteLength: 9,
  });
  assert.equal(values.get(store.LEGACY_LOCAL_CASES_KEY), "{not-json");
  assert.equal(draft.draft, null);
  assert.equal(draft.diagnostic.code, "corrupt-local-draft");
  assert.equal("raw" in draft.diagnostic, false);
  assert.equal(values.get(store.LOCAL_DRAFT_KEY), "[also-not-json");
  values.clear();
});
