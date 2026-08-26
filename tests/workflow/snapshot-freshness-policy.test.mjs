import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const freshness = await loadTypeScriptModule("./src/domain/rehab/followup/snapshot-freshness-core.ts");
const savedAt = "2026-08-20T00:00:00.000Z";
const at = (milliseconds) => new Date(Date.parse(savedAt) + milliseconds).toISOString();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test("T-09/FRESH-01: acute snapshot younger than 24 hours has no reminder", () => {
  const result = freshness.classifySnapshotFreshness({ savedAt, now: at(DAY - 1), timeSensitive: true });
  assert.equal(result.band, "fresh");
  assert.equal(result.showReminder, false);
  assert.equal(result.requiresReconfirmation, false);
});

test("T-09/STALE-24: acute snapshot at exactly 24 hours shows a non-blocking reminder", () => {
  const result = freshness.classifySnapshotFreshness({ savedAt, now: at(DAY), timeSensitive: true });
  assert.equal(result.band, "stale");
  assert.equal(result.showReminder, true);
  assert.equal(result.requiresReconfirmation, false);
});

test("T-09/STALE-7: acute snapshot at exactly 7 days requires current confirmation", () => {
  const result = freshness.classifySnapshotFreshness({ savedAt, now: at(7 * DAY), timeSensitive: true });
  assert.equal(result.band, "very-stale");
  assert.equal(result.showReminder, true);
  assert.equal(result.requiresReconfirmation, true);
});

test("T-09/STALE-7-CHRONIC: chronic snapshot at exactly 7 days only reminds", () => {
  const result = freshness.classifySnapshotFreshness({ savedAt, now: at(7 * DAY), timeSensitive: false });
  assert.equal(result.band, "very-stale");
  assert.equal(result.showReminder, true);
  assert.equal(result.requiresReconfirmation, false);
});

test("T-09/BOUNDARY: 6d 23:59:59 is still non-blocking and future/missing time is unknown", () => {
  const beforeSevenDays = freshness.classifySnapshotFreshness({ savedAt, now: at(7 * DAY - 1), timeSensitive: true });
  assert.equal(beforeSevenDays.band, "stale");
  assert.equal(beforeSevenDays.requiresReconfirmation, false);

  const future = freshness.classifySnapshotFreshness({ savedAt: at(DAY), now: savedAt, timeSensitive: true });
  assert.equal(future.band, "unknown");
  assert.equal(future.requiresReconfirmation, true);
});
