import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const source = await loadTypeScriptModule("./src/infrastructure/pilot/onboarding/source-channel.ts");
const consent = await loadTypeScriptModule("./src/infrastructure/pilot/consent/consent-core.ts");

test("SOURCE-01: every public source channel is accepted and normalized", () => {
  for (const channel of source.PILOT_SOURCE_CHANNELS) {
    assert.deepEqual(source.parsePilotSourceRecord({ channel, detail: "  社群 A  " }), {
      channel,
      detail: channel === "other" ? "社群 A" : null,
    });
  }
});

test("SOURCE-02: unknown channels and oversized details are rejected", () => {
  assert.throws(() => source.parsePilotSourceRecord({ channel: "internal_test" }), /invalid/);
  assert.throws(() => source.parsePilotSourceRecord({ channel: "other", detail: "x".repeat(41) }), /too long/);
});

test("CONSENT-01: only the current consent version with a valid timestamp is accepted", () => {
  assert.deepEqual(consent.parsePilotConsentRecord({ version: consent.PILOT_CONSENT_VERSION, confirmedAt: "2026-08-24T00:00:00Z" }), {
    version: consent.PILOT_CONSENT_VERSION,
    confirmedAt: "2026-08-24T00:00:00.000Z",
  });
  assert.throws(() => consent.parsePilotConsentRecord({ version: "old", confirmedAt: "2026-08-24T00:00:00Z" }), /version/);
  assert.throws(() => consent.parsePilotConsentRecord({ version: consent.PILOT_CONSENT_VERSION, confirmedAt: "not-a-date" }), /confirmedAt/);
  assert.throws(() => consent.assertPilotConsentTimestamp({ version: consent.PILOT_CONSENT_VERSION, confirmedAt: "2026-08-24T00:06:00.000Z" }, Date.parse("2026-08-24T00:00:00.000Z")), /future/);
});
