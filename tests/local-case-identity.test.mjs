import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/local-case-identity.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const identity = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("DATA-02: identical complaints produce independent case identities", () => {
  const complaint = "右膝下楼时刺痛，持续两周，想恢复跑步";
  const first = { ...identityRecordFor(complaint) };
  const second = { ...identityRecordFor(complaint) };
  assert.notEqual(first.localCaseId, second.localCaseId);
  assert.equal(identity.savedRecordIdentity(first), first.localCaseId);
  assert.equal(identity.savedRecordIdentity(second), second.localCaseId);
});

function identityRecordFor(complaint) {
  return {
    localCaseId: identity.createLocalCaseId(),
    complaint,
    snapshot: { intake: { description: complaint } },
  };
}

test("created local ids are unique and namespaced", () => {
  const ids = new Set(Array.from({ length: 200 }, () => identity.createLocalCaseId()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.ok(id.startsWith("local-"), `unexpected id shape: ${id}`);
});

test("record identity prefers the stable local id over legacy keys", () => {
  assert.equal(
    identity.savedRecordIdentity({ localCaseId: "local-a", caseKey: "legacy-b", id: "c" }),
    "local-a",
  );
  // 旧记录没有 localCaseId 时回退到旧键；都没有时为空串而不是抛错。
  assert.equal(identity.savedRecordIdentity({ caseKey: "legacy-b", id: "c" }), "legacy-b");
  assert.equal(identity.savedRecordIdentity({}), "");
});
