import assert from "node:assert/strict";
import test from "node:test";
import { completePilotSnapshot, createSqliteApiHarness } from "./support.mjs";

function createInput(clientCreationId, accessToken, overrides = {}) {
  return {
    clientCreationId,
    accessToken,
    initialSnapshot: completePilotSnapshot({ step: 0, trainingComplete: false }),
    currentStage: "症状信息",
    isBilateral: false,
    hasSafetyStop: false,
    ...overrides,
  };
}

test("SOURCE-API-01: a valid source is stored and idempotent replay does not create duplicates", async () => {
  const harness = await createSqliteApiHarness("source-attribution");
  try {
    const input = createInput("creation-first", "access-first", {
      source: { channel: "other", detail: "线下讲座" },
    });
    const first = await harness.create(input);
    assert.equal(first.status, 201);
    const replay = await harness.create(input);
    assert.equal(replay.status, 201);
    assert.equal(replay.body.case.caseId, first.body.case.caseId);
    assert.equal(replay.body.case.replayed, true);

    const attribution = harness.inspect((sqlite) => sqlite.prepare(
      "SELECT source_channel AS channel, source_detail AS detail, consent_version AS consentVersion, consent_confirmed_at AS confirmedAt FROM pilot_cases WHERE id = ?",
    ).get(first.body.case.caseId));
    assert.deepEqual(attribution, {
      channel: "other",
      detail: "线下讲座",
      consentVersion: "pilot-consent-v1",
      confirmedAt: "2026-08-24T00:00:00.000Z",
    });
    assert.equal(harness.inspect((sqlite) => sqlite.prepare("SELECT count(*) AS count FROM pilot_cases").get().count), 1);
  } finally {
    await harness.close();
  }
});

test("CONSENT-API-01: missing, stale, or forged onboarding data cannot create a case", async () => {
  const harness = await createSqliteApiHarness("source-consent-rejection");
  try {
    const missingSource = await harness.create(createInput("creation-no-source", "access-no-source", { source: null }));
    assert.equal(missingSource.status, 400);
    const staleConsent = await harness.create(createInput("creation-stale-consent", "access-stale-consent", {
      consent: { version: "pilot-consent-v0", confirmedAt: "2026-08-24T00:00:00.000Z" },
    }));
    assert.equal(staleConsent.status, 400);
    const forgedSource = await harness.create(createInput("creation-forged-source", "access-forged-source", {
      source: { channel: "internal_test", detail: null },
    }));
    assert.equal(forgedSource.status, 400);
    assert.equal(harness.inspect((sqlite) => sqlite.prepare("SELECT count(*) AS count FROM pilot_cases").get().count), 0);
  } finally {
    await harness.close();
  }
});
