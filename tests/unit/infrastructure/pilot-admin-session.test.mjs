import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const sessions = await loadTypeScriptModule("./src/infrastructure/pilot/admin/admin-session.ts");
const nowMs = Date.parse("2026-08-24T08:00:00.000Z");

test("A6 ADMIN-01: the long-lived key only mints a short-lived signed session", async () => {
  const issued = await sessions.issuePilotAdminSession({
    providedKey: "correct-admin-key",
    configuredKey: "correct-admin-key",
    nowMs,
    ttlSeconds: 900,
    nonce: "fixed-nonce",
  });
  assert.equal(issued.expiresAt, "2026-08-24T08:15:00.000Z");
  assert.equal(await sessions.validatePilotAdminSession(issued.token, "correct-admin-key", nowMs + 899_000), true);
  assert.equal(await sessions.validatePilotAdminSession(issued.token, "correct-admin-key", nowMs + 900_000), false);
  assert.equal(await sessions.validatePilotAdminSession(issued.token, "rotated-key", nowMs), false);
  assert.doesNotMatch(issued.token, /correct-admin-key/);
});

test("A6 ADMIN-01: wrong credentials fail closed and the cookie is protected", async () => {
  await assert.rejects(
    () => sessions.issuePilotAdminSession({ providedKey: "wrong", configuredKey: "correct-admin-key", nowMs }),
    /denied/i,
  );
  const issued = await sessions.issuePilotAdminSession({ providedKey: "correct-admin-key", configuredKey: "correct-admin-key", nowMs });
  const cookie = sessions.buildPilotAdminSessionCookie(issued.token, 900);
  assert.match(cookie, /^rehabmind_admin_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Path=\/api\/pilot\/admin/i);
});
