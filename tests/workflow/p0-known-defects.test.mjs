import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadSharedModule() {
  const source = await readFile(new URL("../../app/api/pilot/_shared.ts", import.meta.url), "utf8");
  const withoutImports = source.replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, "");
  const output = ts.transpileModule(withoutImports, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const prefix = "const createRateLimiter = () => () => ({ allowed: true, retryAfterSec: 0 });\n";
  return import(`data:text/javascript;base64,${Buffer.from(prefix + output).toString("base64")}`);
}

test("SEC-02: caller-controlled x-forwarded-for cannot choose the rate-limit identity", async () => {
  const shared = await loadSharedModule();
  const request = new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.9", "cf-connecting-ip": "203.0.113.8", "x-real-ip": "198.51.100.7" },
  });
  assert.equal(shared.clientIpKey(request), "198.51.100.7");

  const forgedOnly = new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
  assert.equal(shared.clientIpKey(forgedOnly), "unknown");
});
