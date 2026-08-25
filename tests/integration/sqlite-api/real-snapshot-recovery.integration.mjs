// 批次 2b：真实快照回灌——用浏览器实际产生的本地草稿快照（非手写夹具）走完
// 「迁移校验 → 服务端创建 → 重启恢复」纵向链，堵住“夹具能过、真数据不能”的保真度缺口。
// 夹具再生成：node tests/browser/support/export-real-snapshot.mjs [baseURL]
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { createSqliteApiHarness } from "./support.mjs";

const FIXTURE = new URL("../../fixtures/real-snapshot-sample.json", import.meta.url);

let fixtureText;
try {
  fixtureText = await readFile(FIXTURE, "utf8");
} catch {
  fixtureText = null;
}

test("TEST-2b: 真实浏览器快照通过迁移、入库、重启后按原文恢复", async () => {
  if (fixtureText === null) {
    throw new Error("缺少 tests/fixtures/real-snapshot-sample.json —— 请先运行 node tests/browser/support/export-real-snapshot.mjs 重新导出");
  }
  const fixture = JSON.parse(fixtureText);
  const snapshot = fixture.draft?.snapshot;
  assert.ok(snapshot && typeof snapshot === "object", "夹具中不存在 draft.snapshot");
  assert.equal(fixture.description && fixture.draft.snapshot?.intake?.description, fixture.description, "夹具描述与快照内容不一致，夹具已损坏");

  const snapshotSchema = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/snapshot-schema.ts");
  const migrated = snapshotSchema.migratePilotSnapshot(structuredClone(snapshot));
  assert.equal(migrated.ok, true, `真实快照未通过生产校验：${migrated.ok ? "" : migrated.reason}`);

  const api = await createSqliteApiHarness("real-snapshot");
  try {
    const created = await api.create({
      clientCreationId: "real-snapshot-export",
      accessToken: "real-snapshot-token",
      initialSnapshot: migrated.snapshot ?? snapshot,
    });
    assert.equal(created.status, 201);

    api.restart();
    const restored = await api.read(created.body.case.caseId, created.body.case.accessToken);
    assert.equal(restored.status, 200);
    const payload = restored.body.case.snapshot.payload;
    assert.deepEqual(payload.intake?.description, fixture.description, "恢复后的主诉描述与浏览器原文不一致");
    const remigrated = snapshotSchema.migratePilotSnapshot(payload);
    assert.equal(remigrated.ok, true);
  } finally {
    await api.close();
  }
});

test("TEST-2b: 真实快照案例同样受访问凭证隔离约束", async () => {
  if (fixtureText === null) throw new Error("缺少真实快照夹具，请先运行导出脚本");
  const fixture = JSON.parse(fixtureText);
  const api = await createSqliteApiHarness("real-snapshot-perm");
  try {
    const created = await api.create({
      clientCreationId: "real-snapshot-perm",
      accessToken: "real-snapshot-owner",
      initialSnapshot: fixture.draft.snapshot,
    });
    assert.equal(created.status, 201);
    const stranger = await api.read(created.body.case.caseId, "not-the-owner");
    assert.equal(stranger.status, 401);
    const byCode = await api.read(created.body.case.publicCode, "real-snapshot-owner");
    assert.equal(byCode.status, 404, "公开编号不得读取记录");
  } finally {
    await api.close();
  }
});
