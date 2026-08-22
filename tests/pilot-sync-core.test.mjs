import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/pilot-sync-core.ts", import.meta.url), "utf8");
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
