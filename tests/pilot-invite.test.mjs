import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/pilot-invite.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { validatePilotInvite } = await import(moduleUrl);

const config = { token: "group-invite-2026", expiresAt: "2026-09-01T00:00:00.000Z" };

test("valid invite is reusable before expiry", async () => {
  assert.equal(await validatePilotInvite("group-invite-2026", config, Date.parse("2026-08-21T00:00:00.000Z")), "valid");
  assert.equal(await validatePilotInvite("group-invite-2026", config, Date.parse("2026-08-22T00:00:00.000Z")), "valid");
});

test("missing and invalid invites are rejected without revealing which token is configured", async () => {
  assert.equal(await validatePilotInvite(null, config, Date.parse("2026-08-21T00:00:00.000Z")), "missing");
  assert.equal(await validatePilotInvite("wrong-invite", config, Date.parse("2026-08-21T00:00:00.000Z")), "invalid");
  assert.equal(await validatePilotInvite("group-invite-2026-extra", config, Date.parse("2026-08-21T00:00:00.000Z")), "invalid");
});

test("expired, revoked and unavailable invite configurations fail closed", async () => {
  assert.equal(await validatePilotInvite("group-invite-2026", config, Date.parse("2026-09-01T00:00:00.000Z")), "expired");
  assert.equal(await validatePilotInvite("group-invite-2026", { ...config, revoked: true }, Date.parse("2026-08-21T00:00:00.000Z")), "revoked");
  assert.equal(await validatePilotInvite("group-invite-2026", { token: "" }, Date.now()), "not_configured");
  assert.equal(await validatePilotInvite("group-invite-2026", { ...config, expiresAt: "not-a-date" }, Date.now()), "invalid_config");
});

