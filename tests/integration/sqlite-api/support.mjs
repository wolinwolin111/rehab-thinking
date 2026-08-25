import Database from "better-sqlite3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { applySqliteMigrations } from "../../../scripts/data/sqlite-migration-core.mjs";

const MIGRATIONS = ["0000_worried_lyja.sql", "0001_ambiguous_killraven.sql", "0002_stale_silhouette.sql", "0003_operational_invites.sql", "0004_feedback_operations.sql", "0005_trial_operations.sql", "0006_admin_audit.sql", "0007_source_and_consent.sql", "0008_test_case_isolation.sql"];
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

export function completePilotSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    consent: { version: "pilot-consent-v1", confirmedAt: "2026-08-24T00:00:00.000Z" },
    step: 5,
    intake: { regionId: "knee", description: "fixture", baselineScore: 4, baselineScoreConfirmed: true },
    safety: {},
    imaging: [],
    assessmentIndex: 0,
    assessmentResults: {},
    trialTargetIndex: 0,
    candidateIndex: 0,
    trialRecords: [],
    postScore: 2,
    movementResponse: "",
    exerciseFeedback: {},
    trainingComplete: true,
    followupMode: false,
    sessionNumber: 1,
    followupScore: 0,
    followupScoreHistory: [],
    followupStage: "review",
    followupPostScore: 0,
    followupCandidateId: "",
    followupTrialRecords: [],
    followupExerciseChoices: {},
    followupTrends: {},
    ...overrides,
  };
}
