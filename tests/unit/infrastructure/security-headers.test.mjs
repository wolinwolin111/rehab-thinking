import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const security = await loadTypeScriptModule("./src/infrastructure/http/security-headers.ts");

test("A7 SEC-03: page headers prevent framing, MIME sniffing, broad capabilities, and unsafe object embedding", () => {
  const headers = Object.fromEntries(security.REHABMIND_SECURITY_HEADERS.map((entry) => [entry.key.toLowerCase(), entry.value]));
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["referrer-policy"], "no-referrer");
  assert.equal(headers["strict-transport-security"], "max-age=31536000");
  assert.match(headers["permissions-policy"], /camera=\(\)/);
  assert.match(headers["content-security-policy"], /object-src 'none'/);
  assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.doesNotMatch(headers["content-security-policy"], /default-src \*/);
});

test("A7 PRIV-03: pilot APIs and admin pages are never cached or indexed", () => {
  const headers = Object.fromEntries(security.REHABMIND_PRIVATE_API_HEADERS.map((entry) => [entry.key.toLowerCase(), entry.value]));
  assert.match(headers["cache-control"], /no-store/);
  assert.match(headers["x-robots-tag"], /noindex/);
});
