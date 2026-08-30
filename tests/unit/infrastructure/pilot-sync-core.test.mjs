import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";
import { completePilotSnapshot } from "../../integration/sqlite-api/support.mjs";

const source = await readFile(new URL("../../../src/infrastructure/pilot/persistence/sync-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const sync = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function localState(overrides = {}) {
  return { serverRevision: 3, dirty: false, ...overrides };
}

test("without local state the remote copy is used", () => {
  assert.equal(sync.decidePilotRestoreSource(null, { revision: 0 }), "use-remote");
});

test("clean local state follows the newer side without content checks", () => {
  assert.equal(sync.decidePilotRestoreSource(localState(), { revision: 3 }), "use-remote");
  assert.equal(sync.decidePilotRestoreSource(localState(), { revision: 5 }), "use-remote");
  // 远端比本地已知的服务器修订号还旧：远端不是我们同步过的版本，用本地。
  assert.equal(sync.decidePilotRestoreSource(localState(), { revision: 1 }), "use-local");
});

test("dirty local state with identical content fingerprints safely uses remote", () => {
  const fingerprint = "9a11b2c3";
  const decision = sync.decidePilotRestoreSource(
    localState({ dirty: true, localContentFingerprint: fingerprint }),
    { revision: 4, contentFingerprint: fingerprint },
  );
  assert.equal(decision, "use-remote");
});

test("DATA-01: equal revision with different content conflicts instead of silently losing either side", () => {
  const decision = sync.decidePilotRestoreSource(
    localState({ dirty: true, serverRevision: 3 }),
    { revision: 3, contentFingerprint: "ffffffff" },
  );
  assert.equal(decision, "conflict");

  // 远端更新且内容不同同样是冲突，不允许静默覆盖未同步的本地修改。
  const newerRemote = sync.decidePilotRestoreSource(
    localState({ dirty: true, serverRevision: 3 }),
    { revision: 6, contentFingerprint: "ffffffff" },
  );
  assert.equal(newerRemote, "conflict");
});

test("dirty local state keeps the local copy when the remote is older than the last sync", () => {
  const decision = sync.decidePilotRestoreSource(
    localState({ dirty: true, serverRevision: 5 }),
    { revision: 2, contentFingerprint: "ffffffff" },
  );
  assert.equal(decision, "use-local");
});

test("content fingerprints are deterministic, key-order independent and value sensitive", () => {
  const a = sync.contentFingerprint({ step: 2, intake: { description: "右膝下楼刺痛" } });
  const reordered = sync.contentFingerprint({ intake: { description: "右膝下楼刺痛" }, step: 2 });
  assert.equal(a, reordered);
  assert.notEqual(a, sync.contentFingerprint({ step: 3, intake: { description: "右膝下楼刺痛" } }));
  assert.notEqual(a, sync.contentFingerprint({ step: 2, intake: { description: "左踝崴伤肿胀" } }));
});

test("A5 SYNC-02: conflict summaries identify modules without returning health text", () => {
  // v3：冲突模块按 identity/domain/workflow/draft 路径识别，输入使用 v3 四段快照。
  const local = completePilotSnapshot({ domain: { intake: { description: "private local text" } } });
  const remote = completePilotSnapshot({
    domain: { intake: { description: "private remote text" } },
    identity: { sessionNumber: 2 },
  });
  const sections = sync.summarizePilotSnapshotConflict(local, remote);
  assert.deepEqual(sections, ["症状信息", "康复记录"]);
  assert.doesNotMatch(JSON.stringify(sections), /private|local|remote/);
});

test("A5 SYNC-02: saving a conflict as new strips every remote identity field", () => {
  const copy = sync.buildPilotConflictCaseCopy({
    id: "old-id",
    localCaseId: "old-local",
    pilotCaseId: "remote-id",
    pilotClientCreationId: "creation-id",
    pilotPublicCode: "PUBLIC01",
    pilotAccessToken: "secret-token",
    pilotRevision: 5,
    pilotLastSyncedRevision: 4,
    pilotConflictRevision: 6,
    pilotConflictSnapshot: { step: 2 },
    pilotVersions: { appVersion: "old" },
    snapshot: { step: 3 },
  }, { id: "new-id", localCaseId: "new-local" });

  assert.equal(copy.id, "new-id");
  assert.equal(copy.localCaseId, "new-local");
  assert.equal(copy.pilotDirty, true);
  for (const key of ["pilotCaseId", "pilotClientCreationId", "pilotPublicCode", "pilotAccessToken", "pilotRevision", "pilotConflictSnapshot", "pilotConflictRevision", "pilotVersions"]) {
    assert.equal(key in copy, false, key);
  }
  assert.deepEqual(copy.snapshot, { step: 3 });
});
