import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

const packageMetadata = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
const viteConfig = await readFile(new URL("../../../vite.config.ts", import.meta.url), "utf8");

test("A5 integration commands identify SQLite, vertical, and optional live HTTP evidence honestly", async () => {
  assert.match(packageMetadata.scripts["test:integration"], /integration\/sqlite-api/);
  assert.match(packageMetadata.scripts["test:vertical"], /pilot-vertical-flow\.integration\.mjs/);
  assert.match(packageMetadata.scripts["test:http:live"], /integration\/http-live/);
  assert.doesNotMatch(packageMetadata.scripts["test:integration"], /integration\/d1/);
  await assert.rejects(access(new URL("./integration/d1/pilot-api.integration.mjs", import.meta.url)));
});

test("Node and SQLite are the only current runtime and persistence path", async () => {
  assert.equal(packageMetadata.devDependencies["@cloudflare/vite-plugin"], undefined);
  assert.equal(packageMetadata.devDependencies.wrangler, undefined);
  assert.doesNotMatch(viteConfig, /cloudflare|wrangler|worker\/index|sites\(\)/i);
  for (const path of [
    "../../../wrangler.jsonc",
    "../../../wrangler.local.jsonc",
    "../../../worker/index.ts",
    "../../../db/index.ts",
    "../../../db/repository/pilot-case-repository.ts",
    "../../../.openai/hosting.json",
  ]) {
    await assert.rejects(access(new URL(path, import.meta.url)));
  }
});
