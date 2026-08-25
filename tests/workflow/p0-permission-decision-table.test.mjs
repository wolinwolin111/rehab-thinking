import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceModule = await loadTypeScriptModule(path.join(rootDir, "src/infrastructure/pilot/onboarding/source-channel.ts"), { rootDir });
const consentModule = await loadTypeScriptModule(path.join(rootDir, "src/infrastructure/pilot/consent/consent-core.ts"), { rootDir });
const serviceModule = await loadTypeScriptModule(path.join(rootDir, "src/infrastructure/pilot/services/case-service.ts"), { rootDir });
const tables = JSON.parse(await readFile(new URL("./decision-tables/p0-gates.json", import.meta.url), "utf8"));

const now = "2026-08-24T00:00:00.000Z";
const versions = { appVersion: "app-test", knowledgeVersion: "knowledge-test", decisionVersion: "decision-test" };

function repository({ active, accessTokenValid }) {
  const caseRecord = {
    id: "case-a",
    publicCode: "CASEA001",
    clientCreationId: "client-a",
    accessTokenHash: accessTokenValid ? "hash:access-a" : "hash:different",
    status: active ? "active" : "deleted",
    createdAt: now,
    updatedAt: now,
    deletedAt: active ? null : now,
    currentStage: "assessment",
    isBilateral: false,
    hasSafetyStop: false,
    sessionCount: 1,
    ...versions,
  };
  return {
    getCaseById: async () => caseRecord,
    getSnapshot: async () => ({ id: "snapshot-a", caseId: "case-a", revision: 0, payload: "{}", createdAt: now }),
    getEventsByCaseId: async () => [],
    getFeedbackByCaseId: async () => [],
  };
}

async function executePermissionRow(row) {
  const [sourceValid, consentValid, caseActive, accessTokenValid] = row.when;
  try {
    sourceModule.parsePilotSourceRecord({ channel: sourceValid ? "douyin_fan_group" : "forged" });
    consentModule.parsePilotConsentRecord({ version: consentValid ? "pilot-consent-v1" : "old", confirmedAt: now });
  } catch {
    return "denied";
  }
  if (caseActive === null && accessTokenValid === null) return "create-allowed";

  const service = new serviceModule.PilotCaseService({
    repository: repository({ active: caseActive, accessTokenValid }),
    versions,
    now: () => now,
    hashAccessToken: async (token) => `hash:${token}`,
  });
  try {
    await service.readCase({ caseId: "case-a", accessToken: "access-a" });
    return "case-read-write-allowed";
  } catch {
    return "denied";
  }
}

test("PERMISSION-GATE rows execute source, consent, and case authorization", async () => {
  const table = tables.tables.find((item) => item.ruleId === "PERMISSION-GATE");
  assert.ok(table);
  for (const row of table.rows) assert.equal(await executePermissionRow(row), row.then, row.id);
});
