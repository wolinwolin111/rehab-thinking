import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../../../scripts/deploy/package-vps-release.mjs", import.meta.url), "utf8");

test("APP-PACKAGE-01: release archives reject secrets and runtime databases", () => {
  assert.match(source, /\\\.env/);
  assert.match(source, /pem\|pfx\|key/);
  assert.match(source, /sqlite\|db/);
  assert.match(source, /wal\|shm/);
});
