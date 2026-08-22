import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/local-case-store.ts", import.meta.url), "utf8");
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
