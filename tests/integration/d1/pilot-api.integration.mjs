import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = (process.env.D1_TEST_URL ?? "http://localhost:3000").replace(/\/$/, "");
const inviteToken = process.env.PILOT_INVITE_TOKEN ?? "local-rehabmind-invite";
const adminKey = process.env.PILOT_ADMIN_KEY ?? "local-rehabmind-admin";
const runId = `d1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function requestRaw(path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body });
  return { status: response.status, body: await response.json().catch(() => null) };
}

function createPayload(suffix) {
  return {
    clientCreationId: `${runId}-${suffix}`,
    accessToken: `${runId}-access-${suffix}`,
    initialSnapshot: { schemaVersion: 1, step: 0, intake: { description: `D1 fixture ${runId}-${suffix}` } },
    currentStage: "症状信息",
    isBilateral: false,
    hasSafetyStop: false,
  };
}

test("D1 HTTP contract covers invitation, idempotency, revisions, feedback, isolation and deletion", async () => {
  const denied = await request("/api/pilot/cases", { method: "POST", body: createPayload("no-invite") });
  assert.equal(denied.status, 403);
  assert.equal(denied.body?.code, "invite_required");

  const payload = createPayload("primary");
  const created = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: payload,
  });
  assert.equal(created.status, 201);
  assert.equal(typeof created.body?.case?.caseId, "string");
  const access = created.body.case;

  const replayed = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: payload,
  });
  assert.equal(replayed.status, 201);
  assert.equal(replayed.body.case.caseId, access.caseId);
  assert.equal(replayed.body.case.accessToken, access.accessToken);
  assert.equal(replayed.body.case.replayed, true);

  const conflictingReplay = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: { ...payload, accessToken: `${runId}-different-token` },
  });
  assert.equal(conflictingReplay.status, 409);

  const wrongRead = await request(`/api/pilot/cases/${access.caseId}`, { headers: { authorization: "Bearer wrong-access-token" } });
  assert.equal(wrongRead.status, 401);
  const read = await request(`/api/pilot/cases/${access.caseId}`, { headers: { authorization: `Bearer ${access.accessToken}` } });
  assert.equal(read.status, 200);
  assert.equal(read.body.case.snapshot.revision, 0);

  const progressBody = {
    expectedRevision: 0,
    snapshot: { schemaVersion: 1, step: 1, intake: { description: `D1 progress ${runId}` } },
    eventType: "session_saved",
    eventId: `${runId}-progress-1`,
    eventPayload: { raw: { source: "user" }, parsed: { runId }, inferred: {} },
    currentStage: "关键确认",
    sessionCount: 1,
  };
  const progress = await request(`/api/pilot/cases/${access.caseId}/progress`, {
    method: "POST",
    headers: { authorization: `Bearer ${access.accessToken}` },
    body: progressBody,
  });
  assert.equal(progress.status, 200);
  assert.equal(progress.body.progress.snapshot.revision, 1);

  const progressReplay = await request(`/api/pilot/cases/${access.caseId}/progress`, {
    method: "POST",
    headers: { authorization: `Bearer ${access.accessToken}` },
    body: progressBody,
  });
  assert.equal(progressReplay.status, 200);
  assert.equal(progressReplay.body.progress.snapshot.revision, 1);

  const conflictingEvent = await request(`/api/pilot/cases/${access.caseId}/progress`, {
    method: "POST",
    headers: { authorization: `Bearer ${access.accessToken}` },
    body: { ...progressBody, snapshot: { ...progressBody.snapshot, step: 99 }, eventPayload: { changed: true } },
  });
  assert.equal(conflictingEvent.status, 409);

  const invalidRevision = await request(`/api/pilot/cases/${access.caseId}/progress`, {
    method: "POST",
    headers: { authorization: `Bearer ${access.accessToken}` },
    body: { ...progressBody, eventId: `${runId}-invalid-revision`, expectedRevision: "0" },
  });
  assert.equal(invalidRevision.status, 400);

  const stale = await request(`/api/pilot/cases/${access.caseId}/progress`, {
    method: "POST",
    headers: { authorization: `Bearer ${access.accessToken}` },
    body: { ...progressBody, eventId: `${runId}-stale`, snapshot: { ...progressBody.snapshot, step: 2 } },
  });
  assert.equal(stale.status, 409);

  const feedback = await request(`/api/pilot/cases/${access.caseId}/feedback`, {
    method: "POST",
    headers: { authorization: `Bearer ${access.accessToken}` },
    body: {
      eventId: progressBody.eventId,
      sessionNumber: 1,
      stage: "关键确认",
      kind: "页面问题",
      message: "D1 集成夹具反馈",
      sourceSessionNumber: 1,
      sourceStage: "症状信息",
      sourceEventId: progressBody.eventId,
    },
  });
  assert.equal(feedback.status, 201);

  const noAdmin = await request("/api/pilot/admin/cases", {});
  assert.equal(noAdmin.status, 401);
  const admin = await request(`/api/pilot/admin/cases/${access.caseId}`, { headers: { "x-pilot-admin-key": adminKey } });
  assert.equal(admin.status, 200);
  assert.equal("accessTokenHash" in admin.body.case.caseRecord, false);
  assert.equal(admin.body.case.timeline.valid, true);
  assert.ok(admin.body.case.events.some((event) => event.type === "session_saved"));
  assert.ok(admin.body.case.events.some((event) => event.type === "feedback_submitted"));

  const adminList = await request("/api/pilot/admin/cases", { headers: { "x-pilot-admin-key": adminKey } });
  assert.equal(adminList.status, 200);
  assert.ok(adminList.body.cases.some((item) => item.id === access.caseId));
  assert.ok(adminList.body.cases.every((item) => !("accessTokenHash" in item)));

  const secondPayload = createPayload("isolated");
  const second = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: secondPayload,
  });
  assert.equal(second.status, 201);
  const crossRead = await request(`/api/pilot/cases/${access.caseId}`, { headers: { authorization: `Bearer ${second.body.case.accessToken}` } });
  assert.equal(crossRead.status, 401);

  const crossFeedback = await request(`/api/pilot/cases/${second.body.case.caseId}/feedback`, {
    method: "POST",
    headers: { authorization: `Bearer ${second.body.case.accessToken}` },
    body: {
      eventId: progressBody.eventId,
      stage: "后续康复",
      kind: "跨案例事件",
      sourceEventId: progressBody.eventId,
    },
  });
  assert.equal(crossFeedback.status, 400);

  const race = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: createPayload("concurrent"),
  });
  assert.equal(race.status, 201);
  const raceProgress = {
    expectedRevision: 0,
    snapshot: { schemaVersion: 1, step: 1, intake: { description: `D1 concurrent ${runId}` } },
    eventType: "session_saved",
    eventPayload: { source: "concurrent-test" },
    currentStage: "关键确认",
  };
  const [raceA, raceB] = await Promise.all([
    request(`/api/pilot/cases/${race.body.case.caseId}/progress`, {
      method: "POST",
      headers: { authorization: `Bearer ${race.body.case.accessToken}` },
      body: { ...raceProgress, eventId: `${runId}-race-a` },
    }),
    request(`/api/pilot/cases/${race.body.case.caseId}/progress`, {
      method: "POST",
      headers: { authorization: `Bearer ${race.body.case.accessToken}` },
      body: { ...raceProgress, eventId: `${runId}-race-b` },
    }),
  ]);
  assert.deepEqual([raceA.status, raceB.status].sort(), [200, 409]);
  const raceAdmin = await request(`/api/pilot/admin/cases/${race.body.case.caseId}`, { headers: { "x-pilot-admin-key": adminKey } });
  assert.equal(raceAdmin.status, 200);
  assert.equal(raceAdmin.body.case.snapshot.revision, 1);
  assert.equal(raceAdmin.body.case.events.filter((event) => event.type === "session_saved").length, 1);

  const deleted = await request(`/api/pilot/cases/${access.caseId}`, { method: "DELETE", headers: { authorization: `Bearer ${access.accessToken}` } });
  assert.equal(deleted.status, 200);
  const afterDelete = await request(`/api/pilot/cases/${access.caseId}`, { headers: { authorization: `Bearer ${access.accessToken}` } });
  assert.equal(afterDelete.status, 401);
  const deletedAdmin = await request(`/api/pilot/admin/cases/${access.caseId}`, { headers: { "x-pilot-admin-key": adminKey } });
  assert.equal(deletedAdmin.status, 200);
  assert.equal(deletedAdmin.body.case.caseRecord.status, "deleted");

  const secondDeleted = await request(`/api/pilot/cases/${second.body.case.caseId}`, { method: "DELETE", headers: { authorization: `Bearer ${second.body.case.accessToken}` } });
  assert.equal(secondDeleted.status, 200);
  const raceDeleted = await request(`/api/pilot/cases/${race.body.case.caseId}`, { method: "DELETE", headers: { authorization: `Bearer ${race.body.case.accessToken}` } });
  assert.equal(raceDeleted.status, 200);
});

test("D1 HTTP body guard rejects oversized create payloads", async () => {
  const oversized = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: { ...createPayload("oversized"), initialSnapshot: { text: "x".repeat(1_600_000) } },
  });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body?.code, "payload_too_large");
});

test("D1 HTTP validation rejects malformed JSON, wrong content type, empty token and invalid snapshot objects", async () => {
  const malformed = await requestRaw("/api/pilot/cases", {
    method: "POST",
    headers: { "content-type": "application/json", "x-pilot-invite-token": inviteToken },
    body: "{\"clientCreationId\":" ,
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body?.code, "validation");

  const wrongContentType = await requestRaw("/api/pilot/cases", {
    method: "POST",
    headers: { "content-type": "text/plain", "x-pilot-invite-token": inviteToken },
    body: "{}",
  });
  assert.equal(wrongContentType.status, 400);
  assert.equal(wrongContentType.body?.code, "validation");

  const emptyToken = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: { ...createPayload("empty-token"), accessToken: "" },
  });
  assert.equal(emptyToken.status, 400);
  assert.equal(emptyToken.body?.code, "validation");

  const created = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: createPayload("invalid-snapshot"),
  });
  assert.equal(created.status, 201);
  const invalidSnapshot = await request(`/api/pilot/cases/${created.body.case.caseId}/progress`, {
    method: "POST",
    headers: { authorization: `Bearer ${created.body.case.accessToken}` },
    body: {
      expectedRevision: 0,
      snapshot: null,
      eventType: "session_saved",
      eventPayload: {},
    },
  });
  assert.equal(invalidSnapshot.status, 400);
  assert.equal(invalidSnapshot.body?.code, "validation");

  const deleted = await request(`/api/pilot/cases/${created.body.case.caseId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${created.body.case.accessToken}` },
  });
  assert.equal(deleted.status, 200);
});

test("D1 HTTP purge physically removes soft-deleted cases (PRIV-02)", async () => {
  const payload = createPayload("purge-target");
  const created = await request("/api/pilot/cases", {
    method: "POST",
    headers: { "x-pilot-invite-token": inviteToken },
    body: payload,
  });
  assert.equal(created.status, 201);
  const access = created.body.case;

  const softDelete = await request(`/api/pilot/cases/${access.caseId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${access.accessToken}` },
  });
  assert.equal(softDelete.status, 200);

  // 软删后普通凭据不可读，但管理员仍可见删除状态
  const afterSoft = await request(`/api/pilot/cases/${access.caseId}`, {
    headers: { authorization: `Bearer ${access.accessToken}` },
  });
  assert.equal(afterSoft.status, 401);
  const adminBefore = await request(`/api/pilot/admin/cases/${access.caseId}`, {
    headers: { "x-pilot-admin-key": adminKey },
  });
  assert.equal(adminBefore.status, 200);
  assert.equal(adminBefore.body.case.caseRecord.status, "deleted");

  // 物理清除（deletedBeforeDays=0 → 立即清除全部软删案例）
  const purge = await request("/api/pilot/admin/purge", {
    method: "POST",
    headers: { "x-pilot-admin-key": adminKey },
    body: { deletedBeforeDays: 0 },
  });
  assert.equal(purge.status, 200);
  assert.ok(Number(purge.body.purged) >= 1, `expected purged>=1, got ${JSON.stringify(purge.body)}`);

  // 清除后管理员也无法读取（硬删除，含子表）
  const adminAfter = await request(`/api/pilot/admin/cases/${access.caseId}`, {
    headers: { "x-pilot-admin-key": adminKey },
  });
  assert.equal(adminAfter.status, 404);

  // 缺少截止条件必须被拒绝
  const noCriteria = await request("/api/pilot/admin/purge", {
    method: "POST",
    headers: { "x-pilot-admin-key": adminKey, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(noCriteria.status, 400);
});
test("D1 HTTP rate limiting throttles unauthenticated create bursts (SEC-01)", async () => {
  let saw429 = false;

  for (let i = 0; i < 35; i++) {
    const r = await request("/api/pilot/cases", {
      method: "POST",
      body: { clientCreationId: `${runId}-spam-${i}`, accessToken: `${runId}-spam-access-${i}` },
    });
    if (r.status === 429 && r.body?.code === "rate_limited") { saw429 = true; break; }

  }
  assert.equal(saw429, true, "unauthenticated create burst was not rate limited");
});