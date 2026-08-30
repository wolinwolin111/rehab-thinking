import Database from "better-sqlite3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { applySqliteMigrations } from "../../../scripts/data/sqlite-migration-core.mjs";

const MIGRATIONS = ["0000_worried_lyja.sql", "0001_ambiguous_killraven.sql", "0002_stale_silhouette.sql", "0003_operational_invites.sql", "0004_feedback_operations.sql", "0005_trial_operations.sql", "0006_admin_audit.sql", "0007_source_and_consent.sql", "0008_test_case_isolation.sql", "0009_clinical_event_identity.sql"];
const TEST_SOURCE = { channel: "douyin_fan_group", detail: null };
const TEST_CONSENT = { version: "pilot-consent-v1", confirmedAt: "2026-08-24T00:00:00.000Z" };

export async function applyPilotMigrations(databasePath, migrationNames = MIGRATIONS) {
  const sqlite = new Database(databasePath);
  try {
    const migrations = await Promise.all(migrationNames.map(async (name) => ({
      id: name,
      sql: await readFile(path.resolve("drizzle", name), "utf8"),
    })));
    applySqliteMigrations(sqlite, migrations);
  } finally {
    sqlite.close();
  }
}

export async function createSqliteApiHarness(label) {
  const directory = await mkdtemp(path.join(os.tmpdir(), `rehabmind-${label}-`));
  const databasePath = path.join(directory, "pilot.sqlite");
  await applyPilotMigrations(databasePath);
  const previousEnv = {
    PILOT_DB_DRIVER: process.env.PILOT_DB_DRIVER,
    PILOT_SQLITE_PATH: process.env.PILOT_SQLITE_PATH,
    PILOT_ADMIN_KEY: process.env.PILOT_ADMIN_KEY,
    PILOT_TRUSTED_PROXY: process.env.PILOT_TRUSTED_PROXY,
  };
  process.env.PILOT_DB_DRIVER = "sqlite";
  process.env.PILOT_SQLITE_PATH = databasePath;
  process.env.PILOT_ADMIN_KEY = "test-admin-key";
  process.env.PILOT_TRUSTED_PROXY = "nginx";

  const [shared, createRoute, caseRoute, progressRoute, feedbackRoute, trialEventsRoute, adminCasesRoute, adminCaseRoute, adminMetricsRoute, adminSessionRoute, testAccessRoute, testCaseRoute, testRunRoute] = await Promise.all([
    loadTypeScriptModule("./app/api/pilot/_shared.ts"),
    loadTypeScriptModule("./app/api/pilot/cases/route.ts"),
    loadTypeScriptModule("./app/api/pilot/cases/[caseId]/route.ts"),
    loadTypeScriptModule("./app/api/pilot/cases/[caseId]/progress/route.ts"),
    loadTypeScriptModule("./app/api/pilot/cases/[caseId]/feedback/route.ts"),
    loadTypeScriptModule("./app/api/pilot/trial-events/route.ts"),
    loadTypeScriptModule("./app/api/pilot/admin/cases/route.ts"),
    loadTypeScriptModule("./app/api/pilot/admin/cases/[caseId]/route.ts"),
    loadTypeScriptModule("./app/api/pilot/admin/metrics/route.ts"),
    loadTypeScriptModule("./app/api/pilot/admin/session/route.ts"),
    loadTypeScriptModule("./app/api/pilot/test/access/route.ts"),
    loadTypeScriptModule("./app/api/pilot/test/cases/route.ts"),
    loadTypeScriptModule("./app/api/pilot/test/runs/[testRunId]/route.ts"),
  ]);

  function jsonRequest(urlPath, { method = "GET", token, admin = false, sessionCookie, body } = {}) {
    const headers = new Headers();
    if (body !== undefined) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    if (admin) headers.set("x-pilot-admin-key", "test-admin-key");
    if (sessionCookie) headers.set("cookie", sessionCookie);
    return new Request(`http://rehabmind.test${urlPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function result(response) {
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
  }

  return {
    databasePath,
    shared,
    async create(body) {
      return result(await createRoute.POST(jsonRequest("/api/pilot/cases", { method: "POST", body: { source: TEST_SOURCE, consent: TEST_CONSENT, ...body }, admin: true })));
    },
    async testAccess({ admin = true } = {}) {
      return result(await testAccessRoute.GET(jsonRequest("/api/pilot/test/access", { admin })));
    },
    async createTest(body, { admin = true } = {}) {
      return result(await testCaseRoute.POST(jsonRequest("/api/pilot/test/cases", { method: "POST", body, admin })));
    },
    async deleteTestRun(testRunId, { admin = true } = {}) {
      return result(await testRunRoute.DELETE(
        jsonRequest(`/api/pilot/test/runs/${testRunId}`, { method: "DELETE", admin }),
        { params: Promise.resolve({ testRunId }) },
      ));
    },
    async read(caseId, token) {
      return result(await caseRoute.GET(jsonRequest(`/api/pilot/cases/${caseId}`, { token }), { params: Promise.resolve({ caseId }) }));
    },
    async save(caseId, token, body) {
      return result(await progressRoute.POST(
        jsonRequest(`/api/pilot/cases/${caseId}/progress`, { method: "POST", token, admin: true, body }),
        { params: Promise.resolve({ caseId }) },
      ));
    },
    async feedback(caseId, token, body) {
      return result(await feedbackRoute.POST(
        jsonRequest(`/api/pilot/cases/${caseId}/feedback`, { method: "POST", token, admin: true, body }),
        { params: Promise.resolve({ caseId }) },
      ));
    },
    async trialEvent(body, { token } = {}) {
      return result(await trialEventsRoute.POST(
        jsonRequest("/api/pilot/trial-events", { method: "POST", token, body }),
      ));
    },
    async delete(caseId, token) {
      return result(await caseRoute.DELETE(
        jsonRequest(`/api/pilot/cases/${caseId}`, { method: "DELETE", token }),
        { params: Promise.resolve({ caseId }) },
      ));
    },
    async adminByPublicCode(publicCode) {
      const pathName = `/api/pilot/admin/cases?publicCode=${encodeURIComponent(publicCode)}&detail=true`;
      return result(await adminCasesRoute.GET(jsonRequest(pathName, { admin: true })));
    },
    async adminCases(query = "", { admin = true, sessionCookie } = {}) {
      const suffix = query ? `?${query}` : "";
      return result(await adminCasesRoute.GET(jsonRequest(`/api/pilot/admin/cases${suffix}`, { admin, sessionCookie })));
    },
    async adminMetrics() {
      return result(await adminMetricsRoute.GET(jsonRequest("/api/pilot/admin/metrics", { admin: true })));
    },
    async adminLogin(adminKey) {
      return result(await adminSessionRoute.POST(jsonRequest("/api/pilot/admin/session", {
        method: "POST",
        body: { adminKey },
      })));
    },
    async adminCase(caseId, query = "", { admin = true } = {}) {
      const suffix = query ? `?${query}` : "";
      return result(await adminCaseRoute.GET(
        jsonRequest(`/api/pilot/admin/cases/${caseId}${suffix}`, { admin }),
        { params: Promise.resolve({ caseId }) },
      ));
    },
    async adminPatch(caseId, body) {
      return result(await adminCaseRoute.PATCH(
        jsonRequest(`/api/pilot/admin/cases/${caseId}`, { method: "PATCH", admin: true, body }),
        { params: Promise.resolve({ caseId }) },
      ));
    },
    async adminDelete(caseId) {
      return result(await adminCaseRoute.DELETE(
        jsonRequest(`/api/pilot/admin/cases/${caseId}`, { method: "DELETE", admin: true }),
        { params: Promise.resolve({ caseId }) },
      ));
    },
    inspect(callback) {
      shared.closePilotCaseRepository();
      const sqlite = new Database(databasePath, { readonly: true });
      try {
        return callback(sqlite);
      } finally {
        sqlite.close();
      }
    },
    restart() {
      shared.closePilotCaseRepository();
    },
    async close() {
      shared.closePilotCaseRepository();
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      await rm(directory, { recursive: true, force: true });
    },
  };
}

// v3 快照是干净切换：夹具直接给出 identity/domain/workflow/draft 四段结构，
// 并满足 validatePilotSnapshotV3 的全部跨段不变式（会话索引、评估集合、pendingRetestCount）。
const FIXTURE_CONSENT = { version: "pilot-consent-v1", confirmedAt: "2026-08-24T00:00:00.000Z" };
const FIXTURE_CASE_ID = "fixture-case-1";
const FIXTURE_THREAD_ID = "fixture-case-1:thread-1";
const FIXTURE_SESSION_ID = "fixture-case-1:session-1";
const FIXTURE_ASSESSMENT_SET_ID = "fixture-case-1:assessment-1";
const FIXTURE_RECORDED_AT = "2026-08-29T08:00:00.000Z";

const V3_FIXTURE = {
  schemaVersion: 3,
  contractRevision: 3,
  capabilitySnapshotId: "fixture-capability-snapshot-1",
  identity: {
    caseId: FIXTURE_CASE_ID,
    localCaseId: FIXTURE_CASE_ID,
    problemThreadId: FIXTURE_THREAD_ID,
    sessionId: FIXTURE_SESSION_ID,
    sessionNumber: 1,
    sessionStatus: "draft",
    sessionStartedAt: FIXTURE_RECORDED_AT,
    problemThreads: [{
      problemThreadId: FIXTURE_THREAD_ID,
      caseId: FIXTURE_CASE_ID,
      status: "active",
      createdAt: FIXTURE_RECORDED_AT,
      lastActiveAt: FIXTURE_RECORDED_AT,
      title: "fixture 主诉",
      regionId: "knee",
    }],
    sessionIndex: [{
      sessionId: FIXTURE_SESSION_ID,
      problemThreadId: FIXTURE_THREAD_ID,
      caseId: FIXTURE_CASE_ID,
      status: "draft",
      sessionNumber: 1,
      startedAt: FIXTURE_RECORDED_AT,
      lastDraftSavedAt: FIXTURE_RECORDED_AT,
    }],
  },
  domain: {
    consent: FIXTURE_CONSENT,
    intake: { regionId: "knee", description: "fixture", baselineScore: 4, baselineScoreConfirmed: true },
    bodyMarks: [],
    scoreRecords: [],
    specialTestRecords: [],
    professionalNoteRecords: [],
    decisionTraces: [],
    treatments: [],
    history: [],
    safety: { answers: {}, boneRisk: {}, imaging: [] },
    assessments: [{
      assessmentSetId: FIXTURE_ASSESSMENT_SET_ID,
      caseId: FIXTURE_CASE_ID,
      problemThreadId: FIXTURE_THREAD_ID,
      sessionId: FIXTURE_SESSION_ID,
      recordedAt: FIXTURE_RECORDED_AT,
      assessmentRevision: 0,
      results: {},
    }],
    retests: { obligations: [], records: [] },
    training: {
      initialFeedback: {},
      currentSessionChoices: {},
      records: [],
      complete: true,
      planSaved: true,
    },
  },
  workflow: {
    stage: 5,
    phase: "summary",
    assessmentRevision: 0,
    treatmentPlanRevision: 0,
    pendingRetestCount: 0,
    assessmentOwnerSessionId: FIXTURE_SESSION_ID,
    bilateralNeedsReferral: false,
    midpointDecisionDone: false,
    adverseConfirmedAssessmentIds: [],
    adverseResponse: null,
  },
  draft: {
    confirmedIntakeMulti: {},
    treatmentCursor: { target: 0, candidate: 0 },
    bilateralTreatmentSides: {},
    bilateralRetestResponses: {},
    initialRetest: {
      postScore: 0,
      treatmentFinalScore: 0,
      finalScore: 0,
      postScoreConfirmed: false,
      ready: false,
      treatmentFinalConfirmed: false,
      trainingReadyForFinal: false,
      finalConfirmed: false,
    },
    currentSession: {
      isLaterSession: false,
      phase: "summary",
      reviewScore: 0,
      postScore: 0,
      finalScore: 0,
      scoreHistory: [],
    },
    assessmentCursor: 0,
    selectedOptionalCandidateIds: [],
  },
};

function isPlainFixtureObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 深合并 overrides：普通对象递归合并，数组与原始值整体替换。 */
function mergeFixtureOverrides(base, overrides) {
  if (!isPlainFixtureObject(base) || !isPlainFixtureObject(overrides)) return overrides;
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = key in merged ? mergeFixtureOverrides(merged[key], value) : value;
  }
  return merged;
}

/**
 * 身份覆盖传播：调用方覆盖 identity.caseId/problemThreadId/sessionId/sessionNumber 时，
 * 同步改写 problemThreads[0]/sessionIndex[0]/assessments[0] 与 workflow.assessmentOwnerSessionId，
 * 保证 validatePilotSnapshotV3 的跨段不变式恒成立（服务端会把请求级 sessionId 注入 identity）。
 */
function propagateFixtureIdentity(snapshot, overrides) {
  const identityPatch = isPlainFixtureObject(overrides.identity) ? overrides.identity : {};
  const domainPatch = isPlainFixtureObject(overrides.domain) ? overrides.domain : {};
  const workflowPatch = isPlainFixtureObject(overrides.workflow) ? overrides.workflow : {};
  const identity = snapshot.identity;
  if (identityPatch.problemThreads === undefined && isPlainFixtureObject(identity.problemThreads[0])) {
    identity.problemThreads[0].problemThreadId = identity.problemThreadId;
    identity.problemThreads[0].caseId = identity.caseId;
  }
  if (identityPatch.sessionIndex === undefined && isPlainFixtureObject(identity.sessionIndex[0])) {
    identity.sessionIndex[0].sessionId = identity.sessionId;
    identity.sessionIndex[0].problemThreadId = identity.problemThreadId;
    identity.sessionIndex[0].caseId = identity.caseId;
    identity.sessionIndex[0].sessionNumber = identity.sessionNumber;
  }
  if (domainPatch.assessments === undefined && isPlainFixtureObject(snapshot.domain.assessments[0])) {
    snapshot.domain.assessments[0].caseId = identity.caseId;
    snapshot.domain.assessments[0].problemThreadId = identity.problemThreadId;
    snapshot.domain.assessments[0].sessionId = identity.sessionId;
  }
  if (workflowPatch.assessmentOwnerSessionId === undefined) {
    snapshot.workflow.assessmentOwnerSessionId = identity.sessionId;
  }
  return snapshot;
}

export function completePilotSnapshot(overrides = {}) {
  return propagateFixtureIdentity(
    mergeFixtureOverrides(structuredClone(V3_FIXTURE), overrides),
    overrides,
  );
}
